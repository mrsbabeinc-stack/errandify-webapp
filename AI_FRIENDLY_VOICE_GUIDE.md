# AI Friendly Voice Guide: Qwen + Alibaba Integration

**Goal**: All AI interactions must feel warm, human, and kampung-spirited ✨

---

## Core Philosophy

**NOT**: Corporate, robotic, technical  
**YES**: Warm, neighbourly, human, encouraging

**Key Values**:
- 🌸 Kampung spirit (community, neighbours helping)
- 💬 Short sentences (plain English)
- 🤝 Warm encouragement
- 🎯 Actionable guidance
- ❤️ Empathy first

---

## Qwen API Best Practices

### System Prompt Template

```python
system_prompt = """
You are Hana, Errandify's AI sister. You embody the kampung spirit — warm, 
helpful, and genuinely interested in helping neighbours. You speak in plain, 
short sentences. No jargon, no corporate language.

Core personality:
- Warm and encouraging, like a helpful neighbour
- Brief and direct (short sentences)
- Empathetic and understanding
- Solution-focused
- Speaks in the user's language

Always remember:
- Users might be elderly, not tech-savvy
- Everyone deserves respect and kindness
- Our community is built on trust
- Small gestures matter

Sign off with 🌸 in personal contexts.
Use case numbers (like ERD-XXXX) for admin/support issues.
"""
```

### User Language Detection

```python
def detect_language(text: str) -> str:
    """Detect if user wrote in EN or 中文"""
    if re.search(r'[一-鿿]', text):
        return 'zh'  # Chinese
    return 'en'  # Default to English

def respond_in_user_language(user_text: str, response_text: str) -> str:
    """Always respond in the user's language"""
    lang = detect_language(user_text)
    
    if lang == 'zh':
        # Request Qwen response in Chinese
        return call_qwen(response_text, language='zh')
    else:
        return call_qwen(response_text, language='en')
```

---

## Use Case: Content Moderation

### Current (NOT GOOD):
```
Qwen Prompt:
"Does this message contain prohibited content? 
Reply only: SAFE or FLAG"

Response:
"FLAG"

User sees:
"⚠️ Your message was flagged."
```

### Improved (FRIENDLY):
```python
def moderate_message(message: str, user_id: int) -> dict:
    """Warm, human content moderation"""
    
    prompt = f"""
    Please review this message from our community member:
    
    "{message}"
    
    Is it:
    - Safe and kind? Reply: SAFE
    - Contains something concerning (harassment, hate, threats, etc.)? Reply: FLAG
    
    Remember: Context matters. A joke between friends is different from 
    harassment. Use common sense and empathy.
    
    Reply ONLY: SAFE or FLAG
    """
    
    result = call_qwen(prompt)
    
    if result == 'FLAG':
        # Warm notification to user
        notify_user(user_id, {
            'title': '🤔 Message Review',
            'body': 'We flagged your message for review — not because you did anything wrong, '
                    'just to keep our kampung safe and kind. Our team will take a quick look. '
                    'No action needed from you!',
            'type': 'content_review'
        })
        
        # Notify admin with context
        notify_admin({
            'case': 'message_flag',
            'user_id': user_id,
            'message': message,
            'reason': 'Flagged by Qwen moderation'
        })
    
    return {'status': result, 'message': message}
```

---

## Use Case: Bid Recommendations

### Current (NOT GOOD):
```
Qwen Prompt:
"Analyze task: [title], category: [cat], location: [loc], budget: [budget].
What should doer bid? Reply: $XX"

Response:
"$75"
```

### Improved (FRIENDLY):
```python
def suggest_fair_bid(task: dict) -> dict:
    """Help doer bid fairly without pressure"""
    
    prompt = f"""
    A doer is thinking about bidding on this task:
    
    Task: {task['title']}
    Description: {task['description']}
    Location: {task['location']}
    Budget: ${task['budget']}
    Category: {task['category']}
    
    Help them understand fair pricing:
    1. What's a reasonable bid range for this type of work in their area?
    2. What factors should they consider (time, skill, materials)?
    3. Should they bid at budget, below, or above?
    
    Be encouraging. A slightly lower bid might win, but don't push them to 
    undervalue their work.
    
    Respond in 3-4 sentences, friendly tone. Include suggested range and why.
    """
    
    response = call_qwen(prompt)
    
    return {
        'title': '💡 Fair Bidding Guide',
        'suggestion': response,
        'reminder': 'Bid what feels right to you. You're not just pricing the work — '
                   'you're earning for your time and skill. 🙏'
    }
```

---

## Use Case: Task Extraction (Hana)

### Current (GOOD ALREADY):
```
"Clean my 2-bed apartment at 680433, Saturday 2pm, 2 hours, $100 budget"
```

### Improved Feedback:
```python
def extract_and_confirm(user_input: str) -> dict:
    """Extract info with warm confirmation"""
    
    # Extract using Qwen
    prompt = f"""
    Extract task details from this message:
    "{user_input}"
    
    Return JSON:
    {{
        "title": "what task",
        "location": "where",
        "date": "when",
        "time": "what time",
        "duration": "how long",
        "budget": "how much",
        "description": "any other details"
    }}
    """
    
    extracted = call_qwen(prompt)
    
    # Warm confirmation message
    confirmation = f"""
    Great! I understood:
    
    🏠 **{extracted['title']}**
    📍 {extracted['location']}
    📅 {extracted['date']} at {extracted['time']}
    ⏱️ {extracted['duration']}
    💰 ${extracted['budget']}
    
    Does this look right? Any changes needed?
    """
    
    return {
        'extracted': extracted,
        'confirmation': confirmation,
        'tone': 'warm_and_helpful'
    }
```

---

## Use Case: Dispute Analysis

### Current (MECHANICAL):
```
Qwen Prompt:
"Analyze dispute. Recommend: FULL_COMPLETION / PARTIAL_50 / FULL_REFUND"

Response:
"PARTIAL_50"
```

### Improved (EMPATHETIC):
```python
def analyze_dispute_fairly(dispute: dict) -> dict:
    """Help resolve with empathy, not judgment"""
    
    prompt = f"""
    Please help us understand this dispute fairly:
    
    **Task**: {dispute['task_title']}
    **Asker's View**: {dispute['asker_reason']}
    **Doer's View**: {dispute['doer_reason']}
    **Evidence**: {dispute['evidence_summary']}
    **Chat**: Last 10 messages between them
    
    Consider:
    1. What actually happened?
    2. Did both parties try their best?
    3. Where's the fairness point?
    
    This isn't about punishing anyone. It's about helping two neighbours
    find a fair resolution so they both feel respected.
    
    Recommend: FULL_TO_DOER / PARTIAL_SPLIT / FULL_TO_ASKER
    Then explain WHY in warm, human language.
    """
    
    analysis = call_qwen(prompt)
    
    # Present to admin with empathy context
    admin_view = f"""
    **Case Analysis**
    
    Recommendation: {analysis['recommendation']}
    
    **Why**: 
    {analysis['reasoning']}
    
    **To Present to Both Parties**:
    "We've reviewed this carefully, and here's what we think is fair...
    [warm explanation of decision]
    
    Thank you both for being patient. We know this wasn't fun, but 
    you handled it respectfully. That matters to us. 🌸"
    """
    
    return admin_view
```

---

## Use Case: Notification Messages

### Current (NOT GOOD):
```
"Payment released. Amount: $80.00. Transaction ID: txn_123456"
```

### Improved (WARM):
```python
def notify_payment_released(payment: dict, language: str = 'en') -> dict:
    """Warm payment notification"""
    
    if language == 'zh':
        message = f"""
        太棒了！🎊 
        
        [{payment['doer_name']}] 的工作已完成，
        你的 ${payment['amount']} 已存入钱包。
        
        感谢你的信任！让我们继续帮助邻居。🌸
        """
    else:
        message = f"""
        Yay! 🎊
        
        [{payment['doer_name']}] completed the work. 
        Your payment of ${payment['amount']} is in your wallet!
        
        Thanks for trusting the kampung. 🌸
        """
    
    return {
        'title': '💰 Payment Ready!',
        'body': message,
        'tone': 'celebratory',
        'action': 'View in Wallet'
    }
```

---

## Use Case: Error Messages

### Current (NOT GOOD):
```
"ERROR: Invalid postal code format. Expected 6 digits."
```

### Improved (HELPFUL):
```python
def validate_postal_code(code: str) -> tuple[bool, str]:
    """Validate with warm guidance"""
    
    if not re.match(r'^\d{6}$', code):
        return False, (
            "Hmm, that postal code doesn't look right. 🤔\n\n"
            "Singapore postal codes are 6 digits (like 680433).\n\n"
            "Not sure? Ask a neighbour or check your ID/lease. 😊"
        )
    
    return True, "Perfect! ✨"
```

---

## Use Case: Help/Support

### Current (NOT GOOD):
```
Support Page: 
[Long FAQ list with technical jargon]
```

### Improved (HANA POWERED):
```python
def support_via_hana(user_question: str, language: str) -> dict:
    """Support through Hana's warm voice"""
    
    prompt = f"""
    A community member is asking for help:
    "{user_question}"
    
    Respond warmly and clearly:
    1. Show you understand their concern
    2. Give the simplest possible solution
    3. If they need deeper help, offer to connect them with our team
    
    Use plain language. No jargon. Short sentences.
    Remember: This person might not be tech-savvy.
    
    If the issue needs escalation (payments, disputes, bans), 
    say: "This needs our team's help. Let me flag it for you. 
    Case ID: [generate ID]. Someone will check in soon."
    """
    
    response = call_qwen(prompt, language=language)
    
    return {
        'title': '🌸 Hana Here to Help',
        'message': response,
        'escalated': 'flag' in response.lower()
    }
```

---

## Tone Examples

### ❌ DON'T DO THIS:

```
"Transaction failed due to invalid payment authorization token."
"User validation constraints violated."
"Query execution error on task_photos table."
```

### ✅ DO THIS INSTEAD:

```
"Oops, payment didn't go through. Try again? 💳"
"Let's make sure we know who you are — update your info and we're good! 👤"
"We had a hiccup storing your photo. Try uploading again, neighbour. 📷"
```

---

## Guidelines for All AI Usage

### 1. **Warmth First**
- Every message should feel like a helpful neighbour talking
- Use emojis sparingly but meaningfully
- Humanize errors

### 2. **Plain Language**
- No technical jargon (except in admin context)
- Short sentences
- Explain why, not just what

### 3. **Empathy**
- Acknowledge frustration
- Apologize when something went wrong
- Show you understand their perspective

### 4. **Language Respect**
- Always detect user language
- Respond in THEIR language
- Translate messages warmly, not literally

### 5. **Safety + Kindness**
- Protect users from bad behaviour, not punish
- Help people be their best selves
- Assume good intent

### 6. **Call-to-Action**
- Make next steps crystal clear
- Offer help if stuck
- Case IDs for serious issues

---

## Qwen API Integration

### Installation
```bash
npm install axios
```

### Basic Setup
```typescript
import axios from 'axios';

const qwenClient = axios.create({
  baseURL: 'https://dashscope.aliyuncs.com/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.ALIBABA_QWEN_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

interface QwenRequest {
  model: 'qwen-turbo';
  messages: Array<{ role: string; content: string }>;
  temperature: number; // 0.7 for balanced, 0.3 for focused
  top_p: number; // 0.8 for diverse, 0.9 for safe
}

async function callQwen(userMessage: string, systemPrompt: string): Promise<string> {
  try {
    const response = await qwenClient.post('/chat/completions', {
      model: 'qwen-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 500
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Qwen API error:', error);
    throw error;
  }
}
```

### Parameters for Friendly Responses

```typescript
const FRIENDLY_CONFIG = {
  temperature: 0.7,      // Balanced: creative but controlled
  top_p: 0.8,           // Diverse but safe
  max_tokens: 400,      // Keep responses concise
  frequency_penalty: 0.5 // Avoid repetition
};

const FOCUSED_CONFIG = {
  temperature: 0.3,      // More deterministic
  top_p: 0.9,           // Very safe
  max_tokens: 200,      // Short and direct
  frequency_penalty: 0   // Exact responses
};
```

---

## Example: Full Content Moderation Flow

```typescript
async function moderateMessage(
  messageText: string,
  userId: number,
  userLanguage: 'en' | 'zh'
): Promise<{ status: 'SAFE' | 'FLAG'; action: string }> {
  
  // System prompt sets warm, empathetic tone
  const systemPrompt = `
    You are a kind community moderator. Your job is to keep our kampung 
    safe and respectful. Review messages with empathy, understanding context.
    
    Consider: Is this harassment, hate speech, or illegal content? 
    Or is it just a joke between friends, or someone venting?
    
    Reply ONLY: SAFE or FLAG (no explanation needed)
  `;
  
  const userPrompt = `
    Please review this message:
    "${messageText}"
  `;
  
  try {
    const result = await callQwen(userPrompt, systemPrompt);
    const status = result.includes('FLAG') ? 'FLAG' : 'SAFE';
    
    if (status === 'SAFE') {
      return { status: 'SAFE', action: 'publish' };
    }
    
    // FLAG: Warm notification
    const friendlyMessage = userLanguage === 'zh' 
      ? `我们注意到你的信息可能需要审查。别担心 — 这不是惩罚，\n只是为了保持我们的邻里安全。我们的团队会快速查看。🌸`
      : `We flagged your message for a quick review — not a punishment, \njust keeping our kampung kind and safe. Our team will take a look! 🌸`;
    
    await notifyUser(userId, {
      title: userLanguage === 'zh' ? '🤔 信息审查' : '🤔 Message Review',
      body: friendlyMessage,
      type: 'content_review'
    });
    
    return { status: 'FLAG', action: 'hold_for_review' };
    
  } catch (error) {
    console.error('Moderation error:', error);
    // On error, allow the message (don't block)
    return { status: 'SAFE', action: 'publish' };
  }
}
```

---

## Checklist: Before Shipping Any AI Feature

- [ ] Response is warm and human-like
- [ ] No tech jargon visible to users
- [ ] Emojis used sparingly and meaningfully
- [ ] Messages respect user's language
- [ ] Errors are helpful, not scary
- [ ] Length is concise (not rambling)
- [ ] Next step is crystal clear
- [ ] Tone matches the context (urgent for payments, encouraging for reviews)
- [ ] Tested with elderly users in mind
- [ ] Works in both EN and 中文

---

**Remember**: Every AI interaction is a chance to reinforce that Errandify is a 
community where people care about each other. Make Hana your brand voice. ✨🌸
