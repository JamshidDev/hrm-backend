// Laravel Helper::response() ekvivalenti.

import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
} from '@/common/types/api-response.type';

export function buildSuccess<T>(
  message: true | string,
  data: T,
): ApiSuccessResponse<T> {
  return { message, error: false, data };
}

export function buildError(
  message: string,
  data: unknown = [],
): ApiErrorResponse {
  return { message, error: true, data };
}

// ResponseInterceptor double-wrapping qilmasligi uchun.
export function isApiResponse(value: unknown): value is ApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    'error' in value &&
    'data' in value
  );
}
