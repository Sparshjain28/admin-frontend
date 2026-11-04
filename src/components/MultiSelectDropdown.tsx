import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function MultiSelectDropdown({ options, value, onChange, placeholder = 'Select...', className = '' }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLabels = value.map(v => options.find(o => o.value === v)?.label || v);

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`flex items-center justify-between px-3 py-2.5 rounded-md border border-slate-300 dark:border-zinc-700 bg-card text-xs font-medium text-foreground cursor-pointer select-none shadow-sm ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate pr-2">
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <span className="text-foreground">
              {value.length === 1 ? selectedLabels[0] : `${value.length} selected`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          {value.length > 0 && (
            <div
              className="p-0.5 hover:bg-muted rounded-full transition-colors"
              onClick={clearAll}
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-slate-300 dark:border-zinc-700 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col py-1">
          {/* Search Input */}
          <div className="px-2 pb-1.5 pt-0.5 border-b border-slate-200 dark:border-zinc-800">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-zinc-800 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              onClick={(e) => e.stopPropagation()} // Prevent closing dropdown on input click
            />
          </div>
          <div className="overflow-auto max-h-48 flex-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center">No options</div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = value.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-xs transition-colors"
                    onClick={() => toggleOption(option.value)}
                  >
                    <div className={`flex items-center justify-center w-4 h-4 rounded border ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background'}`}>
                      {isSelected && <Check size={12} />}
                    </div>
                    <span className="truncate flex-1">{option.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
