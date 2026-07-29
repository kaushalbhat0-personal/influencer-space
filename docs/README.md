# Creatos Platform Documentation

## Architecture Constitution v1.0

This directory contains the official architecture documentation for the Creatos Platform.

### Quick Start

| Document | Description |
|----------|-------------|
| [Product Roadmap](product-roadmap.md) | Product direction, release planning, milestones |
| [Platform Architecture v1](platform-architecture-v1.md) | Main constitution — architecture, ownership, data flow, invariants |
| [Domain Map](domain-map.md) | Bounded contexts, domain ownership, extension points |
| [Dependency Graph](dependency-graph.md) | Platform dependency diagrams (Mermaid) |
| [Creator Journey](creator-journey.md) | Full creator lifecycle from signup to publish |
| [Super Admin Vision](superadmin-vision.md) | Future platform operations architecture |
| [Architecture Decisions](architecture-decisions.md) | ADR index and summaries |
| [Glossary](glossary.md) | Canonical terminology |
| [Coding Standards](coding-standards.md) | Rules for all contributors |

### Operational Docs

| Document | Description |
|----------|-------------|
| [Runbooks](runbooks/) | Deployment, monitoring, incident response |
| [ADRs](adr/) | Architecture Decision Records (individual) |

### Platform Status

- **Current version:** 1.0.0
- **Architecture maturity:** Stable
- **Production readiness:** 94/100
- **Next phase:** SUPERADMIN-01

All future development MUST conform to the invariants and ownership rules defined in [platform-architecture-v1.md](platform-architecture-v1.md).
