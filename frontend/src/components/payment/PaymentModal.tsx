/**
 * PaymentModal - M-Pesa Payment Modal Component
 * 
 * @description A modal component for processing M-Pesa payments.
 * Shows payment form, processing status, and result.
 * 
 * @provider M-Pesa Mozambique (Vodacom)
 * @currency MZN (Mozambican Metical)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  Phone, 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Smartphone,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { paymentService } from '../../services/payment';
import type { PaymentInitiateResponse, PaymentStatusResponse } from '../../services/payment';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PaymentDetails {
  amount: number;                    // Amount in MZN
  description: string;               // Payment description
  entityType: string;                // e.g., 'appointment'
  entityId: string | number;         // Entity ID
  customerName?: string;             // Customer name
  customerEmail?: string;            // Customer email
  doctorName?: string;               // Doctor name for display
  scheduledDate?: string;            // Appointment date for display
  scheduledTime?: string;            // Appointment time for display
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transactionId: string) => void;
  onFailure?: (error: string) => void;
  paymentDetails: PaymentDetails;
  defaultPhoneNumber?: string;
}

type PaymentState = 'input' | 'processing' | 'polling' | 'success' | 'failed' | 'timeout';

// ============================================================================
// Component
// ============================================================================

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  onFailure,
  paymentDetails,
  defaultPhoneNumber = '',
}: PaymentModalProps) {
  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const [paymentState, setPaymentState] = useState<PaymentState>('input');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentResponse, setPaymentResponse] = useState<PaymentInitiateResponse | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const prevIsOpenRef = useRef(false);

  // ─────────────────────────────────────────────────────────────
  // Reset state when modal opens (using ref to avoid setState in effect)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Only reset when transitioning from closed to open
    if (isOpen && !prevIsOpenRef.current) {
      // Schedule state updates for next tick to avoid synchronous setState in effect
      queueMicrotask(() => {
        setPaymentState('input');
        setTransactionId(null);
        setErrorMessage(null);
        setPaymentResponse(null);
        setPollCount(0);
        setPhoneError(null);
        if (defaultPhoneNumber) {
          setPhoneNumber(defaultPhoneNumber);
        }
      });
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, defaultPhoneNumber]);

  // ─────────────────────────────────────────────────────────────
  // Phone number validation
  // ─────────────────────────────────────────────────────────────
  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    
    // Must be 12 digits starting with 258
    if (cleaned.length === 12 && cleaned.startsWith('258')) {
      setPhoneError(null);
      return true;
    }
    
    // Must be 9 digits (will prepend 258)
    if (cleaned.length === 9) {
      setPhoneError(null);
      return true;
    }
    
    // Must be 10 digits starting with 0 (will replace 0 with 258)
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      setPhoneError(null);
      return true;
    }

    setPhoneError('Please enter a valid Mozambique phone number (e.g., 843330333 or 258843330333)');
    return false;
  };

  // ─────────────────────────────────────────────────────────────
  // Initiate Payment
  // ─────────────────────────────────────────────────────────────
  const handleInitiatePayment = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      return;
    }

    setPaymentState('processing');
    setErrorMessage(null);

    try {
      const formattedPhone = paymentService.formatPhoneNumber(phoneNumber);
      const accountReference = paymentService.generateAccountReference(
        paymentDetails.entityType.toUpperCase().substring(0, 3),
        paymentDetails.entityId
      );

      const response = await paymentService.initiatePayment({
        phone_number: formattedPhone,
        amount: paymentDetails.amount,
        account_reference: accountReference,
        description: paymentDetails.description,
        entity_type: paymentDetails.entityType,
        entity_id: String(paymentDetails.entityId),
        customer_name: paymentDetails.customerName,
        customer_email: paymentDetails.customerEmail,
      });

      setPaymentResponse(response);
      setTransactionId(response.transaction_id);

      if (response.success && response.status === 'completed') {
        // Payment completed immediately (rare for C2B)
        setPaymentState('success');
        onSuccess(response.transaction_id);
      } else if (response.success) {
        // Payment initiated, start polling
        setPaymentState('polling');
        startPolling(response.transaction_id);
      } else {
        // Payment failed
        setPaymentState('failed');
        setErrorMessage(response.message || 'Payment initiation failed');
        onFailure?.(response.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentState('failed');
      const message = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      setErrorMessage(message);
      onFailure?.(message);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Poll for Payment Status
  // ─────────────────────────────────────────────────────────────
  const startPolling = useCallback(async (txnId: string) => {
    try {
      const status = await paymentService.pollPaymentStatus(txnId, {
        maxAttempts: 60,  // Poll for up to 2 minutes
        intervalMs: 2000, // Every 2 seconds
        onStatusChange: (status: PaymentStatusResponse) => {
          setPollCount(prev => prev + 1);
          
          if (status.status === 'completed') {
            setPaymentState('success');
            onSuccess(txnId);
          } else if (status.status === 'failed' || status.status === 'cancelled' || status.status === 'expired') {
            setPaymentState('failed');
            setErrorMessage(status.status_description || 'Payment failed');
            onFailure?.(status.status_description || 'Payment failed');
          }
        },
      });

      // Handle final status after polling completes
      if (status.status === 'pending' || status.status === 'processing') {
        setPaymentState('timeout');
        setErrorMessage('Payment is still processing. Please check your M-Pesa for confirmation.');
      }
    } catch (error) {
      console.error('Polling error:', error);
      setPaymentState('timeout');
      setErrorMessage('Unable to verify payment status. Please check your M-Pesa app.');
    }
  }, [onSuccess, onFailure]);

  // ─────────────────────────────────────────────────────────────
  // Retry Payment
  // ─────────────────────────────────────────────────────────────
  const handleRetry = () => {
    setPaymentState('input');
    setErrorMessage(null);
    setPollCount(0);
  };

  // ─────────────────────────────────────────────────────────────
  // Don't render if not open
  // ─────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  // ─────────────────────────────────────────────────────────────
  // Render Content Based on State
  // ─────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (paymentState) {
      case 'input':
        return (
          <>
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-6 text-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">M-Pesa Payment</h2>
                  <p className="text-emerald-100 text-sm">Vodacom Mozambique</p>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <p className="text-sm text-slate-500 mb-2">Payment for:</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{paymentDetails.doctorName || 'Consultation'}</p>
                  <p className="text-sm text-slate-600">{paymentDetails.description}</p>
                  {paymentDetails.scheduledDate && (
                    <p className="text-sm text-cyan-600 mt-1">
                      📅 {paymentDetails.scheduledDate} {paymentDetails.scheduledTime && `at ${paymentDetails.scheduledTime}`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    {paymentDetails.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500">MZN</p>
                </div>
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                M-Pesa Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setPhoneError(null);
                  }}
                  placeholder="843330333 or 258843330333"
                  className={`block w-full pl-10 pr-4 py-3 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    phoneError 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                />
              </div>
              {phoneError && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {phoneError}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                You will receive an M-Pesa prompt on this number to authorize the payment.
              </p>

              {/* Pay Button */}
              <button
                onClick={handleInitiatePayment}
                disabled={!phoneNumber}
                className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Pay {paymentDetails.amount.toLocaleString()} MZN</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </>
        );

      case 'processing':
        return (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Initiating Payment
            </h3>
            <p className="text-slate-600">
              Please wait while we connect to M-Pesa...
            </p>
          </div>
        );

      case 'polling':
        return (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-10 h-10 text-amber-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Waiting for M-Pesa Confirmation
            </h3>
            <p className="text-slate-600 mb-4">
              Please check your phone and enter your M-Pesa PIN to authorize the payment.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking payment status... ({pollCount})</span>
            </div>
            {paymentResponse && (
              <p className="mt-4 text-xs text-slate-400">
                Transaction ID: {paymentResponse.transaction_id}
              </p>
            )}
          </div>
        );

      case 'success':
        return (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Payment Successful!
            </h3>
            <p className="text-slate-600 mb-4">
              Your payment of <strong>{paymentDetails.amount.toLocaleString()} MZN</strong> has been received.
            </p>
            {transactionId && (
              <p className="text-sm text-slate-500 mb-6">
                Transaction ID: {transactionId}
              </p>
            )}
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all"
            >
              Continue
            </button>
          </div>
        );

      case 'failed':
        return (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Payment Failed
            </h3>
            <p className="text-slate-600 mb-4">
              {errorMessage || 'There was a problem processing your payment.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-slate-300 text-slate-700 py-3 px-6 rounded-xl font-semibold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        );

      case 'timeout':
        return (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Payment Status Unknown
            </h3>
            <p className="text-slate-600 mb-4">
              {errorMessage || 'We couldn\'t confirm your payment status. Please check your M-Pesa messages.'}
            </p>
            {transactionId && (
              <p className="text-sm text-slate-500 mb-6">
                Transaction ID: {transactionId}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-slate-300 text-slate-700 py-3 px-6 rounded-xl font-semibold hover:bg-slate-50 transition-all"
              >
                Close
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={paymentState === 'input' || paymentState === 'success' || paymentState === 'failed' || paymentState === 'timeout' ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
        {renderContent()}
      </div>
    </div>
  );
}
