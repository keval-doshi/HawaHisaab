import { useMemo, useState } from 'react';
import {
  calculateInhaledDoseUg,
  HOME_VOLUME_M3,
  INDOOR_SOURCE_RATES_UG_PER_HOUR,
  simulateIndoorAir,
  type FamilyProfile,
} from '@hawahisaab/engine';
import { useI18n } from '../i18n/useI18n.js';

interface IndoorLabViewProps {
  profile: FamilyProfile;
  outdoorPm25: number;
}

type SourcePresetKey =
  'none' | 'pressure' | 'ventedFry' | 'unventedFry' | 'incense' | 'coil';

const SOURCE_RATE_MAP: Record<SourcePresetKey, number> = {
  none: INDOOR_SOURCE_RATES_UG_PER_HOUR.none,
  pressure: INDOOR_SOURCE_RATES_UG_PER_HOUR.pressureCookerOrBoiling,
  ventedFry: INDOOR_SOURCE_RATES_UG_PER_HOUR.ventedFryingWithExhaust,
  unventedFry: INDOOR_SOURCE_RATES_UG_PER_HOUR.unventedFryingTadka,
  incense: INDOOR_SOURCE_RATES_UG_PER_HOUR.incenseOrDiya,
  coil: INDOOR_SOURCE_RATES_UG_PER_HOUR.mosquitoCoil,
};

export default function IndoorLabView({ profile, outdoorPm25 }: IndoorLabViewProps) {
  const { t } = useI18n();
  const [roomVolumeM3, setRoomVolumeM3] = useState<number>(
    HOME_VOLUME_M3[profile.homeSize],
  );
  const [windowsOpen, setWindowsOpen] = useState(false);
  const [cadrM3h, setCadrM3h] = useState<number>(profile.purifierCadrM3h);
  const [sourceKey, setSourceKey] = useState<SourcePresetKey>('pressure');

  const simulation = useMemo(
    () =>
      simulateIndoorAir({
        outdoorPm25,
        windowsOpen,
        roomVolumeM3,
        purifierCadrM3h: cadrM3h,
        indoorSourceUgPerHour: SOURCE_RATE_MAP[sourceKey],
      }),
    [outdoorPm25, windowsOpen, roomVolumeM3, cadrM3h, sourceKey],
  );

  const familyDoseSaved12h = useMemo(() => {
    const deltaC = Math.max(0, simulation.baselineIndoorPm25 - simulation.indoorPm25);
    return Math.round(
      profile.members.reduce(
        (sum, member) =>
          sum + calculateInhaledDoseUg(deltaC, member.ageGroup, 'light', 12),
        0,
      ),
    );
  }, [profile.members, simulation.baselineIndoorPm25, simulation.indoorPm25]);

  return (
    <section className="card" aria-labelledby="indoor-lab-heading">
      <h2 id="indoor-lab-heading">{t.lab.title}</h2>
      <p className="meta-line">{t.lab.subtitle}</p>
      <p className="meta-line">
        {t.lab.outdoorRef}: <strong>{outdoorPm25.toFixed(1)} µg/m³</strong>
      </p>

      <div className="lab-results-grid" aria-live="polite">
        <div className="metric-box">
          <span className="metric-label">{t.lab.estimatedIndoor}</span>
          <strong className="metric-value" data-testid="lab-indoor-pm25">
            {String(simulation.indoorPm25)} µg/m³
          </strong>
          <span className="meta-line">
            −{String(simulation.reductionPercent)}% vs baseline
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">{t.lab.baselineIndoor}</span>
          <strong className="metric-value">
            {String(simulation.baselineIndoorPm25)} µg/m³
          </strong>
        </div>

        <div className="metric-box">
          <span className="metric-label">{t.lab.doseSaved}</span>
          <strong className="metric-value" data-testid="lab-dose-saved">
            {String(familyDoseSaved12h)} µg
          </strong>
        </div>
      </div>

      <div className="lab-controls">
        <div className="field-group">
          <label className="field-label" htmlFor="lab-room-slider">
            {t.lab.roomSizeLabel}: <strong>{String(roomVolumeM3)} m³</strong>
          </label>
          <input
            id="lab-room-slider"
            type="range"
            min={25}
            max={250}
            step={5}
            className="range-input"
            value={roomVolumeM3}
            onChange={(e) => {
              setRoomVolumeM3(Number(e.target.value));
            }}
          />
        </div>

        <div className="field-group">
          <span className="field-label">{t.lab.windowsLabel}</span>
          <div className="chip-row">
            <button
              type="button"
              className={`chip-btn ${!windowsOpen ? 'chip-btn-active' : ''}`}
              aria-pressed={!windowsOpen}
              onClick={() => {
                setWindowsOpen(false);
              }}
            >
              {t.lab.windowsClosed}
            </button>
            <button
              type="button"
              className={`chip-btn ${windowsOpen ? 'chip-btn-active' : ''}`}
              aria-pressed={windowsOpen}
              onClick={() => {
                setWindowsOpen(true);
              }}
            >
              {t.lab.windowsOpen}
            </button>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="lab-cadr-slider">
            {t.lab.cadrLabel}: <strong>{String(cadrM3h)} m³/h</strong>
          </label>
          <input
            id="lab-cadr-slider"
            type="range"
            min={0}
            max={500}
            step={25}
            className="range-input"
            value={cadrM3h}
            onChange={(e) => {
              setCadrM3h(Number(e.target.value));
            }}
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="lab-source-select">
            {t.lab.sourceLabel}
          </label>
          <select
            id="lab-source-select"
            className="text-input"
            value={sourceKey}
            onChange={(e) => {
              setSourceKey(e.target.value as SourcePresetKey);
            }}
          >
            {(Object.keys(SOURCE_RATE_MAP) as SourcePresetKey[]).map((key) => (
              <option key={key} value={key}>
                {t.lab.sources[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details className="basis-details">
        <summary>{t.lab.assumptionsTitle}</summary>
        <p className="meta-line">
          P = {String(simulation.assumptions.penetrationFactor)}, a ={' '}
          {String(simulation.assumptions.airChangesPerHour)} h⁻¹, k ={' '}
          {String(simulation.assumptions.depositionRatePerHour)} h⁻¹, V ={' '}
          {String(simulation.assumptions.roomVolumeM3)} m³, CADR ={' '}
          {String(simulation.assumptions.purifierCadrM3h)} m³/h, S ={' '}
          {String(simulation.assumptions.indoorSourceUgPerHour)} µg/h.
        </p>
      </details>
    </section>
  );
}
