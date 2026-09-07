-- RCCF-PRELAUNCH-06 — DATA-01 + DATA-02
-- DATA-02: make razorpayOrderId nullable to eliminate unique "" race.
-- DATA-01: change ProductOrder.productId FK to RESTRICT so product deletion cannot destroy order history.

-- DATA-02: convert legacy empty-string placeholders to NULL (safe, additive).
UPDATE "ProductOrder" SET "razorpayOrderId" = NULL WHERE "razorpayOrderId" = '';

-- DATA-02: allow NULL for initial PENDING orders before Razorpay assigns real ID.
-- Postgres UNIQUE already allows multiple NULLs, so concurrent pending inserts no longer collide on "".
ALTER TABLE "ProductOrder" ALTER COLUMN "razorpayOrderId" DROP NOT NULL;

-- DATA-01: preserve historical orders on product archival/hard-delete.
-- Old: ON DELETE CASCADE (deleting a Product destroyed its ProductOrders).
-- New: ON DELETE RESTRICT (DB refuses to delete a Product with orders; app archives instead).
ALTER TABLE "ProductOrder" DROP CONSTRAINT "ProductOrder_productId_fkey";
ALTER TABLE "ProductOrder" ADD CONSTRAINT "ProductOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
