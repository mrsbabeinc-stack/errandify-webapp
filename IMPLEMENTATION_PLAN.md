# Errandify Implementation Plan - Phase 2

**Date**: 2026-06-18  
**Modules**: 7 key features to implement

---

## 1️⃣ Browse & Bid Module (Doer Perspective)

### Features:
- **Browse Errands Page** - See all open errands
- **Errand List View** - Cards with title, location, budget, category
- **Errand Detail View** - Full details + submit bid form
- **Bid Submission** - Amount, message, estimated completion date
- **My Bids Dashboard** - Track submitted bids (Pending, Accepted, Rejected)
- **Search & Filter** - By category, location, budget range, distance

### Flow:
```
1. User switches to Doer role
2. Sees "Browse Errands" tab
3. Views list of open errands
4. Clicks errand → See full details
5. Clicks "Submit Bid" button
6. Fills: bid amount, message, completion date
7. Submit → Goes to "My Bids"
8. Wait for asker to accept/reject
```

### Backend Endpoints:
- `GET /api/errands` - List all open errands (paginated)
- `GET /api/errands/:id` - Get errand details
- `GET /api/errands/search` - Search with filters
- `POST /api/bids` - Submit bid
- `GET /api/bids/my-bids` - My submitted bids
- `GET /api/bids/:id` - Bid details
- `PATCH /api/bids/:id` - Update bid status

### Frontend Pages:
- `BrowseErrandsPage.tsx` (already exists - enhance it)
- `ErrandDetailPage.tsx` (already exists - add bid form)
- `MyBidsPage.tsx` (NEW - show submitted bids)

---

## 3️⃣ Reviews & Ratings Module

### Features:
- **Post-Completion Review Form** - Rate (1-5 stars) + comment
- **Review Display** - Show reviews on user profile
- **Rating Summary** - Average rating, total reviews
- **Review History** - View all reviews given/received
- **Verification Badge** - Show on profile when rating ≥ 4.5

### Flow:
```
1. Errand marked as "completed"
2. Both users get notification: "Rate your experience"
3. Click "Leave Review"
4. Fill: Stars (1-5), comment
5. Submit → Review published
6. Reviewer can edit/delete within 7 days
7. Reviewee can reply to review
```

### Database Tables:
```sql
reviews (
  id, reviewer_id, reviewee_id, errand_id,
  rating (1-5), comment, created_at
)
```

### Backend Endpoints:
- `POST /api/reviews` - Submit review
- `GET /api/reviews/user/:id` - Get user's reviews
- `PATCH /api/reviews/:id` - Edit review
- `DELETE /api/reviews/:id` - Delete review
- `GET /api/users/:id/rating` - User's average rating

### Frontend Pages:
- `ReviewPage.tsx` (already exists - enhance it)
- `ReviewsListPage.tsx` (NEW - show all reviews)

---

## 4️⃣ Notifications System

### Features:
- **Bell Icon with Badge** - Unread count
- **Notification Center** - Dropdown/modal to see all
- **Notification Types**:
  - New bid received (asker)
  - Bid accepted/rejected (doer)
  - Work started/completed (both)
  - New message
  - Review posted
  - Payment released
  - Reminders (24h before deadline)
- **Real-time Updates** - Via polling or WebSocket

### Flow:
```
1. Event happens (bid submitted, message sent, etc)
2. Backend creates notification record
3. Frontend polls /api/notifications every 5 seconds
4. Bell icon updates with count
5. User clicks bell → See notification center
6. Click notification → Navigate to related item
7. Notification marked as read
```

### Database Tables:
```sql
notifications (
  id, user_id, type, title, message,
  related_errand_id, related_user_id, 
  read, created_at
)
```

### Backend Endpoints:
- `GET /api/notifications` - Get user's notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

### Frontend Components:
- `NotificationIcon.tsx` (exists - enhance)
- `NotificationCenter.tsx` (NEW - modal/dropdown)

---

## 5️⃣ Messaging/Chat Module

### Features:
- **Direct Messages** - 1-to-1 conversation with another user
- **Chat List** - See all active conversations
- **Message Thread** - See full conversation history
- **Real-time Messages** - Immediate delivery
- **Typing Indicator** - "User is typing..."
- **Message Status** - Sent, Delivered, Read
- **Attachments** - Share images, files

### Flow:
```
1. Click on errand → See doer's profile
2. Click "Message" → Start chat
3. Type message → Send
4. Other user gets notification
5. They reply → Message appears
6. Full conversation history visible
```

### Database Tables:
```sql
conversations (
  id, user1_id, user2_id, errand_id,
  last_message_at, created_at
)

messages (
  id, conversation_id, sender_id,
  message_text, status (sent/read),
  created_at
)
```

### Backend Endpoints:
- `GET /api/conversations` - List user's chats
- `GET /api/conversations/:id` - Chat details
- `GET /api/conversations/:id/messages` - Message history
- `POST /api/messages` - Send message
- `PATCH /api/messages/:id` - Mark as read

### Frontend Pages:
- `ChatPage.tsx` (already exists - enhance it)
- `ConversationList.tsx` (NEW)
- `ChatThread.tsx` (NEW)

---

## 6️⃣ My Errands/Jobs Dashboard

### Features:
- **Posted Errands** (Asker View):
  - List all errands (Open, In Progress, Completed, Cancelled)
  - See bids received
  - Accept/reject bids
  - Track progress
  - Archive completed errands

- **Accepted Jobs** (Doer View):
  - List jobs they accepted bids on
  - Update status (Not Started, In Progress, Completed)
  - Mark as complete
  - Get paid
  - View job details

### Flow (Asker):
```
1. Click "My Errands" tab
2. See list: Open (5), In Progress (2), Completed (12)
3. Click errand → View bids received
4. Click bid → See doer profile
5. Accept bid → Doer notified
6. See status updates as work progresses
7. Mark complete → Release payment
```

### Flow (Doer):
```
1. Click "My Jobs" tab
2. See accepted jobs
3. Click job → Full details
4. Update status: "Starting work now"
5. Work on errand...
6. Click "Mark Complete"
7. Asker confirms → Payment released
8. Rate asker
```

### Backend Endpoints:
- `GET /api/errands/my-errands` - List user's posted errands
- `GET /api/errands/:id/bids` - Bids for specific errand
- `PATCH /api/errands/:id/status` - Update errand status
- `PATCH /api/errands/:id/accept-bid` - Accept bid
- `GET /api/jobs/my-jobs` - Doer's accepted jobs

### Frontend Pages:
- `MyErrandsPage.tsx` (enhance existing)
- `MyJobsPage.tsx` (NEW - doer's accepted jobs)
- `ErrandBidsPage.tsx` (NEW - see bids on errand)

---

## 7️⃣ Profile Photo Upload

### Features:
- **Photo Upload** - Select image from device
- **Photo Preview** - See before uploading
- **Crop/Resize** - Adjust image
- **Default Avatar** - If no photo
- **Profile Display** - Show photo everywhere (profile, bid card, review, etc)

### Flow:
```
1. Go to My Profile
2. Click on avatar/photo
3. Upload dialog opens
4. Select image from device
5. Preview shown
6. Click "Confirm"
7. Photo uploaded to server
8. Displayed on profile + everywhere else
```

### Database:
- Add `profile_photo_url` to users table
- Store in `/uploads/` directory or cloud storage (S3)

### Backend Endpoints:
- `POST /api/users/:id/photo` - Upload photo
- `DELETE /api/users/:id/photo` - Remove photo
- `GET /api/users/:id/photo` - Get photo

### Frontend:
- `PhotoUploadModal.tsx` (NEW)
- Update `MyProfilePage.tsx` to include upload

---

## 8️⃣ Advanced Search & Filtering

### Features:
- **Search by Keyword** - Title, description
- **Filter by Category** - Cleaning, Delivery, etc
- **Filter by Location** - Postal code range / distance
- **Filter by Budget** - Min-max slider
- **Filter by Rating** - Min rating required
- **Filter by Time** - ASAP, This week, Flexible
- **Sort Options** - Newest, Highest pay, Closest, Most reviews
- **Save Searches** - Save favorite search filters

### Flow:
```
1. Go to Browse Errands
2. See search bar + filter panel
3. Type keyword: "cleaning"
4. Select category: "House Cleaning"
5. Set location range: 1-5km
6. Set budget: $50-$200
7. Results update in real-time
8. Can save search for later
```

### Backend Endpoints:
- `GET /api/errands/search` - Search with filters
  - Query params: q, category, location, budget_min, budget_max, rating_min, sort
- `GET /api/searches/saved` - User's saved searches
- `POST /api/searches/save` - Save search

### Frontend:
- `SearchFilters.tsx` (NEW - reusable component)
- Enhance `BrowseErrandsPage.tsx` with filters

---

## Implementation Priority:

### Phase 2A (Critical):
1. ✅ Browse & Bid (Module 1)
2. ✅ My Errands Dashboard (Module 6)
3. ✅ Notifications (Module 4)

### Phase 2B (Important):
4. ✅ Messaging (Module 5)
5. ✅ Reviews (Module 3)

### Phase 2C (Polish):
6. ✅ Profile Photo (Module 7)
7. ✅ Advanced Search (Module 8)

---

## Database Changes Needed:

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR(500);

-- Create bids table
CREATE TABLE bids (
  id SERIAL PRIMARY KEY,
  errand_id INTEGER NOT NULL REFERENCES errands(id),
  doer_id INTEGER NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2),
  message TEXT,
  estimated_completion_date DATE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  reviewee_id INTEGER NOT NULL REFERENCES users(id),
  errand_id INTEGER NOT NULL REFERENCES errands(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type VARCHAR(50), -- bid_received, bid_accepted, message, etc
  title VARCHAR(255),
  message TEXT,
  related_errand_id INTEGER REFERENCES errands(id),
  related_user_id INTEGER REFERENCES users(id),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER NOT NULL REFERENCES users(id),
  user2_id INTEGER NOT NULL REFERENCES users(id),
  errand_id INTEGER REFERENCES errands(id),
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  message_text TEXT,
  status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, read
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Next Steps:

1. **Start with Module 1**: Enhance Browse & Bid
2. **Then Module 6**: My Errands Dashboard
3. **Then Module 4**: Notifications
4. Continue with remaining modules

Each module builds on previous ones!

