import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFallbackPlan,
  type AirForecastResponse,
  type FamilyProfile,
} from '@hawahisaab/engine';
import { App } from '../src/App.js';

function makeForecast(): AirForecastResponse {
  const hourly = Array.from({ length: 48 }, (_, i) => {
    const day = i < 24 ? '2026-11-26' : '2026-11-27';
    const hour = i % 24;
    const isClean = hour >= 13 && hour <= 15;
    return {
      time: `${day}T${String(hour).padStart(2, '0')}:00`,
      pm2_5: isClean ? 85 : 220,
      pm10: isClean ? 130 : 310,
    };
  });

  return {
    location: {
      lat: 28.65,
      lon: 77.23,
      timezone: 'Asia/Kolkata',
      timezoneAbbreviation: 'IST',
    },
    fetchedAt: '2026-11-26T05:00:00.000Z',
    current: { time: '2026-11-26T08:00', pm2_5: 220, pm10: 310 },
    hourly,
  };
}

describe('HawaHisaab web UI flows', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('completes onboarding with city search, shows Today AQI + plan, and toggles Hindi lang', async () => {
    const forecast = makeForecast();
    const sampleProfile: FamilyProfile = {
      location: { label: 'Delhi, Delhi', lat: 28.65195, lon: 77.23149 },
      members: [
        {
          id: 'member-1',
          name: 'Aarav',
          ageGroup: 'adult',
          healthFlags: ['none'],
          outdoorHoursPerDay: 1.5,
        },
      ],
      commuteMode: 'car',
      commuteKmRoundTrip: 15,
      cookingFuel: 'lpg',
      homeSize: 'medium_2bhk',
      purifierCadrM3h: 0,
      outdoorRoutine: '',
      language: 'en',
    };
    const fallbackPlan = buildFallbackPlan(sampleProfile, forecast);

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                id: 1273294,
                name: 'Delhi',
                state: 'Delhi',
                countryCode: 'IN',
                lat: 28.65195,
                lon: 77.23149,
                population: 10927986,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(forecast), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValue(
        new Response(JSON.stringify(fallbackPlan), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    render(<App />);

    // Search and pick city
    const cityInput = await screen.findByLabelText(/city or town/i);
    fireEvent.change(cityInput, { target: { value: 'Delhi' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    const cityResult = await screen.findByRole('button', { name: /delhi/i });
    fireEvent.click(cityResult);

    // Fill member name and save
    const nameInput = screen.getByLabelText(/first name or nickname/i);
    fireEvent.change(nameInput, { target: { value: 'Aarav' } });
    fireEvent.click(screen.getByRole('button', { name: /save & view smog day plan/i }));

    await waitFor(() => {
      expect(screen.getByTestId('today-aqi-value')).toHaveTextContent('377');
    });
    expect(await screen.findByTestId('plan-summary')).toBeInTheDocument();

    // Toggle language to Hindi and verify <html lang="hi">
    fireEvent.click(screen.getByRole('button', { name: /switch language to hindi/i }));
    expect(document.documentElement.lang).toBe('hi');
  });
});
