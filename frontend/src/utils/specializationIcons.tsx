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

/**
 * Color mapping for medical specializations.
 * Maps specialization names to background and text color classes.
 */
const specializationColors: Record<string, string> = {
  'Cardiology': 'bg-red-50 text-red-600',
  'Neurology': 'bg-purple-50 text-purple-600',
  'Ophthalmology': 'bg-blue-50 text-blue-600',
  'Pediatrics': 'bg-pink-50 text-pink-600',
  'Orthopedics': 'bg-amber-50 text-amber-600',
  'Dermatology': 'bg-rose-50 text-rose-600',
  'Gynecology': 'bg-fuchsia-50 text-fuchsia-600',
  'ENT': 'bg-indigo-50 text-indigo-600',
  'Psychiatry': 'bg-violet-50 text-violet-600',
  'General Medicine': 'bg-teal-50 text-teal-600',
  'Gastroenterology': 'bg-orange-50 text-orange-600',
  'Pulmonology': 'bg-cyan-50 text-cyan-600',
  'Nephrology': 'bg-emerald-50 text-emerald-600',
  'Endocrinology': 'bg-lime-50 text-lime-600',
  'Oncology': 'bg-red-50 text-red-700',
  'Urology': 'bg-sky-50 text-sky-600',
  'Rheumatology': 'bg-yellow-50 text-yellow-600',
};

/**
 * Icon name mapping for specializations.
 * Maps specialization names to icon identifiers.
 */
const specializationIconNames: Record<string, string> = {
  'Cardiology': 'heart',
  'Neurology': 'brain',
  'Ophthalmology': 'eye',
  'Pediatrics': 'baby',
  'Orthopedics': 'bone',
  'Dermatology': 'skin',
  'Gynecology': 'female',
  'ENT': 'ear',
  'Psychiatry': 'brain',
  'General Medicine': 'stethoscope',
  'Gastroenterology': 'stomach',
  'Pulmonology': 'lungs',
  'Nephrology': 'kidney',
  'Endocrinology': 'activity',
  'Oncology': 'cancer',
  'Urology': 'kidney',
  'Rheumatology': 'bone',
};

/**
 * Get both icon and color for a specialization.
 * Used in Dashboard and other components that need both icon and color styling.
 * 
 * @param name - The specialization name
 * @param className - Optional CSS classes for the icon (default: "w-5 h-5")
 * @returns Object with icon React node and color classes
 */
export const getSpecializationWithColor = (
  name: string,
  className: string = 'w-5 h-5'
): { icon: React.ReactNode; color: string } => {
  const iconName = specializationIconNames[name] || 'stethoscope';
  const color = specializationColors[name] || 'bg-slate-50 text-slate-600';
  const icon = getSpecializationIcon(iconName, className);
  
  return { icon, color };
};
