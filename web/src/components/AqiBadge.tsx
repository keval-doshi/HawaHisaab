import type { AqiBand } from '@hawahisaab/engine';
import { useI18n } from '../i18n/useI18n.js';

interface AqiBadgeProps {
  band: AqiBand;
}

const BAND_CLASS: Record<AqiBand, string> = {
  Good: 'aqi-band-good',
  Satisfactory: 'aqi-band-satisfactory',
  Moderate: 'aqi-band-moderate',
  Poor: 'aqi-band-poor',
  'Very Poor': 'aqi-band-verypoor',
  Severe: 'aqi-band-severe',
};

function BandIcon({ band }: { band: AqiBand }) {
  switch (band) {
    case 'Good':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M8.5 12.5 11 15l4.5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'Satisfactory':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M8 12h8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'Moderate':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <polygon
            points="12,3 21,12 12,21 3,12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      );
    case 'Poor':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M12 3 21 19H3Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M12 9v4m0 3h.01"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'Very Poor':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <polygon
            points="7.8,3 16.2,3 21,7.8 21,16.2 16.2,21 7.8,21 3,16.2 3,7.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M12 8v5m0 3h.01"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'Severe':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M9 8v5m0 3h.01M15 8v5m0 3h.01"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export function AqiBadge({ band }: AqiBadgeProps) {
  const { t } = useI18n();
  return (
    <span className={`aqi-badge ${BAND_CLASS[band]}`}>
      <BandIcon band={band} />
      <span>{t.aqiBands[band]}</span>
    </span>
  );
}
