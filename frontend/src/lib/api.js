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
const del = (path, body) => request("DELETE", path, body);

export const avatarUrl = (seed) => `${BASE_URL}/api/avatar/${encodeURIComponent(seed)}`;

export const registerAccount = (input) => post("/api/auth/register", input);
export const loginAccount = (input) => post("/api/auth/login", input);
export const getMe = () => get("/api/auth/me");
export const changePassword = (input) => post("/api/auth/change-password", input);

export const getWallet = () => get("/api/wallet");
export const getWalletTransactions = (page = 1, perPage = 20) => get(`/api/wallet/transactions?page=${page}&perPage=${perPage}`);
export const deposit = (input) => post("/api/wallet/deposit", input);
export const withdraw = (input) => post("/api/wallet/withdraw", input);

export const getCategories = () => get("/api/categories");
export const startQuiz = (input) => post("/api/quiz/start", input);
export const revealQuiz = (sessionId, questionId) => post("/api/quiz/reveal", { sessionId, questionId });
export const submitQuiz = (input) => post("/api/quiz/submit", input);

export const getLeaderboard = () => get("/api/leaderboard");
export const getQuizHistory = () => get("/api/quiz/history");
export const getDuelHistory = (page = 1, perPage = 20) => get(`/api/duel/history?page=${page}&perPage=${perPage}`);
export const getOnlinePlayers = () => get("/api/players/online");
export const getPlayerProfile = (username) => get(`/api/players/profile/${encodeURIComponent(username)}`);
export const searchPlayers = (query) => get(`/api/players/search?q=${encodeURIComponent(query)}`);
export const reportPlayer = (targetUsername, reason, detail) => post("/api/players/report", { targetUsername, reason, detail });

export const getOpenDuels = () => get("/api/duel/open");
export const getLiveDuels = () => get("/api/duel/live");

export const getTournaments = () => get("/api/tournaments");
export const getTournament = (id) => get(`/api/tournaments/${id}`);
export const createTournament = (input) => post("/api/tournaments", input);
export const joinTournament = (id) => post(`/api/tournaments/${id}/join`);
export const leaveTournament = (id) => post(`/api/tournaments/${id}/leave`);

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
