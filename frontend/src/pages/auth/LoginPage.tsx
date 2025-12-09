import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import config from '../../config';
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
  AlertCircle,
  Users,
  Star
} from 'lucide-react';
import { authService } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import { getBookingContext, clearBookingContext } from '../../services/api';

// Get country rules for validation messages
const countryRules = config.phone.rules;

// Strict phone validation schema using country-specific rules
const phoneSchema = z.object({
  phone: z.string()
    .refine((val) => {
      const digits = val.replace(/\D/g, '');
      return digits.length >= config.phone.minLength;
    }, `${countryRules.name} phone numbers must be ${countryRules.localLength} digits`)
    .refine((val) => {
      const digits = val.replace(/\D/g, '');
      return digits.length <= config.phone.maxLength;
    }, `${countryRules.name} phone numbers must be ${countryRules.localLength} digits`)
    .refine((val) => {
      const digits = val.replace(/\D/g, '');
      // Validate prefix based on country rules
      if (countryRules.validPrefixes.length > 0) {
        const prefix = digits.slice(0, countryRules.prefixLength);
        return countryRules.validPrefixes.some(p => prefix.startsWith(p));
      }
      return true;
    }, countryRules.description),
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
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Get redirect info from state
  const redirectFrom = location.state?.from;
  const redirectMessage = location.state?.message;
  const returnUrl = location.state?.returnUrl;
  
  // Check for pending booking context
  const pendingBooking = getBookingContext();

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    mode: 'onChange', // Validate on every change for real-time feedback
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

  // Handle phone input with formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Only allow digits and spaces
    const cleaned = input.replace(/[^\d\s]/g, '');
    const digits = cleaned.replace(/\s/g, '');
    
    // Limit to max length
    if (digits.length > config.phone.maxLength) {
      return;
    }
    
    // Format with spaces for display (XX XXX XXXX)
    const formatted = config.phone.formatDisplay(digits);
    setPhoneDisplay(formatted);
    phoneForm.setValue('phone', digits, { shouldValidate: true });
  };

  // Normalize phone: prepend country code from config
  const normalizePhone = (phone: string): string => {
    const digitsOnly = phone.replace(/\D/g, '');
    
    // If already starts with country code, return as-is
    if (digitsOnly.startsWith(config.phone.defaultCountryCode)) {
      return digitsOnly;
    }
    
    // Prepend country code from config
    return `${config.phone.defaultCountryCode}${digitsOnly}`;
  };

  const handleSendOTP = async (data: PhoneFormData) => {
    setIsLoading(true);
    setError('');
    try {
      const normalizedPhone = normalizePhone(data.phone);
      await authService.sendOTPPhone(normalizedPhone);
      setPhone(normalizedPhone);
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
      
      // Check for pending booking context first (guest mode)
      if (pendingBooking?.returnUrl) {
        const bookingReturnUrl = pendingBooking.returnUrl;
        clearBookingContext();
        navigate(bookingReturnUrl);
        return;
      }
      
      // Then check for returnUrl from state (passed from login prompt)
      if (returnUrl) {
        navigate(returnUrl);
        return;
      }
      
      // Redirect to original destination if coming from protected route
      if (redirectFrom) {
        navigate(redirectFrom);
        return;
      }
      
      // Otherwise redirect based on role
      if (response.user.role === 'doctor') {
        // For doctors, check verification status
        try {
          const doctorResponse = await fetch(`${config.apiUrl}/doctors/me`, {
            headers: {
              'Authorization': `Bearer ${response.access_token}`,
            },
          });
          
          if (doctorResponse.ok) {
            const doctorData = await doctorResponse.json();
            if (doctorData.verification_status === 'verified') {
              navigate('/doctor/dashboard');
            } else {
              // pending or rejected - go to verification page
              navigate('/doctor/verification-pending');
            }
          } else {
            // No doctor profile yet, redirect to complete registration
            navigate('/register/doctor');
          }
        } catch {
          // If check fails, default to registration to be safe
          navigate('/register/doctor');
        }
      } else if (response.user.role === 'admin' || response.user.role === 'super_admin') {
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
        <div className="relative z-10 flex gap-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-cyan-200 text-sm">Verified Doctors</p>
            </div>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">50K+</p>
              <p className="text-cyan-200 text-sm">Consultations</p>
            </div>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">4.9</p>
              <p className="text-cyan-200 text-sm">User Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50 relative">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.06]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1920&q=80')`
          }}
        />
        <div className="w-full max-w-md relative z-10">
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
                        <span className="text-slate-600 font-medium">{config.phone.displayPrefix}</span>
                        <div className="w-px h-6 bg-slate-200" />
                      </div>
                      <input
                        type="tel"
                        placeholder={config.phone.placeholder}
                        value={phoneDisplay}
                        onChange={handlePhoneChange}
                        className={`w-full pl-20 pr-4 py-4 border-2 rounded-xl focus:ring-0 outline-none transition text-lg tracking-wide ${
                          phoneForm.formState.errors.phone 
                            ? 'border-red-300 focus:border-red-500' 
                            : phoneDisplay && !phoneForm.formState.errors.phone
                              ? 'border-green-300 focus:border-green-500'
                              : 'border-slate-200 focus:border-cyan-500'
                        }`}
                      />
                      {/* Character count indicator */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        {phoneDisplay.replace(/\s/g, '').length}/{config.phone.maxLength}
                      </div>
                    </div>
                    {phoneForm.formState.errors.phone && (
                      <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {phoneForm.formState.errors.phone.message}
                      </p>
                    )}
                    {/* Format hint */}
                    <p className="text-slate-400 text-xs mt-2">
                      Enter your {config.phone.maxLength}-digit mobile number (e.g., {config.phone.placeholder})
                    </p>
                  </div>

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    disabled={!phoneForm.formState.isValid || phoneDisplay.replace(/\s/g, '').length !== config.phone.maxLength}
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
                    <span className="font-medium text-slate-700">+{phone}</span>
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
