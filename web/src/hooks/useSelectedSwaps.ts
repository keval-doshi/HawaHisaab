import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_OUTDOOR_PM25_UG_M3,
  evaluateHouseholdSwaps,
  type FamilyProfile,
  type SwapId,
} from '@hawahisaab/engine';
import { loadSelectedSwaps, saveSelectedSwaps } from '../state/storage.js';

/** How many swaps are pre-selected for a new household. */
const DEFAULT_SWAP_COUNT = 4;

/** The highest-impact swaps that apply to this household. */
export function defaultSwapIds(profile: FamilyProfile, outdoorPm25: number): SwapId[] {
  return evaluateHouseholdSwaps(profile, outdoorPm25)
    .filter((swap) => swap.applicable)
    .slice(0, DEFAULT_SWAP_COUNT)
    .map((swap) => swap.swapId);
}

export interface SelectedSwapsState {
  selectedSwapIds: SwapId[];
  toggleSwap: (swapId: SwapId) => void;
  /** Replaces the selection with this household's defaults (used after a profile change). */
  resetToDefaults: (profile: FamilyProfile) => void;
}

/**
 * The swaps the family has committed to, persisted in localStorage. If the user has never
 * chosen any, the household's default swaps are selected once the profile is known.
 */
export function useSelectedSwaps(
  profile: FamilyProfile | null,
  outdoorPm25: number | null,
): SelectedSwapsState {
  const [selectedSwapIds, setSelectedSwapIds] = useState<SwapId[]>(
    () => loadSelectedSwaps() ?? [],
  );

  const select = useCallback((next: SwapId[]) => {
    setSelectedSwapIds(next);
    saveSelectedSwaps(next);
  }, []);

  useEffect(() => {
    if (!profile || outdoorPm25 === null || selectedSwapIds.length > 0) return;
    if (loadSelectedSwaps() !== null) return;
    select(defaultSwapIds(profile, outdoorPm25));
  }, [profile, outdoorPm25, selectedSwapIds.length, select]);

  const toggleSwap = useCallback((swapId: SwapId) => {
    setSelectedSwapIds((prev) => {
      const next = prev.includes(swapId)
        ? prev.filter((id) => id !== swapId)
        : [...prev, swapId];
      saveSelectedSwaps(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(
    (nextProfile: FamilyProfile) => {
      select(defaultSwapIds(nextProfile, outdoorPm25 ?? DEFAULT_OUTDOOR_PM25_UG_M3));
    },
    [outdoorPm25, select],
  );

  return { selectedSwapIds, toggleSwap, resetToDefaults };
}
