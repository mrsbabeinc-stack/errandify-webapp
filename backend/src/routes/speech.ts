import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { speechService } from '../services/speech.js';

const router = Router();

// POST /api/speech/synthesize - Convert text to speech audio
router.post('/synthesize', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text, voice, speed } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('[Speech] Synthesizing audio for text:', text.substring(0, 50));

    // Generate audio using Qwen CosyVoice
    const audioUrl = await speechService.synthesizeSpeech(text, {
      voice: voice || 'xiaoxiao', // Default friendly female voice
      speed: speed ?? 1.0,
    });

    if (!audioUrl) {
      return res.status(500).json({ error: 'Failed to generate audio' });
    }

    console.log('[Speech] Audio generated successfully');

    res.json({
      success: true,
      data: {
        audioUrl,
        text,
        voice: voice || 'xiaoxiao',
        speed: speed ?? 1.0,
      },
    });
  } catch (error) {
    console.error('[Speech] Synthesis error:', error);
    res.status(500).json({
      error: 'Failed to synthesize speech',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Available voices for Qwen CosyVoice
router.get('/voices', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const voices = [
      { id: 'xiaoxiao', name: '晓晓', description: 'Friendly female voice (Mandarin)', language: 'zh' },
      { id: 'xiaoyi', name: '小伊', description: 'Cheerful female voice (Mandarin)', language: 'zh' },
      { id: 'xiaofeng', name: '小风', description: 'Warm male voice (Mandarin)', language: 'zh' },
      { id: 'xiaogang', name: '小刚', description: 'Professional male voice (Mandarin)', language: 'zh' },
      { id: 'xiaohua', name: '小花', description: 'Soft female voice (Mandarin)', language: 'zh' },
      { id: 'xiaorui', name: '小睿', description: 'Intelligent male voice (Mandarin)', language: 'zh' },
      { id: 'xiaoshuang', name: '小爽', description: 'Energetic female voice (Mandarin)', language: 'zh' },
    ];

    res.json({
      success: true,
      data: {
        voices,
        default: 'xiaoxiao',
      },
    });
  } catch (error) {
    console.error('[Speech] Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

export default router;
