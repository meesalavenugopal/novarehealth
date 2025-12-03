import { RotateCcw, Clock, CheckCircle, XCircle, AlertCircle, CreditCard, HelpCircle } from 'lucide-react';
import { Navbar, Footer } from '../../components/layout';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      <Navbar />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl mb-6 shadow-lg shadow-cyan-500/25">
            <RotateCcw className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Refund Policy</h1>
          <p className="text-slate-600">Last updated: December 4, 2025</p>
        </div>

        {/* Quick Summary */}
        <div className="bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-xl font-bold mb-4">Quick Summary</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <Clock className="w-6 h-6 mb-2" />
              <p className="font-semibold">4+ Hours Notice</p>
              <p className="text-sm text-white/80">Full refund guaranteed</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <AlertCircle className="w-6 h-6 mb-2" />
              <p className="font-semibold">Under 4 Hours</p>
              <p className="text-sm text-white/80">50% refund</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <XCircle className="w-6 h-6 mb-2" />
              <p className="font-semibold">No-Show</p>
              <p className="text-sm text-white/80">No refund</p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="prose prose-slate max-w-none">
          <Section 
            icon={<CheckCircle className="w-5 h-5" />}
            title="1. Full Refund Eligibility"
          >
            <p className="text-slate-600 mb-4">
              You are entitled to a full refund (100%) in the following situations:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Cancellation made at least 4 hours before the scheduled appointment</li>
              <li>Doctor fails to attend the scheduled consultation</li>
              <li>Technical issues on our end prevent the consultation from taking place</li>
              <li>Doctor cancels the appointment for any reason</li>
              <li>Duplicate payments or billing errors</li>
              <li>Service not delivered as described</li>
            </ul>
          </Section>

          <Section 
            icon={<AlertCircle className="w-5 h-5" />}
            title="2. Partial Refund (50%)"
          >
            <p className="text-slate-600 mb-4">
              A 50% refund will be issued in these cases:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Cancellation made between 2-4 hours before the appointment</li>
              <li>Technical difficulties on the patient's end that prevent consultation completion</li>
              <li>Consultation ended early due to patient request (within first 5 minutes)</li>
            </ul>
          </Section>

          <Section 
            icon={<XCircle className="w-5 h-5" />}
            title="3. Non-Refundable Situations"
          >
            <p className="text-slate-600 mb-4">
              Refunds will not be issued in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>No-show: Patient fails to join the consultation without prior cancellation</li>
              <li>Cancellation made less than 2 hours before the appointment</li>
              <li>Completed consultations (once the session has concluded)</li>
              <li>Dissatisfaction with medical advice or diagnosis (unless malpractice is proven)</li>
              <li>Change of mind after the consultation has started</li>
              <li>Patient-side technical issues not reported within 5 minutes of appointment start</li>
            </ul>
          </Section>

          <Section 
            icon={<Clock className="w-5 h-5" />}
            title="4. Refund Processing Time"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Payment Method</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-semibold">Processing Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-4 text-slate-600">M-Pesa</td>
                    <td className="py-3 px-4 text-slate-600">Within 24 hours</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-4 text-slate-600">e-Mola</td>
                    <td className="py-3 px-4 text-slate-600">Within 24 hours</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-4 text-slate-600">Credit/Debit Card</td>
                    <td className="py-3 px-4 text-slate-600">5-10 business days</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-600">Bank Transfer</td>
                    <td className="py-3 px-4 text-slate-600">3-5 business days</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-500 text-sm mt-4">
              Note: Processing times may vary depending on your bank or mobile money provider.
            </p>
          </Section>

          <Section 
            icon={<CreditCard className="w-5 h-5" />}
            title="5. How to Request a Refund"
          >
            <p className="text-slate-600 mb-4">
              To request a refund, follow these steps:
            </p>
            <ol className="list-decimal list-inside text-slate-600 space-y-3">
              <li>
                <span className="font-medium">Through the App:</span> Go to My Appointments → Select the appointment → 
                Click "Request Refund"
              </li>
              <li>
                <span className="font-medium">Via Email:</span> Send your request to refunds@novarehealth.co.mz with:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>Your registered phone number or email</li>
                  <li>Appointment date and time</li>
                  <li>Doctor's name</li>
                  <li>Reason for refund request</li>
                  <li>Payment method used</li>
                </ul>
              </li>
              <li>
                <span className="font-medium">By Phone:</span> Call our support line at +258 84 123 4567 
                (Monday-Saturday, 8 AM - 8 PM)
              </li>
            </ol>
          </Section>

          <Section 
            icon={<HelpCircle className="w-5 h-5" />}
            title="6. Disputes and Appeals"
          >
            <p className="text-slate-600 mb-4">
              If you disagree with a refund decision:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>You may submit an appeal within 7 days of the original decision</li>
              <li>Provide any additional evidence or documentation to support your case</li>
              <li>Our team will review your appeal within 3 business days</li>
              <li>The decision on appeals is final</li>
            </ul>
            <p className="text-slate-600 mt-4">
              For disputes, contact us at disputes@novarehealth.co.mz
            </p>
          </Section>

          <Section 
            icon={<RotateCcw className="w-5 h-5" />}
            title="7. Special Circumstances"
          >
            <p className="text-slate-600 mb-4">
              We understand that exceptional situations may arise. In the following cases, we may offer 
              full refunds or credits at our discretion:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2">
              <li>Medical emergencies that prevent attendance (with documentation)</li>
              <li>Natural disasters or civil unrest affecting connectivity</li>
              <li>Death in the immediate family</li>
              <li>Hospitalization of the patient</li>
            </ul>
            <p className="text-slate-600 mt-4 italic">
              Please contact our support team with relevant documentation for consideration.
            </p>
          </Section>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Contact Our Refunds Team</h2>
            <div className="bg-slate-50 rounded-xl p-6">
              <p className="text-slate-700 font-medium">NovareHealth Refunds</p>
              <p className="text-slate-600">Email: refunds@novarehealth.co.mz</p>
              <p className="text-slate-600">Phone: +258 84 123 4567</p>
              <p className="text-slate-600">Hours: Monday - Saturday, 8 AM - 8 PM (CAT)</p>
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
