export interface ErrorResponseDetails {
  status?: number;
  data?: unknown;
}

export const getErrorMessage = (error: unknown, fallback = 'Erreur inconnue'): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
};

export const getErrorResponseDetails = (error: unknown): ErrorResponseDetails => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  ) {
    const { response } = error as { response?: { status?: number; data?: unknown } };
    return {
      status: response?.status,
      data: response?.data,
    };
  }

  return {};
};
