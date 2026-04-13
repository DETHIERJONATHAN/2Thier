/**
 * useTimezone — Hook for accessing the user's timezone preference.
 * 
 * Returns the user's configured timezone (from UserPreference)
 * or falls back to the browser's detected timezone.
 * 
 * Usage:
 *   const { timezone, setTimezone, formatDate, formatTime } = useTimezone();
 */
import { useCallback } from 'react';
import { useUserPreference } from './useUserPreference';
import {
  getBrowserTimezone,
  formatInTimezone,
  formatTimeOnly,
  formatDateOnly,
  formatRelativeTime,
} from '../lib/timezone';

export function useTimezone() {
  const [timezone, setTimezone, { loading }] = useUserPreference<string>(
    'timezone',
    getBrowserTimezone()
  );

  const formatDate = useCallback(
    (date: string | Date, options?: Intl.DateTimeFormatOptions) =>
      formatInTimezone(date, timezone, options),
    [timezone]
  );

  const formatTime = useCallback(
    (date: string | Date) => formatTimeOnly(date, timezone),
    [timezone]
  );

  const formatDateShort = useCallback(
    (date: string | Date) => formatDateOnly(date, timezone),
    [timezone]
  );

  return {
    timezone,
    setTimezone,
    loading,
    formatDate,
    formatTime,
    formatDateShort,
    formatRelative: formatRelativeTime,
  };
}
