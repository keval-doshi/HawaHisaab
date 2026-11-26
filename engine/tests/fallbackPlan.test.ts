import { describe, expect, it } from 'vitest';
import { buildFallbackPlan } from '../src/fallbackPlan.js';
import type { AirForecastResponse, FamilyProfile } from '../src/types.js';

function makeForecast(): AirForecastResponse {
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    time: `2026-11-26T${String(hour).padStart(2, '0')}:00`,
    pm2_5: hour >= 13 && hour <= 15 ? 85 : 240,
    pm10: hour >= 13 && hour <= 15 ? 140 : 340,
  }));

  return {
    location: {
      lat: 28.61,
      lon: 77.21,
      timezone: 'Asia/Kolkata',
      timezoneAbbreviation: 'IST',
    },
    fetchedAt: '2026-11-26T05:00:00.000Z',
    current: hourly[8] ?? { time: '2026-11-26T08:00', pm2_5: 240, pm10: 340 },
    hourly,
  };
}

function makeProfile(language: 'en' | 'hi'): FamilyProfile {
  return {
    location: { label: 'Delhi', lat: 28.61, lon: 77.21 },
    members: [
      {
        id: 'm1',
        name: 'Meera',
        ageGroup: 'adult',
        healthFlags: ['pregnancy'],
        outdoorHoursPerDay: 1,
      },
      {
        id: 'm2',
        name: 'Arjun',
        ageGroup: 'teen',
        healthFlags: ['none'],
        outdoorHoursPerDay: 2,
      },
    ],
    commuteMode: 'car',
    commuteKmRoundTrip: 12,
    cookingFuel: 'lpg',
    homeSize: 'small_1bhk',
    purifierCadrM3h: 150,
    outdoorRoutine: 'School run and evening walk',
    language,
  };
}

describe('rule-based fallback plan', () => {
  it('builds an English fallback plan with engine AQI, windows, and ledger numbers', () => {
    const plan = buildFallbackPlan(makeProfile('en'), makeForecast());

    expect(plan.source).toBe('fallback');
    expect(plan.language).toBe('en');
    expect(plan.aqi.band).toBe('Very Poor');
    expect(plan.cleanWindows.best2h?.startTime).toBe('2026-11-26T13:00');
    expect(plan.items).toHaveLength(2);
    expect(plan.items[0]?.breathedLessUg).toBeGreaterThan(0);
    expect(plan.indoorHacks).toHaveLength(3);
    expect(plan.swaps.length).toBeGreaterThan(0);
    expect(plan.summary).toContain(String(plan.aqi.aqi));
  });

  it('builds a Hindi fallback plan when language is hi', () => {
    const plan = buildFallbackPlan(makeProfile('hi'), makeForecast());

    expect(plan.source).toBe('fallback');
    expect(plan.language).toBe('hi');
    expect(plan.summary).toContain('CPCB AQI');
    expect(plan.items[0]?.action).toMatch(/[\u0900-\u097F]/);
  });
});
