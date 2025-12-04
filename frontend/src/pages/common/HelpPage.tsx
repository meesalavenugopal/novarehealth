import { useState } from 'react';
import { 
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  ArrowLeft,
  Send,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { useAuthStore } from '../../store/authStore';

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I book an appointment?',
        a: 'To book an appointment, navigate to "Find Doctors", select a doctor based on specialization, view their available slots, and click "Book Appointment". You\'ll need to complete payment to confirm your booking.'
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We accept M-Pesa mobile money payments. Simply enter your M-Pesa phone number during checkout and approve the payment request on your phone.'
      },
      {
        q: 'How do I join a video consultation?',
        a: 'At your scheduled appointment time, you\'ll receive a notification. Click "Join Consultation" from your appointments page or the notification to enter the video room.'
      },
    ]
  },
  {
    category: 'Appointments',
    questions: [
      {
        q: 'Can I reschedule my appointment?',
        a: 'Yes, you can reschedule your appointment up to 2 hours before the scheduled time. Go to your Appointments page, find the appointment, and click "Reschedule".'
      },
      {
        q: 'What is the cancellation policy?',
        a: 'Cancellations made 24+ hours before the appointment receive a full refund. Cancellations within 24 hours may be subject to a cancellation fee. Emergency cancellations are reviewed case-by-case.'
      },
      {
        q: 'What if my doctor doesn\'t show up?',
        a: 'If your doctor doesn\'t join within 15 minutes of the scheduled time, you can request a full refund or reschedule for free. Contact support for immediate assistance.'
      },
    ]
  },
  {
    category: 'Technical Issues',
    questions: [
      {
        q: 'My video isn\'t working. What should I do?',
        a: 'First, ensure you\'ve granted camera and microphone permissions in your browser. Try refreshing the page. If issues persist, check your internet connection or try a different browser.'
      },
      {
        q: 'I can\'t hear the doctor during the call.',
        a: 'Check that your device\'s volume is turned up and the correct audio output is selected. Ask the doctor to check their microphone. You can use the chat feature to communicate while troubleshooting.'
      },
      {
        q: 'The app is running slowly.',
        a: 'Try clearing your browser cache, closing other tabs, or using a different browser. For video calls, a stable internet connection of at least 1 Mbps is recommended.'
      },
    ]
  },
  {
    category: 'Account & Privacy',
    questions: [
      {
        q: 'How do I update my profile information?',
        a: 'Go to "My Profile" from the user menu. Click "Edit Profile" to update your personal information, contact details, and emergency contacts.'
      },
      {
        q: 'Is my health information secure?',
        a: 'Yes, we use industry-standard encryption to protect your data. Your health records are only accessible to you and the doctors you consult with. Read our Privacy Policy for more details.'
      },
      {
        q: 'How do I delete my account?',
        a: 'Contact our support team to request account deletion. Note that some data may be retained for legal/medical record-keeping requirements.'
      },
    ]
  },
];

export default function HelpPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const handleSendMessage = async () => {
    setSending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    setSent(true);
    setContactForm({ subject: '', message: '' });
    setTimeout(() => {
      setSent(false);
      setShowContactForm(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to={user?.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard'}
            className="p-2 hover:bg-white rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Help & Support</h1>
            <p className="text-slate-500">Find answers or get in touch with us</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help..."
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white shadow-sm"
          />
        </div>

        {/* Quick Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setShowContactForm(true)}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all text-left"
          >
            <div className="p-3 bg-cyan-50 rounded-xl">
              <MessageCircle className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Send Message</h3>
              <p className="text-sm text-slate-500">We'll respond within 24h</p>
            </div>
          </button>
          
          <a
            href="tel:+258840000000"
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all"
          >
            <div className="p-3 bg-green-50 rounded-xl">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Call Us</h3>
              <p className="text-sm text-slate-500">+258 84 000 0000</p>
            </div>
          </a>
          
          <a
            href="mailto:support@novarehealth.co.mz"
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all overflow-hidden"
          >
            <div className="p-3 bg-purple-50 rounded-xl flex-shrink-0">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">Email Us</h3>
              <p className="text-sm text-slate-500 truncate">support@novarehealth.co.mz</p>
            </div>
          </a>
        </div>

        {/* Contact Form Modal */}
        {showContactForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fadeIn">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Send us a message</h3>
              
              {sent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Message Sent!</h4>
                  <p className="text-slate-500">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        placeholder="What do you need help with?"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                      <textarea
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Describe your issue or question..."
                        rows={5}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowContactForm(false)}
                      className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !contactForm.subject || !contactForm.message}
                      className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send Message
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* FAQs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-600" />
              Frequently Asked Questions
            </h2>
          </div>
          
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-500">No results found for "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-cyan-600 hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            filteredFaqs.map((category) => (
              <div key={category.category} className="border-b border-slate-100 last:border-0">
                <h3 className="px-6 py-3 bg-slate-50 text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  {category.category}
                </h3>
                {category.questions.map((faq, idx) => {
                  const faqId = `${category.category}-${idx}`;
                  const isExpanded = expandedFaq === faqId;
                  
                  return (
                    <div key={idx} className="border-b border-slate-100 last:border-0">
                      <button
                        onClick={() => setExpandedFaq(isExpanded ? null : faqId)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-medium text-slate-900 pr-4">{faq.q}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-6 pb-4 text-slate-600 animate-fadeIn">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/privacy"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-cyan-300 transition-colors"
          >
            <FileText className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-slate-700">Privacy Policy</span>
            <ExternalLink className="w-4 h-4 text-slate-400 ml-auto" />
          </Link>
          <Link
            to="/terms"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-cyan-300 transition-colors"
          >
            <FileText className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-slate-700">Terms of Service</span>
            <ExternalLink className="w-4 h-4 text-slate-400 ml-auto" />
          </Link>
        </div>
      </div>
    </div>
  );
}
