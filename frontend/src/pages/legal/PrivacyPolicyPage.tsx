import { Shield, Lock, Eye, Database, UserCheck, Globe, Mail } from 'lucide-react';
import { Navbar, Footer } from '../../components/layout';
import { config } from '../../config';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      <Navbar />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl mb-6 shadow-lg shadow-cyan-500/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
          <p className="text-slate-600">Last updated: December 4, 2025</p>
        </div>

        {/* Content Sections */}
        <div className="prose prose-slate max-w-none">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
            <p className="text-slate-600 leading-relaxed">
              At NovareHealth, we are committed to protecting your privacy and ensuring the security of your personal 
              and health information. This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              information when you use our telemedicine platform.
            </p>
          </div>

          <Section 
            icon={<Database className="w-5 h-5" />}
            title="1. Information We Collect"
          >
            <h4 className="font-semibold text-slate-800 mt-4 mb-2">Personal Information</h4>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Full name, email address, and phone number</li>
              <li>Date of birth and gender</li>
              <li>Physical address and location data</li>
              <li>Government-issued identification (for doctors)</li>
              <li>Professional credentials and medical licenses (for doctors)</li>
            </ul>

            <h4 className="font-semibold text-slate-800 mt-6 mb-2">Health Information</h4>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Medical history and health records</li>
              <li>Consultation notes and diagnoses</li>
              <li>Prescriptions and treatment plans</li>
              <li>Lab results and medical documents</li>
              <li>Video consultation recordings (with consent)</li>
            </ul>

            <h4 className="font-semibold text-slate-800 mt-6 mb-2">Technical Information</h4>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Device information and browser type</li>
              <li>IP address and location data</li>
              <li>Usage patterns and preferences</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </Section>

          <Section 
            icon={<Eye className="w-5 h-5" />}
            title="2. How We Use Your Information"
          >
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>To provide telemedicine consultations and healthcare services</li>
              <li>To verify doctor credentials and maintain quality standards</li>
              <li>To process payments and manage billing</li>
              <li>To send appointment reminders and health notifications</li>
              <li>To improve our platform and develop new features</li>
              <li>To comply with legal and regulatory requirements</li>
              <li>To prevent fraud and ensure platform security</li>
              <li>To provide customer support and respond to inquiries</li>
            </ul>
          </Section>

          <Section 
            icon={<Lock className="w-5 h-5" />}
            title="3. Data Security"
          >
            <p className="text-slate-600 mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>End-to-end encryption for all video consultations</li>
              <li>SSL/TLS encryption for data transmission</li>
              <li>Secure cloud storage with regular backups</li>
              <li>Multi-factor authentication for account access</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Strict access controls and employee training</li>
            </ul>
          </Section>

          <Section 
            icon={<UserCheck className="w-5 h-5" />}
            title="4. Your Rights"
          >
            <p className="text-slate-600 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Access your personal and health information</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Withdraw consent for data processing</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of marketing communications</li>
              <li>Lodge a complaint with regulatory authorities</li>
            </ul>
          </Section>

          <Section 
            icon={<Globe className="w-5 h-5" />}
            title="5. Data Sharing"
          >
            <p className="text-slate-600 mb-4">
              We may share your information with:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Healthcare providers involved in your care</li>
              <li>Payment processors for transaction handling</li>
              <li>Cloud service providers for data storage</li>
              <li>Regulatory authorities when required by law</li>
              <li>Third-party services with your explicit consent</li>
            </ul>
            <p className="text-slate-600 mt-4">
              We do not sell your personal or health information to third parties.
            </p>
          </Section>

          <Section 
            icon={<Mail className="w-5 h-5" />}
            title="6. Contact Us"
          >
            <p className="text-slate-600 mb-4">
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
            </p>
            <div className="bg-slate-50 rounded-xl p-6">
              <p className="text-slate-700 font-medium">NovareHealth Privacy Team</p>
              <p className="text-slate-600">Email: privacy@novarehealth.co.mz</p>
              <p className="text-slate-600">Phone: +258 84 123 4567</p>
              <p className="text-slate-600">Address: Rua da Resistência 1095, {config.country.capital}, {config.country.name}</p>
            </div>
          </Section>
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
