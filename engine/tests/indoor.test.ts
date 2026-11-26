import { describe, expect, it } from 'vitest';
import { calculateSteadyStateIndoorPm25, simulateIndoorAir } from '../src/indoor.js';

describe('indoor PM2.5 steady-state mass balance', () => {
  it('computes C_in = (P*a*C_out + S/V) / (a + k + CADR/V)', () => {
    const result = calculateSteadyStateIndoorPm25({
      outdoorPm25: 200,
      penetrationFactor: 0.75,
      airChangesPerHour: 0.5,
      depositionRatePerHour: 0.4,
      purifierCadrM3h: 225,
      roomVolumeM3: 45,
      indoorSourceUgPerHour: 18000,
    });
    expect(result).toBe(80.5);
  });

  it('shows lower indoor PM2.5 when windows are closed and purifier CADR increases', () => {
    const openNoPurifier = simulateIndoorAir({
      outdoorPm25: 250,
      windowsOpen: true,
      roomVolumeM3: 50,
      purifierCadrM3h: 0,
      indoorSourceUgPerHour: 0,
    });

    const closedWithPurifier = simulateIndoorAir({
      outdoorPm25: 250,
      windowsOpen: false,
      roomVolumeM3: 50,
      purifierCadrM3h: 250,
      indoorSourceUgPerHour: 0,
    });

    expect(closedWithPurifier.indoorPm25).toBeLessThan(openNoPurifier.indoorPm25);
    expect(closedWithPurifier.reductionUgPerM3).toBeGreaterThan(100);
    expect(closedWithPurifier.reductionPercent).toBeGreaterThan(50);
  });

  it('handles zero baseline concentration cleanly', () => {
    const zeroSim = simulateIndoorAir({
      outdoorPm25: 0,
      windowsOpen: false,
      roomVolumeM3: 50,
      purifierCadrM3h: 0,
      indoorSourceUgPerHour: 0,
    });

    expect(zeroSim.indoorPm25).toBe(0);
    expect(zeroSim.baselineIndoorPm25).toBe(0);
    expect(zeroSim.reductionPercent).toBe(0);
  });

  it('validates all physical bounds', () => {
    const base = {
      outdoorPm25: 100,
      penetrationFactor: 0.75,
      airChangesPerHour: 0.5,
      depositionRatePerHour: 0.4,
      purifierCadrM3h: 0,
      roomVolumeM3: 45,
      indoorSourceUgPerHour: 0,
    };

    expect(() => calculateSteadyStateIndoorPm25({ ...base, outdoorPm25: -10 })).toThrow(
      RangeError,
    );
    expect(() => calculateSteadyStateIndoorPm25({ ...base, roomVolumeM3: 0 })).toThrow(
      RangeError,
    );
    expect(() =>
      calculateSteadyStateIndoorPm25({ ...base, penetrationFactor: 1.5 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateSteadyStateIndoorPm25({ ...base, airChangesPerHour: -0.1 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateSteadyStateIndoorPm25({ ...base, depositionRatePerHour: -0.1 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateSteadyStateIndoorPm25({ ...base, purifierCadrM3h: -10 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateSteadyStateIndoorPm25({ ...base, indoorSourceUgPerHour: -5 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateSteadyStateIndoorPm25({
        ...base,
        airChangesPerHour: 0,
        depositionRatePerHour: 0,
      }),
    ).toThrow(RangeError);
  });
});
