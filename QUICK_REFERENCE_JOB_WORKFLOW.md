# Job Completion Workflow - Quick Reference

## The Flow (End-to-End)

```
1. PLACE BID (existing)
   Doer places bid on open errand
   → MyOfferPage shows bid with "pending" status

2. ACCEPT BID (existing) 
   Asker accepts doer's bid
   → MyOfferPage shows "✅ Accepted - Confirm"
   → ErrandDetailPage shows "Confirm" button for doer

3. CONFIRM BID
   Doer confirms acceptance of job
   → Status: confirmed
   → MyOfferPage shows "🟢 Confirmed - Start"
   → ErrandDetailPage shows "▶️ Start Job" button

4. START JOB
   Doer clicks "Start Job"
   → POST /api/jobs/:id/start
   → Status: in_progress
   → ErrandDetailPage shows "✓ Mark as Completed"

5. SUBMIT COMPLETION EVIDENCE
   Doer clicks "Mark as Completed"
   → Redirects to /task/:id/complete
   → Upload photos (optional) + write notes
   → POST /api/jobs/:id/complete
   → Status: completed_unconfirmed
   → MyOfferPage shows "⏳ Awaiting Review"

6. ASKER REVIEWS COMPLETION
   Asker sees "👀 Review Completion" button
   → Redirects to /task/:id/review-completion
   → Views photos + doer's notes
   → Two options:

   OPTION A: APPROVE
   → POST /api/jobs/:id/confirm
   → Status: completed_confirmed
   → Payment released immediately
   → Next: Rating flow

   OPTION B: REQUEST MORE WORK
   → POST /api/jobs/:id/request-more-work
   → Status: back to in_progress
   → Doer notified, can resubmit evidence
   → Loop back to step 5
```

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `MyOfferPage.tsx` | 340 | Doer's bid dashboard |
| `TaskCompleteEvidencePage.tsx` | 300 | Evidence submission form |
| `ReviewCompletionPage.tsx` | 380 | Asker review interface |
| `ErrandDetailPage.tsx` | +50 | Added job start/completion |
| `BottomNav.tsx` | +5 | MyOffer navigation |
| `App.tsx` | +20 | New routes |
| `bids.ts` (backend) | +40 | GET /my-bids endpoint |
| `jobs.ts` (backend) | +60 | request-more-work endpoint |

## API Endpoints (New/Updated)

### NEW
- **GET `/api/bids/my-bids`** - Doer's all bids
- **POST `/api/jobs/:id/request-more-work`** - Send back to in_progress

### UPDATED
- **POST `/api/jobs/:id/complete`** - Now accepts completionNotes

### ALREADY EXIST
- POST `/api/jobs/:id/start` 
- POST `/api/jobs/:id/confirm`
- GET `/api/jobs/:id/photos`

## Database

Add via migration `database/add_completion_notes.sql`:
```sql
ALTER TABLE errands ADD COLUMN completion_notes TEXT;
CREATE TABLE task_photos (id, task_id, photo_url, uploaded_by, uploaded_at);
CREATE INDEX idx_task_photos_task_id ON task_photos(task_id);
```

## Status Values

| Status | Meaning | Who Sees |
|--------|---------|----------|
| `confirmed` | Bid accepted, awaiting start | Doer |
| `in_progress` | Job actively happening | Both |
| `completed_unconfirmed` | Awaiting asker review | Asker |
| `completed_confirmed` | Approved, payment released | Both |

## Navigation Routes

| Route | Page | User |
|-------|------|------|
| `/my-offer` | MyOfferPage | Doer |
| `/task/:id/complete` | Evidence submission | Doer |
| `/task/:id/review-completion` | Asker review | Asker |
| `/errand/:id` (existing) | Detail page | Both |

## Testing (5 Min)

1. **Doer**: Place bid on any open errand
2. **Asker**: Accept the bid
3. **Doer**: Confirm bid (in ErrandDetailPage)
4. **Doer**: Click "Start Job"
5. **Doer**: Click "Mark as Completed" → add notes → submit
6. **Asker**: See "Review Completion" button → click → approve
7. **Result**: Status changes to completed_confirmed, payment released

## MVP Notes

- Photos stored as data URLs (not uploaded to cloud)
- To integrate real file storage:
  1. Create `/api/upload` endpoint
  2. Update `TaskCompleteEvidencePage.uploadFiles()` to call it
  3. Return real URLs instead of data URLs

## Error Handling

- Photo upload fails? Falls back to notes-only submission
- Missing photos/notes? Shows validation error
- API errors? Displays user-friendly messages
- All endpoints require authentication

---

**Status**: ✅ Ready for testing
**Commits**: 3 (feature, database, docs)
**New Files**: 3 pages + 1 migration
**Modified Files**: 5 files
