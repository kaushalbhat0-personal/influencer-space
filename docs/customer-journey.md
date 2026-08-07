# Customer Journey — RCCF-EPIC-09

## Canonical stages (deterministic reach conditions)

| Stage | Reached when |
| --- | --- |
| Signed Up | always (created) |
| Imported Your Profile | knowledge score present |
| Generated Your Website | health score / published / has products |
| Opened the Builder | analytics active / published / has products |
| Published | publish state = live |
| Payment Ready | payment readiness = ready |
| Added First Product | product count > 0 |
| Made First Sale | order count > 0 |
| Returning Seller | order count ≥ 5 |
| Growing Business | order count ≥ 20 |

The current stage is the highest reached stage. The **next milestone** is the
first unreached stage with an estimated time (0 → 90 days).

## Creator journey UI

The dashboard **Success Journey** card shows:
- Current stage + next milestone
- Completion % progress bar + milestone chips
- Estimated time to next milestone
- Risk findings + opportunities
- Recent activity timeline

## Event-driven

`success.stage.changed` is emitted when the stage advances between check-ins
(stored in the tenant's `customer_success_checkin` setting). `customer.activated`
fires on the first sale; `customer.retained` when the score crosses 70.

## Super Admin funnel

The Customer Success Center renders the journey funnel across the recent-tenants
cohort (count per stage), so the operations team sees exactly where creators
stall.
