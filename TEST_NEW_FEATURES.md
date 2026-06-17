# Testing Errandify: Hana AI & Smart Task Creation

**Servers Running:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Database: postgresql://localhost/errandify

---

## 🧪 Full Testing Flow

### 1. **Sign Up (Mock Auth)**

**URL:** http://localhost:5173

1. Click "Sign Up with SingPass"
2. Select "Tan Wei Ming, 51, Asker" (or custom)
3. Fill mobile: `98765432`
4. Select language: English
5. Click "Join the Kampung"

**Expected:**
- ✅ Redirects to Category Selection
- ✅ Font size is large (19px for age 51+)

---

### 2. **Category Selection**

**URL:** http://localhost:5173/category

1. See 8 category cards: Home Maintenance, Cleaning, Shopping, Delivery, Childcare, Pet Care, Tech Support, Moving Help
2. Click on **"Pet Care"** (🐕)
3. Click "Continue"

**Expected:**
- ✅ Navigates to `/create-errand/pet-care`

---

### 3. **Smart 3-Step Task Creation (NEW!)**

#### **Step 1: Quick Input** ⚡
**You are here:** "What do you need help with?"

1. **Type slowly:** "Dog"
2. **See AI suggestions appear:**
   - "Dog walking"
   - "Pet sitting"
   - "Grooming"
   - "Vet visit help"
3. **Click "Dog walking"**
4. Click "Continue → Add Details"

**Expected:**
- ✅ Suggestions appear while typing
- ✅ Clicking suggestion fills the title
- ✅ Form moves to Step 2

#### **Step 2: Details** 📝
**Screen:** "Tell us more"

1. **Description:** "My 2-year-old poodle needs a 30-minute walk daily"
2. **Location:** "Bukit Merah, Singapore"
3. **Urgency:** Select "Normal (within a few days)"
4. **Budget:** "25.00" (SGD)
5. **Deadline:** Tomorrow at 14:00
6. Click "Review & Post"

**Expected:**
- ✅ All fields optional except Step 1 title
- ✅ Moves to Step 3 for review

#### **Step 3: Review** 👀
**Screen:** "Ready to post?"

1. **See preview card:**
   - Title: "Dog walking"
   - Description: "My 2-year-old poodle..."
   - Location: "Bukit Merah, Singapore"
   - Budget: "$25.00" in orange
   - Urgency: "🟡 Normal"
   - Deadline: Tomorrow's date
2. Click "✨ Post Errand"

**Expected:**
- ✅ Card shows all details user entered
- ✅ Post succeeds
- ✅ Errand created in database

---

### 4. **Test Hana AI Assistant (NEW!)** 🌸

**Floating Button Location:** Bottom-right corner of screen (always visible)

#### **Test 4a: Chat Interface**

1. **Click the 🌸 button** (bottom-right)
2. **See Hana chat window open:**
   - Header: "Hana Assistant - Always here to help"
   - Initial message: "Hello! I'm Hana. 🌸 I'm here to help you post tasks..."
3. **Type in chat:** "How do I post a task?"
4. **Send message**

**Expected:**
- ✅ Chat window opens
- ✅ Initial greeting shows
- ✅ Message sent
- ✅ Loading dots appear
- ✅ AI response from Qwen 3.7 Plus (takes 2-3 seconds)
- ✅ Response explains task posting process
- ✅ Chat flows naturally

**Sample Questions to Try:**
- "How much should I budget for dog walking?"
- "What categories are available?"
- "How do I find a doer?"
- "Is this platform safe?"

#### **Test 4b: SOS Emergency Button**

1. **In Hana chat window**
2. **Click red "🆘 SOS - Emergency Help" button**

**Expected:**
- ✅ User message appears: "🆘 SOS - I need emergency help!"
- ✅ Loading dots show
- ✅ Hana responds with emergency protocol:
  - "I'm here to help!"
  - Immediate steps (call 999, contact support, etc.)
  - Common emergency types listed
  - Follow-up question

#### **Test 4c: Close Chat**

1. **Click ✕ button** (top-right of chat)
2. **Chat closes, 🌸 button visible again**
3. **Click 🌸 again**

**Expected:**
- ✅ Chat remembers conversation history
- ✅ Previous messages still there
- ✅ Can continue chatting

---

## 🎯 Feature Verification Checklist

### Hana AI Assistant
- [ ] Floating button appears bottom-right
- [ ] Button is pink/orange gradient
- [ ] Chat window opens/closes
- [ ] Messages send and receive responses
- [ ] Responses are helpful & conversational
- [ ] Responses mention Errandify features
- [ ] SOS button works
- [ ] Emergency response includes 999 info
- [ ] Chat history persists

### Smart Task Creation
- [ ] Step 1: Title input shows category hints
- [ ] Step 1: Suggestions appear while typing
- [ ] Step 1: Clicking suggestion fills title
- [ ] Step 2: Description optional
- [ ] Step 2: Location optional
- [ ] Step 2: Urgency selector works (Low/Normal/Urgent)
- [ ] Step 2: Budget optional
- [ ] Step 2: Deadline optional
- [ ] Step 3: Preview shows all entered data
- [ ] Step 3: Post succeeds
- [ ] New errand in database: `psql errandify -c "SELECT * FROM errands;"`

### Database
- [ ] Errand created with title "Dog walking"
- [ ] Category saved as "pet-care"
- [ ] Budget saved as 25.00
- [ ] Status is "open"
- [ ] User ID (asker_id) is correct

---

## 🔍 Cost Optimization Verification

### Qwen 3.7 Plus Usage
- ✅ Chat responses use Qwen 3.7 Plus (not GPT-4)
- ✅ Fast responses (2-3 seconds per message)
- ✅ API key from config
- ✅ Requests sent to: `dashscope-intl.aliyuncs.com`

**Cost Savings:**
- Qwen 3.7 Plus: ~$0.002 per 1K tokens
- GPT-4: ~$0.03 per 1K tokens
- **Saving: 15x cheaper**

---

## 🐛 Troubleshooting

### "Hana button not appearing"
- Check: Frontend running (`localhost:5173`)
- Check: Console for JS errors (F12 → Console)
- Try: Refresh page
- Try: Clear localStorage: `localStorage.clear()`

### "Hana chat not responding"
- Check: Backend running (`localhost:3000`)
- Check: DASHSCOPE_API_KEY set in .env
- Check: Backend logs: `tail -f /tmp/backend.log`
- Try: Type in chat again

### "Task creation not working"
- Check: Category page loads
- Check: Step 1 input visible
- Check: Backend logs for POST /api/errands errors
- Try: Post without budget/deadline (only title required)

### "Suggestions not showing"
- Check: Category is pet-care (has hints)
- Check: Type slow (wait for debounce)
- Try: Clear and retype
- Try: Refresh page

---

## 📊 What's Different from Before?

| Feature | Before | After | Cost Impact |
|---------|--------|-------|-------------|
| Task Creation | 1 big form | 3-step wizard | ↓ Friction |
| AI Suggestions | None | Category-specific | ↓ User effort |
| Chat Support | None | Hana 24/7 | ↑ Cost (+2-3¢/user/month) |
| Emergency Help | None | SOS button | ✅ Safety |
| AI Model | N/A | Qwen 3.7 Plus | ✅ 15x cheaper than GPT-4 |

---

## 📝 Expected Behavior Summary

✅ **Intuitive:** Tasks post in 3 steps, not 5+ fields  
✅ **Smart:** AI suggests completions while typing  
✅ **Helpful:** Hana available 24/7 via floating button  
✅ **Safe:** SOS emergency path built-in  
✅ **Cost-Optimized:** Uses Alibaba Qwen (10-15x cheaper)  
✅ **Trip.com-like:** Floating assistant familiar to Asian users  

---

## 🚀 After Testing

1. **Success:** Commit changes with: `git log --oneline -5`
2. **Issues:** Check logs and debug
3. **Ready for more features:** Category selection, chat, ratings

Happy testing! 🌸
