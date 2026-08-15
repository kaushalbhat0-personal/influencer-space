-- RCCF-67.5: Service → Booking linkage.
-- Additive, non-destructive.
--   Offering.bookable  — explicit per-Service opt-in to be bookable (default false).
--   Booking.offeringId — optional FK to the Offering this slot belongs to (null = standalone).
ALTER TABLE "Offering" ADD COLUMN "bookable" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Booking" ADD COLUMN "offeringId" UUID;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_offeringId_fkey"
  FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Booking_offeringId_idx" ON "Booking"("offeringId");
