import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import {
  buildFallbackPlan,
  type AirForecastResponse,
  type FamilyProfile,
} from '@hawahisaab/engine';
import { I18nProvider } from '../src/i18n/useI18n.js';
import HisaabView from '../src/views/HisaabView.js';
import IndoorLabView from '../src/views/IndoorLabView.js';
import MohallaView from '../src/views/MohallaView.js';
import OnboardingView from '../src/views/OnboardingView.js';
import SwapsView from '../src/views/SwapsView.js';
import TodayView from '../src/views/TodayView.js';

function makeFixture() {
  const profile: FamilyProfile = {
    location: { label: 'Delhi, Delhi', lat: 28.6139, lon: 77.209 },
    members: [
      {
        id: 'm1',
        name: 'Dadi',
        ageGroup: 'elderly',
        healthFlags: ['heart'],
        outdoorHoursPerDay: 1,
      },
      {
        id: 'm2',
        name: 'Aarav',
        ageGroup: 'child_5_12',
        healthFlags: ['asthma'],
        outdoorHoursPerDay: 1.5,
      },
    ],
    commuteMode: 'car',
    commuteKmRoundTrip: 18,
    cookingFuel: 'lpg',
    homeSize: 'medium_2bhk',
    purifierCadrM3h: 220,
    outdoorRoutine: 'School run and evening walk',
    language: 'en',
  };

  const hourly = Array.from({ length: 48 }, (_, i) => {
    const day = i < 24 ? '2026-11-26' : '2026-11-27';
    const hour = i % 24;
    const isClean = hour >= 13 && hour <= 15;
    return {
      time: `${day}T${String(hour).padStart(2, '0')}:00`,
      pm2_5: isClean ? 85 : 220,
      pm10: isClean ? 135 : 310,
    };
  });

  const forecast: AirForecastResponse = {
    location: {
      lat: 28.6139,
      lon: 77.209,
      timezone: 'Asia/Kolkata',
      timezoneAbbreviation: 'IST',
    },
    fetchedAt: '2026-11-26T05:00:00.000Z',
    current: hourly[8] ?? { time: '2026-11-26T08:00', pm2_5: 220, pm10: 310 },
    hourly,
  };

  const plan = buildFallbackPlan(profile, forecast);
  return { profile, forecast, plan };
}

async function assertNoA11yViolations(container: HTMLElement) {
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
}

describe('WCAG accessibility audit across all views', () => {
  const { profile, forecast, plan } = makeFixture();

  it('has zero axe violations on OnboardingView', async () => {
    const { container } = render(
      <I18nProvider language="en" setLanguage={() => undefined}>
        <main>
          <h1>HawaHisaab</h1>
          <OnboardingView
            initialProfile={profile}
            saving={false}
            onSaveProfile={() => undefined}
          />
        </main>
      </I18nProvider>,
    );
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    await assertNoA11yViolations(container);
  });

  it('has zero axe violations on TodayView, IndoorLabView, SwapsView, HisaabView, and MohallaView', async () => {
    const views = [
      <TodayView
        key="today"
        profile={profile}
        forecast={forecast}
        aqi={plan.aqi}
        cleanWindows={plan.cleanWindows}
        plan={plan}
        loadingAir={false}
        loadingPlan={false}
        error={null}
        onRefreshPlan={() => undefined}
      />,
      <IndoorLabView key="lab" profile={profile} outdoorPm25={220} />,
      <SwapsView
        key="swaps"
        profile={profile}
        outdoorPm25={220}
        selectedSwapIds={['car_to_metro']}
        onToggleSwap={() => undefined}
      />,
      <HisaabView key="hisaab" ledger={plan.ledger} />,
      <MohallaView
        key="mohalla"
        profile={profile}
        aqi={plan.aqi}
        cleanWindows={plan.cleanWindows}
        ledger={plan.ledger}
      />,
    ];

    for (const view of views) {
      const { container, unmount } = render(
        <I18nProvider language="en" setLanguage={() => undefined}>
          <main>
            <h1>HawaHisaab</h1>
            {view}
          </main>
        </I18nProvider>,
      );
      await assertNoA11yViolations(container);
      unmount();
    }
  });
});
