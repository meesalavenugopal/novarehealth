import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { Navbar, Footer } from '../../components/layout';
import { useAuthStore } from '../../store/authStore';
import { Clock, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface DoctorProfile {
  id: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

export const VerificationPendingPage: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/doctors/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch application status');
      }

      const data = await response.json();
      setDoctorProfile(data);

      // Redirect to dashboard if verified
      if (data.verification_status === 'verified') {
        navigate('/doctor/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [accessToken]);

  const getStatusIcon = () => {
    if (!doctorProfile) return <Clock className="w-10 h-10 text-amber-600" />;
    
    switch (doctorProfile.verification_status) {
      case 'verified':
        return <CheckCircle className="w-10 h-10 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-10 h-10 text-red-600" />;
      default:
        return <Clock className="w-10 h-10 text-amber-600" />;
    }
  };

  const getStatusColor = () => {
    if (!doctorProfile) return 'bg-amber-100';
    
    switch (doctorProfile.verification_status) {
      case 'verified':
        return 'bg-green-100';
      case 'rejected':
        return 'bg-red-100';
      default:
        return 'bg-amber-100';
    }
  };

  const getStatusTitle = () => {
    if (!doctorProfile) return 'Application Under Review';
    
    switch (doctorProfile.verification_status) {
      case 'verified':
        return 'Application Approved!';
      case 'rejected':
        return 'Application Not Approved';
      default:
        return 'Application Under Review';
    }
  };

  const getStatusMessage = () => {
    if (!doctorProfile) return 'Our team is reviewing your application and documents.';
    
    switch (doctorProfile.verification_status) {
      case 'verified':
        return 'Congratulations! Your application has been approved. You can now start accepting patients.';
      case 'rejected':
        return doctorProfile.rejection_reason || 'Unfortunately, your application was not approved. Please contact support for more information.';
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <Card className="max-w-lg w-full p-8 text-center">
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

              <button
                onClick={fetchStatus}
                className="mt-6 inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Status
              </button>
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
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-medium text-red-800 mb-1">Reason:</p>
              <p className="text-sm text-red-700">
                {doctorProfile.rejection_reason || 'Please contact support for more details about your application.'}
              </p>
            </div>
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
                  <Button className="w-full">
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
      </main>

      <Footer />
    </div>
  );
};

export default VerificationPendingPage;
