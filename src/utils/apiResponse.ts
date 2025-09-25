export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: unknown;
}

export const isApiEnvelope = <T>(value: unknown): value is ApiEnvelope<T> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return 'data' in candidate || 'success' in candidate || 'error' in candidate || 'message' in candidate;
};

export const unwrapApiData = <T>(value: T | ApiEnvelope<T> | null | undefined): T | null => {
  if (value == null) {
    return null;
  }

  if (isApiEnvelope<T>(value)) {
    if (value.data != null) {
      return value.data;
    }

    return null;
  }

  return value;
};

export const extractApiArray = <T>(value: T[] | ApiEnvelope<T[]> | null | undefined): T[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (isApiEnvelope<T[]>(value) && Array.isArray(value.data)) {
    return value.data;
  }

  return [];
};
