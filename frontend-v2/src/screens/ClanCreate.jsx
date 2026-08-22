import { useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Block, Input, Label } from "../ui";
import { NavIcon } from "../ui/icons";
import * as api from "../lib/api";
import { CLAN_EMBLEMS, ClanEmblem } from "../lib/clanEmblems";

const COLORS = ["#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const POLICIES = [
  { value: "OPEN", title: "Ouvert", detail: "Tout joueur qui respecte tes critères entre immédiatement." },
  { value: "APPROVAL", title: "Sur candidature", detail: "Le chef ou un officier accepte chaque demande." },
  { value: "CLOSED", title: "Fermé", detail: "Aucune nouvelle adhésion tant que tu ne rouvres pas le clan." },
];

export default function ClanCreate() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [emblemKey, setEmblemKey] = useState(CLAN_EMBLEMS[0].key);
  const [joinPolicy, setJoinPolicy] = useState("APPROVAL");
  const [minimumCoins, setMinimumCoins] = useState(0);
  const [minimumGames, setMinimumGames] = useState(0);
  const [maxMembers, setMaxMembers] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    setBusy(true); setError("");
    try {
      const result = await api.createClan({ name, tag, description, bannerColor: color, emblemKey, joinPolicy, minimumCoins, minimumGames, maxMembers });
      nav(`/clans/${result.clan.id}`);
    } catch (err) {
      setError(err.message || "Impossible de créer le clan");
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto w-full max-w-[760px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      <button onClick={() => nav("/clans")} className="t-label text-bone-4 hover:text-flare">← clans</button>
      <Label tone="flare" className="mt-8">créer une équipe</Label>
      <h1 className="t-display mt-3 text-3xl sm:text-4xl">Créer ton clan</h1>
      <p className="t-body mt-2 max-w-xl text-sm text-bone-4">Définis l’identité de ton équipe et décide qui peut la rejoindre. Tu pourras modifier ces règles plus tard.</p>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <Panel title="Identité du clan">
            <Field label="Nom du clan *"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="Ex. Les Insoumis" /></Field>
            <Field label="Tag [2–5 caractères] *"><Input value={tag} onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))} maxLength={5} placeholder="INS" className="font-mono tracking-widest" /></Field>
            <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={100} rows={3} placeholder="L’esprit et l’ambition de votre clan…" className="w-full resize-none rounded-(--radius-card) border border-ink-5 bg-ink-3 px-3 py-2.5 text-sm text-bone outline-none focus:border-flare/50" /></Field>
            <div><label className="t-label mb-2 block text-xs text-bone-4">Couleur</label><div className="flex flex-wrap gap-2">{COLORS.map((item) => <button key={item} onClick={() => setColor(item)} className={clsx("h-8 w-8 rounded-full", color === item && "ring-2 ring-bone ring-offset-2 ring-offset-ink-2")} style={{ background: item }} aria-label={`Choisir ${item}`} />)}</div></div>
            <div><label className="t-label mb-2 block text-xs text-bone-4">Emblème anime</label><div className="grid grid-cols-4 gap-2">{CLAN_EMBLEMS.map((item) => <button key={item.key} type="button" onClick={() => setEmblemKey(item.key)} className={clsx("rounded-xl p-1.5 transition", emblemKey === item.key ? "bg-flare/15 ring-2 ring-flare" : "bg-ink-3 hover:bg-ink-4")} title={item.label}><ClanEmblem emblemKey={item.key} color={color} size="sm" className="mx-auto" /><span className="t-label mt-1 block truncate text-[8px] text-bone-4">{item.label}</span></button>)}</div></div>
          </Panel>

          <Panel title="Accès au clan" hint="Le chef et les officiers pourront gérer les demandes.">
            <div className="grid gap-2">{POLICIES.map((policy) => <button key={policy.value} onClick={() => setJoinPolicy(policy.value)} className={clsx("rounded-(--radius-card) border p-3 text-left transition-colors", joinPolicy === policy.value ? "border-flare bg-flare/10" : "border-ink-5 bg-ink-3 hover:bg-ink-4")}><div className="t-title text-sm">{policy.title}</div><div className="t-body mt-1 text-xs text-bone-4">{policy.detail}</div></button>)}</div>
          </Panel>

          <Panel title="Critères minimums" hint="Ils sont vérifiés côté serveur à chaque entrée.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Solde (F)"><Input type="number" min="0" value={minimumCoins} onChange={(e) => setMinimumCoins(Number(e.target.value))} /></Field>
              <Field label="Parties terminées"><Input type="number" min="0" value={minimumGames} onChange={(e) => setMinimumGames(Number(e.target.value))} /></Field>
              <Field label="Membres maximum"><Input type="number" min="2" max="20" value={maxMembers} onChange={(e) => setMaxMembers(Math.min(20, Number(e.target.value)))} /></Field>
            </div>
          </Panel>
          {error && <p className="t-body text-sm text-danger">{error}</p>}
          <Block full size="lg" loading={busy} disabled={name.trim().length < 2 || tag.trim().length < 2} icon={<NavIcon type="shield" className="h-4 w-4" />} onClick={create}>Créer le clan</Block>
        </div>

        <aside className="h-fit rounded-2xl border p-5 lg:sticky lg:top-8" style={{ borderColor: color + "60", background: color + "0d" }}>
          <Label tone="flare">aperçu</Label>
          <div className="mt-5 flex items-center gap-3"><ClanEmblem emblemKey={emblemKey} tag={tag || "TAG"} color={color} size="lg" /><div className="min-w-0"><div className="t-display truncate text-lg font-black">{name || "Nom du clan"}</div><div className="t-body mt-1 text-xs text-bone-4">{description || "Votre communauté de joueurs"}</div></div></div>
          <div className="mt-5 border-t border-bone/10 pt-4 text-xs text-bone-4"><div>{POLICIES.find((item) => item.value === joinPolicy)?.title}</div><div className="mt-1">{minimumGames || "Aucune"} partie min. · {minimumCoins.toLocaleString("fr-FR")} F min.</div><div className="mt-1">Jusqu’à {maxMembers} membres</div></div>
        </aside>
      </section>
    </main>
  );
}

function Panel({ title, hint, children }) { return <section className="rounded-2xl border border-ink-5 bg-ink-2 p-5 sm:p-6"><h2 className="t-display text-lg font-black">{title}</h2>{hint && <p className="t-body mt-1 text-xs text-bone-4">{hint}</p>}<div className="mt-5 space-y-4">{children}</div></section>; }
function Field({ label, children }) { return <label className="block"><span className="t-label mb-1.5 block text-xs text-bone-4">{label}</span>{children}</label>; }
