import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: Record<string, string[]> } | null;
  meta: {
    timestamp: string;
    requestId: string;
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  pagination?: { page: number; limit: number; total: number }
) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: (res.req as any).requestId || uuidv4(),
      ...(pagination && {
        pagination: {
          ...pagination,
          totalPages: Math.ceil(pagination.total / pagination.limit),
        },
      }),
    },
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: Record<string, string[]>
) {
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: { code, message, ...(details && { details }) },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: (res.req as any).requestId || uuidv4(),
    },
  };
  return res.status(statusCode).json(response);
}
