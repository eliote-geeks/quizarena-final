import { useEffect } from "react";
import * as music from "../lib/musicEngine";

/**
 * Fond sonore léger pendant la navigation (accueil, catégories,
 * tournois…) — demande directe de Paul le 19/08 : "une petite musique
 * relaxante ambiante, des titres qui varient". Monté une seule fois
 * dans Shell.jsx, donc jamais actif pendant un vrai duel (Duel.jsx vit
 * hors Shell et gère sa propre musique selon la phase du combat).
 *
 * Les navigateurs bloquent tout son avant un vrai geste utilisateur —
 * on démarre donc au premier clic/touche plutôt qu'au montage, que le
 * son soit coupé ou non (§musicEngine.js : démarrer même en sourdine
 * permet à un "réactiver le son" plus tard d'être instantané, sans
 * attendre un second geste).
 */
export default function AmbientMusic() {
  useEffect(() => {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      music.playAmbient();
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      // Ne coupe PAS la musique ici : Shell reste monté à chaque
      // changement de page interne (accueil → tournois…), seul le
      // contenu change (§Shell.jsx). La musique s'arrête réellement en
      // sortant vers un écran hors Shell (Duel.jsx la reprend à son
      // compte dès l'entrée en duel).
    };
  }, []);

  return null;
}
