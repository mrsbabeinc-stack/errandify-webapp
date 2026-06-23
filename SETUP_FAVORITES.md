# Chat Restrictions & Favorites Setup Guide

## Step 1: Run Database Migrations

Create the necessary database tables:

```bash
# From backend directory
cd backend

# Create user_favorites table
psql -U postgres -h localhost -d errandify < migrations/create_user_favorites.sql

# Create disputes table (if not already present)
psql -U postgres -h localhost -d errandify < migrations/create_disputes.sql
```

## Step 2: Verify Database Tables

```sql
-- Check if tables exist
\dt user_favorites
\dt disputes

-- Sample queries to test
SELECT * FROM user_favorites LIMIT 5;
SELECT * FROM disputes LIMIT 5;
```

## Step 3: Restart Backend

```bash
npm run dev
```

## Step 4: Test in Frontend

1. **Hard refresh** browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Open chat for a confirmed errand
3. Verify:
   - ✅ Both Asker and Doer shown in Participants section
   - ✅ Heart icon appears next to OTHER party (not yourself)
   - ✅ Heart is 🤍 (white) when not favorited
   - ✅ Click heart → turns ❤️ (red) and shows success message
   - ✅ Click again → reverts to 🤍 and shows removal message

## Features Implemented

### Chat Restrictions
- Chat disabled if dispute raised on errand
- Chat disabled 48+ hours after job completion
- User-friendly error messages shown
- Send button disabled with reason

### Favorite System
- 🤍 / ❤️ heart icon in participant list
- Only shows for OTHER party (not yourself)
- Click to toggle add/remove
- Persists to database
- Shows success notification

## API Endpoints

**POST /api/users/favorite/:userId**
- Body: `{ taskId }`
- Response: `{ success, favorited, message }`

**GET /api/messages/tasks/:taskId**
- Returns `chatStatus` with:
  - `isDisabled: boolean`
  - `reason: string`
  - `isFavorited: boolean`

## Database Schema

**user_favorites**
```
id | user_id | favorite_user_id | added_at
```

**disputes** (used for chat blocking)
```
id | errand_id | raised_by_id | status | reason | created_at
```

## Files Modified

**Frontend:**
- `frontend/src/components/TaskChatbox.tsx` - Added favorite button, chat restrictions
- `frontend/src/pages/MyOfferPage.tsx` - Passes errand details to chat

**Backend:**
- `backend/src/routes/users.ts` - Added POST /api/users/favorite/:userId
- `backend/src/routes/messages.ts` - Added chatStatus to GET /api/messages/tasks/:taskId

**Migrations:**
- `backend/migrations/create_user_favorites.sql` - User favorites table
- `backend/migrations/create_disputes.sql` - Disputes table

