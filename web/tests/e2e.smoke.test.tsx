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

describe('End-to-end smoke test: onboarding through all 5 views', () => {
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

  it('completes onboarding, renders Today plan, updates Indoor Lab, Swaps, Hisaab, and Mohalla Mode', async () => {
    const forecast = makeForecast();
    const expectedProfile: FamilyProfile = {
      location: { label: 'Delhi, Delhi', lat: 28.65195, lon: 77.23149 },
      members: [
        {
          id: 'member-1',
          name: 'Meera',
          ageGroup: 'adult',
          healthFlags: ['asthma'],
          outdoorHoursPerDay: 1.5,
        },
      ],
      commuteMode: 'car',
      commuteKmRoundTrip: 15,
      cookingFuel: 'lpg',
      homeSize: 'medium_2bhk',
      purifierCadrM3h: 0,
      outdoorRoutine: 'Morning school run',
      language: 'en',
    };
    const fallbackPlan = buildFallbackPlan(expectedProfile, forecast);

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

    // 1. Onboarding: city search, member name, health flag, routine, save
    fireEvent.change(await screen.findByLabelText(/city or town/i), {
      target: { value: 'Delhi' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /delhi/i }));

    fireEvent.change(screen.getByLabelText(/first name or nickname/i), {
      target: { value: 'Meera' },
    });
    fireEvent.click(screen.getByRole('button', { name: /asthma/i }));
    fireEvent.change(screen.getByLabelText(/daily outdoor routine/i), {
      target: { value: 'Morning school run' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save & view smog day plan/i }));

    // 2. Today plan rendered
    await waitFor(() => {
      expect(screen.getByTestId('today-aqi-value')).toHaveTextContent('377');
    });
    expect(await screen.findByTestId('plan-summary')).toBeInTheDocument();

    // 3. Indoor Air Lab live engine update (no extra fetch)
    fireEvent.click(screen.getByRole('button', { name: /indoor lab/i }));
    const initialIndoor = await screen.findByTestId('lab-indoor-pm25');
    const beforeValue = initialIndoor.textContent;
    const cadrSlider = screen.getByLabelText(/air purifier cadr/i);
    fireEvent.change(cadrSlider, { target: { value: '300' } });
    expect(screen.getByTestId('lab-indoor-pm25').textContent).not.toBe(beforeValue);

    // 4. Swaps view
    fireEvent.click(screen.getByRole('button', { name: /^swaps$/i }));
    expect(await screen.findByText(/take metro instead of car/i)).toBeInTheDocument();

    // 5. The Hisaab two-column ledger
    fireEvent.click(screen.getByRole('button', { name: /the hisaab/i }));
    expect(await screen.findByTestId('hisaab-breathed-total')).toBeInTheDocument();
    expect(screen.getByTestId('hisaab-emitted-total')).toBeInTheDocument();

    // 6. Mohalla mode multiplier & WhatsApp link
    fireEvent.click(screen.getByRole('button', { name: /mohalla mode/i }));
    const whatsappLink = await screen.findByRole('link', {
      name: /share on whatsapp/i,
    });
    expect(whatsappLink).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/?text='),
    );
  });
});
