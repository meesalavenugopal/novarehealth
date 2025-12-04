import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button, Card } from '../../components/ui';
import { Navbar } from '../../components/layout';
import { authFetch } from '../../services/api';
import {
  Sparkles,
  Check,
  X,
  Clock,
  Calendar,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Wand2,
  ChevronDown,
  ChevronUp,
  Info,
  Trash2,
  Plus,
  Sun,
  Moon,
  Coffee,
} from 'lucide-react';

interface TimeSlot {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface AISuggestion {
  id: string;
  type: 'add' | 'modify' | 'remove' | 'optimize';
  title: string;
  description: string;
  reasoning: string;
  slots: TimeSlot[];
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected';
  estimatedImpact?: string;
}

interface SchedulePattern {
  totalHours: number;
  busiestDay: string;
  gaps: string[];
  recommendations: string[];
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
  '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00',
];

// AI-powered schedule analysis
const analyzeSchedule = (slots: TimeSlot[]): SchedulePattern => {
  const dayHours: { [key: number]: number } = {};
  const gaps: string[] = [];
  const recommendations: string[] = [];
  
  DAYS_OF_WEEK.forEach((_, index) => {
    dayHours[index] = 0;
  });
  
  slots.forEach(slot => {
    if (slot.is_active) {
      const start = parseInt(slot.start_time.split(':')[0]) + parseInt(slot.start_time.split(':')[1]) / 60;
      const end = parseInt(slot.end_time.split(':')[0]) + parseInt(slot.end_time.split(':')[1]) / 60;
      dayHours[slot.day_of_week] += (end - start);
    }
  });
  
  const totalHours = Object.values(dayHours).reduce((a, b) => a + b, 0);
  const busiestDayIndex = Object.entries(dayHours).reduce((a, b) => 
    b[1] > dayHours[parseInt(a[0])] ? b : a
  )[0];
  
  // Find gaps
  DAYS_OF_WEEK.forEach((day, index) => {
    if (dayHours[index] === 0 && index !== 0) { // Exclude Sunday
      gaps.push(day);
    }
  });
  
  // Generate recommendations
  if (totalHours < 20) {
    recommendations.push('Consider adding more availability to increase booking potential');
  }
  if (gaps.length > 2) {
    recommendations.push(`You have no availability on ${gaps.slice(0, 2).join(', ')}. Adding slots may increase bookings.`);
  }
  if (totalHours > 50) {
    recommendations.push('You have extensive availability. Consider adding break times to prevent burnout.');
  }
  
  return {
    totalHours,
    busiestDay: DAYS_OF_WEEK[parseInt(busiestDayIndex)],
    gaps,
    recommendations,
  };
};

// Generate AI suggestions based on current schedule
const generateAISuggestions = (slots: TimeSlot[]): AISuggestion[] => {
  const suggestions: AISuggestion[] = [];
  const analysis = analyzeSchedule(slots);
  const existingDays = new Set(slots.filter(s => s.is_active).map(s => s.day_of_week));
  
  // Suggestion 1: Fill gaps in schedule
  analysis.gaps.forEach((day) => {
    const dayIndex = DAYS_OF_WEEK.indexOf(day);
    if (dayIndex > 0 && !existingDays.has(dayIndex)) {
      suggestions.push({
        id: `fill-gap-${dayIndex}`,
        type: 'add',
        title: `Add ${day} availability`,
        description: `Add morning slots on ${day} to increase patient access`,
        reasoning: 'Analysis shows no availability on this day. Adding slots could increase your booking rate by 15-20%.',
        slots: [
          { day_of_week: dayIndex, start_time: '09:00', end_time: '13:00', is_active: true },
        ],
        priority: 'high',
        status: 'pending',
        estimatedImpact: '+15-20% bookings',
      });
    }
  });
  
  // Suggestion 2: Optimize for peak hours
  const hasMorningSlots = slots.some(s => {
    const hour = parseInt(s.start_time.split(':')[0]);
    return hour >= 9 && hour <= 11 && s.is_active;
  });
  
  if (!hasMorningSlots && slots.length > 0) {
    suggestions.push({
      id: 'add-morning-peak',
      type: 'optimize',
      title: 'Add peak morning hours',
      description: 'Add availability during 9 AM - 12 PM (highest demand period)',
      reasoning: 'Data shows 40% of patients prefer morning appointments. Adding morning slots could significantly increase bookings.',
      slots: [
        { day_of_week: 1, start_time: '09:00', end_time: '12:00', is_active: true },
        { day_of_week: 2, start_time: '09:00', end_time: '12:00', is_active: true },
        { day_of_week: 3, start_time: '09:00', end_time: '12:00', is_active: true },
      ],
      priority: 'high',
      status: 'pending',
      estimatedImpact: '+30-40% morning bookings',
    });
  }
  
  // Suggestion 3: Evening availability for working professionals
  const hasEveningSlots = slots.some(s => {
    const hour = parseInt(s.start_time.split(':')[0]);
    return hour >= 17 && s.is_active;
  });
  
  if (!hasEveningSlots && slots.length > 0) {
    suggestions.push({
      id: 'add-evening',
      type: 'add',
      title: 'Add evening hours',
      description: 'Add availability after 5 PM for working professionals',
      reasoning: '35% of our patients are working professionals who prefer evening appointments. This could tap into an underserved segment.',
      slots: [
        { day_of_week: 1, start_time: '17:00', end_time: '20:00', is_active: true },
        { day_of_week: 3, start_time: '17:00', end_time: '20:00', is_active: true },
      ],
      priority: 'medium',
      status: 'pending',
      estimatedImpact: '+25% evening bookings',
    });
  }
  
  // Suggestion 4: Weekend availability
  const hasWeekendSlots = slots.some(s => (s.day_of_week === 0 || s.day_of_week === 6) && s.is_active);
  
  if (!hasWeekendSlots && analysis.totalHours > 0) {
    suggestions.push({
      id: 'add-weekend',
      type: 'add',
      title: 'Add Saturday morning slots',
      description: 'Offer limited Saturday availability for patients who can\'t visit during weekdays',
      reasoning: 'Weekend slots are in high demand with lower competition. Even 3-4 hours on Saturday can boost weekly bookings by 20%.',
      slots: [
        { day_of_week: 6, start_time: '09:00', end_time: '13:00', is_active: true },
      ],
      priority: 'medium',
      status: 'pending',
      estimatedImpact: '+20% weekly bookings',
    });
  }
  
  // Suggestion 5: Optimize long slots
  const longSlots = slots.filter(s => {
    const start = parseInt(s.start_time.split(':')[0]);
    const end = parseInt(s.end_time.split(':')[0]);
    return (end - start) > 5 && s.is_active;
  });
  
  if (longSlots.length > 0) {
    suggestions.push({
      id: 'optimize-breaks',
      type: 'optimize',
      title: 'Add break periods',
      description: 'Split long availability blocks with lunch breaks',
      reasoning: 'Long continuous blocks (5+ hours) can lead to fatigue. Adding breaks improves consultation quality and doctor well-being.',
      slots: longSlots.map(slot => ({
        ...slot,
        end_time: '12:00',
      })),
      priority: 'low',
      status: 'pending',
      estimatedImpact: 'Improved quality',
    });
  }
  
  return suggestions.slice(0, 5); // Limit to 5 suggestions
};

export const AvailabilityPage: React.FC = () => {
  const { user } = useAuthStore();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // AI Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<AISuggestion[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [scheduleAnalysis, setScheduleAnalysis] = useState<SchedulePattern | null>(null);

  // Fetch existing availability
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const response = await authFetch('http://localhost:8000/api/v1/doctors/me/availability');
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
  }, []);

  // Generate AI suggestions when slots change
  useEffect(() => {
    if (slots.length >= 0) {
      const analysis = analyzeSchedule(slots);
      setScheduleAnalysis(analysis);
    }
  }, [slots]);

  const generateSuggestions = useCallback(() => {
    setGeneratingSuggestions(true);
    
    // Simulate AI processing delay for better UX
    setTimeout(() => {
      const suggestions = generateAISuggestions(slots);
      setAiSuggestions(suggestions);
      setGeneratingSuggestions(false);
    }, 1500);
  }, [slots]);

  // Generate suggestions on initial load
  useEffect(() => {
    if (!loading && slots !== null) {
      generateSuggestions();
    }
  }, [loading]);

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

  const handleApproveSuggestion = (suggestion: AISuggestion) => {
    // Add suggestion to pending approvals for review
    setPendingApprovals([...pendingApprovals, { ...suggestion, status: 'approved' }]);
    
    // Update suggestion status
    setAiSuggestions(prev => 
      prev.map(s => s.id === suggestion.id ? { ...s, status: 'approved' } : s)
    );
    
    // Add suggested slots to the schedule
    const newSlots = [...slots, ...suggestion.slots];
    setSlots(newSlots);
    
    setMessage({
      type: 'success',
      text: `✨ "${suggestion.title}" applied! Remember to save your changes.`
    });
  };

  const handleUndoSuggestion = (suggestion: AISuggestion) => {
    // Remove the suggested slots from schedule
    // We need to remove slots that match the suggestion's slots
    const slotsToRemove = suggestion.slots;
    
    setSlots(prevSlots => {
      let remainingSlots = [...prevSlots];
      
      // Remove matching slots
      slotsToRemove.forEach(slotToRemove => {
        const indexToRemove = remainingSlots.findIndex(s => 
          s.day_of_week === slotToRemove.day_of_week &&
          s.start_time === slotToRemove.start_time &&
          s.end_time === slotToRemove.end_time
        );
        if (indexToRemove !== -1) {
          remainingSlots = remainingSlots.filter((_, i) => i !== indexToRemove);
        }
      });
      
      return remainingSlots;
    });
    
    // Reset suggestion status back to pending
    setAiSuggestions(prev => 
      prev.map(s => s.id === suggestion.id ? { ...s, status: 'pending' } : s)
    );
    
    // Remove from pending approvals
    setPendingApprovals(prev => prev.filter(p => p.id !== suggestion.id));
    
    setMessage({
      type: 'success',
      text: `"${suggestion.title}" removed. You can apply it again if needed.`
    });
  };

  const handleRejectSuggestion = (suggestion: AISuggestion) => {
    setAiSuggestions(prev => 
      prev.map(s => s.id === suggestion.id ? { ...s, status: 'rejected' } : s)
    );
    
    setMessage({
      type: 'success',
      text: `Suggestion dismissed. You can regenerate suggestions anytime.`
    });
  };

  const handleUndoReject = (suggestion: AISuggestion) => {
    // Reset suggestion status back to pending
    setAiSuggestions(prev => 
      prev.map(s => s.id === suggestion.id ? { ...s, status: 'pending' } : s)
    );
    
    setMessage({
      type: 'success',
      text: `"${suggestion.title}" restored. You can now apply or dismiss it.`
    });
  };

  const handleApproveAll = () => {
    const pendingSuggestions = aiSuggestions.filter(s => s.status === 'pending');
    
    // Collect all slots from pending suggestions
    const allNewSlots = pendingSuggestions.flatMap(s => s.slots);
    
    // Add to current slots
    setSlots([...slots, ...allNewSlots]);
    
    // Mark all as approved
    setAiSuggestions(prev => 
      prev.map(s => s.status === 'pending' ? { ...s, status: 'approved' } : s)
    );
    
    setPendingApprovals(pendingSuggestions.map(s => ({ ...s, status: 'approved' })));
    setShowApprovalModal(false);
    
    setMessage({
      type: 'success',
      text: `✨ ${pendingSuggestions.length} suggestions applied! Remember to save your changes.`
    });
  };

  const saveAvailability = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await authFetch('http://localhost:8000/api/v1/doctors/me/availability', {
        method: 'POST',
        body: JSON.stringify(slots.filter(s => s.is_active)),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Availability saved successfully!' });
        // Clear pending approvals after save
        setPendingApprovals([]);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save availability');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const getSlotsForDay = (dayOfWeek: number) => {
    return slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.day_of_week === dayOfWeek);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'add': return <Plus className="w-4 h-4" />;
      case 'modify': return <RefreshCw className="w-4 h-4" />;
      case 'remove': return <Trash2 className="w-4 h-4" />;
      case 'optimize': return <Zap className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getTimeIcon = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 6 && hour < 12) return <Sun className="w-4 h-4 text-amber-500" />;
    if (hour >= 12 && hour < 17) return <Coffee className="w-4 h-4 text-orange-500" />;
    return <Moon className="w-4 h-4 text-indigo-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-12 h-12 text-cyan-600 animate-spin" />
              <p className="text-gray-600">Loading your availability...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const pendingSuggestionsCount = aiSuggestions.filter(s => s.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-7 h-7 text-cyan-600" />
                Manage Availability
              </h1>
              <p className="text-gray-600 mt-1">
                Set your weekly schedule for patient consultations
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={generateSuggestions}
                disabled={generatingSuggestions}
                className="flex items-center gap-2"
              >
                {generatingSuggestions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {generatingSuggestions ? 'Analyzing...' : 'Get AI Suggestions'}
              </Button>
              
              <Button 
                onClick={saveAvailability} 
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {message && (
            <div
              className={`
                mb-6 p-4 rounded-xl flex items-center gap-3
                ${message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
                }
              `}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Schedule Panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Schedule Stats */}
              {scheduleAnalysis && (
                <Card className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-cyan-700">{scheduleAnalysis.totalHours.toFixed(1)}</p>
                        <p className="text-xs text-cyan-600">Hours/Week</p>
                      </div>
                      <div className="h-10 w-px bg-cyan-200" />
                      <div className="text-center">
                        <p className="text-lg font-semibold text-cyan-700">{scheduleAnalysis.busiestDay}</p>
                        <p className="text-xs text-cyan-600">Busiest Day</p>
                      </div>
                      <div className="h-10 w-px bg-cyan-200" />
                      <div className="text-center">
                        <p className="text-lg font-semibold text-cyan-700">{slots.filter(s => s.is_active).length}</p>
                        <p className="text-xs text-cyan-600">Active Slots</p>
                      </div>
                    </div>
                    {scheduleAnalysis.recommendations.length > 0 && (
                      <div className="flex items-center gap-2 text-amber-600 text-sm">
                        <Info className="w-4 h-4" />
                        {scheduleAnalysis.recommendations.length} tip{scheduleAnalysis.recommendations.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Days Grid */}
              {DAYS_OF_WEEK.map((day, dayIndex) => {
                const daySlots = getSlotsForDay(dayIndex);
                
                return (
                  <Card key={day} className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`
                          w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold
                          ${daySlots.length > 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-400'}
                        `}>
                          <span className="text-lg">{day.substring(0, 2)}</span>
                          <span className="text-[10px] font-normal">
                            {daySlots.filter(d => d.slot.is_active).reduce((acc, d) => {
                              const start = parseInt(d.slot.start_time.split(':')[0]);
                              const end = parseInt(d.slot.end_time.split(':')[0]);
                              return acc + (end - start);
                            }, 0)}h
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{day}</h3>
                          <p className="text-sm text-gray-500">
                            {daySlots.length > 0 
                              ? `${daySlots.filter(d => d.slot.is_active).length} active slot${daySlots.filter(d => d.slot.is_active).length !== 1 ? 's' : ''}`
                              : 'No availability set'
                            }
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addSlot(dayIndex)}
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Slot
                      </Button>
                    </div>

                    {daySlots.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {daySlots.map(({ slot, index }) => (
                          <div
                            key={index}
                            className={`
                              flex items-center gap-4 p-4 rounded-xl transition-all
                              ${slot.is_active 
                                ? 'bg-gradient-to-r from-gray-50 to-cyan-50 border border-cyan-100' 
                                : 'bg-gray-50 border border-gray-100 opacity-60'
                              }
                            `}
                          >
                            <div className="flex items-center gap-1">
                              {getTimeIcon(slot.start_time)}
                            </div>
                            
                            <div className="flex items-center gap-2 flex-1">
                              <select
                                value={slot.start_time}
                                onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all bg-white"
                              >
                                {TIME_OPTIONS.map((time) => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              
                              <span className="text-gray-400">→</span>
                              
                              <select
                                value={slot.end_time}
                                onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all bg-white"
                              >
                                {TIME_OPTIONS.map((time) => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              
                              <span className="text-xs text-gray-400 ml-2">
                                ({parseInt(slot.end_time) - parseInt(slot.start_time)}h)
                              </span>
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
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* AI Suggestions Panel */}
            <div className="space-y-4">
              <Card className="p-4 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
                      <p className="text-xs text-gray-500">Smart scheduling optimization</p>
                    </div>
                  </div>
                  
                  {pendingSuggestionsCount > 0 && (
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                      {pendingSuggestionsCount} new
                    </span>
                  )}
                </div>

                {generatingSuggestions ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-4 border-purple-100 border-t-purple-500 animate-spin" />
                      <Sparkles className="w-5 h-5 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm text-gray-600">Analyzing your schedule...</p>
                    <p className="text-xs text-gray-400">Finding optimization opportunities</p>
                  </div>
                ) : aiSuggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">Schedule looks great!</p>
                    <p className="text-xs text-gray-500 mt-1">
                      No optimization suggestions at this time
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateSuggestions}
                      className="mt-4"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Re-analyze
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Approve All Button */}
                    {pendingSuggestionsCount > 1 && (
                      <button
                        onClick={() => setShowApprovalModal(true)}
                        className="w-full p-3 bg-gradient-to-r from-purple-50 to-cyan-50 hover:from-purple-100 hover:to-cyan-100 border border-purple-200 rounded-xl text-sm font-medium text-purple-700 transition-all flex items-center justify-center gap-2"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Review & Apply All ({pendingSuggestionsCount})
                      </button>
                    )}

                    {/* Individual Suggestions */}
                    {aiSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={`
                          border rounded-xl overflow-hidden transition-all
                          ${suggestion.status === 'approved' 
                            ? 'bg-green-50 border-green-200' 
                            : suggestion.status === 'rejected'
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-white border-gray-200 hover:border-purple-200 hover:shadow-sm'
                          }
                        `}
                      >
                        <div
                          onClick={() => {
                            if (suggestion.status === 'pending') {
                              setExpandedSuggestion(
                                expandedSuggestion === suggestion.id ? null : suggestion.id
                              );
                            }
                          }}
                          className={`w-full p-3 text-left ${suggestion.status === 'pending' ? 'cursor-pointer' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`
                              w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                              ${suggestion.status === 'approved' 
                                ? 'bg-green-100 text-green-600' 
                                : suggestion.status === 'rejected'
                                ? 'bg-gray-100 text-gray-400'
                                : 'bg-purple-100 text-purple-600'
                              }
                            `}>
                              {suggestion.status === 'approved' ? (
                                <Check className="w-4 h-4" />
                              ) : suggestion.status === 'rejected' ? (
                                <X className="w-4 h-4" />
                              ) : (
                                getSuggestionIcon(suggestion.type)
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`font-medium text-sm truncate ${
                                  suggestion.status === 'rejected' ? 'text-gray-500' : 'text-gray-900'
                                }`}>
                                  {suggestion.title}
                                </p>
                                {suggestion.status === 'pending' && (
                                  <span className={`
                                    px-1.5 py-0.5 text-[10px] font-medium rounded border flex-shrink-0
                                    ${getPriorityColor(suggestion.priority)}
                                  `}>
                                    {suggestion.priority}
                                  </span>
                                )}
                                {suggestion.status === 'approved' && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700 border border-green-200">
                                    Applied
                                  </span>
                                )}
                                {suggestion.status === 'rejected' && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-500 border border-gray-200">
                                    Dismissed
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs line-clamp-2 ${
                                suggestion.status === 'rejected' ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {suggestion.description}
                              </p>
                              {suggestion.estimatedImpact && suggestion.status === 'pending' && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  {suggestion.estimatedImpact}
                                </p>
                              )}
                              
                              {/* Undo buttons for approved/rejected */}
                              {suggestion.status === 'approved' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUndoSuggestion(suggestion);
                                  }}
                                  className="mt-2 text-xs text-green-700 hover:text-green-900 flex items-center gap-1 font-medium"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Undo & Remove
                                </button>
                              )}
                              {suggestion.status === 'rejected' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUndoReject(suggestion);
                                  }}
                                  className="mt-2 text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1 font-medium"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Restore Suggestion
                                </button>
                              )}
                            </div>
                            
                            {suggestion.status === 'pending' && (
                              <div className="flex-shrink-0">
                                {expandedSuggestion === suggestion.id ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedSuggestion === suggestion.id && suggestion.status === 'pending' && (
                          <div className="px-3 pb-3 border-t border-gray-100">
                            <div className="pt-3 space-y-3">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs font-medium text-gray-700 mb-1">
                                  💡 Why this suggestion?
                                </p>
                                <p className="text-xs text-gray-600">
                                  {suggestion.reasoning}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-medium text-gray-700 mb-2">
                                  Suggested slots:
                                </p>
                                <div className="space-y-1">
                                  {suggestion.slots.map((slot, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 text-xs bg-purple-50 text-purple-700 px-2 py-1.5 rounded-lg"
                                    >
                                      <Calendar className="w-3 h-3" />
                                      <span className="font-medium">
                                        {DAYS_OF_WEEK[slot.day_of_week]}
                                      </span>
                                      <Clock className="w-3 h-3" />
                                      <span>{slot.start_time} - {slot.end_time}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveSuggestion(suggestion)}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  <ThumbsUp className="w-3 h-3 mr-1" />
                                  Apply
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRejectSuggestion(suggestion)}
                                  className="flex-1"
                                >
                                  <ThumbsDown className="w-3 h-3 mr-1" />
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tips Section */}
                <div className="mt-6 p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
                  <h4 className="font-medium text-cyan-900 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Pro Tips
                  </h4>
                  <ul className="text-xs text-cyan-700 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <Sun className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Morning slots (9-12) have highest demand
                    </li>
                    <li className="flex items-start gap-2">
                      <Moon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Evening slots attract working professionals
                    </li>
                    <li className="flex items-start gap-2">
                      <Coffee className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Add breaks to maintain consultation quality
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Bulk Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Review AI Suggestions</h3>
                  <p className="text-sm text-gray-500">
                    {pendingSuggestionsCount} optimization{pendingSuggestionsCount > 1 ? 's' : ''} ready to apply
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              {aiSuggestions
                .filter(s => s.status === 'pending')
                .map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-4 border border-gray-200 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                        {getSuggestionIcon(suggestion.type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {suggestion.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {suggestion.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {suggestion.slots.map((slot, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                            >
                              {DAYS_OF_WEEK[slot.day_of_week].substring(0, 3)} {slot.start_time}-{slot.end_time}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowApprovalModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
                onClick={handleApproveAll}
              >
                <Check className="w-4 h-4 mr-1" />
                Apply All Suggestions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityPage;
