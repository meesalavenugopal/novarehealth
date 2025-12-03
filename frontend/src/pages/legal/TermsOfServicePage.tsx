import { FileText, Users, CreditCard, AlertTriangle, Scale, Clock, CheckCircle } from 'lucide-react';
import { Navbar, Footer } from '../../components/layout';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      <Navbar />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl mb-6 shadow-lg shadow-cyan-500/25">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Terms of Service</h1>
          <p className="text-slate-600">Last updated: December 4, 2025</p>
        </div>

        {/* Content Sections */}
        <div className="prose prose-slate max-w-none">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
            <p className="text-slate-600 leading-relaxed">
              Welcome to NovareHealth. By accessing or using our telemedicine platform, you agree to be bound by these 
              Terms of Service. Please read them carefully before using our services.
            </p>
          </div>

          <Section 
            icon={<CheckCircle className="w-5 h-5" />}
            title="1. Acceptance of Terms"
          >
            <p className="text-slate-600 mb-4">
              By creating an account or using NovareHealth, you acknowledge that you have read, understood, and agree 
              to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, 
              please do not use our platform.
            </p>
            <p className="text-slate-600">
              You must be at least 18 years old to use NovareHealth. If you are under 18, you may only use the 
              platform with the involvement of a parent or legal guardian.
            </p>
          </Section>

          <Section 
            icon={<Users className="w-5 h-5" />}
            title="2. User Accounts"
          >
            <h4 className="font-semibold text-slate-800 mt-4 mb-2">For Patients</h4>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>You must provide accurate and complete information during registration</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>You agree to provide truthful health information to healthcare providers</li>
            </ul>

            <h4 className="font-semibold text-slate-800 mt-6 mb-2">For Doctors</h4>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>You must hold valid medical licenses in Mozambique</li>
              <li>You must provide accurate credential information for verification</li>
              <li>You agree to maintain professional standards of care</li>
              <li>You must keep your availability and profile information current</li>
              <li>You are responsible for the accuracy of prescriptions and medical advice</li>
            </ul>
          </Section>

          <Section 
            icon={<Scale className="w-5 h-5" />}
            title="3. Medical Services Disclaimer"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium mb-2">Important Medical Disclaimer</p>
                  <p className="text-amber-700 text-sm">
                    NovareHealth is a telemedicine platform that connects patients with licensed healthcare providers. 
                    We do not provide medical advice, diagnosis, or treatment directly. The platform facilitates 
                    consultations but does not replace in-person medical care when needed.
                  </p>
                </div>
              </div>
            </div>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Telemedicine is not suitable for all medical conditions</li>
              <li>In case of emergency, call local emergency services immediately</li>
              <li>Doctors on our platform are independent practitioners, not NovareHealth employees</li>
              <li>We do not guarantee the availability of specific doctors or appointment times</li>
              <li>Treatment outcomes may vary and are not guaranteed</li>
            </ul>
          </Section>

          <Section 
            icon={<CreditCard className="w-5 h-5" />}
            title="4. Payments and Fees"
          >
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Consultation fees are displayed before booking and must be paid in advance</li>
              <li>We accept M-Pesa, e-Mola, credit/debit cards, and bank transfers</li>
              <li>All fees are in Mozambican Meticais (MZN) unless otherwise stated</li>
              <li>NovareHealth charges a platform fee for facilitating consultations</li>
              <li>Doctors set their own consultation fees</li>
              <li>Payment processing is handled by secure third-party providers</li>
            </ul>
          </Section>

          <Section 
            icon={<Clock className="w-5 h-5" />}
            title="5. Appointments and Cancellations"
          >
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Appointments must be cancelled at least 4 hours in advance for a full refund</li>
              <li>No-shows may result in forfeiture of the consultation fee</li>
              <li>Doctors who fail to attend scheduled appointments will have fees refunded to patients</li>
              <li>Rescheduling is allowed up to 2 hours before the appointment</li>
              <li>Technical issues during consultations may qualify for rescheduling or refund</li>
            </ul>
          </Section>

          <Section 
            icon={<AlertTriangle className="w-5 h-5" />}
            title="6. Prohibited Conduct"
          >
            <p className="text-slate-600 mb-4">Users are prohibited from:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Providing false or misleading information</li>
              <li>Impersonating another person or healthcare provider</li>
              <li>Using the platform for illegal purposes</li>
              <li>Attempting to access other users' accounts or data</li>
              <li>Interfering with the platform's operation or security</li>
              <li>Sharing account credentials with others</li>
              <li>Recording consultations without consent</li>
              <li>Harassing or abusing other users or staff</li>
            </ul>
          </Section>

          <Section 
            icon={<FileText className="w-5 h-5" />}
            title="7. Limitation of Liability"
          >
            <p className="text-slate-600 mb-4">
              To the fullest extent permitted by law, NovareHealth shall not be liable for:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Any medical advice, diagnosis, or treatment provided by doctors</li>
              <li>Technical failures or service interruptions</li>
              <li>Loss of data or unauthorized access to accounts</li>
              <li>Indirect, incidental, or consequential damages</li>
              <li>Actions of third-party service providers</li>
            </ul>
          </Section>

          <Section 
            icon={<Scale className="w-5 h-5" />}
            title="8. Governing Law"
          >
            <p className="text-slate-600">
              These Terms of Service are governed by the laws of Mozambique. Any disputes arising from the use of 
              NovareHealth shall be resolved through arbitration in Maputo, Mozambique, in accordance with local 
              arbitration rules. You agree to submit to the exclusive jurisdiction of the courts of Mozambique.
            </p>
          </Section>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">9. Contact Us</h2>
            <p className="text-slate-600 mb-4">
              For questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-slate-50 rounded-xl p-6">
              <p className="text-slate-700 font-medium">NovareHealth Legal Team</p>
              <p className="text-slate-600">Email: legal@novarehealth.co.mz</p>
              <p className="text-slate-600">Phone: +258 84 123 4567</p>
              <p className="text-slate-600">Address: Rua da Resistência 1095, Maputo, Mozambique</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-xl flex items-center justify-center text-cyan-600">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}
