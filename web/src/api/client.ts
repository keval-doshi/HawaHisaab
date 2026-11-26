import type {
  AirForecastResponse,
  CleanWindowsResult,
  FamilyProfile,
  GeocodeResult,
  SmogDayPlan,
} from '@hawahisaab/engine';

export interface SelectedLocation {
  label: string;
  lat: number;
  lon: number;
}

interface ApiErrorPayload {
  error?: string;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${String(response.status)})`;
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      if (payload.error) message = payload.error;
    } catch {
      // Keep fallback error message
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export async function searchCities(query: string): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/geocode?${params.toString()}`);
  const data = await parseJsonOrThrow<{ results: GeocodeResult[] }>(response);
  return data.results;
}

export async function fetchAirForecast(
  lat: number,
  lon: number,
): Promise<AirForecastResponse> {
  const params = new URLSearchParams({
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
  });
  const response = await fetch(`/api/air?${params.toString()}`);
  return parseJsonOrThrow<AirForecastResponse>(response);
}

export async function requestSmogPlan(
  profile: FamilyProfile,
  forecast: AirForecastResponse,
  cleanWindows: CleanWindowsResult,
): Promise<SmogDayPlan> {
  const response = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, forecast, cleanWindows }),
  });
  return parseJsonOrThrow<SmogDayPlan>(response);
}
