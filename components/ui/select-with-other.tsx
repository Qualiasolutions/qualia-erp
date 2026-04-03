'use client';

import * as React from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
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
 * A modern select component with search, scrollable list, and prominent "Add new" option.
 */
export function SelectWithOther({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  otherLabel = 'Add new...',
  otherPlaceholder = 'Type name...',
  icon,
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
}: SelectWithOtherProps) {
  const [open, setOpen] = React.useState(false);
  const [isCustomMode, setIsCustomMode] = React.useState(false);
  const [customValue, setCustomValue] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Check if the current value is from the options list or is custom
  const selectedOption = options.find((opt) => opt.value === value);
  const isCurrentValueCustom = value && !selectedOption;

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) || opt.description?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Initialize custom mode if value is custom on mount
  React.useEffect(() => {
    if (isCurrentValueCustom && value) {
      setCustomValue(value);
      setIsCustomMode(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus search input when popover opens
  React.useEffect(() => {
    if (open && !isCustomMode && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open, isCustomMode]);

  // Focus custom input when entering custom mode
  React.useEffect(() => {
    if (isCustomMode && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isCustomMode]);

  // Reset search when closing
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('');
      if (!isCurrentValueCustom) {
        setIsCustomMode(false);
      }
    }
  }, [open, isCurrentValueCustom]);

  const handleSelectOption = (optionValue: string) => {
    setIsCustomMode(false);
    setCustomValue('');
    onChange(optionValue, false);
    setOpen(false);
  };

  const handleSelectOther = () => {
    setIsCustomMode(true);
    setCustomValue(searchQuery); // Pre-fill with search query
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

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredOptions.length === 0 && searchQuery.trim()) {
      // If no results and user presses enter, switch to add new mode
      handleSelectOther();
    }
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
            'h-9 w-auto min-w-[140px] justify-between gap-2 border-border bg-secondary/50 px-3 text-sm font-normal transition-all hover:bg-secondary',
            value && 'border-primary/30 bg-primary/5',
            (isCurrentValueCustom || isCustomMode) && 'border-primary/30 bg-primary/5',
            triggerClassName,
            className
          )}
        >
          <span className="flex items-center gap-2">
            {icon}
            {displayValue ? (
              <span className="flex items-center gap-1.5">
                {(isCurrentValueCustom || (isCustomMode && customValue)) && (
                  <Plus className="h-3 w-3 text-primary" />
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
          'bg-card/98 w-[var(--radix-popover-trigger-width)] min-w-[280px] border-border p-0 shadow-xl backdrop-blur-xl',
          contentClassName
        )}
        align="start"
        sideOffset={4}
      >
        {isCustomMode ? (
          /* Add new mode */
          <div className="p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Plus className="h-4 w-4 text-primary" />
              <span>Add new</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={handleCustomKeyDown}
                placeholder={otherPlaceholder}
                className="h-10 flex-1 rounded-lg border border-border bg-muted/50 px-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCustomMode(false);
                  setCustomValue('');
                }}
                className="h-10 w-10 shrink-0 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCustomSubmit}
                disabled={!customValue.trim()}
                className="h-10 shrink-0 bg-primary px-4 hover:bg-primary/90"
              >
                Add
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Search input */}
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search..."
                  className="h-9 w-full rounded-lg border-0 bg-muted/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Add new button - prominent at top */}
            <div className="border-b border-border p-2">
              <button
                type="button"
                onClick={handleSelectOther}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  'bg-gradient-to-r from-qualia-500/10 to-qualia-600/10 text-primary dark:text-primary',
                  'hover:from-qualia-500/20 hover:to-qualia-600/20',
                  'border border-primary/20'
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                  <Plus className="h-4 w-4" />
                </div>
                <span>{otherLabel}</span>
              </button>
            </div>

            {/* Options list */}
            <div className="max-h-[280px] overflow-y-auto p-2">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery ? (
                    <div className="space-y-2">
                      <p>No results for &quot;{searchQuery}&quot;</p>
                      <button
                        type="button"
                        onClick={handleSelectOther}
                        className="text-primary hover:underline"
                      >
                        Add &quot;{searchQuery}&quot; as new
                      </button>
                    </div>
                  ) : (
                    <p>No options available</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOptions.map((option) => {
                    const isSelected = value === option.value && !isCustomMode;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectOption(option.value)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                          isSelected
                            ? 'bg-primary/10 text-primary dark:text-primary'
                            : 'hover:bg-muted/80'
                        )}
                      >
                        {option.icon && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            {option.icon}
                          </span>
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-medium">{option.label}</div>
                          {option.description && (
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
