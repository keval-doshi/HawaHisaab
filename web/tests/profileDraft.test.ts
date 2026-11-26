import type { FamilyProfile } from '@hawahisaab/engine';
import { describe, expect, it } from 'vitest';
import {
  freeTextBytes,
  MAX_FREE_TEXT_BYTES,
  toggleHealthFlag,
  validateProfileDraft,
} from '../src/state/profileDraft.js';

function makeDraft(overrides: Partial<FamilyProfile> = {}): FamilyProfile {
  return {
    location: { label: 'Delhi', lat: 28.61, lon: 77.21 },
    members: [
      {
        id: 'm1',
        name: 'Aarav',
        ageGroup: 'child_5_12',
        healthFlags: ['none'],
        outdoorHoursPerDay: 2,
      },
    ],
    commuteMode: 'car',
    commuteKmRoundTrip: 15,
    cookingFuel: 'lpg',
    homeSize: 'medium_2bhk',
    purifierCadrM3h: 0,
    outdoorRoutine: '',
    language: 'en',
    ...overrides,
  };
}

describe('toggleHealthFlag', () => {
  it('replaces "none" when a condition is chosen', () => {
    expect(toggleHealthFlag(['none'], 'asthma')).toEqual(['asthma']);
  });

  it('adds and removes conditions independently', () => {
    expect(toggleHealthFlag(['asthma'], 'heart')).toEqual(['asthma', 'heart']);
    expect(toggleHealthFlag(['asthma', 'heart'], 'asthma')).toEqual(['heart']);
  });

  it('falls back to "none" when the last condition is removed', () => {
    expect(toggleHealthFlag(['asthma'], 'asthma')).toEqual(['none']);
  });

  it('treats "none" as exclusive', () => {
    expect(toggleHealthFlag(['asthma', 'pregnancy'], 'none')).toEqual(['none']);
  });
});

describe('freeTextBytes', () => {
  it('counts UTF-8 bytes, so Devanagari uses more than one byte per character', () => {
    const ascii = freeTextBytes(makeDraft({ outdoorRoutine: 'walk' }));
    const hindi = freeTextBytes(makeDraft({ outdoorRoutine: 'सैर' }));
    expect(hindi - ascii).toBeGreaterThan('सैर'.length - 'walk'.length);
  });
});

describe('validateProfileDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateProfileDraft(makeDraft())).toBeNull();
  });

  it('requires a location', () => {
    expect(
      validateProfileDraft(makeDraft({ location: { label: '', lat: 0, lon: 0 } })),
    ).toBe('missingLocation');
  });

  it('requires every member to have a non-blank name', () => {
    const draft = makeDraft();
    const blankName = {
      ...draft,
      members: draft.members.map((member) => ({ ...member, name: '   ' })),
    };
    expect(validateProfileDraft(blankName)).toBe('missingMemberName');
  });

  it('rejects free text over the server limit', () => {
    expect(
      validateProfileDraft(
        makeDraft({ outdoorRoutine: 'a'.repeat(MAX_FREE_TEXT_BYTES) }),
      ),
    ).toBe('freeTextTooLong');
  });
});
