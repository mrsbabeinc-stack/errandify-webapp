import express, { Request, Response } from 'express';
import db from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { normaliseDates, round2, dateOnly } from '../services/financeService.js';

/**
 * An employee's own payslips.
 *
 * Every payslip endpoint until now sat behind requireAdmin, so the only way for
 * someone to see their own pay was to ask an administrator to send it — which
 * means an administrator handling everyone's salary details by hand, and no
 * record that a payslip was ever issued. MOM requires employees to be given an
 * itemised payslip within three working days of payment; this lets them fetch
 * their own.
 *
 * Scoping is the whole security model here: every query resolves the caller to
 * ONE staff_id via staff.user_id and filters on it. Nothing accepts a staff id
 * from the request — otherwise anyone could read a colleague's pay by changing
 * a number in the URL.
 */

const router = express.Router();

router.use(authMiddleware as unknown as express.RequestHandler);

/**
 * Resolves the logged-in user to their employee record. Deliberately does not
 * fall back to matching on email: `staff.email` has no uniqueness constraint,
 * and a near-match would show one person another person's salary.
 */
async function resolveStaff(userId: string | undefined) {
  if (!userId) return null;
  const result = await db.query(
    `SELECT staff_id, first_name, last_name FROM staff WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

/** First and last day of the salary period — MOM item 5. */
const periodBounds = (period: string) => {
  const [y, m] = String(period || '').split('-').map(Number);
  if (!y || !m) return { start: '', end: '' };
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
  return { start: fmt(new Date(y, m - 1, 1)), end: fmt(new Date(y, m, 0)) };
};

/** "2026-11" -> "November 2026", for a document a person reads. */
const monthLabel = (period: string): string => {
  const [y, m] = String(period || '').split('-').map(Number);
  if (!y || !m) return String(period || '');
  return new Date(y, m - 1, 1).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
};

const NOT_LINKED = {
  success: false,
  error:
    'Your account is not linked to an employee record yet. Ask HR to link it, and your payslips will appear here.',
};

/**
 * Only runs that have actually been PAID are visible.
 *
 * A generated-but-unposted run is a draft — it can still be regenerated, and
 * the figures can change. Showing someone a number that later moves is worse
 * than showing nothing, particularly for pay.
 */
const PAID_ONLY = `
  JOIN payroll_runs r ON r.id = i.payroll_run_id
  LEFT JOIN payroll_payment_batches b
         ON b.payroll_run_id = r.id AND b.status = 'settled'
`;

router.get('/me/payslips', async (req: Request, res: Response) => {
  try {
    const staff = await resolveStaff((req as unknown as AuthRequest).userId);
    if (!staff) return res.status(403).json(NOT_LINKED);

    const result = await db.query(
      `SELECT i.id, r.period, r.payment_date, i.gross_salary, i.cpf_employee,
              i.leave_deduction, i.total_deductions, i.net_salary, i.status,
              b.settled_at, b.bank_reference IS NOT NULL AS paid
         FROM payroll_items i
         ${PAID_ONLY}
        WHERE i.staff_id = $1 AND i.status = 'paid'
        ORDER BY r.period DESC`,
      [staff.staff_id]
    );
    res.json({
      success: true,
      staff_name: `${staff.first_name} ${staff.last_name}`,
      payslips: normaliseDates(result.rows),
    });
  } catch (err) {
    console.error('[payslips] list failed:', err);
    res.status(500).json({ success: false, error: 'Could not load your payslips' });
  }
});

/** One payslip, itemised as MOM requires. */
router.get('/me/payslips/:id', async (req: Request, res: Response) => {
  try {
    const staff = await resolveStaff((req as unknown as AuthRequest).userId);
    if (!staff) return res.status(403).json(NOT_LINKED);

    const result = await db.query(
      `SELECT i.*, r.period, r.payment_date
         FROM payroll_items i
         ${PAID_ONLY}
        WHERE i.id = $1 AND i.staff_id = $2 AND i.status = 'paid'`,
      [req.params.id, staff.staff_id]
    );
    const p = result.rows[0];
    // Same answer whether the payslip belongs to someone else or does not
    // exist — no probing for colleagues' payslip ids.
    if (!p) return res.status(404).json({ success: false, error: 'Payslip not found' });

    res.json({ success: true, payslip: normaliseDates([p])[0] });
  } catch (err) {
    console.error('[payslips] get failed:', err);
    res.status(500).json({ success: false, error: 'Could not load that payslip' });
  }
});

/**
 * Downloadable itemised payslip. MOM's required items: basic salary, allowances,
 * deductions, net pay, the employer's CPF contribution, dates and period.
 */
router.get('/me/payslips/:id/download', async (req: Request, res: Response) => {
  try {
    const staff = await resolveStaff((req as unknown as AuthRequest).userId);
    if (!staff) return res.status(403).json(NOT_LINKED);

    const result = await db.query(
      `SELECT i.*, r.period, r.payment_date
         FROM payroll_items i
         ${PAID_ONLY}
        WHERE i.id = $1 AND i.staff_id = $2 AND i.status = 'paid'`,
      [req.params.id, staff.staff_id]
    );
    const p = result.rows[0];
    if (!p) return res.status(404).json({ success: false, error: 'Payslip not found' });

    const employer = (await db.query(`SELECT * FROM employer_profile WHERE id = 1`)).rows[0] || {};
    const bounds = periodBounds(p.period);
    const money = (v: unknown) => round2(Number(v) || 0).toFixed(2);

    /**
     * Ordered to MOM's twelve required items for an itemised payslip.
     * Items 9–11 (overtime hours, overtime pay, overtime period) are required
     * WHEN APPLICABLE. This system does not record overtime at all, so the line
     * says so rather than printing a zero that would read as "none worked".
     */
    const rows: (string | number)[][] = [
      ['Employer', employer.legal_name || '(employer name not set — required by MOM)'],
      ...(employer.uen ? [['UEN', employer.uen]] : []),
      ['Employee', `${p.staff_name} (${p.staff_id})`],
      ['Salary period', `${bounds.start} to ${bounds.end}`],
      ['Date of payment', dateOnly(p.payment_date) || ''],
      [],
      ['Earnings', 'SGD'],
      ['Basic salary', money(p.base_salary)],
      ['Transport allowance', money(p.transport_allowance)],
      ['Housing allowance', money(p.housing_allowance)],
      ['Other allowances', money(p.other_allowances)],
      ['Gross pay', money(p.gross_salary)],
      [],
      ['Deductions', 'SGD'],
      ['CPF (your contribution)', money(p.cpf_employee)],
      ['Unpaid leave', money(p.leave_deduction)],
      ['Total deductions', money(p.total_deductions)],
      [],
      ['NET PAY', money(p.net_salary)],
      [],
      ['Overtime hours worked', 'not recorded by this system'],
      ['Overtime pay', 'not recorded by this system'],
      [],
      ['Paid by your employer, not deducted from your pay', 'SGD'],
      ["Employer's CPF contribution", money(p.cpf_employer)],
      [],
      [
        'Note',
        'Singapore has no monthly tax withholding. Any income tax is assessed by IRAS and paid by you directly.',
      ],
    ];
    if (p.cpf_rate_employee != null) {
      rows.push([
        'CPF rate applied',
        `${(Number(p.cpf_rate_employee) * 100).toFixed(1)}% employee / ${(Number(p.cpf_rate_employer) * 100).toFixed(1)}% employer` +
          (p.age_at_payroll != null ? ` (age ${p.age_at_payroll})` : ''),
      ]);
    }

    const esc = (v: string | number) => {
      const str = String(v ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const csv = rows.map(r => r.map(esc).join(',')).join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payslip-${p.staff_id}-${p.period}.csv"`
    );
    res.send(csv);
  } catch (err) {
    console.error('[payslips] download failed:', err);
    res.status(500).json({ success: false, error: 'Could not download that payslip' });
  }
});

export default router;
