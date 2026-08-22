#!/usr/bin/env node
// Supprime un tournoi encore en inscription (REGISTERING) — rembourse
// d'abord chaque inscrit dont la mise a été débitée (même logique que
// POST /api/tournaments/:id/leave, réutilisée telle quelle plutôt que
// dupliquée), puis supprime les inscriptions et le tournoi. Refuse tout
// tournoi qui n'est plus REGISTERING (des matchs pourraient déjà exister).
//
// Usage : node scripts/delete-tournament.mjs <tournamentId> [<tournamentId>...]

import { PrismaClient, TransactionType, TransactionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function credit(userId, amountCoins, relatedTransactionId, metadata) {
  return prisma.transaction.create({
    data: {
      userId,
      type: TransactionType.REFUND,
      amountCoins: Math.abs(amountCoins),
      status: TransactionStatus.COMPLETED,
      relatedTransactionId,
      metadata,
    },
  });
}

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error("Usage: node scripts/delete-tournament.mjs <tournamentId> [<tournamentId>...]");
    process.exit(1);
  }

  for (const tournamentId of ids) {
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId }, include: { entries: true } });
    if (!t) {
      console.log(`⚠️  ${tournamentId} introuvable.`);
      continue;
    }
    if (t.status !== "REGISTERING") {
      console.log(`❌ ${tournamentId} (${t.name ?? "sans nom"}) status=${t.status} — refus, pas en inscription.`);
      continue;
    }

    for (const entry of t.entries) {
      const stakeTx = await prisma.transaction.findFirst({
        where: { userId: entry.userId, type: "STAKE", metadata: { path: ["tournamentId"], equals: tournamentId } },
        orderBy: { createdAt: "desc" },
      });
      if (stakeTx) {
        await credit(entry.userId, t.stakeCoins, stakeTx.id, { tournamentId, reason: "admin_cleanup_delete" });
        console.log(`  ↩︎ remboursé ${t.stakeCoins} F à ${entry.userId}`);
      }
    }

    await prisma.tournamentEntry.deleteMany({ where: { tournamentId } });
    await prisma.tournament.delete({ where: { id: tournamentId } });
    console.log(`✓ "${t.name ?? tournamentId}" supprimé (${t.entries.length} inscription(s) traitée(s)).`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
