import { Construction } from 'lucide-react';

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Construction size={28} className="text-accent" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground text-sm max-w-md">
        This module is under development. Connect to Lovable Cloud to enable full backend functionality with database, authentication, and more.
      </p>
    </div>
  );
}
