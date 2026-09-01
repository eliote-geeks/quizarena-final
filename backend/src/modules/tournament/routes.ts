import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { credit, debit, getBalance, InsufficientBalanceError } from "../wallet/ledger.js";
import { TOURNAMENT_CAPACITIES, isTournamentCapacity } from "./payout.js";
import { openReadyCheck, startTournament, withTournamentLock } from "./bracket.js";
import { QUESTIONS_PER_SESSION } from "../quiz/questions.js";
import { configuredTournamentCover, isTournamentCover, TOURNAMENT_COVER_IMAGES } from "./covers.js";
import { getVipStatus } from "../vip/service.js";

// Jamais un upload libre (pas de modération sur une appli d'argent
// réel) — le créateur choisit parmi les photos déjà vérifiées et
// servies par le frontend (§quizarena-v2/public/categories, mêmes
// fichiers que CATEGORY_PHOTO côté client). Whitelist stricte : une
// valeur hors de cette liste est silencieusement ignorée (ni erreur, ni
// image cassée).
const COVER_IMAGE_ALLOWLIST = new Set(
  [
    ...TOURNAMENT_COVER_IMAGES,
    ...[
    "football-cm", "musique-cm", "histoire-cm", "societe-cm", "gastronomie-cm",
    "culture", "histoire", "geographie", "sciences", "sport", "afrique", "cinema",
    "musique", "celebrites", "technologie", "nature", "gastronomie", "litterature", "anime",
    "animaux", "environnement", "television", "jeux-video", "automobile", "sante", "arts",
    "societe", "voyages", "bandes-dessinees",
    ].map((id) => `/categories/${id}.webp`),
  ]
);

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  categoryId: z.string().min(1).optional(), // absent = questions mélangées sur tout le bank
  coverImage: z.string().optional(),
  stakeCoins: z.number().int().min(100).max(50_000),
  capacity: z.number().int().refine(isTournamentCapacity, "capacité invalide (4, 8 ou 16)"),
});

const MIXED_LABEL = "Mélangé";

/** Vue résumée pour une liste (écran "tournois ouverts"). */
async function serializeSummary(t: {
  id: string;
  name: string | null;
  coverImage: string | null;
  categoryId: string | null;
  stakeCoins: number;
  capacity: number;
  status: string;
  createdAt: Date;
  entries: { userId: string }[];
}) {
  const category = t.categoryId
    ? await prisma.category.findUnique({ where: { id: t.categoryId }, select: { nameFr: true } })
    : null;
  const categoryName = t.categoryId ? category?.nameFr ?? t.categoryId : MIXED_LABEL;
  return {
    id: t.id,
    name: t.name ?? categoryName, // repli pour les tournois créés avant l'ajout du nom (19/08)
    coverImage: isTournamentCover(t.coverImage) ? t.coverImage : configuredTournamentCover(),
    categoryId: t.categoryId,
    categoryName,
    stakeCoins: t.stakeCoins,
    capacity: t.capacity,
    status: t.status,
    entryCount: t.entries.length,
    createdAt: t.createdAt,
  };
}

/** Vue détaillée pour l'écran d'un tournoi précis — bracket complet avec
 * pseudos résolus, et le prochain match du joueur courant s'il y en a un. */
async function serializeDetail(tournamentId: string, myUserId: string) {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      entries: { include: { user: { select: { username: true } } }, orderBy: { joinedAt: "asc" } },
      matches: { orderBy: [{ round: "asc" }, { slot: "asc" }] },
      invites: { where: { status: "PENDING" }, include: { user: { select: { username: true } } } },
    },
  });
  if (!t) return null;

  const category = t.categoryId
    ? await prisma.category.findUnique({ where: { id: t.categoryId }, select: { nameFr: true } })
    : null;
  const categoryName = t.categoryId ? category?.nameFr ?? t.categoryId : MIXED_LABEL;
  const userIds = new Set<string>();
  for (const m of t.matches) {
    if (m.playerAId) userIds.add(m.playerAId);
    if (m.playerBId) userIds.add(m.playerBId);
  }
  const users = await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, username: true } });
  const usernameOf = new Map(users.map((u) => [u.id, u.username]));

  const rounds = new Map<number, typeof t.matches>();
  for (const m of t.matches) {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round)!.push(m);
  }

  const totalRounds = Math.log2(t.capacity);
  const bracket = [...rounds.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, matches]) => ({
      round,
      label: round === totalRounds ? "Finale" : round === totalRounds - 1 ? "Demi-finale" : `Tour ${round}`,
      matches: matches
        .sort((a, b) => a.slot - b.slot)
        .map((m) => ({
          id: m.id,
          playerA: m.playerAId ? { id: m.playerAId, username: usernameOf.get(m.playerAId) ?? "?" } : null,
          playerB: m.playerBId ? { id: m.playerBId, username: usernameOf.get(m.playerBId) ?? "?" } : null,
          winnerId: m.winnerId,
          status: m.status,
        })),
    }));

  // Le match que CE joueur doit aller jouer maintenant, s'il y en a un.
  const myMatch = t.matches.find(
    (m) =>
      (m.playerAId === myUserId || m.playerBId === myUserId) &&
      (m.status === "READY" || m.status === "IN_PROGRESS")
  );

  const myEntry = t.entries.find((e) => e.userId === myUserId) ?? null;

  // Le créateur est le premier inscrit (le créateur s'inscrit automatiquement à la création)
  const creatorEntry = t.entries.reduce(
    (min: typeof t.entries[0] | null, e) => (!min || e.joinedAt < min.joinedAt ? e : min),
    null
  );
  const creatorId = creatorEntry?.userId ?? null;

  return {
    id: t.id,
    name: t.name ?? categoryName,
    coverImage: isTournamentCover(t.coverImage) ? t.coverImage : configuredTournamentCover(),
    categoryId: t.categoryId,
    categoryName,
    stakeCoins: t.stakeCoins,
    capacity: t.capacity,
    status: t.status,
    creatorId,
    entries: t.entries.map((e) => ({
      userId: e.userId,
      username: e.user.username,
      eliminatedRound: e.eliminatedRound,
      placement: e.placement,
      payoutCoins: e.payoutCoins,
      ready: Boolean(e.readyAt),
    })),
    readyCount: t.entries.filter((e) => e.readyAt).length,
    myReady: Boolean(myEntry?.readyAt),
    // Invitations encore sans réponse — affichées au créateur à côté des
    // inscrits. Elles ne réservent aucune place : le tournoi peut se
    // remplir librement pendant qu'elles attendent.
    pendingInvites: t.invites.map((i) => ({ id: i.id, userId: i.userId, username: i.user.username })),
    bracket,
    myEntry: myEntry && { joined: true, placement: myEntry.placement, payoutCoins: myEntry.payoutCoins },
    myNextMatchId: myMatch?.id ?? null,
    createdAt: t.createdAt,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
  };
}

/** Inscription payante à un tournoi — SEUL endroit qui débite un droit
 * d'entrée. Appelé par POST /join (inscription libre) et par
 * l'acceptation d'une invitation nominative : les deux chemins
 * partagent donc exactement les mêmes garde-fous, et la contrainte
 * unique [tournamentId, userId] garantit qu'un joueur déjà inscrit
 * ressort en "Déjà inscrit" AVANT tout débit — jamais deux prélèvements
 * pour le même tournoi.
 *
 * À appeler impérativement sous `withTournamentLock` (le contrôle de
 * capacité et la création de l'entrée doivent être atomiques). */
async function enrollPlayer(tournamentId: string, userId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, include: { entries: true } });
  if (!tournament) return { error: "notFound" as const };
  if (tournament.status !== "REGISTERING") return { error: "badRequest" as const, message: "Ce tournoi n'accepte plus d'inscriptions" };
  if (tournament.entries.length >= tournament.capacity) return { error: "badRequest" as const, message: "Tournoi complet" };
  if (tournament.entries.some((e) => e.userId === userId)) return { error: "badRequest" as const, message: "Déjà inscrit à ce tournoi" };

  try {
    await debit({ userId, type: "STAKE", amountCoins: tournament.stakeCoins, metadata: { tournamentId: tournament.id } });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) return { error: "badRequest" as const, message: "Solde insuffisant pour ce droit d'entrée" };
    throw err;
  }
  await prisma.tournamentEntry.create({ data: { tournamentId: tournament.id, userId } });
  // Volontairement PAS de démarrage automatique : le tournoi n'est lancé
  // que par le créateur (POST /start), puis seulement quand chaque joueur
  // a confirmé sa présence (POST /ready).
  return { error: null };
}

export async function tournamentRoutes(app: FastifyInstance) {
  app.get("/api/tournaments", { preHandler: [app.authenticate] }, async (req, reply) => {
    const [open, vip] = await Promise.all([prisma.tournament.findMany({
      where: { status: "REGISTERING" },
      include: { entries: { select: { userId: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }), getVipStatus(req.user.userId)]);
    const mine = await prisma.tournamentEntry.findMany({
      where: { userId: req.user.userId },
      include: { tournament: { include: { entries: { select: { userId: true } } } } },
      orderBy: { joinedAt: "desc" },
      take: 20,
    });

    return reply.send({
      open: await Promise.all(open.map(serializeSummary)),
      mine: await Promise.all(mine.map((e) => serializeSummary(e.tournament))),
      capacities: TOURNAMENT_CAPACITIES,
      coverImages: TOURNAMENT_COVER_IMAGES,
      viewer: vip,
    });
  });

  app.get("/api/tournaments/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const detail = await serializeDetail(id, req.user.userId);
    if (!detail) return reply.notFound("Tournoi introuvable");
    return reply.send(detail);
  });

  app.post("/api/tournaments", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = createSchema.parse(req.body);

    const vip = await getVipStatus(req.user.userId);
    if (!vip?.canCreateTournament) {
      return reply.forbidden("Statut VIP requis pour créer un tournoi");
    }

    // Catégorie facultative depuis le 19/08 : si choisie, il faut assez
    // de contenu vérifié (sinon un round planterait en plein tournoi une
    // fois les droits d'entrée débités) ; si absente, le pool mélangé
    // (445+ questions, §quiz/questions.ts) est toujours assez fourni.
    if (body.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: body.categoryId },
        include: { _count: { select: { questions: { where: { active: true } } } } },
      });
      if (!category) return reply.badRequest("Catégorie inconnue");
      if (category._count.questions < QUESTIONS_PER_SESSION) return reply.badRequest("Catégorie pas encore assez fournie pour un tournoi");
    }

    const balance = await getBalance(req.user.userId);
    if (balance < body.stakeCoins) return reply.badRequest("Solde insuffisant pour ce droit d'entrée");

    // Photo uploadée par le créateur (§modules/uploads/routes.ts, 31/08 —
    // retour Paul : libre de choisir SA photo, pas seulement la whitelist
    // ci-dessus) : acceptée si elle vient bien de notre propre endpoint
    // d'upload, jamais une URL externe arbitraire.
    const isUploadedCover = typeof body.coverImage === "string" && body.coverImage.startsWith("/api/uploads/tournament-covers/");
    const coverImage = body.coverImage && (COVER_IMAGE_ALLOWLIST.has(body.coverImage) || isUploadedCover) ? body.coverImage : null;

    const tournament = await prisma.tournament.create({
      data: { name: body.name, coverImage, categoryId: body.categoryId ?? null, stakeCoins: body.stakeCoins, capacity: body.capacity },
    });

    try {
      await debit({ userId: req.user.userId, type: "STAKE", amountCoins: body.stakeCoins, metadata: { tournamentId: tournament.id } });
    } catch (err) {
      await prisma.tournament.delete({ where: { id: tournament.id } });
      if (err instanceof InsufficientBalanceError) return reply.badRequest("Solde insuffisant pour ce droit d'entrée");
      throw err;
    }
    await prisma.tournamentEntry.create({ data: { tournamentId: tournament.id, userId: req.user.userId } });

    return reply.send(await serializeSummary({ ...tournament, entries: [{ userId: req.user.userId }] }));
  });

  app.post("/api/tournaments/:id/join", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    // Sérialisé par tournoi : sans ça, deux inscriptions concurrentes
    // pour la dernière place pourraient toutes les deux lire "pas encore
    // complet" et dépasser la capacité (§bracket.ts withTournamentLock).
    const result = await withTournamentLock(id, () => enrollPlayer(id, req.user.userId));

    if (result.error === "notFound") return reply.notFound("Tournoi introuvable");
    if (result.error === "badRequest") return reply.badRequest(result.message);

    const detail = await serializeDetail(id, req.user.userId);
    return reply.send(detail);
  });

  app.post("/api/tournaments/:id/leave", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return reply.notFound("Tournoi introuvable");
    if (tournament.status !== "REGISTERING") return reply.badRequest("Le tournoi a déjà commencé, impossible de se désinscrire");

    const entry = await prisma.tournamentEntry.findUnique({ where: { tournamentId_userId: { tournamentId: id, userId: req.user.userId } } });
    if (!entry) return reply.badRequest("Pas inscrit à ce tournoi");

    const stakeTx = await prisma.transaction.findFirst({
      where: { userId: req.user.userId, type: "STAKE", metadata: { path: ["tournamentId"], equals: id } },
      orderBy: { createdAt: "desc" },
    });
    if (stakeTx) {
      await credit({ userId: req.user.userId, type: "REFUND", amountCoins: tournament.stakeCoins, relatedTransactionId: stakeTx.id, metadata: { tournamentId: id, reason: "leave_before_start" } });
    }
    await prisma.tournamentEntry.delete({ where: { id: entry.id } });

    return reply.send({ ok: true });
  });

  // ══ Invitations nominatives ═══════════════════════════════════════════
  // Optionnelles : un tournoi reste rejoignable librement. L'invitation
  // ne réserve pas de place et ne débite rien — le droit d'entrée n'est
  // prélevé qu'à l'acceptation, via enrollPlayer (chemin unique).

  /** Mes invitations en attente — alimente la notification dans l'espace du joueur. */
  app.get("/api/tournaments/invites/mine", { preHandler: [app.authenticate] }, async (req, reply) => {
    const invites = await prisma.tournamentInvite.findMany({
      where: { userId: req.user.userId, status: "PENDING" },
      include: {
        invitedBy: { select: { username: true } },
        tournament: { include: { entries: { select: { userId: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Une invitation dont le tournoi a démarré, s'est rempli, ou auquel on
    // s'est finalement inscrit par la liste publique n'est plus actionnable :
    // on ne la présente pas comme une notification en attente.
    const actionable = invites.filter(
      (i) =>
        i.tournament.status === "REGISTERING" &&
        i.tournament.entries.length < i.tournament.capacity &&
        !i.tournament.entries.some((e) => e.userId === req.user.userId)
    );

    const balance = await getBalance(req.user.userId);
    return reply.send({
      invites: actionable.map((i) => ({
        id: i.id,
        tournamentId: i.tournamentId,
        tournamentName: i.tournament.name,
        stakeCoins: i.tournament.stakeCoins,
        capacity: i.tournament.capacity,
        entryCount: i.tournament.entries.length,
        invitedBy: i.invitedBy.username,
        createdAt: i.createdAt,
        affordable: balance >= i.tournament.stakeCoins,
      })),
    });
  });

  /** Joueurs invitables : recherche par pseudo, hors inscrits et déjà invités. */
  app.get("/api/tournaments/:id/invitable", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { q } = req.query as { q?: string };

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { entries: { orderBy: { joinedAt: "asc" } }, invites: { where: { status: "PENDING" } } },
    });
    if (!tournament) return reply.notFound("Tournoi introuvable");

    const creatorId = tournament.entries[0]?.userId ?? null;
    if (creatorId !== req.user.userId) return reply.forbidden("Seul le créateur peut inviter des joueurs");

    const excluded = new Set<string>([
      ...tournament.entries.map((e) => e.userId),
      ...tournament.invites.map((i) => i.userId),
    ]);

    const users = await prisma.user.findMany({
      where: {
        id: { notIn: [...excluded] },
        isBot: false, // jamais l'adversaire "Ordinateur" : il ne peut pas payer un droit d'entrée
        accountStatus: { in: ["ACTIVE", "WATCHED"] },
        ...(q && q.trim().length >= 2 ? { username: { contains: q.trim(), mode: "insensitive" as const } } : {}),
      },
      select: { id: true, username: true, region: true },
      orderBy: { username: "asc" },
      take: 30,
    });

    return reply.send({ players: users });
  });

  /** Envoyer des invitations (créateur, tournoi encore ouvert). */
  app.post("/api/tournaments/:id/invites", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ userIds: z.array(z.string().uuid()).min(1).max(32) }).parse(req.body);

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { entries: { orderBy: { joinedAt: "asc" } } },
    });
    if (!tournament) return reply.notFound("Tournoi introuvable");
    if (tournament.status !== "REGISTERING") return reply.badRequest("Ce tournoi n'accepte plus d'inscriptions");

    const creatorId = tournament.entries[0]?.userId ?? null;
    if (creatorId !== req.user.userId) return reply.forbidden("Seul le créateur peut inviter des joueurs");

    const alreadyIn = new Set(tournament.entries.map((e) => e.userId));
    const targets = [...new Set(body.userIds)].filter((uid) => !alreadyIn.has(uid));
    if (!targets.length) return reply.badRequest("Ces joueurs sont déjà inscrits");

    // Une invitation par joueur et par tournoi (contrainte unique) :
    // skipDuplicates rend l'envoi rejouable sans erreur si le créateur
    // renvoie la même sélection.
    await prisma.tournamentInvite.createMany({
      data: targets.map((uid) => ({ tournamentId: id, userId: uid, invitedById: req.user.userId })),
      skipDuplicates: true,
    });

    return reply.send(await serializeDetail(id, req.user.userId));
  });

  /** Accepter une invitation — c'est ICI que le solde est débité, une seule fois. */
  app.post("/api/tournaments/invites/:inviteId/accept", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { inviteId } = req.params as { inviteId: string };

    const invite = await prisma.tournamentInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return reply.notFound("Invitation introuvable");
    if (invite.userId !== req.user.userId) return reply.forbidden("Cette invitation ne t'est pas adressée");
    if (invite.status !== "PENDING") return reply.badRequest("Cette invitation a déjà reçu une réponse");

    const result = await withTournamentLock(invite.tournamentId, async () => {
      // Re-lecture sous verrou : l'invitation a pu être répondue par un
      // double-clic pendant l'attente du verrou. Sans ce contrôle, deux
      // requêtes concurrentes appelleraient toutes les deux enrollPlayer.
      const fresh = await prisma.tournamentInvite.findUnique({ where: { id: inviteId } });
      if (!fresh || fresh.status !== "PENDING") return { error: "badRequest" as const, message: "Cette invitation a déjà reçu une réponse" };

      const enrolled = await enrollPlayer(invite.tournamentId, req.user.userId);
      if (enrolled.error) return enrolled;

      await prisma.tournamentInvite.update({ where: { id: inviteId }, data: { status: "ACCEPTED", respondedAt: new Date() } });
      return { error: null };
    });

    if (result.error === "notFound") return reply.notFound("Tournoi introuvable");
    if (result.error === "badRequest") return reply.badRequest(result.message);

    return reply.send(await serializeDetail(invite.tournamentId, req.user.userId));
  });

  /** Refuser une invitation — aucun mouvement d'argent. */
  app.post("/api/tournaments/invites/:inviteId/decline", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { inviteId } = req.params as { inviteId: string };

    const invite = await prisma.tournamentInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return reply.notFound("Invitation introuvable");
    if (invite.userId !== req.user.userId) return reply.forbidden("Cette invitation ne t'est pas adressée");
    if (invite.status !== "PENDING") return reply.badRequest("Cette invitation a déjà reçu une réponse");

    await prisma.tournamentInvite.update({ where: { id: inviteId }, data: { status: "DECLINED", respondedAt: new Date() } });
    return reply.send({ ok: true });
  });

  // ── Lancer le tournoi (créateur uniquement, capacité atteinte) ────────
  // Ne crée AUCUN match : ouvre seulement le check de présence. Les
  // compteurs de forfait ne sont armés qu'une fois tout le monde prêt.
  app.post("/api/tournaments/:id/start", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const result = await withTournamentLock(id, async () => {
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: { entries: { orderBy: { joinedAt: "asc" } } },
      });
      if (!tournament) return { error: "notFound" as const };

      const creatorId = tournament.entries[0]?.userId ?? null;
      if (creatorId !== req.user.userId) return { error: "forbidden" as const, message: "Seul le créateur peut lancer le tournoi" };

      const opened = await openReadyCheck(id);
      if (!opened.ok) return { error: "badRequest" as const, message: opened.message };
      return { error: null };
    });

    if (result.error === "notFound") return reply.notFound("Tournoi introuvable");
    if (result.error === "forbidden") return reply.forbidden(result.message);
    if (result.error === "badRequest") return reply.badRequest(result.message);

    return reply.send(await serializeDetail(id, req.user.userId));
  });

  // ── Confirmer sa présence pendant le check ────────────────────────────
  // Le bracket n'est tiré que lorsque le dernier inscrit a confirmé.
  app.post("/api/tournaments/:id/ready", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const result = await withTournamentLock(id, async () => {
      const tournament = await prisma.tournament.findUnique({ where: { id } });
      if (!tournament) return { error: "notFound" as const };
      if (tournament.status !== "READY_CHECK") return { error: "badRequest" as const, message: "Le tournoi n'attend pas de confirmation de présence" };

      const entry = await prisma.tournamentEntry.findUnique({
        where: { tournamentId_userId: { tournamentId: id, userId: req.user.userId } },
      });
      if (!entry) return { error: "badRequest" as const, message: "Pas inscrit à ce tournoi" };

      if (!entry.readyAt) {
        await prisma.tournamentEntry.update({ where: { id: entry.id }, data: { readyAt: new Date() } });
      }
      // Tire le bracket si — et seulement si — plus personne ne manque.
      await startTournament(id);
      return { error: null };
    });

    if (result.error === "notFound") return reply.notFound("Tournoi introuvable");
    if (result.error === "badRequest") return reply.badRequest(result.message);

    return reply.send(await serializeDetail(id, req.user.userId));
  });

  // ── Annuler le check de présence (créateur) ───────────────────────────
  // Filet de sécurité : sans ça, un seul joueur qui ne confirme jamais
  // laisse le tournoi bloqué en READY_CHECK pour toujours — droits
  // d'entrée débités, aucun match jouable, aucune désinscription possible.
  app.post("/api/tournaments/:id/cancel-ready", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const result = await withTournamentLock(id, async () => {
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: { entries: { orderBy: { joinedAt: "asc" } } },
      });
      if (!tournament) return { error: "notFound" as const };
      if (tournament.status !== "READY_CHECK") return { error: "badRequest" as const, message: "Aucun check de présence en cours" };

      const creatorId = tournament.entries[0]?.userId ?? null;
      if (creatorId !== req.user.userId) return { error: "forbidden" as const, message: "Seul le créateur peut annuler le lancement" };

      await prisma.tournamentEntry.updateMany({ where: { tournamentId: id }, data: { readyAt: null } });
      await prisma.tournament.update({ where: { id }, data: { status: "REGISTERING" } });
      return { error: null };
    });

    if (result.error === "notFound") return reply.notFound("Tournoi introuvable");
    if (result.error === "forbidden") return reply.forbidden(result.message);
    if (result.error === "badRequest") return reply.badRequest(result.message);

    return reply.send(await serializeDetail(id, req.user.userId));
  });

  // ── Expulser un joueur (créateur uniquement, avant lancement) ─────────
  app.delete("/api/tournaments/:id/entries/:targetId", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id, targetId } = req.params as { id: string; targetId: string };

    const tournament = await prisma.tournament.findUnique({ where: { id }, include: { entries: { orderBy: { joinedAt: "asc" }, take: 1 } } });
    if (!tournament) return reply.notFound("Tournoi introuvable");
    if (tournament.status !== "REGISTERING") return reply.badRequest("Le tournoi a déjà commencé");

    // Seul le créateur (premier inscrit) peut expulser
    const creatorId = tournament.entries[0]?.userId ?? null;
    if (creatorId !== req.user.userId) return reply.forbidden("Seul le créateur peut retirer un joueur");
    if (targetId === req.user.userId) return reply.badRequest("Le créateur ne peut pas se retirer lui-même (utilise Se désinscrire)");

    const entry = await prisma.tournamentEntry.findUnique({ where: { tournamentId_userId: { tournamentId: id, userId: targetId } } });
    if (!entry) return reply.notFound("Ce joueur n'est pas inscrit");

    // Rembourser la mise du joueur expulsé
    const stakeTx = await prisma.transaction.findFirst({
      where: { userId: targetId, type: "STAKE", metadata: { path: ["tournamentId"], equals: id } },
      orderBy: { createdAt: "desc" },
    });
    if (stakeTx) {
      await credit({ userId: targetId, type: "REFUND", amountCoins: tournament.stakeCoins, relatedTransactionId: stakeTx.id, metadata: { tournamentId: id, reason: "kicked_by_creator" } });
    }
    await prisma.tournamentEntry.delete({ where: { id: entry.id } });

    const detail = await serializeDetail(id, req.user.userId);
    return reply.send(detail);
  });
}
