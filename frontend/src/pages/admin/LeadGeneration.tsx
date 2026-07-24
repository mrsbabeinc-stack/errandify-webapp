import { useCallback, useEffect, useMemo, useState } from 'react';
import leadsAPI, {
  type CategoryGap,
  type Lead,
  type LeadStage,
  type LeadStats,
  type NewLead,
  type SupplyGap,
  type UnfilledErrand,
} from '../../services/leadsAPI';

/**
 * Lead Generation.
 *
 * The worklist is the landing tab on purpose. Recruiting "doers" in the
 * abstract does not move a fill rate — the errands nobody offered on say which
 * trade to call and what the job pays, which is the only opening line that
 * works on a busy tradesman. The pipeline tab is where those calls get
 * recorded so they stop living in a notebook.
 */

const ORANGE = '#FF6B35';
const ORANGE_TINT = '#FFF3E0';

const STAGES: LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'invited',
  'signed_up',
  'converted',
  'disqualified',
];

const STAGE_LABEL: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  invited: 'Invited',
  signed_up: 'Signed up',
  converted: 'Converted',
  disqualified: 'Disqualified',
};

const STAGE_COLOUR: Record<LeadStage, string> = {
  new: '#6B7280',
  contacted: '#B5651D',
  qualified: '#E2736B',
  invited: '#D97706',
  signed_up: '#059669',
  converted: '#047857',
  disqualified: '#9CA3AF',
};

const SOURCES = [
  { value: 'admin', label: 'Founder call' },
  { value: 'interest_form', label: 'Interest form' },
  { value: 'referral', label: 'Referral' },
  { value: 'partner', label: 'Partner organisation' },
  { value: 'directory', label: 'Public business listing' },
  { value: 'landing', label: 'Landing page' },
  { value: 'qr', label: 'QR / poster' },
  { value: 'event', label: 'Event' },
];

const prettyCategory = (c: string | null) =>
  (c || '—').replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

const money = (v: string | number | null | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `$${n.toFixed(0)}` : '—';
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  padding: '16px',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  borderBottom: '1px solid #E5E7EB',
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: '14px',
  borderBottom: '1px solid #F3F4F6',
  verticalAlign: 'top',
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #D1D5DB',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const primaryButton: React.CSSProperties = {
  background: ORANGE,
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '9px 16px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const ghostButton: React.CSSProperties = {
  background: '#fff',
  color: '#374151',
  border: '1px solid #D1D5DB',
  borderRadius: '6px',
  padding: '8px 14px',
  fontSize: '14px',
  cursor: 'pointer',
};

function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#fff',
        background: STAGE_COLOUR[stage],
        whiteSpace: 'nowrap',
      }}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}

export default function LeadGeneration() {
  const [tab, setTab] = useState<'worklist' | 'pipeline'>('worklist');
  const [gap, setGap] = useState<SupplyGap | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({ stage: '', lead_type: '', q: '' });
  const [addFor, setAddFor] = useState<UnfilledErrand | 'blank' | null>(null);
  const [detail, setDetail] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, s, l] = await Promise.all([
        leadsAPI.supplyGap(),
        leadsAPI.stats(),
        leadsAPI.list(filters),
      ]);
      setGap(g);
      setStats(s);
      setLeads(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () => (gap?.byCategory ?? []).map((c) => c.category).filter(Boolean),
    [gap]
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Lead Generation</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', margin: '4px 0 0' }}>
          Supply-side recruitment — where demand is going unmet, and who you have called about it.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* ---------------------------------------------------------- tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {[
          { label: 'Open, no offers', value: gap?.stillOpen ?? 0, accent: true },
          { label: 'Expired with no offers', value: gap?.expired ?? 0 },
          { label: 'Leads in pipeline', value: stats?.total ?? 0 },
          { label: 'Converted', value: stats?.converted ?? 0 },
        ].map((t) => (
          <div key={t.label} style={{ ...card, background: t.accent ? ORANGE_TINT : '#fff' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>{t.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: t.accent ? ORANGE : '#111827' }}>
              {t.value}
            </div>
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------------- tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #E5E7EB', marginBottom: '20px' }}>
        {([
          ['worklist', 'Recruitment worklist'],
          ['pipeline', `Leads${leads.length ? ` (${leads.length})` : ''}`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === key ? `2px solid ${ORANGE}` : '2px solid transparent',
              color: tab === key ? ORANGE : '#6B7280',
              fontWeight: 600,
              fontSize: '14px',
              padding: '10px 16px',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', paddingBottom: '6px' }}>
          <button style={primaryButton} onClick={() => setAddFor('blank')}>
            + Add lead
          </button>
        </div>
      </div>

      {loading && <div style={{ color: '#6B7280', fontSize: '14px' }}>Loading…</div>}

      {!loading && tab === 'worklist' && gap && <Worklist gap={gap} onCall={setAddFor} />}

      {!loading && tab === 'pipeline' && (
        <Pipeline
          leads={leads}
          filters={filters}
          onFilter={setFilters}
          onOpen={async (id) => {
            try {
              setDetail(await leadsAPI.get(id));
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not open that lead');
            }
          }}
        />
      )}

      {addFor && (
        <AddLeadModal
          errand={addFor === 'blank' ? null : addFor}
          categories={categories}
          onClose={() => setAddFor(null)}
          onSaved={async () => {
            setAddFor(null);
            await load();
            setTab('pipeline');
          }}
        />
      )}

      {detail && (
        <LeadDetail
          lead={detail}
          onClose={() => setDetail(null)}
          onChanged={async () => {
            const fresh = await leadsAPI.get(detail.id);
            setDetail(fresh);
            await load();
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------- worklist

function Worklist({
  gap,
  onCall,
}: {
  gap: SupplyGap;
  onCall: (e: UnfilledErrand) => void;
}) {
  if (gap.totalUnfilled === 0) {
    return (
      <div style={{ ...card, textAlign: 'center', color: '#6B7280' }}>
        Every open errand has at least one offer. Nothing to recruit for right now.
      </div>
    );
  }

  return (
    <>
      <div style={{ ...card, marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>
          What to recruit for
        </h2>
        <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 12px' }}>
          Ranked by unmet demand. <strong>Active doers</strong> counts people who have actually had
          an offer accepted in the category — not people who ticked it on their profile.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Category</th>
                <th style={th}>Unfilled</th>
                <th style={th}>Still open</th>
                <th style={th}>Expired</th>
                <th style={th}>Avg budget</th>
                <th style={th}>Active doers</th>
                <th style={th}>Leads in pipeline</th>
              </tr>
            </thead>
            <tbody>
              {gap.byCategory.map((c: CategoryGap) => (
                <tr key={c.category}>
                  <td style={{ ...td, fontWeight: 600 }}>{prettyCategory(c.category)}</td>
                  <td style={{ ...td, color: ORANGE, fontWeight: 700 }}>{c.unfilled}</td>
                  <td style={td}>{c.still_open}</td>
                  <td style={{ ...td, color: c.expired > 0 ? '#DC2626' : '#6B7280' }}>{c.expired}</td>
                  <td style={td}>{money(c.avg_budget)}</td>
                  <td style={{ ...td, color: c.active_doers === 0 ? '#DC2626' : '#111827' }}>
                    {c.active_doers}
                  </td>
                  <td style={td}>{c.leads_in_pipeline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>Call list</h2>
        <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 12px' }}>
          Open errands sort first — those are live jobs you can offer someone today, and leading
          with the job is the only opening line that works on a busy tradesman. Expired rows are
          past recovering as jobs, but they are the clearest evidence of which trade is missing.
        </p>
        {gap.stillOpen === 0 && gap.expired > 0 && (
          <div
            style={{
              background: '#FEF2F2',
              borderLeft: '4px solid #DC2626',
              padding: '10px 12px',
              borderRadius: '4px',
              fontSize: '13px',
              marginBottom: '12px',
              color: '#991B1B',
            }}
          >
            Every unfilled errand here has already expired — {gap.expired} of them, with nothing
            currently open and waiting. That is {gap.expired} askers who were failed outright, not a
            backlog you can still rescue.
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Ref</th>
                <th style={th}>Errand</th>
                <th style={th}>Category</th>
                <th style={th}>Location</th>
                <th style={th}>Budget</th>
                <th style={th}>Age</th>
                <th style={th}>Status</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {gap.errands.map((e) => (
                <tr key={e.id} style={{ opacity: e.status === 'expired' ? 0.72 : 1 }}>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: '12px' }}>{e.ref}</td>
                  <td style={{ ...td, fontWeight: 600, maxWidth: '280px' }}>{e.title}</td>
                  <td style={td}>{prettyCategory(e.category)}</td>
                  <td style={{ ...td, color: '#6B7280' }}>{e.location || '—'}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{money(e.budget)}</td>
                  <td style={{ ...td, color: e.days_open > 7 ? '#DC2626' : '#6B7280' }}>
                    {e.days_open}d
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: e.status === 'open' ? '#059669' : '#DC2626',
                      }}
                    >
                      {e.status === 'open' ? 'Open' : 'Expired'}
                    </span>
                  </td>
                  <td style={td}>
                    <button style={ghostButton} onClick={() => onCall(e)}>
                      {e.status === 'open' ? 'Log a call' : 'Recruit for this'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------- pipeline

function Pipeline({
  leads,
  filters,
  onFilter,
  onOpen,
}: {
  leads: Lead[];
  filters: { stage: string; lead_type: string; q: string };
  onFilter: (f: { stage: string; lead_type: string; q: string }) => void;
  onOpen: (id: number) => void;
}) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          style={{ ...input, maxWidth: '260px' }}
          placeholder="Search name, company, email, mobile"
          value={filters.q}
          onChange={(e) => onFilter({ ...filters, q: e.target.value })}
        />
        <select
          style={{ ...input, maxWidth: '170px' }}
          value={filters.stage}
          onChange={(e) => onFilter({ ...filters, stage: e.target.value })}
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          style={{ ...input, maxWidth: '150px' }}
          value={filters.lead_type}
          onChange={(e) => onFilter({ ...filters, lead_type: e.target.value })}
        >
          <option value="">Everyone</option>
          <option value="individual">Individuals</option>
          <option value="company">Companies</option>
        </select>
      </div>

      {leads.length === 0 ? (
        <div style={{ color: '#6B7280', fontSize: '14px', padding: '24px 0', textAlign: 'center' }}>
          No leads yet. Work the call list and log each conversation.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Ref</th>
                <th style={th}>Name</th>
                <th style={th}>Contact</th>
                <th style={th}>Trades</th>
                <th style={th}>Source</th>
                <th style={th}>Stage</th>
                <th style={th}>Consent</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => onOpen(l.id)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(ev) => (ev.currentTarget.style.background = '#FAFAFA')}
                  onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: '12px' }}>{l.lead_ref}</td>
                  <td style={{ ...td, fontWeight: 600 }}>
                    {l.full_name}
                    {l.company_name && (
                      <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 400 }}>
                        {l.company_name}
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, fontSize: '13px', color: '#6B7280' }}>
                    {l.mobile || '—'}
                    {l.email && <div>{l.email}</div>}
                  </td>
                  <td style={{ ...td, fontSize: '13px' }}>
                    {l.interested_categories.length
                      ? l.interested_categories.map(prettyCategory).join(', ')
                      : '—'}
                  </td>
                  <td style={{ ...td, fontSize: '13px', color: '#6B7280' }}>
                    {SOURCES.find((s) => s.value === l.source)?.label ?? l.source}
                  </td>
                  <td style={td}>
                    <StageBadge stage={l.stage} />
                  </td>
                  <td style={{ ...td, fontSize: '12px' }}>
                    <span style={{ color: l.consent_contact ? '#059669' : '#9CA3AF' }}>
                      {l.consent_contact ? '✓ contact' : '— contact'}
                    </span>
                    <div style={{ color: l.consent_marketing ? '#059669' : '#9CA3AF' }}>
                      {l.consent_marketing ? '✓ marketing' : '— marketing'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ add modal

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,24,39,0.45)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 16px',
        overflowY: 'auto',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '620px',
          padding: '24px',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function AddLeadModal({
  errand,
  categories,
  onClose,
  onSaved,
}: {
  errand: UnfilledErrand | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<NewLead>({
    lead_type: 'individual',
    full_name: '',
    email: '',
    mobile: '',
    company_name: '',
    interested_categories: errand?.category ? [errand.category] : [],
    service_areas: errand?.location ? [errand.location] : [],
    source: 'admin',
    source_detail: '',
    notes: errand ? `Called about ${errand.ref}: ${errand.title}` : '',
    sourced_errand_id: errand?.id ?? null,
    consent_contact: false,
    consent_marketing: false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof NewLead>(k: K, v: NewLead[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isCompany = form.lead_type === 'company';

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      await leadsAPI.create(form);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save that lead');
    } finally {
      setSaving(false);
    }
  };

  const label: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '4px',
    color: '#374151',
  };

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Add a lead</h2>
      {errand && (
        <div
          style={{
            background: ORANGE_TINT,
            borderLeft: `4px solid ${ORANGE}`,
            padding: '10px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            margin: '12px 0',
          }}
        >
          Against <strong>{errand.ref}</strong> — {errand.title} ({money(errand.budget)},{' '}
          {errand.location || 'location not set'})
        </div>
      )}

      {err && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '10px',
            borderRadius: '6px',
            fontSize: '13px',
            margin: '12px 0',
          }}
        >
          {err}
        </div>
      )}

      <div style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
        <div>
          <label style={label}>Type</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['individual', 'company'] as const).map((t) => (
              <button
                key={t}
                onClick={() => set('lead_type', t)}
                style={{
                  ...ghostButton,
                  flex: 1,
                  background: form.lead_type === t ? ORANGE_TINT : '#fff',
                  borderColor: form.lead_type === t ? ORANGE : '#D1D5DB',
                  color: form.lead_type === t ? ORANGE : '#374151',
                  fontWeight: form.lead_type === t ? 700 : 400,
                }}
              >
                {t === 'individual' ? 'Individual' : 'Company'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={label}>Name *</label>
            <input
              style={input}
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder="Who you spoke to"
            />
          </div>
          <div>
            <label style={label}>Mobile</label>
            <input
              style={input}
              value={form.mobile}
              onChange={(e) => set('mobile', e.target.value)}
              placeholder="9123 4567"
            />
          </div>
        </div>

        <div>
          <label style={label}>Email</label>
          <input style={input} value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>

        {isCompany && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={label}>Company name *</label>
              <input
                style={input}
                value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)}
              />
            </div>
            <div>
              <label style={label}>Staff (approx.)</label>
              <input
                style={input}
                type="number"
                min={0}
                value={form.staff_count_estimate ?? ''}
                onChange={(e) => set('staff_count_estimate', e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <label style={label}>Trades they cover</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {categories.map((c) => {
              const on = form.interested_categories?.includes(c);
              return (
                <button
                  key={c}
                  onClick={() =>
                    set(
                      'interested_categories',
                      on
                        ? (form.interested_categories ?? []).filter((x) => x !== c)
                        : [...(form.interested_categories ?? []), c]
                    )
                  }
                  style={{
                    ...ghostButton,
                    padding: '5px 10px',
                    fontSize: '13px',
                    background: on ? ORANGE_TINT : '#fff',
                    borderColor: on ? ORANGE : '#D1D5DB',
                    color: on ? ORANGE : '#374151',
                  }}
                >
                  {prettyCategory(c)}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={label}>Source</label>
            <select
              style={input}
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Source detail</label>
            <input
              style={input}
              value={form.source_detail}
              onChange={(e) => set('source_detail', e.target.value)}
              placeholder="Carousell listing, CC noticeboard…"
            />
          </div>
        </div>

        <div>
          <label style={label}>Notes</label>
          <textarea
            style={{ ...input, minHeight: '70px', resize: 'vertical' }}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        <div style={{ background: '#F9FAFB', borderRadius: '6px', padding: '12px' }}>
          <label style={{ display: 'flex', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.consent_contact}
              onChange={(e) => set('consent_contact', e.target.checked)}
            />
            <span>
              <strong>They agreed to be contacted.</strong> Required for an individual — ask on the
              call.
            </span>
          </label>
          <label
            style={{ display: 'flex', gap: '8px', fontSize: '13px', cursor: 'pointer', marginTop: '8px' }}
          >
            <input
              type="checkbox"
              checked={form.consent_marketing}
              onChange={(e) => set('consent_marketing', e.target.checked)}
            />
            <span>
              They also agreed to marketing. Separate and optional — agreeing to hear about one
              errand is not agreeing to promotions.
            </span>
          </label>
          {isCompany && (
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '10px 0 0' }}>
              A firm's advertised business line and generic email sit outside the PDPA Data
              Protection provisions under s4(5), so a company lead from a public listing can be
              saved without the first box ticked. The Spam Control Act still applies to unsolicited
              commercial email and SMS.
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button style={ghostButton} onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button style={{ ...primaryButton, opacity: saving ? 0.6 : 1 }} onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save lead'}
        </button>
      </div>
    </Overlay>
  );
}

// ----------------------------------------------------------- lead detail

function LeadDetail({
  lead,
  onClose,
  onChanged,
}: {
  lead: Lead;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Held in state because the server returns the plaintext token once and
  // cannot produce it again — navigating away loses it, so it stays on screen
  // until the admin has copied or sent it.
  const [invite, setInvite] = useState<{ link: string; expiresAt: string } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const issueInvite = async () => {
    setBusy(true);
    setErr(null);
    try {
      const result = await leadsAPI.invite(lead.id, 'link');
      setInvite({ link: result.link, expiresAt: result.expiresAt });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not issue the invite');
    } finally {
      setBusy(false);
    }
  };

  const move = async (stage: LeadStage) => {
    if (stage === 'disqualified' && !reason.trim()) {
      setErr('Say why before disqualifying — the trail is the point.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await leadsAPI.update(lead.id, {
        stage,
        ...(stage === 'disqualified' ? { disqualify_reason: reason.trim() } : {}),
      });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update the stage');
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await leadsAPI.addNote(lead.id, note.trim());
      setNote('');
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save the note');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{lead.full_name}</h2>
          <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
            {lead.lead_ref} · {lead.company_name || (lead.lead_type === 'company' ? 'Company' : 'Individual')}
          </div>
        </div>
        <StageBadge stage={lead.stage} />
      </div>

      {err && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '10px',
            borderRadius: '6px',
            fontSize: '13px',
            margin: '12px 0',
          }}
        >
          {err}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          fontSize: '13px',
          margin: '16px 0',
          padding: '12px',
          background: '#F9FAFB',
          borderRadius: '6px',
        }}
      >
        <div>
          <div style={{ color: '#6B7280' }}>Mobile</div>
          <div style={{ fontWeight: 600 }}>{lead.mobile || '—'}</div>
        </div>
        <div>
          <div style={{ color: '#6B7280' }}>Email</div>
          <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{lead.email || '—'}</div>
        </div>
        <div>
          <div style={{ color: '#6B7280' }}>Trades</div>
          <div>{lead.interested_categories.map(prettyCategory).join(', ') || '—'}</div>
        </div>
        <div>
          <div style={{ color: '#6B7280' }}>Purge after</div>
          <div>{new Date(lead.purge_after).toLocaleDateString('en-SG')}</div>
        </div>
      </div>

      {lead.notes && (
        <div style={{ fontSize: '13px', marginBottom: '16px' }}>
          <div style={{ color: '#6B7280', marginBottom: '2px' }}>Notes</div>
          <div>{lead.notes}</div>
        </div>
      )}

      {/* ------------------------------------------------------- invite */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Launch invite</div>
        {lead.converted_at ? (
          <div style={{ fontSize: 13, color: '#059669' }}>
            ✓ Signed up{' '}
            {new Date(lead.converted_at).toLocaleDateString('en-SG')} — nothing more to send.
          </div>
        ) : !lead.consent_contact ? (
          <div style={{ fontSize: 13, color: '#B45309' }}>
            No consent to contact on file, so an invite cannot be sent. Re-permission them first.
          </div>
        ) : invite ? (
          <div
            style={{
              background: ORANGE_TINT,
              borderLeft: `4px solid ${ORANGE}`,
              borderRadius: 6,
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: 12, color: '#5B4636', marginBottom: 6 }}>
              Copy this now — it is shown once and cannot be retrieved. Valid until{' '}
              {new Date(invite.expiresAt).toLocaleDateString('en-SG')}.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={invite.link} style={{ ...input, fontSize: 12 }} />
              <button
                style={primaryButton}
                onClick={async () => {
                  await navigator.clipboard.writeText(invite.link);
                  setInviteCopied(true);
                  setTimeout(() => setInviteCopied(false), 2000);
                }}
              >
                {inviteCopied ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <button style={primaryButton} onClick={issueInvite} disabled={busy}>
            {busy ? 'Issuing…' : 'Issue signup link'}
          </button>
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Move to</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {STAGES.filter((s) => s !== lead.stage).map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => move(s)}
              style={{ ...ghostButton, padding: '5px 10px', fontSize: '13px' }}
            >
              {STAGE_LABEL[s]}
            </button>
          ))}
        </div>
        <input
          style={{ ...input, marginTop: '8px' }}
          placeholder="Reason (required to disqualify)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Log a call</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            style={input}
            placeholder="What was said"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveNote()}
          />
          <button style={primaryButton} onClick={saveNote} disabled={busy || !note.trim()}>
            Add
          </button>
        </div>
      </div>

      {lead.events && lead.events.length > 0 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>History</div>
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {lead.events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  fontSize: '13px',
                  padding: '8px 0',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <div style={{ color: '#111827' }}>{ev.note || ev.kind}</div>
                <div style={{ color: '#9CA3AF', fontSize: '12px' }}>
                  {new Date(ev.created_at).toLocaleString('en-SG')}
                  {ev.actor_name ? ` · ${ev.actor_name}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button style={ghostButton} onClick={onClose}>
          Close
        </button>
      </div>
    </Overlay>
  );
}
