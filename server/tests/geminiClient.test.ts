import { ApiError } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import {
  generateWithModelFallback,
  isRetryableGeminiError,
} from '../src/services/gemini/client.js';

const overloaded = () => new ApiError({ status: 503, message: 'high demand' });
const badRequest = () => new ApiError({ status: 400, message: 'invalid argument' });
const noDeadline = () => new AbortController().signal;

describe('isRetryableGeminiError', () => {
  it('treats overload and rate-limit statuses as transient', () => {
    expect(isRetryableGeminiError(overloaded())).toBe(true);
    expect(isRetryableGeminiError(new ApiError({ status: 429, message: 'quota' }))).toBe(
      true,
    );
    expect(isRetryableGeminiError(badRequest())).toBe(false);
    expect(isRetryableGeminiError(new Error('network'))).toBe(false);
  });
});

describe('generateWithModelFallback', () => {
  it('returns the primary model result when it succeeds', async () => {
    const attempt = vi.fn().mockResolvedValue('ok');

    await expect(
      generateWithModelFallback(['primary', 'backup'], attempt, noDeadline(), 0),
    ).resolves.toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith('primary');
  });

  it('retries a transient error once on the same model before falling back', async () => {
    const attempt = vi
      .fn<(model: string) => Promise<string>>()
      .mockRejectedValueOnce(overloaded())
      .mockResolvedValueOnce('recovered');

    await expect(
      generateWithModelFallback(['primary', 'backup'], attempt, noDeadline(), 0),
    ).resolves.toBe('recovered');
    expect(attempt.mock.calls.map(([model]) => model)).toEqual(['primary', 'primary']);
  });

  it('moves to the fallback model when the primary stays overloaded', async () => {
    const attempt = vi.fn((model: string) =>
      model === 'primary'
        ? Promise.reject(overloaded())
        : Promise.resolve(`from ${model}`),
    );

    await expect(
      generateWithModelFallback(['primary', 'backup'], attempt, noDeadline(), 0),
    ).resolves.toBe('from backup');
    expect(attempt.mock.calls.map(([model]) => model)).toEqual([
      'primary',
      'primary',
      'backup',
    ]);
  });

  it('does not retry non-transient errors on the same model', async () => {
    const attempt = vi.fn((model: string) =>
      model === 'primary' ? Promise.reject(badRequest()) : Promise.resolve('backup ok'),
    );

    await generateWithModelFallback(['primary', 'backup'], attempt, noDeadline(), 0);
    expect(attempt.mock.calls.map(([model]) => model)).toEqual(['primary', 'backup']);
  });

  it('throws the last error when every model fails', async () => {
    const attempt = vi.fn(() => Promise.reject(badRequest()));

    await expect(
      generateWithModelFallback(['primary', 'backup'], attempt, noDeadline(), 0),
    ).rejects.toThrow('invalid argument');
  });

  it('stops immediately once the shared deadline has passed', async () => {
    const controller = new AbortController();
    controller.abort(new Error('deadline'));
    const attempt = vi.fn().mockResolvedValue('never');

    await expect(
      generateWithModelFallback(['primary'], attempt, controller.signal, 0),
    ).rejects.toThrow('deadline');
    expect(attempt).not.toHaveBeenCalled();
  });
});
