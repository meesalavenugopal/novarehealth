import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, clearDoctorRegistrationData } from '../../store/authStore';
import { Button, Input, Card } from '../../components/ui';
import { Navbar } from '../../components/layout';
import { config } from '../../config';
import {
  Stethoscope,
  Heart,
  Brain,
  Baby,
  Eye,
  Bone,
  Users,
  Activity,
  Pill,
  Syringe,
  Sparkles,
  Shield,
  Check,
  Upload,
  FileText,
  X,
  Plus,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  GraduationCap,
  Briefcase,
  Clock,
  DollarSign,
  Languages,
  User,
  BadgeCheck,
  Wand2,
  MessageCircle,
  Send,
  Bot,
  Lightbulb,
  RefreshCw,
  PenLine,
  Smile,
  Zap,
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

interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

interface AITip {
  title: string;
  description: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Icon mapping for specializations
const getSpecializationIcon = (iconName: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    stethoscope: <Stethoscope className="w-6 h-6" />,
    heart: <Heart className="w-6 h-6" />,
    brain: <Brain className="w-6 h-6" />,
    baby: <Baby className="w-6 h-6" />,
    eye: <Eye className="w-6 h-6" />,
    bone: <Bone className="w-6 h-6" />,
    skin: <Sparkles className="w-6 h-6" />,
    female: <Users className="w-6 h-6" />,
    activity: <Activity className="w-6 h-6" />,
    pill: <Pill className="w-6 h-6" />,
    syringe: <Syringe className="w-6 h-6" />,
    tooth: <Sparkles className="w-6 h-6" />,
    allergy: <Shield className="w-6 h-6" />,
    lungs: <Activity className="w-6 h-6" />,
    kidney: <Activity className="w-6 h-6" />,
    stomach: <Activity className="w-6 h-6" />,
    ear: <Activity className="w-6 h-6" />,
    cancer: <Shield className="w-6 h-6" />,
    emergency: <Activity className="w-6 h-6" />,
    nutrition: <Pill className="w-6 h-6" />,
    physiotherapy: <Activity className="w-6 h-6" />,
    radiology: <Eye className="w-6 h-6" />,
    pathology: <FileText className="w-6 h-6" />,
    surgery: <Syringe className="w-6 h-6" />,
  };
  return iconMap[iconName] || <Stethoscope className="w-6 h-6" />;
};

const steps = [
  { id: 1, name: 'Specialty', icon: Stethoscope },
  { id: 2, name: 'Details', icon: Briefcase },
  { id: 3, name: 'Education', icon: GraduationCap },
  { id: 4, name: 'Documents', icon: FileText },
  { id: 5, name: 'Review', icon: Eye },
];

// Default specializations fallback when API is unavailable
const DEFAULT_SPECIALIZATIONS: Specialization[] = [
  { id: 1, name: 'General Medicine', description: 'Primary healthcare', icon: 'stethoscope' },
  { id: 2, name: 'Cardiology', description: 'Heart specialist', icon: 'heart' },
  { id: 3, name: 'Dermatology', description: 'Skin specialist', icon: 'skin' },
  { id: 4, name: 'Pediatrics', description: 'Child healthcare', icon: 'baby' },
];

export const DoctorRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken, updateUser, logout } = useAuthStore();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  // Check hydration state - wait for store to sync with localStorage
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // Restore saved step from localStorage
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('doctorRegister_step');
    return saved ? parseInt(saved) : 1;
  });
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSpecs, setFetchingSpecs] = useState(true);
  const [error, setError] = useState('');
  
  // AI States
  const [aiTips, setAiTips] = useState<AITip[]>([]);
  const [aiEncouragement, setAiEncouragement] = useState('');
  const [generatingBio, setGeneratingBio] = useState(false);
  const [rephrasing, setRephrasing] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDetails, setCustomDetails] = useState('');
  const [generatingCustomBio, setGeneratingCustomBio] = useState(false);
  const [suggestingFee, setSuggestingFee] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  
  // Default form data
  const getDefaultFormData = () => ({
    first_name: '',
    last_name: '',
    email: '',
    specialization_id: '',
    license_number: '',
    experience_years: '',
    bio: '',
    consultation_fee: '',
    consultation_duration: '30',
    languages: [] as string[],
    education: [] as Education[],
  });
  
  // Form data - start fresh, check for recovery data on mount
  const [formData, setFormData] = useState(getDefaultFormData);
  
  // Check for saved data on mount (only if same user)
  useEffect(() => {
    if (!user?.id) return;
    
    const saved = localStorage.getItem('doctorRegister_formData');
    const savedUserId = localStorage.getItem('doctorRegister_userId');
    
    // Only show recovery if data exists AND belongs to current user
    if (saved && savedUserId === user.id.toString()) {
      setShowRecoveryPrompt(true);
    } else {
      // Clear any stale data from different user
      clearDoctorRegistrationData();
    }
  }, [user?.id]);
  
  // Handle recovery prompt actions
  const handleRecoverData = () => {
    const saved = localStorage.getItem('doctorRegister_formData');
    const savedStep = localStorage.getItem('doctorRegister_step');
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
        if (savedStep) setStep(parseInt(savedStep));
      } catch {
        // Ignore parse errors
      }
    }
    // Restore file metadata
    const govIdMeta = localStorage.getItem('doctorRegister_govIdMeta');
    const medCertMeta = localStorage.getItem('doctorRegister_medCertMeta');
    if (govIdMeta) setSavedGovIdMeta(JSON.parse(govIdMeta));
    if (medCertMeta) setSavedMedCertMeta(JSON.parse(medCertMeta));
    
    setShowRecoveryPrompt(false);
  };
  
  const handleStartFresh = () => {
    clearDoctorRegistrationData();
    setFormData(getDefaultFormData());
    setStep(1);
    setSavedGovIdMeta(null);
    setSavedMedCertMeta(null);
    setShowRecoveryPrompt(false);
  };
  
  // Save form data to localStorage (called only on submit attempt)
  const saveFormDataToStorage = () => {
    if (!user?.id) return;
    localStorage.setItem('doctorRegister_formData', JSON.stringify(formData));
    localStorage.setItem('doctorRegister_step', step.toString());
    localStorage.setItem('doctorRegister_userId', user.id.toString());
    if (governmentId) {
      const meta = { name: governmentId.name, size: governmentId.size, type: governmentId.type };
      localStorage.setItem('doctorRegister_govIdMeta', JSON.stringify(meta));
    }
    if (medicalCertificate) {
      const meta = { name: medicalCertificate.name, size: medicalCertificate.size, type: medicalCertificate.type };
      localStorage.setItem('doctorRegister_medCertMeta', JSON.stringify(meta));
    }
  };
  
  // KYC files
  const [governmentId, setGovernmentId] = useState<File | null>(null);
  const [medicalCertificate, setMedicalCertificate] = useState<File | null>(null);
  
  // Saved file metadata (for showing previously uploaded file info after recovery)
  const [savedGovIdMeta, setSavedGovIdMeta] = useState<FileMetadata | null>(null);
  const [savedMedCertMeta, setSavedMedCertMeta] = useState<FileMetadata | null>(null);
  
  const [newLanguage, setNewLanguage] = useState('');
  const [newEducation, setNewEducation] = useState<Education>({
    degree: '',
    institution: '',
    year: '',
  });

  // Get selected specialization name
  const getSelectedSpecName = () => {
    const spec = specializations.find(s => s.id.toString() === formData.specialization_id);
    return spec?.name || 'General Medicine';
  };

  // Fetch specializations
  useEffect(() => {
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
        setSpecializations(DEFAULT_SPECIALIZATIONS);
      } finally {
        setFetchingSpecs(false);
      }
    };
    fetchSpecializations();
  }, []);

  // Fetch AI tips when step changes
  useEffect(() => {
    const fetchAITips = async () => {
      if (!formData.specialization_id) return;
      
      try {
        const response = await fetch(`${config.apiUrl}/ai/registration-tips`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            specialization: getSelectedSpecName(),
            step: step
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setAiTips(data.tips || []);
          setAiEncouragement(data.encouragement || '');
        }
      } catch (error) {
        console.error('Failed to fetch AI tips:', error);
      }
    };
    
    fetchAITips();
  }, [step, formData.specialization_id]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // AI Generate Bio
  const generateBio = async () => {
    setGeneratingBio(true);
    try {
      const response = await fetch(`${config.apiUrl}/ai/generate-bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialization: getSelectedSpecName(),
          experience_years: parseInt(formData.experience_years) || 0,
          education: formData.education,
          languages: formData.languages,
          additional_info: null
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData({ ...formData, bio: data.bio });
      }
    } catch (error) {
      console.error('Failed to generate bio:', error);
    } finally {
      setGeneratingBio(false);
    }
  };

  // AI Rephrase Bio
  const rephraseBio = async (style: 'professional' | 'friendly' | 'concise') => {
    if (!formData.bio.trim()) return;
    
    setRephrasing(true);
    try {
      const response = await fetch(`${config.apiUrl}/ai/rephrase-bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_bio: formData.bio,
          style: style
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData({ ...formData, bio: data.bio });
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
          experience_years: parseInt(formData.experience_years) || 0,
          education: formData.education,
          languages: formData.languages,
          custom_details: customDetails
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData({ ...formData, bio: data.bio });
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
          experience_years: parseInt(formData.experience_years) || 0,
          education: formData.education,
          country: config.country.name
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData({ ...formData, consultation_fee: data.suggested_fee.toString() });
      }
    } catch (error) {
      console.error('Failed to suggest fee:', error);
    } finally {
      setSuggestingFee(false);
    }
  };

  // AI Chat
  const sendChatMessage = async (directMessage?: string) => {
    const messageToSend = directMessage || chatInputRef.current?.value?.trim() || '';
    if (!messageToSend || chatLoading) return;
    
    // Clear input
    if (chatInputRef.current) {
      chatInputRef.current.value = '';
    }
    setChatMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setChatLoading(true);
    
    try {
      const response = await fetch(`${config.apiUrl}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          context: {
            step,
            specialization: getSelectedSpecName(),
            experience_years: formData.experience_years
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData({
        ...formData,
        languages: [...formData.languages, newLanguage.trim()],
      });
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    setFormData({
      ...formData,
      languages: formData.languages.filter((l: string) => l !== lang),
    });
  };

  const addEducation = () => {
    if (newEducation.degree && newEducation.institution && newEducation.year) {
      setFormData({
        ...formData,
        education: [...formData.education, newEducation],
      });
      setNewEducation({ degree: '', institution: '', year: '' });
    }
  };

  const removeEducation = (index: number) => {
    setFormData({
      ...formData,
      education: formData.education.filter((_: Education, i: number) => i !== index),
    });
  };

  const handleSubmit = async () => {
    // Check if user is logged in before submitting
    if (!user || !accessToken) {
      setShowLoginPrompt(true);
      return;
    }
    
    setLoading(true);
    setError('');
    
    // Save form data before API call (for recovery if it fails)
    saveFormDataToStorage();
    
    try {
      const registerResponse = await fetch(`${config.apiUrl}/doctors/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          specialization_id: parseInt(formData.specialization_id),
          license_number: formData.license_number,
          experience_years: parseInt(formData.experience_years),
          bio: formData.bio,
          consultation_fee: parseFloat(formData.consultation_fee),
          consultation_duration: parseInt(formData.consultation_duration),
          languages: formData.languages,
          education: formData.education,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        const errorMessage = errorData.detail || 'Failed to register as doctor';
        
        // Check for authentication errors - show login prompt modal instead of redirecting
        if (registerResponse.status === 401 || 
            errorMessage.toLowerCase().includes('token') ||
            errorMessage.toLowerCase().includes('unauthorized') ||
            errorMessage.toLowerCase().includes('expired')) {
          logout();
          setShowLoginPrompt(true);
          return;
        }
        
        throw new Error(errorMessage);
      }

      if (governmentId) {
        const govIdFormData = new FormData();
        govIdFormData.append('file', governmentId);
        await fetch(`${config.apiUrl}/uploads/kyc/government-id`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: govIdFormData,
        });
      }

      if (medicalCertificate) {
        const certFormData = new FormData();
        certFormData.append('file', medicalCertificate);
        await fetch(`${config.apiUrl}/uploads/kyc/medical-certificate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: certFormData,
        });
      }

      // Update user role in auth store to 'doctor' so ProtectedRoute allows access
      updateUser({ role: 'doctor' });

      // Clear saved form data after successful registration
      clearDoctorRegistrationData();

      navigate('/doctor/verification-pending');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // If not authenticated, show login prompt
  // Wait for hydration before making auth decision
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }
  
  // Login Prompt Modal Component
  const LoginPromptModal = () => {
    if (!showLoginPrompt) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setShowLoginPrompt(false)}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
          {/* Close button */}
          <button
            onClick={() => setShowLoginPrompt(false)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/30">
            <User className="w-8 h-8 text-white" />
          </div>
          
          {/* Content */}
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Almost There!
          </h2>
          <p className="text-slate-600 text-center mb-6">
            Your registration details have been saved. Please sign in or create an account to complete your registration as a doctor.
          </p>
          
          {/* Progress saved indicator */}
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl mb-6">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Your progress has been saved</span>
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            <Link to="/login" state={{ from: '/doctor/register' }} className="block">
              <Button size="lg" className="w-full">
                Sign In to Continue
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-slate-500 text-center">
              New to NovareHealth? You'll be able to create an account with your phone number.
            </p>
          </div>
          
          <p className="text-xs text-slate-400 text-center mt-4">
            Your form data will be restored after you sign in
          </p>
        </div>
      </div>
    );
  };

  // Recovery Prompt Modal - shown when user has incomplete registration data
  const RecoveryPromptModal = () => {
    if (!showRecoveryPrompt) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setShowRecoveryPrompt(false)}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
          {/* Close button */}
          <button
            onClick={() => setShowRecoveryPrompt(false)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
          
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <RefreshCw className="w-8 h-8 text-white" />
            </div>
          </div>
          
          {/* Content */}
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Welcome Back!
          </h2>
          <p className="text-slate-600 text-center mb-6">
            You have an incomplete doctor registration from a previous session. Would you like to continue where you left off?
          </p>
          
          {/* Saved data indicator */}
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-amber-700 font-medium">Your previous progress was saved</span>
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            <Button onClick={handleRecoverData} size="lg" className="w-full">
              Continue Where I Left Off
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              onClick={handleStartFresh} 
              variant="outline" 
              size="lg" 
              className="w-full"
            >
              Start Fresh
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // AI Tips Panel Component - Premium Design
  const AITipsPanel = () => (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-600 p-[1px] mb-6 shadow-lg shadow-cyan-500/20">
      <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/95 backdrop-blur-xl rounded-2xl p-5">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-500/20 to-transparent rounded-full blur-2xl" />
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <h4 className="font-semibold text-white">AI Assistant</h4>
              <p className="text-xs text-slate-400">Personalized guidance for your registration</p>
            </div>
          </div>
          
          {aiTips.length > 0 ? (
            <div className="space-y-3">
              {aiTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 group">
                  <div className="w-6 h-6 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ring-1 ring-cyan-500/30 group-hover:ring-cyan-400/50 transition-all">
                    <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90">{tip.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-3 px-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-sm text-slate-400">Select a specialization to get personalized AI tips...</p>
            </div>
          )}
          
          {aiEncouragement && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-cyan-300/90 italic">{aiEncouragement}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // AI Chat Widget Component - Premium Floating Design
  const AIChatWidget = () => (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${showAIChat ? 'w-96' : ''}`}>
      {showAIChat ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-600 p-[1px] shadow-2xl shadow-cyan-500/30">
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 px-5 py-4">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5Ljk0MSAwIDE4LTguMDU5IDE4LTE4cy04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      AI Assistant
                    </h3>
                    <p className="text-xs text-white/70">Here to help you register</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAIChat(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    <Sparkles className="w-8 h-8 text-cyan-500" />
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-1">How can I help you?</h4>
                  <p className="text-sm text-slate-500 mb-4">Ask me anything about registering as a doctor on NovareHealth.</p>
                  
                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Registration tips', 'Profile optimization', 'Fee suggestions'].map((action) => (
                      <button
                        key={action}
                        onClick={() => sendChatMessage(action)}
                        className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-medium rounded-full border border-cyan-200 transition-colors"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'flex items-start gap-2'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-br-md shadow-lg shadow-cyan-500/20' 
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            {/* Input */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={chatInputRef}
                    type="text"
                    defaultValue=""
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-slate-400"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => sendChatMessage()}
                  disabled={chatLoading}
                  className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 transition-all hover:scale-105 active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAIChat(true)}
          className="group relative w-16 h-16 bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-cyan-500/40 hover:shadow-cyan-500/60 transition-all hover:scale-105 active:scale-95"
        >
          {/* Pulse Animation */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 animate-ping opacity-30" />
          
          {/* Icon */}
          <div className="relative">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          
          {/* Badge */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-cyan-500 flex items-center justify-center shadow-sm">
            <Sparkles className="w-3 h-3 text-cyan-500" />
          </div>
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            Chat with AI Assistant
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-slate-900 rotate-45" />
          </div>
        </button>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <AITipsPanel />
      
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Select Your Specialization
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Choose the medical specialty that best represents your practice
        </p>
        
        {fetchingSpecs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {specializations.map((spec) => (
              <button
                key={spec.id}
                type="button"
                onClick={() => setFormData({ ...formData, specialization_id: spec.id.toString() })}
                className={`
                  relative p-4 rounded-xl border-2 text-center transition-all duration-200 flex flex-col items-center
                  ${formData.specialization_id === spec.id.toString()
                    ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500/20'
                    : 'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
                  }
                `}
              >
                {formData.specialization_id === spec.id.toString() && (
                  <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center mb-3
                  ${formData.specialization_id === spec.id.toString()
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                  }
                `}>
                  {getSpecializationIcon(spec.icon)}
                </div>
                <p className="font-medium text-slate-900 text-sm">{spec.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{spec.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={() => setStep(2)}
        disabled={!formData.specialization_id}
        className="w-full"
        size="lg"
      >
        Continue
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <AITipsPanel />
      
      {/* Personal Information Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Personal Information
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Your basic contact details for communication
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <User className="w-4 h-4 text-slate-400" />
            First Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            placeholder="e.g., John"
          />
        </div>
        
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <User className="w-4 h-4 text-slate-400" />
            Last Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            placeholder="e.g., Smith"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Address <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="e.g., doctor@example.com"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            We'll send application updates and notifications to this email
          </p>
        </div>
      </div>
      
      {/* Professional Information Section */}
      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Professional Information
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Tell us about your medical practice and experience
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <BadgeCheck className="w-4 h-4 text-slate-400" />
            License Number <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.license_number}
            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
            placeholder="e.g., MD-12345"
          />
        </div>
        
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <Briefcase className="w-4 h-4 text-slate-400" />
            Years of Experience
          </label>
          <Input
            type="number"
            value={formData.experience_years}
            onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
            placeholder="e.g., 5"
          />
        </div>
        
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <DollarSign className="w-4 h-4 text-slate-400" />
            Consultation Fee (MZN)
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={formData.consultation_fee}
              onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
              placeholder="e.g., 500"
              className="flex-1"
            />
            <button 
              type="button" 
              onClick={suggestFee}
              disabled={suggestingFee || !formData.experience_years}
              title="AI Suggest Fee"
              className="relative group px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              {suggestingFee ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Suggest</span>
                </>
              )}
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                AI Suggest Fee
              </div>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-violet-400" />
            Click the button for an AI-suggested consultation fee based on your profile
          </p>
        </div>
        
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Consultation Duration
          </label>
          <select
            value={formData.consultation_duration}
            onChange={(e) => setFormData({ ...formData, consultation_duration: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none bg-white text-slate-900"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <User className="w-4 h-4 text-slate-400" />
            Bio / About Yourself
          </label>
          
          {/* AI Writing Assistant - Single Line */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 bg-cyan-50 rounded-lg border border-cyan-100">
              <Sparkles className="w-3 h-3 text-cyan-500" />
              <span className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wide">AI</span>
            </div>
            
            {/* Generate Button */}
            <button
              type="button"
              onClick={generateBio}
              disabled={generatingBio || rephrasing || generatingCustomBio || !formData.experience_years}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-medium rounded-lg hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {generatingBio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              <span>Generate</span>
            </button>

            {/* Rephrase Dropdown */}
            <div className="relative group">
              <button
                type="button"
                disabled={!formData.bio.trim() || rephrasing || generatingBio || generatingCustomBio}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white text-slate-600 text-xs font-medium rounded-lg border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {rephrasing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                <span>Rephrase</span>
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-white rounded-lg border border-slate-200 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button type="button" onClick={() => rephraseBio('professional')} disabled={rephrasing} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-violet-50 transition-colors text-left">
                  <Briefcase className="w-3 h-3 text-violet-500" />
                  <span>Professional</span>
                </button>
                <button type="button" onClick={() => rephraseBio('friendly')} disabled={rephrasing} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-violet-50 transition-colors text-left">
                  <Smile className="w-3 h-3 text-amber-500" />
                  <span>Friendly</span>
                </button>
                <button type="button" onClick={() => rephraseBio('concise')} disabled={rephrasing} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-violet-50 transition-colors text-left">
                  <Zap className="w-3 h-3 text-cyan-500" />
                  <span>Concise</span>
                </button>
              </div>
            </div>

            {/* Add Your Touch */}
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              disabled={generatingBio || rephrasing || generatingCustomBio}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                showCustomInput ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:bg-violet-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <PenLine className="w-3 h-3" />
              <span>Add Your Touch</span>
            </button>
          </div>
        </div>
        
        {/* Custom Input Area */}
        {showCustomInput && (
          <div className="mb-3 p-3 bg-violet-50/50 rounded-xl border border-violet-100">
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              What would you like to highlight in your bio?
            </label>
            <textarea
              value={customDetails}
              onChange={(e) => setCustomDetails(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 outline-none resize-none text-slate-700 placeholder:text-slate-400 bg-white"
              placeholder="e.g., My passion for pediatric care, 10 years in rural healthcare, multilingual..."
            />
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => { setShowCustomInput(false); setCustomDetails(''); }} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={generateCustomBio}
                disabled={generatingCustomBio || !customDetails.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-medium rounded-lg hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {generatingCustomBio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Generate</span>
              </button>
            </div>
          </div>
        )}

        {/* Bio Textarea */}
        <div className="relative">
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none resize-none text-slate-900 placeholder:text-slate-400"
            placeholder="Tell patients about yourself, your experience, and your approach to healthcare..."
          />
          {(generatingBio || rephrasing || generatingCustomBio) && (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-cyan-200">
                <div className="w-5 h-5 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white animate-pulse" />
                </div>
                <span className="text-sm font-medium text-cyan-700">
                  {generatingBio ? 'Generating bio...' : rephrasing ? 'Rephrasing...' : 'Creating custom bio...'}
                </span>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-amber-400" />
          Use AI to generate, rephrase, or add your personal touch to your bio
        </p>
      </div>

      {/* Languages */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
          <Languages className="w-4 h-4 text-slate-400" />
          Languages Spoken
        </label>
        
        {/* Common Language Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['Portuguese', 'English', 'Swahili', 'French', 'Spanish', 'Arabic', 'Mandarin', 'Hindi'].map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                if (!formData.languages.includes(lang)) {
                  setFormData({ ...formData, languages: [...formData.languages, lang] });
                }
              }}
              disabled={formData.languages.includes(lang)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                formData.languages.includes(lang)
                  ? 'bg-cyan-100 text-cyan-700 border-cyan-200 cursor-default'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700'
              }`}
            >
              {formData.languages.includes(lang) && <span className="mr-1">✓</span>}
              {lang}
            </button>
          ))}
        </div>

        {/* Custom Language Input */}
        <div className="flex gap-2 mb-3">
          <Input
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value)}
            placeholder="Add other language..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
          />
          <Button type="button" onClick={addLanguage} variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Selected Languages */}
        {formData.languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.languages.map((lang: string) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-50 text-cyan-700 text-sm font-medium border border-cyan-100"
              >
                {lang}
                <button
                  type="button"
                  onClick={() => removeLanguage(lang)}
                  className="text-cyan-400 hover:text-cyan-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Validation message */}
      {(!formData.first_name || !formData.last_name || !formData.email || !formData.license_number || !formData.experience_years || !formData.consultation_fee || formData.languages.length === 0) && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Complete Required Fields</p>
            <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
              {!formData.first_name && <li>First name is required</li>}
              {!formData.last_name && <li>Last name is required</li>}
              {!formData.email && <li>Email address is required</li>}
              {!formData.license_number && <li>License number is required</li>}
              {!formData.experience_years && <li>Years of experience is required</li>}
              {!formData.consultation_fee && <li>Consultation fee is required</li>}
              {formData.languages.length === 0 && <li>At least one language is required</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={() => setStep(3)}
          disabled={!formData.first_name || !formData.last_name || !formData.email || !formData.license_number || !formData.experience_years || !formData.consultation_fee || formData.languages.length === 0}
          className="flex-1"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <AITipsPanel />
      
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Education & Qualifications
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Add your medical degrees and certifications
        </p>
      </div>

      <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
        {/* Degree Chips */}
        <div className="mb-4">
          <label className="text-xs font-medium text-slate-500 mb-2 block uppercase tracking-wide">Quick Select Degree</label>
          <div className="flex flex-wrap gap-1.5">
            {['MBBS', 'MD', 'MBChB', 'DO', 'PhD', 'MSc', 'BSc Nursing', 'PharmD', 'DDS', 'BDS'].map((degree) => (
              <button
                key={degree}
                type="button"
                onClick={() => setNewEducation({ ...newEducation, degree })}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  newEducation.degree === degree
                    ? 'bg-cyan-100 text-cyan-700 border-cyan-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700'
                }`}
              >
                {degree}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Degree</label>
            <Input
              value={newEducation.degree}
              onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
              placeholder="e.g., MBBS, MD"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Institution</label>
            <Input
              value={newEducation.institution}
              onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
              placeholder="e.g., University of Maputo"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Year</label>
            <Input
              value={newEducation.year}
              onChange={(e) => setNewEducation({ ...newEducation, year: e.target.value })}
              placeholder="e.g., 2015"
            />
          </div>
        </div>
        <Button 
          type="button" 
          onClick={addEducation} 
          variant="outline" 
          size="sm"
          disabled={!newEducation.degree || !newEducation.institution || !newEducation.year}
        >
          <Plus className="w-4 h-4" />
          Add Education
        </Button>
      </div>

      {formData.education.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Added Qualifications</p>
          {formData.education.map((edu: Education, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{edu.degree}</p>
                  <p className="text-sm text-slate-500">{edu.institution} &bull; {edu.year}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeEducation(index)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Validation message */}
      {formData.education.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Education Required</p>
            <p className="text-sm text-amber-700">Please add at least one educational qualification to continue.</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button 
          onClick={() => setStep(4)} 
          disabled={formData.education.length === 0}
          className="flex-1"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <AITipsPanel />
      
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Upload KYC Documents
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Please upload clear photos or scans of your documents for verification.
          This helps us ensure the safety and trust of our patients.
        </p>
      </div>

      <div className="space-y-5">
        {/* Government ID */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <Shield className="w-4 h-4 text-slate-400" />
            Government ID (Passport, National ID, or Driver&apos;s License)
          </label>
          <div 
            className={`
              border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
              ${governmentId 
                ? 'border-green-400 bg-green-50' 
                : savedGovIdMeta
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-300 hover:border-cyan-400 hover:bg-slate-50'
              }
            `}
            onClick={() => document.getElementById('gov-id-input')?.click()}
          >
            <input
              id="gov-id-input"
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setGovernmentId(e.target.files?.[0] || null)}
            />
            {governmentId ? (
              <div className="text-green-600">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <p className="font-medium">{governmentId.name}</p>
                <p className="text-sm text-green-500 mt-1">Click to change file</p>
              </div>
            ) : savedGovIdMeta ? (
              <div className="text-amber-600">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-medium">Previously: {savedGovIdMeta.name}</p>
                <p className="text-sm text-amber-500 mt-1">Please re-upload this file</p>
              </div>
            ) : (
              <div className="text-slate-500">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-medium text-slate-700">Click to upload</p>
                <p className="text-sm mt-1">PNG, JPG or PDF (max 10MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* Medical Certificate */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <FileText className="w-4 h-4 text-slate-400" />
            Medical License / Certificate
          </label>
          <div 
            className={`
              border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
              ${medicalCertificate 
                ? 'border-green-400 bg-green-50' 
                : savedMedCertMeta
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-300 hover:border-cyan-400 hover:bg-slate-50'
              }
            `}
            onClick={() => document.getElementById('med-cert-input')?.click()}
          >
            <input
              id="med-cert-input"
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setMedicalCertificate(e.target.files?.[0] || null)}
            />
            {medicalCertificate ? (
              <div className="text-green-600">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <p className="font-medium">{medicalCertificate.name}</p>
                <p className="text-sm text-green-500 mt-1">Click to change file</p>
              </div>
            ) : savedMedCertMeta ? (
              <div className="text-amber-600">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-medium">Previously: {savedMedCertMeta.name}</p>
                <p className="text-sm text-amber-500 mt-1">Please re-upload this file</p>
              </div>
            ) : (
              <div className="text-slate-500">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-medium text-slate-700">Click to upload</p>
                <p className="text-sm mt-1">PNG, JPG or PDF (max 10MB)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={() => setStep(5)}
          disabled={!governmentId || !medicalCertificate}
          className="flex-1"
        >
          Review Application
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // Step 5: Review & Submit
  const renderStep5 = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-slate-200">
        <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/30">
          <Eye className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Review Your Application</h3>
        <p className="text-slate-500 text-sm mt-1">Please verify all information before submitting</p>
      </div>

      {/* Specialty Section */}
      <div className="bg-slate-50 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-cyan-500" />
            Specialty
          </h4>
          <button 
            onClick={() => setStep(1)} 
            className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
          >
            Edit
          </button>
        </div>
        <p className="text-slate-700">{getSelectedSpecName()}</p>
      </div>

      {/* Professional Details Section */}
      <div className="bg-slate-50 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-cyan-500" />
            Professional Details
          </h4>
          <button 
            onClick={() => setStep(2)} 
            className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">License Number</p>
            <p className="text-slate-900 font-medium">{formData.license_number || '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Experience</p>
            <p className="text-slate-900 font-medium">{formData.experience_years} years</p>
          </div>
          <div>
            <p className="text-slate-500">Consultation Fee</p>
            <p className="text-slate-900 font-medium">{formData.consultation_fee} MZN</p>
          </div>
          <div>
            <p className="text-slate-500">Session Duration</p>
            <p className="text-slate-900 font-medium">{formData.consultation_duration} minutes</p>
          </div>
        </div>
        {formData.languages.length > 0 && (
          <div>
            <p className="text-slate-500 text-sm mb-2">Languages</p>
            <div className="flex flex-wrap gap-2">
              {formData.languages.map((lang: string) => (
                <span key={lang} className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}
        {formData.bio && (
          <div>
            <p className="text-slate-500 text-sm mb-1">Bio</p>
            <p className="text-slate-700 text-sm leading-relaxed">{formData.bio}</p>
          </div>
        )}
      </div>

      {/* Education Section */}
      <div className="bg-slate-50 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-cyan-500" />
            Education
          </h4>
          <button 
            onClick={() => setStep(3)} 
            className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
          >
            Edit
          </button>
        </div>
        {formData.education.length > 0 ? (
          <div className="space-y-3">
            {formData.education.map((edu: Education, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{edu.degree}</p>
                  <p className="text-sm text-slate-500">{edu.institution} • {edu.year}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm italic">No education details added</p>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-slate-50 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-500" />
            Documents
          </h4>
          <button 
            onClick={() => setStep(4)} 
            className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">Government ID</p>
              <p className="text-xs text-slate-500 truncate">{governmentId?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">Medical License</p>
              <p className="text-xs text-slate-500 truncate">{medicalCertificate?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agreement */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-800 font-medium">Before you submit</p>
            <p className="text-amber-700 mt-1">
              By submitting this application, you confirm that all information provided is accurate 
              and you agree to our <Link to="/terms" className="underline">Terms of Service</Link> and{' '}
              <Link to="/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Submit Application
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((s, index) => (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all
                        ${s.id < step
                          ? 'bg-cyan-500 text-white'
                          : s.id === step
                            ? 'bg-cyan-500 text-white ring-4 ring-cyan-500/20'
                            : 'bg-slate-200 text-slate-500'
                        }
                      `}
                    >
                      {s.id < step ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <s.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${
                      s.id <= step ? 'text-cyan-600' : 'text-slate-400'
                    }`}>
                      {s.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 mt-[-24px] ${
                      s.id < step ? 'bg-cyan-500' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <Card className="p-6 sm:p-8">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-start gap-4 sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Register as a Doctor
                </h1>
                <p className="text-slate-500 mt-1">
                  Join NovareHealth and start helping patients across Africa
                </p>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 rounded-full blur-sm opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white rounded-full text-xs font-semibold shadow-lg">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI-Powered</span>
                </div>
              </div>
            </div>

            <div>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
              {step === 5 && renderStep5()}
            </div>
          </Card>

          {/* Trust indicators */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Secure & Encrypted</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100">
              <BadgeCheck className="w-4 h-4 text-cyan-500" />
              <span>Verified Platform</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-full shadow-sm border border-cyan-200">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span className="text-cyan-700 font-medium">AI-Assisted</span>
            </div>
          </div>
        </div>
      </main>

      {/* AI Chat Widget */}
      <AIChatWidget />
      
      {/* Login Prompt Modal */}
      <LoginPromptModal />
      
      {/* Recovery Prompt Modal */}
      <RecoveryPromptModal />
    </div>
  );
};

export default DoctorRegisterPage;
