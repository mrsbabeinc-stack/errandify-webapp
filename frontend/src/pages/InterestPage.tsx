import { useEffect, useMemo, useState } from 'react';

/**
 * Pre-launch interest form. Public, shareable, no account needed.
 *
 * Designed against what the first interest form got wrong. That one collected
 * name, email, phone and company from 52 people and none of them can be acted
 * on, because it never asked the two things that decide whether a lead is
 * useful: what work they can do, and where they are. Without those, a lead
 * cannot be matched to the errands going unfilled, which is the whole reason
 * to collect it.
 *
 * So the shape here is: one screen, six questions, two of which are the ones
 * that were missing. No wizard — every extra step loses people, and a lead
 * form that 40% finish beats a beautiful one that 15% finish.
 *
 * It also asks whether someone wants to earn or to get help. The old form
 * could not tell a retiree wanting weekend work from a parent wanting their
 * aircon fixed, and they must never receive the same launch message.
 */

const CATEGORY_EMOJI: Record<string, string> = {
  'home-maintenance': '🔧',
  'cleaning-household': '🧹',
  'childcare-education': '📚',
  'eldercare-healthcare': '🩺',
  'pet-care': '🐾',
  'shopping-errands': '🛒',
  'delivery-moving': '📦',
  'furniture-assembly': '🪑',
  'food-beverage': '🍜',
  'travel-mobility': '🚗',
  'tech-support': '💻',
  'creative-arts': '🎨',
  'event-planning': '🎉',
  'personal-care': '💆',
  'admin-business': '📋',
  'charity-community': '🤝',
};

interface Category {
  slug: string;
  name: string;
}

type Interest = 'earn' | 'get_help' | 'both';

export default function InterestPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [interest, setInterest] = useState<Interest>('earn');
  const [leadType, setLeadType] = useState<'individual' | 'company'>('individual');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [staffCount, setStaffCount] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [area, setArea] = useState('');
  const [skills, setSkills] = useState('');
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  /** Where the link was shared, so each poster or chat group is attributable. */
  const src = useMemo(() => new URLSearchParams(window.location.search).get('src') ?? '', []);

  useEffect(() => {
    fetch('/api/interest/options')
      .then((r) => r.json())
      .then((p) => {
        setCategories(p?.data?.categories ?? []);
        setAreas(p?.data?.areas ?? []);
      })
      .catch(() => {
        /* The form still submits; only the chips and the area list are lost. */
      })
      .finally(() => setLoaded(true));
  }, []);

  const wantsToEarn = interest === 'earn' || interest === 'both';

  const toggle = (slug: string) =>
    setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));

  const submit = async () => {
    setError(null);

    if (!fullName.trim()) return setError('Please tell us your name.');
    if (!mobile.trim() && !email.trim()) {
      return setError('Please leave a mobile number or an email address.');
    }
    if (leadType === 'company' && !companyName.trim()) {
      return setError('Please tell us your company name.');
    }
    if (!consent) return setError('Please tick the box so we know we may contact you.');

    setSaving(true);
    try {
      const response = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_type: leadType,
          interest,
          full_name: fullName.trim(),
          mobile: mobile.trim(),
          email: email.trim(),
          company_name: companyName.trim(),
          staff_count_estimate: staffCount,
          interested_categories: wantsToEarn ? picked : [],
          service_areas: area ? [area] : [],
          skills_text: skills.trim(),
          consent_contact: consent,
          consent_marketing: marketing,
          src,
          website: honeypot,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Something went wrong. Please try again.');
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------- thank you

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-errandify-bg to-orange-50 flex flex-col items-center justify-center px-5 py-10">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-lg p-7 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-xl font-bold text-errandify-brown mb-2">You're on the list</h1>
          <p className="text-sm text-gray-600 mb-5">
            {wantsToEarn
              ? "We'll message you the moment we're live in your area — with real errands you can pick up."
              : "We'll message you the moment we're live in your area."}
          </p>
          <div className="bg-orange-50 rounded-2xl p-4 text-left mb-5">
            <p className="text-xs font-semibold text-errandify-brown mb-1">One thing that helps</p>
            <p className="text-xs text-gray-600">
              Errandify works best when a whole neighbourhood is on it. If you know someone nearby
              who'd want this, send them the link.
            </p>
          </div>
          <button
            onClick={() => {
              const url = `${window.location.origin}/interest`;
              const text = `I just signed up for Errandify — get help with errands, or earn money helping neighbours. ${url}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
            }}
            className="w-full bg-[#25D366] text-white py-3 rounded-full font-bold text-sm mb-3"
          >
            Share on WhatsApp
          </button>
          <a href="/" className="block text-xs text-errandify-orange font-semibold hover:underline">
            Back to Errandify
          </a>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------- form

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-errandify-orange focus:ring-1 focus:ring-errandify-orange';
  const labelClass = 'block text-sm font-semibold text-errandify-brown mb-2';

  return (
    <div className="min-h-screen bg-gradient-to-b from-errandify-bg to-orange-50 px-5 py-8">
      <div className="max-w-sm mx-auto">
        {/* ------------------------------------------------------ header */}
        <div className="text-center mb-6">
          <img src="/images/Errandify Logo.png" alt="Errandify" className="h-10 w-auto mx-auto mb-3" />
          <h1 className="text-xl font-bold text-errandify-brown mb-1">Be first in line</h1>
          <p className="text-sm text-gray-600">
            We're launching in Singapore neighbourhoods soon. Tell us a little about you and we'll
            let you know the day we're live in yours.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 space-y-6">
          {/* --------------------------------------------------- intent */}
          <div>
            <label className={labelClass}>I'd like to…</label>
            <div className="space-y-2">
              {(
                [
                  ['earn', '💰', 'Earn money', 'Help neighbours with errands and get paid'],
                  ['get_help', '🙋', 'Get help', 'Find someone trusted to help me out'],
                  ['both', '🤝', 'Both', 'Some weeks I help, some weeks I need help'],
                ] as const
              ).map(([value, icon, title, sub]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInterest(value)}
                  className={`w-full flex items-start gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                    interest === value
                      ? 'border-errandify-orange bg-orange-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-xl leading-none mt-0.5">{icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-errandify-brown">{title}</span>
                    <span className="block text-xs text-gray-500">{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------- who I am */}
          <div>
            <label className={labelClass}>I'm signing up as</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['individual', 'Myself'],
                  ['company', 'A business'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLeadType(value)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    leadType === value
                      ? 'border-errandify-orange bg-orange-50 text-errandify-orange'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* -------------------------------------------------- contact */}
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Your name</label>
              <input
                className={inputClass}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="How should we address you?"
                autoComplete="name"
              />
            </div>

            {leadType === 'company' && (
              <>
                <div>
                  <label className={labelClass}>Company name</label>
                  <input
                    className={inputClass}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    autoComplete="organization"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    How many staff could take errands?{' '}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    value={staffCount}
                    onChange={(e) => setStaffCount(e.target.value)}
                    placeholder="e.g. 8"
                  />
                </div>
              </>
            )}

            <div>
              <label className={labelClass}>Mobile</label>
              <input
                className={inputClass}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9123 4567"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            <div>
              <label className={labelClass}>
                Email <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputMode="email"
                autoComplete="email"
              />
            </div>
          </div>

          {/* ------------------------------------------------ what & where */}
          {wantsToEarn && (
            <div>
              <label className={labelClass}>What can you help with?</label>
              <p className="text-xs text-gray-500 -mt-1 mb-3">
                Pick as many as you like. This is how we know which errands to send you.
              </p>
              {loaded && categories.length === 0 ? (
                <p className="text-xs text-gray-400">
                  Couldn't load the list — tell us below instead and we'll sort it out.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const on = picked.includes(c.slug);
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => toggle(c.slug)}
                        className={`px-3 py-2 rounded-full border-2 text-xs font-semibold transition-all ${
                          on
                            ? 'border-errandify-orange bg-orange-50 text-errandify-orange'
                            : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        <span className="mr-1">{CATEGORY_EMOJI[c.slug] ?? '•'}</span>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-3">
                <label className={labelClass}>
                  Anything specific? <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  className={inputClass}
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. aircon servicing, 20 years"
                />
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Which area are you in?</label>
            <select className={inputClass} value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">Choose your area…</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Your area only — we don't need your address.
            </p>
          </div>

          {/* -------------------------------------------------- consent */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <label className="flex gap-3 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 flex-shrink-0"
              />
              <span>
                <strong>Errandify may contact me</strong> about launching in my area, using the
                details above.
              </span>
            </label>
            <label className="flex gap-3 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-0.5 flex-shrink-0"
              />
              <span>
                Also send me tips and offers.{' '}
                <span className="text-gray-400">Optional — you can stop this any time.</span>
              </span>
            </label>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              We keep only what's on this form, and delete it if you never join. No address, no
              NRIC — SingPass handles that when you actually sign up.
            </p>
          </div>

          {/* A field no human sees. Bots fill it; we bin those quietly. */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="w-full bg-errandify-orange text-white py-3.5 rounded-full font-bold text-sm shadow-lg disabled:opacity-60"
          >
            {saving ? 'Sending…' : 'Keep me posted'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Already have an account?{' '}
            <a href="/login" className="text-errandify-orange font-semibold hover:underline">
              Sign in
            </a>
          </p>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-5">Powered by SingPass</p>
      </div>
    </div>
  );
}
