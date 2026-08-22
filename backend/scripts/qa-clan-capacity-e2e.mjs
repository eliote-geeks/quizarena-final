const base = process.env.QA_API_URL || "http://127.0.0.1:14100";
const stamp = Date.now().toString().slice(-8);

async function request(path, { token, method = "GET", body } = {}) {
  return fetch(base + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function json(path, options) {
  const response = await request(path, options); const data = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${data.message ?? ""}`);
  return data;
}

const users = await Promise.all(Array.from({ length: 21 }, async (_, index) => {
  const result = await json("/api/auth/register", { method: "POST", body: { username: `capqa_${stamp}_${index}`, phone: `696${stamp}${index}`, password: "QaClanCap2026!" } });
  return { ...result.user, token: result.token };
}));
const clan = (await json("/api/clans", { token: users[0].token, method: "POST", body: { name: `QA Capacity ${stamp}`, tag: `C${stamp.slice(-4)}`, joinPolicy: "OPEN", maxMembers: 20 } })).clan;
await Promise.all(users.slice(1, 19).map((user) => json(`/api/clans/${clan.id}/join`, { token: user.token, method: "POST" })));
const concurrent = await Promise.all(users.slice(19).map((user) => request(`/api/clans/${clan.id}/join`, { token: user.token, method: "POST" })));
const profile = await json(`/api/clans/${clan.id}`, { token: users[0].token });
if (profile.members.length !== 20) throw new Error(`Capacité dépassée ou incomplète : ${profile.members.length}`);
if (concurrent.filter((response) => response.ok).length !== 1) throw new Error("Le verrou de capacité n'a pas départagéé les adhésions concurrentes");
process.stdout.write(JSON.stringify({ ok: true, members: profile.members.length, concurrentStatuses: concurrent.map((response) => response.status) }) + "\n");
