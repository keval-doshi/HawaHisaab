import { z } from 'zod';

export const FREE_TEXT_MAX_BYTES = 2048;

function parseCoordinate(min: number, max: number, label: string) {
  return z.preprocess(
    (value) => {
      if (typeof value !== 'string') return NaN;
      const trimmed = value.trim();
      if (trimmed.length === 0) return NaN;
      return Number(trimmed);
    },
    z
      .number({ error: `${label} must be a valid number` })
      .min(min, `${label} must be >= ${String(min)}`)
      .max(max, `${label} must be <= ${String(max)}`),
  );
}

export const airQuerySchema = z.object({
  lat: parseCoordinate(-90, 90, 'lat'),
  lon: parseCoordinate(-180, 180, 'lon'),
});

export const geocodeQuerySchema = z.object({
  q: z
    .string({ error: 'q is required' })
    .trim()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query must be at most 100 characters'),
});

const nonNegativeNullableNumber = z.number().min(0).max(5000).nullable();

const hourlyPointSchema = z.object({
  time: z.string().min(1).max(40),
  pm2_5: nonNegativeNullableNumber,
  pm10: nonNegativeNullableNumber,
});

const familyMemberSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  ageGroup: z.enum(['child_under_5', 'child_5_12', 'teen', 'adult', 'elderly']),
  healthFlags: z
    .array(z.enum(['asthma', 'heart', 'pregnancy', 'none']))
    .min(1)
    .max(4),
  outdoorHoursPerDay: z.number().min(0).max(16),
});

const cleanWindowSchema = z.object({
  startTime: z.string().min(1).max(40),
  endTime: z.string().min(1).max(40),
  hours: z.number().int().min(1).max(12),
  averagePm25: z.number().min(0).max(5000),
  minPm25: z.number().min(0).max(5000),
  maxPm25: z.number().min(0).max(5000),
});

export const planRequestSchema = z
  .object({
    profile: z.object({
      location: z.object({
        label: z.string().trim().min(1).max(200),
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
      }),
      members: z.array(familyMemberSchema).min(1).max(12),
      commuteMode: z.enum([
        'car',
        'two_wheeler',
        'auto',
        'metro',
        'bus',
        'walk_cycle',
        'wfh',
      ]),
      commuteKmRoundTrip: z.number().min(0).max(200),
      cookingFuel: z.enum(['lpg', 'png', 'induction', 'biomass']),
      homeSize: z.enum(['small_1bhk', 'medium_2bhk', 'large_3bhk']),
      purifierCadrM3h: z.number().min(0).max(1500),
      outdoorRoutine: z.string().max(2048),
      language: z.enum(['en', 'hi']),
    }),
    forecast: z.object({
      location: z.object({
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
        name: z.string().max(120).optional(),
        state: z.string().max(120).optional(),
        timezone: z.string().min(1).max(80),
        timezoneAbbreviation: z.string().min(1).max(20),
      }),
      fetchedAt: z.string().min(1).max(64),
      current: hourlyPointSchema,
      hourly: z.array(hourlyPointSchema).min(1).max(72),
    }),
    cleanWindows: z
      .object({
        best1h: cleanWindowSchema.nullable(),
        best2h: cleanWindowSchema.nullable(),
        best3h: cleanWindowSchema.nullable(),
        worstHours: z
          .array(
            z.object({
              time: z.string().min(1).max(40),
              pm2_5: z.number().min(0).max(5000),
            }),
          )
          .max(72),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const memberNames = data.profile.members.map((m) => m.name).join(' ');
    const combinedFreeText = [
      data.profile.location.label,
      data.profile.outdoorRoutine,
      memberNames,
    ].join('\n');

    if (Buffer.byteLength(combinedFreeText, 'utf8') > FREE_TEXT_MAX_BYTES) {
      ctx.addIssue({
        code: 'custom',
        path: ['profile', 'outdoorRoutine'],
        message: 'Combined profile free text must not exceed 2048 bytes (2 kB)',
      });
    }
  });

export type AirQuery = z.infer<typeof airQuerySchema>;
export type GeocodeQuery = z.infer<typeof geocodeQuerySchema>;
export type PlanRequestBody = z.infer<typeof planRequestSchema>;
