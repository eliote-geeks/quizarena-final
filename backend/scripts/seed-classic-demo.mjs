#!/usr/bin/env node
// Données de démonstration visibles dans le backoffice et les listes de
// tournois. Idempotent : ne crédite aucun compte réel et réutilise les bots.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const names = ["AtlasBot", "NovaBot", "KoraBot", "ZenixBot", "MangoBot", "SawaBot", "PixelBot", "RiftBot"];
const visiblePlayers = [
  ["AwaDemo", "CM", 2400], ["NoraDemo", "CI", 1970], ["KofiDemo", "GH", 1650],
  ["MinaDemo", "SN", 1420], ["SamiDemo", "CM", 1180], ["JadeDemo", "BJ", 980],
];

async function main() {
  const users = [];
  for (const username of names) {
    const user = await prisma.user.upsert({
      where: { username },
      update: { isBot: true },
      create: { username, phone: `demo-${username.toLowerCase()}`, passwordHash: "BOT_ACCOUNT_NO_LOGIN", isBot: true, stats: { create: {} } },
    });
    users.push(user);
  }

  // Comptes de vitrine : visibles dans le classement et les profils pour
  // que les écrans ne soient pas vides. Ils ne possèdent aucun identifiant
  // de connexion distribué et portent explicitement le suffixe Demo.
  const showcaseUsers = [];
  for (const [username, region, payout] of visiblePlayers) {
    const user = await prisma.user.upsert({
      where: { username },
      update: { region, isBot: false },
      create: {
        username, region, phone: `demo-visible-${username.toLowerCase()}`,
        passwordHash: "DEMO_ACCOUNT_NO_LOGIN", isBot: false,
        stats: { create: { totalGames: 8, winRateGlobal: 0.625, avgScore: 6.4, games7d: 4, winRate7d: 0.75, coinsWon7d: payout, coinsLost7d: 400 } },
      },
    });
    showcaseUsers.push(user);
    const providerRef = `classic-demo-payout-${username}`;
    const alreadyCredited = await prisma.transaction.findFirst({ where: { providerRef } });
    if (!alreadyCredited) await prisma.transaction.create({
      data: { userId: user.id, type: "PAYOUT", amountCoins: payout, provider: "demo", providerRef, metadata: { demo: true, label: "donnée de démonstration" } },
    });
  }

  // Historique cohérent de confrontations : utile aux pages Profil et
  // Classement, sans se faire passer pour un match en direct.
  const demoDuelExists = await prisma.duelMatch.findFirst({ where: { playerAId: showcaseUsers[0].id, playerBId: showcaseUsers[1].id, status: "COMPLETED" } });
  if (!demoDuelExists) {
    const endedAt = new Date(Date.now() - 40 * 60_000);
    await prisma.duelMatch.createMany({ data: [
      { categoryId: "culture", stakeCoins: 100, playerAId: showcaseUsers[0].id, playerBId: showcaseUsers[1].id, status: "COMPLETED", scoreA: 7, scoreB: 5, winnerId: showcaseUsers[0].id, startedAt: new Date(endedAt.getTime() - 8 * 60_000), completedAt: endedAt },
      { categoryId: "sport", stakeCoins: 200, playerAId: showcaseUsers[2].id, playerBId: showcaseUsers[3].id, status: "COMPLETED", scoreA: 6, scoreB: 6, startedAt: new Date(endedAt.getTime() - 20 * 60_000), completedAt: new Date(endedAt.getTime() - 12 * 60_000) },
      { categoryId: "cinema", stakeCoins: 100, playerAId: showcaseUsers[4].id, playerBId: showcaseUsers[5].id, status: "COMPLETED", scoreA: 8, scoreB: 4, winnerId: showcaseUsers[4].id, startedAt: new Date(endedAt.getTime() - 32 * 60_000), completedAt: new Date(endedAt.getTime() - 24 * 60_000) },
    ] });
  }
  const existingOpen = await prisma.tournament.findFirst({ where: { name: "Arena Flash · Démo", status: "REGISTERING" } });
  if (!existingOpen) {
    const open = await prisma.tournament.create({ data: { name: "Arena Flash · Démo", categoryId: "culture", stakeCoins: 500, capacity: 8 } });
    await prisma.tournamentEntry.createMany({ data: users.slice(0, 3).map((user, seed) => ({ tournamentId: open.id, userId: user.id, seed })) });
  }
  const showcase = [
    ["Quiz du vendredi · Démo", "culture", 300, 4, 2],
    ["Coupe Manga · Démo", "anime", 400, 8, 5],
    ["Nuit des champions · Démo", "sport", 500, 8, 6],
    ["Défi cinéma · Démo", "cinema", 250, 4, 1],
    ["Science Rush · Démo", "sciences", 350, 8, 4],
    ["Culture Pop · Démo", "musique", 300, 4, 3],
    ["Masters Afrique · Démo", "afrique", 450, 8, 5],
    ["Finale express · Démo", "histoire", 200, 4, 2],
    ["Grand Prix Quiz · Démo", "geographie", 600, 8, 7],
  ];
  for (const [name, categoryId, stakeCoins, capacity, entries] of showcase) {
    const exists = await prisma.tournament.findFirst({ where: { name, status: "REGISTERING" } });
    if (exists) continue;
    const tournament = await prisma.tournament.create({ data: { name, categoryId, stakeCoins, capacity } });
    await prisma.tournamentEntry.createMany({ data: users.slice(0, entries).map((user, seed) => ({ tournamentId: tournament.id, userId: user.id, seed })) });
  }
  const existingCompleted = await prisma.tournament.findFirst({ where: { name: "Coupe des étoiles · Démo", status: "COMPLETED" } });
  if (!existingCompleted) {
    const tournament = await prisma.tournament.create({ data: { name: "Coupe des étoiles · Démo", categoryId: "sport", stakeCoins: 300, capacity: 4, status: "COMPLETED", startedAt: new Date(Date.now() - 3_600_000), completedAt: new Date() } });
    await prisma.tournamentEntry.createMany({ data: users.slice(0, 4).map((user, seed) => ({ tournamentId: tournament.id, userId: user.id, seed, placement: seed === 0 ? 1 : seed === 1 ? 2 : 3, payoutCoins: seed === 0 ? 720 : seed === 1 ? 300 : 90 })) });
    const now = new Date();
    const duelA = await prisma.duelMatch.create({ data: { categoryId: "sport", stakeCoins: 0, playerAId: users[0].id, playerBId: users[2].id, status: "COMPLETED", scoreA: 7, scoreB: 5, winnerId: users[0].id, completedAt: now } });
    const duelB = await prisma.duelMatch.create({ data: { categoryId: "sport", stakeCoins: 0, playerAId: users[1].id, playerBId: users[3].id, status: "COMPLETED", scoreA: 6, scoreB: 4, winnerId: users[1].id, completedAt: now } });
    const final = await prisma.duelMatch.create({ data: { categoryId: "sport", stakeCoins: 0, playerAId: users[0].id, playerBId: users[1].id, status: "COMPLETED", scoreA: 8, scoreB: 6, winnerId: users[0].id, completedAt: now } });
    await prisma.tournamentMatch.createMany({ data: [
      { tournamentId: tournament.id, round: 1, slot: 0, playerAId: users[0].id, playerBId: users[2].id, winnerId: users[0].id, status: "COMPLETED", duelMatchId: duelA.id, completedAt: now },
      { tournamentId: tournament.id, round: 1, slot: 1, playerAId: users[1].id, playerBId: users[3].id, winnerId: users[1].id, status: "COMPLETED", duelMatchId: duelB.id, completedAt: now },
      { tournamentId: tournament.id, round: 2, slot: 0, playerAId: users[0].id, playerBId: users[1].id, winnerId: users[0].id, status: "COMPLETED", duelMatchId: final.id, completedAt: now },
    ] });
  }
  console.log("Démo prête : 8 bots de bracket, 6 profils visibles, 10 inscriptions ouvertes, 1 bracket terminé et 3 duels d'historique.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
