# Errandify - Singapore's Community Task Platform

A mobile-responsive web app connecting people who need help (Askers) with people who can help (Doers).

## Tech Stack

- **Frontend**: React.js + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **AI**: Alibaba Qwen API (audio transcription, word suggestions, content moderation)
- **Payments**: Stripe (test mode only)
- **Auth**: Mock login (SingPass MyInfo integration coming later)
- **Deployment**: Vercel (frontend) + Railway/Render (backend)

## Brand Colors

- Primary Orange: `#FF7A29`
- Brown: `#4A3221`
- Background: `#FFFAF6`
- Font: System sans-serif, base 16px

## Project Structure

```
/frontend          - React app (Vite + Tailwind)
  /src
    /components    - Shared UI components (Layout, BottomNav, RoleToggle)
    /pages         - Page components (Home, Errands, Chat, Profile)
    /main.tsx      - Entry point
    /App.tsx       - Router setup

/backend           - Express API (TypeScript)
  /src
    /routes        - API endpoints (auth, errands, chat, users)
    /middleware    - Auth middleware
    /config.ts     - Configuration
    /db.ts         - Database connection
    /index.ts      - Server entry point

/shared            - Shared code
  /config.js       - Auth flag (USE_SINGPASS)
  /types.ts        - Shared TypeScript types

/database          - Database schema
  /schema.sql      - PostgreSQL schema
```

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev        # Runs on http://localhost:5173
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev        # Runs on http://localhost:3000
```

### Database

```bash
# Create database
createdb errandify

# Run schema
psql errandify < database/schema.sql
```

## Auth Flag Configuration

The auth system uses a config flag to switch between mock and SingPass login:

```javascript
// shared/config.js
const USE_SINGPASS = false; // false = mock login, true = SingPass OAuth
```

All auth code checks this flag. When false, the app uses simple email mock login. When true (after SingPass sandbox is ready), it uses real SingPass MyInfo OAuth without any other code changes.

## Bottom Navigation

Always visible on mobile:
- Home | Errands | Chat | Profile

## Role Toggle

Top-left corner on every screen:
- Asker: Post tasks and get help
- Doer: Find tasks and earn money

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_USE_SINGPASS=false
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/errandify
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
QWEN_API_KEY=your-api-key
SINGPASS_CLIENT_ID=your-id
SINGPASS_CLIENT_SECRET=your-secret
USE_SINGPASS=false
PORT=3000
NODE_ENV=development
```

## Features to Implement

- [ ] User authentication (mock → SingPass)
- [ ] Errand posting and management
- [ ] Task assignment and tracking
- [ ] Real-time chat with Qwen AI
- [ ] Audio transcription (Qwen)
- [ ] Ratings and reviews
- [ ] Payment processing (Stripe)
- [ ] Content moderation (Qwen)

## Mobile-First Design

- All components are mobile-first
- Responsive breakpoints handled via Tailwind
- Safe area insets for notched devices
- Bottom nav anchored for thumb-friendly interaction

---

Built with ❤️ for Singapore's community
