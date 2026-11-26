import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { loadConfig, type ServerConfig } from './config.js';
import { createAirRouter } from './routes/air.js';
import { createPlanRouter } from './routes/plan.js';
import { createPlanService, type GeminiClient } from './services/geminiPlanner.js';
import { createOpenMeteoService, UpstreamApiError } from './services/openMeteo.js';

export interface AppOptions {
  config?: Partial<ServerConfig>;
  webDistDir?: string;
  geminiClient?: GeminiClient;
}

export function createApp(options: AppOptions = {}): express.Express {
  const config: ServerConfig = {
    ...loadConfig(),
    ...options.config,
  };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  app.use(express.json({ limit: '64kb' }));

  // Baseline per-IP limit for every API route; /api/plan adds a stricter limit on top.
  app.use(
    '/api',
    rateLimit({
      windowMs: config.apiRateLimitWindowMs,
      limit: config.apiRateLimitMax,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many requests. Please slow down and try again shortly.' },
    }),
  );

  const openMeteo = createOpenMeteoService(config.airCacheTtlMs);
  const planService = createPlanService({
    geminiApiKey: config.geminiApiKey,
    geminiModel: config.geminiModel,
    geminiClient: options.geminiClient,
  });

  app.use('/api', createAirRouter(openMeteo));
  app.use(
    '/api',
    createPlanRouter(planService, {
      rateLimitWindowMs: config.planRateLimitWindowMs,
      rateLimitMax: config.planRateLimitMax,
    }),
  );

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // On Vercel the `web` service serves the frontend, so the API never serves static files.
  // Locally, look for web/dist relative to the repo root or the server workspace.
  const webDistDir =
    options.webDistDir ??
    (process.env['VERCEL']
      ? undefined
      : [
          path.resolve(process.cwd(), 'web/dist'),
          path.resolve(process.cwd(), '../web/dist'),
        ].find((dir) => existsSync(dir)));

  if (webDistDir && existsSync(webDistDir)) {
    app.use(express.static(webDistDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(webDistDir, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof UpstreamApiError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }

    if (
      typeof err === 'object' &&
      err !== null &&
      'type' in err &&
      (err as { type?: string }).type === 'entity.too.large'
    ) {
      res.status(400).json({ error: 'Request payload too large' });
      return;
    }

    if (
      err instanceof SyntaxError &&
      'status' in err &&
      (err as { status?: number }).status === 400
    ) {
      res.status(400).json({ error: 'Malformed JSON body' });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
