/**
 * API Error Response Types
 */

export interface ApiErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}

export interface AxiosApiError {
  response?: {
    data?: ApiErrorResponse | { message?: string };
    status?: number;
  };
  message?: string;
}

export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';

  // Check if it's an AxiosError with response
  const apiError = error as AxiosApiError;
  if (apiError.response?.data) {
    if (typeof apiError.response.data === 'object' && 'message' in apiError.response.data) {
      return apiError.response.data.message || 'An error occurred';
    }
  }

  // Check if it's a regular Error
  if (error instanceof Error) {
    return error.message;
  }

  // Check if it's a string
  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}
