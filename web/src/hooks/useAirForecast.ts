import { useEffect, useState } from 'react';
import type { AirForecastResponse } from '@hawahisaab/engine';
import { fetchAirForecast } from '../api/client.js';

export interface AirForecastState {
  forecast: AirForecastResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads the 48-hour air forecast for a location and reloads it whenever the coordinates
 * change. Stale responses from a previous location are ignored.
 */
export function useAirForecast(
  lat: number | undefined,
  lon: number | undefined,
): AirForecastState {
  const [forecast, setForecast] = useState<AirForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat === undefined || lon === undefined) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAirForecast(lat, lon)
      .then((data) => {
        if (!cancelled) setForecast(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setForecast(null);
        setError(err instanceof Error ? err.message : 'Unable to fetch air forecast.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  return { forecast, loading, error };
}
