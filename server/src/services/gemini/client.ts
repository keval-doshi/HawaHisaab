import { GoogleGenAI, type Schema } from '@google/genai';

const GEMINI_TIMEOUT_MS = 15_000;
const GEMINI_TEMPERATURE = 0.3;

export interface GeminiGenerateInput {
  model: string;
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
}

/** Minimal seam over the Gemini SDK so the planner can be tested with a fake client. */
export interface GeminiClient {
  generatePlanJson(input: GeminiGenerateInput): Promise<string>;
}

/** Gemini client backed by the official `@google/genai` SDK, using structured JSON output. */
export function createSdkGeminiClient(apiKey: string): GeminiClient {
  const ai = new GoogleGenAI({ apiKey });
  return {
    async generatePlanJson(input: GeminiGenerateInput): Promise<string> {
      const response = await ai.models.generateContent({
        model: input.model,
        contents: input.prompt,
        config: {
          systemInstruction: input.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: input.responseSchema,
          temperature: GEMINI_TEMPERATURE,
          abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        },
      });
      return response.text ?? '';
    },
  };
}
