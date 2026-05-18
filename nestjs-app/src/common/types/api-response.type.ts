// Laravel Helper::response() shakli.

export interface ApiSuccessResponse<T = unknown> {
  message: true | string;
  error: false;
  data: T;
}

export interface ApiErrorResponse {
  message: string;
  error: true;
  data: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
