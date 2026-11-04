import React, { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, ChevronRight, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HierarchyNode {
  id: number;
  full_name: string;
  role?: string;
  team_members?: HierarchyNode[];
}

interface HierarchyDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: HierarchyNode[];
  placeholder?: string;
  className?: string;
}

const TreeNode = ({ node, level, value, onChange, onClose, forceExpand }: any) => {
  const hasChildren = node.team_members && node.team_members.length > 0;
  const [expanded, setExpanded] = useState(false);
  const isSelected = value === node.full_name || value === node.name;
  const displayName = node.full_name || node.name;
  
  // Auto-expand if forceExpand is true
  const isExpanded = expanded || forceExpand;

  return (
    <div className="w-full">
      <div 
        className={cn(
          "flex items-center py-1.5 px-2 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm text-sm transition-colors",
          isSelected && "bg-accent/50 text-accent-foreground font-medium"
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
      >
        <div 
          className="flex-shrink-0 w-5 h-5 mr-1 flex items-center justify-center cursor-pointer hover:bg-accent-foreground/10 rounded"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded(!expanded);
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-3.5 w-3.5 opacity-70" /> : <ChevronRight className="h-3.5 w-3.5 opacity-70" />
          ) : (
            <span className="w-3.5" />
          )}
        </div>
        
        <div 
          className="flex-1 flex items-center min-w-0"
          onClick={() => {
            onChange(displayName);
            onClose();
          }}
        >
          <span className="truncate">{displayName}</span>
          {node.role && (
            <span className="ml-2 text-[9px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">
              {node.role.replace('_', ' ')}
            </span>
          )}
        </div>
        
        {isSelected && <Check className="h-3.5 w-3.5 ml-2 text-primary shrink-0" />}
      </div>
      
      {isExpanded && hasChildren && (
        <div className="flex flex-col mt-0.5 space-y-0.5">
          {node.team_members.map((child: any) => (
            <TreeNode 
              key={child.id || child.full_name} 
              node={child} 
              level={level + 1} 
              value={value} 
              onChange={onChange}
              onClose={onClose}
              forceExpand={forceExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function HierarchyDropdown({ value, onChange, options, placeholder = "Select person", className }: HierarchyDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const lowerQuery = searchQuery.toLowerCase();
    
    const filterTree = (nodes: any[]): any[] => {
      return nodes.map(node => {
        const name = node.full_name || node.name || '';
        const match = name.toLowerCase().includes(lowerQuery);
        const filteredChildren = node.team_members ? filterTree(node.team_members) : [];
        
        if (match || filteredChildren.length > 0) {
          return { ...node, team_members: filteredChildren };
        }
        return null;
      }).filter(Boolean);
    };
    
    return filterTree(options);
  }, [options, searchQuery]);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between bg-transparent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className || "h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus:ring-1 focus:ring-ring"
          )}
        >
          <span className="truncate text-left">{value || placeholder}</span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 overflow-hidden flex flex-col" align="start">
        <div className="p-2 border-b border-border flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground opacity-70" />
          <input 
            type="text" 
            placeholder="Search team members..." 
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="flex flex-col space-y-0.5 p-1.5 max-h-[350px] overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No team members found.</div>
          ) : (
            filteredOptions.map((node) => (
              <TreeNode 
                key={node.id || node.full_name} 
                node={node} 
                level={0} 
                value={value} 
                onChange={onChange}
                onClose={() => setOpen(false)}
                forceExpand={searchQuery.length > 0}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
