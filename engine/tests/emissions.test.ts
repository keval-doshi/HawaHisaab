import { describe, expect, it } from 'vitest';
import { calculateSwapImpact, evaluateHouseholdSwaps } from '../src/emissions.js';
import type { FamilyProfile } from '../src/types.js';

function makeProfile(overrides: Partial<FamilyProfile> = {}): FamilyProfile {
  return {
    location: { label: 'Delhi', lat: 28.6139, lon: 77.209 },
    members: [
      {
        id: 'm1',
        name: 'Asha',
        ageGroup: 'adult',
        healthFlags: ['none'],
        outdoorHoursPerDay: 2,
      },
      {
        id: 'm2',
        name: 'Rohan',
        ageGroup: 'child_5_12',
        healthFlags: ['asthma'],
        outdoorHoursPerDay: 1.5,
      },
    ],
    commuteMode: 'car',
    commuteKmRoundTrip: 20,
    cookingFuel: 'lpg',
    homeSize: 'medium_2bhk',
    purifierCadrM3h: 200,
    outdoorRoutine: 'Morning walk and school run',
    language: 'en',
    ...overrides,
  };
}

describe('emissions avoided per swap', () => {
  it('computes car to metro and carpool emission reductions from ARAI factors', () => {
    const profile = makeProfile({ commuteMode: 'car', commuteKmRoundTrip: 20 });

    const metro = calculateSwapImpact('car_to_metro', profile, 180);
    expect(metro.applicable).toBe(true);
    expect(metro.emittedLessG).toBe(0.46); // 20 * (0.025 - 0.002)
    expect(metro.emittedLessKgCO2).toBe(2.8); // 20 * (0.175 - 0.035)
    expect(metro.breathedLessUg).toBeGreaterThan(0);

    const carpool = calculateSwapImpact('car_to_carpool', profile, 180);
    expect(carpool.applicable).toBe(true);
    expect(carpool.emittedLessG).toBeCloseTo(0.33, 2);
    expect(carpool.emittedLessKgCO2).toBeCloseTo(2.33, 2);
  });

  it('computes gas to induction, biomass to clean, and leaf composting impacts', () => {
    const lpgProfile = makeProfile({ cookingFuel: 'lpg' });
    const gasSwap = calculateSwapImpact('gas_to_induction', lpgProfile, 150);
    expect(gasSwap.applicable).toBe(true);
    expect(gasSwap.emittedLessG).toBe(0.35);
    expect(gasSwap.emittedLessKgCO2).toBe(0.27);

    const biomassProfile = makeProfile({ cookingFuel: 'biomass' });
    const biomassSwap = calculateSwapImpact(
      'biomass_to_lpg_induction',
      biomassProfile,
      150,
    );
    expect(biomassSwap.applicable).toBe(true);
    expect(biomassSwap.emittedLessG).toBe(18);
    expect(biomassSwap.emittedLessKgCO2).toBe(2.5);

    const leavesSwap = calculateSwapImpact('leaves_to_compost', lpgProfile, 150);
    expect(leavesSwap.emittedLessG).toBe(16);
    expect(leavesSwap.emittedLessKgCO2).toBe(2.9);
  });

  it('ranks applicable swaps ahead of non-applicable ones', () => {
    const profile = makeProfile({
      commuteMode: 'two_wheeler',
      commuteKmRoundTrip: 15,
      cookingFuel: 'induction',
    });

    const ranked = evaluateHouseholdSwaps(profile, 200);
    const twoWheeler = ranked.find((s) => s.swapId === 'two_wheeler_to_metro');
    const carToMetro = ranked.find((s) => s.swapId === 'car_to_metro');
    const gasSwap = ranked.find((s) => s.swapId === 'gas_to_induction');

    expect(twoWheeler?.applicable).toBe(true);
    expect(carToMetro?.applicable).toBe(false);
    expect(gasSwap?.applicable).toBe(false);

    const firstNonApplicableIdx = ranked.findIndex((s) => !s.applicable);
    const lastApplicableIdx = ranked.map((s) => s.applicable).lastIndexOf(true);
    expect(lastApplicableIdx).toBeLessThan(firstNonApplicableIdx);
  });
});
