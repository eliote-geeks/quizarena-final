-- Sessions de connexion (31/08) — une par login/inscription, révocable
-- individuellement, visible dans le profil.

CREATE TABLE "LoginSession" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "userAgent"  TEXT,
    "ipAddress"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt"  TIMESTAMP(3),

    CONSTRAINT "LoginSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginSession_userId_idx" ON "LoginSession"("userId");

ALTER TABLE "LoginSession" ADD CONSTRAINT "LoginSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
