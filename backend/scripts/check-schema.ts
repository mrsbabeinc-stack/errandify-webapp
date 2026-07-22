/**
 * Finds queries that name tables or columns the database does not have.
 *
 * Seven separate features were dead for exactly this reason and nobody could
 * see it, because each failure was caught and turned into a generic message:
 * account deletion, the PDPA data export, leave requests, the disputes lookup,
 * reading ratings, marking an errand complete, and referral bonuses. In every
 * case the screen said "something went wrong" or, worse, showed an empty list —
 * and an empty list reads as "nothing here yet", not "this is broken".
 *
 * So this reads the SQL out of the source, asks the live database what actually
 * exists, and prints the difference.
 *
 * Deliberately a standalone script rather than a startup check: it must never be
 * able to stop the server booting. Run it in CI, or by hand.
 *
 *   npx tsx scripts/check-schema.ts
 *
 * It is a linter, not a proof. Dynamic SQL and anything built by string
 * concatenation are invisible to it, so a clean run means "no obvious
 * mismatches", not "every query is correct".
 */

import db from '../src/db.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

// fileURLToPath, not .pathname — the project path contains spaces, which
// .pathname leaves percent-encoded and readdirSync cannot open.
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      out.push(...walk(p));
    } else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
}

/** SQL keywords and functions that can appear where a column name would. */
const NOT_A_COLUMN = new Set([
  'select', 'from', 'where', 'and', 'or', 'not', 'null', 'true', 'false', 'as',
  'on', 'in', 'is', 'join', 'left', 'right', 'inner', 'outer', 'full', 'cross',
  'group', 'order', 'by', 'having', 'limit', 'offset', 'union', 'all', 'distinct',
  'insert', 'into', 'values', 'update', 'set', 'delete', 'returning', 'conflict',
  'do', 'nothing', 'case', 'when', 'then', 'else', 'end', 'exists', 'between',
  'like', 'ilike', 'asc', 'desc', 'count', 'sum', 'avg', 'min', 'max', 'coalesce',
  'now', 'interval', 'extract', 'date', 'cast', 'array', 'string_agg', 'json',
  'jsonb', 'to_char', 'nullif', 'greatest', 'least', 'lower', 'upper', 'trim',
  'concat', 'length', 'round', 'abs', 'any', 'with', 'using', 'over', 'partition',
  'row_number', 'rank', 'filter', 'text', 'int', 'integer', 'boolean', 'numeric',
  'timestamp', 'current_date', 'current_timestamp', 'default', 'constraint',
  'primary', 'foreign', 'key', 'references', 'create', 'table', 'alter', 'add',
  'drop', 'index', 'unique', 'begin', 'commit', 'rollback', 'if', 'exclude',
  'position', 'substring', 'replace', 'split_part', 'age', 'date_part', 'first',
  'last', 'both', 'leading', 'trailing', 'similar', 'escape', 'natural',
  // English words that survive comment-stripping when SQL is interpolated mid
  // sentence. Cheaper than parsing SQL properly, and this is a linter.
  'the', 'a', 'an', 'its', 'their', 'his', 'her', 'this', 'that', 'these', 'those',
  'existing', 'lines', 'database', 'result', 'each', 'every', 'one', 'two', 'here',
  'there', 'which', 'what', 'who', 'them', 'it', 'we', 'you', 'they', 'has', 'have',
  'been', 'being', 'was', 'were', 'will', 'would', 'can', 'could', 'should', 'may',
  // JS array/object methods — `ratings.map(...)` sitting next to a query that
  // selects FROM ratings looks exactly like a column reference.
  'map', 'reduce', 'filter', 'foreach', 'find', 'some', 'includes', 'push',
  'slice', 'splice', 'join', 'sort', 'rows', 'length', 'tostring', 'then',
]);

async function main() {
  // What the database actually has.
  const cols = await db.query(`
    SELECT table_name, column_name
      FROM information_schema.columns
     WHERE table_schema = 'public'`);
  const schema = new Map<string, Set<string>>();
  for (const r of cols.rows) {
    if (!schema.has(r.table_name)) schema.set(r.table_name, new Set());
    schema.get(r.table_name)!.add(r.column_name);
  }

  const files = walk(ROOT).filter(f => !f.includes('/migrations/'));
  const missingTables: { file: string; table: string }[] = [];
  const missingColumns: { file: string; table: string; column: string }[] = [];
  const seenT = new Set<string>();
  const seenC = new Set<string>();

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);

    // Only look inside strings that are actually SQL. Scanning whole files
    // matched English prose in comments — "from her" and "into the" became
    // table names, which buried the real findings under 400 lines of noise.
    const literals = [...src.matchAll(/`([^`]*)`|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
      .map(m => m[1] ?? m[2] ?? m[3] ?? '')
      .filter(t => /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i.test(t)
                && /\b(FROM|INTO|SET|WHERE)\b/i.test(t));

    for (const raw of literals) {
      // Strip SQL comments before matching. A template literal often carries an
      // explanatory -- comment, and "-- pull the errand from the bid" turned
      // "the" into a table name.
      const sql = raw.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
      const tableRefs = [...sql.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)/gi)]
        .map(m => m[1].toLowerCase())
        .filter(t => !NOT_A_COLUMN.has(t));

      for (const t of new Set(tableRefs)) {
        if (!schema.has(t)) {
          const k = `${rel}|${t}`;
          if (!seenT.has(k)) { seenT.add(k); missingTables.push({ file: rel, table: t }); }
          continue;
        }
        const qualified = [...sql.matchAll(new RegExp(`\\b${t}\\.([a-z_][a-z0-9_]*)`, 'gi'))]
          .map(m => m[1].toLowerCase());
        for (const c of new Set(qualified)) {
          if (NOT_A_COLUMN.has(c)) continue;
          if (!schema.get(t)!.has(c)) {
            const k = `${rel}|${t}.${c}`;
            if (!seenC.has(k)) { seenC.add(k); missingColumns.push({ file: rel, table: t, column: c }); }
          }
        }
      }

      // Single-table statements let us check unqualified columns too, which is
      // where most of the real damage was.
      const single = [...new Set(tableRefs)];
      if (single.length === 1 && schema.has(single[0])) {
        const t = single[0];
        const cols2 = [...sql.matchAll(/\b([a-z_][a-z0-9_]*)\s*=\s*\$\d/gi)].map(m => m[1].toLowerCase());
        for (const c of new Set(cols2)) {
          if (NOT_A_COLUMN.has(c)) continue;
          if (!schema.get(t)!.has(c)) {
            const k = `${rel}|${t}.${c}`;
            if (!seenC.has(k)) { seenC.add(k); missingColumns.push({ file: rel, table: t, column: c }); }
          }
        }
      }
    }
  }

  console.log(`\nScanned ${files.length} files against ${schema.size} live tables.\n`);

  if (missingTables.length) {
    console.log(`TABLES THAT DO NOT EXIST (${missingTables.length})\n`);
    for (const m of missingTables) console.log(`  ${m.table.padEnd(28)} ${m.file}`);
    console.log('');
  }
  if (missingColumns.length) {
    console.log(`COLUMNS THAT DO NOT EXIST (${missingColumns.length})\n`);
    for (const m of missingColumns) {
      console.log(`  ${`${m.table}.${m.column}`.padEnd(42)} ${m.file}`);
    }
    console.log('');
  }
  if (!missingTables.length && !missingColumns.length) {
    console.log('No obvious mismatches. (Dynamic SQL is invisible to this — not a proof.)\n');
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
