// Client API — un seul point de contact avec le backend
// (/home/paul/quizarena/backend). Rien d'autre dans l'app ne doit
// appeler fetch() directement, pour garder la gestion du token et des
// erreurs à un seul endroit.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const TOKEN_KEY = "qa_token";

/** URL de l'avatar par défaut style anime, généré côté serveur (§ui/index.jsx Avatar). */
export function avatarUrl(seed) {
  return `${BASE_URL}/api/avatar/${encodeURIComponent(seed)}`;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      // Content-Type uniquement s'il y a un corps : sinon Fastify rejette
      // la requête (FST_ERR_CTP_EMPTY_JSON_BODY) même si aucun schéma ne
      // demandait de body — cas des routes POST sans payload comme
      // /api/tournaments/:id/join.
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = data?.message || `Erreur ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return data;
}

const get = (path) => request("GET", path);
const post = (path, body) => request("POST", path, body);

// ── Auth ──────────────────────────────────────────────────────────────
export const registerAccount = (input) => post("/api/auth/register", input);
export const login = (input) => post("/api/auth/login", input);
export const me = () => get("/api/auth/me");

// ── Portefeuille ─────────────────────────────────────────────────────
export const getWallet = () => get("/api/wallet");
export const getWalletTransactions = (page = 1, perPage = 20) =>
  get(`/api/wallet/transactions?page=${page}&perPage=${perPage}`);
export const deposit = (input) => post("/api/wallet/deposit", input);
export const withdraw = (input) => post("/api/wallet/withdraw", input);
export const resyncTransaction = (id) => post(`/api/wallet/resync/${id}`);

// ── Quiz ─────────────────────────────────────────────────────────────
export const getCategories = () => get("/api/categories");
export const startQuiz = (input) => post("/api/quiz/start", input);
export const submitQuiz = (input) => post("/api/quiz/submit", input);
export const revealQuiz = (sessionId, questionId) => post("/api/quiz/reveal", { sessionId, questionId });

// ── Joueurs ──────────────────────────────────────────────────────────
export const getLeaderboard = () => get("/api/leaderboard");
export const getQuizHistory = () => get("/api/quiz/history");

// ── Public (avant connexion, ex. Landing) ───────────────────────────
export const getPublicStats = () => get("/api/public/stats");
export const getPublicLeaderboard = () => get("/api/public/leaderboard");
export const getMaintenance = () => get("/api/public/maintenance");

// ── Tournois ─────────────────────────────────────────────────────────
export const getTournaments = () => get("/api/tournaments");
export const getTournament = (id) => get(`/api/tournaments/${id}`);
export const createTournament = (input) => post("/api/tournaments", input);
export const joinTournament = (id) => post(`/api/tournaments/${id}/join`);
export const leaveTournament = (id) => post(`/api/tournaments/${id}/leave`);

export const getOpenDuels = () => get("/api/duel/open");
export const getLiveDuels = () => get("/api/duel/live");

// ── Admin ─────────────────────────────────────────────────────────────
const del = (path, body) => request("DELETE", path, body);
const patch = (path, body) => request("PATCH", path, body);

export const adminOverview       = ()            => get("/api/admin/overview");
export const adminDailyStats     = ()            => get("/api/admin/stats/daily");
export const adminUsers          = (q)           => get(`/api/admin/users?q=${encodeURIComponent(q ?? "")}`);
export const adminSetUserStatus  = (id, status)  => post(`/api/admin/users/${id}/status`, { status });
export const adminCredit         = (id, amount, reason) => post(`/api/admin/users/${id}/credit`, { amount, reason });
export const adminDebit          = (id, amount, reason) => post(`/api/admin/users/${id}/debit`, { amount, reason });
export const adminTransactions   = (params)      => get(`/api/admin/transactions?${new URLSearchParams(params)}`);
export const adminQuarantine     = ()            => get("/api/admin/quarantine");
export const adminReleaseQ       = (id)          => post(`/api/admin/quarantine/${id}/release`);
export const adminRejectQ        = (id)          => post(`/api/admin/quarantine/${id}/reject`);
export const adminFlags          = ()            => get("/api/admin/flags");
export const adminResolveFlag    = (id, note)    => post(`/api/admin/flags/${id}/resolve`, { note });
export const adminQuestions      = (active)      => get(`/api/admin/questions?active=${active}`);
export const adminActivateQ      = (id)          => post(`/api/admin/questions/${id}/activate`);
export const adminDeleteQ        = (id)          => del(`/api/admin/questions/${id}`);
export const adminBulkDeleteQ    = (categoryId, activeOnly) => del("/api/admin/questions/bulk", { categoryId, activeOnly });
export const adminGenerateQ      = (categoryId, count)      => post("/api/admin/questions/generate", { categoryId, count });
export const adminCategories     = ()            => get("/api/admin/categories");
export const adminSettings       = ()            => get("/api/admin/settings");
export const adminSaveSettings   = (body)        => patch("/api/admin/settings", body);


// ── Joueurs & profils ────────────────────────────────────────────────
export const searchPlayers    = (q)        => get(`/api/players/search?q=${encodeURIComponent(q)}`);
export const getOnlinePlayers = ()         => get("/api/players/online");
export const getPlayerProfile = (username) => get(`/api/players/profile/${encodeURIComponent(username)}`);
export const reportPlayer     = (targetUsername, reason, detail) =>
  post("/api/players/report", { targetUsername, reason, detail });

// ── Clans ────────────────────────────────────────────────────────────
export const getClans      = (page = 1, perPage = 12) => get(`/api/clans?page=${page}&perPage=${perPage}`);
export const getClan       = (id)      => get(`/api/clans/${id}`);
export const createClan    = (body)    => post("/api/clans", body);
export const joinClan      = (id)      => post(`/api/clans/${id}/join`);
export const leaveClan     = ()        => del("/api/clans/leave");
export const kickMember    = (clanId, userId) => del(`/api/clans/${clanId}/kick/${userId}`);
export const setMemberRole = (clanId, userId, role) => patch(`/api/clans/${clanId}/members/${userId}/role`, { role });
export const updateClanSettings = (clanId, body) => patch(`/api/clans/${clanId}/settings`, body);
export const updateClan = (clanId, body) => patch(`/api/clans/${clanId}`, body);
export const dissolveClan = (clanId) => del(`/api/clans/${clanId}`);
export const getClanJoinRequests = (clanId) => get(`/api/clans/${clanId}/join-requests`);
export const reviewClanJoinRequest = (clanId, requestId, action) => patch(`/api/clans/${clanId}/join-requests/${requestId}`, { action });
export const getClanInvites = (clanId) => get(`/api/clans/${clanId}/invites`);
export const createClanInvite = (clanId, maxUses) => post(`/api/clans/${clanId}/invites`, { maxUses });
export const revokeClanInvite = (clanId, inviteId) => del(`/api/clans/${clanId}/invites/${inviteId}`);
export const acceptClanInvite = (token) => post(`/api/clan-invites/${encodeURIComponent(token)}/accept`);
export const getClanRanking = () => get("/api/clans/ranking");

// ── Guerres de clans ───────────────────────────────────────────────
export const getClanWars = (page = 1, perPage = 6) => get(`/api/clan-wars?page=${page}&perPage=${perPage}`);
export const getClanWar = (id) => get(`/api/clan-wars/${id}`);
export const createClanWar = (defenderClanId, teamSize, stakeCoins = 0) => post("/api/clan-wars", { defenderClanId, teamSize, stakeCoins });
export const searchClanWar = (teamSize, stakeCoins = 0) => post("/api/clan-wars/search", { teamSize, stakeCoins });
export const cancelClanWarSearch = () => del("/api/clan-wars/search");
export const acceptOpenClanWar = (clanId) => post(`/api/clan-wars/search/${clanId}/accept`, {});
export const respondClanWar = (id, accept) => patch(`/api/clan-wars/${id}/respond`, { accept });
export const cancelClanWar = (id) => del(`/api/clan-wars/${id}`);
export const selectClanWarTeam = (id, userIds) => request("PUT", `/api/clan-wars/${id}/team`, { userIds });
