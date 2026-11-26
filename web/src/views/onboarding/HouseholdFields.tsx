import type { FamilyProfile } from '@hawahisaab/engine';
import { SelectField } from '../../components/SelectField.js';
import { useI18n } from '../../i18n/useI18n.js';
import {
  COMMUTE_MODES,
  COOKING_FUELS,
  HOME_SIZES,
  MAX_FREE_TEXT_BYTES,
} from '../../state/profileDraft.js';

interface HouseholdFieldsProps {
  draft: FamilyProfile;
  usedFreeTextBytes: number;
  onChange: (patch: Partial<FamilyProfile>) => void;
}

/** Parses a non-negative number input, treating blank or invalid entries as 0. */
function toNonNegative(value: string): number {
  return Math.max(0, Number(value) || 0);
}

/** Commute, cooking, home, purifier and daily-routine details for the household. */
export function HouseholdFields({
  draft,
  usedFreeTextBytes,
  onChange,
}: HouseholdFieldsProps) {
  const { t } = useI18n();

  return (
    <div className="section-block">
      <h3>{t.onboarding.stepLifestyle}</h3>

      <div className="grid-two">
        <SelectField
          id="commute-mode-select"
          label={t.onboarding.commuteMode}
          value={draft.commuteMode}
          options={COMMUTE_MODES}
          optionLabels={t.commuteModes}
          onChange={(commuteMode) => {
            onChange({ commuteMode });
          }}
        />

        <div>
          <label className="field-label" htmlFor="commute-km-input">
            {t.onboarding.commuteKm}
          </label>
          <input
            id="commute-km-input"
            type="number"
            min={0}
            max={200}
            step={1}
            className="text-input"
            value={draft.commuteKmRoundTrip}
            onChange={(e) => {
              onChange({ commuteKmRoundTrip: toNonNegative(e.target.value) });
            }}
          />
        </div>

        <SelectField
          id="cooking-fuel-select"
          label={t.onboarding.cookingFuel}
          value={draft.cookingFuel}
          options={COOKING_FUELS}
          optionLabels={t.cookingFuels}
          onChange={(cookingFuel) => {
            onChange({ cookingFuel });
          }}
        />

        <SelectField
          id="home-size-select"
          label={t.onboarding.homeSize}
          value={draft.homeSize}
          options={HOME_SIZES}
          optionLabels={t.homeSizes}
          onChange={(homeSize) => {
            onChange({ homeSize });
          }}
        />
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="purifier-cadr-input">
          {t.onboarding.purifierCadr}
        </label>
        <input
          id="purifier-cadr-input"
          type="number"
          min={0}
          max={1500}
          step={10}
          className="text-input"
          value={draft.purifierCadrM3h}
          onChange={(e) => {
            onChange({ purifierCadrM3h: toNonNegative(e.target.value) });
          }}
        />
        <p className="meta-line">{t.onboarding.purifierNoneHint}</p>
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor="outdoor-routine-input">
          {t.onboarding.routineLabel}
        </label>
        <textarea
          id="outdoor-routine-input"
          rows={3}
          className="text-input textarea-input"
          placeholder={t.onboarding.routinePlaceholder}
          value={draft.outdoorRoutine}
          onChange={(e) => {
            onChange({ outdoorRoutine: e.target.value });
          }}
        />
        <p className="meta-line">
          {t.onboarding.freeTextCounter}: {String(usedFreeTextBytes)} /{' '}
          {String(MAX_FREE_TEXT_BYTES)} B
        </p>
      </div>
    </div>
  );
}
