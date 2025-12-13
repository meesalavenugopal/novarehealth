import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/layout';
import { Card, CardHeader } from '../../components/ui';
import { authFetch } from '../../services/api';
import { config } from '../../config';
import { 
  ArrowLeft, 
  Loader2, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  CheckCircle,
  Clock
} from 'lucide-react';

interface EarningsData {
  consultation_fee: number;
  total_earnings: number;
  today_earnings: number;
  week_earnings: number;
  month_earnings: number;
  total_completed_appointments: number;
  today_completed_appointments: number;
  week_completed_appointments: number;
  month_completed_appointments: number;
  currency: string;
}

export const EarningsPage: React.FC = () => {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const response = await authFetch(`${config.apiUrl}/doctors/me/earnings`);
        if (response.ok) {
          const data = await response.json();
          setEarnings(data);
        } else {
          setError('Failed to load earnings data');
        }
      } catch (err) {
        console.error('Failed to fetch earnings:', err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, []);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${earnings?.currency || 'MZN'}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              to="/doctor/dashboard"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
              <p className="text-gray-500">Track your consultation earnings</p>
            </div>
          </div>

          {error ? (
            <Card className="p-8 text-center">
              <p className="text-red-600">{error}</p>
            </Card>
          ) : earnings ? (
            <>
              {/* Total Earnings Card */}
              <Card className="p-8 mb-8 bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-100 text-sm font-medium">Total Earnings</p>
                    <p className="text-4xl font-bold mt-2">{formatCurrency(earnings.total_earnings)}</p>
                    <p className="text-cyan-100 mt-2">
                      From {earnings.total_completed_appointments} completed consultations
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                </div>
              </Card>

              {/* Earnings Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Today */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      Today
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.today_earnings)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {earnings.today_completed_appointments} consultation{earnings.today_completed_appointments !== 1 ? 's' : ''}
                  </p>
                </Card>

                {/* This Week */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      This Week
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.week_earnings)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {earnings.week_completed_appointments} consultation{earnings.week_completed_appointments !== 1 ? 's' : ''}
                  </p>
                </Card>

                {/* This Month */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                      This Month
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.month_earnings)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {earnings.month_completed_appointments} consultation{earnings.month_completed_appointments !== 1 ? 's' : ''}
                  </p>
                </Card>
              </div>

              {/* Consultation Fee Info */}
              <Card className="p-6">
                <CardHeader 
                  title="Consultation Fee"
                  subtitle="Your current fee per consultation"
                />
                <div className="mt-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.consultation_fee)}</p>
                    <p className="text-sm text-gray-500">Per video consultation</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  💡 Tip: You can update your consultation fee in your profile settings.
                </p>
              </Card>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default EarningsPage;
