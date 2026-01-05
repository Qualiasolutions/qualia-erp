'use client';

import * as React from 'react';
import { Check, ChevronDown, PenLine, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectWithOtherProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string, isCustom: boolean) => void;
  placeholder?: string;
  otherLabel?: string;
  otherPlaceholder?: string;
  icon?: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
}

/**
 * A select component that includes an "Other" option allowing custom text input.
 * When a user selects "Other", an inline text input appears to type a custom value.
 */
export function SelectWithOther({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  otherLabel = 'Other...',
  otherPlaceholder = 'Type custom value...',
  icon,
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
}: SelectWithOtherProps) {
  const [open, setOpen] = React.useState(false);
  const [isCustomMode, setIsCustomMode] = React.useState(false);
  const [customValue, setCustomValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Check if the current value is from the options list or is custom
  const selectedOption = options.find((opt) => opt.value === value);
  const isCurrentValueCustom = value && !selectedOption;

  // Initialize custom mode if value is custom on mount
  React.useEffect(() => {
    if (isCurrentValueCustom && value) {
      setCustomValue(value);
      setIsCustomMode(true);
    }
  }, []);

  // Focus input when entering custom mode
  React.useEffect(() => {
    if (isCustomMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCustomMode]);

  const handleSelectOption = (optionValue: string) => {
    setIsCustomMode(false);
    setCustomValue('');
    onChange(optionValue, false);
    setOpen(false);
  };

  const handleSelectOther = () => {
    setIsCustomMode(true);
    // Keep popover open so user can type
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim(), true);
      setOpen(false);
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      setIsCustomMode(false);
      setCustomValue('');
    }
  };

  const handleClearCustom = () => {
    setIsCustomMode(false);
    setCustomValue('');
    onChange('', false);
  };

  // Display value logic
  const displayValue = React.useMemo(() => {
    if (isCustomMode && customValue) {
      return customValue;
    }
    if (selectedOption) {
      return selectedOption.label;
    }
    if (isCurrentValueCustom) {
      return value;
    }
    return null;
  }, [isCustomMode, customValue, selectedOption, isCurrentValueCustom, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-9 w-auto min-w-[140px] justify-between gap-2 border-border/50 bg-secondary/50 px-3 text-sm font-normal transition-all hover:bg-secondary',
            value && 'border-primary/30 bg-primary/5',
            (isCurrentValueCustom || isCustomMode) && 'border-amber-500/30 bg-amber-500/5',
            triggerClassName,
            className
          )}
        >
          <span className="flex items-center gap-2">
            {icon}
            {displayValue ? (
              <span className="flex items-center gap-1.5">
                {(isCurrentValueCustom || (isCustomMode && customValue)) && (
                  <PenLine className="h-3 w-3 text-amber-500" />
                )}
                <span className="truncate">{displayValue}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-[220px] border-border/50 bg-card/95 p-1 backdrop-blur-xl',
          contentClassName
        )}
        align="start"
      >
        {/* Options list */}
        <div className="max-h-[200px] overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelectOption(option.value)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                value === option.value && !isCustomMode
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-secondary'
              )}
            >
              {option.icon && <span className="shrink-0">{option.icon}</span>}
              <span className="flex-1 truncate text-left">{option.label}</span>
              {value === option.value && !isCustomMode && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="my-1 h-px bg-border/50" />

        {/* Other option / Custom input */}
        {isCustomMode ? (
          <div className="flex items-center gap-1 p-1">
            <input
              ref={inputRef}
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              placeholder={otherPlaceholder}
              className="h-8 flex-1 rounded-md border border-border/50 bg-secondary/50 px-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClearCustom}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCustomSubmit}
              disabled={!customValue.trim()}
              className="h-8 px-2"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSelectOther}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              isCurrentValueCustom
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <PenLine className="h-4 w-4" />
            <span>{otherLabel}</span>
            {isCurrentValueCustom && <Check className="ml-auto h-4 w-4" />}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
