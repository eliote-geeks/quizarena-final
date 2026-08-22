import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Block, ConfirmModal, Input, Label, Loader } from "../ui";
import { NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import { ClanEmblem } from "../lib/clanEmblems";

const BANNER_COLORS = [
  "#f59e0b", "#ef4444", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

/**
 * Page des clans — liste globale + formulaire de création (FAB).
 * Un clan est un groupe de joueurs avec un tag [TAG], une couleur et
 * un leader. Les membres peuvent défier d'autres clans en duel collectif.
 */
export default function Clans() {
  const nav = useNavigate();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const sheetRef = useRef(null);

  // Formulaire création
  const [cName, setCName] = useState("");
  const [cTag, setCTag] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cColor, setCColor] = useState(BANNER_COLORS[0]);

  const load = () => api.getClans(page, 12).then(setData).catch(() => setError("Impossible de charger les clans"));

  useEffect(() => { load(); }, [page]);

  useEffect(() => {
    if (!showCreate) return;
    const handler = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) setShowCreate(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCreate]);

  const createClan = async () => {
    if (!cName.trim() || !cTag.trim()) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.createClan({ name: cName.trim(), tag: cTag.trim(), description: cDesc.trim(), bannerColor: cColor });
      setShowCreate(false);
      setCName(""); setCTag(""); setCDesc(""); setCColor(BANNER_COLORS[0]);
      await load();
      nav(`/clans/${r.clan.id}`);
    } catch (e) {
      setError(e.message || "Impossible de créer le clan");
    } finally {
      setBusy(false);
    }
  };

  const leaveClan = async () => {
    setShowLeave(false);
    setBusy(true);
    try {
      await api.leaveClan();
      await load();
    } catch (e) {
      setError(e.message || "Impossible de quitter le clan");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <Loader full />;

  const { clans, myClan } = data;

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 pt-8 pb-24 sm:px-8 sm:pt-12">
      <Label tone="flare">compétition d'équipe</Label>
      <h1 className="t-display mt-3 text-2xl sm:text-3xl">Clans</h1>
      <p className="t-body mt-2 max-w-md text-sm text-bone-4">
        Rejoins un clan ou crée le tien. Les clans se défient en duels collectifs pour
        dominer le classement.
      </p>

      {error && <p className="t-body mt-4 text-sm text-danger">{error}</p>}

      {/* ── Mon clan ── */}
      {myClan && (
        <div
          className="mt-8 flex cursor-pointer items-center gap-4 rounded-(--radius-card) border p-4 transition-colors hover:bg-ink-3"
          style={{ borderColor: myClan.clan.bannerColor + "50", background: myClan.clan.bannerColor + "0d" }}
          onClick={() => nav(`/clans/${myClan.clan.id}`)}
        >
          <ClanBadge tag={myClan.clan.tag} color={myClan.clan.bannerColor} emblemKey={myClan.clan.emblemKey} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="t-display text-lg font-black">{myClan.clan.name}</h2>
              {myClan.role === "leader" && <span className="text-base">👑</span>}
            </div>
            <p className="t-body text-xs text-bone-4">
              {myClan.role === "leader" ? "Leader" : myClan.role === "officer" ? "Officier" : "Membre"}
              {myClan.clan.description && ` · ${myClan.clan.description}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NavIcon type="shield" className="h-4 w-4 text-bone-4" />
          </div>
        </div>
      )}

      {/* ── Liste des clans ── */}
      <div className="mt-8">
        <Label className="mb-4">{clans.length} clan{clans.length !== 1 ? "s" : ""}</Label>
        {clans.length === 0 ? (
          <p className="t-body text-sm text-bone-4">
            Aucun clan pour l'instant — soyez le premier à en créer un !
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clans.map((c) => (
              <ClanCard
                key={c.id}
                clan={c}
                isMine={myClan?.clan.id === c.id}
                canJoin={!myClan}
                onView={() => nav(`/clans/${c.id}`)}
              />
            ))}
          </div>
        )}
        {data.pagination?.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="press rounded-lg bg-ink-3 px-4 py-2 text-xs disabled:opacity-40">← Précédent</button>
            <span className="t-label text-xs text-bone-4">Page {page} / {data.pagination.totalPages}</span>
            <button disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="press rounded-lg bg-ink-3 px-4 py-2 text-xs disabled:opacity-40">Suivant →</button>
          </div>
        )}
      </div>

      {/* ── FAB créer ou quitter ── */}
      {!myClan ? (
        <button
          onClick={() => nav("/clans/create")}
          aria-label="Créer un clan"
          className="press fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-5 z-[9800] flex h-14 w-14 items-center justify-center rounded-full bg-flare text-ink shadow-xl shadow-flare/30 hover:bg-flare/90 sm:bottom-6 sm:right-8"
        >
          <NavIcon type="plus" className="h-7 w-7" />
        </button>
      ) : (
        <button
          onClick={() => setShowLeave(true)}
          className="press fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-5 z-[9800] flex items-center gap-2 rounded-full bg-ink-3 px-4 py-3 text-xs text-bone-4 shadow-xl hover:text-danger sm:bottom-6 sm:right-8"
        >
          Quitter le clan
        </button>
      )}

      {/* ── Bottom sheet création ── */}
      {showCreate && (
        <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-ink/60 backdrop-blur-[3px] sm:items-center">
          <div
            ref={sheetRef}
            className="anim-rise w-full max-w-[480px] rounded-t-2xl bg-ink-2 px-6 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] shadow-2xl sm:rounded-2xl"
            style={{ maxHeight: "90dvh", overflowY: "auto" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <Label tone="flare">nouveau clan</Label>
                <h2 className="t-display mt-1 text-xl">Créer un clan</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-bone-4 hover:text-bone">
                <NavIcon type="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {/* Aperçu */}
              <div
                className="flex items-center gap-3 rounded-(--radius-card) p-4"
                style={{ background: cColor + "15", border: `1px solid ${cColor}40` }}
              >
                <ClanBadge tag={cTag || "TAG"} color={cColor} size="lg" />
                <div>
                  <div className="t-display font-black text-bone">{cName || "Nom du clan"}</div>
                  <div className="t-body text-xs text-bone-4">{cDesc || "Description…"}</div>
                </div>
              </div>

              {/* Nom */}
              <div>
                <label className="t-label mb-1.5 block text-xs text-bone-4">Nom du clan *</label>
                <Input
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="Ex. Les Insoumis, Alpha Squad…"
                  maxLength={30}
                />
              </div>

              {/* Tag */}
              <div>
                <label className="t-label mb-1.5 block text-xs text-bone-4">Tag [2–5 caractères] *</label>
                <Input
                  value={cTag}
                  onChange={(e) => setCTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                  placeholder="Ex. INS, ALF, QPZ…"
                  maxLength={5}
                  className="tracking-widest font-mono"
                />
                <p className="t-body mt-1 text-[11px] text-bone-4">Lettres et chiffres uniquement, affiché entre [crochets].</p>
              </div>

              {/* Description */}
              <div>
                <label className="t-label mb-1.5 block text-xs text-bone-4">Description (optionnel)</label>
                <textarea
                  value={cDesc}
                  onChange={(e) => setCDesc(e.target.value)}
                  placeholder="Décrivez l'esprit du clan…"
                  rows={2}
                  maxLength={100}
                  className="w-full rounded-(--radius-card) bg-ink-3 px-3 py-2 text-sm text-bone outline-none resize-none border border-transparent focus:border-flare/40"
                />
              </div>

              {/* Couleur */}
              <div>
                <label className="t-label mb-2 block text-xs text-bone-4">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {BANNER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCColor(c)}
                      className={clsx("press h-8 w-8 rounded-full transition-all", cColor === c && "ring-2 ring-offset-2 ring-offset-ink-2")}
                      style={{ background: c, ringColor: c }}
                      aria-label={`Couleur ${c}`}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="t-body text-sm text-danger">{error}</p>}

              <Block
                full
                size="lg"
                icon={<NavIcon type="shield" className="h-4 w-4" />}
                onClick={createClan}
                loading={busy}
                disabled={!cName.trim() || cTag.trim().length < 2}
              >
                Créer le clan
              </Block>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation quitter ── */}
      <ConfirmModal
        open={showLeave}
        tone="danger"
        title={myClan?.role === "leader" ? "Quitter le clan (leader) ?" : "Quitter le clan ?"}
        message={
          myClan?.role === "leader"
            ? "En tant que leader, quitter transférera automatiquement la direction au membre le plus ancien. Si tu es le seul membre, le clan sera dissous."
            : "Tu ne seras plus membre du clan. Tu pourras en rejoindre un autre ou en créer un nouveau."
        }
        confirmLabel="Quitter"
        onConfirm={leaveClan}
        onCancel={() => setShowLeave(false)}
      />
    </div>
  );
}

/* ── Sous-composants ── */

function ClanBadge({ tag, color, emblemKey, size = "md" }) {
  return <ClanEmblem tag={tag} color={color} emblemKey={emblemKey} size={size === "lg" ? "lg" : "sm"} />;
}

function ClanCard({ clan, isMine, canJoin, onView }) {
  const nav = useNavigate();
  const [joining, setJoining] = useState(false);

  const join = async (e) => {
    e.stopPropagation();
    setJoining(true);
    try {
      await api.joinClan(clan.id);
      nav(`/clans/${clan.id}`);
    } catch (err) {
      alert(err.message || "Impossible de rejoindre ce clan");
      setJoining(false);
    }
  };

  return (
    <div
      onClick={onView}
      className="group press cursor-pointer flex flex-col gap-3 rounded-(--radius-card) bg-ink-2 p-4 transition-colors hover:bg-ink-3"
    >
      <div className="flex items-center gap-3">
        <ClanBadge tag={clan.tag} color={clan.bannerColor} emblemKey={clan.emblemKey} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="t-display truncate text-[15px] font-bold">{clan.name}</h3>
            {isMine && <span className="text-sm">👑</span>}
          </div>
          <p className="t-body text-xs text-bone-4 truncate">{clan.description || "Aucune description"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="t-label flex items-center gap-1 text-[11px] text-bone-4">
          <NavIcon type="users" className="h-3 w-3" />
          {clan.memberCount} membre{clan.memberCount !== 1 ? "s" : ""}
        </div>
        {canJoin && !isMine ? (
          <button
            onClick={join}
            disabled={joining}
            className="press t-label rounded-(--radius-tag) bg-flare/15 px-2.5 py-1 text-[11px] text-flare hover:bg-flare/25 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {joining ? "…" : "Rejoindre"}
          </button>
        ) : isMine ? (
          <span className="t-label text-[11px] text-flare">Mon clan</span>
        ) : null}
      </div>
    </div>
  );
}
