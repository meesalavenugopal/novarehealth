import { useState, useRef, useEffect } from 'react';
import { Bot, X, Sparkles, Send, MessageCircle } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatWidgetProps {
  context: 'general' | 'patient' | 'doctor' | 'home';
  title?: string;
  subtitle?: string;
  quickActions?: string[];
  placeholder?: string;
}

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
    systemPrompt: 'You are a welcoming assistant for NovareHealth, a telemedicine platform in Mozambique. Help visitors understand the platform, explain telemedicine benefits, guide them on getting started, and answer questions about available services.'
  }
};

export default function AIChatWidget({ 
  context, 
  title, 
  subtitle, 
  quickActions, 
  placeholder = 'Type your message...' 
}: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = contextConfig[context];
  const displayTitle = title || config.title;
  const displaySubtitle = subtitle || config.subtitle;
  const displayQuickActions = quickActions || config.quickActions;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (customMessage?: string) => {
    const messageText = customMessage || inputRef.current?.value?.trim();
    if (!messageText) return;

    if (inputRef.current) {
      inputRef.current.value = '';
    }

    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          context: config.systemPrompt,
          conversation_history: messages.slice(-10) // Send last 10 messages for context
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

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isOpen ? 'w-96' : ''}`}>
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
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
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
                      {msg.content}
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
  );
}
