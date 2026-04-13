/**
 * Timezone utilities — centralized timezone handling for Zhiive.
 * 
 * All dates are stored in UTC in the database.
 * This module provides helpers to display dates in the user's local timezone.
 * 
 * The user's timezone is stored in UserPreference (key: 'timezone').
 * If not set, defaults to the browser's Intl.DateTimeFormat timezone.
 */

const DEFAULT_TIMEZONE = 'Europe/Brussels';

/**
 * Get the browser's detected timezone.
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Format a date/ISO string in the user's timezone.
 */
export function formatInTimezone(
  date: string | Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const tz = timezone || getBrowserTimezone();
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  return new Intl.DateTimeFormat('fr-BE', defaultOptions).format(d);
}

/**
 * Format a date as relative time (e.g., "il y a 5 min").
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'à l\'instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;

  // Fallback to formatted date
  return formatInTimezone(d, getBrowserTimezone(), {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format just the time portion (HH:MM).
 */
export function formatTimeOnly(date: string | Date, timezone: string): string {
  return formatInTimezone(date, timezone, {
    hour: '2-digit',
    minute: '2-digit',
    year: undefined,
    month: undefined,
    day: undefined,
  });
}

/**
 * Format just the date portion.
 */
export function formatDateOnly(date: string | Date, timezone: string): string {
  return formatInTimezone(date, timezone, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: undefined,
    minute: undefined,
  });
}

/**
 * Get a list of common timezones for a selector UI.
 */
export const COMMON_TIMEZONES = [
  { value: 'Europe/Brussels', label: 'Bruxelles (UTC+1/+2)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
  { value: 'Europe/London', label: 'Londres (UTC+0/+1)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1/+2)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (UTC+1/+2)' },
  { value: 'Europe/Luxembourg', label: 'Luxembourg (UTC+1/+2)' },
  { value: 'Europe/Zurich', label: 'Zurich (UTC+1/+2)' },
  { value: 'Europe/Rome', label: 'Rome (UTC+1/+2)' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+1/+2)' },
  { value: 'Europe/Lisbon', label: 'Lisbonne (UTC+0/+1)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6/-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
  { value: 'America/Toronto', label: 'Toronto (UTC-5/-4)' },
  { value: 'Africa/Casablanca', label: 'Casablanca (UTC+0/+1)' },
  { value: 'Africa/Tunis', label: 'Tunis (UTC+1)' },
  { value: 'Africa/Kinshasa', label: 'Kinshasa (UTC+1)' },
  { value: 'Asia/Dubai', label: 'Dubaï (UTC+4)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10/+11)' },
];
