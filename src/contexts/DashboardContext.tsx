import React, { createContext, useContext } from 'react';

export interface DashboardContextType {
  timeline: string;
  setTimeline: (value: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (value: { start: string; end: string }) => void;
  showExportMenu: boolean;
  setShowExportMenu: (value: boolean) => void;
  isGeneratingPDF: boolean;
  setIsGeneratingPDF: (value: boolean) => void;
  handleExportDashboard?: () => Promise<void>;
  handleViewDashboard?: () => Promise<void>;
  handleShareDashboard?: () => Promise<void>;
}

export const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboardContext must be used within Dashboard');
  return context;
};

export const useDashboardContextSafe = () => {
  return useContext(DashboardContext);
};
