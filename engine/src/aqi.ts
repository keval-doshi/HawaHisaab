import {
  CPCB_PM10_BREAKPOINTS,
  CPCB_PM25_BREAKPOINTS,
  type AqiBreakpoint,
} from './constants.js';
import type { AqiBand, AqiResult } from './types.js';

function interpolateFromBreakpoints(
  concentration: number,
  breakpoints: readonly AqiBreakpoint[],
): { subIndex: number; band: AqiBand } {
  if (!Number.isFinite(concentration) || concentration < 0) {
    throw new RangeError('Pollutant concentration must be a non-negative finite number');
  }

  // Zero maps cleanly to the start of the Good band
  if (concentration === 0) {
    return { subIndex: 0, band: 'Good' };
  }

  for (let i = 0; i < breakpoints.length; i += 1) {
    const bp = breakpoints[i];
    if (!bp) continue;

    const isFirst = i === 0;
    const isLast = i === breakpoints.length - 1;
    const inRange = isFirst
      ? concentration <= bp.cHigh
      : isLast
        ? concentration > bp.cLow
        : concentration > bp.cLow && concentration <= bp.cHigh;

    if (inRange) {
      const clampedC = Math.min(concentration, bp.cHigh);
      const raw =
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (clampedC - bp.cLow) + bp.iLow;
      return {
        subIndex: Math.min(500, Math.round(raw)),
        band: bp.band,
      };
    }
  }

  const last = breakpoints[breakpoints.length - 1];
  return { subIndex: 500, band: last?.band ?? 'Severe' };
}

export function bandFromAqi(aqi: number): AqiBand {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function computePm25SubIndex(pm25: number): number {
  return interpolateFromBreakpoints(pm25, CPCB_PM25_BREAKPOINTS).subIndex;
}

export function computePm10SubIndex(pm10: number): number {
  return interpolateFromBreakpoints(pm10, CPCB_PM10_BREAKPOINTS).subIndex;
}

/**
 * Computes India CPCB National Air Quality Index from PM2.5 and PM10 concentrations (ug/m3).
 * Overall AQI = max(PM2.5 sub-index, PM10 sub-index).
 */
export function computeCpcbAqi(
  pm25: number | null,
  pm10: number | null,
): AqiResult | null {
  if (pm25 === null && pm10 === null) {
    return null;
  }

  const pm25SubIndex = pm25 !== null ? computePm25SubIndex(pm25) : null;
  const pm10SubIndex = pm10 !== null ? computePm10SubIndex(pm10) : null;

  if (pm25SubIndex !== null && pm10SubIndex !== null) {
    const aqi = Math.max(pm25SubIndex, pm10SubIndex);
    const dominantPollutant =
      pm25SubIndex === pm10SubIndex
        ? 'both'
        : pm25SubIndex > pm10SubIndex
          ? 'pm2_5'
          : 'pm10';
    return {
      aqi,
      band: bandFromAqi(aqi),
      pm25SubIndex,
      pm10SubIndex,
      dominantPollutant,
    };
  }

  if (pm25SubIndex !== null) {
    return {
      aqi: pm25SubIndex,
      band: bandFromAqi(pm25SubIndex),
      pm25SubIndex,
      pm10SubIndex: null,
      dominantPollutant: 'pm2_5',
    };
  }

  const soloPm10 = pm10SubIndex ?? 0;
  return {
    aqi: soloPm10,
    band: bandFromAqi(soloPm10),
    pm25SubIndex: null,
    pm10SubIndex: soloPm10,
    dominantPollutant: 'pm10',
  };
}
