import type { SmogDayPlan } from '@hawahisaab/engine';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { GeminiClient } from '../src/services/geminiPlanner.js';

function makePlanRequestBody(overrides?: {
  language?: 'en' | 'hi';
  outdoorRoutine?: string;
}) {
  const hourly = Array.from({ length: 48 }, (_, i) => {
    const day = i < 24 ? '2026-11-26' : '2026-11-27';
    const hour = i % 24;
    const isClean = hour >= 13 && hour <= 15;
    return {
      time: `${day}T${String(hour).padStart(2, '0')}:00`,
      pm2_5: isClean ? 85 : 220,
      pm10: isClean ? 140 : 310,
    };
  });

  return {
    profile: {
      location: { label: 'Delhi', lat: 28.6139, lon: 77.209 },
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
      outdoorRoutine: overrides?.outdoorRoutine ?? 'School run at 8am and park visit',
      language: overrides?.language ?? 'en',
    },
    forecast: {
      location: {
        lat: 28.6139,
        lon: 77.209,
        timezone: 'Asia/Kolkata',
        timezoneAbbreviation: 'IST',
      },
      fetchedAt: '2026-11-26T05:00:00.000Z',
      current: { time: '2026-11-26T08:00', pm2_5: 220, pm10: 310 },
      hourly,
    },
  };
}

describe('POST /api/plan', () => {
  it('calls engine first, calls Gemini once with DATA block, and attaches engine numbers by id', async () => {
    const generatePlanJson = vi.fn<GeminiClient['generatePlanJson']>().mockResolvedValue(
      JSON.stringify({
        summary:
          'Today AQI is 377 (Very Poor), so shift outdoor errands to 13:00-15:00. Your household saves significant PM2.5 and CO2 with indoor sealing and Metro travel.',
        items: [
          {
            id: 'm1',
            time: '13:00-15:00',
            member: 'Dadi',
            action: 'Stay indoors at 08:00 and take a short walk at 13:00-15:00.',
            lowEmissionTip: 'Avoid burning dry leaves near the veranda.',
            why: 'Heart protection during peak winter smog hours.',
          },
          {
            id: 'm2',
            time: '08:00 & 13:00-15:00',
            member: 'Aarav',
            action:
              'Wear an N95 mask on the school run; play outdoors only at 13:00-15:00.',
            lowEmissionTip: 'Share a school carpool or take Metro.',
            why: 'Asthma care during high PM2.5.',
          },
        ],
        indoorHacks: [
          {
            id: 'hack-windows',
            hack: 'Keep windows closed during morning peak and run the purifier.',
            why: 'Cuts indoor infiltration sharply.',
          },
          {
            id: 'hack-cooking',
            hack: 'Use the pressure cooker or induction instead of frying.',
            why: 'Avoids indoor cooking particulate spikes.',
          },
        ],
        swaps: [
          { swapId: 'car_to_metro', why: 'Cuts 18 km solo car tailpipe emissions.' },
          {
            swapId: 'leaves_to_compost',
            why: 'Stops open leaf smoke in the neighbourhood.',
          },
        ],
      }),
    );

    const geminiMock: GeminiClient = { generatePlanJson };

    const app = createApp({ geminiClient: geminiMock });
    const res = await request(app).post('/api/plan').send(makePlanRequestBody());

    expect(res.status).toBe(200);
    const body = res.body as SmogDayPlan;
    expect(body.source).toBe('gemini');
    expect(body.aqi.aqi).toBe(377);
    expect(body.items).toHaveLength(2);
    expect(body.items[0]?.breathedLessUg).toBe(body.ledger.members[0]?.breathedLessUg);
    expect(body.items[1]?.breathedLessUg).toBe(body.ledger.members[1]?.breathedLessUg);
    expect(body.indoorHacks[0]?.estimatedIndoorPm25).toBeGreaterThan(0);
    expect(body.swaps[0]?.emittedLessKgCO2).toBe(2.52);

    expect(generatePlanJson).toHaveBeenCalledTimes(1);
    const callArg = generatePlanJson.mock.calls[0]?.[0];
    expect(callArg?.prompt).toContain('<<<DATA');
    expect(callArg?.prompt).toContain('<<<USER_PROFILE_DATA');
    expect(callArg?.systemInstruction).toContain('Use ONLY numbers from the DATA block');
  });

  it('falls back to rule-based engine plan when Gemini throws', async () => {
    const failingGemini: GeminiClient = {
      generatePlanJson: vi.fn().mockRejectedValue(new Error('Gemini quota exceeded')),
    };

    const app = createApp({ geminiClient: failingGemini });
    const res = await request(app)
      .post('/api/plan')
      .send(makePlanRequestBody({ language: 'hi' }));

    expect(res.status).toBe(200);
    const body = res.body as SmogDayPlan;
    expect(body.source).toBe('fallback');
    expect(body.language).toBe('hi');
    expect(body.items).toHaveLength(2);
    expect(body.ledger.totalBreathedLessUg).toBeGreaterThan(0);
  });

  it('falls back to rule-based engine plan when Gemini returns invalid schema', async () => {
    const badSchemaGemini: GeminiClient = {
      generatePlanJson: vi.fn().mockResolvedValue(
        JSON.stringify({
          summary: 'Too short',
          items: [],
          indoorHacks: [],
          swaps: [{ swapId: 'invented_swap', why: 'nope' }],
        }),
      ),
    };

    const app = createApp({ geminiClient: badSchemaGemini });
    const res = await request(app).post('/api/plan').send(makePlanRequestBody());

    expect(res.status).toBe(200);
    const body = res.body as SmogDayPlan;
    expect(body.source).toBe('fallback');
    expect(body.items.length).toBeGreaterThan(0);
  });

  it('rejects requests whose combined free text exceeds 2 kB with 400', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/plan')
      .send(makePlanRequestBody({ outdoorRoutine: 'a'.repeat(2100) }));

    expect(res.status).toBe(400);
    const errBody = res.body as { error?: string };
    expect(errBody.error).toBe('Invalid plan request payload');
  });

  it('enforces rate limiting on POST /api/plan', async () => {
    const app = createApp({
      config: {
        planRateLimitMax: 2,
        planRateLimitWindowMs: 60_000,
      },
    });

    const payload = makePlanRequestBody();
    const r1 = await request(app).post('/api/plan').send(payload);
    const r2 = await request(app).post('/api/plan').send(payload);
    const r3 = await request(app).post('/api/plan').send(payload);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);
  });

  it('returns 400 without stack trace for >64 kB payload or malformed JSON and 404 for unknown API routes', async () => {
    const app = createApp();

    const hugePayload = { data: 'x'.repeat(70_000) };
    const oversize = await request(app).post('/api/plan').send(hugePayload);
    expect(oversize.status).toBe(400);
    expect((oversize.body as { stack?: string }).stack).toBeUndefined();

    const malformed = await request(app)
      .post('/api/plan')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(malformed.status).toBe(400);
    expect((malformed.body as { stack?: string }).stack).toBeUndefined();

    const unknown = await request(app).get('/api/unknown-route');
    expect(unknown.status).toBe(404);
    expect((unknown.body as { stack?: string }).stack).toBeUndefined();
  });
});
