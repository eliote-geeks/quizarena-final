ALTER TABLE "Clan" ALTER COLUMN "maxMembers" SET DEFAULT 20;

-- Les membres existants sont conservés. La capacité devient 20 et les clans
-- déjà au-dessus ne peuvent simplement plus accepter d'entrée supplémentaire.
UPDATE "Clan" SET "maxMembers" = 20 WHERE "maxMembers" > 20;

ALTER TABLE "Clan" ADD CONSTRAINT "Clan_maxMembers_check"
  CHECK ("maxMembers" BETWEEN 2 AND 20);

-- Protection atomique contre deux adhésions simultanées qui dépasseraient la
-- capacité entre le contrôle applicatif et l'insertion.
CREATE FUNCTION enforce_clan_member_capacity() RETURNS trigger AS $$
DECLARE
  capacity INTEGER;
  current_members INTEGER;
BEGIN
  SELECT "maxMembers" INTO capacity FROM "Clan" WHERE "id" = NEW."clanId" FOR UPDATE;
  SELECT COUNT(*) INTO current_members FROM "ClanMember" WHERE "clanId" = NEW."clanId";
  IF current_members >= LEAST(capacity, 20) THEN
    RAISE EXCEPTION 'Ce clan a atteint sa capacité maximale' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ClanMember_capacity_guard"
  BEFORE INSERT ON "ClanMember"
  FOR EACH ROW EXECUTE FUNCTION enforce_clan_member_capacity();
