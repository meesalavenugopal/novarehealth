import { Link } from 'react-router-dom';
import { 
  Stethoscope, 
  Calendar, 
  DollarSign, 
  Video, 
  Shield, 
  Clock, 
  Users, 
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Star,
  Globe,
  Smartphone,
  HeartPulse
} from 'lucide-react';
import Footer from '../../components/layout/Footer';
import LanguageSwitcher from '../../components/ui/LanguageSwitcher';
import { config } from '../../config';

export default function DoctorLandingPage() {
  const benefits = [
    {
      icon: Calendar,
      title: 'Flexible Schedule',
      description: 'Set your own availability. Work from anywhere, anytime that suits you.'
    },
    {
      icon: DollarSign,
      title: 'Earn More',
      description: 'Set your own consultation fees. Receive payments directly via M-Pesa.'
    },
    {
      icon: Video,
      title: 'Video Consultations',
      description: `Conduct secure HD video consultations with patients across ${config.country.name}.`
    },
    {
      icon: Shield,
      title: 'Verified Platform',
      description: 'Join a trusted network of verified healthcare professionals.'
    },
    {
      icon: Users,
      title: 'Grow Your Practice',
      description: 'Reach thousands of patients looking for quality healthcare.'
    },
    {
      icon: Clock,
      title: 'Save Time',
      description: 'No more paperwork. Digital prescriptions and patient records.'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Apply Online',
      description: 'Fill out a simple application form with your medical credentials and experience.'
    },
    {
      number: '02',
      title: 'Get Verified',
      description: 'Our team reviews your credentials and verifies your medical license.'
    },
    {
      number: '03',
      title: 'Set Up Profile',
      description: 'Create your professional profile, set your fees, and availability.'
    },
    {
      number: '04',
      title: 'Start Consulting',
      description: 'Begin accepting video consultations and grow your patient base.'
    }
  ];

  const testimonials = [
    {
      name: 'Dr. Maria Santos',
      specialty: 'General Practitioner',
      location: 'Maputo',
      quote: 'NovareHealth has transformed how I practice medicine. I can now help patients across the country while maintaining work-life balance.',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face'
    },
    {
      name: 'Dr. João Macuácua',
      specialty: 'Pediatrician',
      location: 'Beira',
      quote: 'The platform is incredibly easy to use. I\'ve expanded my practice and increased my earnings by 40% in just 3 months.',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face'
    },
    {
      name: 'Dr. Ana Mondlane',
      specialty: 'Dermatologist',
      location: 'Nampula',
      quote: 'Finally, a platform built for African healthcare needs. The M-Pesa integration makes payments seamless.',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=150&h=150&fit=crop&crop=face'
    }
  ];

  const stats = [
    { value: '10,000+', label: 'Consultations Completed', icon: Video },
    { value: '500+', label: 'Verified Doctors', icon: Users },
    { value: '4.8/5', label: 'Average Rating', icon: Star },
    { value: '24/7', label: 'Platform Support', icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-linear-to-r from-cyan-600 to-teal-600">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <HeartPulse className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">NovareHealth</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <LanguageSwitcher className="[&_button]:text-white/80 [&_button]:hover:text-white [&_button]:hover:bg-white/10" />
              <Link 
                to="/login" 
                className="hidden sm:block px-4 py-2 text-white/90 hover:text-white transition font-medium"
              >
                Doctor Login
              </Link>
              <Link 
                to="/doctor/register"
                className="px-5 py-2.5 bg-white text-cyan-600 rounded-xl font-semibold hover:bg-cyan-50 transition shadow-lg shadow-cyan-900/20"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <Stethoscope className="w-5 h-5 text-cyan-200" />
                <span className="text-cyan-100 font-medium">For Healthcare Professionals</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Practice Medicine
                <span className="block text-cyan-200">On Your Terms</span>
              </h1>
              
              <p className="text-lg text-white/80 mb-8 max-w-lg">
                Join {config.country.name}'s leading telemedicine platform. Consult patients via video, 
                set your own schedule and fees, and get paid instantly via M-Pesa.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/doctor/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-cyan-600 rounded-xl font-semibold hover:bg-cyan-50 transition shadow-xl shadow-cyan-900/30 text-lg"
                >
                  Start Your Application
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a 
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition text-lg"
                >
                  Learn More
                </a>
              </div>
              
              <div className="flex items-center gap-6 mt-8 pt-8 border-t border-white/20">
                <div className="flex -space-x-3">
                  {[
                    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&crop=face',
                    'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=80&h=80&fit=crop&crop=face',
                    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&crop=face',
                    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=80&h=80&fit=crop&crop=face',
                    'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=80&h=80&fit=crop&crop=face',
                  ].map((img, i) => (
                    <img 
                      key={i} 
                      src={img} 
                      alt={`Doctor ${i + 1}`}
                      className="w-10 h-10 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <div className="text-white/80">
                  <span className="font-semibold text-white">500+ doctors</span> already on the platform
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block relative">
              <div className="relative">
                {/* Decorative elements */}
                <div className="absolute -top-4 -left-4 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-4 -right-4 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl" />
                
                {/* Main card */}
                <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-cyan-400 to-teal-400 flex items-center justify-center">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Video Consultation</p>
                      <p className="text-cyan-200 text-sm">In Progress</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-white/10 rounded-xl p-4">
                      <span className="text-white/80">Today's Earnings</span>
                      <span className="text-white font-bold text-xl">12,500 MZN</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/10 rounded-xl p-4">
                      <span className="text-white/80">Consultations</span>
                      <span className="text-white font-bold text-xl">8</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/10 rounded-xl p-4">
                      <span className="text-white/80">Rating</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="flex items-center gap-4 justify-center lg:justify-start">
                  <div className="w-14 h-14 bg-linear-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl md:text-3xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-slate-500 text-xs md:text-sm font-medium">{stat.label}</p>
                  </div>
                  {index < stats.length - 1 && (
                    <div className="hidden lg:block w-px h-12 bg-slate-200 ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Why Doctors Choose NovareHealth
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Join a platform designed by healthcare professionals, for healthcare professionals.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-100/50 transition-all group">
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-cyan-500 to-teal-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <benefit.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-slate-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-linear-to-br from-slate-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Start in 4 Simple Steps
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Getting started on NovareHealth is quick and easy. Join today and start consulting tomorrow.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-linear-to-r from-cyan-300 to-transparent" />
                )}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="text-5xl font-bold text-cyan-100 mb-4">{step.number}</div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Hear from Our Doctors
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Join hundreds of satisfied doctors who have grown their practice with NovareHealth.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-full">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-600 mb-6 italic flex-grow">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3 mt-auto">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">{testimonial.specialty} • {testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Everything You Need to Succeed
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Our platform provides all the tools you need to run a successful telemedicine practice.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Video, text: 'HD Video Consultations with screen sharing' },
                  { icon: Smartphone, text: 'Mobile-friendly for on-the-go consultations' },
                  { icon: DollarSign, text: 'Instant M-Pesa payments to your account' },
                  { icon: Shield, text: 'HIPAA-compliant patient data security' },
                  { icon: Globe, text: `Reach patients across all of ${config.country.name}` },
                  { icon: TrendingUp, text: 'Analytics dashboard to track your growth' }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="text-white">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-linear-to-br from-cyan-500/10 to-teal-500/10 rounded-3xl p-8 border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-6">Earning Potential</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>General Practitioner</span>
                    <span>30,000 - 60,000 MZN/month</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-linear-to-r from-cyan-500 to-teal-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Specialist</span>
                    <span>50,000 - 100,000 MZN/month</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-linear-to-r from-cyan-500 to-teal-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Senior Consultant</span>
                    <span>80,000 - 150,000 MZN/month</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-11/12 bg-linear-to-r from-cyan-500 to-teal-500 rounded-full" />
                  </div>
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-6">
                * Based on average earnings of doctors on our platform working 20-30 hours/week
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-linear-to-r from-cyan-600 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join NovareHealth today and start reaching more patients while earning more. 
            The application takes less than 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/doctor/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-cyan-600 rounded-xl font-semibold hover:bg-cyan-50 transition shadow-xl text-lg"
            >
              Apply Now — It's Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-cyan-200" />
              Free to join
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-cyan-200" />
              No hidden fees
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-cyan-200" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-4">
            {[
              {
                q: 'What are the requirements to join?',
                a: `You must be a licensed medical practitioner in ${config.country.name} with a valid medical certificate and government-issued ID. We verify all credentials before approval.`
              },
              {
                q: 'How much does it cost to join?',
                a: 'Joining NovareHealth is completely free. We only charge a small platform fee (15%) on successful consultations to cover payment processing and platform maintenance.'
              },
              {
                q: 'How do I get paid?',
                a: 'Payments are processed instantly via M-Pesa after each consultation. You receive 85% of the consultation fee directly to your M-Pesa account.'
              },
              {
                q: 'Can I set my own consultation fees?',
                a: 'Yes! You have full control over your consultation fees. We provide AI-powered suggestions based on your specialty and experience, but the final decision is yours.'
              },
              {
                q: 'How long does the verification process take?',
                a: 'Most applications are reviewed within 24-48 hours. You\'ll receive an email notification once your account is verified.'
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
