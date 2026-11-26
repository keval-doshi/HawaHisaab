import { describe, expect, it } from 'vitest';
import { buildFallbackPlan, computeCpcbAqi, type HourlyAirPoint } from '../src/index.js';

describe('engine public exports smoke check', () => {
  it('re-exports engine helpers cleanly from index', () => {
    const point: HourlyAirPoint = {
      time: '2026-11-26T09:00',
      pm2_5: 145.2,
      pm10: 230.5,
    };
    expect(point.pm2_5).toBe(145.2);
    expect(computeCpcbAqi(145.2, 230.5)?.band).toBe('Very Poor');
    expect(typeof buildFallbackPlan).toBe('function');
  });
});
