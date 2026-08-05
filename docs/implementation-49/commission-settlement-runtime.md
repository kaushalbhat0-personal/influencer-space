# Commission & Settlement Runtime — IMPLEMENTATION-49

**Status:** Architecture Design  
**Date:** 2026-08-05

---

## 1. Commission Engine (Existing)

### Trigger Point

`src/modules/billing/application/service.ts` lines 94-116:

```
payment.captured webhook
    ↓
BillingService.handlePaymentCaptured()
    ↓
Check workspace.hasAgencyId
    ↓
partnerService.get(agencyId)
    ↓ (if partner exists)
commissionService.processCommission({
    partnerId, invoiceId, subscriptionId, planCode, amount
})
    ↓
RuleEngine.resolveRule(partnerId, planCode)
    ↓
Calculator.calculateCommission(gross, platformShare%, partnerShare%)
    ↓
CommissionLedger.addEntry() → in-memory
    ↓
CommissionRepository.saveEntry() → Prisma
    ↓
EventBus.emit('CommissionCreated')
```

### Rule Resolution Priority

```
1. Partner-specific rule   (partnerId match)
2. Plan-specific rule      (planCode match)
3. Default rule            (fallback: 10% platform, 90% partner)
```

### Entry Lifecycle

```
pending → cleared (via commissionService.clearEntry)
pending → reversed (via commissionService.reverseEntry)
```

### Balance Calculation

```
PartnerBalance {
  pending:   sum of pending entries
  available: sum of cleared entries - reserved
  paid:      sum of settled payouts
  lifetime:  sum of all entries ever created
}
```

---

## 2. Current Gaps — What Needs Adding

### Gap 1: Automatic Commission Trigger

**Current:** `processCommission()` exists but is NOT called from the Razorpay webhook flow. Only `handlePaymentCaptured()` calls it when a workspace has an agencyId. The `payment.captured` event in the webhook handler also calls `handlePaymentCaptured()` for new subscriptions — but the existing integration is partial.

**Fix (IMPLEMENTATION-50):** Wire `processCommission()` into `handleSubscriptionWebhook()` for `subscription.charged` events (recurring renewals) and validate the existing `payment.captured` → `handlePaymentCaptured()` trigger.

### Gap 2: revSharePercent Integration

**Current:** `AgencyTenant.revSharePercent` (default 20%) is stored but never read by `CommissionRule` or `Calculator`.

**Fix (IMPLEMENTATION-50):** When resolving commission rules, fall back to `AgencyTenant.revSharePercent` if no explicit `CommissionRule` exists for the partner.

```
resolveEffectivePartnerShare(partnerId, planCode):
  rule = RuleEngine.resolveRule(partnerId, planCode)
  if rule: return rule.partnerSharePercent
  agencyTenant = findAgencyTenantByPartner(partnerId)
  if agencyTenant: return agencyTenant.revSharePercent
  return CommissionPolicy.default.agencyDefaultShare (30%)
```

### Gap 3: Commission Ledger Persistence

**Current:** `CommissionLedger` is in-memory only. Must call `initialize()` to load from Prisma. If server restarts without initialization, all historical data is invisible to the in-process engine (though data is in Prisma).

**Fix (future):** Replace in-memory ledger with Prisma-only queries. The `CommissionRepository` already exists and can serve as the single source of truth.

---

## 3. Settlement Architecture (Design)

### Models to Add

```prisma
enum SettlementStatus {
  PENDING
  READY
  APPROVED
  REJECTED
  PROCESSING
  PAID
  CANCELLED
  FAILED
  ARCHIVED
}

model Settlement {
  id              String   @id @default(cuid())
  partnerId       String
  status          SettlementStatus @default(PENDING)
  provider        String   @default("manual")
  currency        String   @default("INR")
  totalAmount     Float    // gross commission to settle
  feeAmount       Float    @default(0)
  netAmount       Float    // total - fee
  entryCount      Int
  approvedBy      String?  // user id
  approvedAt      DateTime?
  processedAt     DateTime?
  paidAt          DateTime?
  transferRef     String?  // UTR / bank reference
  failureReason   String?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  items           SettlementItem[]
  partner         Partner   @relation(fields: [partnerId], references: [id])
}

model SettlementItem {
  id                String    @id @default(cuid())
  settlementId      String
  commissionEntryId String    @unique
  amount            Float
  status            String    @default("pending")
  createdAt         DateTime  @default(now())

  settlement        Settlement @relation(fields: [settlementId], references: [id])
  commissionEntry   CommissionEntry @relation(fields: [commissionEntryId], references: [id])
}

model SettlementAttachment {
  id            String   @id @default(cuid())
  settlementId  String
  type          String   // "receipt" | "invoice" | "proof" | "note"
  url           String
  createdAt     DateTime @default(now())

  settlement    Settlement @relation(fields: [settlementId], references: [id])
}
```

### Settlement Lifecycle

```
Commission entries cleared (available)
    ↓
Settlement created  →  PENDING
    ↓
Finance review      →  READY  (all entries verified)
    ↓
Super Admin         →  APPROVED  (approvedBy + approvedAt set)
    │
    ├── REJECTED (can re-submit)
    │
    ↓
Provider            →  PROCESSING
    │
    ├── FAILED (can retry)
    │
    ↓
Manual transfer     →  PAID  (transferRef = UTR/bank ref)
    ↓
Archive             →  ARCHIVED
```

### Why PayoutBatch/PayoutReservation is NOT Settlement

`PayoutBatch` tracks the batch-level payout (partner + amount + provider). `PayoutReservation` links commission entries to the batch. But:

- No approval workflow (approvedBy/approvedAt)
- No transfer reference (UTR/bank reference for manual payouts)
- No item-level status tracking
- No attachment support (receipts, proofs)
- No cancellation/rejection with reason

The `Settlement` model adds these missing capabilities while `PayoutBatch` can be reused as the provider execution record within the settlement workflow.

---

## 4. Settlement Provider Interface

```typescript
interface SettlementProvider {
  readonly name: string
  readonly capabilities: {
    supportsAutoPayout: boolean
    supportsSplit: boolean
    supportsReference: boolean
    supportsWebhook: boolean
  }

  createPayout(params: {
    partnerId: string
    amount: number
    currency: string
    reference: string         // settlement id
    beneficiaryDetails: {     // bank/UPI details
      type: "bank_account" | "upi" | "razorpay_route"
      accountNumber?: string
      ifsc?: string
      vpa?: string
      routeAccountId?: string
    }
  }): Promise<{ success: boolean; providerRef?: string; error?: string }>

  getStatus(providerRef: string): Promise<{
    status: "pending" | "processing" | "completed" | "failed"
    transferRef?: string
    error?: string
  }>
}
```

### Current Provider: `ManualSettlementProvider`

```typescript
class ManualSettlementProvider implements SettlementProvider {
  name = "manual"
  capabilities = {
    supportsAutoPayout: false,
    supportsSplit: false,
    supportsReference: true,
    supportsWebhook: false,
  }

  createPayout() {
    // No API call. Finance team does manual bank transfer.
    // Returns success — transferRef added later when finance confirms.
    return { success: true, providerRef: null }
  }

  getStatus(ref: string) {
    // Always pending until finance updates.
    return { status: "pending" }
  }
}
```

### Future Provider: `RazorpayRouteProvider` (post-company registration)

```typescript
class RazorpayRouteProvider implements SettlementProvider {
  name = "razorpay_route"
  capabilities = {
    supportsAutoPayout: true,
    supportsSplit: true,
    supportsReference: true,
    supportsWebhook: true,
  }

  async createPayout(params) {
    // POST /route/transfers
    // Razorpay Route API: transfer from linked account to partner
    const transfer = await razorpay.transfers.create({
      account: params.beneficiaryDetails.routeAccountId,
      amount: params.amount * 100,
      currency: params.currency,
    })
    return { success: true, providerRef: transfer.id }
  }

  async getStatus(ref) {
    // GET /route/transfers/{ref}
    const transfer = await razorpay.transfers.fetch(ref)
    return {
      status: mapRazorpayStatus(transfer.status),
      transferRef: transfer.id,
    }
  }
}
```

When this provider activates, the settlement workflow automates: APPROVED → PROCESSING → PAID is handled entirely by Razorpay Route. Only REJECTED settlements go through the manual provider.

---

## 5. Manual Settlement Workflow (Today)

```
Creator pays subscription (Razorpay)
    ↓
payment.captured webhook
    ↓
BillingService.handlePaymentCaptured()
    ↓
CommissionService.processCommission()
    ↓
CommissionEntry created (status: pending)
    ↓
CommissionEntry cleared (status: cleared)
    ↓  [periodic: end of month / manual trigger]
Partner balance calculated
    ↓
Finance team reviews available balance
    ↓
Finance creates Settlement (status: PENDING → READY → APPROVED)
    ↓
Finance executes manual bank transfer to partner
    ↓
Finance records transferRef (UTR number)
    ↓
Settlement marked PAID
    ↓
Audit log entry created
```

No automation. Every step from "balance calculated" onward is manual.

---

## 6. Future Migration Path (Post-Company Registration)

When the company is registered with GST + Razorpay Route contracts:

| Step | What Changes |
|------|-------------|
| 1. Register company | Add company name, GSTIN, registered address to platform config |
| 2. Enable Razorpay Route | Replace ManualSettlementProvider with RazorpayRouteProvider |
| 3. Configure Smart Collect | Partner accounts created via Razorpay Route onboarding |
| 4. Enable auto-settlement | Scheduled job: end-of-month → auto-create settlement → auto-approve → auto-process via Route |
| 5. Add GST to invoices | BillingInvoice gains gstNumber, taxBreakdown fields |
| 6. Split settlements | Razorpay Route split: platform share → CreatorStore account, partner share → Partner account |
| 7. Tax invoices | Auto-generate GST-compliant tax invoices per settlement |

**What stays the same:**
- Billing v2 (BillingAccount → BillingSubscription → BillingEvent → BillingInvoice)
- Commission engine (RuleEngine → Calculator → CommissionEntry)
- Revenue dashboard
- Settlement lifecycle (only the "PROCESSING" step changes from manual to automated)
- Provider interface (same `SettlementProvider.createPayout()` contract)
