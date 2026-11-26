import type {
  AgeGroup,
  CommuteMode,
  CookingFuel,
  FamilyMember,
  FamilyProfile,
  HealthFlag,
  HomeSize,
} from '@hawahisaab/engine';

export const AGE_GROUPS: readonly AgeGroup[] = [
  'child_under_5',
  'child_5_12',
  'teen',
  'adult',
  'elderly',
];
export const HEALTH_FLAGS: readonly HealthFlag[] = [
  'none',
  'asthma',
  'heart',
  'pregnancy',
];
export const COMMUTE_MODES: readonly CommuteMode[] = [
  'car',
  'two_wheeler',
  'auto',
  'metro',
  'bus',
  'walk_cycle',
  'wfh',
];
export const COOKING_FUELS: readonly CookingFuel[] = [
  'lpg',
  'png',
  'induction',
  'biomass',
];
export const HOME_SIZES: readonly HomeSize[] = [
  'small_1bhk',
  'medium_2bhk',
  'large_3bhk',
];

/** Combined free-text budget; mirrors the server's validation limit. */
export const MAX_FREE_TEXT_BYTES = 2048;
export const MAX_MEMBERS = 10;
export const MAX_MEMBER_NAME_LENGTH = 80;

export type ProfileValidationError =
  'missingLocation' | 'missingMemberName' | 'freeTextTooLong';

export function measureUtf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Bytes of user-typed text the server will receive (location, routine and names). */
export function freeTextBytes(profile: FamilyProfile): number {
  return measureUtf8Bytes(
    [
      profile.location.label,
      profile.outdoorRoutine,
      profile.members.map((m) => m.name.trim()).join(' '),
    ].join('\n'),
  );
}

/**
 * Toggles a health flag. "none" is exclusive: choosing it clears the others, choosing any
 * condition clears "none", and removing the last condition falls back to "none".
 */
export function toggleHealthFlag(
  flags: readonly HealthFlag[],
  flag: HealthFlag,
): HealthFlag[] {
  if (flag === 'none') return ['none'];
  const conditions = flags.filter((f) => f !== 'none');
  const next = conditions.includes(flag)
    ? conditions.filter((f) => f !== flag)
    : [...conditions, flag];
  return next.length > 0 ? next : ['none'];
}

export function createMember(position: number): FamilyMember {
  return {
    id: `member-${String(Date.now())}-${String(position)}`,
    name: '',
    ageGroup: 'adult',
    healthFlags: ['none'],
    outdoorHoursPerDay: 1,
  };
}

/** Returns the first problem with the draft, or null when it can be saved. */
export function validateProfileDraft(
  profile: FamilyProfile,
): ProfileValidationError | null {
  if (!profile.location.label) return 'missingLocation';
  if (profile.members.some((m) => m.name.trim().length === 0)) return 'missingMemberName';
  if (freeTextBytes(profile) > MAX_FREE_TEXT_BYTES) return 'freeTextTooLong';
  return null;
}
