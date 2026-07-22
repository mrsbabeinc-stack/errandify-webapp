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
