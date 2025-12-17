/**
 * Payment Service - M-Pesa Mozambique Payment Integration
 * 
 * @description Handles all payment-related API calls for the frontend.
 * Integrates with the backend M-Pesa payment gateway module.
 * 
 * @provider M-Pesa Mozambique (Vodacom)
 * @currency MZN (Mozambican Metical)
 */

import { authFetch } from './api';

// ============================================================================
// Payment Status Constants (aligned with backend PaymentStatusEnum)
// ============================================================================

/** All possible payment statuses from backend */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

/** Payment status type derived from constants */
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

/** Terminal statuses - payment is in final state, no more changes expected */
export const TERMINAL_STATUSES: readonly PaymentStatus[] = [
  PAYMENT_STATUS.COMPLETED,
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.CANCELLED,
  PAYMENT_STATUS.EXPIRED,
] as const;

/** Successful terminal status */
export const SUCCESS_STATUSES: readonly PaymentStatus[] = [
  PAYMENT_STATUS.COMPLETED,
] as const;

/** Failed terminal statuses */
export const FAILURE_STATUSES: readonly PaymentStatus[] = [
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.CANCELLED,
  PAYMENT_STATUS.EXPIRED,
] as const;

/** Non-terminal statuses - payment still in progress */
export const PENDING_STATUSES: readonly PaymentStatus[] = [
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.PROCESSING,
] as const;

/** Type guards for status checking */
export const isTerminalStatus = (status: PaymentStatus): boolean => 
  TERMINAL_STATUSES.includes(status);

export const isSuccessStatus = (status: PaymentStatus): boolean => 
  SUCCESS_STATUSES.includes(status);

export const isFailureStatus = (status: PaymentStatus): boolean => 
  FAILURE_STATUSES.includes(status);

export const isPendingStatus = (status: PaymentStatus): boolean => 
  PENDING_STATUSES.includes(status);

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PaymentInitiateRequest {
  phone_number: string;           // Format: 258XXXXXXXXX
  amount: number;                 // Amount in MZN
  account_reference: string;      // Unique reference (e.g., APT-xxx)
  description?: string;           // Payment description
  entity_type?: string;           // e.g., 'appointment', 'consultation'
  entity_id?: string;             // ID of the entity being paid for
  customer_name?: string;         // Customer name for records
  customer_email?: string;        // Customer email for notifications
  idempotency_key?: string;       // Prevent duplicate payments
}

export interface PaymentInitiateResponse {
  success: boolean;
  transaction_id: string;                    // Internal transaction ID
  provider_transaction_id?: string;          // M-Pesa Transaction ID
  conversation_id?: string;                  // M-Pesa Conversation ID
  third_party_reference?: string;            // Third party reference
  status: PaymentStatus;
  message: string;
  phone_number: string;
  amount: number;
  account_reference: string;
  currency: string;
  response_code?: string;                    // M-Pesa response code
  response_description?: string;             // M-Pesa response description
  created_at: string;
  expires_at?: string;
}

export interface PaymentStatusResponse {
  transaction_id: string;
  conversation_id?: string;
  provider_transaction_id?: string;          // M-Pesa Receipt Number
  status: PaymentStatus;
  status_description: string;
  amount: number;
  currency: string;
  fees?: number;
  net_amount?: number;
  phone_number: string;
  account_reference: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  provider: string;
  provider_response_code?: string;
  provider_response_description?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface PaymentError {
  error_code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Payment Service Class
// ============================================================================

class PaymentService {
  private baseUrl = '/api/v1/payments';

  /**
   * Initiate a new M-Pesa C2B payment
   * 
   * @description Sends a payment request to M-Pesa Mozambique.
   * For C2B payments, the customer will receive an STK push on their phone
   * to authorize the payment.
   * 
   * @param request - Payment initiation parameters
   * @returns Payment response with transaction ID and status
   * @throws PaymentError if the request fails
   */
  async initiatePayment(request: PaymentInitiateRequest): Promise<PaymentInitiateResponse> {
    const response = await authFetch(`${this.baseUrl}/initiate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = 'Payment initiation failed';
      try {
        const error = await response.json();
        // Handle both {message: ...} and {detail: {message: ...}} formats
        if (error.detail?.message) {
          errorMessage = error.detail.message;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        }
      } catch {
        errorMessage = `Payment initiation failed (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get the status of a payment transaction
   * 
   * @param transactionId - Internal transaction ID
   * @returns Current payment status
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const response = await authFetch(`${this.baseUrl}/status/${transactionId}`);

    if (!response.ok) {
      const error = await response.json() as PaymentError;
      throw new Error(error.message || 'Failed to get payment status');
    }

    return response.json();
  }

  /**
   * Query payment status directly from M-Pesa
   * 
   * @param conversationId - M-Pesa Conversation ID
   * @returns Current payment status from provider
   */
  async queryPaymentFromProvider(conversationId: string): Promise<PaymentStatusResponse> {
    const response = await authFetch(`${this.baseUrl}/query/${conversationId}`);

    if (!response.ok) {
      const error = await response.json() as PaymentError;
      throw new Error(error.message || 'Failed to query payment status');
    }

    return response.json();
  }

  /**
   * Poll for payment completion
   * 
   * @description Polls the payment status until it's completed, failed, or timeout.
   * Useful for showing real-time payment status to users.
   * 
   * @param transactionId - Internal transaction ID
   * @param options - Polling options
   * @returns Final payment status
   */
  async pollPaymentStatus(
    transactionId: string,
    options: {
      maxAttempts?: number;        // Max polling attempts (default: 30)
      intervalMs?: number;         // Interval between polls (default: 2000ms)
      onStatusChange?: (status: PaymentStatusResponse) => void;
    } = {}
  ): Promise<PaymentStatusResponse> {
    const { maxAttempts = 30, intervalMs = 2000, onStatusChange } = options;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.getPaymentStatus(transactionId);
      
      if (onStatusChange) {
        onStatusChange(status);
      }

      // Check if payment is in a terminal state (use centralized constant)
      if (isTerminalStatus(status.status)) {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }

    // Timeout - return last known status
    return this.getPaymentStatus(transactionId);
  }

  /**
   * Format phone number for M-Pesa Mozambique
   * 
   * @description Ensures phone number is in the correct format (258XXXXXXXXX)
   * 
   * @param phoneNumber - Input phone number
   * @returns Formatted phone number
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // If starts with 0, replace with 258
    if (cleaned.startsWith('0')) {
      cleaned = '258' + cleaned.substring(1);
    }

    // If doesn't start with 258, prepend it
    if (!cleaned.startsWith('258')) {
      cleaned = '258' + cleaned;
    }

    return cleaned;
  }

  /**
   * Generate a unique account reference for a payment
   * 
   * @param entityType - Type of entity (e.g., 'APT' for appointment)
   * @param entityId - ID of the entity
   * @returns Unique account reference
   */
  generateAccountReference(entityType: string, entityId: string | number): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${entityType}-${entityId}-${timestamp}`.substring(0, 20);
  }

  /**
   * Generate idempotency key to prevent duplicate payments
   * 
   * @param entityType - Type of entity
   * @param entityId - ID of the entity
   * @param userId - User ID
   * @returns Unique idempotency key
   */
  generateIdempotencyKey(entityType: string, entityId: string | number, userId: string | number): string {
    const date = new Date().toISOString().split('T')[0];
    return `${entityType}-${entityId}-${userId}-${date}`;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;
