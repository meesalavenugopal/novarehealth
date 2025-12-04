import { Link } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold text-white">NovareHealth</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Your trusted healthcare partner in Africa. Connect with certified doctors for video consultations, 
              prescriptions, and health records — all from your phone.
            </p>
            <div className="flex gap-3">
              <SocialLink href="https://facebook.com" icon={<Facebook className="w-4 h-4" />} />
              <SocialLink href="https://twitter.com" icon={<Twitter className="w-4 h-4" />} />
              <SocialLink href="https://instagram.com" icon={<Instagram className="w-4 h-4" />} />
              <SocialLink href="https://linkedin.com" icon={<Linkedin className="w-4 h-4" />} />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <FooterLink to="/find-doctors">Find Doctors</FooterLink>
              <FooterLink to="/specializations">Specializations</FooterLink>
              <FooterLink to="/book-appointment">Book Appointment</FooterLink>
              <FooterLink to="/my-appointments">My Appointments</FooterLink>
              <FooterLink to="/prescriptions">Prescriptions</FooterLink>
            </ul>
          </div>

          {/* For Doctors */}
          <div>
            <h3 className="text-white font-semibold mb-4">For Doctors</h3>
            <ul className="space-y-3">
              <FooterLink to="/for-doctors">Join as Doctor</FooterLink>
              <FooterLink to="/doctor/dashboard">Doctor Dashboard</FooterLink>
              <FooterLink to="/doctor/earnings">Earnings</FooterLink>
              <FooterLink to="/doctor-guidelines">Guidelines</FooterLink>
              <FooterLink to="/faq/doctors">Doctor FAQ</FooterLink>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">
                  Rua da Resistência 1095<br />
                  Maputo, Mozambique
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                <a href="tel:+258841234567" className="text-sm hover:text-cyan-400 transition-colors">
                  +258 84 123 4567
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                <a href="mailto:support@novarehealth.co.mz" className="text-sm hover:text-cyan-400 transition-colors">
                  support@novarehealth.co.mz
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              © {currentYear} NovareHealth. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link to="/privacy" className="text-slate-400 hover:text-cyan-400 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-slate-400 hover:text-cyan-400 transition-colors">
                Terms of Service
              </Link>
              <Link to="/refund-policy" className="text-slate-400 hover:text-cyan-400 transition-colors">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="text-sm text-slate-400 hover:text-cyan-400 transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-cyan-600 hover:text-white transition-all"
    >
      {icon}
    </a>
  );
}
