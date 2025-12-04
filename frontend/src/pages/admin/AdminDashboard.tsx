import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button, Card } from '../../components/ui';
import { Navbar } from '../../components/layout';
import { authFetch } from '../../services/api';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Stethoscope,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Award,
  GraduationCap,
  Languages,
  Image,
} from 'lucide-react';

interface PendingDoctor {
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
}

interface Stats {
  total_doctors: number;
  pending_doctors: number;
  verified_doctors: number;
  rejected_doctors: number;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<PendingDoctor | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [expandedDoctor, setExpandedDoctor] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>({
    total_doctors: 0,
    pending_doctors: 0,
    verified_doctors: 0,
    rejected_doctors: 0,
  });

  const fetchPendingDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch('http://localhost:8000/api/v1/admin/doctors/pending');

      if (!response.ok) {
        throw new Error('Failed to fetch pending doctors');
      }

      const data = await response.json();
      setPendingDoctors(data);
      setStats(prev => ({ ...prev, pending_doctors: data.length }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingDoctors();
  }, [fetchPendingDoctors]);

  const handleApprove = async (doctorId: number) => {
    try {
      setActionLoading(doctorId);
      const response = await authFetch(
        `http://localhost:8000/api/v1/admin/doctors/${doctorId}/verify?approved=true`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve doctor');
      }

      // Remove from pending list
      setPendingDoctors(prev => prev.filter(d => d.id !== doctorId));
      setStats(prev => ({
        ...prev,
        pending_doctors: prev.pending_doctors - 1,
        verified_doctors: prev.verified_doctors + 1,
      }));
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
      const params = new URLSearchParams({
        approved: 'false',
        ...(rejectionReason && { rejection_reason: rejectionReason }),
      });

      const response = await authFetch(
        `http://localhost:8000/api/v1/admin/doctors/${selectedDoctor.id}/verify?${params}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject doctor');
      }

      // Remove from pending list
      setPendingDoctors(prev => prev.filter(d => d.id !== selectedDoctor.id));
      setStats(prev => ({
        ...prev,
        pending_doctors: prev.pending_doctors - 1,
        rejected_doctors: prev.rejected_doctors + 1,
      }));
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

  const openRejectModal = (doctor: PendingDoctor) => {
    setSelectedDoctor(doctor);
    setShowRejectModal(true);
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

  const StatCard = ({
    title,
    value,
    icon,
    color,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );

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
            />
            <StatCard
              title="Verified Doctors"
              value={stats.verified_doctors}
              icon={<UserCheck className="w-6 h-6 text-green-600" />}
              color="bg-green-100"
            />
            <StatCard
              title="Rejected"
              value={stats.rejected_doctors}
              icon={<UserX className="w-6 h-6 text-red-600" />}
              color="bg-red-100"
            />
            <StatCard
              title="Total Doctors"
              value={stats.total_doctors}
              icon={<Stethoscope className="w-6 h-6 text-cyan-600" />}
              color="bg-cyan-100"
            />
          </div>

          {/* Pending Doctors Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Pending Doctor Verifications</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Review and approve doctor applications
                </p>
              </div>
              <Button
                variant="outline"
                onClick={fetchPendingDoctors}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
              </div>
            ) : pendingDoctors.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-500">No pending doctor verifications at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      {/* Doctor Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center shrink-0">
                            <Stethoscope className="w-6 h-6 text-cyan-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900">
                                {doctor.user?.first_name && doctor.user?.last_name
                                  ? `Dr. ${doctor.user.first_name} ${doctor.user.last_name}`
                                  : `Doctor #${doctor.id}`}
                              </h3>
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                Pending
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {doctor.specialization?.name || 'Specialization not set'}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 text-sm">
                              <div>
                                <span className="text-gray-500">Phone:</span>{' '}
                                <span className="text-gray-900">{doctor.user?.phone || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">License:</span>{' '}
                                <span className="text-gray-900">{doctor.license_number}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Experience:</span>{' '}
                                <span className="text-gray-900">{doctor.experience_years} years</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Fee:</span>{' '}
                                <span className="text-gray-900">{doctor.consultation_fee} MZN</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Applied:</span>{' '}
                                <span className="text-gray-900">{formatDate(doctor.created_at)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Languages:</span>{' '}
                                <span className="text-gray-900">
                                  {doctor.languages?.join(', ') || 'N/A'}
                                </span>
                              </div>
                            </div>

                            {/* Education */}
                            {doctor.education && doctor.education.length > 0 && (
                              <div className="mt-3">
                                <span className="text-sm text-gray-500">Education:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {doctor.education.map((edu, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                    >
                                      {edu.degree} - {edu.institution} ({edu.year})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Bio (collapsed view) */}
                            {doctor.bio && expandedDoctor !== doctor.id && (
                              <div className="mt-3">
                                <span className="text-sm text-gray-500">Bio:</span>
                                <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                                  {doctor.bio}
                                </p>
                              </div>
                            )}

                            {/* View Details Toggle */}
                            <button
                              onClick={() => toggleExpand(doctor.id)}
                              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              {expandedDoctor === doctor.id ? 'Hide Details' : 'View Full Details'}
                              {expandedDoctor === doctor.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>

                            {/* Expanded Details Section */}
                            {expandedDoctor === doctor.id && (
                              <div className="mt-4 pt-4 border-t border-gray-200 space-y-6">
                                {/* Contact Information */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Contact Information
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-gray-400" />
                                      <span className="text-gray-500">Phone:</span>
                                      <span className="text-gray-900">{doctor.user?.phone || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-4 h-4 text-gray-400" />
                                      <span className="text-gray-500">Email:</span>
                                      <span className="text-gray-900">{doctor.user?.email || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Full Bio */}
                                {doctor.bio && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <FileText className="w-4 h-4" />
                                      Full Bio
                                    </h4>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                                      {doctor.bio}
                                    </p>
                                  </div>
                                )}

                                {/* Complete Education */}
                                {doctor.education && doctor.education.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                      <GraduationCap className="w-4 h-4" />
                                      Education & Qualifications
                                    </h4>
                                    <div className="space-y-2">
                                      {doctor.education.map((edu, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                                        >
                                          <Award className="w-5 h-5 text-cyan-500 mt-0.5" />
                                          <div>
                                            <p className="font-medium text-gray-900">{edu.degree}</p>
                                            <p className="text-sm text-gray-600">{edu.institution}</p>
                                            <p className="text-xs text-gray-500">Graduated: {edu.year}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Languages */}
                                {doctor.languages && doctor.languages.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                      <Languages className="w-4 h-4" />
                                      Languages Spoken
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {doctor.languages.map((lang, idx) => (
                                        <span
                                          key={idx}
                                          className="px-3 py-1 bg-cyan-50 text-cyan-700 text-sm rounded-full"
                                        >
                                          {lang}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Documents with Preview */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Image className="w-4 h-4" />
                                    Uploaded Documents
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Government ID */}
                                    {doctor.government_id_url ? (
                                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-blue-50 px-4 py-2 flex items-center justify-between">
                                          <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Government ID
                                          </span>
                                          <a
                                            href={`http://localhost:8000${doctor.government_id_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                          </a>
                                        </div>
                                        <a
                                          href={`http://localhost:8000${doctor.government_id_url}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block"
                                        >
                                          <img
                                            src={`http://localhost:8000${doctor.government_id_url}`}
                                            alt="Government ID"
                                            className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = '';
                                              (e.target as HTMLImageElement).alt = 'Failed to load image';
                                              (e.target as HTMLImageElement).className = 'w-full h-40 bg-gray-100 flex items-center justify-center';
                                            }}
                                          />
                                        </a>
                                      </div>
                                    ) : (
                                      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
                                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-400">No Government ID uploaded</p>
                                      </div>
                                    )}

                                    {/* Medical Certificate */}
                                    {doctor.medical_certificate_url ? (
                                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-purple-50 px-4 py-2 flex items-center justify-between">
                                          <span className="text-sm font-medium text-purple-700 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Medical Certificate
                                          </span>
                                          <a
                                            href={`http://localhost:8000${doctor.medical_certificate_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 hover:text-purple-800"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                          </a>
                                        </div>
                                        <a
                                          href={`http://localhost:8000${doctor.medical_certificate_url}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block"
                                        >
                                          <img
                                            src={`http://localhost:8000${doctor.medical_certificate_url}`}
                                            alt="Medical Certificate"
                                            className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = '';
                                              (e.target as HTMLImageElement).alt = 'Failed to load image';
                                              (e.target as HTMLImageElement).className = 'w-full h-40 bg-gray-100 flex items-center justify-center';
                                            }}
                                          />
                                        </a>
                                      </div>
                                    ) : (
                                      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
                                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-400">No Medical Certificate uploaded</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Quick Document Links (collapsed view) */}
                            {expandedDoctor !== doctor.id && (
                              <div className="flex flex-wrap gap-3 mt-4">
                                {doctor.government_id_url && (
                                  <a
                                    href={`http://localhost:8000${doctor.government_id_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-colors"
                                  >
                                    <FileText className="w-4 h-4" />
                                    Government ID
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {doctor.medical_certificate_url && (
                                  <a
                                    href={`http://localhost:8000${doctor.medical_certificate_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-lg hover:bg-purple-100 transition-colors"
                                  >
                                    <FileText className="w-4 h-4" />
                                    Medical Certificate
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 lg:flex-col">
                        <Button
                          onClick={() => handleApprove(doctor.id)}
                          disabled={actionLoading === doctor.id}
                          className="flex-1 lg:flex-none"
                        >
                          {actionLoading === doctor.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openRejectModal(doctor)}
                          disabled={actionLoading === doctor.id}
                          className="flex-1 lg:flex-none text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">All Doctors</h3>
                  <p className="text-sm text-gray-500">View and manage all doctors</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Appointments</h3>
                  <p className="text-sm text-gray-500">Monitor all appointments</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Payments</h3>
                  <p className="text-sm text-gray-500">Track all transactions</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject Application</h3>
            <p className="text-gray-600 text-sm mb-4">
              Are you sure you want to reject the application from{' '}
              <strong>
                {selectedDoctor.user?.first_name
                  ? `Dr. ${selectedDoctor.user.first_name}`
                  : `Doctor #${selectedDoctor.id}`}
              </strong>
              ?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
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
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {actionLoading === selectedDoctor.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Reject
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
