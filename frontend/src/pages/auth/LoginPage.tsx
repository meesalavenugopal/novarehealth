import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Phone, 
  ArrowRight, 
  Shield, 
  Video, 
  FileText,
  Clock,
  CheckCircle2,
  Stethoscope,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { authService } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';

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
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Get redirect info from state
  const redirectFrom = location.state?.from;
  const redirectMessage = location.state?.message;

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  });

  // Auto-focus first OTP input when step changes
  useEffect(() => {
    if (step === 'otp' && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [step]);

  const handleSendOTP = async (data: PhoneFormData) => {
    setIsLoading(true);
    setError('');
    try {
      await authService.sendOTPPhone(data.phone);
      setPhone(data.phone);
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value.slice(-1);
    setOtpValues(newOtpValues);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newOtpValues.every(v => v) && newOtpValues.join('').length === 6) {
      otpForm.setValue('otp', newOtpValues.join(''));
      handleVerifyOTP({ otp: newOtpValues.join('') });
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
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
      
      // Redirect to original destination if coming from protected route
      if (redirectFrom) {
        navigate(redirectFrom);
        return;
      }
      
      // Otherwise redirect based on role
      if (response.user.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else if (response.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
      setOtpValues(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: <Video className="w-6 h-6" />, title: 'Video Consultations', description: 'Connect with doctors face-to-face from anywhere' },
    { icon: <FileText className="w-6 h-6" />, title: 'Digital Prescriptions', description: 'Receive prescriptions directly on your phone' },
    { icon: <Shield className="w-6 h-6" />, title: 'Secure & Private', description: 'Your health data is encrypted and protected' },
    { icon: <Clock className="w-6 h-6" />, title: '24/7 Availability', description: 'Access healthcare whenever you need it' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">N</span>
            </div>
            <span className="text-2xl font-bold text-white">NovareHealth</span>
          </Link>

          {/* Hero Text */}
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Healthcare at your<br />fingertips
          </h1>
          <p className="text-xl text-cyan-100 mb-12 max-w-md">
            Connect with certified doctors across Africa for video consultations, prescriptions, and more.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                <p className="text-cyan-100 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="relative z-10 flex gap-12">
          <div>
            <p className="text-4xl font-bold text-white">500+</p>
            <p className="text-cyan-100">Verified Doctors</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-white">50K+</p>
            <p className="text-cyan-100">Consultations</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-white">4.9</p>
            <p className="text-cyan-100">User Rating</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                NovareHealth
              </span>
            </Link>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-10 border border-slate-200">
            {step === 'phone' ? (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
                  <p className="text-slate-500 mt-2">Enter your phone number to continue</p>
                </div>

                {/* Redirect Message */}
                {redirectMessage && (
                  <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 border border-amber-200">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {redirectMessage}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 border border-red-100">
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                <form onSubmit={phoneForm.handleSubmit(handleSendOTP)}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400">
                        <span className="text-slate-600 font-medium">+258</span>
                        <div className="w-px h-6 bg-slate-200" />
                      </div>
                      <input
                        type="tel"
                        placeholder="84 123 4567"
                        className="w-full pl-20 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-cyan-500 outline-none transition text-lg"
                        {...phoneForm.register('phone')}
                      />
                    </div>
                    {phoneForm.formState.errors.phone && (
                      <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {phoneForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    fullWidth
                    size="lg"
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Continue
                  </Button>
                </form>

                {/* Trust Indicators */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-green-500" />
                      Secure
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Verified
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-green-500" />
                      Licensed
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtpValues(['', '', '', '', '', '']);
                    setError('');
                  }}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Verify OTP</h2>
                  <p className="text-slate-500 mt-2">
                    Enter the 6-digit code sent to<br />
                    <span className="font-medium text-slate-700">{phone}</span>
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 border border-red-100">
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)}>
                  {/* OTP Input */}
                  <div className="flex gap-3 justify-center mb-8">
                    {otpValues.map((value, index) => (
                      <input
                        key={index}
                        ref={(el) => { otpRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={value}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-cyan-500 outline-none transition"
                      />
                    ))}
                  </div>

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    fullWidth
                    size="lg"
                  >
                    Verify & Login
                  </Button>
                </form>

                {/* Resend OTP */}
                <div className="text-center mt-6">
                  <p className="text-slate-500 text-sm">
                    Didn't receive the code?{' '}
                    <button
                      type="button"
                      onClick={() => handleSendOTP({ phone })}
                      className="text-cyan-600 font-medium hover:underline"
                    >
                      Resend OTP
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Doctor Registration Link */}
          <div className="text-center mt-8">
            <p className="text-slate-600">
              Are you a healthcare professional?{' '}
              <Link to="/register/doctor" className="text-cyan-600 font-semibold hover:underline">
                Join as Doctor
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
