import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Phone, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { authService } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';

const phoneSchema = z.object({
  phone: z.string().min(10, 'Please enter a valid phone number'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  });

  const handleSendOTP = async (data: PhoneFormData) => {
    setIsLoading(true);
    setError('');
    try {
      await authService.sendOTPPhone(data.phone);
      setPhone(data.phone);
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (data: OTPFormData) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await authService.verifyOTP({
        phone,
        otp_code: data.otp,
      });
      setAuth(response.user, response.access_token, response.refresh_token);
      
      // Redirect based on role
      if (response.user.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else if (response.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">NovareHealth</h1>
          <p className="text-gray-500 mt-2">Your Health, Our Priority</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          /* Phone Input Step */
          <form onSubmit={phoneForm.handleSubmit(handleSendOTP)}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  placeholder="+258 84 123 4567"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  {...phoneForm.register('phone')}
                />
              </div>
              {phoneForm.formState.errors.phone && (
                <p className="text-red-500 text-sm mt-1">
                  {phoneForm.formState.errors.phone.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* OTP Verification Step */
          <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP sent to {phone}
              </label>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-center text-2xl tracking-widest"
                {...otpForm.register('otp')}
              />
              {otpForm.formState.errors.otp && (
                <p className="text-red-500 text-sm mt-1">
                  {otpForm.formState.errors.otp.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Verify & Login'
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full mt-3 text-gray-600 py-2 hover:text-gray-800 transition"
            >
              Change phone number
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-4 text-sm text-gray-400">or</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        {/* Doctor Registration Link */}
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Are you a doctor?{' '}
            <a href="/register/doctor" className="text-blue-600 font-medium hover:underline">
              Join as Doctor
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
