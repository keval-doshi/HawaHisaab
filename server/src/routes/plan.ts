import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { planRequestSchema } from '../schemas.js';
import type { PlanService } from '../services/geminiPlanner.js';

export interface PlanRouterOptions {
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

export function createPlanRouter(
  planService: PlanService,
  options: PlanRouterOptions,
): Router {
  const router = Router();

  const limiter = rateLimit({
    windowMs: options.rateLimitWindowMs,
    limit: options.rateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: 'Too many plan requests. Please wait a few minutes and try again.',
    },
  });

  router.post('/plan', limiter, async (req, res, next) => {
    const parsed = planRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid plan request payload',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    try {
      const plan = await planService.generatePlan(
        parsed.data.profile,
        parsed.data.forecast,
      );
      res.json(plan);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
