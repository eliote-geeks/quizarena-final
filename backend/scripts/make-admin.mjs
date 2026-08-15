#!/usr/bin/env node
// Donne (ou retire) l'accès au dashboard admin à un compte existant.
// Volontairement pas d'API HTTP pour ça — un admin ne se crée pas
// depuis le produit, seulement depuis le serveur.
//
// Usage : node scripts/make-admin.mjs <username> [--revoke]

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , username, flag] = process.argv;
  if (!username) {
    console.error("Usage: node scripts/make-admin.mjs <username> [--revoke]");
    process.exit(1);
  }
  const isAdmin = flag !== "--revoke";

  const user = await prisma.user.update({
    where: { username },
    data: { isAdmin },
  });

  console.log(`✓ ${user.username} — isAdmin=${user.isAdmin}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
