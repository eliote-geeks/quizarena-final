import nodemailer from "nodemailer";
import { env } from "./env.js";

/**
 * Envoi d'e-mails via la boîte pro LWS du domaine (noreply@quizarenaworld.com).
 * Un seul point d'entrée pour toute l'app : vérification de compte à
 * l'inscription, et notifications importantes côté compte (retrait
 * traité, alerte de sécurité...). Les événements de jeu temps réel (défi
 * reçu, résultat de duel) passent par le push, pas par e-mail — voir
 * §lib/push.ts.
 *
 * Aucun SMTP configuré (dev local, ou avant que Paul ait renseigné les
 * identifiants LWS) : on logue le contenu au lieu d'échouer, pour ne
 * jamais bloquer une inscription à cause d'un mailer indisponible.
 */
const transporter = env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true = SSL direct (port 465) ; false = STARTTLS (port 587)
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
  if (!transporter) {
    // eslint-disable-next-line no-console
    console.warn(`[mailer] SMTP non configuré — e-mail non envoyé (à ${opts.to}) :\n${opts.subject}\n${opts.text ?? opts.html}`);
    return;
  }
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

function baseTemplate(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#08080C;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#08080C;padding:32px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#111117;border-radius:20px;overflow:hidden;">
          <tr><td style="background:#E5A800;padding:20px 28px;">
            <span style="font-size:18px;font-weight:800;color:#09090F;">QuizArena</span>
          </td></tr>
          <tr><td style="padding:28px;">
            <h1 style="margin:0 0 12px;font-size:20px;color:#F8FAFC;">${title}</h1>
            <div style="font-size:14px;line-height:1.6;color:#A7AFBC;">${bodyHtml}</div>
          </td></tr>
          <tr><td style="padding:16px 28px;border-top:1px solid rgba(255,255,255,.07);">
            <span style="font-size:11px;color:#69707D;">QuizArena — quizarenaworld.com. Réponds jamais à une demande de mot de passe par e-mail.</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

export async function sendVerificationEmail(to: string, username: string, code: string) {
  await sendMail({
    to,
    subject: `${code} — Vérifie ton adresse QuizArena`,
    html: baseTemplate("Vérifie ton adresse e-mail", `
      <p>Salut ${escapeHtml(username)},</p>
      <p>Voici ton code de vérification, valable 15 minutes :</p>
      <p style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;padding:14px 28px;background:rgba(229,168,0,.14);border:1px solid rgba(229,168,0,.4);border-radius:12px;font-size:26px;font-weight:800;letter-spacing:6px;color:#E5A800;">${code}</span>
      </p>
      <p>Si tu n'es pas à l'origine de cette inscription, ignore simplement ce message.</p>
    `),
    text: `Ton code de vérification QuizArena : ${code} (valable 15 minutes)`,
  });
}

export async function sendPasswordResetEmail(to: string, username: string, code: string) {
  await sendMail({
    to,
    subject: `${code} — Réinitialise ton mot de passe QuizArena`,
    html: baseTemplate("Réinitialisation du mot de passe", `
      <p>Salut ${escapeHtml(username)},</p>
      <p>Voici ton code pour choisir un nouveau mot de passe, valable 15 minutes :</p>
      <p style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;padding:14px 28px;background:rgba(229,168,0,.14);border:1px solid rgba(229,168,0,.4);border-radius:12px;font-size:26px;font-weight:800;letter-spacing:6px;color:#E5A800;">${code}</span>
      </p>
      <p>Si tu n'es pas à l'origine de cette demande, ignore ce message : ton mot de passe reste inchangé.</p>
    `),
    text: `Ton code de réinitialisation QuizArena : ${code} (valable 15 minutes)`,
  });
}

/** Notification e-mail générique (retrait traité, alerte de sécurité...).
 * Pas destinée aux événements de jeu temps réel — voir §lib/push.ts. */
export async function sendNotificationEmail(to: string, subject: string, message: string) {
  await sendMail({
    to,
    subject,
    html: baseTemplate(subject, `<p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>`),
    text: message,
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
