import { useState, useRef, useEffect, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, X, Sparkles, Send, MessageCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { config as appConfig } from '../../config';
import { useAuthStore } from '../../store/authStore';

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ChatErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AI Chat Widget Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Types
type ContextType = 'general' | 'patient' | 'doctor' | 'home';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatWidgetProps {
  context?: ContextType;
  title?: string;
  subtitle?: string;
  quickActions?: string[];
  placeholder?: string;
}

// Pages where the chat widget should be hidden
const HIDDEN_PATHS = [
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/verify-otp',
];

// Page-specific overrides for quick actions
interface PageOverride {
  context: ContextType;
  quickActions?: string[];
}

const PAGE_OVERRIDES: Record<string, PageOverride> = {
  '/dashboard': {
    context: 'patient',
    quickActions: ['View my appointments', 'Find a doctor', 'Check my prescriptions'],
  },
  '/doctor/dashboard': {
    context: 'doctor',
    quickActions: ['View today\'s schedule', 'Patient management tips', 'Prescription guidelines'],
  },
  '/appointments': {
    context: 'patient',
    quickActions: ['Book new appointment', 'Reschedule appointment', 'Cancel appointment'],
  },
  '/doctors': {
    context: 'patient',
    quickActions: ['Find specialist', 'Doctor availability', 'Compare doctors'],
  },
  '/health-records': {
    context: 'patient',
    quickActions: ['Upload health record', 'Share with doctor', 'Download records'],
  },
  '/prescriptions': {
    context: 'patient',
    quickActions: ['View active prescriptions', 'Refill medication', 'Drug interactions'],
  },
  // Admin pages
  '/admin': {
    context: 'general',
    quickActions: ['Platform statistics', 'Pending verifications', 'User management'],
  },
  '/admin/dashboard': {
    context: 'general',
    quickActions: ['Platform overview', 'Today\'s appointments', 'Revenue summary'],
  },
  '/admin/doctors': {
    context: 'general',
    quickActions: ['Pending verifications', 'Doctor statistics', 'Manage specializations'],
  },
  '/admin/patients': {
    context: 'general',
    quickActions: ['Patient statistics', 'User activity', 'Support requests'],
  },
  '/admin/appointments': {
    context: 'general',
    quickActions: ['Today\'s appointments', 'Appointment trends', 'Cancellation reasons'],
  },
  '/admin/specializations': {
    context: 'general',
    quickActions: ['Add specialization', 'Popular specializations', 'Doctor distribution'],
  },
};

// Context configurations
const contextConfig = {
  general: {
    title: 'AI Assistant',
    subtitle: 'How can I help you today?',
    quickActions: ['How does NovareHealth work?', 'Find a doctor', 'Contact support'],
    systemPrompt: 'You are a helpful assistant for NovareHealth, a telemedicine platform. Help users with general questions about the platform, finding doctors, booking appointments, and understanding services.'
  },
  patient: {
    title: 'Health Assistant',
    subtitle: 'Your personal health guide',
    quickActions: ['Find a specialist', 'Understand my symptoms', 'Book appointment'],
    systemPrompt: 'You are a helpful health assistant for NovareHealth patients. Help patients find doctors, understand general health topics (without providing medical diagnoses), book appointments, and navigate the platform. Always recommend consulting a doctor for medical advice.'
  },
  doctor: {
    title: 'Doctor Assistant',
    subtitle: 'Platform support for doctors',
    quickActions: ['Manage schedule', 'Patient management', 'Earnings help'],
    systemPrompt: 'You are a helpful assistant for doctors on NovareHealth. Help doctors manage their schedules, understand platform features, optimize their profiles, handle patient communications, and manage earnings.'
  },
  home: {
    title: 'NovareHealth AI',
    subtitle: 'Ask me anything',
    quickActions: ['What is telemedicine?', 'How to get started', 'Available specialties'],
    get systemPrompt() {
      return `You are a welcoming assistant for NovareHealth, a telemedicine platform in ${appConfig.country.name}. Help visitors understand the platform, explain telemedicine benefits, guide them on getting started, and answer questions about available services.`;
    }
  }
};

// Helper function to get page override
function getPageOverride(pathname: string): PageOverride | null {
  if (PAGE_OVERRIDES[pathname]) {
    return PAGE_OVERRIDES[pathname];
  }
  
  for (const [path, override] of Object.entries(PAGE_OVERRIDES)) {
    if (pathname.startsWith(path + '/')) {
      return override;
    }
  }
  
  return null;
}

// Helper function to get default context based on user role
function getDefaultContext(role: string | undefined): ContextType {
  if (!role) return 'home';
  
  switch (role) {
    case 'patient':
      return 'patient';
    case 'doctor':
      return 'doctor';
    case 'admin':
      return 'general';
    default:
      return 'home';
  }
}

export default function AIChatWidget({ 
  context: propContext, 
  title, 
  subtitle, 
  quickActions, 
  placeholder = 'Type your message...' 
}: AIChatWidgetProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  
  // Check if widget should be hidden on this page
  const shouldHide = HIDDEN_PATHS.some(path => 
    location.pathname === path || location.pathname.startsWith(path + '/')
  );
  
  // Determine effective context
  let effectiveContext: ContextType;
  let overrideQuickActions: string[] | undefined;
  
  if (propContext) {
    effectiveContext = propContext;
  } else {
    const pageOverride = getPageOverride(location.pathname);
    if (pageOverride) {
      effectiveContext = pageOverride.context;
      overrideQuickActions = pageOverride.quickActions;
    } else {
      effectiveContext = getDefaultContext(user?.role);
    }
  }

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = contextConfig[effectiveContext];
  const displayTitle = title || config.title;
  const displaySubtitle = subtitle || config.subtitle;
  const displayQuickActions = quickActions || overrideQuickActions || config.quickActions;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Hide widget on certain pages
  if (shouldHide) {
    return null;
  }

  const sendMessage = async (customMessage?: string) => {
    const messageText = customMessage || inputRef.current?.value?.trim();
    if (!messageText) return;

    if (inputRef.current) {
      inputRef.current.value = '';
    }

    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setIsLoading(true);

    try {
      // Build headers with auth token if user is logged in
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${appConfig.apiUrl}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: messageText,
          context: config.systemPrompt,
          conversation_history: messages.slice(-10)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'm having trouble connecting right now. Please try again in a moment." 
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm currently offline. Please check your connection and try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat function
  const clearChat = () => {
    setMessages([]);
  };

  return (
    <ChatErrorBoundary>
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isOpen ? 'w-full sm:w-96 max-w-[calc(100vw-3rem)]' : ''}`}>
      {isOpen ? (
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
                    <h3 className="font-semibold text-white">{displayTitle}</h3>
                    <p className="text-xs text-white/70">{displaySubtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {messages.length > 0 && (
                    <button 
                      onClick={clearChat}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all"
                      title="Clear chat"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    <Sparkles className="w-8 h-8 text-cyan-500" />
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-1">How can I help you?</h4>
                  <p className="text-sm text-slate-500 mb-4">I'm here to assist you with NovareHealth.</p>
                  
                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {displayQuickActions.map((action) => (
                      <button
                        key={action}
                        onClick={() => sendMessage(action)}
                        className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-medium rounded-full border border-cyan-200 transition-colors"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.role === 'assistant' ? 'flex items-start gap-2' : ''}`}>
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
                      {msg.role === 'assistant' ? (
                        <div className="space-y-2">
                          {msg.content.split('\n').map((line, i) => (
                            <p key={i} className={line.trim() === '' ? 'h-2' : ''}>
                              {line.startsWith('- ') || line.match(/^\d+\./) ? (
                                <span className="flex gap-2">
                                  <span className="text-cyan-500 font-medium">{line.match(/^-|\d+\./)?.[0]}</span>
                                  <span>{line.replace(/^-\s*|\d+\.\s*/, '')}</span>
                                </span>
                              ) : (
                                line
                              )}
                            </p>
                          ))}
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
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
                    ref={inputRef}
                    type="text"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-slate-400"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={isLoading}
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
          onClick={() => setIsOpen(true)}
          className="group relative w-16 h-16 bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-cyan-500/40 hover:shadow-cyan-500/60 transition-all hover:scale-105 active:scale-95"
        >
          {/* Pulse Animation */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 animate-ping opacity-30" />
          
          {/* Icon */}
          <div className="relative">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          
          {/* Badge */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-cyan-500 flex items-center justify-center shadow-sm">
            <Sparkles className="w-3 h-3 text-cyan-500" />
          </div>
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            Chat with AI
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-slate-900 rotate-45" />
          </div>
        </button>
      )}
    </div>
    </ChatErrorBoundary>
  );
}
