# Phase 2: Category Selection & Errand Management

## Overview

After users complete authentication, they land on the **Category Selection Screen** where they choose what type of help they need (asker) or what type of tasks they want to do (doer). This phase implements the complete flow from signup → category selection → errand creation (asker) or browsing (doer).

---

## 🏗️ Architecture

### User Flow

```
Signup Complete
      ↓
Category Selection Screen
      ├─ Asker Path → Create Errand → Post
      └─ Doer Path → Browse Errands → Accept Task
```

### Routes

#### Frontend
- `/category` — Category selection (post-auth entry point)
- `/create-errand/:categoryId` — Post new errand (asker)
- `/browse-errands/:categoryId` — View available errands (doer)

#### Backend
- `POST /api/errands` — Create errand
- `GET /api/errands` — List errands with filters
- `GET /api/errands/:id` — Get single errand
- `PUT /api/errands/:id` — Update errand

---

## 📱 UI Components

### 1. CategorySelectionPage

**Location:** `frontend/src/pages/CategorySelectionPage.tsx`

**Features:**
- 8 pre-defined errand categories (icons, descriptions, colors)
- Grid layout (2 columns on mobile)
- Category selection animation
- Skip button (go straight to dashboard)
- Continue button (navigate to create/browse)

**Categories:**
1. 🏠 Home Maintenance
2. 🧺 Cleaning & Laundry
3. 🛍️ Shopping & Errands
4. 📦 Delivery & Moving
5. 🧒 Childcare & Tutoring
6. 🐕 Pet Care
7. 💻 Tech Support
8. 🚚 Moving Help

**Props:**
```typescript
interface CategorySelectionPageProps {
  userRole: 'asker' | 'doer';
}
```

**Flow:**
- User selects category
- Click "Continue"
- Asker → `/create-errand/:categoryId`
- Doer → `/browse-errands/:categoryId`

---

### 2. CreateErrandPage

**Location:** `frontend/src/pages/CreateErrandPage.tsx`

**Features:**
- Form fields: Title, Description, Budget, Location, Deadline
- Category breadcrumb
- Real-time validation
- API integration
- Success navigation to errand detail

**Form Fields:**
```typescript
{
  title: string;         // Required, max 255 chars
  description: string;   // Required, multiline
  budget: number;        // Optional, SGD
  location: string;      // Optional
  deadline: ISO8601;     // Optional
  category: string;      // From URL param
}
```

**API Call:**
```typescript
POST /api/errands
{
  title, description, category, budget, deadline, location
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "title": "...",
    "status": "open",
    "createdAt": "2026-06-16T..."
  }
}
```

---

### 3. BrowseErrandsPage

**Location:** `frontend/src/pages/BrowseErrandsPage.tsx`

**Features:**
- List of errands in category
- Errand cards with metadata
- View & Accept button
- Empty state handling
- Loading state

**Errand Card Shows:**
- Title
- Description (truncated)
- Budget (SGD)
- Location
- Deadline
- Asker name & rating
- View & Accept button

**API Call:**
```typescript
GET /api/errands?category=cleaning-laundry
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "title": "Deep clean apartment",
      "description": "3-bedroom apartment needs...",
      "budget": 150.00,
      "location": "Clementi",
      "deadline": "2026-06-20T...",
      "askerName": "Jane Doe",
      "askerRating": 4.8
    }
  ]
}
```

---

## 🗄️ Database Updates

### Errands Table

```sql
CREATE TABLE errands (
  id SERIAL PRIMARY KEY,
  asker_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'open' CHECK (...),
  budget DECIMAL(10, 2),
  deadline TIMESTAMP,
  location VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status Values:**
- `open` — Available for doers to accept
- `assigned` — A doer has accepted
- `in_progress` — Work has started
- `completed` — Work finished
- `cancelled` — Cancelled by asker

**Indexes:**
```sql
CREATE INDEX idx_errands_asker_id ON errands(asker_id);
CREATE INDEX idx_errands_category ON errands(category);
CREATE INDEX idx_errands_status ON errands(status);
```

---

## 🔌 API Endpoints

### POST /api/errands

**Create a new errand**

**Request:**
```bash
POST /api/errands
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Need someone to walk my dog",
  "description": "Need my 2-year-old poodle walked...",
  "category": "pet-care",
  "budget": 25.00,
  "location": "Bukit Merah",
  "deadline": "2026-06-20T14:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "42",
    "title": "Need someone to walk my dog",
    "description": "Need my 2-year-old poodle...",
    "status": "open",
    "createdAt": "2026-06-16T10:00:00Z"
  }
}
```

**Status Codes:**
- `201` — Errand created
- `400` — Missing required fields
- `401` — Unauthorized
- `500` — Server error

---

### GET /api/errands

**List errands with filters**

**Request:**
```bash
GET /api/errands?category=pet-care&status=open&sort=deadline
Authorization: Bearer {token}
```

**Query Parameters:**
- `category` (optional) — Filter by category
- `status` (optional) — Filter by status (default: open)
- `sort` (optional) — `budget-high`, `deadline`, or `recent` (default)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "42",
      "title": "Walk my dog",
      "description": "2-year-old poodle...",
      "budget": 25.00,
      "location": "Bukit Merah",
      "deadline": "2026-06-20T14:00:00Z",
      "askerName": "Jane Doe",
      "askerRating": 4.8
    }
  ]
}
```

---

### GET /api/errands/:id

**Get single errand details**

**Request:**
```bash
GET /api/errands/42
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "42",
    "title": "Walk my dog",
    "description": "Full description...",
    "category": "pet-care",
    "status": "open",
    "budget": 25.00,
    "location": "Bukit Merah",
    "deadline": "2026-06-20T...",
    "asker": {
      "display_name": "Jane Doe",
      "mobile": "98765432"
    }
  }
}
```

---

### PUT /api/errands/:id

**Update errand (asker only)**

**Request:**
```bash
PUT /api/errands/42
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Need someone to walk my dog (URGENT)",
  "status": "cancelled"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "42",
    "title": "Need someone to walk my dog (URGENT)",
    "status": "cancelled"
  }
}
```

**Authorization:**
- Only asker (creator) can update
- Returns 403 if not authorized

---

## 🎨 UI Mockups

### Category Selection Screen

```
┌─────────────────────────────────┐
│  What do you need help with?   │
│  Select a category to post...   │
├─────────────────────────────────┤
│                                 │
│  ┌────────┐  ┌────────┐        │
│  │   🏠   │  │   🧺   │        │
│  │ Home   │  │Clean.  │        │
│  └────────┘  └────────┘        │
│  ┌────────┐  ┌────────┐        │
│  │   🛍️   │  │   📦   │        │
│  │Shop    │  │Deliv.  │        │
│  └────────┘  └────────┘        │
│  ┌────────┐  ┌────────┐        │
│  │   🧒   │  │   🐕   │        │
│  │Care    │  │Pet     │        │
│  └────────┘  └────────┘        │
│  ┌────────┐  ┌────────┐        │
│  │   💻   │  │   🚚   │        │
│  │Tech    │  │Move    │        │
│  └────────┘  └────────┘        │
│                                 │
│  [Skip] [Continue]              │
└─────────────────────────────────┘
```

### Create Errand Form

```
┌─────────────────────────────────┐
│  Post an Errand                 │
│  Category: Pet Care             │
├─────────────────────────────────┤
│                                 │
│  Title *                        │
│  [Walk my dog...             ]  │
│                                 │
│  Description *                  │
│  [I need my 2-year-old poodle   │
│   walked every day from 2-4pm   │
│   Friendly with other dogs      ]│
│                                 │
│  Budget (SGD)                   │
│  [25.00                      ]  │
│                                 │
│  Location                       │
│  [Bukit Merah, Singapore     ]  │
│                                 │
│  Deadline                       │
│  [2026-06-20 14:00          ]  │
│                                 │
│                                 │
│  [Post Errand]                  │
└─────────────────────────────────┘
```

### Browse Errands List

```
┌─────────────────────────────────┐
│  Available Tasks                │
│  Category: Pet Care             │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐ │
│  │ Walk my dog                 │ │
│  │ 2-year-old poodle, friendly │ │
│  │                             │ │
│  │ $25.00  📍 Bukit Merah      │ │
│  │ 📅 20 Jun  ⭐ 4.8            │ │
│  │                             │ │
│  │ Posted by: Jane Doe         │ │
│  │ [View & Accept]             │ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │ Clean my office             │ │
│  │ 500 sqft office space...     │ │
│  │                             │ │
│  │ $150.00 📍 Clementi         │ │
│  │ 📅 19 Jun ⭐ 5.0             │ │
│  │                             │ │
│  │ Posted by: John Smith       │ │
│  │ [View & Accept]             │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Category Selection
- [ ] 8 categories display correctly
- [ ] Category selection highlights
- [ ] Skip button goes to home
- [ ] Continue button navigates based on role

### Create Errand (Asker)
- [ ] Form validates required fields
- [ ] Budget accepts decimals
- [ ] Deadline picker works
- [ ] Submit creates errand in DB
- [ ] Success navigates to detail page

### Browse Errands (Doer)
- [ ] Errands load from API
- [ ] Filters by category work
- [ ] Cards display all info
- [ ] Empty state shows when no errands
- [ ] Loading state shows

### Database
- [ ] Errands table has correct schema
- [ ] Asker ID links to users
- [ ] Status values are valid
- [ ] Indexes created

### API
- [ ] POST /api/errands creates record
- [ ] GET /api/errands returns list
- [ ] GET /api/errands/:id returns detail
- [ ] PUT /api/errands/:id updates
- [ ] Authorization checks work

---

## 📊 Data Model

```
User (authenticated)
  ├─ id
  ├─ display_name
  ├─ mobile
  ├─ role (asker/doer)
  └─ created_at

Errand
  ├─ id
  ├─ asker_id → User.id
  ├─ title
  ├─ description
  ├─ category
  ├─ status
  ├─ budget
  ├─ deadline
  ├─ location
  ├─ created_at
  └─ updated_at
```

---

## 🔄 Workflow

### Asker Flow
1. Login → Category Selection
2. Select category
3. Fill form (title, description, budget, etc.)
4. Post Errand
5. Errand appears in "My Errands"
6. Doers can accept task

### Doer Flow
1. Login → Category Selection
2. Select category to help with
3. Browse available errands
4. Click "View & Accept"
5. Accept task → Assigned to them
6. Start work, update status to "in_progress"
7. Mark "completed" when done

---

## 🚀 When Node.js is Fixed

Once Node.js installation is resolved:

```bash
cd frontend && npm run dev
cd backend && npm run dev
```

Then test:
1. Login and go to category selection
2. Test both asker and doer flows
3. Create an errand
4. Browse errands
5. Check database for new records

---

## 📝 Summary

**Phase 2 Implementation:**
- ✅ Category selection UI (8 categories)
- ✅ Create errand form (asker flow)
- ✅ Browse errands list (doer flow)
- ✅ Full API implementation
- ✅ Database schema
- ✅ Routing and navigation

**Next: Phase 3 (Chat & Real-time)**
- Errand detail pages
- Accept/decline workflow
- Chat system
- Real-time notifications
- Qwen AI integration

---
