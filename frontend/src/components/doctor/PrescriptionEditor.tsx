import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  Calendar,
  Pill,
  Stethoscope,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Button, Input } from '../ui';
import { 
  searchMedicines, 
  createPrescription,
  updatePrescription,
  getPrescriptionByAppointment,
  type Medicine,
  type MedicationItem,
  type PrescriptionCreate,
  type Prescription,
  type PrescriptionDetail
} from '../../services/prescription';

interface PrescriptionEditorProps {
  appointmentId: number;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  existingPrescription?: PrescriptionDetail;
  onClose: () => void;
  onSuccess?: (prescription: Prescription) => void;
}

const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'Before meals',
  'After meals',
  'At bedtime',
  'As needed',
  'Once weekly',
];

const DURATION_OPTIONS = [
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '21 days',
  '1 month',
  '2 months',
  '3 months',
  'Ongoing',
  'Until finished',
];

export const PrescriptionEditor: React.FC<PrescriptionEditorProps> = ({
  appointmentId,
  patientName,
  patientAge,
  patientGender,
  existingPrescription: initialPrescription,
  onClose,
  onSuccess,
}) => {
  const [medications, setMedications] = useState<MedicationItem[]>([
    { name: '', dosage: '', frequency: '', duration: '' }
  ]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [existingPrescription, setExistingPrescription] = useState<Prescription | null>(initialPrescription || null);
  const [isLoading, setIsLoading] = useState(!initialPrescription);

  // Initialize form with existing prescription if provided via props
  useEffect(() => {
    if (initialPrescription) {
      setMedications(initialPrescription.medications.length > 0 
        ? initialPrescription.medications 
        : [{ name: '', dosage: '', frequency: '', duration: '' }]
      );
      setDiagnosis(initialPrescription.diagnosis || '');
      setNotes(initialPrescription.notes || '');
      setAdvice(initialPrescription.advice || '');
      setFollowUpDate(initialPrescription.follow_up_date || '');
      setIsLoading(false);
    }
  }, [initialPrescription]);

  // Check for existing prescription if not provided via props
  useEffect(() => {
    if (initialPrescription) return; // Skip if already provided
    
    const checkExisting = async () => {
      try {
        const existing = await getPrescriptionByAppointment(appointmentId);
        setExistingPrescription(existing);
        
        // Populate form with existing data
        setMedications(existing.medications.length > 0 
          ? existing.medications 
          : [{ name: '', dosage: '', frequency: '', duration: '' }]
        );
        setDiagnosis(existing.diagnosis || '');
        setNotes(existing.notes || '');
        setAdvice(existing.advice || '');
        setFollowUpDate(existing.follow_up_date || '');
      } catch {
        // No existing prescription, that's fine
      } finally {
        setIsLoading(false);
      }
    };
    
    checkExisting();
  }, [appointmentId, initialPrescription]);

  // Debounced medicine search
  useEffect(() => {
    if (searchQuery.length < 2 || activeSearchIndex === null) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await searchMedicines(searchQuery);
        setSearchResults(result.medicines);
      } catch (err) {
        console.error('Medicine search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeSearchIndex]);

  const handleMedicineSearch = (index: number, value: string) => {
    setActiveSearchIndex(index);
    setSearchQuery(value);
    updateMedication(index, 'name', value);
  };

  const selectMedicine = (index: number, medicine: Medicine) => {
    updateMedication(index, 'name', `${medicine.name} (${medicine.strength || medicine.form || 'N/A'})`);
    
    // Pre-fill dosage from common dosages if available
    if (medicine.common_dosages && medicine.common_dosages.length > 0) {
      updateMedication(index, 'dosage', medicine.common_dosages[0]);
    }
    
    setSearchResults([]);
    setActiveSearchIndex(null);
    setSearchQuery('');
  };

  const updateMedication = (index: number, field: keyof MedicationItem, value: string) => {
    setMedications(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addMedication = () => {
    setMedications(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    const validMedications = medications.filter(m => m.name && m.dosage && m.frequency && m.duration);
    if (validMedications.length === 0) {
      setError('Please add at least one complete medication');
      return;
    }

    setIsSubmitting(true);

    try {
      let result: Prescription;
      
      if (existingPrescription) {
        // Update existing
        result = await updatePrescription(existingPrescription.id, {
          medications: validMedications,
          diagnosis: diagnosis || undefined,
          notes: notes || undefined,
          advice: advice || undefined,
          follow_up_date: followUpDate || undefined,
        });
      } else {
        // Create new
        const data: PrescriptionCreate = {
          appointment_id: appointmentId,
          medications: validMedications,
          diagnosis: diagnosis || undefined,
          notes: notes || undefined,
          advice: advice || undefined,
          follow_up_date: followUpDate || undefined,
        };
        result = await createPrescription(data);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(result);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || 'Failed to save prescription');
      } else {
        setError('Failed to save prescription');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
          <span>Loading prescription data...</span>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h3 className="text-xl font-semibold">Prescription Saved!</h3>
          <p className="text-slate-600">PDF is being generated...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-xl">
              <FileText className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {existingPrescription ? 'Edit Prescription' : 'Write Prescription'}
              </h2>
              <p className="text-sm text-slate-500">
                Patient: {patientName}
                {patientAge && ` • ${patientAge} years`}
                {patientGender && ` • ${patientGender}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Diagnosis */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Stethoscope className="w-4 h-4" />
              Diagnosis
            </label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Enter diagnosis..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none resize-none"
              rows={2}
            />
          </div>

          {/* Medications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Pill className="w-4 h-4" />
                Medications
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addMedication}
                className="text-cyan-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Medicine
              </Button>
            </div>

            <div className="space-y-4">
              {medications.map((med, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">Medicine {index + 1}</span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedication(index)}
                        className="p-1 hover:bg-red-100 rounded-full text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Medicine Name with Autocomplete */}
                    <div className="relative md:col-span-2">
                      <Input
                        value={med.name}
                        onChange={(e) => handleMedicineSearch(index, e.target.value)}
                        placeholder="Search medicine..."
                        leftIcon={<Search className="w-4 h-4" />}
                        rightIcon={isSearching && activeSearchIndex === index ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : undefined}
                      />
                      
                      {/* Search Results Dropdown */}
                      {activeSearchIndex === index && searchResults.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.map((medicine) => (
                            <button
                              key={medicine.id}
                              type="button"
                              onClick={() => selectMedicine(index, medicine)}
                              className="w-full px-4 py-3 text-left hover:bg-cyan-50 border-b border-slate-100 last:border-0"
                            >
                              <div className="font-medium text-slate-800">{medicine.name}</div>
                              <div className="text-sm text-slate-500">
                                {medicine.generic_name && `${medicine.generic_name} • `}
                                {medicine.form && `${medicine.form} • `}
                                {medicine.strength}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dosage */}
                    <Input
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                      placeholder="e.g., 1 tablet twice daily"
                      label="Dosage"
                    />

                    {/* Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Frequency</label>
                      <select
                        value={med.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none bg-white"
                      >
                        <option value="">Select frequency</option>
                        {FREQUENCY_OPTIONS.map((freq) => (
                          <option key={freq} value={freq}>{freq}</option>
                        ))}
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration</label>
                      <select
                        value={med.duration}
                        onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none bg-white"
                      >
                        <option value="">Select duration</option>
                        {DURATION_OPTIONS.map((dur) => (
                          <option key={dur} value={dur}>{dur}</option>
                        ))}
                      </select>
                    </div>

                    {/* Instructions */}
                    <Input
                      value={med.instructions || ''}
                      onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                      placeholder="e.g., Take with food"
                      label="Instructions (optional)"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advice */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              General Advice & Instructions
            </label>
            <textarea
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              placeholder="Enter general advice for the patient..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none resize-none"
              rows={2}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none resize-none"
              rows={2}
            />
          </div>

          {/* Follow-up Date */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Calendar className="w-4 h-4" />
              Follow-up Date (Optional)
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : existingPrescription ? (
                'Update Prescription'
              ) : (
                'Create Prescription'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrescriptionEditor;
