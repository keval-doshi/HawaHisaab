import { WAKING_HOURS } from './constants.js';
import type {
  CleanWindow,
  CleanWindowsResult,
  HourlyAirPoint,
  WorstHour,
} from './types.js';

const ONE_HOUR_MS = 3_600_000;

interface ParsedHour {
  time: string;
  ms: number;
  hourOfDay: number;
  pm25: number;
}

function parseIsoHour(time: string): { ms: number; hourOfDay: number } | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):00$/.exec(time);
  if (!match) return null;
  const hourOfDay = Number(match[2]);
  if (!Number.isInteger(hourOfDay) || hourOfDay < 0 || hourOfDay > 23) return null;
  const ms = Date.parse(`${time}:00Z`);
  if (!Number.isFinite(ms)) return null;
  return { ms, hourOfDay };
}

function formatIsoHourFromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 13) + ':00';
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function findBestWindowOfLength(
  wakingPoints: ParsedHour[],
  hours: number,
): CleanWindow | null {
  if (wakingPoints.length < hours) return null;

  let best: CleanWindow | null = null;

  for (let i = 0; i <= wakingPoints.length - hours; i += 1) {
    const first = wakingPoints[i];
    if (!first) continue;

    let contiguous = true;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let offset = 0; offset < hours; offset += 1) {
      const current = wakingPoints[i + offset];
      if (!current) {
        contiguous = false;
        break;
      }
      if (offset > 0) {
        const prev = wakingPoints[i + offset - 1];
        if (!prev || current.ms - prev.ms !== ONE_HOUR_MS) {
          contiguous = false;
          break;
        }
      }
      sum += current.pm25;
      if (current.pm25 < min) min = current.pm25;
      if (current.pm25 > max) max = current.pm25;
    }

    if (!contiguous) continue;

    const avg = sum / hours;
    if (!best || avg < best.averagePm25) {
      best = {
        startTime: first.time,
        endTime: formatIsoHourFromUtcMs(first.ms + hours * ONE_HOUR_MS),
        hours,
        averagePm25: round1(avg),
        minPm25: round1(min),
        maxPm25: round1(max),
      };
    }
  }

  return best;
}

export interface FindCleanWindowsOptions {
  fromTime?: string;
  wakingStartHour?: number;
  wakingEndHour?: number;
  worstLimit?: number;
}

/**
 * Finds the best 1-, 2-, and 3-hour clean-air windows within waking hours (6am-10pm)
 * and identifies the highest-PM2.5 waking hours to avoid.
 */
export function findCleanWindows(
  hourly: readonly HourlyAirPoint[],
  options: FindCleanWindowsOptions = {},
): CleanWindowsResult {
  const startHour = options.wakingStartHour ?? WAKING_HOURS.startHour;
  const endHour = options.wakingEndHour ?? WAKING_HOURS.endHour;
  const worstLimit = options.worstLimit ?? 4;

  const wakingPoints: ParsedHour[] = [];

  for (const point of hourly) {
    if (point.pm2_5 === null || !Number.isFinite(point.pm2_5)) continue;
    if (options.fromTime && point.time < options.fromTime) continue;

    const parsed = parseIsoHour(point.time);
    if (!parsed) continue;
    if (parsed.hourOfDay < startHour || parsed.hourOfDay >= endHour) continue;

    wakingPoints.push({
      time: point.time,
      ms: parsed.ms,
      hourOfDay: parsed.hourOfDay,
      pm25: point.pm2_5,
    });
  }

  wakingPoints.sort((a, b) => a.ms - b.ms);

  const worstHours: WorstHour[] = [...wakingPoints]
    .sort((a, b) => b.pm25 - a.pm25 || a.ms - b.ms)
    .slice(0, worstLimit)
    .map((p) => ({ time: p.time, pm2_5: round1(p.pm25) }));

  return {
    best1h: findBestWindowOfLength(wakingPoints, 1),
    best2h: findBestWindowOfLength(wakingPoints, 2),
    best3h: findBestWindowOfLength(wakingPoints, 3),
    worstHours,
  };
}
