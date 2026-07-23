/**
 * Tells you whether each leaked secret has actually been rotated, without ever
 * printing a secret value.
 *
 * It compares the value in your local backend/.env against the value that was
 * committed to .env.staging (read from git history). If they still match, you
 * have not rotated it yet. If they differ, you have.
 *
 *   node scripts/check-secrets.mjs
 *
 * Reads only. Changes nothing.
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEYS = ['JWT_SECRET', 'QWEN_API_KEY', 'DATABASE_URL', 'STRIPE_SECRET_KEY'];

function parseEnv(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

// A short hash, so we can compare without ever showing the value.
const fp = (v) => (v ? createHash('sha256').update(v).digest('hex').slice(0, 8) : null);

function read(path) {
  try { return parseEnv(readFileSync(join(ROOT, path), 'utf8')); }
  catch { return {}; }
}

// The leaked values, straight from the committed file in git history.
let leaked = {};
try {
  // The most recent commit that ADDED or MODIFIED the file — not the one that
  // deleted it, whose tree no longer contains it.
  const commit = execSync('git log --all --diff-filter=AM --format=%H -- .env.staging | head -1',
    { cwd: ROOT, encoding: 'utf8' }).trim();
  if (commit) {
    const content = execSync(`git show ${commit}:.env.staging`, { cwd: ROOT, encoding: 'utf8' });
    leaked = parseEnv(content);
  }
} catch {
  console.log('Could not read the leaked .env.staging from git history.');
  console.log('That may mean history was already scrubbed — good. Verify manually.\n');
}

const local = { ...read('.env'), ...read('backend/.env') };

console.log('\nHave the leaked secrets been rotated?\n');
let allDone = true;
for (const k of KEYS) {
  const leakedV = leaked[k];
  const localV = local[k];
  let status;
  if (!localV) { status = 'not set in local .env — check your live environment directly'; }
  else if (!leakedV) { status = 'local differs (no leaked value on record)'; }
  else if (fp(localV) === fp(leakedV)) { status = 'LOCAL .env STILL HOLDS THE LEAKED VALUE — rotate now'; allDone = false; }
  else { status = 'local .env differs from the leaked value'; }
  console.log(`  ${k.padEnd(20)} ${status}`);
}

// The honest limit: this can only see the local file. The value that leaked was
// staging's, so a matching-or-not local file does not prove the staging or
// production secret is safe. That check has to happen where the app really runs.
console.log(
  '\nThis compares your LOCAL .env against what leaked. It cannot see your\n' +
  'staging or production environment — you must confirm those separately, in\n' +
  'the host panel / secrets manager / Docker env where the live app reads them.\n' +
  (allDone
    ? '\nLocal looks clean. The live environment is the one that actually matters here.\n'
    : '\nYour local .env still holds a leaked value. See ROTATE_SECRETS.md.\n'));

process.exit(0);
