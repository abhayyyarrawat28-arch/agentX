export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: Record<string, string[]> } | null;
  meta: {
    timestamp: string;
    requestId: string;
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  };
}

export interface User {
  name: string;
  employeeId: string;
  branchId: string;
}

export interface LoginResponse {
  token: string;
  role: 'agent' | 'admin';
  expiresIn: string;
  mustChangePassword: boolean;
  user?: User;
}
