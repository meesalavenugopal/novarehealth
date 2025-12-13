import { Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Video, 
  Shield, 
  FileText, 
  Star, 
  ChevronRight,
  ArrowRight,
  Check,
  Play,
  Smartphone,
  CreditCard,
  Stethoscope,
  Clock,
  Users,
} from 'lucide-react';
import { Footer } from '../../components/layout';
import Button from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useFeatureFlags } from '../../store/featureFlagsStore';
import { config } from '../../config';
import api from '../../services/api';
import { getSpecializationIcon } from '../../utils/specializationIcons';

interface Specialization {
  id: number;
  name: string;
  icon: string;
  doctor_count: number;
}

export default function HomePage() {
  const { user } = useAuthStore();
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [totalDoctors, setTotalDoctors] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch specializations with doctor counts
        const response = await api.get('/doctors/specializations/all');
        const specs = response.data || [];
        setSpecializations(specs.slice(0, 6)); // Show top 6
        
        // Calculate total doctors
        const total = specs.reduce((sum: number, s: Specialization) => sum + (s.doctor_count || 0), 0);
        setTotalDoctors(total);
      } catch (error) {
        console.error('Failed to fetch specializations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Redirect logged-in users to their dashboard
  if (user) {
    switch (user.role) {
      case 'admin':
      case 'super_admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'doctor':
        return <Navigate to="/doctor/dashboard" replace />;
      case 'patient':
        return <Navigate to="/patient/dashboard" replace />;
    }
  }

  const features = [
    {
      icon: <Video className="w-6 h-6" />,
      title: 'Video Consultations',
      description: 'Connect with certified doctors through HD video calls from anywhere in Africa.',
      color: 'from-cyan-500 to-teal-500',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Digital Prescriptions',
      description: 'Receive prescriptions directly on your phone. No more paper hassles.',
      color: 'from-violet-500 to-purple-500',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure & Private',
      description: 'Your health data is encrypted and protected with bank-level security.',
      color: 'from-emerald-500 to-green-500',
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Easy M-Pesa Payments',
      description: 'Pay securely with M-Pesa. Simple, fast, and convenient.',
      color: 'from-amber-500 to-orange-500',
    },
  ];

  const steps = [
    { step: '01', title: 'Search & Choose', description: 'Find doctors by specialty, rating, or availability' },
    { step: '02', title: 'Book & Pay', description: 'Select a time slot and pay securely with M-Pesa' },
    { step: '03', title: 'Consult Online', description: 'Join video call and discuss your health concerns' },
    { step: '04', title: 'Get Prescription', description: 'Receive digital prescription on your phone' },
  ];

  const testimonials = [
    {
      name: 'Maria Santos',
      role: 'Patient from Maputo',
      content: 'NovareHealth made it so easy to consult a cardiologist without traveling hours to the city. The doctor was professional and caring.',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face'
    },
    {
      name: 'Dr. João Fernandes',
      role: 'Cardiologist',
      content: `As a doctor, this platform allows me to reach patients across ${config.country.name}. The video quality is excellent and payments are seamless.`,
      rating: 5,
      image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face'
    },
    {
      name: 'Ana Machava',
      role: 'Patient from Beira',
      content: 'I got my prescription within minutes after the consultation. No need to visit a hospital. This is the future of healthcare!',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop&crop=face'
    },
  ];

  const stats = [
    { value: totalDoctors > 0 ? `${totalDoctors}+` : '0', label: 'Verified Doctors', icon: Users },
    { value: '50K+', label: 'Consultations', icon: Video },
    { value: '4.9', label: 'User Rating', icon: Star },
    { value: '24/7', label: 'Available', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold text-white">NovareHealth</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-white/80 hover:text-white transition">Features</a>
              <a href="#how-it-works" className="text-white/80 hover:text-white transition">How it Works</a>
              <a href="#specializations" className="text-white/80 hover:text-white transition">Find a Doctor</a>
              <Link to="/for-doctors" className="text-white/80 hover:text-white transition font-medium flex items-center gap-1">
                <Stethoscope className="w-4 h-4" />
                For Doctors
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link 
                to="/login" 
                className="hidden sm:block px-4 py-2 text-white/90 hover:text-white transition font-medium"
              >
                Login
              </Link>
              <Link to="/login">
                <Button variant="secondary" className="!bg-white !text-cyan-600 hover:!bg-cyan-50">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-white/90 text-sm mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Now serving all of {config.country.name}
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Quality Healthcare,<br />
                <span className="text-cyan-200">Anytime, Anywhere</span>
              </h1>
              
              <p className="text-xl text-cyan-100 mb-8 max-w-xl mx-auto lg:mx-0">
                Connect with 500+ certified doctors across Africa for video consultations. 
                Get prescriptions delivered to your phone.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                <Link to="/find-doctors">
                  <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-cyan-600 font-semibold rounded-xl shadow-xl hover:bg-cyan-50 transition-colors">
                    Book Consultation
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <button className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-medium hover:bg-white/10 rounded-xl transition">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                  Watch Demo
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
                <div className="flex items-center gap-2 text-white/80">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm">HIPAA Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Check className="w-5 h-5" />
                  <span className="text-sm">Verified Doctors</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <CreditCard className="w-5 h-5" />
                  <span className="text-sm">M-Pesa Secure</span>
                </div>
              </div>
            </div>

            {/* Right Content - App Preview */}
            <div className="relative hidden lg:block">
              <div className="relative z-10">
                {/* Phone Mockup */}
                <div className="w-[320px] h-[640px] bg-slate-900 rounded-[3rem] p-3 shadow-2xl mx-auto">
                  <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                    {/* App Screen */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-slate-500 text-sm">Good morning</p>
                          <p className="text-slate-900 font-semibold">Maria Santos</p>
                        </div>
                        <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                          <span className="text-cyan-600 font-semibold">MS</span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl p-4 text-white mb-6">
                        <p className="text-sm opacity-80 mb-1">Next Appointment</p>
                        <p className="font-semibold">Dr. Sarah Johnson</p>
                        <p className="text-sm opacity-80">Today, 2:30 PM</p>
                        <button className="mt-3 bg-white/20 px-4 py-2 rounded-lg text-sm font-medium">
                          Join Call
                        </button>
                      </div>

                      <p className="text-slate-900 font-semibold mb-3">Top Specialists</p>
                      <div className="space-y-3">
                        {[
                          { name: 'Dr. Ana Ferreira', specialty: 'Cardiologist', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face' },
                          { name: 'Dr. Carlos Mendes', specialty: 'Neurologist', image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face' },
                          { name: 'Dr. Sofia Machava', specialty: 'Pediatrician', image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=100&h=100&fit=crop&crop=face' }
                        ].map((doctor, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <img 
                              src={doctor.image} 
                              alt={doctor.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <p className="text-slate-900 text-sm font-medium">{doctor.name}</p>
                              <p className="text-slate-500 text-xs">{doctor.specialty}</p>
                            </div>
                            <div className="flex items-center text-amber-500">
                              <Star className="w-3 h-3 fill-current" />
                              <span className="text-xs ml-1">4.9</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Cards */}
                <div className="absolute -left-16 top-20 bg-white rounded-2xl p-4 shadow-xl animate-bounce-slow">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Video className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">HD Video</p>
                      <p className="text-sm text-slate-500">Crystal clear</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-16 bottom-32 bg-white rounded-2xl p-4 shadow-xl animate-bounce-slow" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Star className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">4.9 Rating</p>
                      <p className="text-sm text-slate-500">50k+ reviews</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute -bottom-1 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-4 sm:gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 text-center sm:text-left">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-slate-500 text-xs sm:text-sm font-medium">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Become a Doctor CTA Banner */}
      <section className="py-6 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-white">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Are you a healthcare professional?</h3>
                <p className="text-emerald-100 text-sm">Join our network of 500+ verified doctors and reach thousands of patients</p>
              </div>
            </div>
            <Link 
              to="/for-doctors"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 font-semibold rounded-xl hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl"
            >
              Become a Doctor
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything you need for<br />modern healthcare
            </h2>
            <p className="text-lg text-slate-600">
              Access quality healthcare from the comfort of your home with our comprehensive telemedicine platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300 group text-center"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform mx-auto`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              How it works
            </h2>
            <p className="text-lg text-slate-600">
              Get healthcare in four simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <div key={index} className="relative text-center">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-cyan-200 to-transparent" />
                )}
                <div className="relative bg-white">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-cyan-500/20 mx-auto">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specializations */}
      <section id="specializations" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Find specialists across Africa
            </h2>
            <p className="text-lg text-slate-600">
              Choose from {specializations.length}+ specializations and connect with the right doctor for your needs
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              // Loading skeleton
              [...Array(6)].map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-slate-200 animate-pulse">
                  <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-16" />
                  </div>
                </div>
              ))
            ) : specializations.length > 0 ? (
              specializations.map((spec, index) => (
                <Link
                  key={spec.id || index}
                  to={`/find-doctors?specialization=${encodeURIComponent(spec.name)}`}
                  className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 hover:shadow-lg transition-all group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-100 transition-colors">
                    {getSpecializationIcon(spec.icon || spec.name)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{spec.name}</h3>
                    <p className="text-sm text-slate-500">{spec.doctor_count || 0} Doctors</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-slate-500">
                No specializations available yet
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <Link to="/specializations">
              <Button variant="outline" size="lg">
                View All Specializations
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Loved by patients & doctors
            </h2>
            <p className="text-lg text-slate-600">
              See what our users are saying about their experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-slate-50 rounded-2xl p-8 border border-slate-100 flex flex-col h-full"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed flex-1">"{testimonial.content}"</p>
                <div className="flex items-center gap-3 mt-auto">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to take control of your health?
          </h2>
          <p className="text-xl text-cyan-100 mb-8">
            Join thousands of patients and doctors already using NovareHealth
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/find-doctors">
              <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-cyan-600 font-semibold rounded-xl shadow-xl hover:bg-cyan-50 transition-colors">
                Find a Doctor
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link to="/for-doctors">
              <button className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">
                Join as Doctor
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Download App Banner - Hidden via feature flag */}
      {useFeatureFlags.getState().flags.mobile_app_banner_enabled && (
        <section className="py-16 bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Download our mobile app</h3>
                  <p className="text-slate-400">Get the full experience on your phone</p>
                </div>
              </div>
              <div className="flex gap-4">
                <a href="#" className="block">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                    alt="Download on App Store" 
                    className="h-12"
                  />
                </a>
                <a href="#" className="block">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                    alt="Get it on Google Play" 
                    className="h-12"
                  />
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />

      {/* Add custom animation for floating elements */}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
