import express, { Request, Response } from 'express';
import db from '../db.js';
import { AuthRequest, authMiddleware, requireAdmin } from '../middleware/auth.js';
import {
  calculateCPF,
  ageAtPeriod,
  calculateTax,
  round2,
  dailyGrossRate,
  WORKING_DAYS_PER_WEEK,
  dateOnly,
  parseDateOnly,
  addDays,
  normaliseDates,
  runDueRecurringExpenses,
  buildLedger,
  buildProfitAndLoss,
  buildBalanceSheet,
  buildCashFlow,
  GST_RATE,
} from '../services/financeService.js';

const router = express.Router();

/**
 * Accounts & Finance API.
 *
 * Guard at router level, not per handler, so a route added later cannot be
 * forgotten — same pattern as routes/rbac.ts and routes/staffManagement.ts.
 * Everything here is salary, banking and company financial data; only admins
 * get near it.
 */
// The casts are only to bridge AuthRequest, which the express types in this
// repo do not accept as a Request; the middleware itself is unchanged.
router.use(
  authMiddleware as unknown as express.RequestHandler,
  requireAdmin(['admin', 'super-admin']) as unknown as express.RequestHandler
);

const uid = (req: Request) => {
  const id = (req as unknown as AuthRequest).userId;
  return id ? parseInt(id, 10) : null;
};
const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
/** Local-calendar YYYY-MM-DD; toISOString() is a day early east of UTC. */
const iso = (d: Date) => dateOnly(d) as string;

/**
 * Working days inside a leave range: weekdays, less any gazetted holiday that
 * falls in it. Both sides of the leave→payroll flow use this one expression so
 * the preview and the saved deduction can never disagree.
 */
const WORKING_DAYS_SQL = `(
  SELECT COUNT(*) FROM generate_series(l.start_date, l.end_date, INTERVAL '1 day') g(d)
   WHERE EXTRACT(ISODOW FROM g.d) <= ${WORKING_DAYS_PER_WEEK}
     AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.date = g.d::date)
)`;

/**
 * Allowances that belong in the gross rate of pay. Travelling and housing
 * allowances are excluded by the Employment Act, so they are excluded here.
 */
const OTHER_ALLOWANCES_SQL = `COALESCE((
  SELECT SUM(a.amount) FROM staff_allowances a
   WHERE a.staff_salary_id = sal.id
     AND lower(a.name) NOT LIKE '%transport%'
     AND lower(a.name) NOT LIKE '%travel%'
     AND lower(a.name) NOT LIKE '%housing%'
     AND lower(a.name) NOT LIKE '%accommodat%'
     AND lower(a.name) NOT LIKE '%food%'
     AND lower(a.name) NOT LIKE '%meal%'
), 0)`;

/** Leave types that are unpaid. Anything else is already covered by salary. */
const isUnpaidLeave = (leaveType: unknown): boolean => {
  const t = String(leaveType || '').toLowerCase();
  return t.includes('unpaid') || t.includes('no-pay') || t.includes('no pay');
};

/** Turns a bad request into a 400 rather than a 500 from the DB. */
function bad(res: Response, message: string) {
  return res.status(400).json({ success: false, error: message });
}

// ===========================================================================
// Income
// ===========================================================================

router.get('/income', async (req: Request, res: Response) => {
  try {
    const { from, to, status } = req.query as Record<string, string>;
    const where: string[] = [];
    const params: unknown[] = [];
    if (from) { params.push(from); where.push(`entry_date >= $${params.length}`); }
    if (to) { params.push(to); where.push(`entry_date <= $${params.length}`); }
    if (status) { params.push(status); where.push(`payment_status = $${params.length}`); }
    const result = await db.query(
      `SELECT * FROM finance_income
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY entry_date DESC, id DESC`,
      params
    );
    res.json({ success: true, income: normaliseDates(result.rows) });
  } catch (err) {
    console.error('[finance] list income failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load income' });
  }
});

router.post('/income', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const amount = num(b.amount);
    if (!amount || amount <= 0) return bad(res, 'Amount must be greater than zero');
    if (!b.source) return bad(res, 'Source is required');

    const gstApplicable = !!b.gst_applicable;
    const gstAmount = gstApplicable ? round2(amount - amount / (1 + GST_RATE)) : 0;
    const status = ['pending', 'received', 'overdue'].includes(b.payment_status) ? b.payment_status : 'pending';

    const result = await db.query(
      `INSERT INTO finance_income
         (entry_date, amount, source, reference, invoice_no, description, notes,
          tags, gst_applicable, gst_amount, payment_status, received_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        b.entry_date || iso(new Date()), amount, b.source, b.reference || null,
        b.invoice_no || null, b.description || null, b.notes || null,
        Array.isArray(b.tags) ? b.tags : [],
        gstApplicable, gstAmount, status,
        status === 'received' ? (b.entry_date || iso(new Date())) : null,
        uid(req),
      ]
    );
    res.status(201).json({ success: true, income: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] create income failed:', err);
    res.status(500).json({ success: false, error: 'Failed to record income' });
  }
});

router.patch('/income/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body || {};
    if (!['pending', 'received', 'overdue'].includes(status)) return bad(res, 'Invalid payment status');
    const result = await db.query(
      `UPDATE finance_income
          SET payment_status = $1,
              received_date = CASE WHEN $1 = 'received' THEN COALESCE(received_date, CURRENT_DATE) ELSE NULL END,
              updated_at = NOW()
        WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Income entry not found' });
    res.json({ success: true, income: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] update income status failed:', err);
    res.status(500).json({ success: false, error: 'Failed to update income' });
  }
});

// ===========================================================================
// Expenses
// ===========================================================================

router.get('/expenses', async (req: Request, res: Response) => {
  try {
    const { from, to, status, department } = req.query as Record<string, string>;
    const where: string[] = [];
    const params: unknown[] = [];
    if (from) { params.push(from); where.push(`entry_date >= $${params.length}`); }
    if (to) { params.push(to); where.push(`entry_date <= $${params.length}`); }
    if (status) { params.push(status); where.push(`approval_status = $${params.length}`); }
    if (department) { params.push(department); where.push(`department = $${params.length}`); }
    const result = await db.query(
      `SELECT e.*, u.display_name AS approved_by_name
         FROM finance_expenses e
         LEFT JOIN users u ON u.id = e.approved_by
        ${where.length ? 'WHERE ' + where.map(w => 'e.' + w).join(' AND ') : ''}
        ORDER BY e.entry_date DESC, e.id DESC`,
      params
    );
    res.json({ success: true, expenses: normaliseDates(result.rows) });
  } catch (err) {
    console.error('[finance] list expenses failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load expenses' });
  }
});

router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const amount = num(b.amount);
    if (!amount || amount <= 0) return bad(res, 'Amount must be greater than zero');
    if (!b.category) return bad(res, 'Category is required');
    if (!b.vendor) return bad(res, 'Vendor is required');

    const gstApplicable = !!b.gst_applicable;
    const gstAmount = gstApplicable ? round2(amount - amount / (1 + GST_RATE)) : 0;

    const result = await db.query(
      `INSERT INTO finance_expenses
         (entry_date, amount, category, vendor, description, department, tags,
          gst_applicable, gst_amount, receipt_no, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        b.entry_date || iso(new Date()), amount, b.category, b.vendor,
        b.description || null, b.department || null,
        Array.isArray(b.tags) ? b.tags : [],
        gstApplicable, gstAmount, b.receipt_no || null, uid(req),
      ]
    );
    res.status(201).json({ success: true, expense: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] create expense failed:', err);
    res.status(500).json({ success: false, error: 'Failed to record expense' });
  }
});

router.patch('/expenses/:id/approve', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `UPDATE finance_expenses
          SET approval_status = 'approved', approved_by = $1, approval_date = NOW(),
              rejection_reason = NULL, updated_at = NOW()
        WHERE id = $2 AND approval_status = 'pending' RETURNING *`,
      [uid(req), req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(409).json({ success: false, error: 'Expense not found or already decided' });
    }
    res.json({ success: true, expense: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] approve expense failed:', err);
    res.status(500).json({ success: false, error: 'Failed to approve expense' });
  }
});

router.patch('/expenses/:id/reject', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `UPDATE finance_expenses
          SET approval_status = 'rejected', approved_by = $1, approval_date = NOW(),
              rejection_reason = $2, updated_at = NOW()
        WHERE id = $3 AND approval_status = 'pending' RETURNING *`,
      [uid(req), req.body?.reason || null, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(409).json({ success: false, error: 'Expense not found or already decided' });
    }
    res.json({ success: true, expense: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] reject expense failed:', err);
    res.status(500).json({ success: false, error: 'Failed to reject expense' });
  }
});

router.patch('/expenses/:id/paid', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `UPDATE finance_expenses
          SET paid = true, paid_date = COALESCE(paid_date, CURRENT_DATE), updated_at = NOW()
        WHERE id = $1 AND approval_status = 'approved' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(409).json({ success: false, error: 'Expense not found or not approved' });
    }
    res.json({ success: true, expense: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] mark expense paid failed:', err);
    res.status(500).json({ success: false, error: 'Failed to mark expense paid' });
  }
});

// ===========================================================================
// Recurring expenses
// ===========================================================================

router.get('/recurring', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT * FROM finance_recurring_expenses ORDER BY next_due_date ASC, id DESC`
    );
    res.json({ success: true, recurring: normaliseDates(result.rows) });
  } catch (err) {
    console.error('[finance] list recurring failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load recurring expenses' });
  }
});

router.post('/recurring', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const amount = num(b.amount);
    const frequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'];
    if (!b.name) return bad(res, 'Name is required');
    if (!amount || amount <= 0) return bad(res, 'Amount must be greater than zero');
    if (!b.category) return bad(res, 'Category is required');
    if (!frequencies.includes(b.frequency)) return bad(res, 'Invalid frequency');

    const startDate = b.start_date || iso(new Date());
    const result = await db.query(
      `INSERT INTO finance_recurring_expenses
         (name, amount, category, vendor, frequency, start_date, end_date,
          department, description, next_due_date, auto_approve, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        b.name, amount, b.category, b.vendor || null, b.frequency, startDate,
        b.end_date || null, b.department || null, b.description || null,
        startDate, !!b.auto_approve, uid(req),
      ]
    );
    res.status(201).json({ success: true, recurring: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] create recurring failed:', err);
    res.status(500).json({ success: false, error: 'Failed to create recurring expense' });
  }
});

router.patch('/recurring/:id/approve', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `UPDATE finance_recurring_expenses
          SET approval_status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
        WHERE id = $2 RETURNING *`,
      [uid(req), req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Recurring expense not found' });
    res.json({ success: true, recurring: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] approve recurring failed:', err);
    res.status(500).json({ success: false, error: 'Failed to approve recurring expense' });
  }
});

router.patch('/recurring/:id/active', async (req: Request, res: Response) => {
  try {
    const isActive = !!req.body?.is_active;
    const result = await db.query(
      `UPDATE finance_recurring_expenses SET is_active = $1, updated_at = NOW()
        WHERE id = $2 RETURNING *`,
      [isActive, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Recurring expense not found' });
    res.json({ success: true, recurring: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] toggle recurring failed:', err);
    res.status(500).json({ success: false, error: 'Failed to update recurring expense' });
  }
});

router.post('/recurring/run', async (req: Request, res: Response) => {
  try {
    const created = await runDueRecurringExpenses(uid(req));
    res.json({ success: true, created });
  } catch (err) {
    console.error('[finance] run recurring failed:', err);
    res.status(500).json({ success: false, error: 'Failed to process recurring expenses' });
  }
});

// ===========================================================================
// Tags
// ===========================================================================

router.get('/tags', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(`SELECT * FROM finance_tags ORDER BY tag_type, name`);
    res.json({ success: true, tags: result.rows });
  } catch (err) {
    console.error('[finance] list tags failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load tags' });
  }
});

router.post('/tags', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.name) return bad(res, 'Tag name is required');
    const type = ['category', 'location', 'purpose', 'staff'].includes(b.tag_type) ? b.tag_type : 'category';
    const result = await db.query(
      `INSERT INTO finance_tags (name, tag_type, value) VALUES ($1,$2,$3)
       ON CONFLICT (lower(name), tag_type) DO UPDATE SET value = EXCLUDED.value
       RETURNING *`,
      [b.name, type, b.value || null]
    );
    res.status(201).json({ success: true, tag: result.rows[0] });
  } catch (err) {
    console.error('[finance] create tag failed:', err);
    res.status(500).json({ success: false, error: 'Failed to create tag' });
  }
});

router.delete('/tags/:id', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`DELETE FROM finance_tags WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Tag not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[finance] delete tag failed:', err);
    res.status(500).json({ success: false, error: 'Failed to delete tag' });
  }
});

// ===========================================================================
// Ledger, reconciliation, summary
// ===========================================================================

router.get('/ledger', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    res.json({ success: true, ledger: await buildLedger(from, to) });
  } catch (err) {
    console.error('[finance] build ledger failed:', err);
    res.status(500).json({ success: false, error: 'Failed to build ledger' });
  }
});

router.get('/reconciliations', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(`SELECT * FROM finance_reconciliations ORDER BY recon_date DESC, id DESC`);
    res.json({ success: true, reconciliations: normaliseDates(result.rows) });
  } catch (err) {
    console.error('[finance] list reconciliations failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load reconciliations' });
  }
});

router.post('/reconciliations', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.account_type) return bad(res, 'Account type is required');
    const expected = num(b.expected_balance);
    const actual = num(b.actual_balance);
    // Status follows the numbers rather than whatever the client claims.
    const status = round2(actual - expected) === 0 ? 'reconciled' : 'variance';
    const result = await db.query(
      `INSERT INTO finance_reconciliations
         (recon_date, account_type, expected_balance, actual_balance, status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [b.recon_date || iso(new Date()), b.account_type, expected, actual, status, b.notes || null, uid(req)]
    );
    res.status(201).json({ success: true, reconciliation: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] create reconciliation failed:', err);
    res.status(500).json({ success: false, error: 'Failed to record reconciliation' });
  }
});

/**
 * Headline numbers for the Accounts overview tab.
 *
 * Uses CALENDAR periods (this month / quarter / year), the same windows the P&L
 * reports on. It used to use a rolling "CURRENT_DATE - 1 month" window with no
 * upper bound, so a tile labelled "This Month" covered a floating 30-day span
 * AND swept in every future-dated expense — which is why this screen and the
 * P&L reported different totals for the same month.
 *
 * Payroll is read from the run rather than the expense row it posts, again to
 * match the P&L. See buildProfitAndLoss.
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const period = String(req.query.period || 'month');
    const truncs: Record<string, string> = {
      week: 'week',
      month: 'month',
      quarter: 'quarter',
      year: 'year',
    };
    const trunc = truncs[period] || 'month';
    // Whitelisted above; date_trunc takes a literal unit.
    const from = `date_trunc('${trunc}', CURRENT_DATE)`;
    const to = `(date_trunc('${trunc}', CURRENT_DATE) + INTERVAL '1 ${trunc}' - INTERVAL '1 day')`;

    const result = await db.query(
      `SELECT
         (SELECT COALESCE(SUM(amount),0) FROM finance_income
           WHERE entry_date BETWEEN ${from} AND ${to}) AS total_income,
         (SELECT COALESCE(SUM(amount),0) FROM finance_income
           WHERE payment_status = 'received' AND entry_date BETWEEN ${from} AND ${to}) AS income_received,
         (SELECT COALESCE(SUM(amount),0) FROM finance_income
           WHERE payment_status IN ('pending','overdue')) AS receivables,
         (SELECT COALESCE(SUM(amount),0) FROM finance_expenses
           WHERE approval_status = 'approved' AND source <> 'payroll'
             AND entry_date BETWEEN ${from} AND ${to}) AS total_expenses,
         (SELECT COALESCE(SUM(total_gross - total_leave_deduction + total_cpf_employer),0)
            FROM payroll_runs
           WHERE (period || '-01')::date BETWEEN ${from} AND ${to}) AS payroll_cost,
         (SELECT COALESCE(SUM(amount),0) FROM finance_expenses
           WHERE approval_status = 'pending') AS pending_expense_value,
         (SELECT COUNT(*) FROM finance_expenses WHERE approval_status = 'pending') AS pending_expense_count,
         (SELECT COALESCE(SUM(gst_amount),0) FROM finance_income
           WHERE entry_date BETWEEN ${from} AND ${to}) AS output_gst,
         (SELECT COALESCE(SUM(gst_amount),0) FROM finance_expenses
           WHERE approval_status = 'approved' AND entry_date BETWEEN ${from} AND ${to}) AS input_gst,
         (SELECT COUNT(*) FROM finance_recurring_expenses WHERE is_active AND approval_status = 'approved') AS active_recurring,
         (SELECT COALESCE(SUM(amount),0) FROM finance_recurring_expenses
           WHERE is_active AND approval_status = 'approved' AND frequency = 'monthly') AS monthly_recurring_value`
    );

    const r = result.rows[0];
    const totalIncome = Number(r.total_income);
    const totalExpenses = Number(r.total_expenses) + Number(r.payroll_cost);
    res.json({
      success: true,
      summary: {
        period,
        totalIncome: round2(totalIncome),
        incomeReceived: round2(Number(r.income_received)),
        receivables: round2(Number(r.receivables)),
        totalExpenses: round2(totalExpenses),
        netProfit: round2(totalIncome - totalExpenses),
        pendingExpenseValue: round2(Number(r.pending_expense_value)),
        pendingExpenseCount: Number(r.pending_expense_count),
        outputGst: round2(Number(r.output_gst)),
        inputGst: round2(Number(r.input_gst)),
        netGst: round2(Number(r.output_gst) - Number(r.input_gst)),
        activeRecurring: Number(r.active_recurring),
        monthlyRecurringValue: round2(Number(r.monthly_recurring_value)),
      },
    });
  } catch (err) {
    console.error('[finance] summary failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load summary' });
  }
});

// ===========================================================================
// Budgets
// ===========================================================================

/**
 * Actual spend per allocation comes from the expense rows, matched on
 * department + category + period. The old screen stored a `total_spent` number
 * the user typed, which meant a budget could show itself as on track while the
 * expenses said otherwise.
 */
router.get('/budgets', async (req: Request, res: Response) => {
  try {
    const { period, department } = req.query as Record<string, string>;
    const where: string[] = [];
    const params: unknown[] = [];
    if (period) { params.push(period); where.push(`b.period = $${params.length}`); }
    if (department && department !== 'all') { params.push(department); where.push(`b.department = $${params.length}`); }

    const budgets = await db.query(
      `SELECT b.*, u.display_name AS approved_by_name
         FROM finance_budgets b
         LEFT JOIN users u ON u.id = b.approved_by
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY b.created_at DESC`,
      params
    );
    if (budgets.rows.length === 0) return res.json({ success: true, budgets: [] });

    const ids = budgets.rows.map((b: any) => b.id);
    const allocations = await db.query(
      `SELECT * FROM finance_budget_allocations WHERE budget_id = ANY($1::int[])`,
      [ids]
    );
    const spend = await db.query(
      `SELECT department, category, to_char(entry_date, 'YYYY-MM') AS period,
              COALESCE(SUM(amount),0) AS spent
         FROM finance_expenses
        WHERE approval_status = 'approved'
        GROUP BY department, category, to_char(entry_date, 'YYYY-MM')`
    );
    const spendKey = (d: string, c: string, p: string) =>
      `${(d || '').toLowerCase()}|${(c || '').toLowerCase()}|${p}`;
    const spendMap = new Map<string, number>();
    for (const s of spend.rows) {
      spendMap.set(spendKey(s.department, s.category, s.period), Number(s.spent));
    }

    const out = budgets.rows.map((b: any) => {
      const allocs = allocations.rows
        .filter((a: any) => a.budget_id === b.id)
        .map((a: any) => {
          const allocated = Number(a.allocated);
          const actual = spendMap.get(spendKey(b.department, a.category, b.period)) || 0;
          const variance = round2(allocated - actual);
          const usage = allocated > 0 ? actual / allocated : 0;
          return {
            id: a.id,
            category: a.category,
            allocated: round2(allocated),
            actual: round2(actual),
            variance,
            status: usage > 1 ? 'over_budget' : usage >= 0.85 ? 'warning' : 'on_track',
          };
        });
      const totalSpent = round2(allocs.reduce((s: number, a: any) => s + a.actual, 0));
      return { ...b, total_budget: Number(b.total_budget), total_spent: totalSpent, allocations: allocs };
    });

    res.json({ success: true, budgets: out });
  } catch (err) {
    console.error('[finance] list budgets failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load budgets' });
  }
});

router.post('/budgets', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const b = req.body || {};
    if (!b.budget_number) return bad(res, 'Budget number is required');
    if (!b.department) return bad(res, 'Department is required');
    if (!b.period || !/^\d{4}-\d{2}$/.test(b.period)) return bad(res, 'Period must be YYYY-MM');
    const total = num(b.total_budget);
    if (total <= 0) return bad(res, 'Total budget must be greater than zero');

    const categories: { category: string; allocated: number }[] = Array.isArray(b.categories)
      ? b.categories
          .filter((c: any) => c && c.category)
          .map((c: any) => ({ category: String(c.category), allocated: num(c.allocated) }))
      : [];
    const allocatedSum = round2(categories.reduce((s, c) => s + c.allocated, 0));
    if (allocatedSum > total) {
      return bad(res, `Allocations (${allocatedSum}) exceed the total budget (${total})`);
    }

    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO finance_budgets
         (budget_number, department, cost_center, manager_name, manager_id,
          period, fiscal_year, total_budget, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        b.budget_number, b.department, b.cost_center || null, b.manager_name || null,
        b.manager_id || null, b.period, num(b.fiscal_year, Number(b.period.slice(0, 4))),
        total, uid(req),
      ]
    );
    const budget = inserted.rows[0];
    for (const c of categories) {
      await client.query(
        `INSERT INTO finance_budget_allocations (budget_id, category, allocated) VALUES ($1,$2,$3)`,
        [budget.id, c.category, c.allocated]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, budget: { ...budget, allocations: categories } });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    if (err?.code === '23505') return bad(res, 'That budget number already exists');
    console.error('[finance] create budget failed:', err);
    res.status(500).json({ success: false, error: 'Failed to create budget' });
  } finally {
    client.release();
  }
});

router.patch('/budgets/:id/approve', async (req: Request, res: Response) => {
  try {
    const approve = req.body?.approve !== false;
    const result = await db.query(
      `UPDATE finance_budgets
          SET approval_status = $1, status = $2, approved_by = $3, approval_date = NOW(), updated_at = NOW()
        WHERE id = $4 RETURNING *`,
      [approve ? 'approved' : 'rejected', approve ? 'active' : 'rejected', uid(req), req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Budget not found' });
    res.json({ success: true, budget: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] approve budget failed:', err);
    res.status(500).json({ success: false, error: 'Failed to update budget' });
  }
});

// ===========================================================================
// Expense claims
// ===========================================================================

router.get('/claims', async (_req: Request, res: Response) => {
  try {
    const claims = await db.query(
      `SELECT c.*, s.first_name || ' ' || s.last_name AS staff_name,
              mu.display_name AS manager_approved_by_name, au.display_name AS accounts_reviewed_by_name
         FROM finance_expense_claims c
         JOIN staff s ON s.staff_id = c.staff_id
         LEFT JOIN users mu ON mu.id = c.manager_approved_by
         LEFT JOIN users au ON au.id = c.accounts_reviewed_by
        ORDER BY c.created_at DESC`
    );
    const summary = await db.query(
      `SELECT
         COUNT(*) AS total_claims,
         COALESCE(SUM(amount),0) AS total_amount,
         COUNT(*) FILTER (WHERE status = 'draft') AS draft_claims,
         COUNT(*) FILTER (WHERE status IN ('submitted','manager-approved')) AS pending_approval,
         COUNT(*) FILTER (WHERE status IN ('accounts-reviewed','reimbursed')) AS approved_claims,
         COALESCE(SUM(amount) FILTER (WHERE status = 'reimbursed'),0) AS reimbursed_amount,
         COALESCE(SUM(amount) FILTER (WHERE status = 'accounts-reviewed'),0) AS pending_reimbursement
       FROM finance_expense_claims`
    );
    res.json({ success: true, claims: normaliseDates(claims.rows), summary: summary.rows[0] });
  } catch (err) {
    console.error('[finance] list claims failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load claims' });
  }
});

router.post('/claims', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const amount = num(b.amount);
    if (!b.staff_id) return bad(res, 'Staff member is required');
    if (!amount || amount <= 0) return bad(res, 'Amount must be greater than zero');
    if (!b.category) return bad(res, 'Category is required');
    if (!b.purpose) return bad(res, 'Purpose is required');
    if (!b.receipt_file_name) return bad(res, 'A receipt is required');

    const staff = await db.query(
      `SELECT staff_id, department FROM staff WHERE staff_id = $1`, [b.staff_id]
    );
    if (!staff.rows[0]) return bad(res, 'Staff member not found');

    // Sequence per year, derived from the table so two admins cannot collide.
    const year = new Date().getFullYear();
    const seq = await db.query(
      `SELECT COUNT(*) + 1 AS n FROM finance_expense_claims WHERE claim_number LIKE $1`,
      [`CLM-${year}-%`]
    );
    const claimNumber = `CLM-${year}-${String(seq.rows[0].n).padStart(4, '0')}`;

    const result = await db.query(
      `INSERT INTO finance_expense_claims
         (claim_number, staff_id, claim_date, category, amount, purpose, department, notes,
          receipt_file_name, receipt_uploaded_at, receipt_extracted_amount,
          receipt_extracted_vendor, receipt_extracted_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),$10,$11,$12,'submitted') RETURNING *`,
      [
        claimNumber, b.staff_id, b.claim_date || iso(new Date()), b.category, amount,
        b.purpose, b.department || staff.rows[0].department || null, b.notes || null,
        b.receipt_file_name,
        b.receipt_extracted_amount != null ? num(b.receipt_extracted_amount) : null,
        b.receipt_extracted_vendor || null, b.receipt_extracted_date || null,
      ]
    );
    res.status(201).json({ success: true, claim: normaliseDates(result.rows)[0] });
  } catch (err: any) {
    if (err?.code === '23505') return bad(res, 'Claim number collision, please retry');
    console.error('[finance] create claim failed:', err);
    res.status(500).json({ success: false, error: 'Failed to submit claim' });
  }
});

/**
 * The claim workflow is a strict ladder: submitted → manager-approved →
 * accounts-reviewed → reimbursed. Each step asserts the previous state in the
 * WHERE clause, so a stale UI cannot reimburse a claim nobody approved.
 */
const CLAIM_STEPS: Record<string, { from: string; to: string; sql: string }> = {
  'manager-approve': {
    from: 'submitted',
    to: 'manager-approved',
    sql: `manager_approved_by = $1, manager_approved_at = NOW()`,
  },
  'accounts-review': {
    from: 'manager-approved',
    to: 'accounts-reviewed',
    sql: `accounts_reviewed_by = $1, accounts_reviewed_at = NOW()`,
  },
};

for (const [action, step] of Object.entries(CLAIM_STEPS)) {
  router.patch(`/claims/:id/${action}`, async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `UPDATE finance_expense_claims
            SET status = '${step.to}', ${step.sql}, updated_at = NOW()
          WHERE id = $2 AND status = '${step.from}' RETURNING *`,
        [uid(req), req.params.id]
      );
      if (!result.rows[0]) {
        return res.status(409).json({
          success: false,
          error: `Claim is not awaiting this step (expected status "${step.from}")`,
        });
      }
      res.json({ success: true, claim: normaliseDates(result.rows)[0] });
    } catch (err) {
      console.error(`[finance] claim ${action} failed:`, err);
      res.status(500).json({ success: false, error: 'Failed to update claim' });
    }
  });
}

/**
 * Reimbursement is the point money leaves — it writes the matching expense row
 * so the claim shows up in the ledger, the P&L and the budget actuals. Doing
 * both in one transaction keeps the two from drifting apart.
 */
router.patch('/claims/:id/reimburse', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const claimRes = await client.query(
      `SELECT * FROM finance_expense_claims WHERE id = $1 AND status = 'accounts-reviewed' FOR UPDATE`,
      [req.params.id]
    );
    const claim = claimRes.rows[0];
    if (!claim) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'Claim must be reviewed by accounts before reimbursement',
      });
    }

    const expense = await client.query(
      `INSERT INTO finance_expenses
         (entry_date, amount, category, vendor, description, department, tags,
          approval_status, approved_by, approval_date, paid, paid_date, source, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'approved',$8,NOW(),true,CURRENT_DATE,'claim',$8) RETURNING id`,
      [
        claim.claim_date, claim.amount, claim.category,
        claim.receipt_extracted_vendor || 'Staff reimbursement',
        `Expense claim ${claim.claim_number} — ${claim.purpose}`,
        claim.department, ['expense-claim', claim.staff_id], uid(req),
      ]
    );

    const updated = await client.query(
      `UPDATE finance_expense_claims
          SET status = 'reimbursed', reimbursed_at = NOW(),
              reimbursement_method = $1, expense_id = $2, updated_at = NOW()
        WHERE id = $3 RETURNING *`,
      [req.body?.method || 'bank-transfer', expense.rows[0].id, claim.id]
    );
    await client.query('COMMIT');
    res.json({ success: true, claim: normaliseDates(updated.rows)[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[finance] reimburse claim failed:', err);
    res.status(500).json({ success: false, error: 'Failed to process reimbursement' });
  } finally {
    client.release();
  }
});

router.patch('/claims/:id/reject', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `UPDATE finance_expense_claims
          SET status = 'rejected', rejected_by = $1, rejection_reason = $2, updated_at = NOW()
        WHERE id = $3 AND status IN ('submitted','manager-approved','accounts-reviewed') RETURNING *`,
      [uid(req), req.body?.reason || null, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(409).json({ success: false, error: 'Claim not found or already closed' });
    }
    res.json({ success: true, claim: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] reject claim failed:', err);
    res.status(500).json({ success: false, error: 'Failed to reject claim' });
  }
});

// ===========================================================================
// Payroll
// ===========================================================================

/** Staff with their salary structure, as payroll needs it. */
router.get('/payroll/staff', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT s.id, s.staff_id, s.first_name, s.last_name, s.employment_type, s.status,
              s.cpf_membership_no, s.department, s.position, s.date_of_birth, s.cpf_status,
              COALESCE(sal.base_salary, s.base_salary, 0) AS base_salary,
              COALESCE((SELECT SUM(a.amount) FROM staff_allowances a
                         WHERE a.staff_salary_id = sal.id
                           AND lower(a.name) LIKE '%transport%'), 0) AS transport_allowance,
              COALESCE((SELECT SUM(a.amount) FROM staff_allowances a
                         WHERE a.staff_salary_id = sal.id
                           AND (lower(a.name) LIKE '%housing%' OR lower(a.name) LIKE '%accommodat%')), 0) AS housing_allowance,
              COALESCE((SELECT SUM(a.amount) FROM staff_allowances a
                         WHERE a.staff_salary_id = sal.id
                           AND lower(a.name) NOT LIKE '%transport%'
                           AND lower(a.name) NOT LIKE '%housing%'
                           AND lower(a.name) NOT LIKE '%accommodat%'), 0) AS other_allowances
         FROM staff s
         LEFT JOIN staff_salary sal ON sal.staff_id = s.staff_id
        ORDER BY s.staff_id`
    );
    res.json({ success: true, staff: result.rows });
  } catch (err) {
    console.error('[finance] payroll staff failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load payroll staff' });
  }
});

/**
 * Set a staff member's three headline allowances.
 *
 * Replaces rather than appends: the existing POST /api/admin/salary/:id/allowances
 * only ever inserts, so saving the salary screen twice doubled the allowance.
 * The named rows are deleted and rewritten in one transaction, and the
 * staff_salary totals are recomputed from what is actually there afterwards.
 */
router.put('/payroll/staff/:staffId/allowances', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const staffId = req.params.staffId;
    const transport = num(req.body?.transport_allowance);
    const housing = num(req.body?.housing_allowance);
    const other = num(req.body?.other_allowances);
    if ([transport, housing, other].some((v) => v < 0)) {
      return bad(res, 'Allowances cannot be negative');
    }

    const staff = await db.query(
      `SELECT staff_id, first_name, last_name, position, department, base_salary
         FROM staff WHERE staff_id = $1`,
      [staffId]
    );
    const s = staff.rows[0];
    if (!s) return res.status(404).json({ success: false, error: 'Staff member not found' });

    await client.query('BEGIN');
    const salaryRes = await client.query(
      `INSERT INTO staff_salary (staff_id, staff_name, position, department, base_salary)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (staff_id) DO UPDATE SET last_modified = NOW()
       RETURNING id, base_salary`,
      [staffId, `${s.first_name} ${s.last_name}`, s.position, s.department, s.base_salary || 0]
    );
    const salaryId = salaryRes.rows[0].id;

    await client.query(
      `DELETE FROM staff_allowances
        WHERE staff_salary_id = $1
          AND lower(name) IN ('transport allowance','housing allowance','other allowances')`,
      [salaryId]
    );
    for (const [name, amount] of [
      ['Transport Allowance', transport],
      ['Housing Allowance', housing],
      ['Other Allowances', other],
    ] as [string, number][]) {
      if (amount > 0) {
        await client.query(
          `INSERT INTO staff_allowances (staff_salary_id, name, amount, frequency)
           VALUES ($1,$2,$3,'monthly')`,
          [salaryId, name, amount]
        );
      }
    }

    await client.query(
      `UPDATE staff_salary sal
          SET total_allowances = COALESCE(t.total, 0),
              gross_salary = COALESCE(sal.base_salary, 0) + COALESCE(t.total, 0),
              last_modified = NOW()
         FROM (SELECT COALESCE(SUM(amount),0) AS total FROM staff_allowances
                WHERE staff_salary_id = $1) t
        WHERE sal.id = $1`,
      [salaryId]
    );
    await client.query('COMMIT');

    res.json({ success: true, staff_id: staffId, transport, housing, other });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[finance] set allowances failed:', err);
    res.status(500).json({ success: false, error: 'Failed to update allowances' });
  } finally {
    client.release();
  }
});

/**
 * CPF for one employee in one month, so the salary screen can show the split
 * without a second implementation of the rates living in the browser.
 */
router.get('/payroll/cpf-preview', async (req: Request, res: Response) => {
  try {
    const staffId = String(req.query.staff_id || '');
    const period = String(req.query.period || iso(new Date()).slice(0, 7));
    if (!staffId) return bad(res, 'staff_id is required');
    if (!/^\d{4}-\d{2}$/.test(period)) return bad(res, 'Period must be YYYY-MM');

    const r = await db.query(
      `SELECT s.staff_id, s.date_of_birth, s.cpf_status,
              COALESCE(sal.base_salary, s.base_salary, 0) AS base_salary,
              COALESCE((SELECT SUM(a.amount) FROM staff_allowances a
                         WHERE a.staff_salary_id = sal.id), 0) AS allowances
         FROM staff s
         LEFT JOIN staff_salary sal ON sal.staff_id = s.staff_id
        WHERE s.staff_id = $1`,
      [staffId]
    );
    const st = r.rows[0];
    if (!st) return res.status(404).json({ success: false, error: 'Staff member not found' });

    const ordinaryWage = Number(st.base_salary) + Number(st.allowances);
    const cpf = calculateCPF({
      ordinaryWage,
      dateOfBirth: st.date_of_birth,
      cpfStatus: st.cpf_status,
      period,
    });
    res.json({
      success: true,
      preview: {
        ...cpf,
        age: st.date_of_birth ? ageAtPeriod(st.date_of_birth, period) : null,
      },
    });
  } catch (err) {
    // A missing date of birth or CPF status is a 422 the screen can explain,
    // not a 500.
    const message = err instanceof Error ? err.message : 'Failed to compute CPF';
    console.warn('[finance] cpf preview:', message);
    res.status(422).json({ success: false, error: message });
  }
});

router.get('/payroll/runs', async (_req: Request, res: Response) => {
  try {
    const runs = await db.query(`SELECT * FROM payroll_runs ORDER BY period DESC`);
    res.json({ success: true, runs: normaliseDates(runs.rows) });
  } catch (err) {
    console.error('[finance] list payroll runs failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load payroll runs' });
  }
});

router.get('/payroll/runs/:id/items', async (req: Request, res: Response) => {
  try {
    const items = await db.query(
      `SELECT * FROM payroll_items WHERE payroll_run_id = $1 ORDER BY staff_id`,
      [req.params.id]
    );
    res.json({ success: true, items: items.rows });
  } catch (err) {
    console.error('[finance] payroll items failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load payslips' });
  }
});

router.get('/payroll/payslips', async (_req: Request, res: Response) => {
  try {
    const items = await db.query(
      `SELECT i.*, r.period, r.payment_date, r.generated_at, r.status AS run_status
         FROM payroll_items i
         JOIN payroll_runs r ON r.id = i.payroll_run_id
        ORDER BY r.period DESC, i.staff_id`
    );
    res.json({ success: true, payslips: normaliseDates(items.rows) });
  } catch (err) {
    console.error('[finance] payslips failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load payslips' });
  }
});

/**
 * Generate a payroll run for a month. Rerunning the same period replaces its
 * items rather than duplicating them, but only while the run is unposted — once
 * it has hit the GL it is frozen.
 */
router.post('/payroll/runs', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const period = String(req.body?.period || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(period)) return bad(res, 'Period must be YYYY-MM');

    const existing = await db.query(`SELECT id, status FROM payroll_runs WHERE period = $1`, [period]);
    if (existing.rows[0]?.status === 'posted') {
      return res.status(409).json({ success: false, error: 'That period is already posted to the GL' });
    }

    const staffRes = await db.query(
      `SELECT s.staff_id, s.first_name, s.last_name, s.date_of_birth, s.cpf_status,
              COALESCE(sal.base_salary, s.base_salary, 0) AS base_salary,
              COALESCE((SELECT SUM(a.amount) FROM staff_allowances a
                         WHERE a.staff_salary_id = sal.id AND lower(a.name) LIKE '%transport%'), 0) AS transport_allowance,
              COALESCE((SELECT SUM(a.amount) FROM staff_allowances a
                         WHERE a.staff_salary_id = sal.id
                           AND (lower(a.name) LIKE '%housing%' OR lower(a.name) LIKE '%accommodat%')), 0) AS housing_allowance,
              COALESCE((SELECT SUM(a.amount) FROM staff_allowances a
                         WHERE a.staff_salary_id = sal.id
                           AND lower(a.name) NOT LIKE '%transport%'
                           AND lower(a.name) NOT LIKE '%housing%'
                           AND lower(a.name) NOT LIKE '%accommodat%'), 0) AS other_allowances
         FROM staff s
         LEFT JOIN staff_salary sal ON sal.staff_id = s.staff_id
        WHERE s.status = 'active'
        ORDER BY s.staff_id`
    );
    if (staffRes.rows.length === 0) {
      return bad(res, 'No active staff to pay');
    }

    /**
     * Check every employee's CPF profile BEFORE writing anything. Discovering
     * halfway through that someone has no date of birth would leave a
     * half-built run, and CPF that cannot be computed must stop the payroll —
     * not quietly default to a rate that under-contributes.
     */
    const cpfBlocked: string[] = [];
    for (const s of staffRes.rows) {
      try {
        calculateCPF({
          ordinaryWage:
            Number(s.base_salary) + Number(s.transport_allowance) +
            Number(s.housing_allowance) + Number(s.other_allowances),
          dateOfBirth: s.date_of_birth,
          cpfStatus: s.cpf_status,
          period,
        });
      } catch (e) {
        cpfBlocked.push(`${s.staff_id} ${s.first_name} ${s.last_name}: ${e instanceof Error ? e.message : 'CPF error'}`);
      }
    }
    if (cpfBlocked.length > 0) {
      return res.status(422).json({
        success: false,
        error: `CPF cannot be computed for ${cpfBlocked.length} employee${cpfBlocked.length === 1 ? '' : 's'}. Payroll has not been generated.`,
        blocked: cpfBlocked,
      });
    }

    /**
     * Deductions for this period that are either unapplied, or were applied to
     * THIS run on a previous generation. Without the second case, regenerating
     * a run silently dropped every deduction it had already consumed — the
     * payslip lost the unpaid leave and the employee was overpaid, while the
     * deduction row still read "applied".
     */
    const existingRunId = existing.rows[0]?.id ?? -1;
    const deductions = await db.query(
      `SELECT staff_id, COALESCE(SUM(amount),0) AS total
         FROM finance_payroll_deductions
        WHERE period = $1 AND (status = 'pending' OR applied_run_id = $2)
        GROUP BY staff_id`,
      [period, existingRunId]
    );
    const deductionMap = new Map<string, number>(
      deductions.rows.map((d: any) => [d.staff_id, Number(d.total)])
    );

    const [y, m] = period.split('-').map(Number);
    const paymentDate = iso(new Date(y, m - 1, 28));

    await client.query('BEGIN');
    const runRes = await client.query(
      `INSERT INTO payroll_runs (period, payment_date, generated_by)
       VALUES ($1,$2,$3)
       ON CONFLICT (period) DO UPDATE
         SET payment_date = EXCLUDED.payment_date, generated_by = EXCLUDED.generated_by,
             generated_at = NOW(), status = 'generated'
       RETURNING *`,
      [period, paymentDate, uid(req)]
    );
    const run = runRes.rows[0];
    await client.query(`DELETE FROM payroll_items WHERE payroll_run_id = $1`, [run.id]);

    const totals = { gross: 0, cpfE: 0, cpfR: 0, tax: 0, ded: 0, net: 0, leave: 0 };

    for (const s of staffRes.rows) {
      const base = Number(s.base_salary);
      const transport = Number(s.transport_allowance);
      const housing = Number(s.housing_allowance);
      const other = Number(s.other_allowances);
      const gross = round2(base + transport + housing + other);

      /**
       * Ordinary Wage for CPF is the whole month's wages, allowances included —
       * a fixed monthly transport or housing allowance is wages and attracts
       * CPF. (Only a reimbursement of actual expenses is not, and this system
       * has no way to tell one from the other by name, so anything set up as an
       * allowance is treated as wages. Configure genuine reimbursements
       * somewhere other than the allowance fields.)
       *
       * Note this is a DIFFERENT definition from the Employment Act "gross rate
       * of pay" used for unpaid-leave deductions, which excludes travelling,
       * food and housing allowances. The two statutes genuinely differ; both
       * are implemented to their own definition.
       */
      const cpf = calculateCPF({
        ordinaryWage: gross,
        dateOfBirth: s.date_of_birth,
        cpfStatus: s.cpf_status,
        period,
      });
      const tax = calculateTax(gross, cpf.employeeTotal);
      const leaveDeduction = round2(deductionMap.get(s.staff_id) || 0);
      // Income tax is NOT withheld — see the note in financeService.calculateTax.
      const totalDeductions = round2(cpf.employeeTotal + leaveDeduction);
      const net = round2(gross - totalDeductions);

      /**
       * Employment Act s32: total deductions in one salary period may not
       * exceed 50% of salary payable. CPF, deductions for absence, and recovery
       * of advances are excluded from that cap, so with only CPF and unpaid
       * leave this cannot currently bite — the guard is here so it is already
       * correct the day another deduction type is added, rather than being
       * remembered afterwards.
       */
      const cappedDeductions = round2(totalDeductions - cpf.employeeTotal - leaveDeduction);
      if (gross > 0 && cappedDeductions > round2(gross * 0.5)) {
        throw new Error(
          `Deductions for ${s.staff_id} exceed 50% of salary, which the Employment Act does not permit.`
        );
      }

      await client.query(
        `INSERT INTO payroll_items
           (payroll_run_id, staff_id, staff_name, base_salary, transport_allowance,
            housing_allowance, other_allowances, gross_salary, cpf_employee, cpf_employer,
            income_tax, leave_deduction, total_deductions, net_salary, cpf_breakdown, tax_breakdown,
            cpf_status, age_at_payroll, cpf_rate_employee, cpf_rate_employer, cpf_ow_ceiling)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [
          run.id, s.staff_id, `${s.first_name} ${s.last_name}`, base, transport, housing, other,
          gross, cpf.employeeTotal, cpf.employerTotal, tax.monthlyTax, leaveDeduction,
          totalDeductions, net, JSON.stringify(cpf), JSON.stringify(tax),
          cpf.cpfStatus,
          s.date_of_birth ? ageAtPeriod(s.date_of_birth, period) : null,
          cpf.rateEmployee, cpf.rateEmployer, cpf.owCeiling,
        ]
      );

      totals.gross += gross;
      totals.cpfE += cpf.employeeTotal;
      totals.cpfR += cpf.employerTotal;
      totals.tax += tax.monthlyTax;
      totals.ded += totalDeductions;
      totals.leave += leaveDeduction;
      totals.net += net;
    }

    await client.query(
      `UPDATE payroll_runs
          SET total_gross = $1, total_cpf_employee = $2, total_cpf_employer = $3,
              total_tax = $4, total_deductions = $5, total_net = $6,
              total_leave_deduction = $7
        WHERE id = $8`,
      [
        round2(totals.gross), round2(totals.cpfE), round2(totals.cpfR),
        round2(totals.tax), round2(totals.ded), round2(totals.net),
        round2(totals.leave), run.id,
      ]
    );

    await client.query(
      `UPDATE finance_payroll_deductions
          SET status = 'applied', applied_run_id = $1
        WHERE period = $2 AND (status = 'pending' OR applied_run_id = $1)`,
      [run.id, period]
    );

    await client.query('COMMIT');
    const final = await db.query(`SELECT * FROM payroll_runs WHERE id = $1`, [run.id]);
    const items = await db.query(
      `SELECT * FROM payroll_items WHERE payroll_run_id = $1 ORDER BY staff_id`, [run.id]
    );
    res.status(201).json({ success: true, run: normaliseDates(final.rows)[0], items: items.rows });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[finance] generate payroll failed:', err);
    res.status(500).json({ success: false, error: 'Failed to generate payroll' });
  } finally {
    client.release();
  }
});

/**
 * Post a run to the general ledger. Writes a balanced double entry and the
 * matching expense rows, then freezes the run.
 */
router.post('/payroll/runs/:id/post', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const runRes = await client.query(
      `SELECT * FROM payroll_runs WHERE id = $1 FOR UPDATE`, [req.params.id]
    );
    const run = runRes.rows[0];
    if (!run) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Payroll run not found' });
    }
    if (run.status === 'posted') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'This run is already posted' });
    }

    const gross = Number(run.total_gross);
    const cpfEmployee = Number(run.total_cpf_employee);
    const cpfEmployer = Number(run.total_cpf_employer);
    const leaveDeduction = Number(run.total_leave_deduction || 0);
    const net = Number(run.total_net);
    const entryDate = run.payment_date || iso(new Date());

    /**
     * Gross wages are debited in full and unpaid leave is credited back as a
     * contra, rather than netting it into the salary line — an accountant
     * reading the ledger can see both the wage bill and the adjustment. Without
     * this line the journal was short by exactly the deduction.
     */
    const lines: [string, string, number, number][] = [
      ['5000', 'Salaries & Wages Expense', gross, 0],
      ['5010', 'CPF Employer Contribution', cpfEmployer, 0],
      ['2100', 'CPF Payable', 0, round2(cpfEmployee + cpfEmployer)],
      ['2000', 'Net Salaries Payable', 0, net],
    ];
    if (leaveDeduction > 0) {
      lines.push(['5001', 'Unpaid Leave Adjustment', 0, leaveDeduction]);
    }
    const debits = round2(lines.reduce((s, l) => s + l[2], 0));
    const credits = round2(lines.reduce((s, l) => s + l[3], 0));
    if (debits !== credits) {
      await client.query('ROLLBACK');
      console.error('[finance] payroll GL out of balance', { debits, credits, run: run.id });
      return res.status(500).json({
        success: false,
        error: `Refusing to post: entry does not balance (Dr ${debits} vs Cr ${credits})`,
      });
    }

    for (const [code, name, debit, credit] of lines) {
      await client.query(
        `INSERT INTO finance_gl_entries
           (entry_date, account_code, account_name, debit, credit, description, source_type, source_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,'payroll',$7,$8)`,
        [entryDate, code, name, debit, credit, `Payroll ${run.period}`, run.id, uid(req)]
      );
    }

    // One expense row for the whole run so the P&L, ledger and budget actuals
    // pick payroll up without double counting each payslip.
    const expense = await client.query(
      `INSERT INTO finance_expenses
         (entry_date, amount, category, vendor, description, department, tags,
          approval_status, approved_by, approval_date, paid, paid_date, source, created_by)
       VALUES ($1,$2,'Salaries','Payroll',$3,'HR',$4,'approved',$5,NOW(),true,$1,'payroll',$5)
       RETURNING id`,
      [
        entryDate,
        round2(gross - leaveDeduction + cpfEmployer),
        `Payroll run ${run.period}`,
        ['payroll', run.period],
        uid(req),
      ]
    );

    const updated = await client.query(
      `UPDATE payroll_runs SET status = 'posted', posted_by = $1, posted_at = NOW(), expense_id = $2
        WHERE id = $3 RETURNING *`,
      [uid(req), expense.rows[0].id, run.id]
    );
    await client.query(`UPDATE payroll_items SET status = 'paid' WHERE payroll_run_id = $1`, [run.id]);
    await client.query('COMMIT');
    res.json({ success: true, run: normaliseDates(updated.rows)[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[finance] post payroll failed:', err);
    res.status(500).json({ success: false, error: 'Failed to post payroll' });
  } finally {
    client.release();
  }
});

router.get('/gl-entries', async (req: Request, res: Response) => {
  try {
    const { source_type } = req.query as Record<string, string>;
    const params: unknown[] = [];
    let where = '';
    if (source_type) { params.push(source_type); where = `WHERE source_type = $1`; }
    const result = await db.query(
      `SELECT * FROM finance_gl_entries ${where} ORDER BY entry_date DESC, id ASC`,
      params
    );
    res.json({ success: true, entries: normaliseDates(result.rows) });
  } catch (err) {
    console.error('[finance] gl entries failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load GL entries' });
  }
});

// ===========================================================================
// IRAS — employment income (IR8A) and a straight answer on compliance
// ===========================================================================

/**
 * IR8A PREPARATION data for a calendar year.
 *
 * Section 68(2) of the Income Tax Act requires an employer to prepare Form IR8A
 * for every employee by 1 March of the following year. Employers with 5 or more
 * employees must submit electronically under the Auto-Inclusion Scheme; those
 * not on AIS must instead hand the IR8A to each employee by the same date.
 * Failure to comply is an offence — a fine of up to $5,000 under s94, and AIS
 * non-filers have been prosecuted.
 *
 * This is NOT an AIS submission file. AIS has its own validated format and
 * submission channel; producing something that merely looks like one would
 * invite somebody to try filing it. What this gives you is the figures the
 * system genuinely holds, itemised the way IR8A asks for them, so they can be
 * entered or handed to whoever files.
 *
 * Reported BEFORE deduction of CPF, which is how IRAS wants employment income.
 */
router.get('/iras/ir8a', async (req: Request, res: Response) => {
  try {
    const year = String(req.query.year || new Date().getFullYear() - 1);
    if (!/^\d{4}$/.test(year)) return bad(res, 'Year must be YYYY');

    const employer = (await db.query(`SELECT * FROM employer_profile WHERE id = 1`)).rows[0] || {};

    const rows = await db.query(
      `SELECT i.staff_id,
              MAX(i.staff_name) AS staff_name,
              MAX(s.nric) AS nric,
              MAX(s.date_of_birth::text) AS date_of_birth,
              MAX(s.position) AS designation,
              MAX(s.home_address) AS home_address,
              MAX(s.postal_code) AS postal_code,
              MAX(s.cpf_status) AS cpf_status,
              COUNT(*) AS months_paid,
              SUM(i.base_salary) AS gross_salary,
              SUM(i.transport_allowance + i.housing_allowance + i.other_allowances) AS allowances,
              SUM(i.gross_salary) AS total_before_cpf,
              SUM(i.cpf_employee) AS cpf_employee,
              SUM(i.cpf_employer) AS cpf_employer,
              SUM(i.leave_deduction) AS unpaid_leave
         FROM payroll_items i
         JOIN payroll_runs r ON r.id = i.payroll_run_id
         LEFT JOIN staff s ON s.staff_id = i.staff_id
        WHERE r.period LIKE $1 AND i.status = 'paid'
        GROUP BY i.staff_id
        ORDER BY i.staff_id`,
      [`${year}-%`]
    );

    const employees = rows.rows.map((r: any) => {
      const missing: string[] = [];
      if (!r.nric) missing.push('NRIC/FIN');
      if (!r.date_of_birth) missing.push('date of birth');
      if (!r.home_address) missing.push('address');
      return {
        staff_id: r.staff_id,
        name: r.staff_name,
        nric: r.nric,
        date_of_birth: r.date_of_birth,
        designation: r.designation,
        address: [r.home_address, r.postal_code && `Singapore ${r.postal_code}`]
          .filter(Boolean).join(', '),
        months_paid: Number(r.months_paid),
        // IR8A item 1(a) — salary before CPF deduction
        gross_salary: round2(Number(r.gross_salary)),
        // IR8A item 1(d) — allowances (transport, meal and the like)
        allowances: round2(Number(r.allowances)),
        total_employment_income: round2(Number(r.total_before_cpf)),
        // IR8A item 2 — employee's compulsory CPF for the year
        cpf_employee: round2(Number(r.cpf_employee)),
        cpf_employer: round2(Number(r.cpf_employer)),
        unpaid_leave_deducted: round2(Number(r.unpaid_leave)),
        missing_details: missing,
      };
    });

    /**
     * What this system cannot fill in, stated plainly so nobody assumes the
     * export is the whole return.
     */
    const notTracked = [
      "Bonus and director's fees — not recorded anywhere in this system",
      'Benefits-in-kind (Appendix 8A): accommodation, cars, club memberships, interest-free loans',
      'Gains from share options or share awards (Appendix 8B)',
      'Excess or voluntary CPF contributions (Form IR8S)',
      'Gratuity, notice pay, ex-gratia and retrenchment benefits',
      'Commission',
    ];

    res.json({
      success: true,
      year,
      employer: {
        legal_name: employer.legal_name || null,
        uen: employer.uen || null,
        address: employer.registered_address || null,
      },
      employee_count: employees.length,
      /** AIS is compulsory at 5 or more employees, including part-timers and directors. */
      ais_likely_mandatory: employees.length >= 5,
      deadline: `${Number(year) + 1}-03-01`,
      employees,
      not_tracked: notTracked,
      caveat:
        'Preparation data only — this is not an AIS submission file and does not constitute filing. ' +
        'Add anything under "not tracked" before this goes to IRAS, and have it checked by whoever files your returns.',
    });
  } catch (err) {
    console.error('[finance] IR8A failed:', err);
    res.status(500).json({ success: false, error: 'Failed to build IR8A data' });
  }
});

/** IR8A as CSV, one row per employee, for handing to an accountant. */
router.get('/iras/ir8a/export', async (req: Request, res: Response) => {
  try {
    const year = String(req.query.year || new Date().getFullYear() - 1);
    if (!/^\d{4}$/.test(year)) return bad(res, 'Year must be YYYY');

    const base = `${req.protocol}://${req.get('host')}`;
    void base; // reuse of the JSON builder below keeps one source of truth
    const employer = (await db.query(`SELECT * FROM employer_profile WHERE id = 1`)).rows[0] || {};
    const rows = await db.query(
      `SELECT i.staff_id, MAX(i.staff_name) AS staff_name, MAX(s.nric) AS nric,
              MAX(s.date_of_birth::text) AS dob, MAX(s.position) AS designation,
              MAX(s.home_address) AS addr, MAX(s.postal_code) AS postal,
              SUM(i.base_salary) AS salary,
              SUM(i.transport_allowance + i.housing_allowance + i.other_allowances) AS allowances,
              SUM(i.gross_salary) AS total, SUM(i.cpf_employee) AS cpf_e,
              SUM(i.cpf_employer) AS cpf_r
         FROM payroll_items i
         JOIN payroll_runs r ON r.id = i.payroll_run_id
         LEFT JOIN staff s ON s.staff_id = i.staff_id
        WHERE r.period LIKE $1 AND i.status = 'paid'
        GROUP BY i.staff_id ORDER BY i.staff_id`,
      [`${year}-%`]
    );

    const money = (v: unknown) => round2(Number(v) || 0).toFixed(2);
    const out: (string | number)[][] = [
      [`IR8A preparation data — year of income ${year}`],
      ['Employer', employer.legal_name || '(not set)'],
      ['UEN', employer.uen || '(not set)'],
      ['Due to IRAS / to employees by', `1 March ${Number(year) + 1}`],
      [],
      ['Staff ID', 'Name', 'NRIC/FIN', 'Date of birth', 'Designation', 'Address',
       'Salary (before CPF)', 'Allowances', 'Total employment income', "Employee's CPF", "Employer's CPF"],
    ];
    for (const r of rows.rows) {
      out.push([
        r.staff_id, r.staff_name, r.nric || '(missing)', r.dob || '(missing)',
        r.designation || '', [r.addr, r.postal && `Singapore ${r.postal}`].filter(Boolean).join(', '),
        money(r.salary), money(r.allowances), money(r.total), money(r.cpf_e), money(r.cpf_r),
      ]);
    }
    out.push([]);
    out.push(['NOT INCLUDED — add before filing:']);
    for (const item of [
      "Bonus and director's fees", 'Benefits-in-kind (Appendix 8A)',
      'Share option gains (Appendix 8B)', 'Excess/voluntary CPF (IR8S)',
      'Gratuity, notice pay, retrenchment benefits', 'Commission',
    ]) out.push(['', item]);
    out.push([]);
    out.push(['This is preparation data, not an AIS submission file, and does not constitute filing.']);

    const esc = (v: string | number) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="IR8A-prep-${year}.csv"`);
    res.send(out.map(r => r.map(esc).join(',')).join('\r\n'));
  } catch (err) {
    console.error('[finance] IR8A export failed:', err);
    res.status(500).json({ success: false, error: 'Failed to export IR8A data' });
  }
});

/**
 * A straight answer on where this system stands against MOM, CPF, IRAS and
 * ACRA — computed where it can be, and honest about the rest.
 *
 * It exists because the screens used to assert compliance they did not have
 * ("Ready for annual ACRA filing", "ACRA & MOM Compliance"). Being told you are
 * compliant when you are not is worse than being told nothing, because it stops
 * you asking.
 */
router.get('/compliance-status', async (_req: Request, res: Response) => {
  try {
    const r = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM staff WHERE status = 'active') AS active_staff,
         (SELECT COUNT(*) FROM staff WHERE status = 'active' AND nric IS NULL) AS no_nric,
         (SELECT COUNT(*) FROM staff WHERE status = 'active' AND date_of_birth IS NULL) AS no_dob,
         (SELECT COUNT(*) FROM staff WHERE status = 'active' AND cpf_status IS NULL) AS no_cpf_status,
         (SELECT COUNT(*) FROM staff WHERE status = 'active'
            AND (bank_account_number IS NULL OR bank_code IS NULL)) AS no_bank,
         (SELECT legal_name FROM employer_profile WHERE id = 1) AS employer_name,
         (SELECT uen FROM employer_profile WHERE id = 1) AS uen,
         (SELECT cpf_submission_number FROM employer_profile WHERE id = 1) AS csn`
    );
    const m = r.rows[0];
    const activeStaff = Number(m.active_staff);

    const item = (
      area: string,
      requirement: string,
      status: 'ok' | 'gap' | 'partial',
      detail: string,
      authority: string
    ) => ({ area, requirement, status, detail, authority });

    const items = [
      // ---- MOM ----
      item('MOM', 'Itemised payslip, 12 required items',
        m.employer_name ? 'partial' : 'gap',
        m.employer_name
          ? 'Eleven of twelve are produced. Overtime hours, overtime pay and the overtime period are NOT recorded anywhere, so any payslip for someone who worked overtime is incomplete.'
          : "The employer's legal name is not set, so every payslip carries a placeholder where MOM requires item 1.",
        'Employment Act; MOM itemised payslip requirements'),
      item('MOM', 'Salary paid within 7 days of the period ending', 'partial',
        'The system records a payment date and the bank file carries a value date, but nothing warns if that date is more than 7 days after the period ends.',
        'Employment Act s21'),
      item('MOM', 'Key Employment Terms in writing within 14 days', 'gap',
        'Not produced. KETs are a separate document covering job title, duties, hours, salary period, leave and benefits.',
        'Employment Act s95A'),
      item('MOM', 'Employee records kept', 'partial',
        'Staff, salary, leave and payroll records are kept. Retention is not enforced or purged on a schedule.',
        'Employment Act; MOM record-keeping'),
      item('MOM', 'Overtime tracking and payment within 14 days', 'gap',
        'Overtime is not captured at all — not hours, not rate, not payment.',
        'Employment Act s38'),

      // ---- CPF ----
      item('CPF', 'Contribution rates and wage ceilings',
        Number(m.no_dob) === 0 && Number(m.no_cpf_status) === 0 ? 'ok' : 'partial',
        Number(m.no_dob) === 0 && Number(m.no_cpf_status) === 0
          ? 'Statutory rates by age band, Ordinary Wage ceiling by period, correct Additional Wage treatment. Payroll refuses to run where it cannot compute.'
          : `${m.no_dob} active staff have no date of birth and ${m.no_cpf_status} have no CPF status. Payroll will refuse to run for them rather than guess.`,
        'CPF Act; CPF Board contribution tables'),
      item('CPF', 'Graduated rates for 1st/2nd year PRs', 'gap',
        'Not implemented. Payroll refuses for these employees rather than applying full rates.',
        'CPF Board SPR contribution tables'),
      item('CPF', 'Contributions remitted by the 14th', 'partial',
        'The due date and the amount are shown on the employer cost screen. Submission to CPF EZPay is manual and nothing confirms it happened.',
        'CPF Act'),

      // ---- IRAS ----
      item('IRAS', 'No monthly tax withholding', 'ok',
        'Correct — Singapore has no PAYE. Income tax is shown on the payslip as a projection and is not deducted.',
        'Income Tax Act'),
      item('IRAS', 'IR8A by 1 March', activeStaff > 0 ? 'partial' : 'gap',
        `Preparation data can be exported. It excludes bonus, director's fees, benefits-in-kind (Appendix 8A), share gains (Appendix 8B) and IR8S — none of which this system tracks. It is not an AIS submission file.` +
        (activeStaff >= 5 ? ' With 5 or more employees, AIS electronic submission is compulsory.' : ''),
        'Income Tax Act s68(2); s94 penalties'),
      item('IRAS', 'Business records kept 5 years', 'partial',
        'Transactions, approvals and receipts filenames are stored. No retention policy is enforced, and receipt files themselves are referenced by name only.',
        'Income Tax Act; GST Act'),
      item('IRAS', 'GST tax invoices and F5 returns', 'gap',
        'GST is captured per transaction, but no tax invoice document is produced and no F5 return is prepared. Invoice numbers are typed, not issued in sequence.',
        'GST Act (if registered — threshold S$1m turnover)'),

      // ---- ACRA ----
      item('ACRA', 'Statutory financial statements under SFRS', 'gap',
        'What this produces are management accounts. Statutory statements need accounting policies, notes, prior-year comparatives, a statement of changes in equity and a directors’ statement. Fixed assets and share capital are not tracked at all.',
        'Companies Act; SFRS'),
      item('ACRA', 'Annual Return and XBRL filing', 'gap',
        'Not produced. This is a filing obligation on the company, separate from bookkeeping.',
        'Companies Act s197'),

      // ---- PDPA ----
      item('PDPA', 'Notice at the point of collection', 'ok',
        'The onboarding form states the purpose, retention and correction rights above the consent box, and acceptance is timestamped.',
        'PDPA s20'),
      item('PDPA', 'Protection of personal data',
        Number(m.no_bank) === 0 ? 'partial' : 'partial',
        'Bank account numbers are masked on read and the export is audited, but they are stored unencrypted. NRIC is held for CPF and identity verification.',
        'PDPA s24'),
      item('PDPA', 'Retention limitation', 'gap',
        'No retention schedule is enforced and nothing purges or anonymises data once its purpose ends. A soft-delete flag would not satisfy this either.',
        'PDPA s25; PDPC Key Concepts 18.10–18.11'),
    ];

    const counts = {
      ok: items.filter(i => i.status === 'ok').length,
      partial: items.filter(i => i.status === 'partial').length,
      gap: items.filter(i => i.status === 'gap').length,
    };

    res.json({
      success: true,
      employer: {
        legal_name: m.employer_name,
        uen: m.uen,
        cpf_submission_number: m.csn,
      },
      staff_data_gaps: {
        active_staff: activeStaff,
        missing_nric: Number(m.no_nric),
        missing_date_of_birth: Number(m.no_dob),
        missing_cpf_status: Number(m.no_cpf_status),
        missing_bank_details: Number(m.no_bank),
      },
      counts,
      items,
      disclaimer:
        'This is a summary of what the software does and does not do. It is not legal or tax advice, ' +
        'and it is not an assurance of compliance. Have a practitioner confirm anything you rely on.',
    });
  } catch (err) {
    console.error('[finance] compliance status failed:', err);
    res.status(500).json({ success: false, error: 'Failed to build compliance status' });
  }
});

// ===========================================================================
// Employer view: what CPF actually costs, and what must be remitted
// ===========================================================================

/**
 * The employer's side of CPF, which nothing surfaced.
 *
 * Two figures are easy to confuse and matter for different reasons:
 *
 *  - REMITTANCE — employee share + employer share. The whole of this leaves the
 *    bank account and goes to CPF Board. The employee share is money already
 *    withheld from the payslip, so it is not an extra cost, but it is cash out.
 *  - COST — the employer share only. This is what employing someone costs on
 *    top of their gross salary, and it is the number to use when working out
 *    whether a hire is affordable.
 *
 * Contributions are due by the 14th of the month following the one they relate
 * to. Late payment attracts interest of 1.5% per month, minimum $5, charged
 * from the first day late (CPF Act s7 / Reg 10).
 */
router.get('/payroll/cpf-summary', async (req: Request, res: Response) => {
  try {
    const period = String(req.query.period || iso(new Date()).slice(0, 7));
    if (!/^\d{4}-\d{2}$/.test(period)) return bad(res, 'Period must be YYYY-MM');

    const runRes = await db.query(`SELECT * FROM payroll_runs WHERE period = $1`, [period]);
    const run = runRes.rows[0];
    if (!run) {
      return res.json({ success: true, period, run: null, staff: [], totals: null });
    }

    const items = await db.query(
      `SELECT i.staff_id, i.staff_name, i.gross_salary, i.base_salary,
              i.cpf_employee, i.cpf_employer, i.net_salary, i.age_at_payroll,
              i.cpf_rate_employee, i.cpf_rate_employer, i.cpf_ow_ceiling, i.cpf_status,
              s.department
         FROM payroll_items i
         LEFT JOIN staff s ON s.staff_id = i.staff_id
        WHERE i.payroll_run_id = $1
        ORDER BY i.staff_id`,
      [run.id]
    );

    const staff = items.rows.map((i: any) => {
      const gross = Number(i.gross_salary);
      const cpfEmployee = Number(i.cpf_employee);
      const cpfEmployer = Number(i.cpf_employer);
      return {
        staff_id: i.staff_id,
        staff_name: i.staff_name,
        department: i.department || 'Unassigned',
        age: i.age_at_payroll,
        cpf_status: i.cpf_status,
        gross_salary: round2(gross),
        // What the company pays out in total for this person.
        total_cost: round2(gross + cpfEmployer),
        cpf_employee: round2(cpfEmployee),
        cpf_employer: round2(cpfEmployer),
        cpf_total: round2(cpfEmployee + cpfEmployer),
        net_paid_to_staff: round2(Number(i.net_salary)),
        rate_employee: i.cpf_rate_employee != null ? Number(i.cpf_rate_employee) : null,
        rate_employer: i.cpf_rate_employer != null ? Number(i.cpf_rate_employer) : null,
        ow_ceiling: i.cpf_ow_ceiling != null ? Number(i.cpf_ow_ceiling) : null,
        // Wages above the ceiling attract no CPF; worth seeing, because it is
        // why a raise above the ceiling costs less than one below it.
        wages_above_ceiling: i.cpf_ow_ceiling != null
          ? round2(Math.max(0, gross - Number(i.cpf_ow_ceiling)))
          : 0,
      };
    });

    const sum = (k: keyof (typeof staff)[0]) =>
      round2(staff.reduce((t: number, s: any) => t + (Number(s[k]) || 0), 0));

    const grossTotal = sum('gross_salary');
    const cpfEmployee = sum('cpf_employee');
    const cpfEmployer = sum('cpf_employer');
    const netTotal = sum('net_paid_to_staff');

    // Due by the 14th of the following month.
    const [y, m] = period.split('-').map(Number);
    const dueDate = iso(new Date(y, m, 14));
    const today = new Date(iso(new Date()));
    const daysUntilDue = Math.round(
      (parseDateOnly(dueDate).getTime() - today.getTime()) / 86400000
    );

    const byDepartment = Object.values(
      staff.reduce((acc: Record<string, any>, s: any) => {
        const d = s.department;
        acc[d] = acc[d] || { department: d, headcount: 0, gross: 0, cpf_employer: 0, total_cost: 0 };
        acc[d].headcount += 1;
        acc[d].gross = round2(acc[d].gross + s.gross_salary);
        acc[d].cpf_employer = round2(acc[d].cpf_employer + s.cpf_employer);
        acc[d].total_cost = round2(acc[d].total_cost + s.total_cost);
        return acc;
      }, {})
    );

    res.json({
      success: true,
      period,
      run: {
        id: run.id,
        status: run.status,
        payment_date: dateOnly(run.payment_date),
      },
      staff,
      by_department: byDepartment,
      totals: {
        headcount: staff.length,
        grossSalaries: grossTotal,
        /** Deducted from staff, but the employer remits it. */
        cpfEmployee,
        /** The employer's own money, on top of salary. */
        cpfEmployer,
        /** Total cheque to CPF Board. */
        cpfRemittance: round2(cpfEmployee + cpfEmployer),
        /** Paid into staff bank accounts. */
        netToStaff: netTotal,
        /** Everything leaving the business for this month's payroll. */
        totalEmploymentCost: round2(grossTotal + cpfEmployer),
        /** Employer CPF as a share of gross — the "on-cost" percentage. */
        employerOnCostPercent: grossTotal > 0 ? round2((cpfEmployer / grossTotal) * 100) : 0,
      },
      remittance: {
        dueDate,
        daysUntilDue,
        overdue: daysUntilDue < 0,
        note:
          'CPF contributions are due by the 14th of the month following the one they relate to. ' +
          'Late payment attracts interest of 1.5% per month, minimum $5.',
      },
    });
  } catch (err) {
    console.error('[finance] cpf summary failed:', err);
    res.status(500).json({ success: false, error: 'Failed to build CPF summary' });
  }
});

/**
 * Employer CPF across the year, so the on-cost can be budgeted rather than
 * discovered each month.
 */
router.get('/payroll/cpf-year', async (req: Request, res: Response) => {
  try {
    const year = String(req.query.year || new Date().getFullYear());
    if (!/^\d{4}$/.test(year)) return bad(res, 'Year must be YYYY');

    const result = await db.query(
      `SELECT period, status, total_gross, total_cpf_employee, total_cpf_employer,
              total_net, total_leave_deduction
         FROM payroll_runs
        WHERE period LIKE $1
        ORDER BY period`,
      [`${year}-%`]
    );

    const months = result.rows.map((r: any) => ({
      period: r.period,
      status: r.status,
      gross: round2(Number(r.total_gross)),
      cpfEmployee: round2(Number(r.total_cpf_employee)),
      cpfEmployer: round2(Number(r.total_cpf_employer)),
      cpfRemittance: round2(Number(r.total_cpf_employee) + Number(r.total_cpf_employer)),
      netToStaff: round2(Number(r.total_net)),
      totalCost: round2(Number(r.total_gross) + Number(r.total_cpf_employer)),
    }));

    const total = (k: keyof (typeof months)[0]) =>
      round2(months.reduce((t: number, m: any) => t + (Number(m[k]) || 0), 0));

    res.json({
      success: true,
      year,
      months,
      totals: {
        gross: total('gross'),
        cpfEmployee: total('cpfEmployee'),
        cpfEmployer: total('cpfEmployer'),
        cpfRemittance: total('cpfRemittance'),
        netToStaff: total('netToStaff'),
        totalCost: total('totalCost'),
      },
    });
  } catch (err) {
    console.error('[finance] cpf year failed:', err);
    res.status(500).json({ success: false, error: 'Failed to build annual CPF summary' });
  }
});

/** The employer's own details — payslips and CPF submissions need them. */
router.get('/employer-profile', async (_req: Request, res: Response) => {
  try {
    const r = await db.query(`SELECT * FROM employer_profile WHERE id = 1`);
    const profile = r.rows[0] || {};
    const missing: string[] = [];
    if (!profile.legal_name) missing.push('legal name (required on every payslip by MOM)');
    if (!profile.uen) missing.push('UEN');
    if (!profile.cpf_submission_number) missing.push('CPF Submission Number');
    res.json({ success: true, profile, missing, complete: missing.length === 0 });
  } catch (err) {
    console.error('[finance] employer profile failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load employer profile' });
  }
});

router.put('/employer-profile', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const workingDays = num(b.working_days_per_week, 5);
    if (workingDays <= 0 || workingDays > 7) {
      return bad(res, 'Working days per week must be between 1 and 7');
    }
    const r = await db.query(
      `UPDATE employer_profile
          SET legal_name = $1, uen = $2, cpf_submission_number = $3,
              registered_address = $4, postal_code = $5,
              working_days_per_week = $6, updated_by = $7, updated_at = NOW()
        WHERE id = 1 RETURNING *`,
      [
        String(b.legal_name || '').trim() || null,
        String(b.uen || '').trim().toUpperCase() || null,
        String(b.cpf_submission_number || '').trim().toUpperCase() || null,
        String(b.registered_address || '').trim() || null,
        String(b.postal_code || '').replace(/[^0-9]/g, '') || null,
        workingDays,
        uid(req),
      ]
    );
    res.json({ success: true, profile: r.rows[0] });
  } catch (err) {
    console.error('[finance] save employer profile failed:', err);
    res.status(500).json({ success: false, error: 'Failed to save employer profile' });
  }
});

// ===========================================================================
// Paying staff — bank payment batches
// ===========================================================================

/**
 * HOW SALARY ACTUALLY REACHES A BANK ACCOUNT
 *
 * Posting a payroll run raises "Net Salaries Payable". These endpoints settle
 * it. The rail is a bank BULK CREDIT (GIRO for value-dated batches, FAST for
 * near-instant), initiated by a file uploaded to corporate internet banking:
 * DBS IDEAL, OCBC Velocity or UOB BIBPlus.
 *
 * The sequence:
 *   1. POST /payroll/runs/:id/payment-batch   — maker builds the batch
 *   2. PATCH /payment-batches/:id/approve     — a DIFFERENT admin approves
 *   3. GET  /payment-batches/:id/export       — bank file downloaded (audited)
 *   4. upload + authorise in the bank's portal  ← the only manual step
 *   5. PATCH /payment-batches/:id/settle      — bank reference recorded;
 *                                               payslips marked paid and the
 *                                               liability cleared in the GL
 *
 * Step 4 stays human on purpose. Full host-to-host initiation (ISO 20022
 * pain.001 over a bank's corporate channel) is possible but needs a signed
 * agreement, mTLS certificates and the bank's own authorisation matrix — and
 * even then, a second pair of eyes before money leaves is a control worth
 * keeping, not an inconvenience to engineer away.
 *
 * Stripe cannot do this. Stripe Connect, which this codebase already uses to
 * pay doers and companies for errands, is a marketplace payout rail for
 * contractors. It is not a payroll rail and must not be used to pay employees.
 */

/** Singapore bank clearing codes, for validating what gets typed in. */
const SG_BANK_CODES: Record<string, string> = {
  '7171': 'DBS Bank / POSB',
  '7339': 'OCBC Bank',
  '7375': 'United Overseas Bank',
  '7302': 'Maybank',
  '9496': 'Standard Chartered',
  '7214': 'Citibank',
  '7232': 'HSBC',
  '7144': 'Bank of China',
  '8712': 'CIMB',
  '7454': 'RHB Bank',
  '9548': 'Trust Bank',
  '9666': 'GXS Bank',
};

router.get('/bank-codes', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    codes: Object.entries(SG_BANK_CODES).map(([code, name]) => ({ code, name })),
  });
});

/**
 * Build a payment batch from a posted payroll run.
 *
 * Refuses if any payee is missing bank details rather than quietly paying the
 * others: a partial salary run is worse than none, because the people left out
 * are the ones who will not notice until payday.
 */
router.post('/payroll/runs/:id/payment-batch', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const runRes = await db.query(`SELECT * FROM payroll_runs WHERE id = $1`, [req.params.id]);
    const run = runRes.rows[0];
    if (!run) return res.status(404).json({ success: false, error: 'Payroll run not found' });
    if (run.status !== 'posted') {
      return bad(res, 'Post the run to the general ledger before paying it');
    }

    const existing = await db.query(
      `SELECT id, reference, status FROM payroll_payment_batches
        WHERE payroll_run_id = $1 AND status <> 'cancelled'`,
      [run.id]
    );
    if (existing.rows[0]) {
      return res.status(409).json({
        success: false,
        error: `A payment batch already exists for ${run.period} (${existing.rows[0].reference}, ${existing.rows[0].status})`,
      });
    }

    const payees = await db.query(
      `SELECT i.id AS payroll_item_id, i.staff_id, i.staff_name, i.net_salary,
              s.bank_code, s.bank_branch_code, s.bank_account_number, s.bank_account_name
         FROM payroll_items i
         JOIN staff s ON s.staff_id = i.staff_id
        WHERE i.payroll_run_id = $1
        ORDER BY i.staff_id`,
      [run.id]
    );
    if (payees.rows.length === 0) return bad(res, 'That run has no payslips');

    const missing = payees.rows
      .filter((p: any) => !p.bank_account_number || !p.bank_code)
      .map((p: any) => `${p.staff_id} ${p.staff_name}`);
    if (missing.length > 0) {
      return res.status(422).json({
        success: false,
        error: `Missing bank details for ${missing.length} staff member${missing.length === 1 ? '' : 's'}. Add them before paying anyone, so nobody is left out of the run.`,
        missing,
      });
    }

    const badCodes = payees.rows
      .filter((p: any) => !SG_BANK_CODES[String(p.bank_code).trim()])
      .map((p: any) => `${p.staff_id}: bank code "${p.bank_code}"`);
    if (badCodes.length > 0) {
      return res.status(422).json({
        success: false,
        error: 'Unrecognised bank code — the bank would reject these lines',
        missing: badCodes,
      });
    }

    const zeroOrNegative = payees.rows.filter((p: any) => Number(p.net_salary) <= 0);
    if (zeroOrNegative.length > 0) {
      return bad(res, `${zeroOrNegative.length} payslip(s) have no net pay — review the run before paying it`);
    }

    const total = round2(payees.rows.reduce((sum: number, p: any) => sum + Number(p.net_salary), 0));
    const valueDate = req.body?.value_date || run.payment_date || iso(new Date());
    const seq = await db.query(
      `SELECT COUNT(*) + 1 AS n FROM payroll_payment_batches WHERE reference LIKE $1`,
      [`PAY-${run.period}-%`]
    );
    const reference = `PAY-${run.period}-${String(seq.rows[0].n).padStart(3, '0')}`;

    await client.query('BEGIN');
    const batchRes = await client.query(
      `INSERT INTO payroll_payment_batches
         (payroll_run_id, reference, value_date, item_count, total_amount, created_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [run.id, reference, valueDate, payees.rows.length, total, uid(req), req.body?.notes || null]
    );
    const batch = batchRes.rows[0];

    for (const p of payees.rows) {
      await client.query(
        `INSERT INTO payroll_payment_items
           (batch_id, payroll_item_id, staff_id, staff_name, bank_code, bank_branch_code,
            bank_account_number, bank_account_name, amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          batch.id, p.payroll_item_id, p.staff_id, p.staff_name,
          String(p.bank_code).trim(), p.bank_branch_code,
          String(p.bank_account_number).replace(/[^0-9]/g, ''),
          p.bank_account_name || p.staff_name,
          round2(Number(p.net_salary)),
        ]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, batch: normaliseDates([batch])[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[finance] create payment batch failed:', err);
    res.status(500).json({ success: false, error: 'Failed to create payment batch' });
  } finally {
    client.release();
  }
});

/** Account numbers are masked on the way out; the export is the exception. */
const maskAccount = (value: unknown): string => {
  const s = String(value || '');
  if (s.length <= 4) return s ? '*'.repeat(s.length) : '';
  return '*'.repeat(s.length - 4) + s.slice(-4);
};

router.get('/payment-batches', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT b.*, r.period,
              cu.display_name AS created_by_name,
              au.display_name AS approved_by_name
         FROM payroll_payment_batches b
         JOIN payroll_runs r ON r.id = b.payroll_run_id
         LEFT JOIN users cu ON cu.id = b.created_by
         LEFT JOIN users au ON au.id = b.approved_by
        ORDER BY b.created_at DESC`
    );
    res.json({ success: true, batches: normaliseDates(result.rows) });
  } catch (err) {
    console.error('[finance] list payment batches failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load payment batches' });
  }
});

router.get('/payment-batches/:id', async (req: Request, res: Response) => {
  try {
    const batch = await db.query(
      `SELECT b.*, r.period FROM payroll_payment_batches b
         JOIN payroll_runs r ON r.id = b.payroll_run_id WHERE b.id = $1`,
      [req.params.id]
    );
    if (!batch.rows[0]) return res.status(404).json({ success: false, error: 'Batch not found' });
    const items = await db.query(
      `SELECT * FROM payroll_payment_items WHERE batch_id = $1 ORDER BY staff_id`,
      [req.params.id]
    );
    res.json({
      success: true,
      batch: normaliseDates(batch.rows)[0],
      items: items.rows.map((i: any) => ({
        ...i,
        bank_account_number: maskAccount(i.bank_account_number),
      })),
    });
  } catch (err) {
    console.error('[finance] get payment batch failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load payment batch' });
  }
});

/**
 * Maker-checker: the admin who built the batch cannot approve it. This is the
 * single most effective control against both fraud and fat fingers, and it is
 * enforced here rather than in the UI so it cannot be clicked around.
 */
router.patch('/payment-batches/:id/approve', async (req: Request, res: Response) => {
  try {
    const me = uid(req);
    const batch = await db.query(
      `SELECT * FROM payroll_payment_batches WHERE id = $1`, [req.params.id]
    );
    const b = batch.rows[0];
    if (!b) return res.status(404).json({ success: false, error: 'Batch not found' });
    if (b.status !== 'awaiting_approval') {
      return res.status(409).json({ success: false, error: `Batch is already ${b.status}` });
    }
    if (b.created_by && me && b.created_by === me) {
      return res.status(403).json({
        success: false,
        error: 'You created this batch, so someone else has to approve it. Two pairs of eyes before money moves.',
      });
    }
    const updated = await db.query(
      `UPDATE payroll_payment_batches
          SET status = 'approved', approved_by = $1, approved_at = NOW()
        WHERE id = $2 AND status = 'awaiting_approval' RETURNING *`,
      [me, req.params.id]
    );
    res.json({ success: true, batch: normaliseDates(updated.rows)[0] });
  } catch (err) {
    console.error('[finance] approve payment batch failed:', err);
    res.status(500).json({ success: false, error: 'Failed to approve batch' });
  }
});

router.patch('/payment-batches/:id/cancel', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `UPDATE payroll_payment_batches
          SET status = 'cancelled', notes = COALESCE($1, notes)
        WHERE id = $2 AND status IN ('awaiting_approval','approved') RETURNING *`,
      [req.body?.reason || null, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(409).json({
        success: false,
        error: 'Only an unexported batch can be cancelled — once the file is with the bank, cancel it there',
      });
    }
    res.json({ success: true, batch: normaliseDates(result.rows)[0] });
  } catch (err) {
    console.error('[finance] cancel payment batch failed:', err);
    res.status(500).json({ success: false, error: 'Failed to cancel batch' });
  }
});

/**
 * The bank file. CSV carrying every field a Singapore bulk credit needs, with
 * a control row so the uploader can check the count and total against what the
 * bank reports back before authorising.
 *
 * Column layout differs slightly between DBS IDEAL, OCBC Velocity and UOB
 * BIBPlus; this is the superset, and each bank's template maps straight from
 * it. Ask your bank for their current specification before the first live run —
 * they change, and a rejected file on payday is a bad way to find out.
 */
router.get('/payment-batches/:id/export', async (req: Request, res: Response) => {
  try {
    const batchRes = await db.query(
      `SELECT b.*, r.period FROM payroll_payment_batches b
         JOIN payroll_runs r ON r.id = b.payroll_run_id WHERE b.id = $1`,
      [req.params.id]
    );
    const batch = batchRes.rows[0];
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });
    if (!['approved', 'exported', 'settled'].includes(batch.status)) {
      return res.status(409).json({
        success: false,
        error: 'This batch has not been approved yet — it cannot be sent to the bank',
      });
    }

    const items = await db.query(
      `SELECT * FROM payroll_payment_items WHERE batch_id = $1 ORDER BY staff_id`,
      [req.params.id]
    );

    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows: (string | number)[][] = [
      ['Record Type', 'Payee Name', 'Bank Code', 'Branch Code', 'Account Number',
       'Amount (SGD)', 'Value Date', 'Reference', 'Payment Description'],
    ];
    for (const i of items.rows) {
      rows.push([
        'PAYMENT',
        i.bank_account_name || i.staff_name,
        i.bank_code || '',
        i.bank_branch_code || '',
        i.bank_account_number || '',
        Number(i.amount).toFixed(2),
        dateOnly(batch.value_date) || '',
        `${batch.reference}/${i.staff_id}`,
        `Salary ${batch.period}`,
      ]);
    }
    // Control total: what the bank should report back.
    rows.push(['CONTROL', `${items.rows.length} payments`, '', '', '',
      Number(batch.total_amount).toFixed(2), dateOnly(batch.value_date) || '',
      batch.reference, `Salary ${batch.period}`]);

    const csv = rows.map(r => r.map(esc).join(',')).join('\r\n');

    // Record who took the full account numbers, before handing them over.
    await db.query(
      `INSERT INTO payroll_export_audit (batch_id, exported_by, format, item_count, total_amount)
       VALUES ($1,$2,'bank-bulk-csv',$3,$4)`,
      [batch.id, uid(req), items.rows.length, batch.total_amount]
    );
    if (batch.status === 'approved') {
      await db.query(
        `UPDATE payroll_payment_batches
            SET status = 'exported', exported_by = $1, exported_at = NOW()
          WHERE id = $2`,
        [uid(req), batch.id]
      );
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${batch.reference}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('[finance] export payment batch failed:', err);
    res.status(500).json({ success: false, error: 'Failed to export payment file' });
  }
});

/**
 * Record what the bank actually did. This is the point the liability clears:
 * payslips become 'paid', and a journal moves the money out of Net Salaries
 * Payable. Until the bank confirms, the money is still owed.
 */
router.patch('/payment-batches/:id/settle', async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const bankReference = String(req.body?.bank_reference || '').trim();
    if (!bankReference) {
      return bad(res, "The bank's reference for the batch is required — it is the evidence the payment went out");
    }
    const failedIds: number[] = Array.isArray(req.body?.failed_item_ids)
      ? req.body.failed_item_ids.map((v: unknown) => Number(v)).filter(Boolean)
      : [];

    await client.query('BEGIN');
    const batchRes = await client.query(
      `SELECT b.*, r.period FROM payroll_payment_batches b
         JOIN payroll_runs r ON r.id = b.payroll_run_id
        WHERE b.id = $1 FOR UPDATE OF b`,
      [req.params.id]
    );
    const batch = batchRes.rows[0];
    if (!batch) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    if (batch.status !== 'exported') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'Export the file to the bank before recording settlement',
      });
    }

    if (failedIds.length > 0) {
      await client.query(
        `UPDATE payroll_payment_items
            SET status = 'failed', failure_reason = $1
          WHERE batch_id = $2 AND id = ANY($3::int[])`,
        [req.body?.failure_reason || 'Rejected by bank', batch.id, failedIds]
      );
    }
    await client.query(
      `UPDATE payroll_payment_items SET status = 'paid'
        WHERE batch_id = $1 AND status = 'pending'`,
      [batch.id]
    );

    const paid = await client.query(
      `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS n
         FROM payroll_payment_items WHERE batch_id = $1 AND status = 'paid'`,
      [batch.id]
    );
    const paidTotal = round2(Number(paid.rows[0].total));

    // Only the payslips that actually got paid.
    await client.query(
      `UPDATE payroll_items SET status = 'paid'
        WHERE id IN (SELECT payroll_item_id FROM payroll_payment_items
                      WHERE batch_id = $1 AND status = 'paid' AND payroll_item_id IS NOT NULL)`,
      [batch.id]
    );

    // Dr Net Salaries Payable / Cr Bank — the liability the GL posting raised
    // is now discharged for the amount that left the account.
    if (paidTotal > 0 && !batch.gl_entry_posted) {
      const entryDate = dateOnly(batch.value_date) || iso(new Date());
      for (const [code, name, debit, credit] of [
        ['2000', 'Net Salaries Payable', paidTotal, 0],
        ['1010', 'Bank', 0, paidTotal],
      ] as [string, string, number, number][]) {
        await client.query(
          `INSERT INTO finance_gl_entries
             (entry_date, account_code, account_name, debit, credit, description, source_type, source_id, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,'payroll',$7,$8)`,
          [entryDate, code, name, debit, credit,
           `Salary payment ${batch.reference} (bank ref ${bankReference})`,
           batch.payroll_run_id, uid(req)]
        );
      }
    }

    const updated = await client.query(
      `UPDATE payroll_payment_batches
          SET status = 'settled', settled_at = NOW(), settled_by = $1,
              bank_reference = $2, gl_entry_posted = true
        WHERE id = $3 RETURNING *`,
      [uid(req), bankReference, batch.id]
    );
    await client.query('COMMIT');

    res.json({
      success: true,
      batch: normaliseDates(updated.rows)[0],
      paid_count: Number(paid.rows[0].n),
      paid_total: paidTotal,
      failed_count: failedIds.length,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[finance] settle payment batch failed:', err);
    res.status(500).json({ success: false, error: 'Failed to record settlement' });
  } finally {
    client.release();
  }
});

/** Who is not payable yet, so it can be fixed before payday rather than on it. */
router.get('/payroll/bank-readiness', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT staff_id, first_name || ' ' || last_name AS staff_name, status,
              bank_account_name, bank_code, bank_branch_code,
              (bank_account_number IS NOT NULL AND bank_code IS NOT NULL) AS ready,
              CASE WHEN bank_account_number IS NULL THEN NULL
                   ELSE repeat('*', GREATEST(length(bank_account_number) - 4, 0))
                        || right(bank_account_number, 4) END AS account_masked
         FROM staff
        WHERE status = 'active'
        ORDER BY ready, staff_id`
    );
    const rows = result.rows.map((r: any) => ({
      ...r,
      bank_name: r.bank_code ? SG_BANK_CODES[String(r.bank_code).trim()] || 'Unrecognised bank code' : null,
    }));
    res.json({
      success: true,
      staff: rows,
      ready_count: rows.filter((r: any) => r.ready).length,
      blocked_count: rows.filter((r: any) => !r.ready).length,
    });
  } catch (err) {
    console.error('[finance] bank readiness failed:', err);
    res.status(500).json({ success: false, error: 'Failed to check bank readiness' });
  }
});

// ===========================================================================
// Leave → payroll deductions
// ===========================================================================

/**
 * Approved leave, with the unpaid days priced against the staff member's own
 * daily gross rate of pay. Only unpaid leave produces a deduction — paid leave
 * is already in the salary, and deducting for it would be an underpayment.
 *
 * Two things this counts carefully:
 *  - WORKING days, not calendar days. Leave from Friday to Monday is two days
 *    of pay, not four; the old count charged for the weekend.
 *  - Public holidays inside the range are excluded too — a monthly-rated
 *    employee is paid for a gazetted holiday whether or not they are on leave.
 */
router.get('/leave-deductions', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || iso(new Date()).slice(0, 7);
    const leaves = await db.query(
      `SELECT l.id, l.staff_id, l.staff_name, l.leave_type, l.start_date, l.end_date, l.status,
              (l.end_date - l.start_date + 1) AS calendar_days,
              ${WORKING_DAYS_SQL} AS days,
              COALESCE(sal.base_salary, s.base_salary, 0) AS base_salary,
              ${OTHER_ALLOWANCES_SQL} AS other_allowances,
              d.id AS deduction_id, d.amount AS deduction_amount, d.status AS deduction_status
         FROM leave_requests l
         JOIN staff s ON s.staff_id = l.staff_id
         LEFT JOIN staff_salary sal ON sal.staff_id = l.staff_id
         LEFT JOIN finance_payroll_deductions d ON d.leave_request_id = l.id
        WHERE l.status = 'approved'
          AND to_char(l.start_date, 'YYYY-MM') = $1
        ORDER BY l.start_date DESC`,
      [period]
    );

    const rows = leaves.rows.map((l: any) => {
      const days = Number(l.days) || 0;
      const dailyRate = dailyGrossRate(Number(l.base_salary), Number(l.other_allowances));
      const unpaid = isUnpaidLeave(l.leave_type);
      return {
        ...l,
        days,
        calendar_days: Number(l.calendar_days) || 0,
        daily_rate: dailyRate,
        is_unpaid: unpaid,
        suggested_deduction: unpaid ? round2(dailyRate * days) : 0,
      };
    });
    res.json({ success: true, leaves: normaliseDates(rows), period });
  } catch (err) {
    console.error('[finance] leave deductions failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load leave data' });
  }
});

router.post('/leave-deductions', async (req: Request, res: Response) => {
  try {
    const leaveId = num(req.body?.leave_request_id);
    if (!leaveId) return bad(res, 'leave_request_id is required');

    const leave = await db.query(
      `SELECT l.*, ${WORKING_DAYS_SQL} AS days,
              COALESCE(sal.base_salary, s.base_salary, 0) AS base_salary,
              ${OTHER_ALLOWANCES_SQL} AS other_allowances
         FROM leave_requests l
         JOIN staff s ON s.staff_id = l.staff_id
         LEFT JOIN staff_salary sal ON sal.staff_id = l.staff_id
        WHERE l.id = $1`,
      [leaveId]
    );
    const l = leave.rows[0];
    if (!l) return res.status(404).json({ success: false, error: 'Leave request not found' });
    if (l.status !== 'approved') return bad(res, 'Only approved leave can be deducted');
    if (!isUnpaidLeave(l.leave_type)) {
      return bad(res, 'Paid leave does not require a deduction');
    }

    const days = Number(l.days) || 0;
    if (days <= 0) {
      return bad(res, 'That leave covers no working days, so there is nothing to deduct');
    }
    const dailyRate = dailyGrossRate(Number(l.base_salary), Number(l.other_allowances));
    const amount = round2(dailyRate * days);
    const period = (dateOnly(l.start_date) as string).slice(0, 7);

    const result = await db.query(
      `INSERT INTO finance_payroll_deductions
         (leave_request_id, staff_id, period, unpaid_days, daily_rate, amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (leave_request_id) DO NOTHING
       RETURNING *`,
      [leaveId, l.staff_id, period, days, dailyRate, amount, uid(req)]
    );
    if (!result.rows[0]) {
      return res.status(409).json({ success: false, error: 'A deduction already exists for this leave' });
    }
    res.status(201).json({ success: true, deduction: result.rows[0] });
  } catch (err) {
    console.error('[finance] create leave deduction failed:', err);
    res.status(500).json({ success: false, error: 'Failed to create deduction' });
  }
});

router.get('/payroll-deductions', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT d.*, s.first_name || ' ' || s.last_name AS staff_name, l.leave_type,
              l.start_date, l.end_date
         FROM finance_payroll_deductions d
         JOIN staff s ON s.staff_id = d.staff_id
         JOIN leave_requests l ON l.id = d.leave_request_id
        ORDER BY d.created_at DESC`
    );
    res.json({ success: true, deductions: normaliseDates(result.rows) });
  } catch (err) {
    console.error('[finance] list deductions failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load deductions' });
  }
});

// ===========================================================================
// AP invoices (expense claim → accounts payable)
// ===========================================================================

router.get('/ap-invoices', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT i.*, c.claim_number FROM finance_ap_invoices i
         LEFT JOIN finance_expense_claims c ON c.id = i.claim_id
        ORDER BY i.invoice_date DESC, i.id DESC`
    );
    res.json({ success: true, invoices: normaliseDates(result.rows) });
  } catch (err) {
    console.error('[finance] list AP invoices failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load AP invoices' });
  }
});

router.post('/ap-invoices', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const claimId = b.claim_id ? num(b.claim_id) : null;
    let vendor = b.vendor;
    let amount = num(b.amount);
    let description = b.description || null;
    let invoiceDate = b.invoice_date || iso(new Date());

    if (claimId) {
      const claim = await db.query(`SELECT * FROM finance_expense_claims WHERE id = $1`, [claimId]);
      const c = claim.rows[0];
      if (!c) return res.status(404).json({ success: false, error: 'Claim not found' });
      if (c.status === 'draft' || c.status === 'rejected') {
        return bad(res, 'Only a live claim can be raised as an AP invoice');
      }
      vendor = vendor || c.receipt_extracted_vendor;
      amount = amount || Number(c.amount);
      description = description || `Expense claim ${c.claim_number} — ${c.purpose}`;
      invoiceDate = b.invoice_date || (dateOnly(c.claim_date) as string);
    }
    if (!vendor) return bad(res, 'Vendor is required to raise an AP invoice');
    if (!amount || amount <= 0) return bad(res, 'Amount must be greater than zero');

    const year = new Date().getFullYear();
    const seq = await db.query(
      `SELECT COUNT(*) + 1 AS n FROM finance_ap_invoices WHERE invoice_number LIKE $1`,
      [`AP-${year}-%`]
    );
    const invoiceNumber = `AP-${year}-${String(seq.rows[0].n).padStart(4, '0')}`;
    const dueDate = b.due_date || iso(addDays(parseDateOnly(invoiceDate), 30));

    const result = await db.query(
      `INSERT INTO finance_ap_invoices
         (invoice_number, vendor, amount, invoice_date, due_date, claim_id, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [invoiceNumber, vendor, amount, invoiceDate, dueDate, claimId, description, uid(req)]
    );
    res.status(201).json({ success: true, invoice: normaliseDates(result.rows)[0] });
  } catch (err: any) {
    if (err?.code === '23505') {
      return res.status(409).json({ success: false, error: 'An AP invoice already exists for this claim' });
    }
    console.error('[finance] create AP invoice failed:', err);
    res.status(500).json({ success: false, error: 'Failed to create AP invoice' });
  }
});

// ===========================================================================
// Staff cost vs budget
// ===========================================================================

router.get('/staff-costs', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || iso(new Date()).slice(0, 7);
    const staff = await db.query(
      `SELECT s.staff_id, s.first_name || ' ' || s.last_name AS staff_name,
              s.department, s.position, s.status, s.date_of_birth, s.cpf_status,
              COALESCE(sal.base_salary, s.base_salary, 0) AS base_salary,
              COALESCE((SELECT SUM(a.amount) FROM staff_allowances a
                         WHERE a.staff_salary_id = sal.id), 0) AS allowances
         FROM staff s
         LEFT JOIN staff_salary sal ON sal.staff_id = s.staff_id
        WHERE s.status = 'active'
        ORDER BY s.department, s.staff_id`
    );

    const rows = staff.rows.map((s: any) => {
      const base = Number(s.base_salary);
      const allowances = Number(s.allowances);
      // A cost report should still render for someone whose CPF profile is
      // incomplete — it says so rather than failing the whole page.
      let employerCpf = 0;
      let cpfNote: string | null = null;
      try {
        employerCpf = calculateCPF({
          ordinaryWage: base + allowances,
          dateOfBirth: s.date_of_birth,
          cpfStatus: s.cpf_status,
          period,
        }).employerTotal;
      } catch (e) {
        cpfNote = e instanceof Error ? e.message : 'CPF could not be computed';
      }
      return {
        ...s,
        base_salary: round2(base),
        allowances: round2(allowances),
        cpf_employer: employerCpf,
        cpf_note: cpfNote,
        monthly_cost: round2(base + allowances + employerCpf),
      };
    });

    const byDept = new Map<string, number>();
    for (const r of rows) {
      const d = r.department || 'Unassigned';
      byDept.set(d, round2((byDept.get(d) || 0) + r.monthly_cost));
    }

    const budgets = await db.query(
      `SELECT b.department, b.total_budget,
              COALESCE((SELECT SUM(a.allocated) FROM finance_budget_allocations a
                         WHERE a.budget_id = b.id
                           AND (lower(a.category) LIKE '%salar%' OR lower(a.category) LIKE '%staff%'
                                OR lower(a.category) LIKE '%payroll%')), 0) AS staff_allocation
         FROM finance_budgets b
        WHERE b.period = $1 AND b.approval_status = 'approved'`,
      [period]
    );

    /**
     * Compare staff cost against the budget's STAFF line, not its total. Falling
     * back to the whole departmental budget made staff look comfortably funded
     * out of money earmarked for rent and utilities. A department with no staff
     * line reports zero allocated, which is the honest answer — the spend has no
     * budget behind it — and the screen flags it rather than hiding it.
     */
    const allocations = budgets.rows.map((b: any) => {
      const allocated = round2(Number(b.staff_allocation));
      const actual = round2(byDept.get(b.department) || 0);
      return {
        department: b.department,
        allocated,
        actual,
        variance: round2(allocated - actual),
        utilisation: allocated > 0 ? round2((actual / allocated) * 100) : 0,
        has_staff_line: allocated > 0,
        total_budget: round2(Number(b.total_budget)),
      };
    });

    res.json({ success: true, period, staff: rows, allocations });
  } catch (err) {
    console.error('[finance] staff costs failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load staff costs' });
  }
});

// ===========================================================================
// Reports
// ===========================================================================

router.get('/reports/profit-loss', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || iso(new Date()).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(period)) return bad(res, 'Period must be YYYY-MM');
    res.json({ success: true, report: await buildProfitAndLoss(period) });
  } catch (err) {
    console.error('[finance] P&L failed:', err);
    res.status(500).json({ success: false, error: 'Failed to build P&L' });
  }
});

/**
 * Monthly revenue, expenses and net for a rolling window, for the trend chart.
 * The chart it feeds had ten hardcoded polyline coordinates labelled Jan–Oct.
 */
router.get('/reports/trend', async (req: Request, res: Response) => {
  try {
    const months = Math.min(Math.max(num(req.query.months, 12), 1), 36);
    const result = await db.query(
      `WITH periods AS (
         SELECT to_char(d, 'YYYY-MM') AS period
           FROM generate_series(
                  date_trunc('month', CURRENT_DATE) - ($1::int - 1) * INTERVAL '1 month',
                  date_trunc('month', CURRENT_DATE),
                  INTERVAL '1 month') AS d
       )
       SELECT p.period,
              COALESCE((SELECT SUM(amount) FROM finance_income i
                         WHERE to_char(i.entry_date, 'YYYY-MM') = p.period), 0) AS revenue,
              COALESCE((SELECT SUM(amount) FROM finance_expenses e
                         WHERE e.approval_status = 'approved'
                           AND to_char(e.entry_date, 'YYYY-MM') = p.period), 0) AS expenses
         FROM periods p
        ORDER BY p.period`,
      [months]
    );
    res.json({
      success: true,
      trend: result.rows.map((r: any) => ({
        period: r.period,
        revenue: round2(Number(r.revenue)),
        expenses: round2(Number(r.expenses)),
        net: round2(Number(r.revenue) - Number(r.expenses)),
      })),
    });
  } catch (err) {
    console.error('[finance] trend failed:', err);
    res.status(500).json({ success: false, error: 'Failed to build trend' });
  }
});

router.get('/reports/balance-sheet', async (req: Request, res: Response) => {
  try {
    const asOf = (req.query.as_of as string) || iso(new Date());
    res.json({ success: true, report: await buildBalanceSheet(asOf) });
  } catch (err) {
    console.error('[finance] balance sheet failed:', err);
    res.status(500).json({ success: false, error: 'Failed to build balance sheet' });
  }
});

router.get('/reports/cash-flow', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || iso(new Date()).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(period)) return bad(res, 'Period must be YYYY-MM');
    res.json({ success: true, report: await buildCashFlow(period) });
  } catch (err) {
    console.error('[finance] cash flow failed:', err);
    res.status(500).json({ success: false, error: 'Failed to build cash flow' });
  }
});

/**
 * Live record counts per module, for the HR ↔ Accounts overview.
 *
 * The screen this feeds used to show a "sync health" percentage and a "last
 * synced 2 mins ago" per module. There is no sync — HR and Accounts read the
 * same database — so the honest figure is how many rows each module actually
 * holds and how many of them are waiting on someone.
 */
router.get('/module-status', async (_req: Request, res: Response) => {
  try {
    const r = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM finance_income) AS income_rows,
         (SELECT COUNT(*) FROM finance_expenses) AS expense_rows,
         (SELECT COUNT(*) FROM finance_expenses WHERE approval_status = 'pending') AS expense_pending,
         (SELECT COUNT(*) FROM staff) AS staff_rows,
         (SELECT COUNT(*) FROM payroll_items) AS payslip_rows,
         (SELECT COUNT(*) FROM payroll_runs WHERE status = 'generated') AS payroll_pending,
         (SELECT COUNT(*) FROM leave_requests) AS leave_rows,
         (SELECT COUNT(*) FROM leave_requests WHERE status = 'pending') AS leave_pending,
         (SELECT COUNT(*) FROM finance_expense_claims) AS claim_rows,
         (SELECT COUNT(*) FROM finance_expense_claims
           WHERE status IN ('submitted','manager-approved','accounts-reviewed')) AS claim_pending,
         (SELECT COUNT(*) FROM finance_budgets) AS budget_rows,
         (SELECT COUNT(*) FROM finance_budgets WHERE approval_status = 'pending') AS budget_pending,
         (SELECT COUNT(*) FROM finance_gl_entries) AS gl_rows,
         (SELECT COUNT(*) FROM finance_ap_invoices) AS ap_rows,
         (SELECT COUNT(*) FROM finance_ap_invoices WHERE status = 'pending') AS ap_pending`
    );
    const m = r.rows[0];
    const mod = (name: string, records: unknown, pending: unknown = 0) => ({
      name,
      records: Number(records),
      pending: Number(pending),
    });
    res.json({
      success: true,
      modules: [
        mod('Income & Expenses', Number(m.income_rows) + Number(m.expense_rows), m.expense_pending),
        mod('Staff (HR)', m.staff_rows),
        mod('Payroll', m.payslip_rows, m.payroll_pending),
        mod('Leave', m.leave_rows, m.leave_pending),
        mod('Expense Claims', m.claim_rows, m.claim_pending),
        mod('Budgets', m.budget_rows, m.budget_pending),
        mod('General Ledger', m.gl_rows),
        mod('Accounts Payable', m.ap_rows, m.ap_pending),
      ],
    });
  } catch (err) {
    console.error('[finance] module status failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load module status' });
  }
});

/**
 * Recent finance activity across the module, newest first. Replaces a list of
 * five hardcoded "sync" log lines that described a process that does not exist.
 */
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(num(req.query.limit, 20), 1), 100);
    const result = await db.query(
      `(SELECT 'Income'::text AS module,
               'Recorded ' || source AS action,
               created_at AS at, 1 AS records, 'success'::text AS status
          FROM finance_income ORDER BY created_at DESC LIMIT $1)
       UNION ALL
       (SELECT 'Expenses',
               CASE approval_status
                 WHEN 'approved' THEN 'Approved ' || category
                 WHEN 'rejected' THEN 'Rejected ' || category
                 ELSE 'Recorded ' || category END,
               COALESCE(approval_date, created_at), 1,
               CASE approval_status WHEN 'pending' THEN 'pending'
                                    WHEN 'rejected' THEN 'error'
                                    ELSE 'success' END
          FROM finance_expenses ORDER BY COALESCE(approval_date, created_at) DESC LIMIT $1)
       UNION ALL
       (SELECT 'Expense Claims',
               claim_number || ' — ' || status,
               updated_at, 1,
               CASE status WHEN 'reimbursed' THEN 'success'
                           WHEN 'rejected' THEN 'error'
                           ELSE 'pending' END
          FROM finance_expense_claims ORDER BY updated_at DESC LIMIT $1)
       UNION ALL
       (SELECT 'Payroll',
               'Payroll ' || period || ' ' || status,
               COALESCE(posted_at, generated_at),
               (SELECT COUNT(*) FROM payroll_items i WHERE i.payroll_run_id = r.id),
               CASE status WHEN 'posted' THEN 'success' ELSE 'pending' END
          FROM payroll_runs r ORDER BY COALESCE(posted_at, generated_at) DESC LIMIT $1)
       UNION ALL
       (SELECT 'Budgets',
               budget_number || ' ' || approval_status,
               COALESCE(approval_date, created_at), 1,
               CASE approval_status WHEN 'approved' THEN 'success'
                                    WHEN 'rejected' THEN 'error'
                                    ELSE 'pending' END
          FROM finance_budgets ORDER BY COALESCE(approval_date, created_at) DESC LIMIT $1)
       ORDER BY at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ success: true, activity: result.rows });
  } catch (err) {
    console.error('[finance] activity failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load activity' });
  }
});

/** Cross-module KPIs for the HR ↔ Accounts overview screens. */
router.get('/integration-metrics', async (_req: Request, res: Response) => {
  try {
    const r = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM staff WHERE status = 'active') AS active_staff,
         (SELECT COUNT(*) FROM staff) AS total_staff,
         (SELECT COUNT(*) FROM leave_requests WHERE status = 'pending') AS pending_leave,
         (SELECT COUNT(*) FROM leave_requests
           WHERE status = 'approved' AND to_char(start_date,'YYYY-MM') = to_char(CURRENT_DATE,'YYYY-MM')) AS leave_this_month,
         (SELECT COUNT(*) FROM job_openings WHERE status = 'open') AS open_roles,
         (SELECT COALESCE(SUM(COALESCE(sal.base_salary, s.base_salary, 0)),0)
            FROM staff s LEFT JOIN staff_salary sal ON sal.staff_id = s.staff_id
           WHERE s.status = 'active') AS monthly_payroll,
         (SELECT COUNT(*) FROM finance_expense_claims WHERE status IN ('submitted','manager-approved')) AS claims_pending,
         (SELECT COALESCE(SUM(amount),0) FROM finance_expense_claims
           WHERE status IN ('submitted','manager-approved','accounts-reviewed')) AS claims_pending_value,
         (SELECT COUNT(*) FROM finance_expenses WHERE approval_status = 'pending') AS expenses_pending,
         (SELECT COUNT(*) FROM finance_budgets WHERE approval_status = 'pending') AS budgets_pending,
         (SELECT COUNT(*) FROM payroll_runs WHERE status = 'generated') AS payroll_unposted,
         (SELECT MAX(period) FROM payroll_runs) AS latest_payroll_period`
    );
    const m = r.rows[0];
    res.json({
      success: true,
      metrics: {
        activeStaff: Number(m.active_staff),
        totalStaff: Number(m.total_staff),
        pendingLeave: Number(m.pending_leave),
        leaveThisMonth: Number(m.leave_this_month),
        openRoles: Number(m.open_roles),
        monthlyPayroll: round2(Number(m.monthly_payroll)),
        claimsPending: Number(m.claims_pending),
        claimsPendingValue: round2(Number(m.claims_pending_value)),
        expensesPending: Number(m.expenses_pending),
        budgetsPending: Number(m.budgets_pending),
        payrollUnposted: Number(m.payroll_unposted),
        latestPayrollPeriod: m.latest_payroll_period,
      },
    });
  } catch (err) {
    console.error('[finance] integration metrics failed:', err);
    res.status(500).json({ success: false, error: 'Failed to load metrics' });
  }
});

export default router;
