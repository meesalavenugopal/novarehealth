/**
 * Notifications Page
 * Full page view of all user notifications
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Star,
  AlertCircle,
  XCircle,
  BadgeCheck,
  ChevronLeft,
} from 'lucide-react';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  formatRelativeTime,
  type Notification,
  type NotificationType,
} from '../../services/notifications';

// Get icon component for notification type
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'appointment_booked':
    case 'appointment_confirmed':
      return <Calendar className="w-5 h-5" />;
    case 'appointment_reminder':
      return <Clock className="w-5 h-5" />;
    case 'appointment_cancelled':
      return <XCircle className="w-5 h-5" />;
    case 'appointment_completed':
      return <Check className="w-5 h-5" />;
    case 'prescription_ready':
      return <FileText className="w-5 h-5" />;
    case 'payment_confirmed':
      return <CreditCard className="w-5 h-5" />;
    case 'payment_failed':
      return <AlertCircle className="w-5 h-5" />;
    case 'review_received':
      return <Star className="w-5 h-5" />;
    case 'doctor_approved':
      return <BadgeCheck className="w-5 h-5" />;
    case 'doctor_rejected':
      return <XCircle className="w-5 h-5" />;
    case 'system':
    default:
      return <Bell className="w-5 h-5" />;
  }
}

// Get color classes for notification type
function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'appointment_booked':
    case 'appointment_confirmed':
      return 'text-cyan-600 bg-cyan-50';
    case 'appointment_reminder':
      return 'text-amber-600 bg-amber-50';
    case 'appointment_cancelled':
    case 'payment_failed':
    case 'doctor_rejected':
      return 'text-red-600 bg-red-50';
    case 'appointment_completed':
    case 'payment_confirmed':
    case 'doctor_approved':
      return 'text-green-600 bg-green-50';
    case 'prescription_ready':
      return 'text-purple-600 bg-purple-50';
    case 'review_received':
      return 'text-amber-600 bg-amber-50';
    case 'system':
    default:
      return 'text-slate-600 bg-slate-50';
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch notifications
  const fetchNotifications = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await getNotifications(pageNum, 20, filter === 'unread');
      
      if (append) {
        setNotifications(prev => [...prev, ...response.notifications]);
      } else {
        setNotifications(response.notifications);
      }
      
      setTotal(response.total);
      setUnreadCount(response.unread_count);
      setHasMore(response.notifications.length === 20);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchNotifications(1);
  }, [filter]);

  // Handle mark as read
  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;

    try {
      await markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Handle delete notification
  const handleDelete = async (id: number) => {
    try {
      await deleteNotification(id);
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(prev => prev - 1);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Handle clear all read notifications
  const handleClearRead = async () => {
    try {
      await deleteAllNotifications(true);
      setNotifications(prev => prev.filter(n => !n.is_read));
      fetchNotifications(1);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  // Load more
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-teal-50/20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
              <p className="text-slate-600 mt-1">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'} • {total} total
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all read
                </button>
              )}
              {notifications.some(n => n.is_read) && (
                <button
                  onClick={handleClearRead}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === 'all'
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === 'unread'
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-slate-500">
                {filter === 'unread'
                  ? "You're all caught up!"
                  : "When you have notifications, they'll appear here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 transition-colors ${
                    !notification.is_read ? 'bg-cyan-50/30' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={`font-medium ${
                              notification.is_read ? 'text-slate-700' : 'text-slate-900'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-slate-600 text-sm mt-0.5">{notification.message}</p>
                          <p className="text-slate-400 text-xs mt-2">
                            {formatRelativeTime(notification.created_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification)}
                              className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && notifications.length > 0 && (
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-2 text-cyan-600 font-medium hover:bg-cyan-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
