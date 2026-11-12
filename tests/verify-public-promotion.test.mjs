import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateDescriptor, validatePaths, validateGitIndexModes, validateTrackedCheckoutPaths, verifyBootstrap } from '../tools/verify-public-promotion.mjs';

const fixture = JSON.parse(readFileSync(new URL('../coordination/consumer.json', import.meta.url), 'utf8'));
const copy = () => structuredClone(fixture);

test('bootstrap descriptor accepts current contract', () => assert.equal(validateDescriptor(copy()), true));
test('contract refuses disabling required private validation', () => {
  const changed = copy(); changed.promotion.privateValidationRequired = false;
  assert.throws(() => validateDescriptor(changed), /privateValidationRequired/);
});
test('contract refuses direct publication without pull request', () => {
  const changed = copy(); changed.promotion.requiresPullRequest = false;
  assert.throws(() => validateDescriptor(changed), /requiresPullRequest/);
});
test('contract rejects missing SBOM and unknown authority fields', () => {
  const noSbom = copy(); noSbom.promotion.expectedEvidence = noSbom.promotion.expectedEvidence.filter(x => x !== 'SBOM');
  assert.throws(() => validateDescriptor(noSbom), /SBOM/);
  const unknown = copy(); unknown.promotion.allowAutoPublish = true;
  assert.throws(() => validateDescriptor(unknown), /extra=allowAutoPublish/);
});
test('contract rejects using public as source or rebuilding here', () => {
  const source = copy(); source.promotion.sourceRepository = 'SupraShellScripts/violentmonkey-workbench';
  assert.throws(() => validateDescriptor(source), /sourceRepository/);
  const heavy = copy(); heavy.verification.heavyRebuildHere = true;
  assert.throws(() => validateDescriptor(heavy), /heavyRebuildHere/);
});
test('path guard rejects credentials, private custody, and prequalified releases', () => {
  for (const name of ['.env', 'keys/signing.pem', 'signing-keys/active.json', 'private-fixtures/test.json', 'dist/extension.xpi', 'releases/1.0.0/manifest.json', 'artifacts/file.zip']) {
    assert.throws(() => validatePaths([name]), /forbidden|bootstrap-only/);
  }
});
test('path guard rejects traversal, absolute, duplicates and Windows separators', () => {
  for (const name of ['../README.md', '/root/secrets', 'dir/../README.md', 'dir\\secrets', '']) {
    assert.throws(() => validatePaths([name]), /invalid|unsafe/);
  }
  assert.throws(() => validatePaths(['README.md', 'README.md']), /duplicate/);
});
test('path guard accepts checked-in documentation and source', () => {
  assert.equal(validatePaths(['README.md', 'coordination/consumer.json', 'docs/PROMOTION_CONTRACT.md', 'tools/verify-public-promotion.mjs']), true);
});
test('actual checkout is bootstrap-qualified only, never release-qualified', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const result = verifyBootstrap(root);
  assert.equal(result.releaseQualified, false);
  assert.equal(result.status, 'pass');
  assert.ok(result.filesChecked >= 3);
});

test('Git index mode check rejects unmaterialized submodules and symlinks', () => {
  const sha = 'a'.repeat(40);
  assert.deepEqual(validateGitIndexModes('100644 ' + sha + ' 0\tREADME.md\0'), ['README.md']);
  assert.deepEqual(validateGitIndexModes('100755 ' + sha + ' 0\ttools/verify-public-promotion.mjs\0'),
    ['tools/verify-public-promotion.mjs']);
  for (const mode of ['160000', '120000', '100664']) {
    assert.throws(() => validateGitIndexModes(mode + ' ' + sha + ' 0\tx\0'),
      /forbids symlink, gitlink or special mode/);
  }
});
test('Git index mode check rejects unmerged stages, duplicate entries and partial output', () => {
  const sha = 'b'.repeat(40);
  assert.throws(() => validateGitIndexModes('100644 ' + sha + ' 1\tREADME.md\0'),
    /Unmerged Git index/);
  assert.throws(() => validateGitIndexModes('100644 ' + sha + ' 0\tREADME.md\0' +
    '100644 ' + sha + ' 0\tREADME.md\0'), /duplicate/);
  assert.throws(() => validateGitIndexModes('100644 ' + sha + ' 0\tREADME.md'),
    /NUL-delimited/);
  assert.throws(() => validateGitIndexModes(''), /NUL-delimited/);
  assert.throws(() => validateGitIndexModes('100644 ' + sha + ' 0\t../escape\0'),
    /unsafe/);
});

test('public source paths reject cross-platform case and Unicode aliases', () => {
  assert.throws(() => validatePaths(['README.md', 'readme.MD']), /non-portable/);
  assert.throws(() => validatePaths(['docs/caf\u00e9.md', 'docs/cafe\u0301.md']), /non-portable/);
  assert.equal(validatePaths(['README.md', 'docs/guide.md', 'src/index.js']), true);
});

test('public source paths reject Windows device, trailing and invalid names', () => {
  for (const name of ['CON', 'docs/aux.txt', 'tools/LPT1.log', 'COM9/file',
    'docs/trailing.', 'docs/trailing ', 'docs/name:stream', 'docs/name|alias',
    'src/.git/config']) {
    assert.throws(() => validatePaths([name]), /non-portable/, name);
  }
});

test('public checkout custody requires exact tracked and physical file equivalence', () => {
  assert.equal(validateTrackedCheckoutPaths(['README.md', 'docs/help.md'], ['docs/help.md', 'README.md']), true);
  assert.throws(() => validateTrackedCheckoutPaths(['README.md'], ['README.md', 'docs/missing.md']), /missing=docs\/missing\.md/);
  assert.throws(() => validateTrackedCheckoutPaths(['README.md', 'untracked-helper.js'], ['README.md']), /untracked=untracked-helper\.js/);
  assert.throws(() => validateTrackedCheckoutPaths(['README.md', 'artifacts/payload.zip'], ['README.md']), /bootstrap-only/);
});
