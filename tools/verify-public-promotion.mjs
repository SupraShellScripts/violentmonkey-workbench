import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'SupraShellScripts/violentmonkey-workbench';
const PRIVATE_COORDINATOR = REPOSITORY + '-private';
const EXPECTED_EVIDENCE = Object.freeze([
  'source commit',
  'extension compatibility reference',
  'tooling image digests',
  'installer and artifact checksums',
  'SBOM',
  'provenance',
  'browser compatibility manifest',
  'release notes',
]);
const REQUIRED_CHECKS = Object.freeze([
  'manifest validation',
  'artifact presence',
  'checksum verification',
  'provenance linkage',
  'public-content boundary',
]);
const BLOCKED_PAYLOAD_ROOTS = new Set(['releases', 'release', 'artifacts', 'installers', 'dist']);
const BLOCKED_FILE_NAME = /^(?:\.env(?:\..+)?|id_(?:rsa|ed25519|ecdsa)|credentials(?:\..+)?|secret(?:s)?(?:\..+)?|.*\.(?:pem|key|p12|pfx|kdbx))$/i;
const BLOCKED_DIR_NAME = /^(?:private-fixtures|private-evidence|signing-keys|personal-browser-data)$/i;

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(name + ' must be an object');
  }
}
function requireExactKeys(obj, keys, name) {
  requireObject(obj, name);
  const missing = keys.filter(key => !Object.hasOwn(obj, key));
  const extra = Object.keys(obj).filter(key => !keys.includes(key));
  if (missing.length || extra.length) {
    throw new Error(name + ' shape mismatch: missing=' + (missing.join(',') || 'none') + ' extra=' + (extra.join(',') || 'none'));
  }
}
function requireLiteral(value, expected, name) {
  if (value !== expected) throw new Error(name + ' must equal ' + JSON.stringify(expected));
}
function requireSet(value, required, name) {
  if (!Array.isArray(value) || value.length !== new Set(value).size || value.some(x => typeof x !== 'string' || !x.trim())) {
    throw new Error(name + ' must be an array of unique nonempty strings');
  }
  const missing = required.filter(x => !value.includes(x));
  if (missing.length) throw new Error(name + ' missing required entries: ' + missing.join(', '));
}

/** Validate the reviewed public bootstrap contract, not an actual release candidate. */
export function validateDescriptor(value) {
  requireExactKeys(value, ['schemaVersion', 'repository', 'role', 'coordinator', 'coordinatorParentIssue', 'localPath', 'defaultBranch', 'promotion', 'allowedContent', 'prohibitedContent', 'verification'], 'descriptor');
  requireLiteral(value.schemaVersion, 1, 'schemaVersion');
  requireLiteral(value.repository, REPOSITORY, 'repository');
  requireLiteral(value.role, 'public-workbench-promotion-target', 'role');
  requireLiteral(value.coordinator, PRIVATE_COORDINATOR, 'coordinator');
  requireLiteral(value.coordinatorParentIssue, PRIVATE_COORDINATOR + '#9', 'coordinatorParentIssue');
  requireLiteral(value.localPath, REPOSITORY, 'localPath');
  requireLiteral(value.defaultBranch, 'main', 'defaultBranch');
  requireExactKeys(value.promotion, ['sourceRepository', 'requiresPullRequest', 'privateValidationRequired', 'expectedEvidence'], 'promotion');
  requireLiteral(value.promotion.sourceRepository, PRIVATE_COORDINATOR, 'promotion.sourceRepository');
  requireLiteral(value.promotion.requiresPullRequest, true, 'promotion.requiresPullRequest');
  requireLiteral(value.promotion.privateValidationRequired, true, 'promotion.privateValidationRequired');
  requireSet(value.promotion.expectedEvidence, EXPECTED_EVIDENCE, 'promotion.expectedEvidence');
  requireSet(value.allowedContent, ['reviewed public source', 'SBOM and provenance', 'public documentation'], 'allowedContent');
  requireSet(value.prohibitedContent, ['private credentials or signing keys', 'private fixtures or test accounts', 'unreviewed private source'], 'prohibitedContent');
  requireExactKeys(value.verification, ['heavyRebuildHere', 'scope'], 'verification');
  requireLiteral(value.verification.heavyRebuildHere, false, 'verification.heavyRebuildHere');
  requireSet(value.verification.scope, REQUIRED_CHECKS, 'verification.scope');
  return true;
}

/** Only path-level checks. Not content or secret scanning, and not a release-artifact verifier. */
export function validatePaths(paths) {
  if (!Array.isArray(paths)) throw new Error('paths must be an array');
  const seen = new Set();
  const portableKeys = new Set();
  for (const path of paths) {
    if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') || path.includes('\0')) {
      throw new Error('invalid repository-relative path');
    }
    const parts = path.split('/');
    if (parts.some(x => !x || x === '.' || x === '..') || seen.has(path)) throw new Error('unsafe or duplicate path: ' + path);
    seen.add(path);
    // Public promotions must materialize identically on Windows/macOS/Linux,
    // not only on the Linux Actions runner. Catch case/Unicode aliases early.
    const portableKey = path.normalize('NFC').toLowerCase();
    if (portableKeys.has(portableKey)) {
      throw new Error('non-portable case or Unicode alias in public path: ' + path);
    }
    portableKeys.add(portableKey);
    if (parts.some(part =>
      /[. ]$/.test(part)
      || /[<>:"|?*\x00-\x1f]/.test(part)
      || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(part)
      || part.toLowerCase() === '.git')) {
      throw new Error('non-portable Windows/macOS checkout path: ' + path);
    }
    if (BLOCKED_PAYLOAD_ROOTS.has(parts[0].toLowerCase())) {
      throw new Error('release payload is not covered by bootstrap-only verification: ' + path);
    }
    if (parts.some(x => BLOCKED_DIR_NAME.test(x)) || BLOCKED_FILE_NAME.test(parts.at(-1))) {
      throw new Error('credential/private-custody path is forbidden: ' + path);
    }
  }
  return true;
}


/** Check Git index modes: unpopulated submodules are invisible to a tree walk.
 * This never fetches any submodule, remote ref or private artifact.
 */
export function validateGitIndexModes(zeroDelimited) {
  if (typeof zeroDelimited !== 'string' || !zeroDelimited.endsWith('\0')) {
    throw new Error('Git index listing must be complete, NUL-delimited text');
  }
  const entries = zeroDelimited.slice(0, -1).split('\0');
  if (!entries.length || (entries.length === 1 && !entries[0])) {
    throw new Error('Empty public Git index listing');
  }
  const paths = [];
  for (const entry of entries) {
    const fields = /^([0-7]{6}) ([0-9a-f]{40}|[0-9a-f]{64}) ([0-3])\t(.+)$/s.exec(entry);
    if (!fields) throw new Error('Unrecognized Git index entry shape');
    const [, mode, , stage, filePath] = fields;
    if (stage !== '0') throw new Error('Unmerged Git index stage is forbidden');
    if (mode !== '100644' && mode !== '100755') {
      throw new Error('Public Git index forbids symlink, gitlink or special mode: ' + mode);
    }
    paths.push(filePath);
  }
  validatePaths(paths);
  return paths.sort();
}

export function inspectTree(root) {
  const found = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' && dir === root) continue;
      const full = resolve(dir, entry.name);
      const info = lstatSync(full);
      const rel = relative(root, full).split(sep).join('/');
      if (info.isSymbolicLink()) throw new Error('symlink in public tree requires explicit review: ' + rel);
      if (info.isDirectory()) visit(full);
      else if (info.isFile()) found.push(rel);
      else throw new Error('unsupported public tree object: ' + rel);
    }
  }
  visit(root);
  return found.sort();
}

/**
 * A public promotion checkout must be exactly the reviewed Git index tree.
 * An untracked payload is no more authorized than a missing tracked source.
 */
export function validateTrackedCheckoutPaths(physicalPaths, indexPaths) {
  validatePaths(physicalPaths);
  validatePaths(indexPaths);
  const physical = new Set(physicalPaths);
  const tracked = new Set(indexPaths);
  const missing = indexPaths.filter(filePath => !physical.has(filePath));
  const extra = physicalPaths.filter(filePath => !tracked.has(filePath));
  if (missing.length || extra.length) {
    throw new Error('Public checkout differs from reviewed Git index: missing=' +
      (missing.join(',') || 'none') + '; untracked=' + (extra.join(',') || 'none'));
  }
  return true;
}

export function verifyBootstrap(root) {
  const normalizedRoot = resolve(root);
  const descriptor = JSON.parse(readFileSync(resolve(normalizedRoot, 'coordination/consumer.json'), 'utf8'));
  validateDescriptor(descriptor);
  const paths = inspectTree(normalizedRoot);
  validatePaths(paths);
  const index = execFileSync('git', ['-C', normalizedRoot, 'ls-files', '--stage', '-z'], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  const tracked = validateGitIndexModes(index);
  validateTrackedCheckoutPaths(paths, tracked);
  return { status: 'pass', mode: 'bootstrap-only', releaseQualified: false, repository: REPOSITORY, filesChecked: paths.length, trackedFilesChecked: tracked.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3) throw new Error('usage: node tools/verify-public-promotion.mjs [checkout-root]');
    const outcome = verifyBootstrap(resolve(process.argv[2] || resolve(fileURLToPath(new URL('..', import.meta.url)))));
    process.stdout.write(JSON.stringify(outcome) + '\n');
  } catch (error) {
    process.stderr.write('Public Workbench promotion bootstrap verification failed: ' + error.message + '\n');
    process.exitCode = 1;
  }
}
