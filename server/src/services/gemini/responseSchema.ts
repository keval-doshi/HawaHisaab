import { Type, type Schema } from '@google/genai';
import type { SwapId } from '@hawahisaab/engine';
import { z } from 'zod';

/** Swap ids Gemini may choose from; must stay in sync with the engine's SwapId union. */
export const SWAP_IDS: readonly [SwapId, ...SwapId[]] = [
  'car_to_metro',
  'car_to_carpool',
  'two_wheeler_to_metro',
  'gas_to_induction',
  'biomass_to_lpg_induction',
  'leaves_to_compost',
  'incense_to_vented',
  'short_trip_walk_cycle',
];

/**
 * Server-side validation of Gemini's JSON. Gemini only supplies words and ids;
 * every number in the final plan is re-filled from the deterministic engine.
 */
export const geminiOutputSchema = z.object({
  summary: z.string().trim().min(10).max(1200),
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(60),
        time: z.string().trim().min(1).max(60),
        member: z.string().trim().min(1).max(100),
        action: z.string().trim().min(5).max(500),
        lowEmissionTip: z.string().trim().min(5).max(500),
        why: z.string().trim().min(5).max(500),
      }),
    )
    .min(1)
    .max(12),
  indoorHacks: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(60),
        hack: z.string().trim().min(5).max(500),
        why: z.string().trim().min(5).max(500),
      }),
    )
    .min(1)
    .max(6),
  swaps: z
    .array(
      z.object({
        swapId: z.enum(SWAP_IDS),
        why: z.string().trim().min(5).max(500),
      }),
    )
    .min(1)
    .max(8),
});

export type GeminiPlanOutput = z.infer<typeof geminiOutputSchema>;

/** Structured-output schema sent to Gemini so it can only return the expected JSON shape. */
export const GEMINI_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Exactly 2 sentences summarizing the day air quality and plan.',
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          time: { type: Type.STRING },
          member: { type: Type.STRING },
          action: { type: Type.STRING },
          lowEmissionTip: { type: Type.STRING },
          why: { type: Type.STRING },
        },
        required: ['id', 'time', 'member', 'action', 'lowEmissionTip', 'why'],
      },
    },
    indoorHacks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          hack: { type: Type.STRING },
          why: { type: Type.STRING },
        },
        required: ['id', 'hack', 'why'],
      },
    },
    swaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          swapId: {
            type: Type.STRING,
            enum: [...SWAP_IDS],
          },
          why: { type: Type.STRING },
        },
        required: ['swapId', 'why'],
      },
    },
  },
  required: ['summary', 'items', 'indoorHacks', 'swaps'],
};
