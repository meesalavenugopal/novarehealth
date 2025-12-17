import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to clear auth and redirect to login
const forceLogout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth-storage');
  window.location.href = '/login';
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } else {
          // No refresh token, force logout
          forceLogout();
        }
      } catch (refreshError) {
        // Refresh failed, force logout
        forceLogout();
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Helper function to handle 401 responses from fetch calls
 * Use this in components that use fetch() directly
 */
export const handleUnauthorized = (response: Response) => {
  if (response.status === 401) {
    forceLogout();
    return true;
  }
  return false;
};

/**
 * Custom error class for API errors with status info
 */
export class ApiError extends Error {
  status: number;
  isAuthError: boolean;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isAuthError = status === 401;
  }
}

/**
 * Options for authFetch
 */
export interface AuthFetchOptions extends RequestInit {
  /** If true, don't force logout on 401 - throw ApiError instead */
  suppressAuthRedirect?: boolean;
}

/**
 * Wrapper for fetch that automatically handles 401 errors
 * @param url - API endpoint
 * @param options - Fetch options with optional suppressAuthRedirect
 */
export const authFetch = async (url: string, options: AuthFetchOptions = {}): Promise<Response> => {
  const { suppressAuthRedirect, ...fetchOptions } = options;
  const token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, { ...fetchOptions, headers });
  
  if (response.status === 401) {
    // Try to refresh token
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const { access_token, refresh_token } = await refreshResponse.json();
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          // Retry original request with new token
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${access_token}`,
          };
          return fetch(url, { ...fetchOptions, headers: retryHeaders });
        }
      } catch {
        // Refresh failed
      }
    }
    
    // If suppressAuthRedirect is true, throw error instead of redirecting
    if (suppressAuthRedirect) {
      throw new ApiError('Session expired. Please log in again.', 401);
    }
    
    // Force logout if refresh failed or no refresh token
    forceLogout();
  }
  
  return response;
};

/**
 * Guest-friendly fetch for public endpoints
 * Works without authentication, but will include token if available
 * Does NOT force logout on 401 - allows guest browsing
 */
export const guestFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('access_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  // Include token if available, but don't require it
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
};

/**
 * Booking context management for guest-to-user flow
 * Preserves booking intent when guest needs to login
 */
const BOOKING_CONTEXT_KEY = 'pending_booking_context';

export interface BookingContext {
  doctorId: number;
  doctorName: string;
  specializationName: string;
  selectedDate?: string;
  selectedSlotId?: number;
  selectedSlotTime?: string;
  consultationFee?: number;
  returnUrl?: string;
}

export const saveBookingContext = (context: BookingContext): void => {
  localStorage.setItem(BOOKING_CONTEXT_KEY, JSON.stringify(context));
};

export const getBookingContext = (): BookingContext | null => {
  const stored = localStorage.getItem(BOOKING_CONTEXT_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const clearBookingContext = (): void => {
  localStorage.removeItem(BOOKING_CONTEXT_KEY);
};

export const hasBookingContext = (): boolean => {
  return localStorage.getItem(BOOKING_CONTEXT_KEY) !== null;
};

export default api;
