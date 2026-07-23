/**
 * Import an interest-form export into `leads`.
 *
 * Deliberately a script rather than an upload endpoint. A bulk lead write is a
 * founder-operated, one-off job; exposing it as a permanent HTTP surface would
 * make loading a purchased list a two-click operation, and no endpoint can
 * verify a consent basis its caller merely asserts. Here the basis has to be
 * typed out, it is recorded on every row, and the run is a dry run unless you
 * say otherwise.
 *
 * ── Consent ──────────────────────────────────────────────────────────────
 * `--consent-basis` is required and must say where consent came from. If the
 * CSV carries its own per-row consent column, that column wins and rows
 * without a yes are imported with `consent_contact = false` — held, but not
 * contactable — rather than being silently upgraded.
 *
 * Marketing consent is never inferred. A person ticking "tell me when you
 * launch" has consented to that, not to promotions; pass --marketing-column
 * only if the form asked a separate question.
 *
 * I am not a lawyer. This relies on PDPA s13–15 (consent), s18 (purpose
 * limitation) and s25 (retention). Confirm before any outbound send.
 *
 * Usage:
 *   node backend/scripts/import-leads.mjs <file.csv> \
 *     --source interest_form \
 *     --consent-basis "Pre-launch interest form, Jan-Jul 2026, consent checkbox on submit" \
 *     [--consent-column "I agree to be contacted"] \
 *     [--marketing-column "Send me updates"] \
 *     [--type individual|company] \
 *     [--commit]
 *
 * Without --commit nothing is written and you get the full report.
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config();

// ------------------------------------------------------------------ args

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--'));
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const COMMIT = has('commit');
const SOURCE = flag('source', 'interest_form');
const CONSENT_BASIS = flag('consent-basis');
const CONSENT_COLUMN = flag('consent-column');
/** When set, only this exact cell value counts as consent. */
const CONSENT_VALUE = flag('consent-value');
const MARKETING_COLUMN = flag('marketing-column');
const LEAD_TYPE = flag('type', 'individual');
/** Column holding Individual/Company per row, instead of a single --type. */
const TYPE_COLUMN = flag('type-column');

function die(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

if (!file) die('Give me a CSV path.');
if (!fs.existsSync(file)) die(`No such file: ${file}`);
if (!CONSENT_BASIS) {
  die(
    'A --consent-basis is required. Say where the consent came from, e.g.\n' +
      '    --consent-basis "Pre-launch interest form, consent checkbox on submit"\n' +
      '  If you cannot describe it, the rows should not be imported.'
  );
}
if (!['individual', 'company'].includes(LEAD_TYPE)) die('--type must be individual or company');

// ------------------------------------------------------------------- csv

/** RFC4180-ish: handles quoted fields, embedded commas, doubled quotes, CRLF. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => String(v).trim() !== ''));
}

/**
 * Map whatever the form called its columns onto our fields. Google Forms
 * headers are the question text, so this matches loosely and reports what it
 * picked — a silent mismapping would put phone numbers in the notes field.
 */
const FIELD_PATTERNS = {
  // Specific before general: "First Name"/"Last Name" must be claimed before a
  // bare /name/ pattern or "First Name" gets taken as the whole name.
  first_name: [/^first.?name$/i, /^given.?name$/i],
  last_name: [/^last.?name$/i, /^surname$/i, /^family.?name$/i],
  full_name: [/^name$/i, /full.?name/i, /your name/i, /^nama/i],
  email: [/e-?mail/i],
  // A bare "Contact" heading is a phone number often enough to claim it. It is
  // checked after email so a "Contact Email" column cannot be stolen.
  mobile: [/mobile/i, /phone/i, /contact.*(number|no)/i, /hand ?phone/i, /^hp$/i, /^contact$/i],
  company_name: [/company.?name/i, /business.*name/i, /organisation|organization/i, /^company$/i],
  notes: [/message/i, /comment/i, /tell us/i, /remarks/i, /note/i],
  interested_categories: [/categor/i, /service/i, /what.*(help|do|offer)/i, /skill/i, /trade/i],
  service_areas: [/^area$/i, /region/i, /town/i, /postal/i, /which area/i, /where.*(live|based)/i],
  created_at: [/^timestamp$/i, /^date$/i, /submitted/i],
};

function mapHeaders(headers, excluded = new Set()) {
  const map = {};
  const used = new Set(excluded);
  for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue;
      const h = String(headers[i]).trim();
      if (patterns.some((p) => p.test(h))) {
        map[field] = i;
        used.add(i);
        break;
      }
    }
  }
  return map;
}

/**
 * Consent cells.
 *
 * `on` is included because an HTML checkbox that is ticked submits the literal
 * string "on" and an unticked one submits nothing at all. That also means two
 * checkboxes feeding one column produce "on on" when both are ticked and a
 * bare "on" when only one is — and *which* one is unrecoverable from the
 * export. Use --consent-value to demand an exact string when that ambiguity
 * matters, which it usually does.
 */
const truthy = (v) =>
  /^(y|yes|true|1|on|agree|agreed|ok|okay|consent|consented|✓|✔)/i.test(String(v ?? '').trim());

const normEmail = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : null;
};

const normMobile = (v) => {
  const d = String(v ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 10 && d.startsWith('65')) return d.slice(2);
  return d;
};

const splitList = (v) =>
  String(v ?? '')
    .split(/[,;|/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Form answers are prose ("Home Maintenance", "aircon servicing"); errands
 * store slugs ("home-maintenance"). Stored raw, a lead would never match the
 * supply gap it was recruited for and `leads_in_pipeline` would sit at zero
 * forever. Slugs are read from the errands table so this cannot drift from
 * whatever the app actually uses.
 *
 * Exact and prefix matches only. An answer that does not map is kept verbatim
 * rather than guessed into the nearest category — a wrong trade on a lead is
 * worse than an unmatched one, because it sends you calling the wrong person.
 */
function makeCategoryMapper(slugs) {
  const bySlug = new Map(slugs.map((s) => [s, s]));
  const byWords = new Map(slugs.map((s) => [s.replace(/-/g, ' '), s]));

  return (raw) => {
    const t = String(raw).trim().toLowerCase();
    if (!t) return null;
    const hyphenated = t.replace(/\s+/g, '-');
    if (bySlug.has(hyphenated)) return bySlug.get(hyphenated);
    if (byWords.has(t)) return byWords.get(t);
    // "Cleaning" → cleaning-household; "Home Maintenance (aircon)" → home-maintenance
    for (const [words, slug] of byWords) {
      if (words.startsWith(t) || t.startsWith(words)) return slug;
    }
    for (const slug of bySlug.keys()) {
      if (slug.split('-')[0] === hyphenated.split('-')[0]) return slug;
    }
    return raw.trim();
  };
}

// ------------------------------------------------------------------ main

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'errandify_local',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || undefined,
});

async function main() {
  const rows = parseCSV(fs.readFileSync(file, 'utf8'));
  if (rows.length < 2) die('That file has no data rows.');

  const headers = rows[0].map((h) => String(h).trim());

  // Columns named by flags are claimed first, so auto-mapping cannot steal
  // them. This file's "Location" column holds Individual/Company, not a place —
  // without this it would have been imported as a service area.
  const findCol = (name, label) => {
    if (!name) return -1;
    const i = headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));
    if (i < 0) die(`No column matching --${label} "${name}". Headers: ${headers.join(' | ')}`);
    return i;
  };
  const consentIdx = findCol(CONSENT_COLUMN, 'consent-column');
  const marketingIdx = findCol(MARKETING_COLUMN, 'marketing-column');
  const typeIdx = findCol(TYPE_COLUMN, 'type-column');

  const claimed = new Set([consentIdx, marketingIdx, typeIdx].filter((i) => i >= 0));
  const map = mapHeaders(headers, claimed);

  console.log(`\n=== Lead import ${COMMIT ? '(COMMIT)' : '(dry run)'} ===\n`);
  console.log(`  File          ${path.basename(file)}  —  ${rows.length - 1} data rows`);
  console.log(`  Type          ${LEAD_TYPE}`);
  console.log(`  Source        ${SOURCE}`);
  console.log(`  Consent basis ${CONSENT_BASIS}`);
  console.log('\n  Column mapping:');
  for (const [field, i] of Object.entries(map)) {
    console.log(`    ${field.padEnd(22)} ← "${headers[i]}"`);
  }
  const unmapped = headers.filter((_, i) => !Object.values(map).includes(i));
  if (unmapped.length) console.log(`    (ignored: ${unmapped.map((h) => `"${h}"`).join(', ')})`);

  if (consentIdx >= 0) {
    console.log(
      `\n  Consent       column "${headers[consentIdx]}"` +
        (CONSENT_VALUE ? `, counted only when exactly "${CONSENT_VALUE}"` : '')
    );
  }
  if (typeIdx >= 0) console.log(`  Lead type     column "${headers[typeIdx]}" (per row)`);

  if (!map.full_name && !map.first_name) {
    die('Could not find a name column. Headers seen: ' + headers.join(' | '));
  }
  if (!map.email && !map.mobile) die('Could not find an email or mobile column.');

  const slugs = (
    await pool.query(`SELECT DISTINCT category FROM errands WHERE category IS NOT NULL ORDER BY 1`)
  ).rows.map((r) => r.category);
  const toSlug = makeCategoryMapper(slugs);

  const report = {
    imported: 0,
    merged: 0,
    alreadyUser: 0,
    noContact: 0,
    refused: 0,
    dupeInFile: 0,
  };
  const seen = new Set();
  const samples = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const cell = (f) => (map[f] !== undefined ? row[map[f]] : undefined);

    const fullName = (
      String(cell('full_name') ?? '').trim() ||
      [cell('first_name'), cell('last_name')].map((s) => String(s ?? '').trim()).filter(Boolean).join(' ')
    ).trim();

    const rowType =
      typeIdx >= 0
        ? /company|business|corporate/i.test(String(row[typeIdx] ?? '')) ? 'company' : 'individual'
        : LEAD_TYPE;
    const email = normEmail(cell('email'));
    const mobile = normMobile(cell('mobile'));

    if (!fullName || (!email && !mobile)) {
      report.noContact++;
      continue;
    }

    // Both keys, not `email || mobile`. One person filling the form twice with
    // a work address and a personal one shares only the mobile, and keying on
    // email alone would let the dry run promise more rows than the commit can
    // insert — the unique index on mobile_normalised collapses them anyway.
    const keys = [email && `e:${email}`, mobile && `m:${mobile}`].filter(Boolean);
    if (keys.some((k) => seen.has(k))) {
      report.dupeInFile++;
      continue;
    }
    keys.forEach((k) => seen.add(k));

    // Already has an account — that is a user, not a lead. Counting them keeps
    // the funnel honest instead of inflating it with people already signed up.
    const asUser = await pool.query(
      `SELECT id FROM users
        WHERE (email IS NOT NULL AND LOWER(email) = $1)
           OR (mobile IS NOT NULL AND regexp_replace(mobile,'\\D','','g') LIKE '%' || $2)
        LIMIT 1`,
      [email, mobile ?? ' ']
    );
    if (asUser.rows.length > 0) {
      report.alreadyUser++;
      continue;
    }

    const consentCell = consentIdx >= 0 ? String(row[consentIdx] ?? '').trim() : '';
    const consent =
      consentIdx < 0
        ? true
        : CONSENT_VALUE
        ? consentCell.toLowerCase() === CONSENT_VALUE.toLowerCase()
        : truthy(consentCell);
    const marketing = marketingIdx >= 0 ? truthy(row[marketingIdx]) : false;

    // Someone who answered the consent question "no" is skipped outright, not
    // stored with the flag off. Once they have refused, holding their name,
    // email and mobile serves no purpose you could state — and PDPA s25 says
    // cease to retain when the purpose is gone. Keeping the row "just in case"
    // is exactly the retention PDPC 18.11 warns about.
    if (consentIdx >= 0 && !consent) {
      report.refused++;
      continue;
    }

    const record = {
      lead_type: rowType,
      full_name: fullName,
      email: cell('email') ? String(cell('email')).trim() : null,
      email_normalised: email,
      mobile: cell('mobile') ? String(cell('mobile')).trim() : null,
      mobile_normalised: mobile,
      company_name: cell('company_name') ? String(cell('company_name')).trim() : null,
      interested_categories: [
        ...new Set(splitList(cell('interested_categories')).map(toSlug).filter(Boolean)),
      ],
      service_areas: splitList(cell('service_areas')),
      source: SOURCE,
      source_detail: `${path.basename(file)} — ${CONSENT_BASIS}`,
      notes: cell('notes') ? String(cell('notes')).trim() : null,
      consent_contact: consent,
      consent_marketing: marketing,
    };

    if (samples.length < 3) samples.push(record);

    if (!COMMIT) {
      report.imported++;
      continue;
    }

    const existing = await pool.query(
      `SELECT id FROM leads
        WHERE (email_normalised IS NOT NULL AND email_normalised = $1)
           OR (mobile_normalised IS NOT NULL AND mobile_normalised = $2)
        LIMIT 1`,
      [email, mobile]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE leads SET
           consent_contact = consent_contact OR $2,
           consent_at = CASE WHEN consent_contact OR $2 THEN COALESCE(consent_at, NOW()) END,
           notes = COALESCE(notes, $3),
           updated_at = NOW()
         WHERE id = $1`,
        [existing.rows[0].id, consent, record.notes]
      );
      await pool.query(
        `INSERT INTO lead_events (lead_id, kind, note) VALUES ($1,'imported',$2)`,
        [existing.rows[0].id, `Re-seen in ${path.basename(file)}`]
      );
      report.merged++;
      continue;
    }

    const inserted = await pool.query(
      `INSERT INTO leads (
         lead_ref, lead_type, full_name, email, email_normalised, mobile, mobile_normalised,
         company_name, interested_categories, service_areas, source, source_detail, notes,
         consent_contact, consent_marketing, consent_notice_version, consent_at
       ) VALUES (
         'LD26-' || LPAD(nextval('lead_ref_seq')::text, 5, '0'),
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
         CASE WHEN $13 THEN NOW() END
       ) RETURNING id`,
      [
        record.lead_type, record.full_name, record.email, record.email_normalised,
        record.mobile, record.mobile_normalised, record.company_name,
        record.interested_categories, record.service_areas,
        record.source, record.source_detail, record.notes,
        record.consent_contact, record.consent_marketing, CONSENT_BASIS.slice(0, 20),
      ]
    );
    await pool.query(
      `INSERT INTO lead_events (lead_id, kind, note) VALUES ($1,'imported',$2)`,
      [inserted.rows[0].id, `Imported from ${path.basename(file)}`]
    );
    report.imported++;
  }

  console.log('\n  Sample of what would be written:');
  for (const s of samples) {
    console.log(
      `    ${s.full_name} | ${s.email ?? '—'} | ${s.mobile ?? '—'} | consent=${s.consent_contact} marketing=${s.consent_marketing}`
    );
  }

  console.log('\n  Result:');
  console.log(`    ${COMMIT ? 'Imported' : 'Would import'}   ${report.imported}`);
  if (report.merged) console.log(`    Merged            ${report.merged}`);
  console.log(`    Already a user    ${report.alreadyUser}`);
  console.log(`    Duplicate in file ${report.dupeInFile}`);
  console.log(`    No usable contact ${report.noContact}`);
  if (report.refused) {
    console.log(
      `    Refused consent   ${report.refused}  ← skipped entirely, not stored (PDPA s25: no purpose left to retain)`
    );
  }
  if (consentIdx < 0) {
    console.log(
      '\n  ⚠ No --consent-column was given, so every row was taken as consenting on the\n' +
        '    strength of the basis you typed. If the form did not actually ask, these\n' +
        '    people have not consented and must be re-permissioned before any contact.'
    );
  }
  if (!COMMIT) console.log('\n  Dry run — nothing written. Re-run with --commit when the mapping looks right.');
  console.log('');
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    pool.end();
    process.exit(1);
  });
