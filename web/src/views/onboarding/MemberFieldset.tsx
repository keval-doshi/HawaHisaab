import type { FamilyMember } from '@hawahisaab/engine';
import { SelectField } from '../../components/SelectField.js';
import { useI18n } from '../../i18n/useI18n.js';
import {
  AGE_GROUPS,
  HEALTH_FLAGS,
  MAX_MEMBER_NAME_LENGTH,
  toggleHealthFlag,
} from '../../state/profileDraft.js';

interface MemberFieldsetProps {
  member: FamilyMember;
  position: number;
  onChange: (patch: Partial<FamilyMember>) => void;
  /** Omitted when the member cannot be removed (the household needs at least one). */
  onRemove?: () => void;
}

/** Name, age group, health conditions and outdoor hours for one family member. */
export function MemberFieldset({
  member,
  position,
  onChange,
  onRemove,
}: MemberFieldsetProps) {
  const { t } = useI18n();

  return (
    <fieldset className="member-fieldset">
      <legend>
        {t.onboarding.memberName} #{String(position)}
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
            maxLength={MAX_MEMBER_NAME_LENGTH}
            onChange={(e) => {
              onChange({ name: e.target.value });
            }}
            required
          />
        </div>

        <SelectField
          id={`member-age-${member.id}`}
          label={t.onboarding.ageGroup}
          value={member.ageGroup}
          options={AGE_GROUPS}
          optionLabels={t.ageGroups}
          onChange={(ageGroup) => {
            onChange({ ageGroup });
          }}
        />
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
                  onChange({ healthFlags: toggleHealthFlag(member.healthFlags, flag) });
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
              onChange({ outdoorHoursPerDay: Number(e.target.value) });
            }}
            className="range-input"
          />
        </div>

        {onRemove ? (
          <button type="button" className="btn btn-secondary" onClick={onRemove}>
            {t.onboarding.removeMember}
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
