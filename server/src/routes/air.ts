import { Router } from 'express';
import { airQuerySchema, geocodeQuerySchema } from '../schemas.js';
import type { OpenMeteoService } from '../services/openMeteo.js';

export function createAirRouter(openMeteo: OpenMeteoService): Router {
  const router = Router();

  router.get('/air', async (req, res, next) => {
    const parsed = airQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    try {
      const forecast = await openMeteo.getAirQuality(parsed.data.lat, parsed.data.lon);
      res.json(forecast);
    } catch (error) {
      next(error);
    }
  });

  router.get('/geocode', async (req, res, next) => {
    const parsed = geocodeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid search query',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    try {
      const results = await openMeteo.searchIndiaCities(parsed.data.q);
      res.json({ results });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
