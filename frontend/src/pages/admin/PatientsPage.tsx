import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '../../components/ui';
import { Navbar } from '../../components/layout';
import { authFetch } from '../../services/api';
import {
  Users,
  Search,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Calendar,
  Activity,
  UserCheck,
  UserX,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Patient {
  id: number;
  phone: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login?: string;
  total_appointments: number;
}

interface PatientListResponse {
  patients: Patient[];
  total: number;
}

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (activeFilter === 'active') params.append('is_active', 'true');
      if (activeFilter === 'inactive') params.append('is_active', 'false');
      params.append('skip', String(page * limit));
      params.append('limit', String(limit));

      const response = await authFetch(`/api/v1/admin/patients?${params}`);
      if (response.ok) {
        const data: PatientListResponse = await response.json();
        setPatients(data.patients);
        setTotal(data.total);
      } else {
        setError('Failed to load patients');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter, page]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleToggleActive = async (patientId: number) => {
    setActionLoading(patientId);
    try {
      const response = await authFetch(`/api/v1/admin/patients/${patientId}/toggle-active`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchPatients();
      } else {
        setError('Failed to update patient status');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
              <h1 className="text-2xl font-bold text-slate-900">Patient Management</h1>
              <p className="text-slate-500">View and manage platform patients</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchPatients} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{total}</p>
                <p className="text-sm text-slate-500">Total Patients</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {patients.filter(p => p.is_active).length}
                </p>
                <p className="text-sm text-slate-500">Active</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {patients.filter(p => !p.is_active).length}
                </p>
                <p className="text-sm text-slate-500">Inactive</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'inactive'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    setPage(0);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                    activeFilter === filter
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Patient List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No patients found</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {patients.map((patient) => (
              <Card key={patient.id} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedPatient(expandedPatient === patient.id ? null : patient.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {(patient.first_name?.[0] || patient.phone[0]).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {patient.first_name || patient.last_name
                            ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
                            : 'Unnamed Patient'}
                        </p>
                        <p className="text-sm text-slate-500">{patient.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-slate-900">
                          {patient.total_appointments} appointments
                        </p>
                        <p className="text-xs text-slate-500">
                          Joined {formatDate(patient.created_at)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        patient.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {patient.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {expandedPatient === patient.id ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedPatient === patient.id && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">{patient.phone}</span>
                      </div>
                      {patient.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{patient.email}</span>
                        </div>
                      )}
                      {patient.date_of_birth && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{patient.date_of_birth}</span>
                        </div>
                      )}
                      {patient.gender && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700 capitalize">{patient.gender}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          Last login: {patient.last_login ? formatDate(patient.last_login) : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {patient.is_verified ? 'Verified' : 'Not Verified'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant={patient.is_active ? 'danger' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleActive(patient.id)}
                        disabled={actionLoading === patient.id}
                      >
                        {actionLoading === patient.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : patient.is_active ? (
                          <>
                            <UserX className="w-4 h-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Link to={`/admin/appointments?patient_id=${patient.id}`}>
                        <Button variant="outline" size="sm">
                          <Calendar className="w-4 h-4 mr-1" />
                          View Appointments
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </Card>
            ))}
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

export default PatientsPage;
