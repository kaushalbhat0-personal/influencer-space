# Email Runtime — RCCF-TRACK-02

## Template-driven, no HTML in business logic

Every email comes from the canonical `COMMUNICATION_REGISTRY`. Templates use
`{{variable}}` placeholders rendered by the Template Runtime — business runtimes
never build HTML or subject lines.

## Templates shipped

| Id | Audience | Trigger |
| --- | --- | --- |
| order.confirmed | creator | fulfillment.created |
| payment.received | creator | subscription.created/renewed |
| download.ready | creator | download.generated |
| shipment.update | creator | shipment.created/delivered |
| subscription.trial_ending | creator | (billing check-in) |
| subscription.failed_payment | creator | (billing webhook) |
| commission.ready | agency | commission.created |
| success.first_sale | creator | success.stage.changed → first_sale |
| success.website_published | creator | storefront.published |
| alert.* | super_admin | system failures |

## Provider adapter

`EmailLogAdapter` is the launch adapter — it renders the email and persists it
**durably** (auditable, replayable) without an SMTP dependency. Future
Resend / SES / SendGrid providers implement the same
`CommunicationProviderAdapter` interface and swap in without touching any
business runtime. SMS / WhatsApp / Push are declared channels awaiting adapters.

## Delivery

Every send is recorded in `CommunicationLog` (recipient, template, payload,
channel, provider, status, retries, error) before and after the adapter call —
fully auditable, retryable, and observable in the Communication Center.
