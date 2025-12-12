import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScrollToTop from './components/common/ScrollToTop';
import LoginPage from './pages/auth/LoginPage';
import HomePage from './pages/common/HomePage';
import ProfilePage from './pages/common/ProfilePage';
import SettingsPage from './pages/common/SettingsPage';
import HelpPage from './pages/common/HelpPage';
import AppointmentsPage from './pages/common/AppointmentsPage';
import PrescriptionsPage from './pages/common/PrescriptionsPage';
import HealthRecordsPage from './pages/common/HealthRecordsPage';
import PatientDashboard from './pages/patient/Dashboard';
import FindDoctorsPage from './pages/patient/FindDoctorsPage';
import DoctorProfilePage from './pages/patient/DoctorProfilePage';
import SpecializationsPage from './pages/patient/SpecializationsPage';
import { 
  DoctorDashboard, 
  DoctorRegisterPage, 
  VerificationPendingPage, 
  AvailabilityPage,
  DoctorLandingPage
} from './pages/doctor';
import { AdminDashboard, PatientsPage as AdminPatientsPage, AppointmentsPage as AdminAppointmentsPage, SpecializationsPage as AdminSpecializationsPage } from './pages/admin';
import { PrivacyPolicyPage, TermsOfServicePage, RefundPolicyPage } from './pages/legal';
import ConsultationSummaryPage from './pages/common/consultation/ConsultationSummaryPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          
          {/* Common Routes (Protected - Any authenticated user) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin', 'super_admin']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin', 'super_admin']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/help"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin', 'super_admin']}>
                <HelpPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor']}>
                <AppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prescriptions"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor']}>
                <PrescriptionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/health-records"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <HealthRecordsPage />
              </ProtectedRoute>
            }
          />
          
          {/* Public doctor browsing - supports guest mode */}
          <Route path="/specializations" element={<SpecializationsPage />} />
          <Route path="/find-doctors" element={<FindDoctorsPage />} />
          <Route path="/doctor/:id" element={<DoctorProfilePage />} />
          
          {/* Patient Routes */}
          <Route
            path="/patient/dashboard"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <AppointmentsPage />
              </ProtectedRoute>
            }
          />
          
          {/* Doctor Routes */}
          <Route
            path="/for-doctors"
            element={<DoctorLandingPage />}
          />
          <Route
            path="/doctor/register"
            element={<DoctorRegisterPage />}
          />
          <Route
            path="/doctor/verification-pending"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <VerificationPendingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/appointments"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <AppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/availability"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <AvailabilityPage />
              </ProtectedRoute>
            }
          />
          
          {/* Consultation Summary Route (Zoom meetings handled externally) */}
          <Route
            path="/consultation/:appointmentId/summary"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor']}>
                <ConsultationSummaryPage />
              </ProtectedRoute>
            }
          />
          
          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminPatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/appointments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminAppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/specializations"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminSpecializationsPage />
              </ProtectedRoute>
            }
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

