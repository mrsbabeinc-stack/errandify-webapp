import axios from 'axios';
import db from '../db.js';

/**
 * Real text-to-image generation.
 *
 * The admin screens never generated an image. They asked a TEXT model to
 * "return only the image URL", which no text model can do, then fell back to a
 * hardcoded Unsplash photo — which is why every campaign banner was identical.
 *
 * Establishing the working call took some probing, so the findings are worth
 * writing down:
 *   - This deployment is a dedicated Alibaba MaaS endpoint, not public
 *     DashScope. `/images/generations` does NOT exist here (404).
 *   - Image models run through `/chat/completions` with an image model id.
 *   - `content` must be an ARRAY — a plain string returns
 *     "Input should be a valid list: input.messages.0.content".
 *   - Do NOT send `X-DashScope-Async`; this key is not licensed for async and
 *     the call 403s with "does not support asynchronous calls".
 *
 * Returned URLs are signed and EXPIRE (roughly a week), so anything we intend
 * to keep is downloaded and stored rather than linked.
 */

const IMAGE_MODEL = process.env.QWEN_IMAGE_MODEL || 'qwen-image-2.0';

export interface GeneratedImage {
  /** our own durable URL, safe to store in a campaign or banner */
  url: string;
  /** the original signed URL — short-lived, useful only for debugging */
  sourceUrl: string;
  prompt: string;
}

/** Ask the model for one image. */
async function generateOne(prompt: string, size: string): Promise<string | null> {
  const base = process.env.QWEN_API_BASE;
  const key = process.env.QWEN_API_KEY;
  if (!base || !key) throw new Error('Image generation is not configured on this server.');

  const response = await axios.post(
    `${base}/chat/completions`,
    {
      model: IMAGE_MODEL,
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      parameters: { size },
    },
    { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 120000 }
  );

  const content = response.data?.output?.choices?.[0]?.message?.content;
  if (!Array.isArray(content)) return null;
  const found = content.find((c: any) => c?.image);
  return found?.image ?? null;
}

/**
 * Fetch the generated image and keep our own copy.
 *
 * Stored as a data URI in Postgres. Not what you'd want at scale — S3 belongs
 * here eventually — but it means a banner chosen today still renders next month
 * instead of silently 404ing when the signed URL lapses.
 */
async function persist(sourceUrl: string, prompt: string, userId: number | null): Promise<string> {
  const img = await axios.get(sourceUrl, { responseType: 'arraybuffer', timeout: 60000 });
  const contentType = img.headers['content-type'] || 'image/png';
  const dataUri = `data:${contentType};base64,${Buffer.from(img.data).toString('base64')}`;

  const result = await db.query(
    `INSERT INTO generated_images (prompt, data_uri, source_url, created_by_user_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [prompt.slice(0, 1000), dataUri, sourceUrl.slice(0, 1000), userId]
  );

  return `/api/ai/images/${result.rows[0].id}`;
}

/**
 * Generate several variants so an admin can pick the best one.
 *
 * Requests run in parallel — the model takes ~10-20s each, and doing four in
 * sequence would push a minute. One failure does not sink the batch; you get
 * whatever succeeded.
 */
export async function generateImages(params: {
  prompt: string;
  count?: number;
  size?: string;
  userId?: number | null;
}): Promise<GeneratedImage[]> {
  const count = Math.min(Math.max(params.count ?? 3, 1), 4);
  const size = params.size || '1024*1024';

  const results = await Promise.allSettled(
    Array.from({ length: count }, () => generateOne(params.prompt, size))
  );

  const images: GeneratedImage[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) {
      if (r.status === 'rejected') {
        console.warn('[Images] One variant failed:', (r.reason as any)?.response?.data || (r.reason as any)?.message);
      }
      continue;
    }
    try {
      const url = await persist(r.value, params.prompt, params.userId ?? null);
      images.push({ url, sourceUrl: r.value, prompt: params.prompt });
    } catch (err: any) {
      console.warn('[Images] Could not store a variant:', err?.message);
    }
  }

  return images;
}
