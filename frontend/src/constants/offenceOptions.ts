/**
 * The offence types the declaration offers, mirroring
 * backend/src/services/offenceScope.ts.
 *
 * Asked so that we can restrict LESS. Before this, one declared conviction
 * closed every restricted category, so a shoplifting record barred someone from
 * childcare and eldercare on identical terms to an offence against a child.
 * Naming the offence is what lets each category be closed only by the things
 * that bear on it.
 *
 * Plain words rather than statute — someone answering this should not need a
 * lawyer to place their own conviction.
 */

export type OffenceType =
  | 'against_child'
  | 'against_vulnerable'
  | 'violence'
  | 'sexual'
  | 'dishonesty'
  | 'driving'
  | 'drugs'
  | 'other';

/**
 * Whether the Third Schedule question is worth asking for this offence type.
 *
 * That question names rape, homicide, kidnapping and gang robbery. Asking it of
 * someone who has just answered "shoplifting" or "a driving offence" is not
 * merely redundant — it reads as an accusation, which is exactly the tone this
 * declaration is trying not to take.
 *
 * Skipping it is safe because it is not the only thing that stops a record
 * spending. RCA s7C(b) — a sentence over 3 months or a fine over $2,000 — also
 * does, and any Third Schedule offence would comfortably exceed it. So the
 * sentence question, which is asked of everyone, remains the backstop.
 */
export const ASKS_THIRD_SCHEDULE: OffenceType[] = [
  'violence',
  'sexual',
  'against_child',
  'against_vulnerable',
];

export const OFFENCE_OPTIONS: { value: OffenceType; label: string }[] = [
  { value: 'dishonesty', label: 'Dishonesty — theft, shoplifting, fraud' },
  { value: 'violence', label: 'Violence' },
  { value: 'sexual', label: 'A sexual offence' },
  { value: 'against_child', label: 'An offence against a child' },
  { value: 'against_vulnerable', label: 'An offence against an elderly or vulnerable person' },
  { value: 'driving', label: 'A driving offence' },
  { value: 'drugs', label: 'A drug offence' },
  { value: 'other', label: 'Something else' },
];
