# Violentmonkey Workbench — deprecation and sunset notice

**Deprecated effective 2026-11-12.** No further standalone Workbench releases, native-host installers or product enhancements are planned. This repository is retained for historical provenance and will be archived read-only after dependency migration and evidence-retention checks.

## Recommended replacement

Use [official Violentmonkey](https://github.com/violentmonkey/violentmonkey) in your supported browser. For AI-agent access, follow [official Violentmonkey MCP](https://github.com/violentmonkey/mcp) and its documented explicit connection approval. The extension dashboard/editor provides the human interface; automation and agents may use standard MCP clients. Workbench is **not required** for these basic tasks.

The official MCP has defined tool and tab-grant boundaries and is not a general-purpose browser/page DOM inspector or arbitrary network capture tool. Do not infer accessibility conformance or every platform/browser combination without separate testing.

## What changes

- This is **not a new supported Workbench distribution** or a migration to our modified extension fork.
- No new Workbench release artifacts, package installers or public promotion candidates are expected.
- Historical source, issues, evidence and provenance will remain available as retained records.
- Userscript projects and other independent repositories are not discontinued by this notice.

The original [promotion contract](PROMOTION_CONTRACT.md) is historical and must not be construed as an active release path after deprecation. Existing experimental pull requests do not create release authorization. No sensitive private-source artifacts or credentials belong in this public repository.

**Project successor:** upstream [Violentmonkey](https://github.com/violentmonkey/violentmonkey) and [MCP](https://github.com/violentmonkey/mcp). This project is independent and is not maintained or endorsed by the upstream project.
