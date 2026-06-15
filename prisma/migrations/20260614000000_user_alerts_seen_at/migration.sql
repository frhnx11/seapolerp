-- Tracks when an admin last viewed the alerts notifications, so the bell can
-- show how many net-weight discrepancies are new since then.
ALTER TABLE "user" ADD COLUMN "alertsSeenAt" TIMESTAMP(3);
