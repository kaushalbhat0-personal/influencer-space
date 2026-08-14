-- RCCF-42: AgencyTenant lifecycle — additive timestamp for the agency↔creator
-- offboarding/revocation state. Existing relationships are NOT migrated (all
-- existing rows remain ACTIVE; offboarding is an explicit forward-only action).
ALTER TABLE "AgencyTenant" ADD COLUMN "offboardedAt" TIMESTAMP(3);
