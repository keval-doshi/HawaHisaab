import { describe, expect, it } from 'vitest';
import { computeDailyLedger } from '../src/ledger.js';
import type { AirForecastResponse, FamilyProfile } from '../src/types.js';

function makeForecast(emptyHourly = false, cleanPm25 = 90): AirForecastResponse {
  const hourly = emptyHourly
    ? []
    : Array.from({ length: 24 }, (_, hour) => ({
        time: `2026-11-26T${String(hour).padStart(2, '0')}:00`,
        pm2_5: hour >= 13 && hour <= 15 ? cleanPm25 : 220,
        pm10: hour >= 13 && hour <= 15 ? 140 : 320,
      }));

  return {
    location: {
      lat: 28.61,
      lon: 77.21,
      timezone: 'Asia/Kolkata',
      timezoneAbbreviation: 'IST',
    },
    fetchedAt: '2026-11-26T05:00:00.000Z',
    current: hourly[8] ?? { time: '2026-11-26T08:00', pm2_5: 220, pm10: 320 },
    hourly,
  };
}

function makeProfile(overrides: Partial<FamilyProfile> = {}): FamilyProfile {
  return {
    location: { label: 'Delhi', lat: 28.61, lon: 77.21 },
    members: [
      {
        id: 'm1',
        name: 'Dadi',
        ageGroup: 'elderly',
        healthFlags: ['heart'],
        outdoorHoursPerDay: 1,
      },
      {
        id: 'm2',
        name: 'Kabir',
        ageGroup: 'child_under_5',
        healthFlags: ['none'],
        outdoorHoursPerDay: 0,
      },
    ],
    commuteMode: 'car',
    commuteKmRoundTrip: 16,
    cookingFuel: 'lpg',
    homeSize: 'medium_2bhk',
    purifierCadrM3h: 250,
    outdoorRoutine: 'Morning park walk',
    language: 'en',
    ...overrides,
  };
}

describe('two-sided daily air ledger', () => {
  it('computes per-member breathedLessUg and household emitted totals with basis strings', () => {
    const ledger = computeDailyLedger(makeProfile(), makeForecast());

    expect(ledger.members).toHaveLength(2);
    expect(ledger.members[0]?.basis).toContain('90 ug/m3 clean window');
    expect(ledger.members[1]?.basis).toContain('0h outdoor planned');

    const severeLedger = computeDailyLedger(makeProfile(), makeForecast(false, 150));
    expect(severeLedger.members[0]?.basis).toContain('N95 mask (-80%)');
    for (const member of ledger.members) {
      expect(member.breathedLessUg).toBeGreaterThan(0);
      expect(member.baselineDoseUg).toBeGreaterThan(member.plannedDoseUg);
      expect(member.basis).toContain('US EPA inhalation rates');
      expect(member.basis).toContain('CADR 250 m3/h');
    }

    const memberSum = ledger.members.reduce((sum, m) => sum + m.breathedLessUg, 0);
    expect(ledger.totalBreathedLessUg).toBeCloseTo(memberSum, 1);

    expect(ledger.emittedLessG).toBeGreaterThan(0);
    expect(ledger.emittedLessKgCO2).toBeGreaterThan(0);
    expect(ledger.emittedBasis).toContain('ARAI, CEEW, and CPCB');
  });

  it('supports filtering emitted totals to explicitly selected swaps including empty selection', () => {
    const soloMetro = computeDailyLedger(makeProfile(), makeForecast(), ['car_to_metro']);
    expect(soloMetro.swapsBreakdown).toHaveLength(1);
    expect(soloMetro.swapsBreakdown[0]?.swapId).toBe('car_to_metro');
    expect(soloMetro.emittedLessKgCO2).toBe(2.24);

    const noneSelected = computeDailyLedger(
      makeProfile({ cookingFuel: 'biomass' }),
      makeForecast(true),
      [],
    );
    expect(noneSelected.swapsBreakdown).toHaveLength(0);
    expect(noneSelected.emittedLessG).toBe(0);
    expect(noneSelected.emittedBasis).toContain('No active emission swaps selected');
  });
});
