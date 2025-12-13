import { Navigate } from 'react-router-dom';
import { useFeatureFlags, FeatureFlags } from '../../store/featureFlagsStore';

interface FeatureRouteProps {
  children: React.ReactNode;
  featureFlag: keyof FeatureFlags;
  redirectTo?: string;
}

/**
 * FeatureRoute - Protects routes based on feature flags.
 * 
 * If the feature flag is disabled, redirects to the specified path (default: home).
 * Use this in combination with ProtectedRoute for auth + feature protection.
 */
export default function FeatureRoute({ 
  children, 
  featureFlag, 
  redirectTo = '/' 
}: FeatureRouteProps) {
  const { isEnabled, isLoaded } = useFeatureFlags();

  // Wait for flags to load before making a decision
  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  if (!isEnabled(featureFlag)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
