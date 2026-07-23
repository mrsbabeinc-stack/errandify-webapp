import db from '../db.js';

/**
 * Accounts & Finance domain logic.
 *
 * The CPF and IRAS calculations used to live in PayrollDashboard.tsx, which
 * meant payslip figures were computed in the browser and never stored. They are
 * here now so a payroll run is reproducible and auditable from the database.
 *
 * NOT LEGAL OR TAX ADVICE. The CPF rates below are the Singapore rates for a
 * private-sector employee aged 55 and under (CPF Act; CPF Board contribution
 * rate tables), and the tax bands are the IRAS resident rates. Age-banded rates,
 * SPR graduated rates, reliefs and the Additional Wage ceiling formula are NOT
 * modelled. Have a practitioner confirm before these figures are filed or paid.
 */

export const GST_RATE = 0.09; // Singapore GST from 1 Jan 2024

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * The OA/SA/MA split that used to sit here has been removed rather than
 * corrected. Those percentages were invented, MOM's itemised payslip rules do
 * not require the account split (only the employee's CPF deduction and the
 * employer's contribution), and how CPF Board allocates a contribution across
 * accounts is not the employer's calculation to publish.
 */

export interface TaxBreakdown {
  annualGross: number;
  monthlyGross: number;
  annualCPFDeduction: number;
  taxableIncome: number;
  monthlyTax: number;
  annualTax: number;
  taxRate: number;
}

// ---------------------------------------------------------------------------
// CPF
// ---------------------------------------------------------------------------

/**
 * CPF contribution rates, from the CPF Board tables.
 *
 * Verified against cpf.gov.sg (July 2026):
 *   https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
 *   https://www.cpf.gov.sg/employer/infohub/news/cpf-related-announcements/new-contribution-rates
 *   https://www.cpf.gov.sg/service/article/what-is-the-ordinary-wage-ow-ceiling
 *
 * What was here before was not a statutory rate table at all: a flat 9%
 * employee / 14.5% employer against a $6,000 ceiling, with monthly salary above
 * the ceiling wrongly treated as Additional Wage and charged 8%. The real
 * employee rate for someone aged 55 or under is 20%, the employer 17%, and the
 * ceiling has been $8,000 since 1 January 2026 — so contributions were being
 * understated by more than half.
 *
 * Rates are keyed by the period they take effect so a payroll run for an
 * earlier month uses that month's table, not today's. Add the next January's
 * rates as a new entry; never edit a past one.
 */
export interface CPFRateBand {
  /** Upper bound of the age band, inclusive. Infinity for the oldest band. */
  maxAge: number;
  employee: number;
  employer: number;
}

interface CPFRateTable {
  /** Effective from, inclusive, as YYYY-MM. */
  from: string;
  owCeiling: number;
  bands: CPFRateBand[];
}

/** Newest first — the first entry whose `from` is <= the period wins. */
const CPF_RATE_TABLES: CPFRateTable[] = [
  {
    from: '2027-01',
    owCeiling: 8000,
    bands: [
      { maxAge: 55, employee: 0.20, employer: 0.17 },
      { maxAge: 60, employee: 0.19, employer: 0.165 },
      { maxAge: 65, employee: 0.13, employer: 0.13 },
      { maxAge: 70, employee: 0.075, employer: 0.09 },
      { maxAge: Infinity, employee: 0.05, employer: 0.075 },
    ],
  },
  {
    from: '2026-01',
    owCeiling: 8000,
    bands: [
      { maxAge: 55, employee: 0.20, employer: 0.17 },
      { maxAge: 60, employee: 0.18, employer: 0.16 },
      { maxAge: 65, employee: 0.125, employer: 0.125 },
      { maxAge: 70, employee: 0.075, employer: 0.09 },
      { maxAge: Infinity, employee: 0.05, employer: 0.075 },
    ],
  },
  // Earlier ceilings, so a back-dated run is not computed on today's.
  { from: '2025-01', owCeiling: 7400, bands: [
      { maxAge: 55, employee: 0.20, employer: 0.17 },
      { maxAge: 60, employee: 0.17, employer: 0.155 },
      { maxAge: 65, employee: 0.115, employer: 0.12 },
      { maxAge: 70, employee: 0.075, employer: 0.09 },
      { maxAge: Infinity, employee: 0.05, employer: 0.075 },
    ] },
  { from: '2024-01', owCeiling: 6800, bands: [
      { maxAge: 55, employee: 0.20, employer: 0.17 },
      { maxAge: 60, employee: 0.15, employer: 0.15 },
      { maxAge: 65, employee: 0.095, employer: 0.115 },
      { maxAge: 70, employee: 0.07, employer: 0.09 },
      { maxAge: Infinity, employee: 0.05, employer: 0.075 },
    ] },
];

/**
 * Additional Wage ceiling: $102,000 less the Ordinary Wages that attracted CPF
 * over the calendar year. Applied per employer per year.
 *
 * Note what Additional Wage IS: bonuses, annual leave encashment, incentive
 * payments — anything not granted wholly and exclusively for that month. Salary
 * above the OW ceiling is NOT Additional Wage; it simply attracts no CPF. The
 * previous code got this backwards and charged the employer 8% on it.
 */
export const AW_ANNUAL_CEILING = 102000;

/** Below this, no CPF at all. */
const TW_NO_CPF = 50;
/** Up to this, employer share only. */
const TW_EMPLOYER_ONLY = 500;
/** Between EMPLOYER_ONLY and this, the employee share phases in. */
const TW_PHASE_IN_TOP = 750;

export interface CPFBreakdown {
  ordinaryWage: number;
  additionalWage: number;
  employeeTotal: number;
  employerTotal: number;
  /** What was applied, so a payslip can be reproduced years later. */
  rateEmployee: number;
  rateEmployer: number;
  owCeiling: number;
  ageBand: string;
  cpfStatus: string;
  /** Set when no CPF is due, explaining why. */
  note?: string;
}

export function getCPFRateTable(period: string): CPFRateTable {
  const table = CPF_RATE_TABLES.find(t => t.from <= period);
  if (!table) {
    // Older than anything we hold: refuse rather than apply modern rates.
    throw new Error(
      `No CPF rate table for ${period}. Add the rates for that period before running payroll for it.`
    );
  }
  return table;
}

/** Age on the last day of the payroll month, which is how CPF bands are read. */
export function ageAtPeriod(dateOfBirth: string | Date, period: string): number {
  const dob = dateOfBirth instanceof Date ? dateOfBirth : parseDateOnly(String(dateOfBirth));
  const [y, m] = period.split('-').map(Number);
  const asOf = new Date(y, m, 0); // last day of that month
  let age = asOf.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    asOf.getMonth() < dob.getMonth() ||
    (asOf.getMonth() === dob.getMonth() && asOf.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function bandLabel(band: CPFRateBand, bands: CPFRateBand[]): string {
  const i = bands.indexOf(band);
  if (i === 0) return `${band.maxAge} and below`;
  const lower = bands[i - 1].maxAge;
  return band.maxAge === Infinity ? `above ${lower}` : `above ${lower} to ${band.maxAge}`;
}

export interface CPFInput {
  /** Wages granted wholly and exclusively for this month. */
  ordinaryWage: number;
  /** Bonuses and other non-monthly payments made this month. */
  additionalWage?: number;
  /** Ordinary Wages that already attracted CPF earlier this calendar year. */
  ordinaryWageYearToDate?: number;
  dateOfBirth: string | Date | null;
  cpfStatus: string | null;
  /** YYYY-MM — selects the rate table in force. */
  period: string;
}

/**
 * NOT TAX OR LEGAL ADVICE. This implements the standard private-sector rates
 * for Singapore Citizens and third-year-onwards SPRs, plus the wage bands. It
 * does NOT implement: the graduated first/second-year SPR tables, the allocation
 * across Ordinary/Special/MediSave accounts (that is CPF Board's split, and not
 * a required payslip item under MOM's rules), or the phased employee rate for
 * senior workers earning $500–$750. Where it cannot be certain, it refuses.
 * Have a payroll practitioner check this against the CPF Board tables before
 * you file.
 */
export function calculateCPF(input: CPFInput): CPFBreakdown {
  const table = getCPFRateTable(input.period);
  const ow = Math.max(0, Number(input.ordinaryWage) || 0);
  const aw = Math.max(0, Number(input.additionalWage) || 0);
  const status = input.cpfStatus || 'unknown';

  const empty = (note: string, rateE = 0, rateR = 0, age = -1, label = 'n/a'): CPFBreakdown => ({
    ordinaryWage: 0,
    additionalWage: 0,
    employeeTotal: 0,
    employerTotal: 0,
    rateEmployee: rateE,
    rateEmployer: rateR,
    owCeiling: table.owCeiling,
    ageBand: label,
    cpfStatus: status,
    note,
  });

  if (status === 'foreigner') {
    return empty('Work pass holders do not attract CPF. Levy applies instead, which this system does not compute.');
  }
  if (status === 'pr_year_1' || status === 'pr_year_2') {
    throw new Error(
      `CPF for ${status.replace('_', ' ')} uses the graduated SPR tables, which are not implemented. ` +
      'Compute this employee manually or set them to full rates once they reach their third year.'
    );
  }
  if (status !== 'citizen') {
    throw new Error(
      'CPF status is not set for this employee (citizen / PR year 1 / PR year 2 / foreigner). ' +
      'Set it before running payroll — guessing would either underpay CPF or charge a foreigner CPF they do not owe.'
    );
  }
  if (!input.dateOfBirth) {
    throw new Error(
      'Date of birth is not set for this employee. CPF rates are banded by age, so it cannot be computed without one.'
    );
  }

  const age = ageAtPeriod(input.dateOfBirth, input.period);
  const band = table.bands.find(bnd => age <= bnd.maxAge) || table.bands[table.bands.length - 1];
  const label = bandLabel(band, table.bands);

  const totalWages = ow + aw;
  if (totalWages <= TW_NO_CPF) {
    return empty('Total wages of $50 or less attract no CPF.', 0, 0, age, label);
  }

  // OW above the ceiling attracts nothing. It is not Additional Wage.
  const owForCpf = Math.min(ow, table.owCeiling);
  // AW ceiling is annual: $102,000 less the OW that has already attracted CPF.
  const owYtd = Math.max(0, Number(input.ordinaryWageYearToDate) || 0);
  const awHeadroom = Math.max(0, AW_ANNUAL_CEILING - (owYtd + owForCpf));
  const awForCpf = Math.min(aw, awHeadroom);
  const wagesForCpf = owForCpf + awForCpf;

  let employeeRate = band.employee;
  if (totalWages <= TW_EMPLOYER_ONLY) {
    // Employer share only.
    employeeRate = 0;
  } else if (totalWages <= TW_PHASE_IN_TOP) {
    // The employee share phases in across this band on a table that varies by
    // age. Refusing beats applying the full rate and over-deducting from the
    // lowest-paid people on the payroll.
    throw new Error(
      `Total wages of $${totalWages.toFixed(2)} fall in the $500–$750 band, where the employee ` +
      'CPF share is phased in on a separate CPF Board table that is not implemented. ' +
      'Compute this employee manually.'
    );
  }

  const employeeTotal = round2(wagesForCpf * employeeRate);
  const employerTotal = round2(wagesForCpf * band.employer);

  return {
    ordinaryWage: round2(owForCpf),
    additionalWage: round2(awForCpf),
    employeeTotal,
    employerTotal,
    rateEmployee: employeeRate,
    rateEmployer: band.employer,
    owCeiling: table.owCeiling,
    ageBand: label,
    cpfStatus: status,
  };
}

/**
 * IRAS resident bands, applied to annualised pay less employee CPF.
 *
 * This is a PROJECTION, not a withholding. Singapore has no PAYE — an employer
 * does not deduct income tax from monthly salary, the employee is assessed and
 * pays IRAS directly. The old browser-side payroll subtracted this figure from
 * net pay, which would have underpaid every staff member by the projected tax.
 * Net pay here is gross less CPF and leave deductions only; the tax number is
 * carried on the payslip for the employee's own planning.
 */
export function calculateTax(monthlyGross: number, monthlyCPF: number): TaxBreakdown {
  const annualGross = monthlyGross * 12;
  const annualCPFDeduction = monthlyCPF * 12;
  const taxableIncome = Math.max(annualGross - annualCPFDeduction, 0);

  let annualTax = 0;
  let taxRate = 0;

  if (taxableIncome <= 20000) {
    annualTax = 0;
  } else if (taxableIncome <= 30000) {
    annualTax = (taxableIncome - 20000) * 0.02;
    taxRate = 2;
  } else if (taxableIncome <= 40000) {
    annualTax = 200 + (taxableIncome - 30000) * 0.035;
    taxRate = 3.5;
  } else if (taxableIncome <= 80000) {
    annualTax = 550 + (taxableIncome - 40000) * 0.07;
    taxRate = 7;
  } else if (taxableIncome <= 120000) {
    annualTax = 3350 + (taxableIncome - 80000) * 0.115;
    taxRate = 11.5;
  } else if (taxableIncome <= 160000) {
    annualTax = 7950 + (taxableIncome - 120000) * 0.15;
    taxRate = 15;
  } else if (taxableIncome <= 200000) {
    annualTax = 13950 + (taxableIncome - 160000) * 0.18;
    taxRate = 18;
  } else if (taxableIncome <= 240000) {
    annualTax = 21150 + (taxableIncome - 200000) * 0.19;
    taxRate = 19;
  } else if (taxableIncome <= 280000) {
    annualTax = 28750 + (taxableIncome - 240000) * 0.195;
    taxRate = 19.5;
  } else if (taxableIncome <= 320000) {
    annualTax = 36550 + (taxableIncome - 280000) * 0.2;
    taxRate = 20;
  } else if (taxableIncome <= 500000) {
    annualTax = 44550 + (taxableIncome - 320000) * 0.22;
    taxRate = 22;
  } else if (taxableIncome <= 1000000) {
    annualTax = 84150 + (taxableIncome - 500000) * 0.23;
    taxRate = 23;
  } else {
    annualTax = 199150 + (taxableIncome - 1000000) * 0.24;
    taxRate = 24;
  }

  return {
    annualGross: round2(annualGross),
    monthlyGross: round2(monthlyGross),
    annualCPFDeduction: round2(annualCPFDeduction),
    taxableIncome: round2(taxableIncome),
    monthlyTax: round2(annualTax / 12),
    annualTax: round2(annualTax),
    taxRate,
  };
}

export { round2 };

// ---------------------------------------------------------------------------
// Daily rate of pay
// ---------------------------------------------------------------------------

/** Days an employee is required to work in a week. Change if you move off a 5-day week. */
export const WORKING_DAYS_PER_WEEK = 5;

/**
 * Daily gross rate of pay for a monthly-rated employee, per the Employment Act:
 *
 *     (12 × monthly gross rate of pay) / (52 × days required to work in a week)
 *
 * The deduction was previously base salary ÷ 22 — a rounder number than the Act
 * uses, and it ignored allowances entirely.
 *
 * What counts as the "gross rate of pay" matters and is not all of someone's
 * pay. The Act excludes from it: overtime, bonus and AWS, productivity
 * incentives, reimbursement of expenses incurred in the course of employment,
 * and — specifically — TRAVELLING, FOOD AND HOUSING ALLOWANCES. So the
 * transport and housing allowances this system tracks are correctly left out,
 * while any other fixed allowance is included.
 *
 * Not legal advice: whether a given "other allowance" belongs in the gross rate
 * is a question about that allowance, and worth checking with an accountant.
 */
export function grossRateOfPay(baseSalary: number, otherAllowances = 0): number {
  return round2(Number(baseSalary || 0) + Number(otherAllowances || 0));
}

export function dailyGrossRate(baseSalary: number, otherAllowances = 0): number {
  const monthly = grossRateOfPay(baseSalary, otherAllowances);
  return round2((12 * monthly) / (52 * WORKING_DAYS_PER_WEEK));
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/**
 * A Postgres DATE has no timezone, but node-postgres hands it back as a JS Date
 * at local midnight. Calling toISOString() on that shifts it a day backwards
 * anywhere east of UTC — in Singapore every date came out one day early. Format
 * from the local parts instead.
 */
export function dateOnly(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses YYYY-MM-DD as a LOCAL calendar date. `new Date('2026-07-01')` parses
 *  as UTC midnight, which is the previous day once rendered locally. */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const DATE_ONLY_COLUMNS = new Set([
  'entry_date', 'received_date', 'paid_date', 'start_date', 'end_date',
  'next_due_date', 'last_processed_date', 'recon_date', 'claim_date',
  'receipt_extracted_date', 'invoice_date', 'due_date', 'payment_date',
  'hire_date', 'value_date',
]);

/** Renders every DATE column in a result set as YYYY-MM-DD before it is sent. */
export function normaliseDates<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map((row) => {
    const out: Record<string, any> = { ...row };
    for (const key of Object.keys(out)) {
      if (DATE_ONLY_COLUMNS.has(key) && out[key] instanceof Date) {
        out[key] = dateOnly(out[key]);
      }
    }
    return out as T;
  });
}

// ---------------------------------------------------------------------------
// Recurring expenses
// ---------------------------------------------------------------------------

export function advanceDueDate(from: Date, frequency: string): Date {
  const d = new Date(from);
  switch (frequency) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'annual': d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1);
  }
  return d;
}

/** Local-calendar YYYY-MM-DD. See dateOnly for why toISOString is wrong here. */
const iso = (d: Date) => dateOnly(d) as string;

/**
 * Materialise every approved, active recurring rule that has fallen due into a
 * real expense row. Idempotent: the due date only moves forward once a row has
 * been written, so calling it twice in a day creates nothing the second time.
 */
export async function runDueRecurringExpenses(userId: number | null): Promise<number> {
  const due = await db.query(
    `SELECT * FROM finance_recurring_expenses
      WHERE is_active AND approval_status = 'approved'
        AND next_due_date <= CURRENT_DATE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)`
  );

  let created = 0;
  for (const r of due.rows) {
    // Catch up if a rule has been due for several periods.
    let next = new Date(r.next_due_date);
    const today = new Date(iso(new Date()));
    let guard = 0;
    while (next <= today && guard < 400) {
      if (r.end_date && next > new Date(r.end_date)) break;
      const gstAmount = 0;
      const ins = await db.query(
        `INSERT INTO finance_expenses
           (entry_date, amount, category, vendor, description, department, tags,
            approval_status, approved_by, approval_date, gst_amount, source, recurring_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'recurring',$12,$13)
         RETURNING id`,
        [
          iso(next), r.amount, r.category, r.vendor,
          `${r.name}${r.description ? ' — ' + r.description : ''}`,
          r.department, ['recurring'],
          r.auto_approve ? 'approved' : 'pending',
          r.auto_approve ? userId : null,
          r.auto_approve ? new Date() : null,
          gstAmount, r.id, userId,
        ]
      );
      if (ins.rows[0]) created += 1;
      next = advanceDueDate(next, r.frequency);
      guard += 1;
    }

    await db.query(
      `UPDATE finance_recurring_expenses
          SET next_due_date = $1, last_processed_date = CURRENT_DATE, updated_at = NOW()
        WHERE id = $2`,
      [iso(next), r.id]
    );
  }

  return created;
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

export interface LedgerRow {
  id: string;
  date: string;
  type: 'income' | 'expense';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  category: string;
  reference: string;
}

/**
 * A double-sided view of the cash movements. Income debits cash, expenses
 * credit it; the running balance is computed in date order so the last row is
 * the cash on hand, and ties to the balance sheet. Only realised money counts —
 * unreceived invoices and unpaid expenses are not here, they sit in AR/AP.
 */
export async function buildLedger(from?: string, to?: string): Promise<LedgerRow[]> {
  /**
   * Default the upper bound to today. Without it a payroll run posted for a
   * future month appeared in the running balance as money already spent, so the
   * ledger's closing balance disagreed with the cash line on the balance sheet
   * (which is always "as of" a date). Pass `to` explicitly to look further out.
   */
  const upperBound = to || iso(new Date());
  to = upperBound;

  const params: unknown[] = [];
  const dateFilter = (col: string) => {
    let s = '';
    if (from) { params.push(from); s += ` AND ${col} >= $${params.length}`; }
    if (to) { params.push(to); s += ` AND ${col} <= $${params.length}`; }
    return s;
  };

  const incomeSql = `SELECT id, entry_date, amount, source AS category,
                            COALESCE(description, source) AS description,
                            COALESCE(invoice_no, reference, '') AS reference
                       FROM finance_income
                      WHERE payment_status = 'received'${dateFilter('entry_date')}`;
  const incomeRows = (await db.query(incomeSql, params)).rows;

  const params2: unknown[] = [];
  const dateFilter2 = (col: string) => {
    let s = '';
    if (from) { params2.push(from); s += ` AND ${col} >= $${params2.length}`; }
    if (to) { params2.push(to); s += ` AND ${col} <= $${params2.length}`; }
    return s;
  };
  /**
   * PAID expenses only. The ledger is a cash book — its running balance is the
   * money on hand — but it was including approved-but-unpaid expenses, so its
   * closing balance disagreed with the cash line on the balance sheet by the
   * value of everything still owed. Unpaid approved expenses are a payable, and
   * that is where the balance sheet reports them.
   */
  const expenseSql = `SELECT id, entry_date, amount, category,
                             COALESCE(description, category) AS description,
                             COALESCE(receipt_no, vendor, '') AS reference
                        FROM finance_expenses
                       WHERE approval_status = 'approved' AND paid${dateFilter2('entry_date')}`;
  const expenseRows = (await db.query(expenseSql, params2)).rows;

  const combined = [
    ...incomeRows.map((r: any) => ({
      id: `inc_${r.id}`,
      date: dateOnly(r.entry_date) as string,
      type: 'income' as const,
      description: r.description,
      debit: Number(r.amount),
      credit: 0,
      category: r.category,
      reference: r.reference,
    })),
    ...expenseRows.map((r: any) => ({
      id: `exp_${r.id}`,
      date: dateOnly(r.entry_date) as string,
      type: 'expense' as const,
      description: r.description,
      debit: 0,
      credit: Number(r.amount),
      category: r.category,
      reference: r.reference,
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));

  let balance = 0;
  return combined.map((row) => {
    balance = round2(balance + row.debit - row.credit);
    return { ...row, balance };
  });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

/** Buckets an expense category into the P&L lines the report screen renders. */
function plBucket(category: string): 'salaries' | 'cpfEmployer' | 'officeSupplies' | 'utilities' | 'travel' | 'marketing' | 'other' {
  const c = (category || '').toLowerCase();
  if (c.includes('salar') || c.includes('payroll') || c.includes('wage')) return 'salaries';
  if (c.includes('cpf')) return 'cpfEmployer';
  if (c.includes('office') || c.includes('supplies') || c.includes('stationery')) return 'officeSupplies';
  if (c.includes('utilit') || c.includes('electric') || c.includes('water') || c.includes('internet')) return 'utilities';
  if (c.includes('travel') || c.includes('transport') || c.includes('taxi') || c.includes('flight')) return 'travel';
  if (c.includes('marketing') || c.includes('advertis') || c.includes('campaign')) return 'marketing';
  return 'other';
}

function revenueBucket(source: string): 'serviceRevenue' | 'productSales' | 'otherRevenue' {
  const s = (source || '').toLowerCase();
  if (s.includes('service') || s.includes('consult') || s.includes('commission') || s.includes('subscription')) return 'serviceRevenue';
  if (s.includes('product') || s.includes('sale') || s.includes('licen')) return 'productSales';
  return 'otherRevenue';
}

/** period is YYYY-MM. */
function periodBounds(period: string) {
  const [y, m] = period.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { start: iso(start), end: iso(end) };
}

export async function buildProfitAndLoss(period: string) {
  const { start, end } = periodBounds(period);

  const inc = await db.query(
    `SELECT source, SUM(amount) AS total FROM finance_income
      WHERE entry_date BETWEEN $1 AND $2 GROUP BY source`,
    [start, end]
  );
  /**
   * Payroll-sourced expense rows are excluded here and the payroll figures are
   * taken from the run instead. Posting a run writes ONE expense row covering
   * wages and employer CPF together; bucketing it by category put the whole
   * amount on the salaries line and then added employer CPF again from the run,
   * double counting it. Reading payroll from the run keeps one source of truth.
   */
  const exp = await db.query(
    `SELECT category, SUM(amount) AS total FROM finance_expenses
      WHERE approval_status = 'approved' AND source <> 'payroll'
        AND entry_date BETWEEN $1 AND $2
      GROUP BY category`,
    [start, end]
  );
  const payroll = await db.query(
    `SELECT total_gross, total_cpf_employer, total_leave_deduction
       FROM payroll_runs WHERE period = $1`,
    [period]
  );

  const revenue = { serviceRevenue: 0, productSales: 0, otherRevenue: 0, totalRevenue: 0 };
  for (const r of inc.rows) revenue[revenueBucket(r.source)] += Number(r.total);
  revenue.totalRevenue = round2(revenue.serviceRevenue + revenue.productSales + revenue.otherRevenue);
  revenue.serviceRevenue = round2(revenue.serviceRevenue);
  revenue.productSales = round2(revenue.productSales);
  revenue.otherRevenue = round2(revenue.otherRevenue);

  const expenses = {
    salaries: 0, cpfEmployer: 0, officeSupplies: 0, utilities: 0,
    travel: 0, marketing: 0, other: 0, totalExpenses: 0,
  };
  for (const r of exp.rows) expenses[plBucket(r.category)] += Number(r.total);

  /**
   * A generated payroll run is a real cost of the period even before it is
   * posted to the GL as an expense row — but count it once, not twice.
   *
   * The salary line is gross LESS unpaid leave: wages the employee did not earn
   * are not an expense, and reporting the gross here would disagree with both
   * the payslips and the journal the GL posting writes.
   */
  const run = payroll.rows[0];
  if (run) {
    expenses.salaries += Number(run.total_gross) - Number(run.total_leave_deduction || 0);
    expenses.cpfEmployer += Number(run.total_cpf_employer);
  }

  for (const k of Object.keys(expenses) as (keyof typeof expenses)[]) expenses[k] = round2(expenses[k]);
  expenses.totalExpenses = round2(
    expenses.salaries + expenses.cpfEmployer + expenses.officeSupplies +
    expenses.utilities + expenses.travel + expenses.marketing + expenses.other
  );

  return {
    period,
    revenue,
    expenses,
    netProfitLoss: round2(revenue.totalRevenue - expenses.totalExpenses),
  };
}

/**
 * A cash-basis balance sheet derived from the same rows. We do not track fixed
 * assets or paid-in capital, so those lines are reported as zero rather than
 * invented — the sheet balances because equity is the residual.
 */
export async function buildBalanceSheet(asOf: string) {
  const cashRow = await db.query(
    `SELECT
       COALESCE((SELECT SUM(amount) FROM finance_income
                  WHERE payment_status = 'received' AND entry_date <= $1), 0) AS received,
       COALESCE((SELECT SUM(amount) FROM finance_expenses
                  WHERE approval_status = 'approved' AND paid AND entry_date <= $1), 0) AS paid`,
    [asOf]
  );
  const ar = await db.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM finance_income
      WHERE payment_status IN ('pending','overdue') AND entry_date <= $1`,
    [asOf]
  );
  const ap = await db.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM finance_expenses
      WHERE approval_status = 'approved' AND NOT paid AND entry_date <= $1`,
    [asOf]
  );
  /**
   * An AP invoice raised from a claim is the SAME obligation as the claim, so
   * counting both would overstate payables. Open claims are counted only when
   * no live AP invoice already stands for them, and the AP invoices are counted
   * separately — previously AP invoices were not in the balance sheet at all.
   */
  const claims = await db.query(
    `SELECT COALESCE(SUM(c.amount),0) AS total FROM finance_expense_claims c
      WHERE c.status IN ('submitted','manager-approved','accounts-reviewed')
        AND c.claim_date <= $1
        AND NOT EXISTS (
          SELECT 1 FROM finance_ap_invoices i
           WHERE i.claim_id = c.id AND i.status IN ('pending','approved')
        )`,
    [asOf]
  );
  const apInvoices = await db.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM finance_ap_invoices
      WHERE status IN ('pending','approved') AND invoice_date <= $1`,
    [asOf]
  );
  const payrollAccrual = await db.query(
    `SELECT COALESCE(SUM(total_net),0) AS net, COALESCE(SUM(total_cpf_employee + total_cpf_employer),0) AS cpf,
            COALESCE(SUM(total_tax),0) AS tax
       FROM payroll_runs
      WHERE status = 'generated' AND (period || '-01')::date <= $1`,
    [asOf]
  );

  const cash = round2(Number(cashRow.rows[0].received) - Number(cashRow.rows[0].paid));
  const accountsReceivable = round2(Number(ar.rows[0].total));
  const assets = {
    cash,
    accountsReceivable,
    equipment: 0, // not tracked — no fixed-asset register in this module
    totalAssets: round2(cash + accountsReceivable),
  };

  const accountsPayable = round2(
    Number(ap.rows[0].total) + Number(claims.rows[0].total) + Number(apInvoices.rows[0].total)
  );
  const salaryAccrual = round2(Number(payrollAccrual.rows[0].net));
  const cpfPayable = round2(Number(payrollAccrual.rows[0].cpf));
  const taxesOwed = round2(Number(payrollAccrual.rows[0].tax));
  const liabilities = {
    accountsPayable,
    salaryAccrual,
    taxesOwed,
    cpfPayable,
    totalLiabilities: round2(accountsPayable + salaryAccrual + taxesOwed + cpfPayable),
  };

  const retainedEarnings = round2(assets.totalAssets - liabilities.totalLiabilities);
  return {
    asOfDate: asOf,
    assets,
    liabilities,
    equity: {
      capitalContributed: 0, // not tracked
      retainedEarnings,
      totalEquity: retainedEarnings,
    },
  };
}

export async function buildCashFlow(period: string) {
  const { start, end } = periodBounds(period);
  const dayBefore = iso(addDays(parseDateOnly(start), -1));

  const opening = await db.query(
    `SELECT
       COALESCE((SELECT SUM(amount) FROM finance_income
                  WHERE payment_status = 'received' AND entry_date <= $1), 0)
     - COALESCE((SELECT SUM(amount) FROM finance_expenses
                  WHERE approval_status = 'approved' AND paid AND entry_date <= $1), 0) AS bal`,
    [dayBefore]
  );

  const inflow = await db.query(
    `SELECT source, COALESCE(SUM(amount),0) AS total FROM finance_income
      WHERE payment_status = 'received' AND entry_date BETWEEN $1 AND $2
      GROUP BY source`,
    [start, end]
  );
  // Payroll comes from the run, not from the expense row it posts — see the
  // note in buildProfitAndLoss.
  const outflow = await db.query(
    `SELECT category, COALESCE(SUM(amount),0) AS total FROM finance_expenses
      WHERE approval_status = 'approved' AND paid AND source <> 'payroll'
        AND entry_date BETWEEN $1 AND $2
      GROUP BY category`,
    [start, end]
  );
  const payroll = await db.query(
    `SELECT total_net, total_cpf_employee, total_cpf_employer, total_tax
       FROM payroll_runs WHERE period = $1 AND status = 'posted'`,
    [period]
  );
  // Cash out for payroll is what actually left: net pay plus the CPF remitted.


  let revenueReceived = 0;
  let otherInflows = 0;
  for (const r of inflow.rows) {
    if (revenueBucket(r.source) === 'otherRevenue') otherInflows += Number(r.total);
    else revenueReceived += Number(r.total);
  }

  const outflows = {
    salariesPaid: 0, cpfRemittance: 0, taxesPaid: 0,
    operatingExpenses: 0, capitalExpenditure: 0, totalOutflows: 0,
  };
  for (const r of outflow.rows) {
    const b = plBucket(r.category);
    if (b === 'salaries') outflows.salariesPaid += Number(r.total);
    else if (b === 'cpfEmployer') outflows.cpfRemittance += Number(r.total);
    else outflows.operatingExpenses += Number(r.total);
  }
  const run = payroll.rows[0];
  if (run) {
    outflows.salariesPaid += Number(run.total_net);
    outflows.cpfRemittance += Number(run.total_cpf_employee) + Number(run.total_cpf_employer);
    // Income tax is not withheld, so no tax leaves the company with payroll.
  }

  for (const k of Object.keys(outflows) as (keyof typeof outflows)[]) outflows[k] = round2(outflows[k]);
  outflows.totalOutflows = round2(
    outflows.salariesPaid + outflows.cpfRemittance + outflows.taxesPaid +
    outflows.operatingExpenses + outflows.capitalExpenditure
  );

  const inflows = {
    revenueReceived: round2(revenueReceived),
    otherInflows: round2(otherInflows),
    totalInflows: round2(revenueReceived + otherInflows),
  };

  const openingBalance = round2(Number(opening.rows[0].bal));
  const closingBalance = round2(openingBalance + inflows.totalInflows - outflows.totalOutflows);

  /**
   * Runway in MONTHS — the unit the screen labels these with. Each figure uses
   * the average monthly burn over a different trailing window, so a one-off
   * large payment in the latest month does not dominate the longer views.
   * Infinity is not useful on a dashboard: with no burn at all we report 0
   * months of burn history rather than a number that looks like a forecast.
   */
  const burn = await db.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE entry_date > $1::date - INTERVAL '1 month'), 0) AS m1,
       COALESCE(SUM(amount) FILTER (WHERE entry_date > $1::date - INTERVAL '2 months'), 0) AS m2,
       COALESCE(SUM(amount) FILTER (WHERE entry_date > $1::date - INTERVAL '3 months'), 0) AS m3
     FROM finance_expenses
     WHERE approval_status = 'approved' AND paid AND entry_date <= $1`,
    [end]
  );
  const b = burn.rows[0];
  const monthsOfRunway = (total: unknown, months: number) => {
    const monthlyBurn = Number(total) / months;
    // null, not 0 or Infinity: with no spend there is no burn rate to divide by,
    // and "0 months of runway" would read as an emergency rather than "unknown".
    if (!(monthlyBurn > 0)) return null;
    if (closingBalance <= 0) return 0;
    return round2(closingBalance / monthlyBurn);
  };

  return {
    period,
    openingBalance,
    inflows,
    outflows,
    closingBalance,
    // Months of cash at the burn rate over the trailing 1 / 2 / 3 months.
    runway30Day: monthsOfRunway(b.m1, 1),
    runway60Day: monthsOfRunway(b.m2, 2),
    runway90Day: monthsOfRunway(b.m3, 3),
  };
}
