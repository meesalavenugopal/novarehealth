import api from './api';

export interface JoinTokenResponse {
  token: string;
  room_name: string;
  identity: string;
  display_name: string;
  appointment_id: number;
  scheduled_time: string;
  scheduled_date: string;
  duration: number;
  appointment_type: string;
  status: string;
}

export interface ConsultationStartResponse {
  message: string;
  room_name: string;
  started_at: string;
}

export interface ConsultationEndResponse {
  message: string;
  appointment_id: number;
  started_at: string | null;
  ended_at: string;
  duration_seconds: number;
  duration_minutes: number;
}

export interface ParticipantInfo {
  id: number;
  name: string;
  avatar_url?: string;
}

export interface DoctorInfo extends ParticipantInfo {
  user_id: number;
  specialization_id?: number;
}

export interface ConsultationStatusResponse {
  appointment_id: number;
  status: string;
  appointment_type: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  room_name: string | null;
  can_join: boolean;
  time_until_start_seconds: number;
  elapsed_seconds: number;
  remaining_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  patient: ParticipantInfo;
  doctor: DoctorInfo;
}

export const consultationService = {
  // Get token to join video room
  getJoinToken: async (appointmentId: number): Promise<JoinTokenResponse> => {
    const response = await api.get<JoinTokenResponse>(
      `/consultations/${appointmentId}/token`
    );
    return response.data;
  },

  // Start consultation (doctor only)
  startConsultation: async (appointmentId: number): Promise<ConsultationStartResponse> => {
    const response = await api.post<ConsultationStartResponse>(
      `/consultations/${appointmentId}/start`
    );
    return response.data;
  },

  // End consultation (doctor only)
  endConsultation: async (appointmentId: number): Promise<ConsultationEndResponse> => {
    const response = await api.post<ConsultationEndResponse>(
      `/consultations/${appointmentId}/end`
    );
    return response.data;
  },

  // Get consultation status
  getConsultationStatus: async (appointmentId: number): Promise<ConsultationStatusResponse> => {
    const response = await api.get<ConsultationStatusResponse>(
      `/consultations/${appointmentId}/status`
    );
    return response.data;
  },
};

export default consultationService;
