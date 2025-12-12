import React from 'react';
import {
  Stethoscope,
  Heart,
  Brain,
  Baby,
  Eye,
  Bone,
  Sparkles,
  Users,
  Activity,
  Pill,
  Syringe,
  Shield,
  FileText,
} from 'lucide-react';

/**
 * Icon mapping for medical specializations.
 * Maps icon names (from backend) to Lucide React icons.
 * 
 * @param iconName - The icon identifier from the specialization data
 * @param className - Optional CSS classes for the icon (default: "w-6 h-6")
 * @returns React node with the appropriate icon
 */
export const getSpecializationIcon = (
  iconName: string,
  className: string = 'w-6 h-6'
): React.ReactNode => {
  const iconMap: Record<string, React.ReactNode> = {
    // Core specializations
    stethoscope: <Stethoscope className={className} />,
    heart: <Heart className={className} />,
    brain: <Brain className={className} />,
    baby: <Baby className={className} />,
    eye: <Eye className={className} />,
    bone: <Bone className={className} />,
    
    // Mapped specializations
    skin: <Sparkles className={className} />,
    female: <Users className={className} />,
    activity: <Activity className={className} />,
    pill: <Pill className={className} />,
    syringe: <Syringe className={className} />,
    tooth: <Sparkles className={className} />,
    allergy: <Shield className={className} />,
    lungs: <Activity className={className} />,
    kidney: <Activity className={className} />,
    stomach: <Activity className={className} />,
    ear: <Activity className={className} />,
    cancer: <Shield className={className} />,
    emergency: <Activity className={className} />,
    nutrition: <Pill className={className} />,
    physiotherapy: <Activity className={className} />,
    radiology: <Eye className={className} />,
    pathology: <FileText className={className} />,
    surgery: <Syringe className={className} />,
  };

  return iconMap[iconName] || <Stethoscope className={className} />;
};

/**
 * Get icon by specialization name (alternative lookup).
 * Used when only the specialization name is available.
 */
export const getSpecializationIconByName = (
  name: string,
  className: string = 'w-6 h-6'
): React.ReactNode => {
  return getSpecializationIcon(name, className);
};
