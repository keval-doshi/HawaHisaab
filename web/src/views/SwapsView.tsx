import { useMemo } from 'react';
import {
  evaluateHouseholdSwaps,
  type FamilyProfile,
  type SwapId,
} from '@hawahisaab/engine';
import { useI18n } from '../i18n/useI18n.js';

interface SwapsViewProps {
  profile: FamilyProfile;
  outdoorPm25: number;
  selectedSwapIds: SwapId[];
  onToggleSwap: (swapId: SwapId) => void;
}

export default function SwapsView({
  profile,
  outdoorPm25,
  selectedSwapIds,
  onToggleSwap,
}: SwapsViewProps) {
  const { t, language } = useI18n();

  const rankedSwaps = useMemo(
    () => evaluateHouseholdSwaps(profile, outdoorPm25),
    [profile, outdoorPm25],
  );

  return (
    <section className="card" aria-labelledby="swaps-heading">
      <h2 id="swaps-heading">{t.swaps.title}</h2>
      <p className="meta-line">{t.swaps.subtitle}</p>

      <ul className="swaps-list">
        {rankedSwaps.map((swap) => {
          const isIncluded = selectedSwapIds.includes(swap.swapId);
          const title = language === 'hi' ? swap.titleHi : swap.titleEn;

          return (
            <li key={swap.swapId} className="swap-card">
              <div className="card-header-row">
                <div>
                  <span
                    className={`tag-pill ${swap.applicable ? 'tag-recommended' : ''}`}
                  >
                    {swap.applicable ? t.swaps.recommended : t.swaps.optional}
                  </span>
                  <h3 className="swap-title">{title}</h3>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${isIncluded ? 'btn-primary' : 'btn-secondary'}`}
                  aria-pressed={isIncluded}
                  onClick={() => {
                    onToggleSwap(swap.swapId);
                  }}
                >
                  {isIncluded ? t.swaps.included : t.swaps.includeInHisaab}
                </button>
              </div>

              <div className="swap-metrics">
                <div className="swap-metric-item">
                  <span className="metric-label">{t.swaps.breathedLess}</span>
                  <strong>{String(swap.breathedLessUg)} µg PM2.5</strong>
                </div>
                <div className="swap-metric-item">
                  <span className="metric-label">{t.swaps.emittedLess}</span>
                  <strong>
                    {String(swap.emittedLessG)} g PM2.5 · {String(swap.emittedLessKgCO2)}{' '}
                    kg CO₂
                  </strong>
                </div>
              </div>

              <details className="basis-details">
                <summary>{t.swaps.whyThis}</summary>
                <p className="meta-line">{swap.basis}</p>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
