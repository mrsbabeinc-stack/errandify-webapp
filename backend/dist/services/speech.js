import axios from 'axios';
import { config } from '../config.js';
export const speechService = {
    // FunASR - Speech to Text
    // Low-latency, accurate transcription
    async transcribeAudio(audioUrl) {
        try {
            const response = await axios.post('https://dashscope.aliyuncs.com/api/v1/services/speech/transcription/transcription', {
                model: 'paraformer-realtime', // Fast transcription
                audio_url: audioUrl,
            }, {
                headers: {
                    Authorization: `Bearer ${config.qwen.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            return response.data.output?.text || '';
        }
        catch (error) {
            console.error('FunASR transcription error:', error);
            throw error;
        }
    },
    // CosyVoice - Text to Speech
    // Natural-sounding voice synthesis
    async synthesizeSpeech(text, options) {
        try {
            const response = await axios.post('https://dashscope.aliyuncs.com/api/v1/services/tts/text-to-speech/text-to-speech', {
                model: 'cosyvoice-v1',
                input: {
                    text,
                },
                parameters: {
                    voice: options?.voice || 'xiaoxiao', // Default friendly female voice
                    speed: options?.speed ?? 1.0,
                    pitch: 1.0,
                    volume: 50,
                },
            }, {
                headers: {
                    Authorization: `Bearer ${config.qwen.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            // Returns audio URL
            return response.data.output?.audio_url || '';
        }
        catch (error) {
            console.error('CosyVoice synthesis error:', error);
            throw error;
        }
    },
    // Voice bot - Low latency focus
    // Real-time voice interaction endpoint
    async processVoiceInteraction(audioUrl, context) {
        try {
            // Step 1: Transcribe audio (FunASR)
            const userText = await this.transcribeAudio(audioUrl);
            // Step 2: Process through chat model (Qwen 3.7 Plus)
            // Import here to avoid circular dependency
            const { qwenService } = await import('./qwenService.js');
            const contextMessage = context ? `Context: ${context}\n` : '';
            const botResponse = await qwenService.chat([
                {
                    role: 'user',
                    content: `${contextMessage}${userText}`,
                },
            ]);
            // Step 3: Synthesize response (CosyVoice)
            const responseAudioUrl = await this.synthesizeSpeech(botResponse);
            return {
                text: botResponse,
                audioUrl: responseAudioUrl,
            };
        }
        catch (error) {
            console.error('Voice bot error:', error);
            throw error;
        }
    },
};
