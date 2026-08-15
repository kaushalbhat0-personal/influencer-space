-- RCCF-66.2: per-product sales mode — ONLINE | WHATSAPP | BOTH.
-- Additive, non-destructive. Existing rows default to ONLINE so the current
-- Razorpay checkout behavior is preserved exactly.
ALTER TABLE "Product" ADD COLUMN "commerceMode" TEXT NOT NULL DEFAULT 'ONLINE';
