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

    // Call Qwen 3.7 Plus for conversational response
    const response = await axios.post(
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: 'qwen-3.7-plus',
        messages: [
          {
            role: 'system',
            content: `You are Hana, a helpful AI assistant for Errandify, a community task platform in Singapore.
You help users:
1. Understand how to use the platform
2. Post tasks easily (as Askers)
3. Find suitable tasks (as Doers)
4. Answer questions about the service
5. Provide emergency support when needed

Be warm, friendly, and concise. Use simple language. Always be helpful and empathetic.
You represent Hana (🌸) - the helpful neighbor who gets things done.`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 512,
      },
      {
        headers: {
          Authorization: `Bearer ${config.qwen.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const assistantResponse = response.data.choices?.[0]?.message?.content || 'How can I help you?';

    res.json({
      success: true,
      data: {
        response: assistantResponse,
        conversationId,
      },
    });
  } catch (error) {
    console.error('Hana chat error:', error);
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

export default router;
