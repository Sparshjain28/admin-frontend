import CibilCreditReport from '@/components/CibilCreditReport';
import { SharedTabProps } from './shared';

export default function CreditTab({ loan }: SharedTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white/80 border-2 border-white/50 backdrop-blur-md shadow-sm rounded-2xl p-5 mb-4 animate-fade-in">
        <CibilCreditReport loan={loan} />
      </div>
    </div>
  );
}
