import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { credit, debit, getBalance, InsufficientBalanceError } from "../wallet/ledger.js";
import { pickQuestions, shuffledOptions, QUESTIONS_PER_SESSION, TIME_PER_QUESTION_MS } from "./questions.js";
import { scoreSession, applyHistoricalSignals, actionForScore } from "./anticheat.js";
import { updatePlayerStats } from "./stats.js";
import { challengePayout, resultOf, LIBRE_POINTS_PER_CORRECT, DAILY_BONUS_COINS } from "./payout.js";
import { calcNewElo } from "../../lib/elo.js";

const startSchema = z.object({
  categoryId: z.string().min(1),
  mode: z.enum(["LIBRE", "CHALLENGE"]),
  stakeCoins: z.number().int().min(0).max(50_000).optional(),
  daily: z.boolean().optional().default(false), // LIBRE uniquement — cf. QuizPlay.jsx ?daily=1
});

const submitSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        chosenIndex: z.number().int().min(0).max(3),
        responseMs: z.number().int().min(0).max(120_000),
      })
    )
    .min(1)
    .max(QUESTIONS_PER_SESSION),
  tabSwitches: z.number().int().min(0).max(1000).default(0),
  totalDurationMs: z.number().int().min(0),
});

type SessionQuestion = { questionId: string; permutation: number[] };

export async function quizRoutes(app: FastifyInstance) {
  app.post("/api/quiz/start", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = startSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });

    if (user.accountStatus === "BANNED" || user.accountStatus === "SUSPENDED") {
      return reply.forbidden("Compte non actif");
    }

    let stakeCoins = 0;
    if (body.mode === "CHALLENGE") {
      if (!body.stakeCoins) return reply.badRequest("stakeCoins requis en mode CHALLENGE");
      stakeCoins = body.stakeCoins;
      const cap = user.accountStatus === "RESTRICTED" ? 250 : 50_000;
      if (stakeCoins > cap) return reply.forbidden(`Mise plafonnée à ${cap} F pour ce compte`);
    }

    const questions = await pickQuestions(body.categoryId, user.id);
    if (questions.length === 0) return reply.badRequest("Catégorie vide");

    const sessionQuestions: SessionQuestion[] = [];
    const clientQuestions = questions.map((q) => {
      const { text, permutation } = shuffledOptions(q.options);
      sessionQuestions.push({ questionId: q.id, permutation });
      return { id: q.id, text: q.textFr, options: text };
    });

    const expiresAt = new Date(Date.now() + questions.length * TIME_PER_QUESTION_MS * 2 + 30_000);

    // La mise est débitée à l'ouverture de la session, pas à la soumission :
    // ça évite qu'un joueur ouvre 10 sessions Challenge en parallèle avec
    // un solde qui n'en couvre qu'une (TOCTOU classique).
    let stakeTx: { id: string } | null = null;
    if (stakeCoins > 0) {
      try {
        stakeTx = await debit({ userId: user.id, type: "STAKE", amountCoins: stakeCoins });
      } catch (err) {
        if (err instanceof InsufficientBalanceError) return reply.badRequest(err.message);
        throw err;
      }
    }

    const session = await prisma.quizSession.create({
      data: {
        userId: user.id,
        categoryId: body.categoryId,
        mode: body.mode,
        stakeCoins,
        daily: body.mode === "LIBRE" && body.daily,
        questionIds: sessionQuestions,
        expiresAt,
      },
    });

    if (stakeTx) {
      await prisma.transaction.update({ where: { id: stakeTx.id }, data: { quizSessionId: session.id } });
    }

    return reply.code(201).send({
      sessionId: session.id,
      expiresAt: session.expiresAt,
      timePerQuestionMs: TIME_PER_QUESTION_MS,
      questions: clientQuestions,
    });
  });

  app.post("/api/quiz/submit", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = submitSchema.parse(req.body);

    const session = await prisma.quizSession.findUnique({ where: { id: body.sessionId } });
    if (!session || session.userId !== req.user.userId) return reply.notFound();
    if (session.status !== "STARTED") return reply.conflict("Session déjà soumise ou expirée");

    if (new Date() > session.expiresAt) {
      await prisma.quizSession.update({ where: { id: session.id }, data: { status: "EXPIRED" } });
      if (session.stakeCoins > 0) {
        await credit({
          userId: session.userId,
          type: "REFUND",
          amountCoins: session.stakeCoins,
          quizSessionId: session.id,
          metadata: { reason: "session_expired" },
        });
      }
      return reply.code(410).send({ error: "Session expirée, mise remboursée" });
    }

    const sessionQuestions = session.questionIds as unknown as SessionQuestion[];
    const byId = new Map(sessionQuestions.map((q) => [q.questionId, q]));

    // §3.4 — une question ne peut être répondue qu'une fois, et seulement
    // si elle appartient bien à cette session (empêche de rejouer avec des
    // ids d'une autre session/partie pour deviner le format).
    const seenIds = new Set<string>();
    const dbQuestions = await prisma.question.findMany({
      where: { id: { in: [...byId.keys()] } },
    });
    const questionById = new Map(dbQuestions.map((q) => [q.id, q]));

    const correctness: boolean[] = [];
    const responseTimings: number[] = [];
    let scoreServer = 0;

    for (const answer of body.answers) {
      const sq = byId.get(answer.questionId);
      const question = questionById.get(answer.questionId);
      if (!sq || !question || seenIds.has(answer.questionId)) {
        correctness.push(false);
        responseTimings.push(answer.responseMs);
        continue;
      }
      seenIds.add(answer.questionId);

      // chosenIndex porte sur les options MÉLANGÉES envoyées au client ;
      // permutation[chosenIndex] retrouve l'index canonique en base.
      const canonicalChosen = sq.permutation[answer.chosenIndex];
      const isCorrect = canonicalChosen === question.answerIndex;
      correctness.push(isCorrect);
      responseTimings.push(answer.responseMs);
      if (isCorrect) scoreServer++;
    }

    const base = scoreSession({
      totalQuestions: sessionQuestions.length,
      correctCount: scoreServer,
      responseTimings,
      tabSwitches: body.tabSwitches,
      totalDurationMs: body.totalDurationMs,
    });
    const { score: suspicionScore, flags } = await applyHistoricalSignals(session.userId, base, session.mode);
    const action = actionForScore(suspicionScore);

    // ELO — même règle des deux côtés (résultat déduit du score, pas du
    // mode) : voir QuizPlay.jsx finalize(), la mise Challenge ne change
    // rien à l'ELO.
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
    const { newElo, delta: eloDelta } = calcNewElo(user.eloRating, 1050, resultOf(scoreServer));

    await prisma.$transaction([
      ...body.answers.map((a, i) =>
        prisma.quizAnswer.create({
          data: {
            sessionId: session.id,
            questionId: a.questionId,
            chosenIndex: a.chosenIndex,
            correct: correctness[i] ?? false,
            responseMs: a.responseMs,
          },
        })
      ),
      prisma.quizSession.update({
        where: { id: session.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          scoreServer,
          eloDelta,
          tabSwitches: body.tabSwitches,
          totalDurationMs: body.totalDurationMs,
          suspicionScore,
          suspicionFlags: flags,
        },
      }),
      prisma.user.update({ where: { id: user.id }, data: { eloRating: newElo } }),
    ]);

    if (action === "quarantine_hard") {
      await prisma.flag.create({
        data: { userId: session.userId, rule: flags.join(","), detail: { sessionId: session.id, suspicionScore } },
      });
    }

    // Paiement — copie exacte de QuizPlay.jsx finalize() :
    // CHALLENGE : table de gains graduée (payout.ts), peut être un gain
    //   partiel ou une perte totale de la mise (déjà débitée au start).
    // LIBRE : 10 F par bonne réponse + bonus quotidien 500 F, vérifié
    //   serveur (le champ client `isDaily` ne suffit pas — voir §10 du
    //   spec anti-triche, ne jamais faire confiance à une déclaration client).
    let payoutCoins = 0;
    let dailyBonusGranted = false;

    if (session.mode === "CHALLENGE") {
      payoutCoins = challengePayout(session.stakeCoins, scoreServer);
    } else {
      payoutCoins = scoreServer * LIBRE_POINTS_PER_CORRECT;
      if (session.daily) {
        const last = user.lastDailyBonusAt;
        const eligible = !last || Date.now() - last.getTime() > 24 * 60 * 60 * 1000;
        if (eligible) {
          payoutCoins += DAILY_BONUS_COINS;
          dailyBonusGranted = true;
          await prisma.user.update({ where: { id: user.id }, data: { lastDailyBonusAt: new Date() } });
        }
      }
    }

    if (payoutCoins > 0) {
      await credit({
        userId: session.userId,
        type: "PAYOUT",
        amountCoins: payoutCoins,
        status: action === "credit" ? "COMPLETED" : "QUARANTINED",
        quizSessionId: session.id,
        metadata: { suspicionScore, flags, dailyBonusGranted },
      });
    }

    await updatePlayerStats(session.userId);

    return reply.send({
      scoreServer,
      totalQuestions: sessionQuestions.length,
      correctness,
      payoutCoins,
      dailyBonusGranted,
      eloRating: newElo,
      eloDelta,
      suspicionAction: action, // le score lui-même n'est jamais renvoyé (§10 : ne pas révéler ce qui flague)
      balanceCoins: await getBalance(session.userId),
    });
  });
}
