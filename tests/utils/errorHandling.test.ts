import { describe, expect, it } from 'vitest';
import { getErrorMessage, getErrorResponseDetails } from '../../src/utils/errorHandling';

describe('errorHandling utilities', () => {
  describe('getErrorMessage', () => {
    it('returns the message from an Error instance', () => {
      const error = new Error('Boom');
      expect(getErrorMessage(error)).toBe('Boom');
    });

    it('returns the message when present on a plain object', () => {
      const error = { message: 'Plain error' };
      expect(getErrorMessage(error)).toBe('Plain error');
    });

    it('falls back to the provided default when message is unavailable', () => {
      const fallback = 'Fallback error';
      expect(getErrorMessage(undefined, fallback)).toBe(fallback);
    });
  });

  describe('getErrorResponseDetails', () => {
    it('extracts status and data from an axios-like error', () => {
      const error = {
        response: {
          status: 418,
          data: { message: 'I am a teapot' },
        },
      };

      expect(getErrorResponseDetails(error)).toEqual({
        status: 418,
        data: { message: 'I am a teapot' },
      });
    });

    it('returns empty details when no response is available', () => {
      expect(getErrorResponseDetails(new Error('Boom'))).toEqual({});
    });
  });
});
