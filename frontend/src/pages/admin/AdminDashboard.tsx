import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { Navbar } from '../../components/layout';
import { authFetch } from '../../services/api';
import {
  Users,
  UserX,
  Clock,
  Stethoscope,
  Calendar,
  Filter,
  X,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Award,
  GraduationCap,
  Languages,
  Search,
  Ban,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Activity,
} from 'lucide-react';

interface Doctor {
  id: number;
  user_id: number;
  user: {
    id: number;
    phone: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    created_at: string;
  };
  specialization?: {
    id: number;
    name: string;
  };
  license_number: string;
  experience_years: number;
  education?: Array<{ degree: string; institution: string; year: string }>;
  languages?: string[];
  bio?: string;
  consultation_fee: number;
  verification_status: string;
  government_id_url?: string;
  medical_certificate_url?: string;
  created_at: string;
  verified_at?: string;
  rejection_reason?: string;
  rating?: number;
  total_reviews?: number;
}

interface Stats {
  total_doctors: number;
  pending_doctors: number;
  verified_doctors: number;
  rejected_doctors: number;
  total_patients: number;
  total_appointments: number;
  today_appointments: number;
}

interface Specialization {
  id: number;
  name: string;
}

type TabType = 'all' | 'pending' | 'verified' | 'rejected';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [expandedDoctor, setExpandedDoctor] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('');
  const [experienceFilter, setExperienceFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total_doctors: 0,
    pending_doctors: 0,
    verified_doctors: 0,
    rejected_doctors: 0,
    total_patients: 0,
    total_appointments: 0,
    today_appointments: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const response = await authFetch('http://localhost:8000/api/v1/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchSpecializations = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/doctors/specializations/all');
      if (response.ok) {
        const data = await response.json();
        setSpecializations(data);
      }
    } catch (err) {
      console.error('Failed to fetch specializations:', err);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('status', activeTab);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (selectedSpecialization) {
        params.append('specialization_id', selectedSpecialization);
      }
      params.append('limit', '100');

      const url = 'http://localhost:8000/api/v1/admin/doctors?' + params.toString();
      const response = await authFetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }

      let data = await response.json();
      
      // Apply experience filter on frontend
      if (experienceFilter) {
        data = data.filter((doctor: Doctor) => {
          const exp = doctor.experience_years;
          switch (experienceFilter) {
            case '0-2': return exp >= 0 && exp <= 2;
            case '3-5': return exp >= 3 && exp <= 5;
            case '6-10': return exp >= 6 && exp <= 10;
            case '10+': return exp > 10;
            default: return true;
          }
        });
      }
      
      setDoctors(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, selectedSpecialization, experienceFilter]);

  useEffect(() => {
    fetchStats();
    fetchSpecializations();
  }, [fetchStats, fetchSpecializations]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const clearFilters = () => {
    setSelectedSpecialization('');
    setExperienceFilter('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedSpecialization || experienceFilter || searchQuery;

  const handleApprove = async (doctorId: number) => {
    try {
      setActionLoading(doctorId);
      const url = 'http://localhost:8000/api/v1/admin/doctors/' + doctorId + '/verify?approved=true';
      const response = await authFetch(url, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to approve doctor');
      }

      await fetchDoctors();
      await fetchStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve doctor';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedDoctor) return;

    try {
      setActionLoading(selectedDoctor.id);
      const params = new URLSearchParams({ approved: 'false' });
      if (rejectionReason) {
        params.append('rejection_reason', rejectionReason);
      }

      const url = 'http://localhost:8000/api/v1/admin/doctors/' + selectedDoctor.id + '/verify?' + params.toString();
      const response = await authFetch(url, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to reject doctor');
      }

      await fetchDoctors();
      await fetchStats();
      setShowRejectModal(false);
      setSelectedDoctor(null);
      setRejectionReason('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject doctor';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowRejectModal(true);
  };

  const openSuspendModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowSuspendModal(true);
  };

  const handleSuspend = async () => {
    if (!selectedDoctor) return;

    try {
      setActionLoading(selectedDoctor.id);
      const params = new URLSearchParams();
      if (suspendReason) {
        params.append('reason', suspendReason);
      }

      const url = 'http://localhost:8000/api/v1/admin/doctors/' + selectedDoctor.id + '/suspend?' + params.toString();
      const response = await authFetch(url, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to suspend doctor');
      }

      await fetchDoctors();
      await fetchStats();
      setShowSuspendModal(false);
      setSelectedDoctor(null);
      setSuspendReason('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to suspend doctor';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnsuspend = async (doctorId: number) => {
    try {
      setActionLoading(doctorId);
      const url = 'http://localhost:8000/api/v1/admin/doctors/' + doctorId + '/unsuspend';
      const response = await authFetch(url, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to unsuspend doctor');
      }

      await fetchDoctors();
      await fetchStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsuspend doctor';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReApprove = async (doctorId: number) => {
    try {
      setActionLoading(doctorId);
      const url = 'http://localhost:8000/api/v1/admin/doctors/' + doctorId + '/verify?approved=true';
      const response = await authFetch(url, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to re-approve doctor');
      }

      await fetchDoctors();
      await fetchStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to re-approve doctor';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const isSuspended = (doctor: Doctor) => {
    return doctor.verification_status === 'verified' && 
           doctor.rejection_reason?.startsWith('[SUSPENDED]');
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const toggleExpand = (doctorId: number) => {
    setExpandedDoctor(expandedDoctor === doctorId ? null : doctorId);
  };

  const getStatusBadge = (status: string, doctor?: Doctor) => {
    // Check if doctor is suspended (verified but has [SUSPENDED] in rejection_reason)
    if (doctor && isSuspended(doctor)) {
      return (
        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
          Suspended
        </span>
      );
    }
    
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            Pending
          </span>
        );
      case 'verified':
        return (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
    onClick,
    active,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
    active?: boolean;
  }) => (
    <Card 
      className={'p-6 cursor-pointer transition-all ' + (onClick ? 'hover:shadow-md ' : '') + (active ? 'ring-2 ring-cyan-500 ring-offset-2' : '')}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={'w-12 h-12 rounded-xl flex items-center justify-center ' + color}>
          {icon}
        </div>
      </div>
    </Card>
  );

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'all', label: 'All Doctors', count: stats.total_doctors },
    { id: 'pending', label: 'Pending', count: stats.pending_doctors },
    { id: 'verified', label: 'Verified', count: stats.verified_doctors },
    { id: 'rejected', label: 'Rejected', count: stats.rejected_doctors },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage doctors, patients, and platform operations</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Pending Verification"
              value={stats.pending_doctors}
              icon={<Clock className="w-6 h-6 text-amber-600" />}
              color="bg-amber-100"
              onClick={() => setActiveTab('pending')}
              active={activeTab === 'pending'}
            />
            <StatCard
              title="Today's Appointments"
              value={stats.today_appointments}
              icon={<Calendar className="w-6 h-6 text-green-600" />}
              color="bg-green-100"
            />
            <StatCard
              title="Total Patients"
              value={stats.total_patients}
              icon={<Users className="w-6 h-6 text-cyan-600" />}
              color="bg-cyan-100"
            />
            <StatCard
              title="Total Appointments"
              value={stats.total_appointments}
              icon={<Calendar className="w-6 h-6 text-purple-600" />}
              color="bg-purple-100"
            />
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-cyan-200 group"
              onClick={() => navigate('/admin/patients')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Manage Patients</h3>
                    <p className="text-sm text-gray-500">View and manage patient accounts</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Card>
            
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-cyan-200 group"
              onClick={() => navigate('/admin/appointments')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">All Appointments</h3>
                    <p className="text-sm text-gray-500">Monitor all appointments</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Card>
            
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-cyan-200 group"
              onClick={() => navigate('/admin/specializations')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Specializations</h3>
                    <p className="text-sm text-gray-500">Manage doctor specializations</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Card>
          </div>

          {/* Manage Doctors Section */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Manage Doctors</h2>
                  <p className="text-sm text-gray-500">Review and manage doctor registrations</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search doctors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent w-48"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={'flex items-center gap-2 ' + (hasActiveFilters ? 'border-cyan-500 text-cyan-600' : '')}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { fetchDoctors(); fetchStats(); }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Specialization</label>
                    <select
                      value={selectedSpecialization}
                      onChange={(e) => setSelectedSpecialization(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                    >
                      <option value="">All Specializations</option>
                      {specializations.map((spec) => (
                        <option key={spec.id} value={spec.id.toString()}>
                          {spec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Experience</label>
                    <select
                      value={experienceFilter}
                      onChange={(e) => setExperienceFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                    >
                      <option value="">All Experience</option>
                      <option value="0-2">0-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="6-10">6-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                  </div>
                  {hasActiveFilters && (
                    <div className="min-w-[140px]">
                      <label className="block text-xs font-medium text-transparent mb-1">Action</label>
                      <button
                        onClick={clearFilters}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={'px-4 py-3 text-sm font-medium border-b-2 transition-colors ' + 
                      (activeTab === tab.id
                        ? 'text-cyan-600 border-cyan-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300')}
                  >
                    {tab.label}
                    <span className={'ml-2 px-2 py-0.5 text-xs rounded-full ' + 
                      (activeTab === tab.id
                        ? 'bg-cyan-100 text-cyan-600'
                        : 'bg-gray-100 text-gray-500')}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
                <span className="ml-3 text-gray-600">Loading doctors...</span>
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Doctors Found</h3>
                <p className="text-gray-500">
                  {searchQuery 
                    ? 'No doctors match your search criteria' 
                    : activeTab === 'pending'
                    ? 'There are no pending doctor verifications'
                    : activeTab === 'verified'
                    ? 'No doctors have been verified yet'
                    : activeTab === 'rejected'
                    ? 'No doctors have been rejected'
                    : 'No doctors registered yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
                  >
                    {/* Doctor Header */}
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer bg-white hover:bg-gray-50"
                      onClick={() => toggleExpand(doctor.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {(doctor.user?.first_name?.[0] || 'D').toUpperCase()}
                          {(doctor.user?.last_name?.[0] || '').toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              Dr. {doctor.user?.first_name || 'Unknown'} {doctor.user?.last_name || ''}
                            </h3>
                            {getStatusBadge(doctor.verification_status, doctor)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span>{doctor.specialization?.name || 'General Practice'}</span>
                            <span>•</span>
                            <span>{doctor.experience_years} years exp.</span>
                            <span>•</span>
                            <span>₹{doctor.consultation_fee}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {doctor.verification_status === 'pending' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleApprove(doctor.id);
                              }}
                              disabled={actionLoading === doctor.id}
                              className="flex items-center gap-1"
                            >
                              {actionLoading === doctor.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                openRejectModal(doctor);
                              }}
                              disabled={actionLoading === doctor.id}
                              className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </>
                        )}
                        {/* Verified doctors - can be suspended */}
                        {doctor.verification_status === 'verified' && !isSuspended(doctor) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              openSuspendModal(doctor);
                            }}
                            disabled={actionLoading === doctor.id}
                            className="flex items-center gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            {actionLoading === doctor.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                            Suspend
                          </Button>
                        )}
                        {/* Suspended doctors - can be unsuspended */}
                        {isSuspended(doctor) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleUnsuspend(doctor.id);
                            }}
                            disabled={actionLoading === doctor.id}
                            className="flex items-center gap-1 text-green-600 border-green-200 hover:bg-green-50"
                          >
                            {actionLoading === doctor.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="w-4 h-4" />
                            )}
                            Unsuspend
                          </Button>
                        )}
                        {/* Rejected doctors - can be re-approved */}
                        {doctor.verification_status === 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleReApprove(doctor.id);
                            }}
                            disabled={actionLoading === doctor.id}
                            className="flex items-center gap-1 text-green-600 border-green-200 hover:bg-green-50"
                          >
                            {actionLoading === doctor.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                            Re-Approve
                          </Button>
                        )}
                        {expandedDoctor === doctor.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedDoctor === doctor.id && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Contact Info */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              Contact Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <p className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-4 h-4 text-gray-400" />
                                {doctor.user?.phone || 'N/A'}
                              </p>
                              <p className="flex items-center gap-2 text-gray-600">
                                <Mail className="w-4 h-4 text-gray-400" />
                                {doctor.user?.email || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* License Info */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <Award className="w-4 h-4 text-gray-400" />
                              License Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <p className="text-gray-600">
                                <span className="text-gray-500">License #:</span> {doctor.license_number}
                              </p>
                              <p className="text-gray-600">
                                <span className="text-gray-500">Registered:</span> {formatDate(doctor.created_at)}
                              </p>
                              {doctor.verified_at && (
                                <p className="text-gray-600">
                                  <span className="text-gray-500">Verified:</span> {formatDate(doctor.verified_at)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Education */}
                          {doctor.education && doctor.education.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-gray-400" />
                                Education
                              </h4>
                              <div className="space-y-2">
                                {doctor.education.map((edu, idx) => (
                                  <div key={idx} className="text-sm text-gray-600">
                                    <p className="font-medium">{edu.degree}</p>
                                    <p className="text-gray-500">{edu.institution} • {edu.year}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Languages */}
                          {doctor.languages && doctor.languages.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <Languages className="w-4 h-4 text-gray-400" />
                                Languages
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {doctor.languages.map((lang, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                                  >
                                    {lang}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bio */}
                          {doctor.bio && (
                            <div className="md:col-span-2">
                              <h4 className="font-medium text-gray-900 mb-3">About</h4>
                              <p className="text-sm text-gray-600">{doctor.bio}</p>
                            </div>
                          )}

                          {/* Rejection Reason */}
                          {doctor.verification_status === 'rejected' && doctor.rejection_reason && (
                            <div className="md:col-span-2">
                              <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                                <XCircle className="w-4 h-4" />
                                Rejection Reason
                              </h4>
                              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                {doctor.rejection_reason}
                              </p>
                            </div>
                          )}

                          {/* Documents */}
                          <div className="md:col-span-2">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              Verification Documents
                            </h4>
                            <div className="flex flex-wrap gap-3">
                              {doctor.government_id_url ? (
                                <a
                                  href={doctor.government_id_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  <FileText className="w-4 h-4" />
                                  Government ID
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-400">
                                  <FileText className="w-4 h-4" />
                                  No Government ID
                                </span>
                              )}
                              {doctor.medical_certificate_url ? (
                                <a
                                  href={doctor.medical_certificate_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  <FileText className="w-4 h-4" />
                                  Medical Certificate
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-400">
                                  <FileText className="w-4 h-4" />
                                  No Medical Certificate
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Reject Doctor</h3>
                <p className="text-sm text-gray-500">
                  Dr. {selectedDoctor.user?.first_name} {selectedDoctor.user?.last_name}
                </p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection (optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedDoctor(null);
                  setRejectionReason('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={actionLoading === selectedDoctor.id}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading === selectedDoctor.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Reject Doctor
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Ban className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Suspend Doctor</h3>
                <p className="text-sm text-gray-500">
                  Dr. {selectedDoctor.user?.first_name} {selectedDoctor.user?.last_name}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This will temporarily disable the doctor's ability to accept new patients. 
              They will not be visible in search results.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for suspension (optional)
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Provide a reason for suspension..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedDoctor(null);
                  setSuspendReason('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSuspend}
                disabled={actionLoading === selectedDoctor.id}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {actionLoading === selectedDoctor.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Suspend Doctor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
