/**
 * Reviews API Service
 * Handles review submission and retrieval
 */

import { authFetch } from './api';

export interface ReviewCreate {
  appointment_id: number;
  rating: number;
  comment?: string;
}

export interface Review {
  id: number;
  appointment_id: number;
  rating: number;
  comment?: string;
  created_at: string;
  patient_name?: string;
}

export interface DoctorReviewsResponse {
  reviews: Review[];
  total: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
}

export interface PatientReview {
  id: number;
  appointment_id: number;
  rating: number;
  comment?: string;
  created_at: string;
  doctor_name: string;
  specialization?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Submit a review for a completed appointment
 */
export async function submitReview(data: ReviewCreate): Promise<Review> {
  const response = await authFetch(`${API_BASE}/api/v1/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to submit review');
  }

  return response.json();
}

/**
 * Get all reviews for a specific doctor
 */
export async function getDoctorReviews(
  doctorId: number,
  page: number = 1,
  limit: number = 10
): Promise<DoctorReviewsResponse> {
  const response = await fetch(
    `${API_BASE}/api/v1/reviews/doctor/${doctorId}?page=${page}&limit=${limit}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to fetch reviews');
  }

  return response.json();
}

/**
 * Get current patient's submitted reviews
 */
export async function getMyReviews(
  page: number = 1,
  limit: number = 10
): Promise<PatientReview[]> {
  const response = await authFetch(
    `${API_BASE}/api/v1/reviews/my-reviews?page=${page}&limit=${limit}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to fetch your reviews');
  }

  return response.json();
}

/**
 * Get review for a specific appointment (if exists)
 */
export async function getAppointmentReview(
  appointmentId: number
): Promise<Review | null> {
  const response = await authFetch(
    `${API_BASE}/api/v1/reviews/appointment/${appointmentId}`
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to fetch review');
  }

  const data = await response.json();
  return data || null;
}

/**
 * Get AI-suggested review based on rating and doctor info
 */
export async function getAIReviewSuggestion(
  doctorName: string,
  rating: number,
  specialization?: string
): Promise<string> {
  const response = await authFetch(`${API_BASE}/api/v1/ai/suggest-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctor_name: doctorName,
      rating,
      specialization,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to get AI suggestion');
  }

  const data = await response.json();
  return data.suggestion;
}

/**
 * Rephrase a review in a different style
 */
export async function rephraseReview(
  reviewText: string,
  style: 'professional' | 'casual' | 'concise' | 'detailed' = 'professional'
): Promise<string> {
  const response = await authFetch(`${API_BASE}/api/v1/ai/rephrase-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      review_text: reviewText,
      style,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to rephrase review');
  }

  const data = await response.json();
  return data.rephrased;
}
