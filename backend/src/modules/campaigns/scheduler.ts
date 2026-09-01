import { prisma } from "../../lib/prisma.js";
import { getBalance } from "../wallet/ledger.js";
import { getVipStatus } from "../vip/service.js";
import { sendMail } from "../../lib/mailer.js";
import { sendPush } from "../../lib/push.js";
import { CAMPAIGNS, pickCampaign, type CampaignContext } from "./content.js";

const CAMPAIGN_COOLDOWN_DAYS = 5; // pas plus d'un message automatique par joueur tous les N jours, tous canaux confondus
const CAMPAIGN_BATCH_SIZE = 30; // étale l'envoi sur plusieurs passages plutôt qu'une salve d'un coup

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60_000));
}

/** Un e-mail de campagne suit le même gabarit que les autres (§lib/mailer.ts
 * baseTemplate) — pas de fonction exportée pour ça, on la reconstruit ici
 * minimalement pour rester autonome sans changer l'API de mailer.ts. */
async function sendCampaignEmail(to: string, subject: string, bodyHtml: string) {
  await sendMail({
    to,
    subject,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#08080C;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#08080C;padding:32px 0;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#111117;border-radius:20px;overflow:hidden;">
            <tr><td style="background:#E5A800;padding:20px 28px;"><span style="font-size:18px;font-weight:800;color:#09090F;">QuizArena</span></td></tr>
            <tr><td style="padding:28px;"><div style="font-size:14px;line-height:1.6;color:#A7AFBC;">${bodyHtml}</div></td></tr>
            <tr><td style="padding:16px 28px;border-top:1px solid rgba(255,255,255,.07);">
              <span style="font-size:11px;color:#69707D;">QuizArena — quizarenaworld.com. Ce message automatique reflète l'activité réelle de ton compte, jamais une offre commerciale inventée.</span>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`,
    text: bodyHtml.replace(/<[^>]+>/g, ""),
  });
}

/** Une passe = un lot borné de joueurs éligibles, chacun avec un message
 * différent choisi selon sa propre situation réelle (§content.ts). Appelée
 * périodiquement depuis server.ts (§CAMPAIGN_SWEEP_INTERVAL_MS) — jamais
 * en rafale sur toute la base d'un coup. */
export async function runCampaignSweep(): Promise<number> {
  const cooldownCutoff = new Date(Date.now() - CAMPAIGN_COOLDOWN_DAYS * 24 * 60 * 60_000);

  const candidates = await prisma.user.findMany({
    where: {
      isBot: false,
      accountStatus: { in: ["ACTIVE", "WATCHED"] },
      OR: [{ lastCampaignSentAt: null }, { lastCampaignSentAt: { lte: cooldownCutoff } }],
    },
    select: {
      id: true, username: true, email: true, emailVerified: true,
      createdAt: true, lastLoginAt: true, lastCampaignType: true,
      vipGrantedAt: true, isAdmin: true,
      pushSubscriptions: { select: { id: true } },
    },
    take: CAMPAIGN_BATCH_SIZE,
    orderBy: { lastCampaignSentAt: { sort: "asc", nulls: "first" } },
  });

  let sent = 0;
  for (const user of candidates) {
    // Ni e-mail vérifié ni abonnement push : rien à envoyer, pas la peine
    // de calculer un contexte pour ce joueur.
    if (!(user.email && user.emailVerified) && user.pushSubscriptions.length === 0) continue;

    const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const [duelsWon30d, balanceCoins] = await Promise.all([
      prisma.duelMatch.count({ where: { winnerId: user.id, status: "COMPLETED", completedAt: { gte: since } } }),
      getBalance(user.id),
    ]);
    const vip = (await getVipStatus(user.id))!;
    const referenceDate = user.lastLoginAt ?? user.createdAt;
    const ctx: CampaignContext = {
      username: user.username,
      daysSinceActive: daysBetween(referenceDate, new Date()),
      balanceCoins,
      isVip: vip.isVip,
      vipRemainingWins: vip.remainingWins,
      duelsWon30d,
    };

    const campaign = pickCampaign(ctx, user.lastCampaignType);
    if (!campaign) continue; // aucun message éligible pour ce joueur cette fois-ci — retenté à la prochaine passe

    if (user.email && user.emailVerified) {
      await sendCampaignEmail(user.email, campaign.subject, campaign.emailBody(ctx)).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[campaigns] envoi e-mail échoué :", err);
      });
    }
    if (user.pushSubscriptions.length > 0) {
      await sendPush(user.id, { title: campaign.pushTitle, body: campaign.pushBody(ctx), url: "/", tag: `campaign-${campaign.id}` });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastCampaignSentAt: new Date(), lastCampaignType: campaign.id },
    });
    sent++;
  }

  return sent;
}

export { CAMPAIGNS };
