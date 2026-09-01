import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import {
  ArrowLeft,
  Crown,
  Grid2X2,
  ImageIcon,
  Info,
  Loader2,
  Sparkles,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import { DEFAULT_TOURNAMENT_COVER, TOURNAMENT_COVERS } from "../lib/tournamentCovers";
import { SFX } from "../lib/soundEngine";

// Même rake que le duel (10%) — voir backend payout.ts
const PLATFORM_FEE_PCT = 0.10;

function calcPrizes(stakeCoins, capacity) {
  const pot = stakeCoins * capacity;
  const platformCut = Math.floor(pot * PLATFORM_FEE_PCT);
  const first    = Math.floor(pot * 0.54);
  const second   = Math.floor(pot * 0.225);
  const semiEach = Math.floor(pot * 0.0675);
  const prizes = [{ rank: 1, label: "🥇 Vainqueur",       coins: first }];
  if (capacity >= 2) prizes.push({ rank: 2, label: "🥈 Finaliste",       coins: second });
  if (capacity >= 4) prizes.push({ rank: 3, label: "🥉 Demi-finales ×2", coins: semiEach, each: true });
  return { pot, platformCut, prizes };
}

export default function TournamentCreate() {
  const navigate = useNavigate();
  const { currency, coins, refreshWallet } = useApp();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    categoryId: "",           // "" = mélangé
    stakeCoins: 500,
    capacity: 4,
    coverImage: DEFAULT_TOURNAMENT_COVER,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [customCover, setCustomCover] = useState(null); // { url, previewSrc } — photo importée par le créateur
  const [uploadingCover, setUploadingCover] = useState(false);

  const onCoverFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const previewSrc = URL.createObjectURL(file);
    setUploadingCover(true);
    try {
      const { url } = await api.uploadTournamentCover(file);
      setCustomCover({ url, previewSrc });
      setForm((f) => ({ ...f, coverImage: url }));
    } catch (err) {
      toast.error(err.message || "Envoi de l'image impossible.");
    } finally {
      setUploadingCover(false);
    }
  };

  useEffect(() => {
    api.getCategories()
      .then((data) => {
        // L'API renvoie { categories: [...] } ou directement un tableau
        const list = Array.isArray(data) ? data : (data.categories ?? []);
        setCategories(list);
      })
      .catch(() => setCategories([]));
  }, []);

  const { pot, platformCut, prizes } = calcPrizes(form.stakeCoins, form.capacity);
  const canCreate = form.name.trim().length > 0
    && form.stakeCoins >= 100
    && form.stakeCoins <= 50000
    && coins >= form.stakeCoins;

  const create = async () => {
    if (!canCreate || loading) return;
    setError("");
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        stakeCoins: form.stakeCoins,
        capacity: form.capacity,
        coverImage: form.coverImage,
      };
      // categoryId absent = mélangé (côté backend null = pool global)
      if (form.categoryId) payload.categoryId = form.categoryId;
      const t = await api.createTournament(payload);
      await refreshWallet();
      SFX.confirm();
      navigate(`/tournaments/${t.id}`);
    } catch (e) {
      SFX.error();
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="qa-shell space-y-6 py-8 max-w-2xl mx-auto">

      {/* Header */}
      <button
        onClick={() => navigate("/tournaments")}
        className="btn-ghost inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux tournois
      </button>

      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
          <Crown className="h-4 w-4" />
          Créer un tournoi
        </div>
        <h1 className="mt-2 font-display text-4xl font-extrabold">Configure le bracket</h1>
      </div>

      {/* Formulaire */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card rounded-3xl p-6 sm:p-8 space-y-6"
      >
        {/* Nom */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-sub)" }}>
            Nom du tournoi
          </label>
          <input
            autoFocus
            placeholder="Ex. Clash du dimanche soir"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={60}
            className="mt-2 w-full rounded-xl border bg-transparent px-4 py-3 text-base font-semibold focus:outline-none"
            style={{ borderColor: "var(--border)" }}
          />
          <p className="mt-1.5 text-xs" style={{ color: "var(--text-faint)" }}>{form.name.length}/60</p>
        </div>

        {/* Catégorie */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: "var(--text-sub)" }}>
            <Grid2X2 className="h-3.5 w-3.5" />
            Catégorie de questions
          </label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="mt-2 w-full rounded-xl border px-4 py-3 text-base font-semibold"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <option value="">🔀 Mélangé — toutes catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameFr ?? c.name?.fr ?? c.id}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs" style={{ color: "var(--text-faint)" }}>
            {form.categoryId ? "Toutes les questions viendront de cette catégorie." : "Questions piochées dans tout le banque de questions."}
          </p>
        </div>

        {/* Format + mise */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-sub)" }}>
              <Users className="inline h-3.5 w-3.5 mr-1" />
              Format
            </label>
            <select
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              className="mt-2 w-full rounded-xl border px-4 py-3 text-base font-semibold"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              {[4, 8, 16].map((n) => (
                <option key={n} value={n}>{n} joueurs</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-sub)" }}>
              Mise par joueur (F)
            </label>
            <input
              type="number"
              min="100"
              max="50000"
              value={form.stakeCoins}
              onChange={(e) => setForm({ ...form, stakeCoins: Number(e.target.value) })}
              className="mt-2 w-full rounded-xl border bg-transparent px-4 py-3 text-base font-semibold focus:outline-none"
              style={{ borderColor: "var(--border)" }}
            />
            {form.stakeCoins > coins && (
              <p className="mt-1.5 text-xs" style={{ color: "var(--danger)" }}>
                Solde insuffisant — ta mise est débitée immédiatement.
              </p>
            )}
          </div>
        </div>

        {/* Illustration */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: "var(--text-sub)" }}>
            <ImageIcon className="h-3.5 w-3.5" />
            Illustration du tournoi
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TOURNAMENT_COVERS.map((cover) => (
              <button
                key={cover.id}
                type="button"
                onClick={() => setForm({ ...form, coverImage: cover.src })}
                className="group relative overflow-hidden rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: form.coverImage === cover.src ? "var(--accent)" : "var(--border)",
                  boxShadow: form.coverImage === cover.src ? "0 0 0 2px var(--accent-soft)" : "none",
                }}
              >
                <img
                  src={cover.src}
                  alt=""
                  className="aspect-video w-full object-cover transition duration-200 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                  {cover.label}
                </span>
              </button>
            ))}

            {/* Photo importée — remplace la tuile "Importer" une fois envoyée,
                reste sélectionnable comme les photos par défaut. */}
            {customCover && (
              <button
                type="button"
                onClick={() => setForm({ ...form, coverImage: customCover.url })}
                className="group relative overflow-hidden rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: form.coverImage === customCover.url ? "var(--accent)" : "var(--border)",
                  boxShadow: form.coverImage === customCover.url ? "0 0 0 2px var(--accent-soft)" : "none",
                }}
              >
                <img src={customCover.previewSrc} alt="" className="aspect-video w-full object-cover transition duration-200 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-[10px] font-bold text-white">Ta photo</span>
              </button>
            )}

            <label
              className="group relative flex aspect-video cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed text-center transition-all"
              style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}
            >
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onCoverFile} hidden disabled={uploadingCover} />
              {uploadingCover ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <span className="text-[10px] font-bold uppercase tracking-wide">{customCover ? "Changer" : "Importer une photo"}</span>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Répartition des gains */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="card rounded-3xl p-6 sm:p-8"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
              <Trophy className="inline h-3.5 w-3.5 mr-1" />
              Répartition des gains
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">
              Pot total : {formatMoney(pot, currency)}
            </h2>
          </div>
          <span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "var(--surface-2)", color: "var(--text-sub)" }}>
            {form.capacity} joueurs
          </span>
        </div>

        <div className="space-y-2">
          {prizes.map((p) => (
            <div
              key={p.rank}
              className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ background: p.rank === 1 ? "rgba(229,168,0,.12)" : "var(--surface-2)" }}
            >
              <span className="text-sm font-semibold">{p.label}</span>
              <div className="text-right">
                <span className="text-base font-extrabold" style={{ color: p.rank === 1 ? "var(--accent)" : "var(--text)" }}>
                  {formatMoney(p.coins, currency)}
                </span>
                {p.each && <span className="ml-1 text-xs" style={{ color: "var(--text-faint)" }}>chacun</span>}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "var(--surface-2)" }}>
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-sub)" }}>
              <Info className="h-3.5 w-3.5" />
              Commission plateforme (10%)
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-faint)" }}>
              {formatMoney(platformCut, currency)}
            </span>
          </div>
        </div>

        <p className="mt-5 text-xs leading-5" style={{ color: "var(--text-faint)" }}>
          Ta mise de{" "}
          <strong style={{ color: "var(--text-sub)" }}>{formatMoney(form.stakeCoins, currency)}</strong>{" "}
          est débitée immédiatement à la création.
        </p>
      </motion.div>

      {error && (
        <p className="rounded-xl p-4 text-sm font-semibold" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        disabled={!canCreate || loading}
        onClick={create}
        className="btn-primary w-full rounded-2xl py-4 text-base font-extrabold disabled:opacity-40 inline-flex items-center justify-center gap-2"
      >
        <Sparkles className="h-5 w-5" />
        {loading ? "Création en cours…" : `Créer le tournoi — ${formatMoney(form.stakeCoins, currency)}`}
      </motion.button>
    </div>
  );
}
