import {
  buildFallbackPlan,
  evaluateHouseholdSwaps,
  type AirForecastResponse,
  type FamilyProfile,
  type IndoorHack,
  type PlanItem,
  type PlanSwap,
  type SmogDayPlan,
} from '@hawahisaab/engine';
import { createSdkGeminiClient, type GeminiClient } from './gemini/client.js';
import { currentOutdoorPm25, simulateIndoorScenarios } from './gemini/indoorScenarios.js';
import { buildGeminiPrompt } from './gemini/prompt.js';
import {
  GEMINI_RESPONSE_SCHEMA,
  geminiOutputSchema,
  type GeminiPlanOutput,
} from './gemini/responseSchema.js';

export type { GeminiClient, GeminiGenerateInput } from './gemini/client.js';

export interface PlanService {
  generatePlan(
    profile: FamilyProfile,
    forecast: AirForecastResponse,
  ): Promise<SmogDayPlan>;
}

export interface PlanServiceOptions {
  geminiApiKey: string;
  geminiModel: string;
  /** Tried in order when the primary model is overloaded or unavailable. */
  geminiFallbackModels?: readonly string[];
  /** Injected client (used by tests); defaults to the SDK client when an API key is set. */
  geminiClient?: GeminiClient;
}

/**
 * Combines Gemini's words with engine numbers. Gemini never supplies a number that
 * reaches the user: every µg / g / kg value is looked up from the deterministic engine.
 */
function mergeWithEngineNumbers(
  output: GeminiPlanOutput,
  profile: FamilyProfile,
  forecast: AirForecastResponse,
  fallbackPlan: SmogDayPlan,
): SmogDayPlan {
  const outdoorPm25 = currentOutdoorPm25(forecast);
  const closedIndoorPm25 = simulateIndoorScenarios(profile, outdoorPm25).closed
    .indoorPm25;

  const memberById = new Map(fallbackPlan.ledger.members.map((m) => [m.memberId, m]));
  const memberByName = new Map(
    fallbackPlan.ledger.members.map((m) => [m.name.trim().toLowerCase(), m]),
  );
  const swapById = new Map(
    evaluateHouseholdSwaps(profile, outdoorPm25).map((s) => [s.swapId, s]),
  );

  const items: PlanItem[] = output.items.map((item) => {
    const matched =
      memberById.get(item.id) ?? memberByName.get(item.member.trim().toLowerCase());
    return {
      id: item.id,
      time: item.time,
      member: item.member,
      action: item.action,
      lowEmissionTip: item.lowEmissionTip,
      why: item.why,
      breathedLessUg: matched?.breathedLessUg ?? 0,
    };
  });

  const indoorHacks: IndoorHack[] = output.indoorHacks.map((hack) => ({
    id: hack.id,
    hack: hack.hack,
    why: hack.why,
    estimatedIndoorPm25: closedIndoorPm25,
  }));

  const swaps: PlanSwap[] = output.swaps.map((swap) => {
    const computed = swapById.get(swap.swapId);
    return {
      swapId: swap.swapId,
      why: swap.why,
      emittedLessG: computed?.emittedLessG ?? 0,
      emittedLessKgCO2: computed?.emittedLessKgCO2 ?? 0,
      breathedLessUg: computed?.breathedLessUg ?? 0,
    };
  });

  return {
    source: 'gemini',
    language: profile.language,
    summary: output.summary,
    items,
    indoorHacks,
    swaps,
    aqi: fallbackPlan.aqi,
    cleanWindows: fallbackPlan.cleanWindows,
    ledger: fallbackPlan.ledger,
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
}

/**
 * Plan service: asks Gemini for a grounded, structured plan and falls back to the
 * deterministic rule-based plan when Gemini is not configured, fails, or returns
 * output that does not pass validation.
 */
export function createPlanService(options: PlanServiceOptions): PlanService {
  const client =
    options.geminiClient ??
    (options.geminiApiKey ? createSdkGeminiClient(options.geminiApiKey) : null);

  return {
    async generatePlan(profile, forecast) {
      const fallbackPlan = buildFallbackPlan(profile, forecast);
      if (!client) return fallbackPlan;

      try {
        const { systemInstruction, prompt } = buildGeminiPrompt(
          profile,
          forecast,
          fallbackPlan,
        );
        const rawJson = await client.generatePlanJson({
          model: options.geminiModel,
          fallbackModels: options.geminiFallbackModels,
          systemInstruction,
          prompt,
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        });

        const parsed = geminiOutputSchema.safeParse(JSON.parse(rawJson));
        if (!parsed.success) {
          console.warn('[plan] Gemini output failed validation; using fallback plan');
          return fallbackPlan;
        }

        return mergeWithEngineNumbers(parsed.data, profile, forecast, fallbackPlan);
      } catch (error) {
        console.warn(
          `[plan] Gemini request failed (${describeError(error)}); using fallback plan`,
        );
        return fallbackPlan;
      }
    },
  };
}
