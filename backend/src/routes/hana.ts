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

    let reply = 'How can I help you today?';

    // Try Qwen API if available
    console.log('[DEBUG] Config check - Has API key?', !!config.qwen.apiKey, 'Key preview:', config.qwen.apiKey?.substring(0, 20));
    if (config.qwen.apiKey) {
      try {
        console.log('[DEBUG] Attempting Qwen API call with key:', config.qwen.apiKey.substring(0, 20) + '...');
        const systemPrompt = `You are Hana, a helpful AI assistant for Errandify. Be warm, brief (2-3 sentences), and helpful.`;

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

        console.log('[DEBUG] Qwen API response received:', response.data);
        reply = response.data.output?.text?.trim() || reply;
        console.log('[DEBUG] Qwen reply:', reply);
      } catch (apiError: any) {
        console.error('Qwen API error:', {
          message: apiError.message,
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          config: apiError.config ? {
            url: apiError.config.url,
            method: apiError.config.method,
            headers: apiError.config.headers,
          } : undefined,
        });
        // Fall through to dummy responses below
      }
    } else {
      console.log('[DEBUG] No Qwen API key configured, using fallback responses');
      // Dummy responses when no API key available
      const messageLower = message.toLowerCase();

      if (messageLower.includes('post') || messageLower.includes('create') || messageLower.includes('errand')) {
        reply = '✿ To post an errand: Tap the "+" button at the bottom, fill in details, and submit! Need help with specifics?';
      } else if (messageLower.includes('bid') || messageLower.includes('accept') || messageLower.includes('job')) {
        reply = '✿ Browse available errands, review details, and tap Accept to place your bid. The asker will pick their favorite!';
      } else if (messageLower.includes('payment') || messageLower.includes('money') || messageLower.includes('price')) {
        reply = '✿ Payments are held securely until work is confirmed. You earn after the asker approves! Questions about rates?';
      } else if (messageLower.includes('help') || messageLower.includes('support') || messageLower.includes('issue')) {
        reply = '✿ I\'m here to help! Tell me what you need - posting, bidding, payments, or anything else about Errandify.';
      } else if (messageLower.includes('how to') || messageLower.includes('how do')) {
        reply = '✿ I can help! Are you asking about posting errands, bidding on jobs, payments, or something else?';
      } else {
        reply = '✿ Thanks for reaching out! I\'m Hana. What can I help you with today? 🌸';
      }
    }

    res.json({
      success: true,
      data: {
        reply,
      },
    });
  } catch (error: any) {
    console.error('Customer service error:', error.message);
    res.status(500).json({
      error: 'Failed to get response',
      data: {
        reply: '✿ Sorry, I\'m having trouble right now. Please email support@errandify.ai or try again in a moment.',
      }
    });
  }
});

export default router;
