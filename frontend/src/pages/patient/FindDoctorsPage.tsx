import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Star, 
  ChevronDown,
  Loader2,
  X,
  Stethoscope,
  GraduationCap,
  Languages
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { guestFetch } from '../../services/api';

interface Doctor {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  specialization_name: string;
  experience_years: number;
  consultation_fee: number;
  bio: string;
  languages: string[];
  education: string[];
  rating: number;
  total_reviews: number;
  is_available: boolean;
  avatar_url?: string;
}

interface Specialization {
  id: number;
  name: string;
}

export default function FindDoctorsPage() {
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Get specialization from URL if present
  const urlSpecialization = searchParams.get('specialization') || '';
  
  // Filters
  const [filters, setFilters] = useState({
    specialization: urlSpecialization,
    minFee: '',
    maxFee: '',
    minRating: '',
    availableNow: false,
    sortBy: 'rating',
  });

  // Update filter when URL changes
  useEffect(() => {
    if (urlSpecialization) {
      setFilters(prev => ({ ...prev, specialization: urlSpecialization }));
      setShowFilters(true); // Show filters panel when filtering by specialization
    }
  }, [urlSpecialization]);

  useEffect(() => {
    fetchDoctors();
    fetchSpecializations();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await guestFetch('/api/v1/doctors/');
      if (response.ok) {
        const data = await response.json();
        // Transform nested API response to flat structure expected by UI
        const transformedDoctors = data.map((doc: any) => ({
          id: doc.id,
          user_id: doc.user?.id,
          first_name: doc.user?.first_name || '',
          last_name: doc.user?.last_name || '',
          avatar_url: doc.user?.avatar_url,
          specialization_name: doc.specialization?.name || '',
          experience_years: doc.experience_years,
          consultation_fee: doc.consultation_fee,
          bio: doc.bio || '',
          languages: doc.languages || [],
          education: doc.education || [],
          rating: doc.rating || 0,
          total_reviews: doc.total_reviews || 0,
          is_available: doc.is_available,
        }));
        setDoctors(transformedDoctors);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecializations = async () => {
    try {
      const response = await guestFetch('/api/v1/doctors/specializations/all');
      if (response.ok) {
        const data = await response.json();
        setSpecializations(data);
      }
    } catch (error) {
      console.error('Error fetching specializations:', error);
    }
  };

  // Filter and search doctors
  const filteredDoctors = doctors.filter(doctor => {
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        doctor.first_name?.toLowerCase().includes(query) ||
        doctor.last_name?.toLowerCase().includes(query) ||
        doctor.specialization_name?.toLowerCase().includes(query) ||
        doctor.bio?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Specialization filter
    if (filters.specialization && doctor.specialization_name !== filters.specialization) {
      return false;
    }

    // Fee range
    if (filters.minFee && doctor.consultation_fee < parseFloat(filters.minFee)) {
      return false;
    }
    if (filters.maxFee && doctor.consultation_fee > parseFloat(filters.maxFee)) {
      return false;
    }

    // Rating filter
    if (filters.minRating && (doctor.rating || 0) < parseFloat(filters.minRating)) {
      return false;
    }

    // Available now
    if (filters.availableNow && !doctor.is_available) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'experience':
        return (b.experience_years || 0) - (a.experience_years || 0);
      case 'fee_low':
        return (a.consultation_fee || 0) - (b.consultation_fee || 0);
      case 'fee_high':
        return (b.consultation_fee || 0) - (a.consultation_fee || 0);
      default:
        return 0;
    }
  });

  const clearFilters = () => {
    setFilters({
      specialization: '',
      minFee: '',
      maxFee: '',
      minRating: '',
      availableNow: false,
      sortBy: 'rating',
    });
  };

  const hasActiveFilters = filters.specialization || filters.minFee || filters.maxFee || filters.minRating || filters.availableNow;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Find Doctors</h1>
          <p className="text-slate-500">Search and book appointments with verified healthcare professionals</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, specialization, or keyword..."
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-cyan-500 rounded-full" />
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="appearance-none w-full md:w-48 px-4 py-3 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
              >
                <option value="rating">Highest Rated</option>
                <option value="experience">Most Experienced</option>
                <option value="fee_low">Lowest Fee</option>
                <option value="fee_high">Highest Fee</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Specialization */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Specialization</label>
                  <select
                    value={filters.specialization}
                    onChange={(e) => setFilters({ ...filters, specialization: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">All Specializations</option>
                    {specializations.map((spec) => (
                      <option key={spec.id} value={spec.name}>{spec.name}</option>
                    ))}
                  </select>
                </div>

                {/* Fee Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Fee (MZN)</label>
                  <input
                    type="number"
                    value={filters.minFee}
                    onChange={(e) => setFilters({ ...filters, minFee: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Fee (MZN)</label>
                  <input
                    type="number"
                    value={filters.maxFee}
                    onChange={(e) => setFilters({ ...filters, maxFee: e.target.value })}
                    placeholder="Any"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                {/* Min Rating */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Rating</label>
                  <select
                    value={filters.minRating}
                    onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Any Rating</option>
                    <option value="4.5">4.5+ Stars</option>
                    <option value="4">4+ Stars</option>
                    <option value="3.5">3.5+ Stars</option>
                    <option value="3">3+ Stars</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.availableNow}
                    onChange={(e) => setFilters({ ...filters, availableNow: e.target.checked })}
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-700">Available Now</span>
                </label>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-cyan-600 hover:underline flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-slate-500">
          {loading ? 'Loading...' : `${filteredDoctors.length} doctors found`}
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No doctors found</h3>
            <p className="text-slate-500 mb-4">Try adjusting your search or filters</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-cyan-600 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {doctor.avatar_url ? (
            <img 
              src={doctor.avatar_url} 
              alt={`Dr. ${doctor.first_name} ${doctor.last_name}`}
              className="w-16 h-16 rounded-2xl object-cover shadow-lg flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white text-xl font-bold">
                {doctor.first_name?.[0]?.toUpperCase() || 'D'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">
              Dr. {doctor.first_name} {doctor.last_name}
            </h3>
            <p className="text-cyan-600 text-sm font-medium">{doctor.specialization_name}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-medium text-slate-700">
                {doctor.rating?.toFixed(1) || 'New'}
              </span>
              {doctor.total_reviews > 0 && (
                <span className="text-sm text-slate-400">
                  ({doctor.total_reviews} reviews)
                </span>
              )}
            </div>
          </div>
          {doctor.is_available && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Online
            </span>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <GraduationCap className="w-4 h-4 text-slate-400" />
            <span>{doctor.experience_years || 0} years experience</span>
          </div>
          {doctor.languages && doctor.languages.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Languages className="w-4 h-4 text-slate-400" />
              <span>{doctor.languages.slice(0, 3).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Bio snippet */}
        {doctor.bio && (
          <p className="text-sm text-slate-500 line-clamp-2 mb-4">
            {doctor.bio}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            <span className="text-lg font-bold text-slate-900">
              {doctor.consultation_fee?.toLocaleString()} MZN
            </span>
            <span className="text-sm text-slate-500"> / consultation</span>
          </div>
          <Link
            to={`/doctor/${doctor.id}`}
            className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors text-sm font-medium"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
