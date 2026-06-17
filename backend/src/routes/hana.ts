import { Router } from 'express';
import axios from 'axios';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';
import gTTS from 'gtts';
import crypto from 'crypto';

const router = Router();

// Audio cache to avoid regenerating same text
const audioCache = new Map<string, { audio: string; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

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
        const systemPrompt = `You are Hana, a helpful neighbor and AI assistant for Errandify (帮帮乐). You speak warmly and naturally, like someone who genuinely cares about helping your community. Be friendly but professional. Keep responses brief (2-3 sentences) and clear. No emoticons or icons. Sound warm, neighbourly, and trustworthy. ${languageInstruction}`;

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
          reply = 'To post an errand, tap the plus button at the bottom of the screen. Fill in what you need help with, choose your budget and deadline, then submit.';
        } else if (messageLower.includes('bid') || messageLower.includes('accept') || messageLower.includes('job')) {
          reply = 'You can browse available errands, check the details, and tap accept to place your bid. The person who posted will choose their preferred helper.';
        } else if (messageLower.includes('payment') || messageLower.includes('money') || messageLower.includes('price')) {
          reply = 'Payments are held securely until the work is completed and approved. Once the errand poster confirms your work, you receive your payment.';
        } else if (messageLower.includes('help') || messageLower.includes('support') || messageLower.includes('issue')) {
          reply = 'I am here to help you with any questions about posting errands, accepting jobs, payments, or using Errandify. What do you need?';
        } else if (messageLower.includes('how to') || messageLower.includes('how do')) {
          reply = 'I can help you learn how to post errands, accept jobs, or manage your account. What would you like to know more about?';
        } else {
          reply = 'Hello, I am Hana, your Errandify assistant. How can I help you today?';
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
// Using Microsoft Azure Speech Services for Singapore English with female voice
router.post('/chat/hana/speak', async (req: any, res: any) => {
  try {
    const { text, language = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    // Check cache first
    const cacheKey = `${language}:${crypto.createHash('md5').update(text).digest('hex')}`;
    const cached = audioCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('[Hana TTS] Returning cached audio');
      return res.json({
        success: true,
        data: {
          audio: cached.audio,
          format: 'base64',
          cached: true,
        },
      });
    }

    console.log('[Hana TTS] Converting text to speech:', { language, textLength: text.length });

    // Map language to SSML voice name
    // Using Azure Speech Synthesis voices optimized for Singapore
    const voiceMap: Record<string, { voice: string; lang: string }> = {
      en: {
        voice: 'en-SG-LunaNeural', // Singapore English - Young female (age 20s)
        lang: 'en-SG',
      },
      zh: {
        voice: 'zh-CN-XiaohanNeural', // Mandarin - Young female (age 20s)
        lang: 'zh-CN',
      },
      yue: {
        voice: 'zh-HK-HiuGaaiNeural', // Cantonese - Young female (age 20s)
        lang: 'zh-HK',
      },
    };

    const voiceConfig = voiceMap[language] || voiceMap['en'];

    // Generate SSML with voice parameters for warm, passionate 20-year-old young female
    // Add prosody for natural warmth and passion
    const ssml = `<speak version="1.0" xml:lang="${voiceConfig.lang}">
      <voice name="${voiceConfig.voice}">
        <prosody pitch="+10%" rate="0.92" contour="(0%,+20%) (100%,+15%)">
          ${text}
        </prosody>
      </voice>
    </speak>`;

    console.log('[Hana TTS] Using voice:', voiceConfig.voice);

    // Try to use Azure Speech Services if available
    try {
      const azureResponse = await axios.post(
        `https://southeastasia.tts.speech.microsoft.com/cognitiveservices/v1`,
        ssml,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY || 'demo-key',
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
          },
        }
      );

      const audioBase64 = Buffer.from(azureResponse.data).toString('base64');
      console.log('[Hana TTS] Azure TTS generated successfully');

      // Cache the result
      audioCache.set(cacheKey, { audio: `data:audio/mpeg;base64,${audioBase64}`, timestamp: Date.now() });

      res.json({
        success: true,
        data: {
          audio: `data:audio/mpeg;base64,${audioBase64}`,
          format: 'base64',
        },
      });
    } catch (azureError: any) {
      console.log('[Hana TTS] Azure TTS failed, falling back to Google TTS');
      // Fallback to gTTS
      fallbackToGTTS(text, voiceConfig.lang, res, cacheKey);
    }
  } catch (error: any) {
    console.error('TTS error:', error.message);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message,
    });
  }
});

// Fallback function using Google TTS
const fallbackToGTTS = async (text: string, lang: string, res: any, cacheKey: string) => {
  try {
    // Map to gTTS language codes
    const gttsLangMap: Record<string, string> = {
      'en-SG': 'en',
      'zh-CN': 'zh-CN',
      'zh-HK': 'zh-TW',
    };

    const gttsLang = gttsLangMap[lang] || 'en';

    // Generate speech using gTTS
    const gtts = new gTTS(text, { lang: gttsLang, slow: false });

    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];

      gtts.stream().on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      }).on('end', () => {
        resolve(Buffer.concat(chunks));
      }).on('error', (error: any) => {
        reject(error);
      });
    });

    console.log('[Hana TTS] Google TTS fallback generated successfully');

    const audioBase64 = audioBuffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // Cache the result
    audioCache.set(cacheKey, { audio: audioUrl, timestamp: Date.now() });

    res.json({
      success: true,
      data: {
        audio: audioUrl,
        format: 'base64',
      },
    });
  } catch (error: any) {
    console.error('Fallback TTS error:', error.message);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message,
    });
  }
};

export default router;
