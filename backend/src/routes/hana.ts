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
    const systemPrompt = `You are Hana, a helpful AI assistant for Errandify (帮帮乐), a community errand platform in Singapore.
IMPORTANT: Be proactive, friendly, and give direct answers. Don't ask clarifying questions unless absolutely necessary.

You help users:
1. Post errands easily (tell them to tap the + button, select category, fill in errand details)
2. Find and accept errands
3. Chat with the community
4. Answer questions about using the platform
5. Provide emergency support (mention 999 for emergencies)

When users say "post", immediately give them step-by-step instructions to post an errand.
Keep responses short (1-2 sentences) and friendly. DO NOT use any emoticons or emojis in your responses.
Always end by asking if they need help with anything else.
You represent Hana - the helpful neighbor who gets things done.`;

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
router.post('/chat/hana/customer-service', async (req: any, res: any) => {
  try {
    const { message, language = 'en' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Map language codes to language instructions
    const languageMap: Record<string, string> = {
      en: 'Reply in English.',
      zh: '用中文回复。',
      yue: '用粵語回復。',
    };

    const languageInstruction = languageMap[language] || languageMap['en'];

    let reply = 'How can I help you today?';

    // Try Qwen API if available
    console.log('[DEBUG] Config check - Has API key?', !!config.qwen.apiKey, 'Key preview:', config.qwen.apiKey?.substring(0, 20));
    if (config.qwen.apiKey) {
      try {
        console.log('[DEBUG] Attempting Qwen API call with language:', language);
        const systemPrompt = `You are Hana, a helpful AI assistant for Errandify (帮帮乐), Singapore's community errand platform. Be warm, brief (2-3 sentences), helpful, and professional. Do not use any emoticons or emojis in your responses. ${languageInstruction}`;

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
      // Fallback responses based on language
      const messageLower = message.toLowerCase();
      const messageZh = message;

      if (language === 'zh' || language === 'yue') {
        // Chinese/Cantonese fallback responses
        if (messageZh.includes('发布') || messageZh.includes('发贴') || messageZh.includes('任务') || messageZh.includes('帮') || messageZh.includes('帮帮')) {
          reply = '发布帮帮很简单。点击底部的加号按钮，然后填写帮助的详情，最后提交就可以了。需要更多帮助吗？';
        } else if (messageZh.includes('接受') || messageZh.includes('竞标') || messageZh.includes('工作')) {
          reply = '你可以浏览所有可用的帮帮，查看详情，然后点击接受按钮来出价。发布者会选择他们最喜欢的帮手。';
        } else if (messageZh.includes('支付') || messageZh.includes('钱') || messageZh.includes('价格') || messageZh.includes('費用')) {
          reply = '款项会安全地保管，直到工作完成并被确认。一旦发布者批准了你的工作，你就能获得报酬。';
        } else if (messageZh.includes('帮助') || messageZh.includes('支持') || messageZh.includes('问题')) {
          reply = '我很乐意帮助你。请告诉我你需要什么帮助，无论是发布帮帮、竞标工作、支付问题，或是关于帮帮乐平台的任何其他问题。';
        } else if (messageZh.includes('如何') || messageZh.includes('怎么')) {
          reply = '我可以帮助你。你是在询问如何发布帮帮、如何竞标工作、支付相关的问题，还是其他方面的帮助呢？';
        } else {
          reply = '谢谢你的联系。我是帮帮乐的助手 Hana。今天有什么我可以为你效劳的吗？';
        }
      } else {
        // English fallback responses
        if (messageLower.includes('post') || messageLower.includes('create') || messageLower.includes('errand')) {
          reply = 'Posting an errand is simple. Tap the plus button at the bottom, fill in the details of what you need help with, and submit. Would you like more guidance?';
        } else if (messageLower.includes('bid') || messageLower.includes('accept') || messageLower.includes('job')) {
          reply = 'You can browse all available errands, check out the details, and tap the accept button to place your bid. The person who posted the errand will choose their favorite helper.';
        } else if (messageLower.includes('payment') || messageLower.includes('money') || messageLower.includes('price')) {
          reply = 'Payments are kept safe with us until the work is done and confirmed. Once the person who posted the errand approves your work, you get paid.';
        } else if (messageLower.includes('help') || messageLower.includes('support') || messageLower.includes('issue')) {
          reply = 'I am here to help you. Tell me what you need assistance with, whether it is posting an errand, bidding on jobs, payment questions, or anything else about Errandify.';
        } else if (messageLower.includes('how to') || messageLower.includes('how do')) {
          reply = 'I can help you with that. Are you asking about how to post an errand, how to bid on jobs, payment related questions, or something else?';
        } else {
          reply = 'Thank you for reaching out. I am Hana, Errandify assistant. How can I help you today?';
        }
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

// Text-to-Speech endpoint - Convert Hana's text response to audio
router.post('/chat/hana/speak', async (req: any, res: any) => {
  try {
    const { text, language = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    if (!config.qwen.apiKey) {
      return res.status(500).json({ error: 'TTS service not configured' });
    }

    // Map language to Alibaba voice
    const voiceMap: Record<string, string> = {
      en: 'siyunenus', // English - Natural female voice (US)
      zh: 'siying', // Mandarin - Natural female voice
      yue: 'siyueyue', // Cantonese - Natural female voice
    };

    const voice = voiceMap[language] || voiceMap['en'];

    console.log('[Hana TTS] Converting text to speech:', { language, voice, textLength: text.length });

    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/tts/text-to-speech',
      {
        model: 'cosyvoice-v1',
        input: {
          text: text,
        },
        parameters: {
          voice: voice,
          rate: 0.9,
          pitch: 1.0,
          volume: 50,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.qwen.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-DataInspection': 'enable',
        },
        responseType: 'arraybuffer',
      }
    );

    console.log('[Hana TTS] Audio generated successfully');

    // Return audio as base64
    const audioBase64 = Buffer.from(response.data).toString('base64');
    res.json({
      success: true,
      data: {
        audio: `data:audio/wav;base64,${audioBase64}`,
      },
    });
  } catch (error: any) {
    console.error('TTS error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message,
    });
  }
});

export default router;
