/**
 * Usage : node scripts/make-admin.mjs <username>
 * Passe isAdmin=true sur le compte donné.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const username = process.argv[2];

if (!username) {
  console.error("Usage: node scripts/make-admin.mjs <username>");
  process.exit(1);
}

const user = await prisma.user.findFirst({ where: { username } });
if (!user) {
  console.error(`Utilisateur "${username}" introuvable.`);
  process.exit(1);
}

await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
console.log(`✅  ${username} est maintenant ADMIN.`);
await prisma.$disconnect();
