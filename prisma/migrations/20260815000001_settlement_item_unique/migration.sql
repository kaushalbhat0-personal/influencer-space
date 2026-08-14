-- RCCF-41: one commission entry can belong to at most one settlement.
-- Prevents two concurrent settlement processes from double-reserving the same
-- commission (the unique index makes the second insert fail, rolling back its
-- transaction). NOTE: verify no duplicate "SettlementItem"."commissionEntryId"
-- rows exist in the target database before applying; the index creation fails
-- safely if duplicates are present.
CREATE UNIQUE INDEX "SettlementItem_commissionEntryId_key" ON "SettlementItem"("commissionEntryId");
