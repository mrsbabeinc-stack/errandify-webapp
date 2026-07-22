/**
 * Which categories an offence actually bears on.
 *
 * The rule this replaces was "any conviction closes everything", which treated
 * a shoplifting conviction and an offence against a child as the same fact. It
 * is not a safety measure if it does not distinguish them — it is just an
 * exclusion, and the people it costs most are the ones with the least serious
 * records trying to find work.
 *
 * So each category names the offence types that bear on it, and nothing else
 * closes it. Read the table as: "this category is closed only by these".
 *
 * Deliberately a plain lookup. No scoring, no weights, no inference — someone
 * has to be able to read this and say whether it is fair, and defend it to the
 * person it restricts.
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

/** The labels the applicant actually picks from. Plain words, not statute. */
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

/**
 * category slug -> the offence types that close it.
 *
 * pet-care is absent because it is no longer restricted at all (migration 046):
 * "home access, care of animals" does not justify excluding anyone, and animal
 * cruelty — the one offence that would — is not something we ask about.
 */
const CLOSED_BY: Record<string, OffenceType[]> = {
  // Unsupervised contact with children.
  'childcare-education': ['against_child', 'sexual', 'violence'],

  // Care of adults who may not be able to protect themselves or report harm.
  'eldercare-healthcare': ['against_vulnerable', 'sexual', 'violence'],

  // Sustained close proximity to one person.
  'personal-care': ['sexual', 'violence'],

  // In someone's home, often while they are out, among their belongings. The
  // concern here is property, so only dishonesty bears on it — being alone in
  // a house is not a reason to exclude someone who has never taken anything.
  'cleaning-household': ['dishonesty'],
  'home-maintenance': ['dishonesty'],

  // Alone in a vehicle with a passenger, who may be a child or an older person,
  // and responsible for their physical safety on the road.
  'travel-mobility': ['driving', 'sexual', 'violence'],
};

/**
 * Categories closed to someone with this offence.
 *
 * A Third Schedule offence closes everything: those never become spent under
 * RCA s7C and are the cases the whole scheme exists for. Everything else is
 * scoped.
 *
 * An unknown type closes nothing here — it is not evidence of safety, so the
 * resolver routes it to human review instead. Guessing against the applicant
 * and guessing for them are both wrong; a person decides.
 */
export function categoriesClosedBy(
  offence: OffenceType | null | undefined,
  thirdScheduleOffence?: boolean | null
): string[] {
  if (thirdScheduleOffence === true) return Object.keys(CLOSED_BY);
  if (!offence) return [];
  return Object.keys(CLOSED_BY).filter((slug) => CLOSED_BY[slug].includes(offence));
}

/** Every category that screening can close. The conservative default. */
export function allRestrictedCategories(): string[] {
  return Object.keys(CLOSED_BY);
}

/** True when we cannot scope the restriction and a person should look at it. */
export function needsHumanScoping(
  offence: OffenceType | null | undefined,
  thirdScheduleOffence?: boolean | null
): boolean {
  if (thirdScheduleOffence === true) return false;
  // "Something else" and "drugs" map to no category on their own. That is a
  // deliberate gap rather than an oversight: neither tells us anything about
  // the specific risks these categories carry, and inventing a link would be
  // exactly the blanket reasoning this file exists to remove.
  return !offence || offence === 'other' || offence === 'drugs';
}
