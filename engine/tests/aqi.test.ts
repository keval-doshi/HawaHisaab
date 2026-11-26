import { describe, expect, it } from 'vitest';
import {
  bandFromAqi,
  computeCpcbAqi,
  computePm10SubIndex,
  computePm25SubIndex,
} from '../src/aqi.js';

describe('India CPCB AQI calculation', () => {
  it('computes PM2.5 sub-index accurately across every CPCB breakpoint edge', () => {
    expect(computePm25SubIndex(0)).toBe(0);
    expect(computePm25SubIndex(30)).toBe(50);
    expect(computePm25SubIndex(30.1)).toBe(51);
    expect(computePm25SubIndex(60)).toBe(100);
    expect(computePm25SubIndex(60.1)).toBe(101);
    expect(computePm25SubIndex(90)).toBe(200);
    expect(computePm25SubIndex(90.1)).toBe(201);
    expect(computePm25SubIndex(120)).toBe(300);
    expect(computePm25SubIndex(120.1)).toBe(301);
    expect(computePm25SubIndex(250)).toBe(400);
    expect(computePm25SubIndex(250.1)).toBe(401);
    expect(computePm25SubIndex(380)).toBe(500);
    expect(computePm25SubIndex(650)).toBe(500);
  });

  it('computes PM10 sub-index accurately across every CPCB breakpoint edge', () => {
    expect(computePm10SubIndex(0)).toBe(0);
    expect(computePm10SubIndex(50)).toBe(50);
    expect(computePm10SubIndex(50.1)).toBe(51);
    expect(computePm10SubIndex(100)).toBe(100);
    expect(computePm10SubIndex(100.1)).toBe(101);
    expect(computePm10SubIndex(250)).toBe(200);
    expect(computePm10SubIndex(250.1)).toBe(201);
    expect(computePm10SubIndex(350)).toBe(300);
    expect(computePm10SubIndex(350.1)).toBe(301);
    expect(computePm10SubIndex(430)).toBe(400);
    expect(computePm10SubIndex(430.1)).toBe(401);
    expect(computePm10SubIndex(510)).toBe(500);
    expect(computePm10SubIndex(800)).toBe(500);
  });

  it('maps AQI bands to official CPCB names', () => {
    expect(bandFromAqi(0)).toBe('Good');
    expect(bandFromAqi(50)).toBe('Good');
    expect(bandFromAqi(51)).toBe('Satisfactory');
    expect(bandFromAqi(100)).toBe('Satisfactory');
    expect(bandFromAqi(101)).toBe('Moderate');
    expect(bandFromAqi(200)).toBe('Moderate');
    expect(bandFromAqi(201)).toBe('Poor');
    expect(bandFromAqi(300)).toBe('Poor');
    expect(bandFromAqi(301)).toBe('Very Poor');
    expect(bandFromAqi(400)).toBe('Very Poor');
    expect(bandFromAqi(401)).toBe('Severe');
    expect(bandFromAqi(500)).toBe('Severe');
  });

  it('sets overall AQI to max of PM2.5 and PM10 sub-indices', () => {
    const pm25Dominant = computeCpcbAqi(120, 100);
    expect(pm25Dominant).toEqual({
      aqi: 300,
      band: 'Poor',
      pm25SubIndex: 300,
      pm10SubIndex: 100,
      dominantPollutant: 'pm2_5',
    });

    const pm10Dominant = computeCpcbAqi(30, 350);
    expect(pm10Dominant).toEqual({
      aqi: 300,
      band: 'Poor',
      pm25SubIndex: 50,
      pm10SubIndex: 300,
      dominantPollutant: 'pm10',
    });

    const tied = computeCpcbAqi(60, 100);
    expect(tied?.dominantPollutant).toBe('both');
  });

  it('handles null single pollutant and rejects negative inputs', () => {
    expect(computeCpcbAqi(null, null)).toBeNull();
    expect(computeCpcbAqi(90, null)).toEqual({
      aqi: 200,
      band: 'Moderate',
      pm25SubIndex: 200,
      pm10SubIndex: null,
      dominantPollutant: 'pm2_5',
    });
    expect(computeCpcbAqi(null, 50)).toEqual({
      aqi: 50,
      band: 'Good',
      pm25SubIndex: null,
      pm10SubIndex: 50,
      dominantPollutant: 'pm10',
    });

    expect(() => computePm25SubIndex(-1)).toThrow(RangeError);
    expect(() => computePm10SubIndex(Number.NaN)).toThrow(RangeError);
  });
});
