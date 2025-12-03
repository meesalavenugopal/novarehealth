import { useAuthStore } from '../../store/authStore';
import { Calendar, Clock, User, FileText, Star } from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">NovareHealth</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Welcome, {user?.first_name || 'Patient'}
            </span>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <QuickAction
            icon={<Calendar className="w-6 h-6" />}
            title="Book Appointment"
            description="Schedule a consultation"
            href="/patient/book"
            color="blue"
          />
          <QuickAction
            icon={<Clock className="w-6 h-6" />}
            title="My Appointments"
            description="View upcoming visits"
            href="/patient/appointments"
            color="green"
          />
          <QuickAction
            icon={<FileText className="w-6 h-6" />}
            title="Prescriptions"
            description="View your prescriptions"
            href="/patient/prescriptions"
            color="purple"
          />
          <QuickAction
            icon={<Star className="w-6 h-6" />}
            title="Health Records"
            description="Manage your records"
            href="/patient/records"
            color="orange"
          />
        </div>

        {/* Upcoming Appointments */}
        <section className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
          <div className="text-gray-500 text-center py-8">
            No upcoming appointments. Book your first consultation!
          </div>
        </section>

        {/* Recent Prescriptions */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Prescriptions</h2>
          <div className="text-gray-500 text-center py-8">
            No prescriptions yet.
          </div>
        </section>
      </main>
    </div>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function QuickAction({ icon, title, description, href, color }: QuickActionProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
  };

  return (
    <a
      href={href}
      className={`${colors[color]} p-6 rounded-xl transition block`}
    >
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm opacity-75">{description}</p>
    </a>
  );
}
