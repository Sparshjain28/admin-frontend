import { useState } from 'react';
import { Clock, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  ApplicationStage, 
  ApplicationStageData,
  STAGE_LABELS,
  STAGE_COLORS 
} from '@/types/applicationStages';

interface ApplicationStageDisplayProps {
  currentStage: ApplicationStage;
  stageHistory?: ApplicationStageData[];
  onEditStage?: () => void;
  canEdit?: boolean;
}

export default function ApplicationStageDisplay({ 
  currentStage, 
  stageHistory = [], 
  onEditStage,
  canEdit = false 
}: ApplicationStageDisplayProps) {
  const [showHistory, setShowHistory] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStageDetails = (stageData: ApplicationStageData) => {
    const { stage } = stageData;
    
    switch (stage) {
      case 'LOGIN':
        if (stageData.loginData) {
          return (
            <div className="text-xs text-muted-foreground mt-1">
              {stageData.loginData.appScore && `App Score: ${stageData.loginData.appScore}`}
              {stageData.loginData.appScore && stageData.loginData.creditScore && ' • '}
              {stageData.loginData.creditScore && `Credit Score: ${stageData.loginData.creditScore}`}
            </div>
          );
        }
        break;
        
      case 'IN_PROCESS':
        if (stageData.inProcessData?.tags?.length) {
          return (
            <div className="text-xs text-muted-foreground mt-1">
              Tags: {stageData.inProcessData.tags.join(', ')}
            </div>
          );
        }
        break;
        
      case 'REJECTED':
        if (stageData.rejectedData?.remarks) {
          return (
            <div className="text-xs text-muted-foreground mt-1">
              Reason: {stageData.rejectedData.remarks}
            </div>
          );
        }
        break;
        
      case 'APPROVED':
        if (stageData.approvedData) {
          const { loanAmount, roi, tenure } = stageData.approvedData;
          return (
            <div className="text-xs text-muted-foreground mt-1">
              ₹{loanAmount.toLocaleString('en-IN')} • {roi}% ROI • {tenure} months
            </div>
          );
        }
        break;
        
      case 'DISBURSED':
        if (stageData.disbursedData) {
          const { loanAmount, loanAccountNumber, vehicleRCStatus } = stageData.disbursedData;
          return (
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              <div>₹{loanAmount.toLocaleString('en-IN')} • A/c: {loanAccountNumber}</div>
              <div>RC: {vehicleRCStatus.rcType.replace('_', ' ')} • Collected by: {vehicleRCStatus.collectedBy.replace('_', ' ')}</div>
            </div>
          );
        }
        break;
        
      case 'CANCELLED':
        if (stageData.cancelledData?.remarks) {
          return (
            <div className="text-xs text-muted-foreground mt-1">
              Reason: {stageData.cancelledData.remarks}
            </div>
          );
        }
        break;
    }
    
    return null;
  };

  const currentStageData = stageHistory.find(s => s.stage === currentStage) || {
    stage: currentStage,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System'
  };

  return (
    <div className="space-y-4">
      {/* Current Stage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STAGE_COLORS[currentStage]}`}>
            {STAGE_LABELS[currentStage]}
          </span>
          <div className="text-sm text-muted-foreground">
            Updated {formatDate(currentStageData.updatedAt)}
          </div>
        </div>
        
        {canEdit && onEditStage && (
          <button
            onClick={onEditStage}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
          >
            <Edit size={14} />
            Update Stage
          </button>
        )}
      </div>

      {/* Current Stage Details */}
      {renderStageDetails(currentStageData)}

      {/* Stage History Toggle */}
      {stageHistory.length > 1 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Clock size={14} />
          Stage History ({stageHistory.length - 1} previous)
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}

      {/* Stage History */}
      {showHistory && stageHistory.length > 1 && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-foreground text-sm">Stage History</h4>
          <div className="space-y-3">
            {stageHistory
              .filter(s => s.stage !== currentStage)
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((stageData, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STAGE_COLORS[stageData.stage]}`}>
                    {STAGE_LABELS[stageData.stage]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground">
                      {formatDate(stageData.updatedAt)} • by {stageData.updatedBy}
                    </div>
                    {renderStageDetails(stageData)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Auto-cancellation warning for APPROVED stage */}
      {currentStage === 'APPROVED' && currentStageData.approvedData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-sm text-yellow-800">
            <strong>Note:</strong> This application will automatically move to CANCELLED stage if not disbursed within 30 days of approval.
          </div>
          <div className="text-xs text-yellow-600 mt-1">
            Approved on: {formatDate(currentStageData.approvedData.approvedDate)}
          </div>
        </div>
      )}
    </div>
  );
}