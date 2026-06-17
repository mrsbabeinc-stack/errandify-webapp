# Beta Deployment Guide - 50-100 Users
**Target**: 2026-06-25 (LEAP East Pitch)  
**Status**: ✅ READY FOR BETA LAUNCH

---

## Phase 1: Infrastructure Setup (1-2 hours)

### 1.1 Deploy Frontend to Vercel

**Step 1: Connect GitHub**
```bash
# 1. Push code to GitHub
git remote add origin https://github.com/YOUR_USERNAME/errandify.git
git branch -M main
git push -u origin main

# 2. Go to https://vercel.com
# 3. Click "New Project"
# 4. Import GitHub repo: errandify
# 5. Select "Next.js" or "React" (it auto-detects)
```

**Step 2: Configure Vercel Environment**
```
In Vercel dashboard, go to Settings → Environment Variables

Add:
VITE_API_URL=https://errandify-api.railway.app  (your Railway backend URL)
```

**Step 3: Deploy**
- Click "Deploy"
- Wait ~3-5 minutes
- Frontend live at: `https://errandify.vercel.app`

---

### 1.2 Deploy Backend to Railway

**Step 1: Sign Up**
- Go to https://railway.app
- Sign up with GitHub

**Step 2: Create New Project**
- Click "+ New Project"
- Select "GitHub Repo"
- Choose errandify repo
- Select `backend` directory (or create Dockerfile)

**Step 3: Configure Environment**
In Railway dashboard → Variables:

```
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db.railway.app:5432/errandify
JWT_SECRET=generate-random-key-here-min-32-chars
STRIPE_SECRET_KEY=sk_test_4eC39HqLyjWDarHw1z4V8c8W
STRIPE_PUBLISHABLE_KEY=pk_test_4eC39HqLyjWDarH4V8c8W
QWEN_API_KEY=sk-ws-H.IEXLEL.8EMl.MEUCIDO2SsQ0PDsmKkozpeG8RC6GmMN1FDczqovvWbitH98AAiEA5wdGrm7ErhW5abaPQwWl8aCqGn_eT3rieVmNwWjXC38
USE_SINGPASS=false
AZURE_SPEECH_KEY=optional
```

**Step 4: Deploy**
- Railway auto-deploys from git push
- Wait ~5 minutes
- Backend live at: `https://errandify-api.railway.app`

---

### 1.3 Setup PostgreSQL

**Option A: Railway PostgreSQL (Easiest)**
- In Railway dashboard, click "+ Add Service"
- Select "PostgreSQL"
- Railway auto-creates DATABASE_URL
- Sync database schema

**Option B: Supabase (Free Alternative)**
- Go to https://supabase.com
- Create new project
- Get DATABASE_URL from connection string
- Add to Railway/Vercel environment

**Apply Schema:**
```bash
# Using psql (if local) or Railway CLI:
psql $DATABASE_URL < database/schema.sql
psql $DATABASE_URL < database/add_chas_fields.sql
```

---

## Phase 2: Pre-Seed Test Accounts (30 min)

### 2.1 Create Test Accounts in Database

```bash
# Connect to production database
psql $DATABASE_URL

-- Account 1: Asker (demo user)
INSERT INTO users (nric_hash, display_name, mobile, role, kyc_status) VALUES
('hash1', 'Sarah Tan (Asker)', '+6581234567', 'asker', 'verified');

-- Account 2: Doer (demo user)
INSERT INTO users (nric_hash, display_name, mobile, role, kyc_status) VALUES
('hash2', 'John Lee (Doer)', '+6587654321', 'doer', 'verified');

-- Account 3: Both Roles (demo user)
INSERT INTO users (nric_hash, display_name, mobile, role, kyc_status) VALUES
('hash3', 'Amy Wong (Admin)', '+6589999999', 'asker', 'verified');

-- Verify
SELECT id, display_name, role FROM users LIMIT 3;
```

### 2.2 Test Account Credentials

For beta testers with mock login (USE_SINGPASS=false):

```
Account 1 - Asker
Email: asker@demo.errandify.ai
Password: Demo@123456
Name: Sarah Tan

Account 2 - Doer
Email: doer@demo.errandify.ai
Password: Demo@123456
Name: John Lee

Account 3 - Admin
Email: admin@demo.errandify.ai
Password: Admin@123456
Name: Amy Wong
```

---

## Phase 3: Admin Dashboard Setup (2-3 hours)

### 3.1 Create Admin Routes & Pages

**Backend: Create `/api/admin/pitch-stats` Endpoint**

Create `backend/src/routes/admin.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Middleware: Check if user is admin
const isAdmin = async (req: AuthRequest, res: Response, next: any) => {
  const role = req.role;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/admin/pitch-stats - All metrics for LEAP East pitch
router.get('/pitch-stats', authMiddleware, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Total Signups
    const signups = await db.query('SELECT COUNT(*) as count FROM users WHERE role IN (\'asker\', \'doer\')');
    
    // 2. Tasks Posted
    const tasksPosted = await db.query('SELECT COUNT(*) as count FROM errands WHERE status != \'cancelled\'');
    
    // 3. Tasks Completed
    const tasksCompleted = await db.query('SELECT COUNT(*) as count FROM errands WHERE status = \'completed\'');
    
    // 4. Fill Rate %
    const fillRate = tasksPosted.rows[0]?.count > 0 
      ? ((tasksCompleted.rows[0]?.count / tasksPosted.rows[0]?.count) * 100).toFixed(1)
      : 0;
    
    // 5. Avg Time to First Bid (minutes)
    const avgTimeToFirstBid = await db.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (b.created_at - e.created_at)) / 60) as minutes
      FROM errands e
      LEFT JOIN bids b ON e.id = b.task_id
      WHERE e.created_at > NOW() - INTERVAL '7 days'
    `);
    
    // 6. Audio Usage % (tasks created with voice)
    const voiceTasks = await db.query('SELECT COUNT(*) as count FROM errands WHERE description LIKE \'%voice%\' OR description LIKE \'%audio%\'');
    const audioUsage = tasksPosted.rows[0]?.count > 0
      ? ((voiceTasks.rows[0]?.count / tasksPosted.rows[0]?.count) * 100).toFixed(1)
      : 0;
    
    // 7. Mutual Review Completion Rate
    const reviewsCompleted = await db.query('SELECT COUNT(*) as count FROM reviews');
    const jobsCompleted = await db.query('SELECT COUNT(*) as count FROM errand_assignments WHERE status = \'completed\'');
    const reviewRate = jobsCompleted.rows[0]?.count > 0
      ? ((reviewsCompleted.rows[0]?.count / jobsCompleted.rows[0]?.count) * 100).toFixed(1)
      : 0;
    
    // 8. Referrals Made
    const referrals = await db.query('SELECT COUNT(*) as count FROM users WHERE referral_code IS NOT NULL AND referral_code != \'\'');
    
    // 9. Repeat Users (logged in more than once)
    const repeatUsers = await db.query('SELECT COUNT(DISTINCT user_id) as count FROM event_logs WHERE event_name = \'login\' GROUP BY user_id HAVING COUNT(*) > 1');
    
    // 10. EP (Errandify Points) Awarded Total
    const epAwarded = await db.query('SELECT SUM(CAST(points AS INTEGER)) as total FROM user_points WHERE type = \'earned\'');
    
    // 11. Disputes Raised
    const disputes = await db.query('SELECT COUNT(*) as count FROM disputes WHERE status = \'open\'');
    const disputeRate = tasksCompleted.rows[0]?.count > 0
      ? ((disputes.rows[0]?.count / tasksCompleted.rows[0]?.count) * 100).toFixed(1)
      : 0;
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        metrics: {
          totalSignups: signups.rows[0]?.count || 0,
          tasksPosted: tasksPosted.rows[0]?.count || 0,
          tasksCompleted: tasksCompleted.rows[0]?.count || 0,
          fillRatePercent: parseFloat(fillRate),
          avgTimeToFirstBidMinutes: Math.round(avgTimeToFirstBid.rows[0]?.minutes || 0),
          audioUsagePercent: parseFloat(audioUsage),
          mutualReviewCompletionPercent: parseFloat(reviewRate),
          referralsMade: referrals.rows[0]?.count || 0,
          repeatUsersCount: repeatUsers.rows.length || 0,
          epAwardedTotal: epAwarded.rows[0]?.total || 0,
          disputesRaisedPercent: parseFloat(disputeRate),
        },
        summary: `Platform stats: ${signups.rows[0]?.count} users, ${tasksPosted.rows[0]?.count} tasks posted, ${tasksCompleted.rows[0]?.count} completed (${fillRate}% fill rate)`
      }
    });
  } catch (error: any) {
    console.error('Pitch stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
```

**Register in backend/src/index.ts:**
```typescript
import adminRoutes from './routes/admin.js';
app.use('/api/admin', adminRoutes);
```

### 3.2 Create Admin Dashboard Page

Create `frontend/src/pages/AdminDashboard.tsx`:

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface PitchStats {
  totalSignups: number;
  tasksPosted: number;
  tasksCompleted: number;
  fillRatePercent: number;
  avgTimeToFirstBidMinutes: number;
  audioUsagePercent: number;
  mutualReviewCompletionPercent: number;
  referralsMade: number;
  repeatUsersCount: number;
  epAwardedTotal: number;
  disputesRaisedPercent: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PitchStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        '/api/admin/pitch-stats',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(response.data.data.metrics);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (!stats) return <div className="p-4">No data available</div>;

  return (
    <div className="min-h-screen bg-errandify-bg p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-errandify-brown mb-8">LEAP East Pitch Stats</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Stat Cards */}
          <StatCard label="Total Signups" value={stats.totalSignups} />
          <StatCard label="Tasks Posted" value={stats.tasksPosted} />
          <StatCard label="Tasks Completed" value={stats.tasksCompleted} />
          <StatCard label="Fill Rate %" value={stats.fillRatePercent.toFixed(1)} />
          <StatCard label="Avg Time to Bid (min)" value={stats.avgTimeToFirstBidMinutes} />
          <StatCard label="Audio Usage %" value={stats.audioUsagePercent.toFixed(1)} />
          <StatCard label="Review Completion %" value={stats.mutualReviewCompletionPercent.toFixed(1)} />
          <StatCard label="Referrals Made" value={stats.referralsMade} />
          <StatCard label="Repeat Users" value={stats.repeatUsersCount} />
          <StatCard label="EP Awarded" value={stats.epAwardedTotal} />
          <StatCard label="Dispute Rate %" value={stats.disputesRaisedPercent.toFixed(1)} />
        </div>

        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <button
            onClick={fetchStats}
            className="bg-errandify-orange text-white px-6 py-2 rounded font-semibold"
          >
            Refresh Stats
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600 text-sm">{label}</p>
      <p className="text-3xl font-bold text-errandify-brown mt-2">{value}</p>
    </div>
  );
}
```

---

## Phase 4: Beta Invite Landing Page (1 hour)

### 4.1 Create Join Page

Create `frontend/src/pages/JoinBetaPage.tsx`:

```typescript
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';

export default function JoinBetaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const referralCode = searchParams.get('ref') || '';

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Track referral
      if (referralCode) {
        await axios.post('/api/referrals/track', {
          referralCode,
          inviteeEmail: email,
        });
      }

      // Standard signup (mock for now)
      // Will upgrade to SingPass later
      navigate('/login');
    } catch (err) {
      console.error('Signup error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-errandify-orange to-errandify-bg">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">帮帮乐 Errandify</h1>
          <p className="text-xl text-white/90">Join the Beta - Help Your Neighbors</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-errandify-brown mb-4">What is Errandify?</h2>
          
          <ul className="space-y-3 text-gray-700 mb-6">
            <li>✅ Post errands and get help from neighbors</li>
            <li>✅ Earn money by helping others</li>
            <li>✅ Real-time messaging & reviews</li>
            <li>✅ Secure payments with Stripe</li>
            <li>✅ Hana AI Assistant (3 languages!)</li>
            <li>✅ Community-powered platform</li>
          </ul>

          <form onSubmit={handleSignUp} className="space-y-4">
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              required
            />
            <input
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              required
            />
            {referralCode && (
              <p className="text-sm text-gray-600">
                Referred by: <span className="font-semibold">{referralCode}</span>
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Signing Up...' : 'Join Beta Now'}
            </button>
          </form>
        </div>

        <div className="text-center text-white/80 text-sm">
          <p>🎯 Limited to 50-100 beta testers</p>
          <p>📅 Testing period: June 25 - July 15</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 5: Analytics Event Tracking (1-2 hours)

### 5.1 Create Events Table

```sql
-- Add to database/schema.sql
CREATE TABLE event_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  event_name VARCHAR(100) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX idx_event_logs_event_name ON event_logs(event_name);
```

### 5.2 Track Events in Frontend

Add to `frontend/src/utils/analytics.ts`:

```typescript
import axios from 'axios';

export async function trackEvent(eventName: string, metadata?: any) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    await axios.post(
      '/api/analytics/track',
      { eventName, metadata },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (err) {
    console.error('Analytics error:', err);
  }
}
```

Track these events:
- `page_view` - User views page
- `task_created` - User posts errand
- `bid_submitted` - User submits bid
- `bid_accepted` - Bid accepted
- `task_completed` - Task completed
- `review_submitted` - Review posted
- `message_sent` - Message sent
- `hana_chat` - Hana AI used
- `chas_selected` - CHAS card selected
- `dispute_raised` - Dispute filed

---

## Phase 6: Launch Checklist

### Before Going Live

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway
- [ ] Database set up & schema applied
- [ ] Environment variables configured
- [ ] STRIPE_SECRET_KEY set to test key
- [ ] USE_SINGPASS set to false
- [ ] Test accounts created (3 users)
- [ ] Admin dashboard working
- [ ] Analytics events tracked
- [ ] Join page live at /join
- [ ] All API endpoints tested
- [ ] CHAS integration tested
- [ ] Hana AI tested (3 languages)
- [ ] Messaging tested
- [ ] Voice synthesis tested
- [ ] No errors in console/logs

### Go-Live Commands

```bash
# 1. Push to GitHub (auto-deploys to Vercel & Railway)
git add .
git commit -m "Beta deployment ready"
git push origin main

# 2. Apply database schema
psql $DATABASE_URL < database/schema.sql
psql $DATABASE_URL < database/add_chas_fields.sql

# 3. Verify stats endpoint
curl https://errandify-api.railway.app/api/admin/pitch-stats \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 4. Share beta link
https://errandify.vercel.app/join?ref=leapeast2026
```

---

## Phase 7: Beta Testing (2 weeks)

### Week 1: Internal Testing
- Admin team tests all features
- Verify analytics tracking
- Test Stripe with test cards
- Prepare feedback

### Week 2: 50-100 Testers
- Send invite links
- Monitor stats dashboard
- Collect feedback
- Fix critical bugs
- Prepare for LEAP East pitch

---

## LEAP East Pitch Stats Dashboard

Access at: `https://errandify.vercel.app/admin`

Key metrics to highlight:
- **Fill Rate**: % of posted tasks with bids (target: > 70%)
- **Task Completion**: # of completed tasks
- **User Engagement**: Repeat users, messaging activity
- **Audio Usage**: % creating tasks with voice
- **Community Growth**: Referrals, signups
- **Safety**: Dispute rate (target: < 5%)

---

## Transition to Production (Post-Pitch)

Once testing complete:

1. **Get SingPass Sandbox Approval**
   - Contact IDA Singapore
   - Get sandbox credentials
   
2. **Switch to SingPass**
   - Set `USE_SINGPASS=true`
   - Update `SINGPASS_CLIENT_ID` & `SINGPASS_CLIENT_SECRET`
   - Deploy

3. **Get Live Stripe Keys**
   - Apply to Stripe
   - Get `sk_live_*` and `pk_live_*`
   - Update environment

4. **Production Database**
   - Migrate to managed PostgreSQL
   - Set up automated backups
   - Configure monitoring

5. **Go Live**
   - Announce public launch
   - Open sign-ups
   - Scale infrastructure as needed

---

## Success Metrics for Beta

| Metric | Target | Purpose |
|--------|--------|---------|
| Signups | 50-100 | User acquisition |
| Task Fill Rate | > 70% | Marketplace health |
| Completion Rate | > 80% | Task fulfillment |
| Repeat Users | > 40% | Engagement |
| Audio Usage | > 30% | AI adoption |
| Review Rate | > 90% | Community trust |
| Dispute Rate | < 5% | Safety score |

---

✅ **Ready to Launch Beta!**

Deploy, test with 50-100 users, gather feedback, and prepare for LEAP East pitch.

**Timeline**: Deploy by June 25, test through July 15, pitch on July 20.
