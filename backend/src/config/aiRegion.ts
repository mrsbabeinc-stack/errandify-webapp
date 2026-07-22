/**
 * Where AI requests go — one decision, in one place.
 *
 * PDPA s26 (Transfer Limitation) says personal data may not be transferred out
 * of Singapore unless the recipient is bound by legally enforceable obligations
 * providing protection comparable to the PDPA. PDPC's Transfer Limitation
 * guidance (Ch 19) applies that to every party in the chain, sub-processors
 * included.
 *
 * These calls carry real personal data — private chat messages between two
 * users, errand descriptions with addresses in them, and voice recordings —
 * and 22 call sites were sending it to dashscope.aliyuncs.com, Alibaba's
 * MAINLAND CHINA endpoint. Hana alone used dashscope-intl, the Singapore
 * region. Nobody chose that split; it is what happens when a hostname is
 * pasted 22 times.
 *
 * Defaulting to the Singapore region does not by itself discharge s26 — that
 * needs a data processing agreement with Alibaba Cloud carrying comparable
 * obligations, which is a commercial and legal step, not a code change. What it
 * does is stop personal data leaving the region by accident, and put the
 * decision somewhere a reviewer can find it.
 *
 * NOT LEGAL ADVICE. s26 and PDPC Ch 19 are named so they can be checked.
 *
 * Override with QWEN_API_REGION=cn only with a documented legal basis.
 */

const REGION = (process.env.QWEN_API_REGION || 'sg').toLowerCase();

/** Alibaba's Singapore region. The default, and the one to keep. */
const SG_HOST = 'https://dashscope-intl.aliyuncs.com';
/** Mainland China. Reachable only by explicit opt-in. */
const CN_HOST = 'https://dashscope.aliyuncs.com';

export const DASHSCOPE_HOST = REGION === 'cn' ? CN_HOST : SG_HOST;

/** OpenAI-compatible chat completions base, e.g. `${BASE}/chat/completions`. */
export const QWEN_API_BASE =
  process.env.QWEN_API_BASE || `${DASHSCOPE_HOST}/compatible-mode/v1`;

/** Native DashScope text generation. */
export const QWEN_GENERATION_URL =
  `${DASHSCOPE_HOST}/api/v1/services/aigc/text-generation/generation`;

/** Speech-to-text and text-to-speech. Voice is personal data too. */
export const QWEN_TRANSCRIPTION_URL =
  `${DASHSCOPE_HOST}/api/v1/services/audio/asr/transcription`;
export const QWEN_TTS_URL =
  `${DASHSCOPE_HOST}/api/v1/services/aigc/text2speech/synthesis`;

if (REGION === 'cn') {
  console.warn(
    '[AI] QWEN_API_REGION=cn — personal data will be transferred to mainland China. ' +
    'PDPA s26 requires a legal basis for this. See config/aiRegion.ts.'
  );
}
