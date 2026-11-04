
import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FloatingLabelInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: string | number;
}

interface FloatingLabelTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  value: string;
}

interface FloatingLabelSelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label: string;
  value: string;
  children: React.ReactNode;
}

export function FloatingLabelInput({ label, value, className = '', ...props }: FloatingLabelInputProps) {
  const hasValue = value !== '' && value !== null && value !== undefined;
  
  return (
    <div className="relative">
      <input
        {...props}
        value={value}
        className={`peer w-full px-3 pt-4 pb-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all ${className}`}
        placeholder=" "
      />
      <label className={`absolute left-3 text-[10px] font-medium text-foreground/70 transition-all pointer-events-none ${hasValue || props.placeholder === ' ' ? 'top-0.5 text-[9px]' : 'top-1/2 -translate-y-1/2 text-xs peer-focus:top-0.5 peer-focus:text-[9px]'}`}>
        {label}
      </label>
    </div>
  );
}

export function FloatingLabelTextarea({ label, value, className = '', rows = 2, ...props }: FloatingLabelTextareaProps) {
  const hasValue = value !== '' && value !== null && value !== undefined;
  
  return (
    <div className="relative">
      <textarea
        {...props}
        value={value}
        rows={rows}
        className={`peer w-full px-3 pt-4 pb-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none ${className}`}
        placeholder=" "
      />
      <label className={`absolute left-3 text-[10px] font-medium text-foreground/70 transition-all pointer-events-none ${hasValue ? 'top-0.5 text-[9px]' : 'top-3 text-xs peer-focus:top-0.5 peer-focus:text-[9px]'}`}>
        {label}
      </label>
    </div>
  );
}

export function FloatingLabelSelect({ label, value, className = '', children, ...props }: FloatingLabelSelectProps) {
  const hasValue = value !== '' && value !== null && value !== undefined;
  
  return (
    <div className="relative">
      <select
        {...props as any}
        value={value}
        className={`peer w-full px-3 pt-4 pb-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all ${className}`}
      >
        {children}
      </select>
      <label className={`absolute left-3 text-xs font-medium text-foreground/70 transition-all pointer-events-none ${hasValue ? 'top-1.5 text-[10px]' : 'top-1/2 -translate-y-1/2 text-sm peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:translate-y-0'}`}>
        {label}
      </label>
    </div>
  );
}
