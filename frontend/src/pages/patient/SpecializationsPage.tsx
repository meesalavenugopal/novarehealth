import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Heart,
  Brain,
  Bone,
  Eye,
  Baby,
  Stethoscope,
  Pill,
  Activity,
  Loader2,
  ChevronRight,
  Users,
  Smile,
  Wind,
  Droplets,
  Shield,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import { guestFetch } from '../../services/api';

interface Specialization {
  id: number;
  name: string;
  description?: string;
  doctor_count?: number;
}

// Icon mapping for specializations
const getSpecializationIcon = (name: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'Cardiology': <Heart className="w-6 h-6" />,
    'Neurology': <Brain className="w-6 h-6" />,
    'Orthopedics': <Bone className="w-6 h-6" />,
    'Ophthalmology': <Eye className="w-6 h-6" />,
    'Pediatrics': <Baby className="w-6 h-6" />,
    'General Medicine': <Stethoscope className="w-6 h-6" />,
    'Dermatology': <Smile className="w-6 h-6" />,
    'Psychiatry': <Brain className="w-6 h-6" />,
    'Pharmacy': <Pill className="w-6 h-6" />,
    'Pulmonology': <Wind className="w-6 h-6" />,
    'Nephrology': <Droplets className="w-6 h-6" />,
    'Oncology': <Shield className="w-6 h-6" />,
    'Gastroenterology': <Activity className="w-6 h-6" />,
  };
  return iconMap[name] || <Stethoscope className="w-6 h-6" />;
};

export default function SpecializationsPage() {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSpecializations();
  }, []);

  const fetchSpecializations = async () => {
    try {
      const response = await guestFetch('/api/v1/doctors/specializations/all');
      if (response.ok) {
        const data = await response.json();
        setSpecializations(data);
      }
    } catch (error) {
      console.error('Error fetching specializations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpecializations = specializations.filter(spec =>
    spec.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Find Doctors by Specialization
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Browse our comprehensive list of medical specializations and find the right specialist for your healthcare needs
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search specializations..."
              className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>
        </div>

        {/* Specializations Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          </div>
        ) : filteredSpecializations.length === 0 ? (
          <div className="text-center py-20">
            <Stethoscope className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-900 mb-2">No specializations found</h3>
            <p className="text-slate-500">Try a different search term</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSpecializations.map((spec) => (
              <Link
                key={spec.id}
                to={`/find-doctors?specialization=${encodeURIComponent(spec.name)}`}
                className="group flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 hover:border-cyan-400 hover:shadow-lg transition-all duration-200"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-100 transition-colors flex-shrink-0">
                  {getSpecializationIcon(spec.name)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 transition-colors truncate">
                    {spec.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {spec.doctor_count || 0} Doctors
                  </p>
                </div>
                
                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {/* Browse All Doctors CTA */}
        <div className="text-center mt-16 pt-8 border-t border-slate-200">
          <p className="text-slate-600 mb-4">Not sure which specialist you need?</p>
          <Link
            to="/find-doctors"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium"
          >
            Browse All Doctors
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
