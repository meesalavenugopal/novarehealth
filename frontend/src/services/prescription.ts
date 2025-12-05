import api from './api';

// Types
export interface Medicine {
  id: number;
  name: string;
  generic_name?: string;
  category?: string;
  form?: string;
  strength?: string;
  manufacturer?: string;
  description?: string;
  common_dosages?: string[];
  is_active: boolean;
}

export interface MedicineSearchResponse {
  medicines: Medicine[];
  total: number;
  query: string;
}

export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity?: string;
  instructions?: string;
  notes?: string;
}

export interface PrescriptionCreate {
  appointment_id: number;
  medications: MedicationItem[];
  diagnosis?: string;
  notes?: string;
  follow_up_date?: string;
  advice?: string;
}

export interface PrescriptionUpdate {
  medications?: MedicationItem[];
  diagnosis?: string;
  notes?: string;
  follow_up_date?: string;
  advice?: string;
}

export interface Prescription {
  id: number;
  appointment_id: number;
  doctor_id: number;
  patient_id: number;
  medications: MedicationItem[];
  diagnosis?: string;
  notes?: string;
  advice?: string;
  follow_up_date?: string;
  pdf_url?: string;
  created_at: string;
}

export interface PrescriptionDetail extends Prescription {
  doctor_name?: string;
  doctor_specialization?: string;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: string;
}

// Medicine search
export const searchMedicines = async (
  query: string,
  limit = 10,
  category?: string,
  form?: string
): Promise<MedicineSearchResponse> => {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (category) params.append('category', category);
  if (form) params.append('form', form);
  
  const response = await api.get(`/prescriptions/medicines/search?${params}`);
  return response.data;
};

export const getMedicineCategories = async (): Promise<string[]> => {
  const response = await api.get('/prescriptions/medicines/categories');
  return response.data;
};

export const getMedicineForms = async (): Promise<string[]> => {
  const response = await api.get('/prescriptions/medicines/forms');
  return response.data;
};

// Prescription CRUD
export const createPrescription = async (
  data: PrescriptionCreate
): Promise<Prescription> => {
  const response = await api.post('/prescriptions/', data);
  return response.data;
};

export const getPrescriptionByAppointment = async (
  appointmentId: number
): Promise<PrescriptionDetail> => {
  const response = await api.get(`/prescriptions/appointment/${appointmentId}`);
  return response.data;
};

export const getPrescription = async (
  prescriptionId: number
): Promise<PrescriptionDetail> => {
  const response = await api.get(`/prescriptions/${prescriptionId}`);
  return response.data;
};

export const updatePrescription = async (
  prescriptionId: number,
  data: PrescriptionUpdate
): Promise<Prescription> => {
  const response = await api.put(`/prescriptions/${prescriptionId}`, data);
  return response.data;
};

export const getMyPrescriptions = async (
  skip = 0,
  limit = 20
): Promise<PrescriptionDetail[]> => {
  const response = await api.get(`/prescriptions/patient/me?skip=${skip}&limit=${limit}`);
  return response.data;
};

export const getDoctorPrescriptions = async (
  skip = 0,
  limit = 20
): Promise<Prescription[]> => {
  const response = await api.get(`/prescriptions/doctor/me?skip=${skip}&limit=${limit}`);
  return response.data;
};

export const regeneratePrescriptionPdf = async (
  prescriptionId: number
): Promise<{ message: string; prescription_id: number }> => {
  const response = await api.post(`/prescriptions/${prescriptionId}/regenerate-pdf`);
  return response.data;
};

// Helper to get PDF download URL
export const getPrescriptionPdfUrl = (prescription: Prescription): string | null => {
  if (!prescription.pdf_url) return null;
  
  // If it's already a full URL, return as is
  if (prescription.pdf_url.startsWith('http')) {
    return prescription.pdf_url;
  }
  
  // Otherwise, construct the URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  return `${baseUrl}/uploads/${prescription.pdf_url}`;
};
