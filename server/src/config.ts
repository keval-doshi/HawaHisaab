const DEFAULT_PORT = 8080;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const DEFAULT_PLAN_RATE_LIMIT = 20;
const DEFAULT_API_RATE_LIMIT = 120;

function parsePort(raw: string | undefined): number {
  if (!raw) return DEFAULT_PORT;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535
    ? parsed
    : DEFAULT_PORT;
}

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  airCacheTtlMs: number;
  geminiApiKey: string;
  geminiModel: string;
  planRateLimitMax: number;
  planRateLimitWindowMs: number;
  apiRateLimitMax: number;
  apiRateLimitWindowMs: number;
}

export function loadConfig(): ServerConfig {
  return {
    port: parsePort(process.env['PORT']),
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    airCacheTtlMs: FIFTEEN_MINUTES_MS,
    geminiApiKey: process.env['GEMINI_API_KEY']?.trim() ?? '',
    geminiModel: process.env['GEMINI_MODEL']?.trim() || 'gemini-3.5-flash',
    planRateLimitMax: DEFAULT_PLAN_RATE_LIMIT,
    planRateLimitWindowMs: FIFTEEN_MINUTES_MS,
    apiRateLimitMax: DEFAULT_API_RATE_LIMIT,
    apiRateLimitWindowMs: ONE_MINUTE_MS,
  };
}
