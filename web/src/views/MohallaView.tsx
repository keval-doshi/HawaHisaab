import { useState } from 'react';
import type {
  AqiResult,
  CleanWindowsResult,
  DailyLedger,
  FamilyProfile,
} from '@hawahisaab/engine';
import { useI18n } from '../i18n/useI18n.js';

interface MohallaViewProps {
  profile: FamilyProfile;
  aqi: AqiResult | null;
  cleanWindows: CleanWindowsResult | null;
  ledger: DailyLedger;
}

export default function MohallaView({
  profile,
  aqi,
  cleanWindows,
  ledger,
}: MohallaViewProps) {
  const { t } = useI18n();
  const [households, setHouseholds] = useState(50);
  const [copied, setCopied] = useState(false);

  const scaledBreathedMg =
    Math.round((ledger.totalBreathedLessUg * households) / 100) / 10;
  const scaledPmKg = Math.round((ledger.emittedLessG * households) / 10) / 100;
  const scaledCo2Kg = Math.round(ledger.emittedLessKgCO2 * households * 10) / 10;

  const bestWindowText = cleanWindows?.best2h
    ? `${cleanWindows.best2h.startTime.slice(11, 16)}–${cleanWindows.best2h.endTime.slice(11, 16)}`
    : '13:00–15:00';
  const peakText = cleanWindows?.worstHours[0]
    ? cleanWindows.worstHours[0].time.slice(11, 16)
    : '08:00';

  const advisoryText = t.mohalla.advisoryTemplate
    .replace('{city}', profile.location.label)
    .replace('{aqi}', String(aqi?.aqi ?? 200))
    .replace('{band}', aqi ? t.aqiBands[aqi.band] : 'Moderate')
    .replace('{window}', bestWindowText)
    .replace('{peak}', peakText)
    .replace('{n}', String(households))
    .replace('{pm}', String(scaledPmKg))
    .replace('{co2}', String(scaledCo2Kg));

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(advisoryText)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(advisoryText);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="card" aria-labelledby="mohalla-heading">
      <h2 id="mohalla-heading">{t.mohalla.title}</h2>
      <p className="meta-line">{t.mohalla.subtitle}</p>

      <div className="field-group">
        <label className="field-label" htmlFor="mohalla-count-slider">
          {t.mohalla.householdsLabel}: <strong>{String(households)}</strong>
        </label>
        <div className="search-row">
          <input
            id="mohalla-count-slider"
            type="range"
            min={5}
            max={500}
            step={5}
            className="range-input"
            value={households}
            onChange={(e) => {
              setHouseholds(Number(e.target.value));
            }}
          />
          <input
            aria-label={t.mohalla.householdsLabel}
            type="number"
            min={1}
            max={5000}
            className="text-input compact-number"
            value={households}
            onChange={(e) => {
              setHouseholds(Math.max(1, Math.min(5000, Number(e.target.value) || 1)));
            }}
          />
        </div>
      </div>

      <div className="lab-results-grid" aria-live="polite">
        <div className="metric-box">
          <span className="metric-label">{t.mohalla.breathedSaved}</span>
          <strong className="metric-value" data-testid="mohalla-breathed">
            {String(scaledBreathedMg)} mg
          </strong>
        </div>

        <div className="metric-box">
          <span className="metric-label">{t.mohalla.pmEmittedSaved}</span>
          <strong className="metric-value" data-testid="mohalla-pm">
            {String(scaledPmKg)} kg
          </strong>
        </div>

        <div className="metric-box">
          <span className="metric-label">{t.mohalla.co2Saved}</span>
          <strong className="metric-value" data-testid="mohalla-co2">
            {String(scaledCo2Kg)} kg
          </strong>
        </div>
      </div>

      <div className="share-card">
        <h3>{t.mohalla.shareHeading}</h3>
        <p className="share-preview">{advisoryText}</p>
        <div className="action-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              void handleCopy();
            }}
          >
            {copied ? t.mohalla.copied : t.mohalla.copyText}
          </button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            {t.mohalla.shareWhatsApp}
          </a>
        </div>
      </div>
    </section>
  );
}
