import {
  HOME_VOLUME_M3,
  INDOOR_SOURCE_RATES_UG_PER_HOUR,
  simulateIndoorAir,
  type AirForecastResponse,
  type FamilyProfile,
  type IndoorSimulationResult,
} from '@hawahisaab/engine';

/** Outdoor PM2.5 (µg/m³) assumed when the forecast has no current reading. */
export const DEFAULT_OUTDOOR_PM25_UG_M3 = 120;

export interface IndoorScenarios {
  /** Windows closed, purifier on, clean cooking (pressure cooker / boiling). */
  closed: IndoorSimulationResult;
  /** Same home while frying a tadka without exhaust. */
  frying: IndoorSimulationResult;
  /** Same home while burning incense or a diya. */
  incense: IndoorSimulationResult;
}

export function currentOutdoorPm25(forecast: AirForecastResponse): number {
  return forecast.current.pm2_5 ?? DEFAULT_OUTDOOR_PM25_UG_M3;
}

/** Runs the engine's indoor mass-balance model for the three indoor-hack scenarios. */
export function simulateIndoorScenarios(
  profile: FamilyProfile,
  outdoorPm25: number,
): IndoorScenarios {
  const simulate = (indoorSourceUgPerHour: number): IndoorSimulationResult =>
    simulateIndoorAir({
      outdoorPm25,
      windowsOpen: false,
      roomVolumeM3: HOME_VOLUME_M3[profile.homeSize],
      purifierCadrM3h: profile.purifierCadrM3h,
      indoorSourceUgPerHour,
    });

  return {
    closed: simulate(INDOOR_SOURCE_RATES_UG_PER_HOUR.pressureCookerOrBoiling),
    frying: simulate(INDOOR_SOURCE_RATES_UG_PER_HOUR.unventedFryingTadka),
    incense: simulate(INDOOR_SOURCE_RATES_UG_PER_HOUR.incenseOrDiya),
  };
}
