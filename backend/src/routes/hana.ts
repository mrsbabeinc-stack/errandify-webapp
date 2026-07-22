import { Router } from 'express';
import axios from 'axios';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  SAFE_REFUSAL,
  screenUserMessage,
  sanitizeHanaReply,
  buildHanaMessages,
  allowHanaRequest,
} from '../modules/hanaGuardrails.js';

const router = Router();

// Hana AI Assistant - Process user messages
router.post('/chat/hana', authMiddleware, async (req: any, res: any) => {
  try {
    const { message, conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Anti-spam: cap requests per user
    const rlKey = String(req.user?.id || req.ip);
    if (!allowHanaRequest(rlKey)) {
      return res.status(429).json({
        success: true,
        data: { response: "You're sending messages very quickly — give me a moment and try again.", conversationId },
      });
    }

    // Reject over-long messages (spam / prompt-stuffing)
    if (typeof message === 'string' && message.length > 2000) {
      return res.status(200).json({
        success: true,
        data: { response: 'That message is a bit long for me — please shorten it and ask again.', conversationId },
      });
    }

    // Deterministic guardrail: block obvious attacks before calling the model
    const screen = screenUserMessage(message);
    if (screen.blocked) {
      console.warn('[Hana] Blocked message (', screen.tag, ') from', rlKey);
      return res.status(200).json({ success: true, data: { response: SAFE_REFUSAL, conversationId } });
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
          // Strict role separation (system rules vs untrusted user data)
          messages: buildHanaMessages(systemPrompt, message),
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 512,
          result_format: 'message',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.qwen.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const rawResponse =
      response.data.output?.choices?.[0]?.message?.content?.trim() ||
      response.data.output?.text?.trim() ||
      'How can I help you?';
    // Output guard: never let a reply leak the prompt or a secret
    const assistantResponse = sanitizeHanaReply(rawResponse);

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
    const sosResponse = `I'm here to help!

I understand you need emergency assistance. Here's what you can do:

Immediate Steps:
1. Call local emergency: Dial 999 for police/ambulance (Singapore)
2. Contact Errandify Support: We'll connect you with nearby doers
3. Ask for what you need: Tell me specifically what help is needed

Common Emergency Support:
- Medical assistance (injuries, health emergencies)
- Safety concerns (lost, stranded, dangerous situation)
- Financial emergency (need urgent funds)
- Missing persons

We'll mobilize our community doers immediately. What specific help do you need right now?

If this is a life-threatening emergency, please call 999 first.`;

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

// Customer Service - Hana AI assistant for support (auth required — the floating
// assistant is only shown to signed-in users; this blocks anonymous abuse/cost)
router.post('/chat/hana/customer-service', authMiddleware, async (req: any, res: any) => {
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

    // Anti-spam (this endpoint is unauthenticated → key by IP)
    const rlKey = `cs:${req.user?.id || req.ip}`;
    if (!allowHanaRequest(rlKey, 15, 60_000)) {
      return res.json({ success: true, data: { reply: "You're messaging very quickly — please pause a moment and try again." } });
    }
    if (typeof message === 'string' && message.length > 2000) {
      return res.json({ success: true, data: { reply: 'That message is a bit long — please shorten it and ask again.' } });
    }
    // Deterministic guardrail: block obvious attacks before calling the model
    const screen = screenUserMessage(message);
    if (screen.blocked) {
      console.warn('[Hana/CS] Blocked message (', screen.tag, ') from', rlKey);
      return res.json({ success: true, data: { reply: SAFE_REFUSAL } });
    }

    let reply = 'How can I help you today?';

    // Try Qwen API if available
    console.log('[DEBUG] Config check - Has API key?', !!config.qwen.apiKey, 'Key preview:', config.qwen.apiKey?.substring(0, 20));
    if (config.qwen.apiKey) {
      try {
        console.log('[DEBUG] Attempting Qwen API call with language:', language);

        // Detect if user is using Singlish/casual Singapore English
        const userMessageLower = message.toLowerCase();
        const usesSinglish = /\b(lah|lor|leh|meh|lor|lor|lor)\b|dun |dont |dont |u |ur |arent |cant |wont |havent |isnt |wasnt |shouldnt |wouldnt |couldnt /.test(userMessageLower);

        const systemPrompt = usesSinglish
          ? `You are Hana, a warm and friendly Singaporean assistant for Errandify (帮帮乐). Match the user's friendly, casual tone. Use natural conversational Singapore English with particles like lor, lah, leh when appropriate. Be genuine and caring. Keep it brief. No emoticons. ${languageInstruction}`
          : `You are Hana, a helpful and warm AI assistant for Errandify (帮帮乐). Respond in clear, professional English. You are friendly and neighbourly, like a caring community doer. Keep responses brief (2-3 sentences). No emoticons or icons. Sound warm and genuine. ${languageInstruction}`;

        const response = await axios.post(
          'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          {
            model: 'qwen-plus',
            input: {
              messages: buildHanaMessages(systemPrompt, message),
            },
            parameters: {
              temperature: 0.7,
              max_tokens: 512,
              result_format: 'message',
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
        const rawReply =
          response.data.output?.choices?.[0]?.message?.content?.trim() ||
          response.data.output?.text?.trim() ||
          reply;
        // Output guard: never let a reply leak the prompt or a secret
        reply = sanitizeHanaReply(rawReply);
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
          reply = '你好！很高兴为你服务～ 我是帮帮乐的Hana，随时准备帮你处理各种生活小任务。';
        }
      } else {
        // English fallback responses - standard English unless user uses Singlish
        const userMessageLower = message.toLowerCase();
        const usesSinglish = /\b(lah|lor|leh|meh)\b|dun |dont |u |ur /.test(userMessageLower);

        if (messageLower.includes('post') || messageLower.includes('create') || messageLower.includes('errand')) {
          reply = usesSinglish
            ? 'Super easy lor! Just tap the plus button at the bottom, fill in what you need, set your budget and deadline, then submit.'
            : 'To post an errand, tap the plus button at the bottom of the screen. Fill in what you need help with, choose your budget and deadline, then submit.';
        } else if (messageLower.includes('bid') || messageLower.includes('accept') || messageLower.includes('job')) {
          reply = usesSinglish
            ? 'Browse the errands, check the details, then tap accept to place your bid lor. The person will pick their favourite doer.'
            : 'You can browse available errands, check the details, and tap accept to place your bid. The person who posted will choose their preferred doer.';
        } else if (messageLower.includes('payment') || messageLower.includes('money') || messageLower.includes('price')) {
          reply = usesSinglish
            ? 'Don\'t worry, the money is safe with us until the work is done. You get paid once they approve your work lor.'
            : 'Payments are held securely until the work is completed and approved. Once the errand poster confirms your work, you receive your payment.';
        } else if (messageLower.includes('help') || messageLower.includes('support') || messageLower.includes('issue')) {
          reply = usesSinglish
            ? 'I\'m here to help you lor! Tell me what you need about posting errands, accepting jobs, or payments.'
            : 'I am here to help you with any questions about posting errands, accepting jobs, payments, or using Errandify.';
        } else if (messageLower.includes('how to') || messageLower.includes('how do')) {
          reply = usesSinglish
            ? 'Tell me what you want to know and I\'ll explain lor. Posting errands, accepting jobs, or something else?'
            : 'I can help you learn how to post errands, accept jobs, or manage your account. What would you like to know?';
        } else {
          reply = usesSinglish
            ? 'Hi, I\'m Hana. What can I help you with today, ah?'
            : 'Hello, I am Hana, your Errandify assistant. How can I help you today?';
        }
      }
    }

    // Remove emoticons and emojis from response
    const cleanReply = reply.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

    res.json({
      success: true,
      data: {
        reply: cleanReply,
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
// Using Alibaba Qwen TTS for superior Chinese voice support (motherly, warm, passionate)
router.post('/chat/hana/speak', async (req: any, res: any) => {
  try {
    let { text, language = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    // For Chinese languages, remove English brand name and references to avoid TTS pronunciation issues
    // Chinese voice cannot read mixed English-Chinese text well
    if (language === 'zh' || language === 'yue') {
      // Remove parenthetical English names like "(Errandify)" or "Errandify (帮帮乐)"
      text = text.replace(/\s*\(Errandify[^)]*\)/gi, '');
      text = text.replace(/Errandify[—–-]*(known as )?帮帮乐[^。，]*[。，]/gi, '帮帮乐');
      text = text.replace(/Errandify/gi, '');
    }

    console.log('[Hana TTS] Converting text to speech:', { language, textLength: text.length });

    // Map language to Alibaba Qwen TTS voice
    // All FEMALE voices with motherly, warm, passionate tone
    const voiceMap: Record<string, { voice: string; lang: string }> = {
      en: {
        voice: 'Joanna', // Natural US female - warm, conversational
        lang: 'en-SG',
      },
      zh: {
        voice: 'Siqi', // Mandarin Chinese - natural, warm female voice (帮帮乐助手 tone)
        lang: 'zh-CN',
      },
      yue: {
        voice: 'Hui', // Cantonese - warm, natural female voice
        lang: 'zh-HK',
      },
    };

    const voiceConfig = voiceMap[language] || voiceMap['en'];

    console.log('[Hana TTS] Using voice:', voiceConfig.voice);

    // Try to use Alibaba Qwen TTS
    try {
      const qwenTtsResponse = await axios.post(
        'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2speech/synthesis',
        {
          model: 'cosyvoice-v1',
          input: {
            text: text,
          },
          parameters: {
            voice: voiceConfig.voice,
            rate: language === 'en' ? 1.0 : 0.95, // Natural speaking pace, slightly slower for Chinese warmth
            pitch: 1.0, // Natural pitch - no robotic effect
            volume: 50, // Standard volume
          },
        },
        {
          headers: {
            Authorization: `Bearer ${config.qwen.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      const audioBase64 = Buffer.from(qwenTtsResponse.data).toString('base64');
      console.log('[Hana TTS] Alibaba Qwen TTS generated successfully');

      res.json({
        success: true,
        data: {
          audio: `data:audio/wav;base64,${audioBase64}`,
          format: 'base64',
        },
      });
    } catch (qwenError: any) {
      console.log('[Hana TTS] Alibaba Qwen TTS failed, falling back to Google TTS');
      console.log('Qwen error:', qwenError.response?.data || qwenError.message);
      console.log('[Hana TTS] voiceConfig:', voiceConfig, 'voiceConfig.lang:', voiceConfig.lang, 'typeof:', typeof voiceConfig.lang);
      // Fallback to gTTS
      return await fallbackToGTTS(text, voiceConfig.lang, res);
    }
  } catch (error: any) {
    console.error('TTS error:', error.message);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message,
    });
  }
});

// Fallback function using Google Translate TTS
const fallbackToGTTS = async (text: string, lang: string, res: any) => {
  try {
    console.log('[fallbackToGTTS] Using Google Translate API');

    // Map to language codes
    const langMap: Record<string, string> = {
      'en-SG': 'en',
      'zh-CN': 'zh-CN',
      'zh-HK': 'zh-TW',
    };

    const targetLang = langMap[lang] || 'en';

    // Use Google Translate TTS endpoint
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${targetLang}&client=gtx`;

    const audioResponse = await axios.get(ttsUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const audioBase64 = Buffer.from(audioResponse.data).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    console.log('[fallbackToGTTS] Audio generated successfully, size:', audioBase64.length);

    res.json({
      success: true,
      data: {
        audio: audioUrl,
        format: 'base64',
      },
    });
  } catch (error: any) {
    console.error('[fallbackToGTTS] Error:', error.message);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message,
    });
  }
};

export default router;
