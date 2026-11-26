import type {
  AirForecastResponse,
  GeocodeResult,
  HourlyAirPoint,
} from '@hawahisaab/engine';
import { z } from 'zod';
import { TtlCache } from '../cache.js';

const OPEN_METEO_AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const OPEN_METEO_GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REQUEST_TIMEOUT_MS = 8000;
const FORECAST_HOURS = 48;

const openMeteoAirSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  utc_offset_seconds: z.number().default(0),
  timezone: z.string().default('UTC'),
  timezone_abbreviation: z.string().default('UTC'),
  hourly: z.object({
    time: z.array(z.string()),
    pm2_5: z.array(z.number().nullable()),
    pm10: z.array(z.number().nullable()),
  }),
});

const openMeteoGeocodeSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country_code: z.string().optional(),
        admin1: z.string().optional(),
        population: z.number().optional(),
      }),
    )
    .optional(),
});

export class UpstreamApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'UpstreamApiError';
    this.statusCode = statusCode;
  }
}

function selectCurrentHour(
  hourly: HourlyAirPoint[],
  utcOffsetSeconds: number,
  nowMs = Date.now(),
): HourlyAirPoint {
  const localIsoHour =
    new Date(nowMs + utcOffsetSeconds * 1000).toISOString().slice(0, 13) + ':00';

  const exactMatch = hourly.find((point) => point.time === localIsoHour);
  if (exactMatch && (exactMatch.pm2_5 !== null || exactMatch.pm10 !== null)) {
    return exactMatch;
  }

  const firstValid = hourly.find((point) => point.pm2_5 !== null || point.pm10 !== null);
  if (firstValid) return firstValid;

  return hourly[0] ?? { time: localIsoHour, pm2_5: null, pm10: null };
}

function buildHourlyPoints(
  times: string[],
  pm25Values: Array<number | null>,
  pm10Values: Array<number | null>,
): HourlyAirPoint[] {
  const count = Math.min(times.length, FORECAST_HOURS);
  const points: HourlyAirPoint[] = [];

  for (let i = 0; i < count; i += 1) {
    const time = times[i];
    if (!time) continue;
    points.push({
      time,
      pm2_5: pm25Values[i] ?? null,
      pm10: pm10Values[i] ?? null,
    });
  }

  return points;
}

async function fetchJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new UpstreamApiError('Unable to reach air quality data provider');
  }

  if (!response.ok) {
    throw new UpstreamApiError('Air quality data provider returned an error');
  }

  try {
    return await response.json();
  } catch {
    throw new UpstreamApiError('Invalid JSON received from air quality data provider');
  }
}

export interface OpenMeteoService {
  getAirQuality(lat: number, lon: number): Promise<AirForecastResponse>;
  searchIndiaCities(query: string): Promise<GeocodeResult[]>;
}

export function createOpenMeteoService(ttlMs: number): OpenMeteoService {
  const airCache = new TtlCache<AirForecastResponse>(ttlMs);
  const geocodeCache = new TtlCache<GeocodeResult[]>(ttlMs);

  return {
    async getAirQuality(lat: number, lon: number): Promise<AirForecastResponse> {
      const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
      const cached = airCache.get(cacheKey);
      if (cached) return cached;

      const url = new URL(OPEN_METEO_AIR_URL);
      url.searchParams.set('latitude', String(lat));
      url.searchParams.set('longitude', String(lon));
      url.searchParams.set('hourly', 'pm2_5,pm10');
      url.searchParams.set('forecast_days', '2');
      url.searchParams.set('timezone', 'auto');

      const raw = await fetchJson(url.toString());
      const parsed = openMeteoAirSchema.safeParse(raw);
      if (!parsed.success) {
        throw new UpstreamApiError('Unexpected air quality payload shape');
      }

      const data = parsed.data;
      const hourly = buildHourlyPoints(
        data.hourly.time,
        data.hourly.pm2_5,
        data.hourly.pm10,
      );
      const current = selectCurrentHour(hourly, data.utc_offset_seconds);

      const result: AirForecastResponse = {
        location: {
          lat: data.latitude,
          lon: data.longitude,
          timezone: data.timezone,
          timezoneAbbreviation: data.timezone_abbreviation,
        },
        fetchedAt: new Date().toISOString(),
        current,
        hourly,
      };

      airCache.set(cacheKey, result);
      return result;
    },

    async searchIndiaCities(query: string): Promise<GeocodeResult[]> {
      const normalized = query.trim().toLowerCase();
      const cached = geocodeCache.get(normalized);
      if (cached) return cached;

      const url = new URL(OPEN_METEO_GEOCODE_URL);
      url.searchParams.set('name', query.trim());
      url.searchParams.set('count', '8');
      url.searchParams.set('language', 'en');
      url.searchParams.set('format', 'json');
      url.searchParams.set('countryCode', 'IN');

      const raw = await fetchJson(url.toString());
      const parsed = openMeteoGeocodeSchema.safeParse(raw);
      if (!parsed.success) {
        throw new UpstreamApiError('Unexpected geocoding payload shape');
      }

      const results: GeocodeResult[] = (parsed.data.results ?? [])
        .filter((item) => item.country_code === 'IN')
        .map((item) => ({
          id: item.id,
          name: item.name,
          state: item.admin1 ?? null,
          countryCode: item.country_code ?? 'IN',
          lat: item.latitude,
          lon: item.longitude,
          population: item.population ?? null,
        }));

      geocodeCache.set(normalized, results);
      return results;
    },
  };
}
