import { headers } from 'next/headers'

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'

export interface ApiError {
  code: ApiErrorCode
  message: string
  details?: unknown
  correlationId?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  correlationId?: string
}

export interface PaginatedData<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function getCorrelationId(): string {
  const headersList = headers()
  return headersList.get('x-correlation-id') || crypto.randomUUID()
}

export function successResponse<T>(data: T, correlationId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    correlationId
  }
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  correlationId?: string
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      correlationId
    }
  }
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  correlationId?: string
): ApiResponse<PaginatedData<T>> {
  return {
    success: true,
    data: {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    },
    correlationId
  }
}
