import api from './api';

// Types
export interface HealthRecord {
  id: number;
  patient_id: number;
  record_type: string;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  record_date?: string;
  uploaded_at: string;
}

export interface HealthRecordStats {
  total_records: number;
  records_by_type: Record<string, number>;
  total_storage_bytes: number;
  total_storage_mb: number;
}

export const RECORD_TYPES = [
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'blood_test', label: 'Blood Test' },
  { value: 'scan', label: 'Scan' },
  { value: 'x_ray', label: 'X-Ray' },
  { value: 'mri', label: 'MRI' },
  { value: 'ct_scan', label: 'CT Scan' },
  { value: 'ultrasound', label: 'Ultrasound' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'vaccination', label: 'Vaccination Record' },
  { value: 'medical_history', label: 'Medical History' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'doctor_notes', label: 'Doctor Notes' },
  { value: 'insurance', label: 'Insurance Document' },
  { value: 'other', label: 'Other' },
] as const;

export type RecordType = typeof RECORD_TYPES[number]['value'];

// Upload health record
export const uploadHealthRecord = async (
  file: File,
  recordType: RecordType,
  title: string,
  description?: string,
  recordDate?: string
): Promise<HealthRecord> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('record_type', recordType);
  formData.append('title', title);
  if (description) formData.append('description', description);
  if (recordDate) formData.append('record_date', recordDate);

  const response = await api.post('/health-records/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Get my health records
export const getMyHealthRecords = async (
  recordType?: RecordType,
  skip = 0,
  limit = 20
): Promise<HealthRecord[]> => {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (recordType) params.append('record_type', recordType);
  
  const response = await api.get(`/health-records/me?${params}`);
  return response.data;
};

// Get record types list
export const getRecordTypes = async (): Promise<string[]> => {
  const response = await api.get('/health-records/types');
  return response.data;
};

// Get single health record
export const getHealthRecord = async (recordId: number): Promise<HealthRecord> => {
  const response = await api.get(`/health-records/${recordId}`);
  return response.data;
};

// Update health record metadata
export const updateHealthRecord = async (
  recordId: number,
  data: {
    title?: string;
    description?: string;
    record_type?: RecordType;
    record_date?: string;
  }
): Promise<HealthRecord> => {
  const params = new URLSearchParams();
  if (data.title) params.append('title', data.title);
  if (data.description !== undefined) params.append('description', data.description);
  if (data.record_type) params.append('record_type', data.record_type);
  if (data.record_date) params.append('record_date', data.record_date);

  const response = await api.put(`/health-records/${recordId}?${params}`);
  return response.data;
};

// Delete health record
export const deleteHealthRecord = async (recordId: number): Promise<void> => {
  await api.delete(`/health-records/${recordId}`);
};

// Get health record stats
export const getHealthRecordStats = async (): Promise<HealthRecordStats> => {
  const response = await api.get('/health-records/stats/me');
  return response.data;
};

// Doctor: Get patient's health records
export const getPatientHealthRecords = async (
  patientId: number,
  recordType?: RecordType,
  skip = 0,
  limit = 20
): Promise<HealthRecord[]> => {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (recordType) params.append('record_type', recordType);
  
  const response = await api.get(`/health-records/patient/${patientId}?${params}`);
  return response.data;
};

// Doctor: Upload record for patient
export const doctorUploadPatientRecord = async (
  patientId: number,
  file: File,
  recordType: RecordType,
  title: string,
  description?: string,
  recordDate?: string
): Promise<HealthRecord> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('record_type', recordType);
  formData.append('title', title);
  if (description) formData.append('description', description);
  if (recordDate) formData.append('record_date', recordDate);

  const response = await api.post(`/health-records/patient/${patientId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Helper to get file URL
export const getHealthRecordFileUrl = (record: HealthRecord): string => {
  if (record.file_url.startsWith('http')) {
    return record.file_url;
  }
  
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${baseUrl}/uploads/${record.file_url}`;
};

// Helper to format file size
export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown';
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Helper to get record type label
export const getRecordTypeLabel = (value: string): string => {
  const type = RECORD_TYPES.find(t => t.value === value);
  return type?.label || value;
};
