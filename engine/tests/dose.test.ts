import { describe, expect, it } from 'vitest';
import { calculateInhaledDoseUg, getInhalationRateM3PerHour } from '../src/dose.js';
import type { ActivityLevel, AgeGroup } from '../src/types.js';

describe('inhaled PM2.5 dose calculation', () => {
  it('computes dose_ug = concentration * inhalation_rate * hours across age groups', () => {
    const rateChildUnder5 = getInhalationRateM3PerHour('child_under_5', 'moderate');
    expect(rateChildUnder5).toBe(0.9);
    expect(calculateInhaledDoseUg(200, 'child_under_5', 'moderate', 2)).toBe(360);

    const rateAdultVigorous = getInhalationRateM3PerHour('adult', 'vigorous');
    expect(rateAdultVigorous).toBe(2.9);
    expect(calculateInhaledDoseUg(100, 'adult', 'vigorous', 1.5)).toBe(435);
  });

  it('orders activity levels monotonically for every age group', () => {
    const groups: AgeGroup[] = [
      'child_under_5',
      'child_5_12',
      'teen',
      'adult',
      'elderly',
    ];
    const levels: ActivityLevel[] = ['rest', 'light', 'moderate', 'vigorous'];

    for (const group of groups) {
      for (let i = 1; i < levels.length; i += 1) {
        const prev = levels[i - 1];
        const curr = levels[i];
        if (!prev || !curr) continue;
        expect(getInhalationRateM3PerHour(group, curr)).toBeGreaterThan(
          getInhalationRateM3PerHour(group, prev),
        );
      }
    }
  });

  it('returns 0 for zero exposure and rejects negative inputs', () => {
    expect(calculateInhaledDoseUg(0, 'elderly', 'rest', 8)).toBe(0);
    expect(calculateInhaledDoseUg(150, 'teen', 'light', 0)).toBe(0);
    expect(() => calculateInhaledDoseUg(-5, 'adult', 'rest', 1)).toThrow(RangeError);
    expect(() => calculateInhaledDoseUg(100, 'adult', 'rest', -1)).toThrow(RangeError);
  });
});
