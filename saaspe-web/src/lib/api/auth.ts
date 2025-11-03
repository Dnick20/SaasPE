import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  tenantName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
  };
  tenant?: {
    id: string;
    name: string;
    plan: string;
    status: string;
  };
}

export const authApi = {
  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', data);
    return response.data;
  },

  /**
   * Register new agency account
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Map tenantName to agencyName for backend compatibility
    const payload = {
      agencyName: data.tenantName,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    };
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', payload);
    return response.data;
  },

  /**
   * Logout (invalidate tokens)
   * Tokens are sent via httpOnly cookies automatically
   */
  async logout(): Promise<void> {
    await apiClient.post('/api/v1/auth/logout');
    // Cookies are cleared by backend
  },

  /**
   * Get current user profile
   */
  async getMe(): Promise<AuthResponse['user']> {
    const response = await apiClient.get<AuthResponse['user']>('/api/v1/users/me');
    return response.data;
  },
};
