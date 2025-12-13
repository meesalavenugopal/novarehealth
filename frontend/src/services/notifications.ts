/**
 * Notifications API Service
 * Handles in-app notification retrieval and management
 */

import { authFetch } from './api';

export type NotificationType =
  | 'appointment_booked'
  | 'appointment_confirmed'
  | 'appointment_reminder'
  | 'appointment_cancelled'
  | 'appointment_completed'
  | 'new_appointment'
  | 'prescription_ready'
  | 'prescription_updated'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'payment_received'
  | 'review_received'
  | 'doctor_approved'
  | 'doctor_rejected'
  | 'message_received'
  | 'system';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_id?: number;
  related_type?: string;
  extra_data?: Record<string, unknown>;
  created_at: string;
  read_at?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Get all notifications for the current user
 */
export async function getNotifications(
  page: number = 1,
  limit: number = 20,
  unreadOnly: boolean = false
): Promise<NotificationListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    unread_only: unreadOnly.toString(),
  });

  const response = await authFetch(`${API_BASE}/api/v1/notifications?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to fetch notifications');
  }

  return response.json();
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const response = await authFetch(`${API_BASE}/api/v1/notifications/unread-count`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to fetch unread count');
  }

  const data: UnreadCountResponse = await response.json();
  return data.unread_count;
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: number): Promise<Notification> {
  const response = await authFetch(
    `${API_BASE}/api/v1/notifications/${notificationId}/read`,
    {
      method: 'PATCH',
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to mark notification as read');
  }

  return response.json();
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  const response = await authFetch(`${API_BASE}/api/v1/notifications/mark-all-read`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to mark all notifications as read');
  }
}

/**
 * Delete a single notification
 */
export async function deleteNotification(notificationId: number): Promise<void> {
  const response = await authFetch(
    `${API_BASE}/api/v1/notifications/${notificationId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to delete notification');
  }
}

/**
 * Delete all notifications (or only read ones)
 */
export async function deleteAllNotifications(readOnly: boolean = true): Promise<void> {
  const params = new URLSearchParams({ read_only: readOnly.toString() });

  const response = await authFetch(`${API_BASE}/api/v1/notifications?${params}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to delete notifications');
  }
}

/**
 * Get icon name for notification type
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'appointment_booked':
    case 'appointment_confirmed':
      return 'calendar-check';
    case 'appointment_reminder':
      return 'clock';
    case 'appointment_cancelled':
      return 'calendar-x';
    case 'appointment_completed':
      return 'check-circle';
    case 'prescription_ready':
      return 'file-text';
    case 'payment_confirmed':
      return 'credit-card';
    case 'payment_failed':
      return 'alert-circle';
    case 'review_received':
      return 'star';
    case 'doctor_approved':
      return 'badge-check';
    case 'doctor_rejected':
      return 'x-circle';
    case 'system':
    default:
      return 'bell';
  }
}

/**
 * Get color for notification type
 */
export function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'appointment_booked':
    case 'appointment_confirmed':
      return 'text-cyan-600 bg-cyan-50';
    case 'appointment_reminder':
      return 'text-amber-600 bg-amber-50';
    case 'appointment_cancelled':
      return 'text-red-600 bg-red-50';
    case 'appointment_completed':
      return 'text-green-600 bg-green-50';
    case 'prescription_ready':
      return 'text-purple-600 bg-purple-50';
    case 'payment_confirmed':
      return 'text-green-600 bg-green-50';
    case 'payment_failed':
      return 'text-red-600 bg-red-50';
    case 'review_received':
      return 'text-amber-600 bg-amber-50';
    case 'doctor_approved':
      return 'text-green-600 bg-green-50';
    case 'doctor_rejected':
      return 'text-red-600 bg-red-50';
    case 'system':
    default:
      return 'text-slate-600 bg-slate-50';
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else if (diffDay < 7) {
    return `${diffDay}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}
