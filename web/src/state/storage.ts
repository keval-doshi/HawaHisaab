import type { FamilyProfile, SwapId } from '@hawahisaab/engine';

const PROFILE_STORAGE_KEY = 'hawahisaab.profile.v1';
const SWAPS_STORAGE_KEY = 'hawahisaab.selectedSwaps.v1';
const LANG_STORAGE_KEY = 'hawahisaab.language.v1';
const LEGACY_LOCATION_KEY = 'hawahisaab.location.v1';

export function loadSavedLanguage(): 'en' | 'hi' {
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY);
    return raw === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

export function saveLanguage(lang: 'en' | 'hi'): void {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors
  }
}

export function loadSavedProfile(): FamilyProfile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FamilyProfile>;
    if (
      parsed.location &&
      typeof parsed.location.label === 'string' &&
      typeof parsed.location.lat === 'number' &&
      typeof parsed.location.lon === 'number' &&
      Array.isArray(parsed.members) &&
      parsed.members.length > 0
    ) {
      return parsed as FamilyProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: FamilyProfile): void {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    window.localStorage.setItem(LEGACY_LOCATION_KEY, JSON.stringify(profile.location));
  } catch {
    // Ignore storage errors
  }
}

export function loadLegacyLocation(): FamilyProfile['location'] | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FamilyProfile['location']>;
    if (
      typeof parsed.label === 'string' &&
      typeof parsed.lat === 'number' &&
      typeof parsed.lon === 'number'
    ) {
      return { label: parsed.label, lat: parsed.lat, lon: parsed.lon };
    }
    return null;
  } catch {
    return null;
  }
}

export function loadSelectedSwaps(): SwapId[] | null {
  try {
    const raw = window.localStorage.getItem(SWAPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SwapId[]) : null;
  } catch {
    return null;
  }
}

export function saveSelectedSwaps(swaps: SwapId[]): void {
  try {
    window.localStorage.setItem(SWAPS_STORAGE_KEY, JSON.stringify(swaps));
  } catch {
    // Ignore storage errors
  }
}

export function createDefaultDraftProfile(): FamilyProfile {
  const savedLoc = loadLegacyLocation();
  return {
    location: savedLoc ?? { label: '', lat: 0, lon: 0 },
    members: [
      {
        id: 'member-1',
        name: '',
        ageGroup: 'adult',
        healthFlags: ['none'],
        outdoorHoursPerDay: 1.5,
      },
    ],
    commuteMode: 'car',
    commuteKmRoundTrip: 15,
    cookingFuel: 'lpg',
    homeSize: 'medium_2bhk',
    purifierCadrM3h: 0,
    outdoorRoutine: '',
    language: loadSavedLanguage(),
  };
}
