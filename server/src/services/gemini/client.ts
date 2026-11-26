import {
  ApiError,
  GoogleGenAI,
  ThinkingLevel,
  type Schema,
  type ThinkingConfig,
} from '@google/genai';

/** Upper bound for one plan request across all attempts; the rule-based plan is used after this. */
const GEMINI_TIMEOUT_MS = 25_000;
const GEMINI_TEMPERATURE = 0.3;
/**
 * The plan is a structured rewrite of numbers the engine already computed, so deep
 * reasoning is unnecessary; low thinking keeps latency well inside the timeout.
 */
const GEMINI_THINKING_LEVEL = ThinkingLevel.LOW;
/**
 * Cap for every attempt except the last, so one slow failure (an overloaded model can take
 * ~15 s to return 503) cannot use up the whole budget the fallback model needs.
 */
const NON_FINAL_ATTEMPT_TIMEOUT_MS = 12_000;

export interface GeminiGenerateInput {
  model: string;
  /** Models to try, in order, if `model` fails (e.g. 503 high demand). */
  fallbackModels?: readonly string[];
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
}

/** Minimal seam over the Gemini SDK so the planner can be tested with a fake client. */
export interface GeminiClient {
  generatePlanJson(input: GeminiGenerateInput): Promise<string>;
}

function describeFailure(error: unknown): string {
  return error instanceof ApiError ? `HTTP ${String(error.status)}` : String(error);
}

/**
 * Tries each model once, in order, and returns the first success. Every attempt except the
 * last is capped at `nonFinalAttemptTimeoutMs`; all attempts share the `deadline` signal.
 * Throws the last error if every model fails or the deadline passes.
 */
export async function generateWithModelFallback<T>(
  models: readonly string[],
  attempt: (model: string, signal: AbortSignal) => Promise<T>,
  deadline: AbortSignal,
  nonFinalAttemptTimeoutMs = NON_FINAL_ATTEMPT_TIMEOUT_MS,
): Promise<T> {
  let lastError: unknown = new Error('No Gemini model configured');
  for (const [index, model] of models.entries()) {
    if (deadline.aborted) throw deadline.reason;
    const isFinal = index === models.length - 1;
    const signal = isFinal
      ? deadline
      : AbortSignal.any([deadline, AbortSignal.timeout(nonFinalAttemptTimeoutMs)]);
    const startedAt = Date.now();
    try {
      return await attempt(model, signal);
    } catch (error) {
      lastError = error;
      console.warn(
        `[gemini] ${model} failed after ${String(Date.now() - startedAt)} ms: ${describeFailure(error)}`,
      );
    }
  }
  throw lastError;
}

/**
 * Gemini 3+ models take a thinking level; Gemini 2.x models reject it and instead take a
 * token budget, where 0 turns thinking off so the fallback answers quickly.
 */
function thinkingConfigFor(model: string): ThinkingConfig {
  return /^gemini-[12][.-]/.test(model)
    ? { thinkingBudget: 0 }
    : { thinkingLevel: GEMINI_THINKING_LEVEL };
}

/** Gemini client backed by the official `@google/genai` SDK, using structured JSON output. */
export function createSdkGeminiClient(apiKey: string): GeminiClient {
  // v1beta: structured output with a system instruction is not enabled on v1 for every
  // model (gemini-2.5-flash rejects it), and the fallback models must accept the same request.
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
  return {
    async generatePlanJson(input: GeminiGenerateInput): Promise<string> {
      const deadline = AbortSignal.timeout(GEMINI_TIMEOUT_MS);
      const models = [...new Set([input.model, ...(input.fallbackModels ?? [])])];

      return generateWithModelFallback(
        models,
        async (model, signal) => {
          const response = await ai.models.generateContent({
            model,
            contents: input.prompt,
            config: {
              systemInstruction: input.systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: input.responseSchema,
              temperature: GEMINI_TEMPERATURE,
              thinkingConfig: thinkingConfigFor(model),
              abortSignal: signal,
            },
          });
          return response.text ?? '';
        },
        deadline,
      );
    },
  };
}
