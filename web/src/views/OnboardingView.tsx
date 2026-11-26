import { useState, type SyntheticEvent } from 'react';
import type {
  AgeGroup,
  CommuteMode,
  CookingFuel,
  FamilyMember,
  FamilyProfile,
  HealthFlag,
  HomeSize,
} from '@hawahisaab/engine';
import { LocationPicker } from '../components/LocationPicker.js';
import { useI18n } from '../i18n/useI18n.js';
import { createDefaultDraftProfile } from '../state/storage.js';

interface OnboardingViewProps {
  initialProfile: FamilyProfile | null;
  saving: boolean;
  onSaveProfile: (profile: FamilyProfile) => void;
  onCancel?: () => void;
}

const AGE_GROUPS: readonly AgeGroup[] = [
  'child_under_5',
  'child_5_12',
  'teen',
  'adult',
  'elderly',
];

const HEALTH_FLAGS: readonly HealthFlag[] = ['none', 'asthma', 'heart', 'pregnancy'];

const COMMUTE_MODES: readonly CommuteMode[] = [
  'car',
  'two_wheeler',
  'auto',
  'metro',
  'bus',
  'walk_cycle',
  'wfh',
];

const COOKING_FUELS: readonly CookingFuel[] = ['lpg', 'png', 'induction', 'biomass'];

const HOME_SIZES: readonly HomeSize[] = ['small_1bhk', 'medium_2bhk', 'large_3bhk'];

const MAX_FREE_TEXT_BYTES = 2048;

function measureUtf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

export default function OnboardingView({
  initialProfile,
  saving,
  onSaveProfile,
  onCancel,
}: OnboardingViewProps) {
  const { t, language } = useI18n();
  const [draft, setDraft] = useState<FamilyProfile>(() => {
    const base = initialProfile ?? createDefaultDraftProfile();
    return {
      ...base,
      members: base.members.map((m) => ({ ...m, healthFlags: [...m.healthFlags] })),
      language,
    };
  });
  const [error, setError] = useState<string | null>(null);

  const combinedFreeText = [
    draft.location.label,
    draft.outdoorRoutine,
    draft.members.map((m) => m.name.trim()).join(' '),
  ].join('\n');
  const usedBytes = measureUtf8Bytes(combinedFreeText);

  function updateMember(index: number, patch: Partial<FamilyMember>) {
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((member, i) =>
        i === index ? { ...member, ...patch } : member,
      ),
    }));
  }

  function toggleHealthFlag(index: number, flag: HealthFlag) {
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((member, i) => {
        if (i !== index) return member;
        if (flag === 'none') {
          return { ...member, healthFlags: ['none'] };
        }
        const withoutNone = member.healthFlags.filter((f) => f !== 'none');
        const exists = withoutNone.includes(flag);
        const next = exists
          ? withoutNone.filter((f) => f !== flag)
          : [...withoutNone, flag];
        return { ...member, healthFlags: next.length > 0 ? next : ['none'] };
      }),
    }));
  }

  function addMember() {
    if (draft.members.length >= 10) return;
    const nextNum = draft.members.length + 1;
    setDraft((prev) => ({
      ...prev,
      members: [
        ...prev.members,
        {
          id: `member-${String(Date.now())}-${String(nextNum)}`,
          name: '',
          ageGroup: 'adult',
          healthFlags: ['none'],
          outdoorHoursPerDay: 1,
        },
      ],
    }));
  }

  function removeMember(index: number) {
    if (draft.members.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.location.label) {
      setError(t.onboarding.validationMissingLocation);
      return;
    }

    const cleanedMembers = draft.members.map((m) => ({
      ...m,
      name: m.name.trim(),
    }));
    if (cleanedMembers.some((m) => m.name.length === 0)) {
      setError(t.onboarding.validationMissingMember);
      return;
    }

    if (usedBytes > MAX_FREE_TEXT_BYTES) {
      setError(t.onboarding.freeTextTooLong);
      return;
    }

    setError(null);
    onSaveProfile({
      ...draft,
      members: cleanedMembers,
      language,
    });
  }

  return (
    <section className="card" aria-labelledby="onboarding-title">
      <h2 id="onboarding-title">{t.onboarding.title}</h2>
      <p className="meta-line">{t.onboarding.subtitle}</p>

      <div className="section-block">
        <h3>{t.location.heading}</h3>
        <LocationPicker
          selectedLocation={draft.location.label ? draft.location : null}
          onSelectLocation={(loc) => {
            setDraft((prev) => ({ ...prev, location: loc }));
          }}
        />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="section-block">
          <h3>{t.onboarding.stepMembers}</h3>
          {draft.members.map((member, index) => (
            <fieldset key={member.id} className="member-fieldset">
              <legend>
                {t.onboarding.memberName} #{String(index + 1)}
              </legend>

              <div className="grid-two">
                <div>
                  <label className="field-label" htmlFor={`member-name-${member.id}`}>
                    {t.onboarding.memberName}
                  </label>
                  <input
                    id={`member-name-${member.id}`}
                    type="text"
                    className="text-input"
                    placeholder={t.onboarding.memberNamePlaceholder}
                    value={member.name}
                    maxLength={80}
                    onChange={(e) => {
                      updateMember(index, { name: e.target.value });
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor={`member-age-${member.id}`}>
                    {t.onboarding.ageGroup}
                  </label>
                  <select
                    id={`member-age-${member.id}`}
                    className="text-input"
                    value={member.ageGroup}
                    onChange={(e) => {
                      updateMember(index, {
                        ageGroup: e.target.value as AgeGroup,
                      });
                    }}
                  >
                    {AGE_GROUPS.map((group) => (
                      <option key={group} value={group}>
                        {t.ageGroups[group]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field-group">
                <span className="field-label">{t.onboarding.healthConditions}</span>
                <div className="chip-row">
                  {HEALTH_FLAGS.map((flag) => {
                    const active = member.healthFlags.includes(flag);
                    return (
                      <button
                        key={flag}
                        type="button"
                        className={`chip-btn ${active ? 'chip-btn-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => {
                          toggleHealthFlag(index, flag);
                        }}
                      >
                        {t.healthFlags[flag]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid-two-align">
                <div>
                  <label className="field-label" htmlFor={`member-hours-${member.id}`}>
                    {t.onboarding.outdoorHours} ({String(member.outdoorHoursPerDay)}h)
                  </label>
                  <input
                    id={`member-hours-${member.id}`}
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={member.outdoorHoursPerDay}
                    onChange={(e) => {
                      updateMember(index, {
                        outdoorHoursPerDay: Number(e.target.value),
                      });
                    }}
                    className="range-input"
                  />
                </div>

                {draft.members.length > 1 ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      removeMember(index);
                    }}
                  >
                    {t.onboarding.removeMember}
                  </button>
                ) : null}
              </div>
            </fieldset>
          ))}

          <button type="button" className="btn btn-secondary" onClick={addMember}>
            + {t.onboarding.addMember}
          </button>
        </div>

        <div className="section-block">
          <h3>{t.onboarding.stepLifestyle}</h3>

          <div className="grid-two">
            <div>
              <label className="field-label" htmlFor="commute-mode-select">
                {t.onboarding.commuteMode}
              </label>
              <select
                id="commute-mode-select"
                className="text-input"
                value={draft.commuteMode}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    commuteMode: e.target.value as CommuteMode,
                  }));
                }}
              >
                {COMMUTE_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t.commuteModes[mode]}
                  </option>
                ))}
              </select>
            </div>

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
                  setDraft((prev) => ({
                    ...prev,
                    commuteKmRoundTrip: Math.max(0, Number(e.target.value) || 0),
                  }));
                }}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="cooking-fuel-select">
                {t.onboarding.cookingFuel}
              </label>
              <select
                id="cooking-fuel-select"
                className="text-input"
                value={draft.cookingFuel}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    cookingFuel: e.target.value as CookingFuel,
                  }));
                }}
              >
                {COOKING_FUELS.map((fuel) => (
                  <option key={fuel} value={fuel}>
                    {t.cookingFuels[fuel]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="home-size-select">
                {t.onboarding.homeSize}
              </label>
              <select
                id="home-size-select"
                className="text-input"
                value={draft.homeSize}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    homeSize: e.target.value as HomeSize,
                  }));
                }}
              >
                {HOME_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {t.homeSizes[size]}
                  </option>
                ))}
              </select>
            </div>
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
                setDraft((prev) => ({
                  ...prev,
                  purifierCadrM3h: Math.max(0, Number(e.target.value) || 0),
                }));
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
                setDraft((prev) => ({ ...prev, outdoorRoutine: e.target.value }));
              }}
            />
            <p className="meta-line">
              {t.onboarding.freeTextCounter}: {String(usedBytes)} /{' '}
              {String(MAX_FREE_TEXT_BYTES)} B
            </p>
          </div>
        </div>

        {error ? (
          <p className="status-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="action-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t.onboarding.saving : t.onboarding.saveAndGenerate}
          </button>
          {onCancel ? (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              ← {t.nav.today}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
