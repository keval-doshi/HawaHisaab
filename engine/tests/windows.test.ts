import { describe, expect, it } from 'vitest';
import type { HourlyAirPoint } from '../src/types.js';
import { findCleanWindows } from '../src/windows.js';

function makeDayPoints(): HourlyAirPoint[] {
  const pmByHour: Record<number, number> = {
    0: 40, // night (ignored)
    3: 35, // night (ignored)
    5: 50, // before 6am (ignored)
    6: 220,
    7: 240,
    8: 260,
    9: 190,
    10: 150,
    11: 130,
    12: 110,
    13: 90,
    14: 80,
    15: 95,
    16: 120,
    17: 160,
    18: 210,
    19: 250,
    20: 270,
    21: 230,
    22: 20, // 10pm+ (ignored)
    23: 15, // night (ignored)
  };

  return Object.entries(pmByHour).map(([h, pm]) => ({
    time: `2026-11-26T${h.padStart(2, '0')}:00`,
    pm2_5: pm,
    pm10: pm * 1.5,
  }));
}

describe('clean-window finder', () => {
  it('finds best 1h, 2h, and 3h windows strictly within 6am-10pm and lists worst hours', () => {
    const result = findCleanWindows(makeDayPoints());

    expect(result.best1h).toEqual({
      startTime: '2026-11-26T14:00',
      endTime: '2026-11-26T15:00',
      hours: 1,
      averagePm25: 80,
      minPm25: 80,
      maxPm25: 80,
    });

    expect(result.best2h).toEqual({
      startTime: '2026-11-26T13:00',
      endTime: '2026-11-26T15:00',
      hours: 2,
      averagePm25: 85,
      minPm25: 80,
      maxPm25: 90,
    });

    expect(result.best3h).toEqual({
      startTime: '2026-11-26T13:00',
      endTime: '2026-11-26T16:00',
      hours: 3,
      averagePm25: 88.3,
      minPm25: 80,
      maxPm25: 95,
    });

    expect(result.worstHours[0]).toEqual({
      time: '2026-11-26T20:00',
      pm2_5: 270,
    });
    expect(result.worstHours).toHaveLength(4);
  });

  it('does not bridge windows across gaps or missing hours and honors fromTime', () => {
    const gapped: HourlyAirPoint[] = [
      { time: '2026-11-26T09:00', pm2_5: 40, pm10: 60 },
      { time: '2026-11-26T10:00', pm2_5: null, pm10: null },
      { time: '2026-11-26T11:00', pm2_5: 50, pm10: 70 },
      { time: '2026-11-26T12:00', pm2_5: 60, pm10: 80 },
    ];

    const res = findCleanWindows(gapped);
    expect(res.best1h?.startTime).toBe('2026-11-26T09:00');
    expect(res.best2h?.startTime).toBe('2026-11-26T11:00');
    expect(res.best3h).toBeNull();

    const filtered = findCleanWindows(gapped, { fromTime: '2026-11-26T11:00' });
    expect(filtered.best1h?.startTime).toBe('2026-11-26T11:00');
  });
});
