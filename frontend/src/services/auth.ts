import api from './api';
import type { TokenResponse, OTPVerifyRequest } from '../types';

export const authService = {
  // Send OTP to phone
  sendOTPPhone: async (phone: string) => {
    const response = await api.post('/auth/send-otp/phone', { phone });
    return response.data;
  },

  // Send OTP to email
  sendOTPEmail: async (email: string) => {
    const response = await api.post('/auth/send-otp/email', { email });
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (data: OTPVerifyRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/verify-otp', data);
    return response.data;
  },

  // Refresh tokens
  refreshTokens: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  // Logout (client-side only for now)
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};
