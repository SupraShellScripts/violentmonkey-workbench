# Violentmonkey Workbench (deprecated)

> **Deprecated — 2026-11-12. No new Workbench product releases or features are planned.** For userscript management and AI-agent integration, use [official Violentmonkey](https://github.com/violentmonkey/violentmonkey) and [official Violentmonkey MCP](https://github.com/violentmonkey/mcp). This is a historical public promotion repository, **not** an independent application or an endorsed upstream component. See [sunset notice](docs/SUNSET.md).

Public promotion target for reviewed Violentmonkey Workbench source, releases, installers, checksums, SBOMs, provenance, compatibility manifests, and public documentation.

Private engineering and multi-repository coordination live in `SupraShellScripts/violentmonkey-workbench-private`. The modified MIT Violentmonkey extension and Developer Mode live in `SupraShellScripts/violentmonkey`.

## Local path

```text
~/Projects/SupraShellScripts/violentmonkey-workbench
C:\Users\<user>\Projects\SupraShellScripts\violentmonkey-workbench
```

## Repository role

This repository is intentionally promotion-only. Public material arrives through a reviewed promotion pull request after private local validation. This repository verifies the exact release candidate and provenance; it does not independently rebuild or invent a different release.

No private implementation, fixtures, credentials, signing keys, personal browser data, or engineering-only coordination state should be developed directly here.

See:

- [`docs/PROMOTION_CONTRACT.md`](docs/PROMOTION_CONTRACT.md)
- [`coordination/consumer.json`](coordination/consumer.json)

Bootstrap and promotion-contract work is coordinated in private Workbench issue #9. This public repository has issues disabled.

The public bootstrap verification is described in [docs/PROMOTION_CONTRACT.md](docs/PROMOTION_CONTRACT.md). It is not release qualification.
