import { Router } from 'express';
import axios from 'axios';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Hana AI Assistant - Process user messages
router.post('/chat/hana', authMiddleware, async (req: any, res: any) => {
  try {
    const { message, conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Call Qwen Plus for conversational response
    const systemPrompt = `You are Hana, a helpful AI assistant for Errandify, a community errand platform in Singapore.
IMPORTANT: Be proactive, friendly, and give direct answers. Don't ask clarifying questions unless absolutely necessary.

You help users:
1. Post errands easily (tell them to tap the + button, select category, fill in errand details)
2. Find and accept errands
3. Chat with the community
4. Answer questions about using the platform
5. Provide emergency support (mention 999 for emergencies)

When users say "post", immediately give them step-by-step instructions to post an errand.
Keep responses short (1-2 sentences) and friendly. Use emojis sparingly.
Always end by asking if they need help with anything else.
You represent Hana (🌸) - the helpful neighbor who gets things done.`;

    const response = await axios.post(
      'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: 'qwen-plus',
        input: {
          prompt: `${systemPrompt}\n\nUser: ${message}\nHana:`,
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 512,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.qwen.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const assistantResponse = response.data.output?.text?.trim() || 'How can I help you?';

    res.json({
      success: true,
      data: {
        response: assistantResponse,
        conversationId,
      },
    });
  } catch (error: any) {
    console.error('Hana chat error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to process message',
      data: {
        response: 'Sorry, I\'m having trouble understanding. Can you try again or reach out to support?',
      }
    });
  }
});

// SOS Emergency Help
router.post('/chat/hana/sos', authMiddleware, async (req: any, res: any) => {
  try {
    const { conversationId } = req.body;

    // For SOS, give immediate supportive response
    const sosResponse = `🆘 I'm here to help!

I understand you need emergency assistance. Here's what you can do:

**Immediate Steps:**
1. **Call local emergency**: Dial 999 for police/ambulance (Singapore)
2. **Contact Errandify Support**: We'll connect you with nearby helpers
3. **Ask for what you need**: Tell me specifically what help is needed

**Common Emergency Support:**
- Medical assistance (injuries, health emergencies)
- Safety concerns (lost, stranded, dangerous situation)
- Financial emergency (need urgent funds)
- Missing persons

We'll mobilize our community helpers immediately. What specific help do you need right now?

📞 If this is a life-threatening emergency, please call 999 first.`;

    res.json({
      success: true,
      data: {
        response: sosResponse,
        conversationId,
        isEmergency: true,
      },
    });
  } catch (error) {
    console.error('SOS error:', error);
    res.status(500).json({
      error: 'Failed to process SOS',
      data: {
        response: 'Emergency support unavailable. Please call 999 immediately if this is life-threatening.',
      }
    });
  }
});

// Customer Service - Hana AI assistant for support
router.post('/hana/customer-service', authMiddleware, async (req: any, res: any) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Call Qwen Plus for customer service response
    const systemPrompt = `You are Hana, the friendly AI customer service assistant for Errandify (a community errand platform in Singapore).
Your role is to help users with questions, troubleshooting, account issues, payments, disputes, and general platform usage.

Key responsibilities:
1. Answer questions about using the platform (posting errands, bidding, accepting jobs)
2. Help with technical issues (app crashes, login problems, payment errors)
3. Provide account support (profile updates, verification, settings)
4. Handle complaints professionally and empathetically
5. Guide users through dispute resolution
6. Explain payment and commission structures
7. Provide emergency contact info when needed

Guidelines:
- Be warm, professional, and helpful
- Keep responses concise (2-3 sentences max)
- If you can't resolve an issue, escalate to support@errandify.ai
- Always prioritize user safety and satisfaction
- Use friendly tone with occasional emojis
- For emergencies, direct to 999 or support hotline

You represent the Errandify community. Make users feel heard and valued.`;

    const response = await axios.post(
      'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: 'qwen-plus',
        input: {
          prompt: `${systemPrompt}\n\nCustomer: ${message}\nHana:`,
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 512,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.qwen.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.output?.text?.trim() || 'How can I help you today?';

    res.json({
      success: true,
      data: {
        reply,
      },
    });
  } catch (error: any) {
    console.error('Customer service error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to get response',
      data: {
        reply: 'Sorry, I\'m having trouble right now. Please email support@errandify.ai or try again in a moment.',
      }
    });
  }
});

export default router;
