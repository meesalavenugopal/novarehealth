/**
 * Feature Flags Store
 * 
 * Fetches and stores feature flags from the backend.
 * Use this to conditionally show/hide features in the UI.
 */
import { create } from 'zustand';
import { config } from '../config';

export interface FeatureFlags {
  settings_enabled: boolean;
  prescriptions_enabled: boolean;
  health_records_enabled: boolean;
  help_support_enabled: boolean;
  ai_chat_enabled: boolean;
  video_consult_enabled: boolean;
  reviews_enabled: boolean;
  mobile_app_banner_enabled: boolean;
}

interface FeatureFlagsState {
  flags: FeatureFlags;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchFlags: () => Promise<void>;
  isEnabled: (flag: keyof FeatureFlags) => boolean;
}

// Default flags (all enabled except settings and mobile app banner)
const DEFAULT_FLAGS: FeatureFlags = {
  settings_enabled: false,
  prescriptions_enabled: true,
  health_records_enabled: true,
  help_support_enabled: true,
  ai_chat_enabled: true,
  video_consult_enabled: true,
  reviews_enabled: true,
  mobile_app_banner_enabled: false,
};

export const useFeatureFlags = create<FeatureFlagsState>((set, get) => ({
  flags: DEFAULT_FLAGS,
  isLoaded: false,
  isLoading: false,
  error: null,

  fetchFlags: async () => {
    // Prevent multiple simultaneous fetches
    if (get().isLoading) return;
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${config.apiUrl}/config/feature-flags`);
      
      if (response.ok) {
        const flags = await response.json();
        set({ flags, isLoaded: true, isLoading: false });
      } else {
        // Use defaults on error
        set({ isLoaded: true, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
      // Use defaults on error
      set({ isLoaded: true, isLoading: false, error: 'Failed to load feature flags' });
    }
  },

  isEnabled: (flag: keyof FeatureFlags) => {
    return get().flags[flag] ?? false;
  },
}));
