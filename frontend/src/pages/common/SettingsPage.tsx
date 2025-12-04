import { useState } from 'react';
import { 
  Bell,
  Shield,
  Globe,
  Moon,
  Sun,
  Smartphone,
  Mail,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { useAuthStore } from '../../store/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('notifications');
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    email_appointments: true,
    email_reminders: true,
    email_promotions: false,
    sms_appointments: true,
    sms_reminders: true,
    push_enabled: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profile_visible: true,
    show_online_status: true,
    share_health_data: false,
  });

  // Appearance
  const [appearance, setAppearance] = useState({
    theme: 'light',
    language: 'en',
  });

  // Security
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const sections = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Moon },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to={user?.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard'}
            className="p-2 hover:bg-white rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500">Manage your account preferences</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="md:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-cyan-50 text-cyan-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <section.icon className="w-5 h-5" />
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-cyan-600" />
                  Notification Preferences
                </h2>

                {/* Email Notifications */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Notifications
                  </h3>
                  <div className="space-y-4">
                    <ToggleSetting
                      label="Appointment confirmations"
                      description="Receive email when appointments are booked or changed"
                      checked={notifications.email_appointments}
                      onChange={(checked) => setNotifications({ ...notifications, email_appointments: checked })}
                    />
                    <ToggleSetting
                      label="Appointment reminders"
                      description="Get reminded about upcoming appointments"
                      checked={notifications.email_reminders}
                      onChange={(checked) => setNotifications({ ...notifications, email_reminders: checked })}
                    />
                    <ToggleSetting
                      label="Promotions and updates"
                      description="Receive news about new features and offers"
                      checked={notifications.email_promotions}
                      onChange={(checked) => setNotifications({ ...notifications, email_promotions: checked })}
                    />
                  </div>
                </div>

                {/* SMS Notifications */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    SMS Notifications
                  </h3>
                  <div className="space-y-4">
                    <ToggleSetting
                      label="Appointment confirmations"
                      description="Receive SMS when appointments are booked"
                      checked={notifications.sms_appointments}
                      onChange={(checked) => setNotifications({ ...notifications, sms_appointments: checked })}
                    />
                    <ToggleSetting
                      label="Appointment reminders"
                      description="Get SMS reminders before appointments"
                      checked={notifications.sms_reminders}
                      onChange={(checked) => setNotifications({ ...notifications, sms_reminders: checked })}
                    />
                  </div>
                </div>

                {/* Push Notifications */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Push Notifications
                  </h3>
                  <ToggleSetting
                    label="Enable push notifications"
                    description="Receive real-time notifications in your browser"
                    checked={notifications.push_enabled}
                    onChange={(checked) => setNotifications({ ...notifications, push_enabled: checked })}
                  />
                </div>
              </div>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-600" />
                  Privacy Settings
                </h2>

                <div className="space-y-4">
                  <ToggleSetting
                    label="Profile visibility"
                    description="Allow other users to view your basic profile information"
                    checked={privacy.profile_visible}
                    onChange={(checked) => setPrivacy({ ...privacy, profile_visible: checked })}
                  />
                  <ToggleSetting
                    label="Show online status"
                    description="Let others see when you're online"
                    checked={privacy.show_online_status}
                    onChange={(checked) => setPrivacy({ ...privacy, show_online_status: checked })}
                  />
                  <ToggleSetting
                    label="Share health data with doctors"
                    description="Allow your doctors to access your health records"
                    checked={privacy.share_health_data}
                    onChange={(checked) => setPrivacy({ ...privacy, share_health_data: checked })}
                  />
                </div>

                <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    <strong>Data Privacy:</strong> Your personal information is protected under our privacy policy. 
                    We never sell your data to third parties.
                  </p>
                </div>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === 'appearance' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <Moon className="w-5 h-5 text-cyan-600" />
                  Appearance
                </h2>

                {/* Theme */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Theme</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'system', label: 'System', icon: Smartphone },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setAppearance({ ...appearance, theme: theme.id })}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          appearance.theme === theme.id
                            ? 'border-cyan-500 bg-cyan-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <theme.icon className={`w-6 h-6 mx-auto mb-2 ${
                          appearance.theme === theme.id ? 'text-cyan-600' : 'text-slate-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          appearance.theme === theme.id ? 'text-cyan-700' : 'text-slate-600'
                        }`}>{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Language
                  </h3>
                  <select
                    value={appearance.language}
                    onChange={(e) => setAppearance({ ...appearance, language: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                    <option value="sw">Swahili</option>
                  </select>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-cyan-600" />
                  Security
                </h2>

                {/* Change Password */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-600 mb-1">Current Password</label>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        className="w-full px-4 py-2.5 pr-12 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-600 mb-1">New Password</label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        className="w-full px-4 py-2.5 pr-12 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>
                    <button className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium">
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900">Two-Factor Authentication</h4>
                      <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
                    </div>
                    <button className="px-4 py-2 border border-cyan-600 text-cyan-600 rounded-xl hover:bg-cyan-50 transition-colors font-medium">
                      Enable
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({ 
  label, 
  description, 
  checked, 
  onChange 
}: { 
  label: string; 
  description: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-cyan-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
