# ADR-0001: Reverse-DNS Identifiers

## Status
Accepted

## Context
The platform needs to prevent identifier collisions between platform-built, agency-built, marketplace, and third-party artifacts. Without a naming convention, `"dark-theme"` could come from the platform, an agency, or a marketplace — with no way to distinguish them.

## Decision
All platform identifiers use reverse-DNS format: `com.creatos.{artifact-type}.{name}`. Examples:
- Themes: `com.creatos.neon-dark`
- Modules: `com.creatos.products`
- Capabilities: `com.creatos.checkout`
- Providers: `com.creatos.razorpay`
- Plugins: `com.acme.analytics`

This applies to ThemeId, ModuleId, CapabilityId, ProviderId, and PluginId. Validation functions are provided for each.

## Consequences
- **Positive:** Guarantees global uniqueness. Agency namespacing (`agency.s8ul.dark`) prevents collisions with platform. Marketplace namespacing (`marketplace.xyz.gaming`) prevents collisions with everything.
- **Negative:** Verbose identifiers. Requires validation on registration.
- **Mitigations:** Shortened aliases for display. Validation gives clear error messages.
