// Contrat réseau unique du frontend 3010. Aucune page métier ne doit appeler
// fetch directement : le JWT, les erreurs et l'URL du serveur restent ici.
const BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:4010");
const TOKEN_KEY = "qa_classic_token";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = response.headers.get("content-type")?.includes("application/json")
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok) throw new ApiError(data?.message || `Erreur ${response.status}`, response.status, data);
  return data;
}

const get = (path) => request("GET", path);
const post = (path, body) => request("POST", path, body);
const patch = (path, body) => request("PATCH", path, body);

// Upload de fichier (photo de profil, couverture de tournoi) — jamais du
// JSON, jamais de Content-Type fixé à la main (le navigateur pose lui-même
// la frontière multipart, la fixer casserait la requête).
async function uploadFile(path, file) {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  const data = response.headers.get("content-type")?.includes("application/json")
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok) throw new ApiError(data?.message || `Erreur ${response.status}`, response.status, data);
  return data;
}
const del = (path, body) => request("DELETE", path, body);

// Collection de portraits manga Lorelei, livrée en PNG raster.
// Le pseudo est le seed : un joueur conserve donc toujours son portrait.
export const avatarUrl = (seed) => {
  const safeSeed = encodeURIComponent(seed || "joueur");
  return `https://api.dicebear.com/9.x/lorelei/png?seed=${safeSeed}&size=256&backgroundColor=382b1e,4a3827,21170f`;
};

export const registerAccount = (input) => post("/api/auth/register", input);
export const loginAccount = (input) => post("/api/auth/login", input);
export const getMe = () => get("/api/auth/me");
export const changePassword = (input) => post("/api/auth/change-password", input);
export const verifyEmail = (code) => post("/api/auth/verify-email", { code });
export const resendVerification = () => post("/api/auth/resend-verification", {});
export const forgotPassword = (identifier) => post("/api/auth/forgot-password", { identifier });
export const resetPassword = (input) => post("/api/auth/reset-password", input);
export const updateProfile = (body) => patch("/api/auth/profile", body);

export const uploadAvatar = (file) => uploadFile("/api/uploads/avatar", file);
export const uploadTournamentCover = (file) => uploadFile("/api/uploads/tournament-cover", file);

export const getSessions = () => get("/api/auth/sessions");
export const revokeSession = (id) => post(`/api/auth/sessions/${id}/revoke`, {});

export const getVapidPublicKey = () => get("/api/push/vapid-public-key");
export const subscribePush = (subscription) => post("/api/push/subscribe", subscription);
export const unsubscribePush = (endpoint) => post("/api/push/unsubscribe", { endpoint });

export const getWallet = () => get("/api/wallet");
export const getWalletTransactions = (page = 1, perPage = 20) => get(`/api/wallet/transactions?page=${page}&perPage=${perPage}`);
export const deposit = (input) => post("/api/wallet/deposit", input);
export const withdraw = (input) => post("/api/wallet/withdraw", input);

export const getCategories = () => get("/api/categories");
export const startQuiz = (input) => post("/api/quiz/start", input);
export const revealQuiz = (sessionId, questionId) => post("/api/quiz/reveal", { sessionId, questionId });
export const submitQuiz = (input) => post("/api/quiz/submit", input);

export const getLeaderboard = (page = 1, perPage = 50) => get(`/api/leaderboard?page=${page}&perPage=${perPage}`);
export const getQuizHistory = () => get("/api/quiz/history");
export const abandonQuiz = (sessionId) => post("/api/quiz/abandon", { sessionId });
export const getDuelHistory = (page = 1, perPage = 20) => get(`/api/duel/history?page=${page}&perPage=${perPage}`);
export const getOnlinePlayers = () => get("/api/players/online");
export const getPlayerProfile = (username, page = 1, perPage = 5) => get(`/api/players/profile/${encodeURIComponent(username)}?page=${page}&perPage=${perPage}`);
export const searchPlayers = (query) => get(`/api/players/search?q=${encodeURIComponent(query)}`);
export const getPlayersPage = (page = 1, perPage = 24) => get(`/api/players?page=${page}&perPage=${perPage}`);
export const reportPlayer = (targetUsername, reason, detail) => post("/api/players/report", { targetUsername, reason, detail });

export const getOpenDuels = () => get("/api/duel/open");
export const getInviteInfo = (code) => get(`/api/duel/invite/${encodeURIComponent(code)}`);
export const getLiveDuels = () => get("/api/duel/live");

export const getTournaments = () => get("/api/tournaments");
export const getTournament = (id) => get(`/api/tournaments/${id}`);
export const createTournament = (input) => post("/api/tournaments", input);
export const joinTournament = (id) => post(`/api/tournaments/${id}/join`);
export const leaveTournament = (id) => post(`/api/tournaments/${id}/leave`);
export const kickTournamentPlayer = (id, targetId) => del(`/api/tournaments/${id}/entries/${targetId}`);
export const startTournament = (id) => post(`/api/tournaments/${id}/start`);
export const readyTournament = (id) => post(`/api/tournaments/${id}/ready`);
export const cancelTournamentReady = (id) => post(`/api/tournaments/${id}/cancel-ready`);
// Invitations nominatives — l'acceptation débite le droit d'entrée une seule fois.
export const getInvitablePlayers = (id, q) => get(`/api/tournaments/${id}/invitable${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const inviteToTournament = (id, userIds) => post(`/api/tournaments/${id}/invites`, { userIds });
export const getMyTournamentInvites = () => get("/api/tournaments/invites/mine");
export const acceptTournamentInvite = (inviteId) => post(`/api/tournaments/invites/${inviteId}/accept`);
export const declineTournamentInvite = (inviteId) => post(`/api/tournaments/invites/${inviteId}/decline`);

export const getPublicStats = () => get("/api/public/stats");
export const getPublicLeaderboard = () => get("/api/public/leaderboard");
export const getMaintenance = () => get("/api/public/maintenance");

// Réservé au futur écran dashboard 3010.
export const adminOverview = () => get("/api/admin/overview");
export const adminUsers = (query = "") => get(`/api/admin/users?q=${encodeURIComponent(query)}`);
export const adminSetUserStatus = (id, status) => post(`/api/admin/users/${id}/status`, { status });
export const adminTransactions = (params = {}) => get(`/api/admin/transactions?${new URLSearchParams(params)}`);
export const adminQuestions = (params = {}) => get(`/api/admin/questions?${new URLSearchParams(params)}`);
export const adminCategories = () => get("/api/admin/categories");
export const adminTournaments = (params = {}) => get(`/api/admin/tournaments?${new URLSearchParams(params)}`);
export const adminDuels = (params = {}) => get(`/api/admin/duels?${new URLSearchParams(params)}`);
export const adminSettings = () => get("/api/admin/settings");
export const adminSaveSettings = (input) => patch("/api/admin/settings", input);
export const adminDeleteQuestion = (id) => del(`/api/admin/questions/${id}`);
