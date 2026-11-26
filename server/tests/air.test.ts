import type { AirForecastResponse, GeocodeResult } from '@hawahisaab/engine';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';

function createSampleOpenMeteoAirPayload() {
  const times: string[] = [];
  const pm25: number[] = [];
  const pm10: number[] = [];

  for (let i = 0; i < 48; i += 1) {
    const day = i < 24 ? '2026-11-26' : '2026-11-27';
    const hour = String(i % 24).padStart(2, '0');
    times.push(`${day}T${hour}:00`);
    pm25.push(120 + i);
    pm10.push(210 + i);
  }

  return {
    latitude: 28.6139,
    longitude: 77.209,
    utc_offset_seconds: 19800,
    timezone: 'Asia/Kolkata',
    timezone_abbreviation: 'IST',
    hourly: {
      time: times,
      pm2_5: pm25,
      pm10,
    },
  };
}

describe('GET /api/air and GET /api/geocode', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 48-hour pm2_5 and pm10 forecast and caches for 15 minutes', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(createSampleOpenMeteoAirPayload()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const app = createApp();

    const first = await request(app).get('/api/air?lat=28.6139&lon=77.209');
    expect(first.status).toBe(200);
    const firstBody = first.body as AirForecastResponse;
    expect(firstBody.location.timezone).toBe('Asia/Kolkata');
    expect(firstBody.hourly).toHaveLength(48);
    expect(firstBody.hourly[0]).toEqual({
      time: '2026-11-26T00:00',
      pm2_5: 120,
      pm10: 210,
    });
    expect(typeof firstBody.current.pm2_5).toBe('number');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestedUrl = fetchMock.mock.calls[0]?.[0];
    expect(typeof requestedUrl).toBe('string');
    if (typeof requestedUrl === 'string') {
      expect(requestedUrl).toContain('hourly=pm2_5%2Cpm10');
      expect(requestedUrl).toContain('forecast_days=2');
      expect(requestedUrl).toContain('timezone=auto');
    }

    // Second request within 15 minutes hits in-memory cache
    const second = await request(app).get('/api/air?lat=28.6139&lon=77.209');
    expect(second.status).toBe(200);
    const secondBody = second.body as AirForecastResponse;
    expect(secondBody.hourly).toHaveLength(48);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when lat or lon is missing, empty, or out of range', async () => {
    const app = createApp();

    const missing = await request(app).get('/api/air');
    expect(missing.status).toBe(400);

    const empty = await request(app).get('/api/air?lat=&lon=');
    expect(empty.status).toBe(400);

    const outOfRange = await request(app).get('/api/air?lat=95&lon=77.2');
    expect(outOfRange.status).toBe(400);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 502 without leaking stack traces when upstream fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Upstream failure', { status: 503 }));

    const app = createApp();
    const res = await request(app).get('/api/air?lat=28.61&lon=77.21');

    expect(res.status).toBe(502);
    const errBody = res.body as { error?: string; stack?: string };
    expect(errBody.error).toBeTruthy();
    expect(errBody.stack).toBeUndefined();
  });

  it('geocodes Indian cities and filters out non-India results', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 1273294,
              name: 'Delhi',
              latitude: 28.65195,
              longitude: 77.23149,
              country_code: 'IN',
              admin1: 'Delhi',
              population: 10927986,
            },
            {
              id: 999999,
              name: 'Delhi',
              latitude: 42.278,
              longitude: -74.916,
              country_code: 'US',
              admin1: 'New York',
              population: 5000,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const app = createApp();
    const res = await request(app).get('/api/geocode?q=Delhi');

    expect(res.status).toBe(200);
    const geocodeBody = res.body as { results: GeocodeResult[] };
    expect(geocodeBody.results).toHaveLength(1);
    expect(geocodeBody.results[0]).toMatchObject({
      name: 'Delhi',
      state: 'Delhi',
      countryCode: 'IN',
      lat: 28.65195,
      lon: 77.23149,
    });
  });

  it('returns 400 when geocode query is missing or too short', async () => {
    const app = createApp();

    const missing = await request(app).get('/api/geocode');
    expect(missing.status).toBe(400);

    const tooShort = await request(app).get('/api/geocode?q=a');
    expect(tooShort.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
