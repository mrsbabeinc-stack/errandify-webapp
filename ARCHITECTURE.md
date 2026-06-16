# Errandify Architecture Overview

## Project Structure

```
Errandify WebApp/
├── frontend/                          # React app (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx            # Main layout wrapper with bottom nav
│   │   │   ├── BottomNav.tsx         # Always-visible tab navigation
│   │   │   └── RoleToggle.tsx        # Asker/Doer switcher (top-left)
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx         # Mock login (SingPass-ready)
│   │   │   ├── HomePage.tsx          # Role-aware dashboard
│   │   │   ├── ErrandsPage.tsx       # Task listing/management
│   │   │   ├── ChatPage.tsx          # Messages + AI assistant
│   │   │   └── ProfilePage.tsx       # User profile & ratings
│   │   ├── App.tsx                   # Router setup (5 routes)
│   │   └── main.tsx                  # Entry point
│   ├── index.html                    # HTML template (notch-safe)
│   ├── tailwind.config.js            # Errandify colors configured
│   ├── vite.config.ts                # Dev server setup
│   └── package.json
│
├── backend/                           # Node/Express API
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts               # JWT validation middleware
│   │   ├── routes/
│   │   │   ├── auth.ts               # POST /login, /singpass/login
│   │   │   ├── errands.ts            # GET/POST/PUT /errands
│   │   │   ├── chat.ts               # Messages & conversations
│   │   │   └── users.ts              # Profile & ratings
│   │   ├── services/
│   │   │   ├── qwen.ts               # Alibaba Qwen integration
│   │   │   └── speech.ts             # Audio/voice services
│   │   ├── config.ts                 # Environment & flags
│   │   ├── db.ts                     # PostgreSQL connection pool
│   │   └── index.ts                  # Express server setup
│   ├── tsconfig.json
│   └── package.json
│
├── database/
│   └── schema.sql                    # PostgreSQL tables + indexes
│
├── shared/
│   ├── config.js                     # AUTH FLAG (USE_SINGPASS)
│   └── types.ts                      # TypeScript interfaces
│
└── README.md, ARCHITECTURE.md
```

## Frontend Flow

```
LoginPage (email + role selection)
         ↓
    Layout (wraps all pages)
      ├─ RoleToggle (top-left)
      ├─ <Outlet> (current page)
      └─ BottomNav (always visible)
         ├─ Home
         ├─ Errands
         ├─ Chat
         └─ Profile
```

## Backend API Endpoints

```
POST   /api/auth/login              → Generate JWT token (mock)
POST   /api/auth/singpass/login     → SingPass OAuth (when enabled)

GET    /api/errands                 → List errands (with filters)
POST   /api/errands                 → Create errand (asker)
GET    /api/errands/:id             → Single errand details
PUT    /api/errands/:id             → Update errand

GET    /api/chat/conversations      → List user's chats
GET    /api/chat/conversations/:id/messages  → Fetch messages
POST   /api/chat/conversations/:id/messages  → Send message

GET    /api/users/profile           → Current user info
PUT    /api/users/profile           → Update profile
GET    /api/users/:id/ratings       → User ratings/reviews
```

## Alibaba AI Services Integration

### Qwen Models (Text & Multimodal)
- **Qwen 3.7 Plus / 3.6 Plus**
  - Customer service chatbot
  - Content moderation
  - Accepts: text, images, video
  - Methods: `chat()`, `analyzeWithMedia()`, `moderateContent()`

- **Qwen 2.5 VL**
  - Geolocation & spatial analysis
  - Analyzes images with location context
  - Method: `spatialAnalysis()`

### Speech Services
- **FunASR** (paraformer-realtime)
  - Speech → Text transcription
  - Low-latency, accurate
  - Method: `transcribeAudio()`

- **CosyVoice**
  - Text → Speech synthesis
  - Natural voice output
  - Method: `synthesizeSpeech()`

- **Voice Bot Pipeline**
  - Transcribe audio (FunASR) → Chat (Qwen 3.7) → Synthesize (CosyVoice)
  - Method: `processVoiceInteraction()`

## Database Schema

```sql
users
  ├─ id, email, name, phone, role (asker/doer)
  ├─ age, profile_image_url
  └─ singpass_id (when SingPass enabled)

errands
  ├─ id, asker_id, title, description, category
  ├─ status (open/assigned/in_progress/completed/cancelled)
  ├─ budget, deadline, location
  └─ timestamps

errand_assignments
  ├─ id, errand_id, doer_id
  ├─ status (accepted/declined/completed/cancelled)
  ├─ rating_score, rating_comment
  └─ completed_at

conversations
  ├─ id, participant_ids[], errand_id
  └─ last_message_at

chat_messages
  ├─ id, conversation_id, sender_id
  ├─ text, audio_url
  └─ created_at
```

## Authentication Flow

### Current (Mock Login)
```
User enters email → Frontend generates token → Stored locally → API calls include token
```

### When Ready (SingPass)
```
User clicks "SingPass Login" → OAuth redirect → MyInfo data → Generate token → Same flow
```

**No code changes needed** — controlled by `shared/config.js`:
```javascript
const USE_SINGPASS = false; // Toggle this to true
```

## Mobile-First Design

- **Bottom Navigation**: Always visible, sticky footer
- **Role Toggle**: Fixed top-left corner
- **Responsive**: Tailwind breakpoints (mobile-first)
- **Safe Area Insets**: Handles notched devices (iPhone X+)
- **Viewport**: Optimized for phone browsers (feels like native app)

## Brand Colors (Tailwind Configured)

```
errandify-orange: #FF7A29  (Primary CTA, active states)
errandify-brown:  #4A3221  (Text, headings)
errandify-bg:     #FFFAF6  (Page background)
```

## Environment Setup

### Frontend `.env`
```
VITE_API_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_USE_SINGPASS=false
```

### Backend `.env`
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
QWEN_API_KEY=your-key
STRIPE_SECRET_KEY=sk_test_...
USE_SINGPASS=false
PORT=3000
```

## Next Steps

1. **Install dependencies**
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

2. **Set up database**
   ```bash
   createdb errandify
   psql errandify < database/schema.sql
   ```

3. **Configure .env files** from `.env.example`

4. **Start dev servers**
   ```bash
   # Terminal 1
   cd frontend && npm run dev

   # Terminal 2
   cd backend && npm run dev
   ```

5. **Test login** at http://localhost:5173

---

**Key Design Decisions:**
- ✅ Auth flag at top level → SingPass drops in without code changes
- ✅ Alibaba Qwen integrated from start → No refactoring later
- ✅ Mobile-first Tailwind → Responsive by design
- ✅ Shared types → Type safety across frontend/backend
- ✅ Speech pipeline ready → Voice features plug in immediately
