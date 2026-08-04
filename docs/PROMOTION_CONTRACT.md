# Public promotion contract

This repository is the reviewed public output of private engineering performed in `SupraShellScripts/violentmonkey-workbench-private`.

## Local path

```text
~/Projects/SupraShellScripts/violentmonkey-workbench
C:\Users\Mark\Projects\SupraShellScripts\violentmonkey-workbench
```

The private coordinator is normally checked out at the sibling path `../violentmonkey-workbench-private`.

## Promotion flow

```text
private Workbench source and release preparation
  → local stateless heavy validation
  → immutable release candidate and evidence
  → public promotion branch and pull request
  → lightweight public verification
  → release
```

This repository verifies the candidate; it does not recreate it with an independent build path.

## Required evidence

A promotion pull request should identify:

- private source commit and parent issue;
- exact modified Violentmonkey extension version, commit, and artifact checksum;
- protocol and compatibility versions;
- stateless tooling and browser image digests;
- local heavy validation results;
- installer and artifact checksums;
- SBOM and provenance;
- browser/platform compatibility manifest;
- known limitations and release notes.

## Public boundary

Allowed content is limited to reviewed public source, release artifacts, installers, documentation, checksums, signatures, SBOMs, provenance, and compatibility metadata.

Private fixtures, credentials, signing keys, internal coordination history, personal browser data, and engineering-only diagnostics remain in the private repository.

## Coordinator authority

The private coordinator may prepare and open a promotion pull request after all child dependencies and integration gates pass. It may not push an unreviewed release directly to the default branch, and public repository state does not override private source authority.

See `coordination/consumer.json` for the machine-readable contract.
