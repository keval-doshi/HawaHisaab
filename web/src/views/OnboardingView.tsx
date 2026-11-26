import { useState, type SyntheticEvent } from 'react';
import type { FamilyMember, FamilyProfile } from '@hawahisaab/engine';
import { LocationPicker } from '../components/LocationPicker.js';
import { useI18n } from '../i18n/useI18n.js';
import {
  createMember,
  freeTextBytes,
  MAX_MEMBERS,
  validateProfileDraft,
  type ProfileValidationError,
} from '../state/profileDraft.js';
import { createDefaultDraftProfile } from '../state/storage.js';
import { HouseholdFields } from './onboarding/HouseholdFields.js';
import { MemberFieldset } from './onboarding/MemberFieldset.js';

interface OnboardingViewProps {
  initialProfile: FamilyProfile | null;
  saving: boolean;
  onSaveProfile: (profile: FamilyProfile) => void;
  onCancel?: () => void;
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

  const validationMessages: Record<ProfileValidationError, string> = {
    missingLocation: t.onboarding.validationMissingLocation,
    missingMemberName: t.onboarding.validationMissingMember,
    freeTextTooLong: t.onboarding.freeTextTooLong,
  };

  function updateDraft(patch: Partial<FamilyProfile>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function updateMember(index: number, patch: Partial<FamilyMember>) {
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((member, i) =>
        i === index ? { ...member, ...patch } : member,
      ),
    }));
  }

  function addMember() {
    setDraft((prev) =>
      prev.members.length >= MAX_MEMBERS
        ? prev
        : { ...prev, members: [...prev.members, createMember(prev.members.length + 1)] },
    );
  }

  function removeMember(index: number) {
    setDraft((prev) =>
      prev.members.length <= 1
        ? prev
        : { ...prev, members: prev.members.filter((_, i) => i !== index) },
    );
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const problem = validateProfileDraft(draft);
    if (problem) {
      setError(validationMessages[problem]);
      return;
    }

    setError(null);
    onSaveProfile({
      ...draft,
      members: draft.members.map((m) => ({ ...m, name: m.name.trim() })),
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
          onSelectLocation={(location) => {
            updateDraft({ location });
          }}
        />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="section-block">
          <h3>{t.onboarding.stepMembers}</h3>
          {draft.members.map((member, index) => (
            <MemberFieldset
              key={member.id}
              member={member}
              position={index + 1}
              onChange={(patch) => {
                updateMember(index, patch);
              }}
              onRemove={
                draft.members.length > 1
                  ? () => {
                      removeMember(index);
                    }
                  : undefined
              }
            />
          ))}

          <button type="button" className="btn btn-secondary" onClick={addMember}>
            + {t.onboarding.addMember}
          </button>
        </div>

        <HouseholdFields
          draft={draft}
          usedFreeTextBytes={freeTextBytes(draft)}
          onChange={updateDraft}
        />

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
