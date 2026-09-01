import { Component } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Filet de sécurité autour de l'écran de duel.
 *
 * Ajouté après un vrai crash en production (30/08/2026) : une variable
 * référencée sans être passée en prop (`interCard` dans ArenaQuestion,
 * §DuelPlay.jsx) a fait planter tout l'arbre React au moment précis où la
 * révélation s'affichait — juste après avoir répondu. Sans limite
 * d'erreur, React démonte l'intégralité de l'application : écran
 * totalement noir, aucun message, et surtout aucun moyen de savoir ce
 * qu'il advient de sa mise pendant qu'un duel réel tourne toujours côté
 * serveur.
 *
 * Cette limite ne "répare" rien — un bug de rendu reste un bug — mais
 * elle empêche qu'un défaut d'affichage se traduise par une page morte
 * sur un match où de l'argent est engagé : elle explique où en est la
 * mise et propose de retourner au lobby, où GlobalMatchRedirect et le
 * serveur (source de vérité sur le score et le solde) reprennent la main.
 */
export default class DuelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Pas de service de suivi d'erreurs branché côté client pour l'instant :
    // au moins garder la trace dans la console pour un diagnostic après coup.
    console.error("DuelErrorBoundary a intercepté :", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ background: "var(--bg)" }}>
        <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="font-display mt-5 text-2xl font-extrabold" style={{ color: "var(--text)" }}>
          L'affichage du duel a rencontré un problème
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed" style={{ color: "var(--text-sub)" }}>
          Ton duel continue de se dérouler normalement côté serveur — c'est
          uniquement l'affichage qui a planté. Ta mise et ton score ne sont
          jamais gérés par cet écran. Reviens au lobby : si le duel est
          encore en cours, tu seras redirigé automatiquement dès qu'il est
          possible de s'y reconnecter.
        </p>
        <button
          onClick={() => { window.location.href = "/"; }}
          className="btn-primary mt-6 rounded-2xl px-6 py-3 font-bold"
        >
          Retour au lobby
        </button>
      </div>
    );
  }
}
