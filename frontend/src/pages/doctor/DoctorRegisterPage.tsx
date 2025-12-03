import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button, Input, Card, CardHeader } from '../../components/ui';
import { Navbar } from '../../components/layout';

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

export const DoctorRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    specialization_id: '',
    license_number: '',
    experience_years: '',
    bio: '',
    consultation_fee: '',
    consultation_duration: '30',
    languages: [] as string[],
    education: [] as Education[],
  });
  
  // KYC files
  const [governmentId, setGovernmentId] = useState<File | null>(null);
  const [medicalCertificate, setMedicalCertificate] = useState<File | null>(null);
  
  const [newLanguage, setNewLanguage] = useState('');
  const [newEducation, setNewEducation] = useState<Education>({
    degree: '',
    institution: '',
    year: '',
  });

  // Fetch specializations
  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/doctors/specializations/all');
        if (response.ok) {
          const data = await response.json();
          setSpecializations(data);
        }
      } catch (error) {
        console.error('Failed to fetch specializations:', error);
        // Use default specializations if fetch fails
        setSpecializations([
          { id: 1, name: 'General Medicine', description: 'Primary healthcare', icon: 'stethoscope' },
          { id: 2, name: 'Cardiology', description: 'Heart specialist', icon: 'heart' },
          { id: 3, name: 'Dermatology', description: 'Skin specialist', icon: 'skin' },
          { id: 4, name: 'Pediatrics', description: 'Child healthcare', icon: 'baby' },
          { id: 5, name: 'Orthopedics', description: 'Bone specialist', icon: 'bone' },
          { id: 6, name: 'Gynecology', description: "Women's health", icon: 'female' },
          { id: 7, name: 'Neurology', description: 'Brain specialist', icon: 'brain' },
          { id: 8, name: 'Psychiatry', description: 'Mental health', icon: 'brain' },
        ]);
      }
    };
    fetchSpecializations();
  }, []);

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
      languages: formData.languages.filter(l => l !== lang),
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
      education: formData.education.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Step 1: Register as doctor
      const registerResponse = await fetch('http://localhost:8000/api/v1/doctors/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
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
        throw new Error(errorData.detail || 'Failed to register as doctor');
      }

      // Step 2: Upload KYC documents
      if (governmentId) {
        const govIdFormData = new FormData();
        govIdFormData.append('file', governmentId);
        
        await fetch('http://localhost:8000/api/v1/uploads/kyc/government-id', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: govIdFormData,
        });
      }

      if (medicalCertificate) {
        const certFormData = new FormData();
        certFormData.append('file', medicalCertificate);
        
        await fetch('http://localhost:8000/api/v1/uploads/kyc/medical-certificate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: certFormData,
        });
      }

      // Success! Navigate to verification pending page
      navigate('/doctor/verification-pending');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Select Your Specialization
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {specializations.map((spec) => (
            <div
              key={spec.id}
              onClick={() => setFormData({ ...formData, specialization_id: spec.id.toString() })}
              className={`
                p-4 rounded-xl border-2 cursor-pointer transition-all
                ${formData.specialization_id === spec.id.toString()
                  ? 'border-cyan-500 bg-cyan-50'
                  : 'border-gray-200 hover:border-cyan-200 hover:bg-gray-50'
                }
              `}
            >
              <div className="text-2xl mb-2">
                {spec.icon === 'stethoscope' && '🩺'}
                {spec.icon === 'heart' && '❤️'}
                {spec.icon === 'skin' && '🧴'}
                {spec.icon === 'baby' && '👶'}
                {spec.icon === 'bone' && '🦴'}
                {spec.icon === 'female' && '♀️'}
                {spec.icon === 'brain' && '🧠'}
                {!['stethoscope', 'heart', 'skin', 'baby', 'bone', 'female', 'brain'].includes(spec.icon) && '⚕️'}
              </div>
              <p className="font-medium text-gray-900">{spec.name}</p>
              <p className="text-xs text-gray-500 mt-1">{spec.description}</p>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={() => setStep(2)}
        disabled={!formData.specialization_id}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Professional Information
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="License Number *"
          value={formData.license_number}
          onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
          placeholder="e.g., MD-12345"
        />
        
        <Input
          label="Years of Experience *"
          type="number"
          value={formData.experience_years}
          onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
          placeholder="e.g., 5"
        />
        
        <Input
          label="Consultation Fee (MZN) *"
          type="number"
          value={formData.consultation_fee}
          onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
          placeholder="e.g., 500"
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Consultation Duration
          </label>
          <select
            value={formData.consultation_duration}
            onChange={(e) => setFormData({ ...formData, consultation_duration: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bio / About Yourself
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none resize-none"
          placeholder="Tell patients about yourself, your experience, and your approach to healthcare..."
        />
      </div>

      {/* Languages */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Languages Spoken
        </label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value)}
            placeholder="e.g., Portuguese"
            onKeyDown={(e) => e.key === 'Enter' && addLanguage()}
          />
          <Button type="button" onClick={addLanguage} variant="outline">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.languages.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-sm"
            >
              {lang}
              <button
                type="button"
                onClick={() => removeLanguage(lang)}
                className="text-cyan-500 hover:text-cyan-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
          Back
        </Button>
        <Button
          onClick={() => setStep(3)}
          disabled={!formData.license_number || !formData.experience_years || !formData.consultation_fee}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Education & Qualifications
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Degree"
            value={newEducation.degree}
            onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
            placeholder="e.g., MBBS, MD"
          />
          <Input
            label="Institution"
            value={newEducation.institution}
            onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
            placeholder="e.g., University of Maputo"
          />
          <Input
            label="Year"
            value={newEducation.year}
            onChange={(e) => setNewEducation({ ...newEducation, year: e.target.value })}
            placeholder="e.g., 2015"
          />
        </div>
        <Button type="button" onClick={addEducation} variant="outline" size="sm">
          + Add Education
        </Button>
      </div>

      {formData.education.length > 0 && (
        <div className="space-y-2">
          {formData.education.map((edu, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
            >
              <div>
                <p className="font-medium text-gray-900">{edu.degree}</p>
                <p className="text-sm text-gray-500">{edu.institution} • {edu.year}</p>
              </div>
              <button
                type="button"
                onClick={() => removeEducation(index)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
          Back
        </Button>
        <Button onClick={() => setStep(4)} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Upload KYC Documents
      </h3>
      
      <p className="text-gray-600 text-sm">
        Please upload clear photos or scans of your documents for verification.
        This helps us ensure the safety and trust of our patients.
      </p>

      <div className="space-y-6">
        {/* Government ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Government ID (Passport, National ID, or Driver's License) *
          </label>
          <div 
            className={`
              border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
              ${governmentId ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-cyan-500'}
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
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-medium">{governmentId.name}</p>
                <p className="text-sm">Click to change</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="font-medium">Click to upload</p>
                <p className="text-sm">PNG, JPG or PDF (max 10MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* Medical Certificate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical License / Certificate *
          </label>
          <div 
            className={`
              border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
              ${medicalCertificate ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-cyan-500'}
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
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-medium">{medicalCertificate.name}</p>
                <p className="text-sm">Click to change</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="font-medium">Click to upload</p>
                <p className="text-sm">PNG, JPG or PDF (max 10MB)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !governmentId || !medicalCertificate}
          className="flex-1"
        >
          {loading ? 'Submitting...' : 'Submit Application'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-semibold
                      ${s <= step
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {s < step ? '✓' : s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`w-full h-1 mx-2 ${
                        s < step ? 'bg-cyan-500' : 'bg-gray-200'
                      }`}
                      style={{ width: '60px' }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Specialty</span>
              <span>Details</span>
              <span>Education</span>
              <span>Documents</span>
            </div>
          </div>

          <Card className="p-8">
            <CardHeader>
              <h1 className="text-2xl font-bold text-gray-900">
                Register as a Doctor
              </h1>
              <p className="text-gray-600 mt-1">
                Join NovareHealth and start helping patients across Africa
              </p>
            </CardHeader>

            <div className="mt-8">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DoctorRegisterPage;
