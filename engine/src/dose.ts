import { INHALATION_RATES_M3_PER_HOUR } from './constants.js';
import type { ActivityLevel, AgeGroup } from './types.js';

export function getInhalationRateM3PerHour(
  ageGroup: AgeGroup,
  activityLevel: ActivityLevel,
): number {
  return INHALATION_RATES_M3_PER_HOUR[ageGroup][activityLevel];
}

/**
 * Computes inhaled PM2.5 dose (ug):
 * dose_ug = concentration (ug/m3) * inhalation rate (m3/h) * hours.
 */
export function calculateInhaledDoseUg(
  concentrationUgPerM3: number,
  ageGroup: AgeGroup,
  activityLevel: ActivityLevel,
  hours: number,
): number {
  if (!Number.isFinite(concentrationUgPerM3) || concentrationUgPerM3 < 0) {
    throw new RangeError('Concentration must be a non-negative finite number');
  }
  if (!Number.isFinite(hours) || hours < 0) {
    throw new RangeError(
      'Exposure duration (hours) must be a non-negative finite number',
    );
  }

  const rate = getInhalationRateM3PerHour(ageGroup, activityLevel);
  return Math.round(concentrationUgPerM3 * rate * hours * 100) / 100;
}
