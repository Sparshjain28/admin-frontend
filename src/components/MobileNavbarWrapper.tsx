import React from 'react';
import Navbar from './Navbar';

interface MobileNavbarWrapperProps {
  title?: string;
  showTimeline?: boolean;
  showExport?: boolean;
  showNotifications?: boolean;
  showProfile?: boolean;
  children: React.ReactNode;
}

export default function MobileNavbarWrapper({
  title,
  showTimeline = true,
  showExport = true,
  showNotifications = true,
  showProfile = true,
  children
}: MobileNavbarWrapperProps) {
  return (
    <div className="pb-24 lg:pb-0">
      <Navbar 
        title={title}
        showTimeline={showTimeline}
        showExport={showExport}
        showNotifications={showNotifications}
        showProfile={showProfile}
      />
      <div style={{ marginTop: 'clamp(3rem, 5vh, 3.5rem)' }}>
        {children}
      </div>
    </div>
  );
}
