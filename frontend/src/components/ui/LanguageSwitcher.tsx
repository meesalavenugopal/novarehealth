import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
}

const languages = [
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

// Helper to set Google Translate cookie
const setGoogleTranslateCookie = (langCode: string) => {
  const domain = window.location.hostname;
  document.cookie = `googtrans=/en/${langCode};path=/;domain=${domain}`;
  document.cookie = `googtrans=/en/${langCode};path=/`;
};

// Helper to get current Google Translate language
const getCurrentGoogleLang = (): string => {
  const match = document.cookie.match(/googtrans=\/en\/(\w+)/);
  return match ? match[1] : 'en';
};

export default function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => getCurrentGoogleLang());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(l => l.code === currentLang) || languages[1];

  // Initialize Google Translate
  useEffect(() => {
    // Add aggressive CSS to hide Google Translate banner FIRST
    const style = document.createElement('style');
    style.id = 'google-translate-hide-style';
    style.textContent = `
      .goog-te-banner-frame { display: none !important; visibility: hidden !important; height: 0 !important; }
      .skiptranslate { display: none !important; visibility: hidden !important; height: 0 !important; }
      .goog-te-banner-frame.skiptranslate { display: none !important; }
      body { top: 0 !important; position: static !important; }
      html { margin-top: 0 !important; }
      #goog-gt-tt { display: none !important; }
      .goog-te-balloon-frame { display: none !important; }
      .goog-text-highlight { background: none !important; box-shadow: none !important; }
      .VIpgJd-ZVi9od-l4eHX-hSRGPd { display: none !important; }
      iframe.goog-te-banner-frame { display: none !important; }
      .goog-te-spinner-pos { display: none !important; }
    `;
    if (!document.getElementById('google-translate-hide-style')) {
      document.head.insertBefore(style, document.head.firstChild);
    }

    // Add Google Translate script if not present
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.head.appendChild(script);

      // @ts-ignore
      window.googleTranslateElementInit = () => {
        // @ts-ignore
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,pt',
          autoDisplay: false,
        }, 'google_translate_element_hidden');
      };
    }

    // Also hide via interval in case it loads late
    const hideInterval = setInterval(() => {
      const frame = document.querySelector('.goog-te-banner-frame') as HTMLElement;
      const skipTranslate = document.querySelector('.skiptranslate') as HTMLElement;
      if (frame) frame.style.display = 'none';
      if (skipTranslate && !skipTranslate.closest('#google_translate_element_hidden')) {
        skipTranslate.style.display = 'none';
      }
      document.body.style.top = '0';
    }, 100);

    // Clean up after 5 seconds
    const timeout = setTimeout(() => clearInterval(hideInterval), 5000);

    return () => {
      clearInterval(hideInterval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    setCurrentLang(langCode);
    setIsOpen(false);
    
    // Set cookie and reload for Google Translate
    setGoogleTranslateCookie(langCode);
    window.location.reload();
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100/20 transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{currentLanguage.flag}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                currentLang === lang.code ? 'bg-cyan-50 !text-cyan-700' : '!text-slate-700'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="font-medium !text-slate-700">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
      {/* Hidden element for Google Translate */}
      <div id="google_translate_element_hidden" style={{ display: 'none' }} />
    </div>
  );
}
