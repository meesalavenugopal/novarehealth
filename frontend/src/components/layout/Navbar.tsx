import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Bell, 
  User,
  ChevronDown,
  LogOut,
  Settings,
  HelpCircle,
  LayoutDashboard
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

// Define navigation items for each role
const getNavItems = (role: string | undefined) => {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return [
        { to: '/admin/dashboard', label: 'Dashboard' },
        { to: '/admin/patients', label: 'Patients' },
        { to: '/admin/appointments', label: 'Appointments' },
        { to: '/admin/specializations', label: 'Specializations' },
      ];
    case 'doctor':
      return [
        { to: '/doctor/dashboard', label: 'Dashboard' },
        { to: '/doctor/appointments', label: 'Appointments' },
        { to: '/doctor/availability', label: 'Availability' },
        { to: '/prescriptions', label: 'Prescriptions' },
      ];
    case 'patient':
    default:
      return [
        { to: '/find-doctors', label: 'Find Doctors' },
        { to: '/appointments', label: 'Appointments' },
        { to: '/prescriptions', label: 'Prescriptions' },
        { to: '/health-records', label: 'Records' },
      ];
  }
};

// Get dashboard link based on role
const getDashboardLink = (role: string | undefined) => {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return '/admin/dashboard';
    case 'doctor':
      return '/doctor/dashboard';
    case 'patient':
      return '/patient/dashboard';
    default:
      return '/';
  }
};

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide navbar only on patient auth pages, not doctor registration
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  if (isAuthPage) return null;

  // Get role-specific navigation items
  const navItems = getNavItems(user?.role);
  const dashboardLink = getDashboardLink(user?.role);

  const notifications = [
    { id: 1, title: 'Appointment Reminder', message: 'Your appointment with Dr. Sarah is in 1 hour', time: '1h ago', unread: true },
    { id: 2, title: 'Prescription Ready', message: 'Your prescription has been uploaded', time: '3h ago', unread: true },
    { id: 3, title: 'Payment Confirmed', message: 'Payment of MZN 500 confirmed', time: '1d ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user ? dashboardLink : "/"} className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
              NovareHealth
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} label={item.label} />
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Notifications - only for logged in users */}
                <div ref={notificationRef} className="relative">
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {isNotificationOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 animate-fadeIn">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900">Notifications</h3>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            className="w-full px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                          >
                            <div className="flex gap-3">
                              {notification.unread && (
                                <span className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                              )}
                              <div className={notification.unread ? '' : 'ml-5'}>
                                <p className="font-medium text-slate-900 text-sm">{notification.title}</p>
                                <p className="text-slate-500 text-sm mt-0.5">{notification.message}</p>
                                <p className="text-slate-400 text-xs mt-1">{notification.time}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="px-4 py-2 border-t border-slate-100">
                        <Link to="/notifications" className="text-cyan-600 text-sm font-medium hover:underline">
                          View all notifications
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Dropdown - only for logged in users */}
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-slate-700">
                      {user.first_name || 'User'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 animate-fadeIn">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="font-semibold text-slate-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-slate-500">{user.email || user.phone}</p>
                      </div>
                      <div className="py-1">
                        <DropdownLink to={dashboardLink} icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
                        <DropdownLink to="/profile" icon={<User className="w-4 h-4" />} label="My Profile" />
                        <DropdownLink to="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" />
                        <DropdownLink to="/help" icon={<HelpCircle className="w-4 h-4" />} label="Help & Support" />
                      </div>
                      <div className="border-t border-slate-100 py-1">
                        <button
                          onClick={logout}
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-3 text-sm font-medium transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Login/Register buttons for non-logged in users */
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all shadow-lg shadow-cyan-500/25"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 animate-fadeIn">
            <div className="space-y-1">
              {navItems.map((item) => (
                <MobileNavLink 
                  key={item.to} 
                  to={item.to} 
                  label={item.label} 
                  onClick={() => setIsMobileMenuOpen(false)} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`
        px-4 py-2 rounded-xl text-sm font-medium transition-colors
        ${isActive 
          ? 'bg-cyan-50 text-cyan-700' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }
      `}
    >
      {label}
    </Link>
  );
}

function MobileNavLink({ to, label, onClick }: { to: string; label: string; onClick: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        block px-4 py-3 rounded-xl text-sm font-medium transition-colors
        ${isActive 
          ? 'bg-cyan-50 text-cyan-700' 
          : 'text-slate-600 hover:bg-slate-100'
        }
      `}
    >
      {label}
    </Link>
  );
}

function DropdownLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-3 text-sm font-medium transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
