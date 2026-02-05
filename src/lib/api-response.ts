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

export async function getCorrelationId(): Promise<string> {
  const headersList = await headers()
  const correlationId = headersList.get('x-correlation-id')
  if (correlationId) return correlationId
  
  // Generate a simple correlation ID without relying on crypto
  const array = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
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
