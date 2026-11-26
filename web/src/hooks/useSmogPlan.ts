import { useCallback, useEffect, useState } from 'react';
import type {
  AirForecastResponse,
  CleanWindowsResult,
  FamilyProfile,
  SmogDayPlan,
} from '@hawahisaab/engine';
import { requestSmogPlan } from '../api/client.js';

export interface SmogPlanInputs {
  profile: FamilyProfile | null;
  forecast: AirForecastResponse | null;
  cleanWindows: CleanWindowsResult | null;
  /** Requests are paused while false (e.g. while the profile is being edited). */
  enabled: boolean;
}

export interface SmogPlanState {
  plan: SmogDayPlan | null;
  loading: boolean;
  error: string | null;
  /** Requests a fresh plan for the current inputs. */
  refresh: () => void;
  /** Clears the current plan, e.g. after the profile changes. */
  clear: () => void;
}

/**
 * Requests the AI smog-day plan once the profile, forecast and clean windows are ready,
 * and again whenever any of them change or `refresh` is called.
 */
export function useSmogPlan({
  profile,
  forecast,
  cleanWindows,
  enabled,
}: SmogPlanInputs): SmogPlanState {
  const [plan, setPlan] = useState<SmogDayPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    if (!enabled || !profile || !forecast || !cleanWindows) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    requestSmogPlan(profile, forecast, cleanWindows)
      .then((result) => {
        if (!cancelled) setPlan(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to generate plan.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, profile, forecast, cleanWindows, requestId]);

  const refresh = useCallback(() => {
    setRequestId((id) => id + 1);
  }, []);

  const clear = useCallback(() => {
    setPlan(null);
  }, []);

  return { plan, loading, error, refresh, clear };
}
