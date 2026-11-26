import { INDOOR_DEFAULTS } from './constants.js';
import type { IndoorSimulationInput, IndoorSimulationResult } from './types.js';

export interface SteadyStateMassBalanceParams {
  outdoorPm25: number;
  penetrationFactor: number;
  airChangesPerHour: number;
  depositionRatePerHour: number;
  purifierCadrM3h: number;
  roomVolumeM3: number;
  indoorSourceUgPerHour: number;
}

/**
 * Steady-state indoor PM2.5 mass balance:
 * C_in = (P * a * C_out + S / V) / (a + k + CADR / V)
 */
export function calculateSteadyStateIndoorPm25(
  params: SteadyStateMassBalanceParams,
): number {
  const {
    outdoorPm25,
    penetrationFactor,
    airChangesPerHour,
    depositionRatePerHour,
    purifierCadrM3h,
    roomVolumeM3,
    indoorSourceUgPerHour,
  } = params;

  if (!Number.isFinite(outdoorPm25) || outdoorPm25 < 0) {
    throw new RangeError('outdoorPm25 must be a non-negative finite number');
  }
  if (!Number.isFinite(roomVolumeM3) || roomVolumeM3 <= 0) {
    throw new RangeError('roomVolumeM3 must be greater than 0');
  }
  if (
    !Number.isFinite(penetrationFactor) ||
    penetrationFactor < 0 ||
    penetrationFactor > 1
  ) {
    throw new RangeError('penetrationFactor must be between 0 and 1');
  }
  if (!Number.isFinite(airChangesPerHour) || airChangesPerHour < 0) {
    throw new RangeError('airChangesPerHour must be non-negative');
  }
  if (!Number.isFinite(depositionRatePerHour) || depositionRatePerHour < 0) {
    throw new RangeError('depositionRatePerHour must be non-negative');
  }
  if (!Number.isFinite(purifierCadrM3h) || purifierCadrM3h < 0) {
    throw new RangeError('purifierCadrM3h must be non-negative');
  }
  if (!Number.isFinite(indoorSourceUgPerHour) || indoorSourceUgPerHour < 0) {
    throw new RangeError('indoorSourceUgPerHour must be non-negative');
  }

  const denominator =
    airChangesPerHour + depositionRatePerHour + purifierCadrM3h / roomVolumeM3;
  if (denominator <= 0) {
    throw new RangeError('Total particle loss rate (a + k + CADR/V) must be > 0');
  }

  const numerator =
    penetrationFactor * airChangesPerHour * outdoorPm25 +
    indoorSourceUgPerHour / roomVolumeM3;

  return Math.round((numerator / denominator) * 10) / 10;
}

/**
 * Simulates indoor PM2.5 using published default assumptions for closed vs. open windows,
 * comparing against an unmitigated baseline (open windows, no purifier).
 */
export function simulateIndoorAir(input: IndoorSimulationInput): IndoorSimulationResult {
  const penetrationFactor =
    input.penetrationFactor ??
    (input.windowsOpen
      ? INDOOR_DEFAULTS.penetrationOpen
      : INDOOR_DEFAULTS.penetrationClosed);

  const airChangesPerHour =
    input.airChangesPerHour ??
    (input.windowsOpen
      ? INDOOR_DEFAULTS.airChangesOpen
      : INDOOR_DEFAULTS.airChangesClosed);

  const depositionRatePerHour =
    input.depositionRatePerHour ?? INDOOR_DEFAULTS.depositionRate;

  const indoorPm25 = calculateSteadyStateIndoorPm25({
    outdoorPm25: input.outdoorPm25,
    penetrationFactor,
    airChangesPerHour,
    depositionRatePerHour,
    purifierCadrM3h: input.purifierCadrM3h,
    roomVolumeM3: input.roomVolumeM3,
    indoorSourceUgPerHour: input.indoorSourceUgPerHour,
  });

  const baselineIndoorPm25 = calculateSteadyStateIndoorPm25({
    outdoorPm25: input.outdoorPm25,
    penetrationFactor: INDOOR_DEFAULTS.penetrationOpen,
    airChangesPerHour: INDOOR_DEFAULTS.airChangesOpen,
    depositionRatePerHour,
    purifierCadrM3h: 0,
    roomVolumeM3: input.roomVolumeM3,
    indoorSourceUgPerHour: input.indoorSourceUgPerHour,
  });

  const reductionUgPerM3 = Math.max(
    0,
    Math.round((baselineIndoorPm25 - indoorPm25) * 10) / 10,
  );
  const reductionPercent =
    baselineIndoorPm25 > 0
      ? Math.max(0, Math.round((reductionUgPerM3 / baselineIndoorPm25) * 100))
      : 0;

  return {
    indoorPm25,
    baselineIndoorPm25,
    reductionUgPerM3,
    reductionPercent,
    assumptions: {
      penetrationFactor,
      airChangesPerHour,
      depositionRatePerHour,
      roomVolumeM3: input.roomVolumeM3,
      indoorSourceUgPerHour: input.indoorSourceUgPerHour,
      purifierCadrM3h: input.purifierCadrM3h,
    },
  };
}
