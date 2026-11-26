import { ApiError, GoogleGenAI, ThinkingLevel, type Schema } from '@google/genai';

/** Upper bound for one plan request across all attempts; the rule-based plan is used after this. */
const GEMINI_TIMEOUT_MS = 25_000;
const GEMINI_TEMPERATURE = 0.3;
/**
 * The plan is a structured rewrite of numbers the engine already computed, so deep
 * reasoning is unnecessary; low thinking keeps latency well inside the timeout.
 */
const GEMINI_THINKING_LEVEL = ThinkingLevel.LOW;
/** Pause before retrying the same model after a transient (overload / rate limit) error. */
const RETRY_DELAY_MS = 1_000;
/** HTTP statuses Gemini uses for transient conditions worth retrying. */
const RETRYABLE_STATUSES = new Set([429, 500, 503, 504]);

export interface GeminiGenerateInput {
  model: string;
  /** Models to try, in order, if `model` keeps failing (e.g. 503 high demand). */
  fallbackModels?: readonly string[];
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
}

/** Minimal seam over the Gemini SDK so the planner can be tested with a fake client. */
export interface GeminiClient {
  generatePlanJson(input: GeminiGenerateInput): Promise<string>;
}

export function isRetryableGeminiError(error: unknown): boolean {
  return error instanceof ApiError && RETRYABLE_STATUSES.has(error.status);
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason as Error);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason as Error);
      },
      { once: true },
    );
  });
}

/**
 * Calls `attempt` for each model in order. A model that fails with a transient error is
 * retried once before moving on; any other error moves straight to the next model.
 * Throws the last error if every model fails or the shared deadline signal aborts.
 */
export async function generateWithModelFallback<T>(
  models: readonly string[],
  attempt: (model: string) => Promise<T>,
  signal: AbortSignal,
  retryDelayMs = RETRY_DELAY_MS,
): Promise<T> {
  let lastError: unknown = new Error('No Gemini model configured');
  for (const model of models) {
    for (let tryIndex = 0; tryIndex < 2; tryIndex += 1) {
      if (signal.aborted) throw signal.reason;
      const startedAt = Date.now();
      try {
        return await attempt(model);
      } catch (error) {
        lastError = error;
        const reason =
          error instanceof ApiError ? `HTTP ${String(error.status)}` : String(error);
        console.warn(
          `[gemini] ${model} attempt ${String(tryIndex + 1)} failed after ${String(Date.now() - startedAt)} ms: ${reason}`,
        );
        if (tryIndex === 0 && isRetryableGeminiError(error)) {
          await delay(retryDelayMs, signal);
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}

/** `thinkingLevel` is a Gemini 3+ setting; older models reject it. */
function supportsThinkingLevel(model: string): boolean {
  return !/^gemini-[12](\.|-)/.test(model);
}

/** Gemini client backed by the official `@google/genai` SDK, using structured JSON output. */
export function createSdkGeminiClient(apiKey: string): GeminiClient {
  // v1beta: structured output with a system instruction is not enabled on v1 for every
  // model (gemini-2.5-flash rejects it), and the fallback models must accept the same request.
  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
  return {
    async generatePlanJson(input: GeminiGenerateInput): Promise<string> {
      const signal = AbortSignal.timeout(GEMINI_TIMEOUT_MS);
      const models = [...new Set([input.model, ...(input.fallbackModels ?? [])])];

      return generateWithModelFallback(
        models,
        async (model) => {
          const response = await ai.models.generateContent({
            model,
            contents: input.prompt,
            config: {
              systemInstruction: input.systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: input.responseSchema,
              temperature: GEMINI_TEMPERATURE,
              ...(supportsThinkingLevel(model)
                ? { thinkingConfig: { thinkingLevel: GEMINI_THINKING_LEVEL } }
                : {}),
              abortSignal: signal,
            },
          });
          return response.text ?? '';
        },
        signal,
      );
    },
  };
}
