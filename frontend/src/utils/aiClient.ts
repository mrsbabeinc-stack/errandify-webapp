import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * The only way the frontend should reach AI.
 *
 * Admin screens used to POST straight to dashscope.aliyuncs.com with the API
 * key in the request header. That is wrong twice over: the key ends up in the
 * JS bundle where any visitor can read it, and three of those screens used
 * `process.env`, which does not exist in a browser — so they threw
 * "process is not defined" and never worked at all.
 *
 * Everything goes through the backend now. No key, no vendor URL, no SDK in
 * the browser. If the AI provider ever changes, only the server changes.
 */

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Generate text from a prompt. Throws with a message worth showing to an
 * admin — these screens are internal tools, so a real error beats a silent
 * empty result.
 */
export async function generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
  const token = localStorage.getItem('token');

  try {
    const response = await axios.post(
      `${API_URL}/api/ai/generate`,
      { prompt, temperature: options.temperature, maxTokens: options.maxTokens },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const text = response.data?.data?.text;
    if (!text) throw new Error('The AI service returned an empty response.');
    return text;
  } catch (err: any) {
    const message =
      err?.response?.data?.error ||
      (err?.response?.status === 403
        ? 'Only admins can use the AI tools.'
        : 'Could not reach the AI service. Please try again.');
    throw new Error(message);
  }
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

/**
 * Generate real images and get several variants back to choose from.
 *
 * The admin screens previously asked a TEXT model to "return an image URL",
 * which no text model can do, then quietly fell back to the same hardcoded
 * stock photo every time. This calls an actual image model on the server.
 *
 * Allow time — each variant takes roughly 15 seconds and they run in parallel.
 */
export async function generateImages(
  prompt: string,
  count = 3,
  size = '1024*1024'
): Promise<GeneratedImage[]> {
  const token = localStorage.getItem('token');

  try {
    const response = await axios.post(
      `${API_URL}/api/ai/generate-image`,
      { prompt, count, size },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 240000 }
    );
    const images = response.data?.data?.images;
    if (!Array.isArray(images) || images.length === 0) {
      throw new Error('No images came back. Try rewording the description.');
    }
    // Server returns app-relative paths so they keep working wherever it is hosted
    return images.map((i: any) => ({ url: `${API_URL}${i.url}`, prompt: i.prompt }));
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.error || err?.message || 'Could not generate images. Please try again.'
    );
  }
}
