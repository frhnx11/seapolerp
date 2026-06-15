-- Forced first-login password change removed: accounts log in immediately with
-- their assigned password (changed only via self-service or a super-admin reset).
ALTER TABLE "user" DROP COLUMN "mustChangePassword";
