-- Invitations nominatives à un tournoi (29/08).
-- L'invitation ne réserve aucune place et ne débite rien : le droit
-- d'entrée est prélevé au moment de l'acceptation, par le même chemin
-- que l'inscription libre (§routes.ts enrollPlayer), et la contrainte
-- unique sur TournamentEntry garantit qu'il ne l'est jamais deux fois.

CREATE TYPE "TournamentInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

CREATE TABLE "TournamentInvite" (
    "id"           TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "invitedById"  TEXT NOT NULL,
    "status"       "TournamentInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt"  TIMESTAMP(3),

    CONSTRAINT "TournamentInvite_pkey" PRIMARY KEY ("id")
);

-- Une seule invitation par joueur et par tournoi : rend l'envoi rejouable
-- (createMany skipDuplicates) sans créer de doublon.
CREATE UNIQUE INDEX "TournamentInvite_tournamentId_userId_key" ON "TournamentInvite"("tournamentId", "userId");

-- Sert la liste "mes invitations en attente" affichée dans l'espace joueur.
CREATE INDEX "TournamentInvite_userId_status_idx" ON "TournamentInvite"("userId", "status");

ALTER TABLE "TournamentInvite" ADD CONSTRAINT "TournamentInvite_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentInvite" ADD CONSTRAINT "TournamentInvite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentInvite" ADD CONSTRAINT "TournamentInvite_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
