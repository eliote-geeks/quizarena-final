/**
 * Dashboard Admin — QuizArena
 * Accessible uniquement aux comptes isAdmin=true.
 * Tabs : Vue d'ensemble · Utilisateurs · Questions · Transactions ·
 *        Quarantaine · Signalements · Catégories · Classement
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Block, Input, Label, Loader, Tag } from "../ui";
import { NavIcon } from "../ui/icons";
import * as api from "../lib/api";

// ── Palette & helpers ────────────────────────────────────────────────

const TABS = [
  { id: "overview",      label: "Vue d'ensemble" },
  { id: "users",         label: "Utilisateurs"   },
  { id: "questions",     label: "Questions"       },
  { id: "transactions",  label: "Transactions"    },
  { id: "quarantine",    label: "Quarantaine"     },
  { id: "flags",         label: "Signalements"    },
  { id: "categories",    label: "Catégories"      },
  { id: "leaderboard",   label: "Classement"      },
  { id: "settings",      label: "Paramètres"      },
];

function fmt(n) { return (n ?? 0).toLocaleString("fr-FR"); }
function fmtF(n) { return `${fmt(n)} F`; }
function fmtDate(d) { return new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }); }

// ── SVG BarChart inline ──────────────────────────────────────────────

function BarChart({ data, keyY, label, color = "var(--color-flare)" }) {
  if (!data?.length) return null;
  const W = 560, H = 140, PAD_L = 40, PAD_B = 28, gap = 4;
  const max = Math.max(1, ...data.map((d) => d[keyY] ?? 0));
  const barW = (W - PAD_L - gap * (data.length - 1)) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H + PAD_B}`} className="w-full" style={{ maxWidth: W }}>
      {/* Grille horizontale */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={PAD_L} x2={W} y1={H - H * f} x2={W} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      {/* Barres */}
      {data.map((d, i) => {
        const h = Math.round((H * (d[keyY] ?? 0)) / max);
        const x = PAD_L + i * (barW + gap);
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={barW} height={h} fill={color} opacity={0.82} rx={2} />
            {/* Date axe X (toutes les 3) */}
            {i % 3 === 0 && (
              <text x={x + barW / 2} y={H + PAD_B - 4} textAnchor="middle"
                fontSize={9} fill="rgba(255,255,255,0.35)">
                {d.date?.slice(5)}
              </text>
            )}
          </g>
        );
      })}
      {/* Axe Y label max */}
      <text x={PAD_L - 4} y={12} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.35)">{fmt(max)}</text>
      {/* Label */}
      <text x={PAD_L} y={H + PAD_B - 4} fontSize={9} fill="rgba(255,255,255,0.5)">{label}</text>
    </svg>
  );
}

// ── KPI tile ────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, color }) {
  return (
    <div className="gacha-card flex flex-col gap-1 rounded-xl p-4"
      style={{ border: "1.5px solid rgba(255,255,255,0.07)", boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
      <span className="t-label text-[11px] text-bone-4">{title}</span>
      <span className="t-display text-[22px]" style={{ color: color || "var(--color-flare)" }}>{value}</span>
      {sub && <span className="t-body text-[11px] text-bone-4">{sub}</span>}
    </div>
  );
}

// ── Section Overview ─────────────────────────────────────────────────

function TabOverview() {
  const [ov, setOv] = useState(null);
  const [daily, setDaily] = useState(null);

  useEffect(() => {
    api.adminOverview().then(setOv).catch(() => {});
    api.adminDailyStats().then((r) => setDaily(r.data)).catch(() => {});
  }, []);

  if (!ov) return <Loader full />;

  return (
    <div className="flex flex-col gap-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard title="Utilisateurs" value={fmt(ov.totalUsers)} />
        <KpiCard title="Balance plateforme" value={fmtF(ov.balanceLiability)} sub="total dépôts - retraits" />
        <KpiCard title="Mise en jeu (STAKE)" value={fmtF(ov.byType?.STAKE)} color="var(--color-danger)" />
        <KpiCard title="Gains distribués (PAYOUT)" value={fmtF(ov.byType?.PAYOUT)} color="#4ade80" />
        <KpiCard title="Dépôts totaux" value={fmtF(ov.byType?.DEPOSIT)} />
        <KpiCard title="Retraits totaux" value={fmtF(ov.byType?.WITHDRAWAL)} />
        <KpiCard title="Quarantaine" value={fmt(ov.quarantine)} sub="transactions bloquées" color="#f97316" />
        <KpiCard title="Duels aujourd'hui" value={fmt(ov.duelsToday)} />
        <KpiCard title="Tournois actifs" value={fmt(ov.activeTournaments)} />
        <KpiCard title="Questions en attente" value={fmt(ov.questionsPending)} sub="non encore activées" />
        <KpiCard title="Signalements" value={fmt(ov.flags)} sub="non résolus" color="#f97316" />
      </div>

      {/* Graphiques */}
      {daily && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="gacha-card rounded-xl p-4"
            style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
            <Label className="mb-3">Dépôts (14 jours)</Label>
            <BarChart data={daily} keyY="deposits" label="dépôts" color="var(--color-flare)" />
          </div>
          <div className="gacha-card rounded-xl p-4"
            style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
            <Label className="mb-3">Retraits (14 jours)</Label>
            <BarChart data={daily} keyY="withdrawals" label="retraits" color="#f97316" />
          </div>
          <div className="gacha-card rounded-xl p-4"
            style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
            <Label className="mb-3">Mises (14 jours)</Label>
            <BarChart data={daily} keyY="stakes" label="stakes" color="#818cf8" />
          </div>
          <div className="gacha-card rounded-xl p-4"
            style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
            <Label className="mb-3">Gains distribués (14 jours)</Label>
            <BarChart data={daily} keyY="payouts" label="payouts" color="#4ade80" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section Utilisateurs ─────────────────────────────────────────────

function TabUsers() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [creditAmt, setCreditAmt] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [msg, setMsg] = useState("");

  const search = useCallback(() => {
    api.adminUsers(q).then((r) => setUsers(r.users)).catch(() => {});
  }, [q]);

  useEffect(() => { search(); }, [search]);

  async function doStatus(id, status) {
    if (busy) return;
    setBusy(true);
    try { await api.adminSetUserStatus(id, status); search(); setMsg("Statut mis à jour"); } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  async function doCredit(id, sign) {
    const amt = parseFloat(creditAmt);
    if (!amt || amt <= 0) return;
    setBusy(true);
    try {
      if (sign > 0) await api.adminCredit(id, amt, creditReason || "admin_credit");
      else await api.adminDebit(id, amt, creditReason || "admin_debit");
      setCreditAmt(""); setCreditReason("");
      setMsg(`Compte ${sign > 0 ? "crédité" : "débité"} de ${fmt(amt)} F`);
      search();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  const u = selected ? users.find((x) => x.id === selected) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Pseudo, e-mail ou téléphone…" className="flex-1 max-w-sm" />
        <Block size="sm" onClick={search}>Chercher</Block>
      </div>

      {msg && <p className="t-body text-sm text-flare">{msg}</p>}

      <div className="overflow-x-auto rounded-xl" style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="t-label text-[11px] text-bone-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <th className="px-4 py-3 text-left">Pseudo</th>
              <th className="px-4 py-3 text-left">Téléphone</th>
              <th className="px-4 py-3 text-right">Solde</th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-ink-3 transition-colors cursor-pointer"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                onClick={() => setSelected(selected === u.id ? null : u.id)}>
                <td className="px-4 py-3">
                  <span className="t-title text-[13px]">{u.username}</span>
                  {u.isAdmin && <Tag tone="flare" className="ml-2 text-[9px]">ADMIN</Tag>}
                </td>
                <td className="px-4 py-3 text-bone-4">{u.phone}</td>
                <td className="px-4 py-3 text-right text-flare">{fmtF(u.balance)}</td>
                <td className="px-4 py-3 text-center">
                  <Tag tone={u.accountStatus === "ACTIVE" ? "live" : "ghost"} className="text-[10px]">
                    {u.accountStatus}
                  </Tag>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {u.accountStatus === "ACTIVE"
                      ? <button onClick={() => doStatus(u.id, "SUSPENDED")} className="t-label text-[10px] text-danger hover:opacity-75">Suspendre</button>
                      : <button onClick={() => doStatus(u.id, "ACTIVE")} className="t-label text-[10px] text-bone-2 hover:opacity-75">Réactiver</button>
                    }
                    {u.accountStatus !== "BANNED" &&
                      <button onClick={() => doStatus(u.id, "BANNED")} className="t-label text-[10px] text-danger hover:opacity-75">Bannir</button>
                    }
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Panneau crédit/débit */}
      {u && (
        <div className="gacha-card rounded-xl p-5"
          style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
          <Label className="mb-4">Crédit / Débit — {u.username}</Label>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <Label className="text-[11px]">Montant (F)</Label>
              <Input value={creditAmt} onChange={(e) => setCreditAmt(e.target.value)}
                placeholder="ex. 500" className="w-36" type="number" min={1} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px]">Raison (optionnel)</Label>
              <Input value={creditReason} onChange={(e) => setCreditReason(e.target.value)}
                placeholder="bonus concours…" className="w-52" />
            </div>
            <Block size="sm" onClick={() => doCredit(u.id, 1)} loading={busy}>+ Crédit</Block>
            <Block size="sm" tone="danger" onClick={() => doCredit(u.id, -1)} loading={busy}>− Débit</Block>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section Questions ─────────────────────────────────────────────────

function TabQuestions() {
  const [pending, setPending] = useState([]);
  const [active, setActive] = useState([]);
  const [cats, setCats] = useState([]);
  const [tab, setTab] = useState("pending");
  const [genCat, setGenCat] = useState("");
  const [genCount, setGenCount] = useState(10);
  const [genBusy, setGenBusy] = useState(false);
  const [bulkCat, setBulkCat] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const loadPending = () => api.adminQuestions(false).then((r) => setPending(r.questions)).catch(() => {});
  const loadActive  = () => api.adminQuestions(true).then((r) => setActive(r.questions)).catch(() => {});

  useEffect(() => {
    loadPending(); loadActive();
    api.adminCategories().then((r) => {
      setCats(r.categories);
      if (r.categories.length) setGenCat(r.categories[0].id);
    }).catch(() => {});
  }, []);

  async function activate(id) {
    await api.adminActivateQ(id).catch(() => {});
    loadPending(); loadActive();
  }
  async function del(id) {
    await api.adminDeleteQ(id).catch(() => {});
    loadPending(); loadActive();
  }
  async function generate() {
    if (!genCat || genBusy) return;
    setGenBusy(true); setMsg("Génération en cours (peut prendre ~30s)…");
    try {
      const r = await api.adminGenerateQ(genCat, genCount);
      setMsg(`${r.created} questions générées et mises en attente.`);
      loadPending();
    } catch (e) { setMsg(`Erreur : ${e.message}`); }
    setGenBusy(false);
  }
  async function bulkDelete() {
    if (!bulkCat || bulkBusy) return;
    if (!confirm("Supprimer toutes les questions inactives de cette catégorie ?")) return;
    setBulkBusy(true);
    try {
      const r = await api.adminBulkDeleteQ(bulkCat, false);
      setMsg(`${r.deleted} questions supprimées.`);
      loadPending(); loadActive();
    } catch (e) { setMsg(`Erreur : ${e.message}`); }
    setBulkBusy(false);
  }

  const list = tab === "pending" ? pending : active;

  return (
    <div className="flex flex-col gap-6">
      {/* Sous-tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab("pending")}
          className={`t-label px-4 py-2 rounded-lg text-[12px] transition-colors ${tab === "pending" ? "bg-flare text-ink" : "bg-ink-3 text-bone-3 hover:bg-ink-4"}`}>
          En attente ({pending.length})
        </button>
        <button onClick={() => setTab("active")}
          className={`t-label px-4 py-2 rounded-lg text-[12px] transition-colors ${tab === "active" ? "bg-flare text-ink" : "bg-ink-3 text-bone-3 hover:bg-ink-4"}`}>
          Actives ({active.length})
        </button>
      </div>

      {msg && <p className="t-body text-sm text-flare">{msg}</p>}

      {/* Génération IA */}
      <div className="gacha-card rounded-xl p-5" style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
        <Label className="mb-4">Générer des questions (IA — qwen2.5)</Label>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <Label className="text-[11px]">Catégorie</Label>
            <select value={genCat} onChange={(e) => setGenCat(e.target.value)}
              className="bg-ink-3 text-bone-2 text-[13px] rounded-lg px-3 py-2 border-none outline-none focus:ring-1 focus:ring-flare">
              {cats.map((c) => <option key={c.id} value={c.id}>{c.nameFr} ({c.total} questions)</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px]">Nombre (max 30)</Label>
            <Input value={genCount} onChange={(e) => setGenCount(Math.min(30, parseInt(e.target.value) || 1))}
              type="number" min={1} max={30} className="w-24" />
          </div>
          <Block size="sm" onClick={generate} loading={genBusy}>Générer</Block>
        </div>
      </div>

      {/* Suppression en lot */}
      <div className="gacha-card rounded-xl p-5" style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
        <Label className="mb-4">Supprimer en lot (inactives)</Label>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <Label className="text-[11px]">Catégorie</Label>
            <select value={bulkCat} onChange={(e) => setBulkCat(e.target.value)}
              className="bg-ink-3 text-bone-2 text-[13px] rounded-lg px-3 py-2 border-none outline-none focus:ring-1 focus:ring-flare">
              <option value="">-- toutes --</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.nameFr}</option>)}
            </select>
          </div>
          <Block size="sm" tone="danger" onClick={bulkDelete} loading={bulkBusy}>Supprimer</Block>
        </div>
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-2">
        {list.length === 0 && <p className="t-body text-sm text-bone-4">Aucune question.</p>}
        {list.map((q) => (
          <div key={q.id} className="gacha-card rounded-xl px-4 py-3 flex items-start gap-4"
            style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
            <div className="flex-1 min-w-0">
              <p className="t-body text-[13px] leading-snug">{q.textFr}</p>
              {Array.isArray(q.options) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((opt, i) => (
                    <span key={i} className={`text-[11px] px-2 py-0.5 rounded ${i === q.answerIndex ? "bg-flare/20 text-flare" : "bg-ink-3 text-bone-4"}`}>
                      {opt}
                    </span>
                  ))}
                </div>
              )}
              <p className="t-label text-[10px] text-bone-4 mt-2">{q.categoryId} · {q.source}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {tab === "pending" && (
                <button onClick={() => activate(q.id)}
                  className="t-label text-[11px] text-flare hover:opacity-75 whitespace-nowrap">✓ Activer</button>
              )}
              <button onClick={() => del(q.id)}
                className="t-label text-[11px] text-danger hover:opacity-75 whitespace-nowrap">✕ Suppr.</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section Transactions ──────────────────────────────────────────────

function TabTransactions() {
  const [txs, setTxs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    const params = { page };
    if (filterType)   params.type   = filterType;
    if (filterStatus) params.status = filterStatus;
    api.adminTransactions(params).then((r) => {
      setTxs(r.transactions);
      setTotal(r.total);
      setPages(r.pages);
    }).catch(() => {});
  }, [page, filterType, filterStatus]);

  const TYPES   = ["", "DEPOSIT", "WITHDRAWAL", "STAKE", "PAYOUT", "REFUND", "BONUS"];
  const STATUSES = ["", "PENDING", "COMPLETED", "FAILED", "QUARANTINED"];

  return (
    <div className="flex flex-col gap-5">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[11px]">Type</Label>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="bg-ink-3 text-bone-2 text-[13px] rounded-lg px-3 py-2 border-none outline-none focus:ring-1 focus:ring-flare">
            {TYPES.map((t) => <option key={t} value={t}>{t || "Tous"}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[11px]">Statut</Label>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-ink-3 text-bone-2 text-[13px] rounded-lg px-3 py-2 border-none outline-none focus:ring-1 focus:ring-flare">
            {STATUSES.map((s) => <option key={s} value={s}>{s || "Tous"}</option>)}
          </select>
        </div>
        <div className="t-body self-end text-sm text-bone-4">{fmt(total)} transactions</div>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="t-label text-[11px] text-bone-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Utilisateur</th>
              <th className="px-4 py-3 text-center">Type</th>
              <th className="px-4 py-3 text-right">Montant</th>
              <th className="px-4 py-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id} className="hover:bg-ink-3 transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td className="px-4 py-3 text-bone-4 text-[12px] whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                <td className="px-4 py-3 text-[13px]">{t.user?.username ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <Tag tone={typeTone(t.type)} className="text-[10px]">{t.type}</Tag>
                </td>
                <td className={`px-4 py-3 text-right t-display text-[13px] ${t.amountCoins < 0 ? "text-danger" : "text-flare"}`}>
                  {t.amountCoins > 0 ? "+" : ""}{fmtF(t.amountCoins)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Tag tone={statusTone2(t.status)} className="text-[10px]">{t.status}</Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: Math.min(pages, 20) }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => setPage(p)}
            className={`t-label px-3 py-1.5 rounded text-[12px] ${p === page ? "bg-flare text-ink" : "bg-ink-3 text-bone-3 hover:bg-ink-4"}`}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
function typeTone(t) {
  if (t === "DEPOSIT" || t === "PAYOUT" || t === "BONUS") return "live";
  if (t === "WITHDRAWAL" || t === "STAKE") return "flare";
  return "ghost";
}
function statusTone2(s) {
  if (s === "COMPLETED") return "live";
  if (s === "QUARANTINED" || s === "PENDING") return "flare";
  return "ghost";
}

// ── Section Quarantaine ───────────────────────────────────────────────

function TabQuarantine() {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState("");
  const load = () => api.adminQuarantine().then((r) => setList(r.transactions)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function release(id) {
    await api.adminReleaseQ(id).catch((e) => setMsg(e.message));
    load(); setMsg("Transaction libérée.");
  }
  async function reject(id) {
    await api.adminRejectQ(id).catch((e) => setMsg(e.message));
    load(); setMsg("Transaction rejetée.");
  }

  return (
    <div className="flex flex-col gap-5">
      {msg && <p className="t-body text-sm text-flare">{msg}</p>}
      {list.length === 0 && <p className="t-body text-sm text-bone-4">Aucune transaction en quarantaine.</p>}
      {list.map((t) => (
        <div key={t.id} className="gacha-card rounded-xl p-4 flex items-center gap-4"
          style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
          <div className="flex-1 min-w-0">
            <p className="t-title text-[13px]">{t.user?.username} · {t.type}</p>
            <p className="t-body text-[12px] text-bone-4">{fmtDate(t.createdAt)} · {fmtF(t.amountCoins)}</p>
            {t.metadata?.reason && (
              <p className="t-body text-[11px] text-bone-4 mt-1">Raison : {t.metadata.reason}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => release(t.id)} className="t-label text-[11px] text-flare hover:opacity-75">Libérer</button>
            <button onClick={() => reject(t.id)} className="t-label text-[11px] text-danger hover:opacity-75">Rejeter</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section Signalements ──────────────────────────────────────────────

function TabFlags() {
  const [list, setList] = useState([]);
  const [note, setNote] = useState({});
  const [msg, setMsg] = useState("");
  const load = () => api.adminFlags().then((r) => setList(r.flags)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function resolve(id) {
    await api.adminResolveFlag(id, note[id] || "").catch((e) => setMsg(e.message));
    load(); setMsg("Signalement résolu.");
  }

  return (
    <div className="flex flex-col gap-5">
      {msg && <p className="t-body text-sm text-flare">{msg}</p>}
      {list.length === 0 && <p className="t-body text-sm text-bone-4">Aucun signalement non résolu.</p>}
      {list.map((f) => (
        <div key={f.id} className="gacha-card rounded-xl p-4 flex flex-col gap-3"
          style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
          <div>
            <p className="t-title text-[13px]">{f.type} — {f.user?.username}</p>
            <p className="t-body text-[12px] text-bone-4">{fmtDate(f.createdAt)}</p>
            {f.details && <p className="t-body text-[12px] text-bone-3 mt-1">{JSON.stringify(f.details)}</p>}
          </div>
          <div className="flex gap-3 items-end">
            <Input value={note[f.id] ?? ""} onChange={(e) => setNote({ ...note, [f.id]: e.target.value })}
              placeholder="Note de résolution…" className="flex-1" />
            <button onClick={() => resolve(f.id)} className="t-label text-[12px] text-flare hover:opacity-75 whitespace-nowrap">✓ Résoudre</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section Catégories ────────────────────────────────────────────────

function TabCategories() {
  const [cats, setCats] = useState([]);
  useEffect(() => {
    api.adminCategories().then((r) => setCats(r.categories)).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {cats.length === 0 && <p className="t-body text-sm text-bone-4">Chargement…</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <div key={c.id} className="gacha-card rounded-xl p-4"
            style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
            <p className="t-title text-[14px]">{c.nameFr}</p>
            <p className="t-body text-[12px] text-bone-4 mt-1">{c.nameEn}</p>
            <div className="mt-3 flex gap-4">
              <div>
                <p className="t-label text-[10px] text-bone-4">TOTAL</p>
                <p className="t-display text-[18px] text-flare">{fmt(c.total)}</p>
              </div>
              <div>
                <p className="t-label text-[10px] text-bone-4">ACTIVES</p>
                <p className="t-display text-[18px] text-[#4ade80]">{fmt(c.active)}</p>
              </div>
              <div>
                <p className="t-label text-[10px] text-bone-4">EN ATTENTE</p>
                <p className="t-display text-[18px] text-[#f97316]">{fmt(c.total - c.active)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section Classement ────────────────────────────────────────────────

function TabLeaderboard() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.adminUsers("").then((r) => {
      const sorted = [...(r.users ?? [])].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));
      setRows(sorted);
    }).catch(() => {});
  }, []);

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="t-label text-[11px] text-bone-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <th className="px-4 py-3 text-center">#</th>
            <th className="px-4 py-3 text-left">Pseudo</th>
            <th className="px-4 py-3 text-right">Solde</th>
            <th className="px-4 py-3 text-center">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u, i) => (
            <tr key={u.id} className="hover:bg-ink-3 transition-colors"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <td className="px-4 py-3 text-center">
                <span className="t-display text-[16px] text-bone-4">{i + 1}</span>
              </td>
              <td className="px-4 py-3">
                <span className="t-title text-[13px]">{u.username}</span>
              </td>
              <td className="px-4 py-3 text-right t-display text-[14px] text-flare">{fmtF(u.balance)}</td>
              <td className="px-4 py-3 text-center">
                <Tag tone={u.accountStatus === "ACTIVE" ? "live" : "ghost"} className="text-[10px]">
                  {u.accountStatus}
                </Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section Paramètres ────────────────────────────────────────────────

function TabSettings() {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.adminSettings().then(setSettings).catch(() => {});
  }, []);

  async function toggle(key) {
    if (!settings || busy) return;
    setBusy(true);
    try {
      const updated = await api.adminSaveSettings({ [key]: !settings[key] });
      setSettings(updated);
      setMsg("Paramètre mis à jour.");
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  if (!settings) return <Loader />;

  return (
    <div className="flex flex-col gap-5 max-w-md">
      {msg && <p className="t-body text-sm text-flare">{msg}</p>}

      {[
        { key: "blockDeposits",    label: "Bloquer les dépôts",    desc: "Aucun joueur ne peut déposer tant que ce verrou est actif." },
        { key: "blockWithdrawals", label: "Bloquer les retraits",  desc: "Aucun retrait n'est traité tant que ce verrou est actif." },
      ].map(({ key, label, desc }) => (
        <div key={key} className="gacha-card rounded-xl p-5 flex items-center justify-between gap-4"
          style={{ border: "1.5px solid rgba(255,255,255,0.07)" }}>
          <div>
            <p className="t-title text-[14px]">{label}</p>
            <p className="t-body text-[12px] text-bone-4 mt-1">{desc}</p>
          </div>
          <button onClick={() => toggle(key)} disabled={busy}
            className={`relative h-7 w-12 rounded-full transition-colors shrink-0 ${settings[key] ? "bg-danger" : "bg-ink-4"}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-bone transition-all ${settings[key] ? "left-6" : "left-1"}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Root Admin ────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (user && !user.isAdmin) nav("/", { replace: true });
  }, [user, nav]);

  if (!user) return <Loader full />;
  if (!user.isAdmin) return null;

  const renderTab = () => {
    switch (tab) {
      case "overview":     return <TabOverview />;
      case "users":        return <TabUsers />;
      case "questions":    return <TabQuestions />;
      case "transactions": return <TabTransactions />;
      case "quarantine":   return <TabQuarantine />;
      case "flags":        return <TabFlags />;
      case "categories":   return <TabCategories />;
      case "leaderboard":  return <TabLeaderboard />;
      case "settings":     return <TabSettings />;
      default:             return null;
    }
  };

  return (
    <div className="grain min-h-dvh w-full">
    <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-20 sm:px-6 sm:pt-10">
      {/* En-tête */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-flare/15">
            <NavIcon type="crown" className="h-5 w-5 text-flare" />
          </div>
          <div>
            <Label tone="flare">accès restreint</Label>
            <h1 className="t-display text-2xl">Dashboard Admin</h1>
          </div>
        </div>
        <button onClick={() => nav("/")} className="t-label text-bone-4 hover:text-flare">
          ← Jouer
        </button>
      </div>

      {/* Navigation par onglets (horizontale, défilable) */}
      <div className="mb-8 flex gap-1 overflow-x-auto pb-1 sm:gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`t-label whitespace-nowrap rounded-lg px-3 py-2 text-[12px] transition-colors sm:px-4 ${
              tab === t.id ? "bg-flare text-ink" : "bg-ink-3 text-bone-3 hover:bg-ink-4"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu du tab actif */}
      {renderTab()}
    </div>
    </div>
  );
}
