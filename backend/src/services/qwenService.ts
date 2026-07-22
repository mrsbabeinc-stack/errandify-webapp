import axios from 'axios';
import { config } from '../config.js';

interface QwenRequest {
  model: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

interface QwenImageRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;
  }>;
  temperature?: number;
  max_tokens?: number;
}

export const qwenService = {
  // Customer service, chat, content moderation.
  //
  // This used to POST to the old DashScope native endpoint
  // (/api/v1/services/aigc/text-generation/generation) asking for a model named
  // "qwen-3.7-plus", which does not exist. Every call threw, which is why AI
  // dispute analysis always came back "AI analysis failed". Switched to the
  // compatible-mode endpoint and qwen-max — the same pair the content
  // moderation and suggestions paths already use successfully.
  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ) {
    const base = process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    try {
      const response = await axios.post(
        `${base}/chat/completions`,
        {
          model: 'qwen-max',
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2048,
        } as QwenRequest,
        {
          headers: {
            Authorization: `Bearer ${config.qwen.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return response.data?.choices?.[0]?.message?.content || '';
    } catch (error: any) {
      console.error('Qwen chat error:', error?.response?.data || error?.message || error);
      throw error;
    }
  },

  // Qwen 3.7 Plus / 3.6 Plus - Multimodal (text + image/video) analysis
  async analyzeWithMedia(
    messages: Array<{
      role: 'user' | 'assistant';
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
    }>,
    options?: { temperature?: number; maxTokens?: number }
  ) {
    try {
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: 'qwen-3.7-plus',
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2048,
        } as QwenImageRequest,
        {
          headers: {
            Authorization: `Bearer ${config.qwen.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.output?.text || '';
    } catch (error) {
      console.error('Qwen media analysis error:', error);
      throw error;
    }
  },

  // Qwen 2.5 VL - Geolocation and spatial analysis
  async spatialAnalysis(
    prompt: string,
    imageUrl: string,
    options?: { temperature?: number; maxTokens?: number }
  ) {
    try {
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: 'qwen-2.5-vl',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } },
              ],
            },
          ],
          temperature: options?.temperature ?? 0.5,
          max_tokens: options?.maxTokens ?? 1024,
        } as QwenImageRequest,
        {
          headers: {
            Authorization: `Bearer ${config.qwen.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.output?.text || '';
    } catch (error) {
      console.error('Qwen spatial analysis error:', error);
      throw error;
    }
  },

  // Content moderation - Qwen 3.7 Plus
  async moderateContent(text: string) {
    try {
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: 'qwen-3.7-plus',
          messages: [
            {
              role: 'user',
              content: `You are a content moderator. Analyze the following text for inappropriate content, spam, or policy violations. Respond with JSON: {"is_safe": boolean, "issues": [string], "severity": "low"|"medium"|"high"}. Text: "${text}"`,
            },
          ],
          temperature: 0.3,
          max_tokens: 512,
        } as QwenRequest,
        {
          headers: {
            Authorization: `Bearer ${config.qwen.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      try {
        return JSON.parse(response.data.output?.text || '{}');
      } catch {
        return { is_safe: true, issues: [], severity: 'low' };
      }
    } catch (error) {
      console.error('Content moderation error:', error);
      throw error;
    }
  },
};

// Export as QwenAI for compatibility
export const QwenAI = {
  call: qwenService.chat,
};
