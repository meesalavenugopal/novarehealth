import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '../../components/ui';
import { Navbar } from '../../components/layout';
import { authFetch } from '../../services/api';
import {
  Calendar,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Phone,
  Clock,
  Video,
  Mic,
  MapPin,
  User,
  Stethoscope,
  ArrowLeft,
  Filter,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

interface Appointment {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  doctor_id: number;
  doctor_name: string;
  specialization: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  appointment_type: string;
  status: string;
  consultation_fee: number;
  patient_notes?: string;
  created_at: string;
}

interface AppointmentListResponse {
  appointments: Appointment[];
  total: number;
}

interface AppointmentStats {
  total_appointments: number;
  today_appointments: number;
  this_week_appointments: number;
  by_status: Record<string, number>;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  no_show: { label: 'No Show', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-cyan-100 text-cyan-700', icon: Play },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
};

const typeIcons: Record<string, React.ElementType> = {
  video: Video,
  audio: Mic,
  in_person: MapPin,
  in_clinic: MapPin,
};

export const AppointmentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedAppointment, setExpandedAppointment] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '');
  const [showFilters, setShowFilters] = useState(false);
  const patientIdFilter = searchParams.get('patient_id') || '';
  const doctorIdFilter = searchParams.get('doctor_id') || '';

  const hasActiveFilters = statusFilter || dateFrom || dateTo || patientIdFilter || doctorIdFilter;

  const clearFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchParams({});
    setPage(0);
  };

  const fetchStats = async () => {
    try {
      const response = await authFetch('/api/v1/admin/appointments/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch {
      console.error('Failed to fetch stats');
    }
  };

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status_filter', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (patientIdFilter) params.append('patient_id', patientIdFilter);
      if (doctorIdFilter) params.append('doctor_id', doctorIdFilter);
      params.append('skip', String(page * limit));
      params.append('limit', String(limit));

      const response = await authFetch(`/api/v1/admin/appointments?${params}`);
      if (response.ok) {
        const data: AppointmentListResponse = await response.json();
        setAppointments(data.appointments);
        setTotal(data.total);
      } else {
        setError('Failed to load appointments');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, patientIdFilter, doctorIdFilter, page]);

  useEffect(() => {
    fetchAppointments();
    fetchStats();
  }, [fetchAppointments]);

  const handleUpdateStatus = async (appointmentId: number, newStatus: string) => {
    setActionLoading(appointmentId);
    try {
      const response = await authFetch(
        `/api/v1/admin/appointments/${appointmentId}/update-status?new_status=${newStatus}`,
        { method: 'POST' }
      );
      if (response.ok) {
        fetchAppointments();
        fetchStats();
      } else {
        setError('Failed to update appointment status');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/dashboard"
              className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Appointment Monitoring</h1>
              <p className="text-slate-500">View and manage all platform appointments</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { fetchAppointments(); fetchStats(); }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_appointments}</p>
                  <p className="text-sm text-slate-500">Total</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.today_appointments}</p>
                  <p className="text-sm text-slate-500">Today</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.by_status?.completed || 0}</p>
                  <p className="text-sm text-slate-500">Completed</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.by_status?.pending || 0}</p>
                  <p className="text-sm text-slate-500">Pending</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-slate-700 font-medium"
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-cyan-500 rounded-full" />
                )}
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Appointments List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No appointments found</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => {
              const statusInfo = statusConfig[apt.status] || statusConfig.pending;
              const TypeIcon = typeIcons[apt.appointment_type] || Video;
              const StatusIcon = statusInfo.icon;

              return (
                <Card key={apt.id} className="overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedAppointment(expandedAppointment === apt.id ? null : apt.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
                          <TypeIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {apt.patient_name} → {apt.doctor_name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {apt.specialization} • {formatDate(apt.scheduled_date)} at {apt.scheduled_time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                        <span className="text-sm font-medium text-slate-900 hidden sm:block">
                          {apt.consultation_fee.toLocaleString()} MZN
                        </span>
                        {expandedAppointment === apt.id ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedAppointment === apt.id && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            Patient: {apt.patient_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{apt.patient_phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{apt.doctor_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{apt.duration} minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            Created: {formatDate(apt.created_at)}
                          </span>
                        </div>
                      </div>

                      {apt.patient_notes && (
                        <div className="mb-4 p-3 bg-white rounded-lg">
                          <p className="text-sm text-slate-500 mb-1">Patient Notes:</p>
                          <p className="text-sm text-slate-700">{apt.patient_notes}</p>
                        </div>
                      )}

                      {/* Status Update Actions */}
                      <div className="flex flex-wrap gap-2">
                        <p className="text-sm font-medium text-slate-700 mr-2">Update Status:</p>
                        {['confirmed', 'completed', 'cancelled', 'no_show'].map((status) => (
                          <Button
                            key={status}
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(apt.id, status)}
                            disabled={actionLoading === apt.id || apt.status === status}
                            className={apt.status === status ? 'opacity-50' : ''}
                          >
                            {actionLoading === apt.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <span className="capitalize">{status.replace('_', ' ')}</span>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsPage;
