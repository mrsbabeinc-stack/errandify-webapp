import axios from 'axios';

export const speechService = {
  // Synthesize text to speech using Qwen CosyVoice
  async synthesize(text: string, options?: { voice?: string; speed?: number }): Promise<string> {
    try {
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/speech/synthesize`,
        {
          text,
          voice: options?.voice || 'xiaoxiao',
          speed: options?.speed ?? 1.0,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        return response.data.data.audioUrl;
      }
      throw new Error('Failed to synthesize speech');
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw error;
    }
  },

  // Get available voices
  async getVoices(): Promise<any[]> {
    try {
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/speech/voices`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        return response.data.data.voices;
      }
      return [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  },

  // Play audio
  playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio(audioUrl);
        audio.onended = () => resolve();
        audio.onerror = (error) => reject(error);
        audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  },
};
