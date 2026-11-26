import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('API-wide rate limiting', () => {
  it('returns 429 with a JSON error once the per-IP API limit is exceeded', async () => {
    const app = createApp({
      config: {
        apiRateLimitMax: 2,
        apiRateLimitWindowMs: 60_000,
      },
    });

    // Invalid queries are rejected before any upstream call, so no network is needed.
    const r1 = await request(app).get('/api/geocode');
    const r2 = await request(app).get('/api/air');
    const r3 = await request(app).get('/api/geocode');

    expect(r1.status).toBe(400);
    expect(r2.status).toBe(400);
    expect(r3.status).toBe(429);
    expect((r3.body as { error?: string }).error).toMatch(/too many requests/i);
    expect(r3.headers['ratelimit-policy']).toBeDefined();
  });

  it('does not rate limit non-API routes', async () => {
    const app = createApp({
      config: { apiRateLimitMax: 1, apiRateLimitWindowMs: 60_000 },
      webDistDir: '/nonexistent',
    });

    await request(app).get('/api/geocode');
    const limited = await request(app).get('/api/geocode');
    const page = await request(app).get('/');

    expect(limited.status).toBe(429);
    expect(page.status).not.toBe(429);
  });
});
