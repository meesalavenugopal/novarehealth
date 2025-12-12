import { X, LogIn, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveBookingContext } from '../../services/api';
import type { BookingContext } from '../../services/api';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingContext?: BookingContext;
  title?: string;
  message?: string;
}

export default function LoginPromptModal({
  isOpen,
  onClose,
  bookingContext,
  title = 'Login Required',
  message = 'Please login or create an account to continue with your booking.',
}: LoginPromptModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    // Save booking context if provided
    if (bookingContext) {
      saveBookingContext({
        ...bookingContext,
        returnUrl: window.location.pathname,
      });
    }
    
    onClose();
    navigate('/login', { 
      state: { 
        returnUrl: bookingContext?.returnUrl || window.location.pathname,
        message: 'Please login to continue with your booking'
      } 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-cyan-500 to-teal-600 px-6 py-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          <p className="text-cyan-100">{message}</p>
        </div>
        
        {/* Booking context preview */}
        {bookingContext && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <p className="text-sm text-slate-500 mb-2">Your selected consultation:</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {bookingContext.doctorName?.[0]?.toUpperCase() || 'D'}
                </span>
              </div>
              <div>
                <p className="font-medium text-slate-900">{bookingContext.doctorName}</p>
                <p className="text-sm text-cyan-600">{bookingContext.specializationName}</p>
              </div>
              {bookingContext.consultationFee && (
                <div className="ml-auto text-right">
                  <p className="font-bold text-slate-900">{bookingContext.consultationFee.toLocaleString()} MZN</p>
                </div>
              )}
            </div>
            {bookingContext.selectedSlotTime && (
              <div className="mt-2 text-sm text-slate-600">
                📅 {bookingContext.selectedDate} at {bookingContext.selectedSlotTime}
              </div>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="p-6 space-y-3">
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium"
          >
            <LogIn className="w-5 h-5" />
            Login to Continue
          </button>
        </div>
      </div>
    </div>
  );
}
