import { describe, it, expect, vi } from 'vitest';

// We test the asyncHandler module by importing the source directly
// asyncHandler wraps async Express route handlers to forward errors to next()

describe('asyncHandler', () => {
  const createMocks = () => ({
    req: {} as unknown,
    res: { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown,
    next: vi.fn(),
  });

  it('should export a function', async () => {
    const mod = await import('../../src/utils/asyncHandler');
    expect(typeof mod.asyncHandler).toBe('function');
    expect(typeof mod.default).toBe('function');
  });

  it('should call the wrapped function with req, res, next', async () => {
    const { asyncHandler } = await import('../../src/utils/asyncHandler');
    const { req, res, next } = createMocks();
    const fn = vi.fn().mockResolvedValue(undefined);

    const handler = asyncHandler(fn);
    await handler(req as never, res as never, next as never);

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should forward errors to next()', async () => {
    const { asyncHandler } = await import('../../src/utils/asyncHandler');
    const { req, res, next } = createMocks();
    const error = new Error('DB connection failed');
    const fn = vi.fn().mockRejectedValue(error);

    const handler = asyncHandler(fn);
    await handler(req as never, res as never, next as never);

    // Wait for microtask to settle
    await new Promise(r => setTimeout(r, 0));

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should handle synchronous throws inside async functions', async () => {
    const { asyncHandler } = await import('../../src/utils/asyncHandler');
    const { req, res, next } = createMocks();
    const error = new Error('Sync throw');
    const fn = vi.fn().mockImplementation(async () => { throw error; });

    const handler = asyncHandler(fn);
    await handler(req as never, res as never, next as never);

    await new Promise(r => setTimeout(r, 0));

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should not call next when handler succeeds', async () => {
    const { asyncHandler } = await import('../../src/utils/asyncHandler');
    const { req, res, next } = createMocks();
    const fn = vi.fn().mockImplementation(async (_req: unknown, r: { json: (v: unknown) => void }) => {
      r.json({ ok: true });
    });

    const handler = asyncHandler(fn);
    await handler(req as never, res as never, next as never);

    await new Promise(r => setTimeout(r, 0));

    expect(next).not.toHaveBeenCalled();
  });
});
