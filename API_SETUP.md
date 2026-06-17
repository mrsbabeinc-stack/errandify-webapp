# Errandify API Setup Guide

## Alibaba Qwen API Configuration

### ✅ Status
You already have the API key configured in `.env` file.

### What is Qwen API?
Alibaba's Qwen AI API provides:
- **Text generation** - AI conversations, suggestions
- **Content moderation** - Safety filtering
- **Speech recognition** - Audio transcription (future)
- **Text-to-speech** - Voice synthesis (future)

### Current Usage in Errandify

#### AI Features Powered by Qwen:

1. **Category Detection** (`/api/ai/detect-category`)
   - Analyzes errand title to suggest category
   - Example: "Help me wash my dog" → "pet-care"
   - Used in: Create Errand flow

2. **Date/Time Parsing** (`/api/ai/parse-datetime`)
   - Parses natural language dates
   - Example: "Tomorrow at 2pm" → "2026-06-18 14:00"
   - Used in: Hana task creation

3. **Content Filtering** (`/api/ai/content-filter`)
   - Checks for inappropriate content
   - Flags sexual, illegal, exploitative content
   - Used in: Before posting errand

4. **Title Suggestions** (`/api/ai/suggest-completion`)
   - Suggests task completions as user types
   - Example: "Help me w..." → "Help me wash clothes"
   - Used in: Manual form mode

5. **Comprehensive Suggestions** (`/api/ai/suggestions`)
   - Category detection
   - Description generation
   - Budget suggestions
   - Skills detection
   - Certification recommendations
   - Task details notes
   - Used in: CreateErrandPage

6. **Hana Chat** (`/api/chat/hana`)
   - Conversational AI for Hana assistant
   - Responds to user queries
   - Provides help/guidance
   - Used in: HanaAssistant component

---

## Testing AI Features

### Test Category Detection
```bash
curl -X POST http://localhost:3000/api/ai/detect-category \
  -H "Content-Type: application/json" \
  -d '{"title": "Help me wash my dog", "description": ""}'
```

### Test Date Parsing
```bash
curl -X POST http://localhost:3000/api/ai/parse-datetime \
  -H "Content-Type: application/json" \
  -d '{"input": "Tomorrow at 2pm"}'
```

### Test Content Filter
```bash
curl -X POST http://localhost:3000/api/ai/content-filter \
  -H "Content-Type: application/json" \
  -d '{"title": "Help me clean", "description": "Need house cleaning help"}'
```

### Test Hana Chat (requires auth token)
```bash
curl -X POST http://localhost:3000/api/chat/hana \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"message": "How do I post a task?", "conversationId": "test"}'
```

---

## Environment Variables

Your `.env` file should contain:

```
QWEN_API_KEY=sk-ws-[your-key-here]
DATABASE_URL=postgresql://localhost/errandify
JWT_SECRET=test-secret-key
```

The API key is automatically loaded when the backend starts.

---

## Troubleshooting

### AI endpoints returning empty results
1. Check `.env` file has valid `QWEN_API_KEY`
2. Restart backend server: `npm run dev --prefix backend`
3. Check backend logs for API errors

### "Unauthorized" errors from Qwen
- API key may have expired
- Get new key from: https://dashscope.console.aliyun.com/

### Voice features not working
- Browser Web Speech API doesn't need API key
- Only needs microphone permission
- Check browser console for audio errors

---

## Next Steps

1. ✅ API key is configured
2. ✅ Backend is using Qwen for AI features
3. 🔄 Frontend needs voice improvements:
   - Better female voice selection
   - Add animation feedback during speech
   - Test all AI endpoints with real data
