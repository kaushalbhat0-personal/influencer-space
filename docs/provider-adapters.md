# Provider Adapters — RCCF-TRACK-02

## The adapter interface

```ts
interface CommunicationProviderAdapter {
  readonly channel: CommunicationChannel; // email | in_app | alert | sms | whatsapp | push
  deliver(req: DeliveryRequest): Promise<DeliveryResult>;
}
```

`DeliveryRequest` carries the rendered subject/body + recipient + payload. No
provider code exists anywhere except inside an adapter — business runtimes and
the registry never import a provider.

## Launch adapters

| Channel | Adapter | Behaviour |
| --- | --- | --- |
| email | `EmailLogAdapter` | Renders + persists durably (launch; no SMTP infra) |
| in_app | `InAppAdapter` | Writes the Notification table (preference-checked) |
| alert | `AdminAlertAdapter` | Writes a super_admin system notification |

## Future channels (declared, no adapter yet)

SMS · WhatsApp · Push · Slack · Discord — each `getAdapter("sms")` etc. returns
null today; adding a provider = one adapter file + a registry line. No
replacement risk: channels are keyed in `communicationAdapters`.

## Provider health

The Communication Center surfaces per-provider delivery volume and failure
rates from the `CommunicationLog`, so a provider regression is visible before
customers are affected.
