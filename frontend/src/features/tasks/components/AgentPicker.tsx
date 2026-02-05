import { useState, useRef, useEffect } from 'react';
import { Bot, Search, FileText, FileCode, GitBranch, Check } from 'lucide-react';
import type { AgentType } from '../../../domain/entities';

interface AgentPickerProps {
  value?: AgentType | AgentType[];
  onChange: (agents: AgentType | AgentType[]) => void;
  multiSelect?: boolean;
}

const agentOptions = [
  { id: 'researcher' as const, label: 'Researcher', icon: Search, description: 'Research solutions and gather information' },
  { id: 'planner' as const, label: 'Planner', icon: FileText, description: 'Create implementation plans' },
  { id: 'coder' as const, label: 'Coder', icon: FileCode, description: 'Write and modify code' },
  { id: 'reviewer' as const, label: 'Reviewer', icon: GitBranch, description: 'Review code changes' },
  { id: 'tester' as const, label: 'Tester', icon: Bot, description: 'Test implementations' },
];

export function AgentPicker({ value, onChange, multiSelect = false }: AgentPickerProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const toggleAgent = (agentId: AgentType) => {
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : value ? [value] : [];
      const newValues = currentValues.includes(agentId)
        ? currentValues.filter((id) => id !== agentId)
        : [...currentValues, agentId];
      onChange(newValues);
    } else {
      onChange(agentId);
      setShowDropdown(false);
    }
  };

  const isSelected = (agentId: AgentType) => {
    if (Array.isArray(value)) {
      return value.includes(agentId);
    }
    return value === agentId;
  };

  const getDisplayValue = () => {
    if (Array.isArray(value)) {
      if (value.length === 0) return 'Select agents...';
      return value
        .map((id) => agentOptions.find((a) => a.id === id)?.label)
        .filter(Boolean)
        .join(', ');
    }
    return agentOptions.find((a) => a.id === value)?.label || 'Select agent...';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="text-sm hover:bg-accent px-2 py-1 rounded transition-colors"
      >
        {getDisplayValue()}
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg py-1 z-20 max-h-64 overflow-y-auto">
          {agentOptions.map((agent) => {
            const Icon = agent.icon;
            const selected = isSelected(agent.id);

            return (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                className={`w-full flex items-start gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors ${
                  selected ? 'bg-primary/10' : ''
                }`}
              >
                {multiSelect ? (
                  <span
                    className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 mt-0.5 ${
                      selected ? 'border-blue-500 bg-primary/100' : 'border-input'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </span>
                ) : (
                  <span
                    className={`w-4 h-4 border rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      selected ? 'border-blue-500' : 'border-input'
                    }`}
                  >
                    {selected && <span className="w-2 h-2 rounded-full bg-primary/100" />}
                  </span>
                )}
                <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-left flex-1">
                  <div className="font-medium text-foreground">{agent.label}</div>
                  <div className="text-xs text-muted-foreground">{agent.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
