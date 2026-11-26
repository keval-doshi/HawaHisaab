import { ApiError } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { generateWithModelFallback } from '../src/services/gemini/client.js';

const overloaded = () => new ApiError({ status: 503, message: 'high demand' });
const badRequest = () => new ApiError({ status: 400, message: 'invalid argument' });
const noDeadline = () => new AbortController().signal;

/** Resolves only when the given signal aborts, like a hung upstream request. */
const hangUntilAborted = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => {
      reject(signal.reason as Error);
    });
  });

describe('generateWithModelFallback', () => {
  it('returns the primary model result when it succeeds', async () => {
    const attempt = vi.fn().mockResolvedValue('ok');

    await expect(
      generateWithModelFallback(['primary', 'backup'], attempt, noDeadline()),
    ).resolves.toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt.mock.calls[0]?.[0]).toBe('primary');
  });

  it('moves to the fallback model when the primary is overloaded', async () => {
    const attempt = vi.fn((model: string) =>
      model === 'primary'
        ? Promise.reject(overloaded())
        : Promise.resolve(`from ${model}`),
    );

    await expect(
      generateWithModelFallback(['primary', 'backup'], attempt, noDeadline()),
    ).resolves.toBe('from backup');
    expect(attempt.mock.calls.map(([model]) => model)).toEqual(['primary', 'backup']);
  });

  it('caps a slow non-final attempt so the fallback model still gets time', async () => {
    const attempt = vi.fn((model: string, signal: AbortSignal) =>
      model === 'primary' ? hangUntilAborted(signal) : Promise.resolve('backup ok'),
    );

    await expect(
      generateWithModelFallback(['primary', 'backup'], attempt, noDeadline(), 20),
    ).resolves.toBe('backup ok');
  });

  it('throws the last error when every model fails', async () => {
    const attempt = vi.fn(() => Promise.reject(badRequest()));

    await expect(
      generateWithModelFallback(['primary', 'backup'], attempt, noDeadline()),
    ).rejects.toThrow('invalid argument');
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('stops immediately once the shared deadline has passed', async () => {
    const controller = new AbortController();
    controller.abort(new Error('deadline'));
    const attempt = vi.fn().mockResolvedValue('never');

    await expect(
      generateWithModelFallback(['primary'], attempt, controller.signal),
    ).rejects.toThrow('deadline');
    expect(attempt).not.toHaveBeenCalled();
  });
});
