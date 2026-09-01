ALTER TABLE "User"
ADD COLUMN "vipGrantedAt" TIMESTAMP(3);

-- Les anciennes écritures BONUS créées avant la séparation comptable
-- avaient bonusAmountCoins=0 par défaut et devenaient donc retirables à
-- tort. Un mouvement BONUS conserve désormais toujours son signe dans la
-- poche promotionnelle (crédit positif, débit négatif).
UPDATE "Transaction"
SET "bonusAmountCoins" = "amountCoins"
WHERE "type" = 'BONUS'
  AND "bonusAmountCoins" = 0;
