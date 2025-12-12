import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button, Card, Input } from '../../components/ui';
import { Navbar, Footer } from '../../components/layout';
import { authFetch } from '../../services/api';
import { config } from '../../config';
import { getSpecializationIcon } from '../../utils/specializationIcons';
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Edit3,
  X,
  Save,
  Stethoscope,
  FileText,
  Check,
  Plus,
  Upload,
  DollarSign,
  Wand2,
  PenLine,
  Smile,
  Zap,
  GraduationCap,
  History,
  Send,
  UserCheck,
  File,
  Edit,
  Sparkles,
  Eye,
} from 'lucide-react';

interface Specialization {
  id: number;
  name: string;
  description: string;
  icon: string;
}

interface Education {
  degree: string;
  institution: string;
  year: string;
}

interface DoctorProfile {
  id: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  specialization_id?: number;
  specialization?: {
    id: number;
    name: string;
    description: string;
    icon: string;
  };
  license_number?: string;
  experience_years?: number;
  consultation_fee?: number;
  consultation_duration?: number;
  bio?: string;
  languages?: string[];
  education?: Education[];
  government_id_url?: string;
  medical_certificate_url?: string;
}

interface ApplicationHistoryEvent {
  id: number;
  doctor_id: number;
  event_type: string;
  event_title: string;
  event_description?: string;
  extra_data?: Record<string, unknown>;
  performed_by?: string;
  created_at: string;
}

// Get icon and color for history events
const getHistoryEventStyle = (eventType: string, performedBy?: string) => {
  const styles: Record<string, { icon: React.ReactNode; bgColor: string; iconColor: string }> = {
    application_submitted: {
      icon: <Send className="w-4 h-4" />,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    profile_updated: {
      icon: <Edit className="w-4 h-4" />,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    documents_uploaded: {
      icon: <File className="w-4 h-4" />,
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    status_changed: {
      icon: performedBy === 'admin' ? <UserCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />,
      bgColor: performedBy === 'admin' ? 'bg-green-100' : 'bg-gray-100',
      iconColor: performedBy === 'admin' ? 'text-green-600' : 'text-gray-600',
    },
    admin_review: {
      icon: <UserCheck className="w-4 h-4" />,
      bgColor: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
    },
  };
  return styles[eventType] || {
    icon: <History className="w-4 h-4" />,
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
  };
};

export const VerificationPendingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Specializations
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [fetchingSpecs, setFetchingSpecs] = useState(false);

  // Application History
  const [applicationHistory, setApplicationHistory] = useState<ApplicationHistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    specialization_id: '',
    license_number: '',
    experience_years: '',
    consultation_fee: '',
    consultation_duration: '30',
    bio: '',
    languages: [] as string[],
    education: [] as Education[],
  });

  // Language & Education inputs
  const [newLanguage, setNewLanguage] = useState('');
  const [newEducation, setNewEducation] = useState<Education>({
    degree: '',
    institution: '',
    year: '',
  });

  // File uploads
  const [governmentId, setGovernmentId] = useState<File | null>(null);
  const [medicalCertificate, setMedicalCertificate] = useState<File | null>(null);

  // AI States
  const [generatingBio, setGeneratingBio] = useState(false);
  const [rephrasing, setRephrasing] = useState(false);
  const [suggestingFee, setSuggestingFee] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDetails, setCustomDetails] = useState('');
  const [generatingCustomBio, setGeneratingCustomBio] = useState(false);

  useEffect(() => {
    if (!user || !accessToken) {
      navigate('/login');
      return;
    }

    if (user.role !== 'doctor') {
      navigate('/');
      return;
    }

    fetchStatus();
    fetchSpecializations();
    fetchApplicationHistory();
  }, [user, accessToken, navigate]);

  const fetchSpecializations = async () => {
    setFetchingSpecs(true);
    try {
      const response = await fetch(`${config.apiUrl}/doctors/specializations/all`);
      if (response.ok) {
        const data = await response.json();
        setSpecializations(data);
      }
    } catch (error) {
      console.error('Failed to fetch specializations:', error);
    } finally {
      setFetchingSpecs(false);
    }
  };

  const fetchApplicationHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await authFetch(`${config.apiUrl}/doctors/me/history`);
      if (response.ok) {
        const data = await response.json();
        setApplicationHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch application history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await authFetch(`${config.apiUrl}/doctors/me`);

      if (response.ok) {
        const data = await response.json();
        setDoctorProfile(data);

        // If verified, redirect to dashboard
        if (data.verification_status === 'verified') {
          setTimeout(() => navigate('/doctor/dashboard'), 2000);
        }
      }
    } catch (error) {
      console.error('Failed to fetch doctor status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedSpecName = () => {
    const spec = specializations.find(s => s.id.toString() === editForm.specialization_id);
    return spec?.name || 'General Medicine';
  };

  // AI Generate Bio
  const generateBio = async () => {
    setGeneratingBio(true);
    try {
      const response = await fetch(`${config.apiUrl}/ai/generate-bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialization: getSelectedSpecName(),
          experience_years: parseInt(editForm.experience_years) || 0,
          education: editForm.education,
          languages: editForm.languages,
          additional_info: null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEditForm({ ...editForm, bio: data.bio });
      }
    } catch (error) {
      console.error('Failed to generate bio:', error);
    } finally {
      setGeneratingBio(false);
    }
  };

  // AI Rephrase Bio
  const rephraseBio = async (style: 'professional' | 'friendly' | 'concise') => {
    if (!editForm.bio.trim()) return;

    setRephrasing(true);
    try {
      const response = await fetch(`${config.apiUrl}/ai/rephrase-bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_bio: editForm.bio,
          style: style
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEditForm({ ...editForm, bio: data.bio });
      }
    } catch (error) {
      console.error('Failed to rephrase bio:', error);
    } finally {
      setRephrasing(false);
    }
  };

  // AI Generate Bio with Custom Details
  const generateCustomBio = async () => {
    if (!customDetails.trim()) return;

    setGeneratingCustomBio(true);
    try {
      const response = await fetch(`${config.apiUrl}/ai/generate-bio-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialization: getSelectedSpecName(),
          experience_years: parseInt(editForm.experience_years) || 0,
          education: editForm.education,
          languages: editForm.languages,
          custom_details: customDetails
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEditForm({ ...editForm, bio: data.bio });
        setShowCustomInput(false);
        setCustomDetails('');
      }
    } catch (error) {
      console.error('Failed to generate custom bio:', error);
    } finally {
      setGeneratingCustomBio(false);
    }
  };

  // AI Suggest Fee
  const suggestFee = async () => {
    setSuggestingFee(true);
    try {
      const response = await fetch(`${config.apiUrl}/ai/suggest-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialization: getSelectedSpecName(),
          experience_years: parseInt(editForm.experience_years) || 0,
          education: editForm.education,
          country: config.country.name
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEditForm({ ...editForm, consultation_fee: data.suggested_fee.toString() });
      }
    } catch (error) {
      console.error('Failed to suggest fee:', error);
    } finally {
      setSuggestingFee(false);
    }
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !editForm.languages.includes(newLanguage.trim())) {
      setEditForm({
        ...editForm,
        languages: [...editForm.languages, newLanguage.trim()],
      });
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    setEditForm({
      ...editForm,
      languages: editForm.languages.filter(l => l !== lang),
    });
  };

  const addEducation = () => {
    if (newEducation.degree && newEducation.institution && newEducation.year) {
      setEditForm({
        ...editForm,
        education: [...editForm.education, newEducation],
      });
      setNewEducation({ degree: '', institution: '', year: '' });
    }
  };

  const removeEducation = (index: number) => {
    setEditForm({
      ...editForm,
      education: editForm.education.filter((_, i) => i !== index),
    });
  };

  const startEditing = () => {
    if (doctorProfile) {
      setEditForm({
        specialization_id: doctorProfile.specialization_id?.toString() || '',
        license_number: doctorProfile.license_number || '',
        experience_years: doctorProfile.experience_years?.toString() || '',
        consultation_fee: doctorProfile.consultation_fee?.toString() || '',
        consultation_duration: doctorProfile.consultation_duration?.toString() || '30',
        bio: doctorProfile.bio || '',
        languages: doctorProfile.languages || [],
        education: doctorProfile.education || [],
      });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError('');
    setGovernmentId(null);
    setMedicalCertificate(null);
  };

  const saveChanges = async () => {
    setSaving(true);
    setError('');

    try {
      // Update profile
      const response = await authFetch(`${config.apiUrl}/doctors/me`, {
        method: 'PUT',
        body: JSON.stringify({
          specialization_id: editForm.specialization_id ? parseInt(editForm.specialization_id) : undefined,
          license_number: editForm.license_number || undefined,
          experience_years: editForm.experience_years ? parseInt(editForm.experience_years) : undefined,
          consultation_fee: editForm.consultation_fee ? parseFloat(editForm.consultation_fee) : undefined,
          consultation_duration: editForm.consultation_duration ? parseInt(editForm.consultation_duration) : undefined,
          bio: editForm.bio || undefined,
          languages: editForm.languages.length > 0 ? editForm.languages : undefined,
          education: editForm.education.length > 0 ? editForm.education : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update profile');
      }

      // Upload new documents if provided
      if (governmentId) {
        const govIdFormData = new FormData();
        govIdFormData.append('file', governmentId);
        const token = localStorage.getItem('access_token');
        await fetch(`${config.apiUrl}/uploads/kyc/government-id`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: govIdFormData,
        });
      }

      if (medicalCertificate) {
        const certFormData = new FormData();
        certFormData.append('file', medicalCertificate);
        const token = localStorage.getItem('access_token');
        await fetch(`${config.apiUrl}/uploads/kyc/medical-certificate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: certFormData,
        });
      }

      // Refresh profile
      await fetchStatus();
      setIsEditing(false);
      setGovernmentId(null);
      setMedicalCertificate(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = () => {
    switch (doctorProfile?.verification_status) {
      case 'verified':
        return <CheckCircle className="w-10 h-10 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-10 h-10 text-red-600" />;
      default:
        return <Clock className="w-10 h-10 text-amber-600" />;
    }
  };

  const getStatusColor = () => {
    switch (doctorProfile?.verification_status) {
      case 'verified':
        return 'bg-green-100';
      case 'rejected':
        return 'bg-red-100';
      default:
        return 'bg-amber-100';
    }
  };

  const getStatusTitle = () => {
    switch (doctorProfile?.verification_status) {
      case 'verified':
        return 'Application Approved!';
      case 'rejected':
        return 'Application Not Approved';
      default:
        return 'Application Under Review';
    }
  };

  const getStatusMessage = () => {
    switch (doctorProfile?.verification_status) {
      case 'verified':
        return 'Congratulations! Your application has been approved. You can now access your doctor dashboard and start accepting appointments.';
      case 'rejected':
        return 'We\'re sorry, but your application was not approved at this time. Please review the feedback below and consider reapplying.';
      default:
        return 'Thank you for applying to join NovareHealth as a doctor. Our team is reviewing your application and documents.';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading application status...</p>
          </div>
        </main>
      </div>
    );
  }

  // Edit Mode UI
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />

        <main className="flex-1 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Edit Your Application</h1>
                  <p className="text-gray-600 mt-1">Update your information before resubmission</p>
                </div>
                <button
                  onClick={cancelEditing}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-8">
                {/* Specialization Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-cyan-600" />
                    Specialization
                  </h3>
                  {fetchingSpecs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-cyan-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {specializations.map((spec) => (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, specialization_id: spec.id.toString() })}
                          className={`relative p-4 rounded-xl border-2 text-center transition-all duration-200 flex flex-col items-center ${
                            editForm.specialization_id === spec.id.toString()
                              ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500/20'
                              : 'border-gray-200 hover:border-cyan-300 hover:bg-gray-50'
                          }`}
                        >
                          {editForm.specialization_id === spec.id.toString() && (
                            <div className="absolute top-2 right-2">
                              <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          )}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                            editForm.specialization_id === spec.id.toString()
                              ? 'bg-cyan-500 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {getSpecializationIcon(spec.icon)}
                          </div>
                          <p className="font-medium text-gray-900 text-sm">{spec.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{spec.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Professional Details Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-600" />
                    Professional Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="License Number"
                      value={editForm.license_number}
                      onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
                      placeholder="e.g., MED-12345"
                    />
                    <Input
                      label="Years of Experience"
                      type="number"
                      value={editForm.experience_years}
                      onChange={(e) => setEditForm({ ...editForm, experience_years: e.target.value })}
                      placeholder="e.g., 5"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Consultation Fee (MZN)
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <DollarSign className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          value={editForm.consultation_fee}
                          onChange={(e) => setEditForm({ ...editForm, consultation_fee: e.target.value })}
                          placeholder="e.g., 500"
                          className="w-full pl-10 pr-24 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                        <button
                          type="button"
                          onClick={suggestFee}
                          disabled={suggestingFee}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-medium rounded-lg hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {suggestingFee ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Wand2 className="w-3 h-3" />
                          )}
                          Suggest
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Consultation Duration (minutes)
                      </label>
                      <select
                        value={editForm.consultation_duration}
                        onChange={(e) => setEditForm({ ...editForm, consultation_duration: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bio Section with AI Features */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-600" />
                    Professional Bio
                  </h3>

                  {/* AI Generate Button */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      type="button"
                      onClick={generateBio}
                      disabled={generatingBio}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-medium rounded-xl hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20"
                    >
                      {generatingBio ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      Generate with AI
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(!showCustomInput)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-all"
                    >
                      <PenLine className="w-4 h-4" />
                      Custom Details
                    </button>
                  </div>

                  {/* Custom Details Input */}
                  {showCustomInput && (
                    <div className="mb-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        What would you like to highlight?
                      </label>
                      <textarea
                        value={customDetails}
                        onChange={(e) => setCustomDetails(e.target.value)}
                        placeholder="E.g., I specialize in pediatric cardiology with a focus on congenital heart defects..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={generateCustomBio}
                          disabled={generatingCustomBio || !customDetails.trim()}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-medium rounded-xl hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50"
                        >
                          {generatingCustomBio ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          Generate Bio
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bio Textarea */}
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Write a professional bio that highlights your expertise, experience, and approach to patient care..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                    rows={5}
                  />

                  {/* Rephrase Options */}
                  {editForm.bio && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-sm text-gray-500 flex items-center">Rephrase:</span>
                      <button
                        type="button"
                        onClick={() => rephraseBio('professional')}
                        disabled={rephrasing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                      >
                        {rephrasing ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
                        Professional
                      </button>
                      <button
                        type="button"
                        onClick={() => rephraseBio('friendly')}
                        disabled={rephrasing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                      >
                        {rephrasing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Smile className="w-3 h-3" />}
                        Friendly
                      </button>
                      <button
                        type="button"
                        onClick={() => rephraseBio('concise')}
                        disabled={rephrasing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
                      >
                        {rephrasing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        Concise
                      </button>
                    </div>
                  )}
                </div>

                {/* Languages Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-600" />
                    Languages
                  </h3>

                  {/* Language Chips */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editForm.languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 text-cyan-700 text-sm font-medium rounded-full"
                      >
                        {lang}
                        <button
                          type="button"
                          onClick={() => removeLanguage(lang)}
                          className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-cyan-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add Language */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                      placeholder="Add a language..."
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={addLanguage}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Education Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-cyan-600" />
                    Education
                  </h3>

                  {/* Education List */}
                  {editForm.education.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {editForm.education.map((edu, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{edu.degree}</p>
                            <p className="text-sm text-gray-600">{edu.institution} - {edu.year}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEducation(index)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Education */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <input
                        type="text"
                        value={newEducation.degree}
                        onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
                        placeholder="Degree (e.g., MBBS)"
                        className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                      <input
                        type="text"
                        value={newEducation.institution}
                        onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
                        placeholder="Institution"
                        className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                      <input
                        type="text"
                        value={newEducation.year}
                        onChange={(e) => setNewEducation({ ...newEducation, year: e.target.value })}
                        placeholder="Year (e.g., 2018)"
                        className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addEducation}
                      disabled={!newEducation.degree || !newEducation.institution || !newEducation.year}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Education
                    </button>
                  </div>
                </div>

                {/* Documents Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-cyan-600" />
                    Documents
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload new documents to replace the existing ones (optional)
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Government ID */}
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl">
                      <label className="cursor-pointer block text-center">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setGovernmentId(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-900 text-sm">Government ID</p>
                        {governmentId ? (
                          <p className="text-xs text-green-600 mt-1">{governmentId.name}</p>
                        ) : doctorProfile?.government_id_url ? (
                          <p className="text-xs text-gray-500 mt-1">Current file uploaded</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">Click to upload</p>
                        )}
                      </label>
                    </div>

                    {/* Medical Certificate */}
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl">
                      <label className="cursor-pointer block text-center">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setMedicalCertificate(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-900 text-sm">Medical Certificate</p>
                        {medicalCertificate ? (
                          <p className="text-xs text-green-600 mt-1">{medicalCertificate.name}</p>
                        ) : doctorProfile?.medical_certificate_url ? (
                          <p className="text-xs text-gray-500 mt-1">Current file uploaded</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">Click to upload</p>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={cancelEditing}
                    className="flex-1"
                    size="lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveChanges}
                    disabled={saving}
                    className="flex-1"
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Status View UI
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Status Card */}
          <Card className="p-8 text-center">
            <div className={`w-20 h-20 ${getStatusColor()} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {getStatusIcon()}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {getStatusTitle()}
            </h1>

            <p className="text-gray-600 mb-6">
              {getStatusMessage()}
            </p>

            {doctorProfile?.verification_status === 'pending' && (
              <>
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Expected Review Time:</span>
                    <span className="font-medium text-gray-900">1-3 Business Days</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-left">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Application Submitted</p>
                      <p className="text-sm text-gray-500">Your information has been received</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-left">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Document Verification</p>
                      <p className="text-sm text-gray-500">Our team is verifying your credentials</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-left">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-400">Account Activation</p>
                      <p className="text-sm text-gray-400">You'll be notified once approved</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => { fetchStatus(); fetchApplicationHistory(); }}
                    className="flex-1 inline-flex items-center justify-center gap-2 text-cyan-600 hover:text-cyan-700 text-sm font-medium py-2 px-4 rounded-lg hover:bg-cyan-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Status
                  </button>
                  <button
                    onClick={startEditing}
                    className="flex-1 inline-flex items-center justify-center gap-2 text-gray-600 hover:text-gray-700 text-sm font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Application
                  </button>
                </div>
              </>
            )}

            {doctorProfile?.verification_status === 'verified' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-left">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Application Submitted</p>
                    <p className="text-sm text-gray-500">Your information was received</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-left">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Document Verification</p>
                    <p className="text-sm text-gray-500">Your credentials have been verified</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-left">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-600">Account Activated</p>
                    <p className="text-sm text-gray-500">You're ready to start!</p>
                  </div>
                </div>
              </div>
            )}

            {doctorProfile?.verification_status === 'rejected' && (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
                  <p className="text-sm font-medium text-red-800 mb-1">Reason:</p>
                  <p className="text-sm text-red-700">
                    {doctorProfile.rejection_reason || 'Please contact support for more details about your application.'}
                  </p>
                </div>

                <button
                  onClick={startEditing}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-xl transition-colors mb-4"
                >
                  <Edit3 className="w-5 h-5" />
                  Edit & Resubmit Application
                </button>
              </>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100">
              {doctorProfile?.verification_status === 'verified' ? (
                <Link to="/doctor/dashboard">
                  <Button className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : doctorProfile?.verification_status === 'rejected' ? (
                <div className="flex gap-4">
                  <Link to="/" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Go Home
                    </Button>
                  </Link>
                  <Link to="/help" className="flex-1">
                    <Button variant="secondary" className="w-full">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    We'll send you an email and SMS once your application is approved.
                  </p>
                  <div className="flex gap-4">
                    <Link to="/" className="flex-1">
                      <Button variant="outline" className="w-full">
                        Go Home
                      </Button>
                    </Link>
                    <Link to="/help" className="flex-1">
                      <Button variant="secondary" className="w-full">
                        Contact Support
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Application History Timeline */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Application Timeline</h2>
                  <p className="text-sm text-gray-500">Track all events in your application journey</p>
                </div>
              </div>
              <button
                onClick={fetchApplicationHistory}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={historyLoading}
              >
                <RefreshCw className={`w-5 h-5 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {historyLoading && applicationHistory.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
              </div>
            ) : applicationHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No history events yet</p>
                <p className="text-sm text-gray-400 mt-1">Events will appear here as your application progresses</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-6">
                  {applicationHistory.map((event, index) => {
                    const style = getHistoryEventStyle(event.event_type, event.performed_by);
                    const eventDate = new Date(event.created_at);
                    const isFirst = index === 0;

                    return (
                      <div key={event.id} className="relative flex gap-4">
                        {/* Timeline dot */}
                        <div className={`relative z-10 w-10 h-10 rounded-full ${style.bgColor} flex items-center justify-center flex-shrink-0 ${isFirst ? 'ring-4 ring-cyan-100' : ''}`}>
                          <span className={style.iconColor}>{style.icon}</span>
                        </div>

                        {/* Event content */}
                        <div className={`flex-1 ${isFirst ? 'bg-cyan-50 border border-cyan-200' : 'bg-gray-50 border border-gray-200'} rounded-xl p-4`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className={`font-medium ${isFirst ? 'text-cyan-900' : 'text-gray-900'}`}>
                                {event.event_title}
                              </h3>
                              {event.event_description && (
                                <p className={`text-sm mt-1 ${isFirst ? 'text-cyan-700' : 'text-gray-600'}`}>
                                  {event.event_description}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-gray-500">
                                {eventDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-xs text-gray-400">
                                {eventDate.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Show extra_data badges */}
                          {event.extra_data && Array.isArray(event.extra_data.changed_fields) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(event.extra_data.changed_fields as string[]).map((field: string, fieldIndex: number) => (
                                <span
                                  key={fieldIndex}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700"
                                >
                                  {String(field).replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Show performed by badge */}
                          {event.performed_by && (
                            <div className="mt-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                event.performed_by === 'admin' 
                                  ? 'bg-green-100 text-green-700' 
                                  : event.performed_by === 'system'
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {event.performed_by === 'admin' && <UserCheck className="w-3 h-3" />}
                                {event.performed_by === 'doctor' && <Stethoscope className="w-3 h-3" />}
                                By {event.performed_by}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VerificationPendingPage;
