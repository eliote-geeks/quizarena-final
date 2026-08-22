import WebSocket from "ws";

const base = process.env.QA_API_URL || "http://127.0.0.1:14100";
const wsBase = base.replace(/^http/, "ws");
const stamp = Date.now().toString().slice(-8);

async function call(path, { token, method = "GET", body } = {}) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${data.message || ""}`);
  return data;
}

const users = [];
for (let index = 0; index < 15; index++) {
  const result = await call("/api/auth/register", { method: "POST", body: { username: `warqa_${stamp}_${index}`, phone: `697${stamp}${index}`, password: "QaWarPass2026!" } });
  users.push({ ...result.user, token: result.token });
}

const clanNames = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"];
const clans = [];
for (let group = 0; group < clanNames.length; group++) {
  const leaderIndex = group * 3;
  const clan = (await call("/api/clans", { token: users[leaderIndex].token, method: "POST", body: { name: `QA ${clanNames[group]} ${stamp}`, tag: `${clanNames[group][0]}${stamp.slice(-4)}`, joinPolicy: "OPEN" } })).clan;
  clans.push(clan);
  for (const index of [leaderIndex + 1, leaderIndex + 2]) await call(`/api/clans/${clan.id}/join`, { token: users[index].token, method: "POST" });
}
const [clanA] = clans;

// Attente persistante puis annulation.
let search = await call("/api/clan-wars/search", { token: users[0].token, method: "POST", body: { teamSize: 1 } });
if (search.matched || !search.search) throw new Error("La première recherche devrait être en attente");
let list = await call("/api/clan-wars", { token: users[0].token });
if (!list.search || list.search.teamSize !== 1) throw new Error("Le format libre ou la recherche persistante ne fonctionne pas");
await call("/api/clan-wars/search", { token: users[0].token, method: "DELETE" });
list = await call("/api/clan-wars", { token: users[0].token });
if (list.search) throw new Error("La recherche n'a pas été annulée");

// Trois appariements automatiques aléatoires : c'est la limite active du clan A.
const matchedWars = [];
for (let group = 1; group <= 3; group++) {
  search = await call("/api/clan-wars/search", { token: users[0].token, method: "POST", body: { teamSize: 3 } });
  if (search.matched) throw new Error("Le clan A ne devrait pas se trouver lui-même");
  const match = await call("/api/clan-wars/search", { token: users[group * 3].token, method: "POST", body: { teamSize: 3 } });
  if (!match.matched || match.war.status !== "TEAM_SELECTION") throw new Error("L'appariement automatique a échoué");
  matchedWars.push(match.war);
}

// Un cinquième clan peut attendre, mais A ne peut pas dépasser trois guerres.
await call("/api/clan-wars/search", { token: users[12].token, method: "POST", body: { teamSize: 3 } });
const limited = await fetch(base + "/api/clan-wars/search", { method: "POST", headers: { Authorization: `Bearer ${users[0].token}`, "Content-Type": "application/json" }, body: JSON.stringify({ teamSize: 3 }) });
if (limited.status !== 400) throw new Error(`La limite de trois guerres n'est pas appliquée (${limited.status})`);

let war = matchedWars[0];
await call(`/api/clan-wars/${war.id}/team`, { token: users[0].token, method: "PUT", body: { userIds: users.slice(0, 3).map((u) => u.id) } });
war = await call(`/api/clan-wars/${war.id}/team`, { token: users[3].token, method: "PUT", body: { userIds: users.slice(3, 6).map((u) => u.id) } });
if (war.status !== "IN_PROGRESS" || war.matches.length !== 3) throw new Error("La guerre n'a pas créé ses trois confrontations");

function socketFor(user) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${wsBase}/ws/duel?token=${encodeURIComponent(user.token)}`);
    socket.once("open", () => resolve(socket)); socket.once("error", reject);
  });
}

async function play(match) {
  const userA = users.find((u) => u.id === match.playerAId); const userB = users.find((u) => u.id === match.playerBId);
  const [a, b] = await Promise.all([socketFor(userA), socketFor(userB)]);
  const done = new Promise((resolve, reject) => {
    let results = 0; const timer = setTimeout(() => reject(new Error(`Timeout match ${match.id}`)), 55_000);
    const onMessage = (socket, chosenIndex) => (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "question") socket.send(JSON.stringify({ type: "answer", questionId: message.questionId, chosenIndex })); if (message.type === "duel_result") { results += 1; if (results === 2) { clearTimeout(timer); resolve(); } } if (message.type === "error") reject(new Error(message.message)); };
    a.on("message", onMessage(a, 0)); b.on("message", onMessage(b, 1));
  });
  a.send(JSON.stringify({ type: "clan_war_enter", clanWarMatchId: match.id }));
  b.send(JSON.stringify({ type: "clan_war_enter", clanWarMatchId: match.id }));
  await done; a.close(); b.close();
}

await Promise.all(war.matches.map(play));
war = await call(`/api/clan-wars/${war.id}`, { token: users[0].token });
if (war.status !== "COMPLETED") throw new Error(`Statut final inattendu: ${war.status}`);
if (war.challengerScore + war.defenderScore !== 3) throw new Error("Le score global ne totalise pas trois confrontations");
process.stdout.write(JSON.stringify({ ok: true, warId: war.id, status: war.status, score: [war.challengerScore, war.defenderScore], matches: war.matches.map((m) => m.status) }) + "\n");
