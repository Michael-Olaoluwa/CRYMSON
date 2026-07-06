import React from 'react';
import UserCGPATracker from '../pages/UserCGPATracker';

export default function MyGradeTrackerScreen({ activeUserId, onNavigateToCourseMaterials }) {
  return (
    <UserCGPATracker
      activeUserId={activeUserId}
      onNavigateToCourseMaterials={onNavigateToCourseMaterials}
    />
  );
}
