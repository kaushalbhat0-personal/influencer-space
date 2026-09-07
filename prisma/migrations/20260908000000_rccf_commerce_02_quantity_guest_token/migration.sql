-- RCCF-COMMERCE-02: physical commerce MVP — quantity server-authoritative, secure guest order-status token
ALTER TABLE ""ProductOrder"" ADD COLUMN IF NOT EXISTS ""quantity"" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ""ProductOrder"" ADD COLUMN IF NOT EXISTS ""guestToken"" TEXT;
ALTER TABLE ""ProductOrder"" ADD COLUMN IF NOT EXISTS ""guestTokenExpiresAt"" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS ""ProductOrder_guestToken_key"" ON ""ProductOrder""(""guestToken"");