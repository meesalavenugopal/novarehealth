import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button, Card } from '../../components/ui';
import { Navbar } from '../../components/layout';

interface TimeSlot {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00',
];

export const AvailabilityPage: React.FC = () => {
  const { accessToken } = useAuthStore();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch existing availability
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8000/api/v1/doctors/me/availability', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSlots(data);
        }
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [accessToken]);

  const addSlot = (dayOfWeek: number) => {
    const newSlot: TimeSlot = {
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
    };
    setSlots([...slots, newSlot]);
  };

  const updateSlot = (index: number, field: keyof TimeSlot, value: string | number | boolean) => {
    const updatedSlots = [...slots];
    updatedSlots[index] = {
      ...updatedSlots[index],
      [field]: value,
    };
    setSlots(updatedSlots);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const saveAvailability = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/doctors/me/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(slots.filter(s => s.is_active)),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Availability saved successfully!' });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save availability');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const getSlotsForDay = (dayOfWeek: number) => {
    return slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.day_of_week === dayOfWeek);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Manage Availability
              </h1>
              <p className="text-gray-600 mt-1">
                Set your weekly schedule for patient consultations
              </p>
            </div>
            
            <Button onClick={saveAvailability} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {message && (
            <div
              className={`
                mb-6 p-4 rounded-xl
                ${message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
                }
              `}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day, dayIndex) => {
              const daySlots = getSlotsForDay(dayIndex);
              
              return (
                <Card key={day} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center font-bold
                        ${daySlots.length > 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-400'}
                      `}>
                        {day.substring(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{day}</h3>
                        <p className="text-sm text-gray-500">
                          {daySlots.length > 0 
                            ? `${daySlots.length} slot${daySlots.length > 1 ? 's' : ''} configured`
                            : 'No availability set'
                          }
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addSlot(dayIndex)}
                    >
                      + Add Slot
                    </Button>
                  </div>

                  {daySlots.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {daySlots.map(({ slot, index }) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <select
                              value={slot.start_time}
                              onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
                              className="px-3 py-2 rounded-lg border border-gray-200 focus:border-cyan-500 outline-none"
                            >
                              {TIME_OPTIONS.map((time) => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                            
                            <span className="text-gray-500">to</span>
                            
                            <select
                              value={slot.end_time}
                              onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
                              className="px-3 py-2 rounded-lg border border-gray-200 focus:border-cyan-500 outline-none"
                            >
                              {TIME_OPTIONS.map((time) => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={slot.is_active}
                              onChange={(e) => updateSlot(index, 'is_active', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span className="text-sm text-gray-600">Active</span>
                          </label>

                          <button
                            onClick={() => removeSlot(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="mt-8 p-6 bg-cyan-50 rounded-xl border border-cyan-100">
            <h3 className="font-semibold text-cyan-900 mb-2">
              💡 Tips for setting availability
            </h3>
            <ul className="text-sm text-cyan-700 space-y-1">
              <li>• Consider time zones of your patients when setting hours</li>
              <li>• Leave buffer time between slots for documentation</li>
              <li>• You can add multiple slots per day for morning and afternoon</li>
              <li>• Inactive slots will not show to patients but are saved</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AvailabilityPage;
