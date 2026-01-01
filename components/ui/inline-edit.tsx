'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Check, X, ChevronDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

// ============================================================================
// InlineText - Click text to edit, Enter saves, Escape cancels
// ============================================================================

interface InlineTextProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export function InlineText({
  value,
  onSave,
  placeholder = 'Enter text...',
  className,
  inputClassName,
  disabled = false,
}: InlineTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(async () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue === value || trimmedValue === '') {
      setEditValue(value);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (disabled) {
    return (
      <span className={cn('text-[13px]', className)}>
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className={cn(
            'h-6 rounded-sm border border-primary/30 bg-background px-1.5 text-[13px] outline-none ring-1 ring-primary/20',
            'focus:border-primary/50 focus:ring-primary/30',
            'disabled:opacity-50',
            inputClassName
          )}
          placeholder={placeholder}
        />
        {isSaving && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn('inline-editable cursor-text', className)}
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </span>
  );
}

// ============================================================================
// InlineSelect - Click to show dropdown, select to save
// ============================================================================

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface InlineSelectProps {
  value: string;
  options: SelectOption[];
  onSave: (value: string) => Promise<void>;
  className?: string;
  disabled?: boolean;
  showIcon?: boolean;
}

export function InlineSelect({
  value,
  options,
  onSave,
  className,
  disabled = false,
  showIcon = true,
}: InlineSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = useCallback(
    async (newValue: string) => {
      if (newValue === value) {
        setIsOpen(false);
        return;
      }

      setIsSaving(true);
      try {
        await onSave(newValue);
        setIsOpen(false);
      } catch (error) {
        console.error('Failed to save:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [value, onSave]
  );

  if (disabled) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-[13px]', className)}>
        {showIcon && selectedOption?.icon}
        <span className={selectedOption?.color}>{selectedOption?.label || value}</span>
      </span>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={isSaving}>
        <button
          className={cn(
            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[13px] transition-colors duration-150',
            'hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/20',
            'disabled:opacity-50',
            className
          )}
        >
          {showIcon && selectedOption?.icon}
          <span className={selectedOption?.color}>{selectedOption?.label || value}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
          {isSaving && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[140px]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={cn(
              'flex items-center gap-2 text-[13px]',
              option.value === value && 'bg-muted'
            )}
          >
            {option.icon}
            <span className={option.color}>{option.label}</span>
            {option.value === value && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// InlineDate - Click to show date picker
// ============================================================================

interface InlineDateProps {
  value: Date | null | undefined;
  onSave: (value: Date | null) => Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showClear?: boolean;
}

export function InlineDate({
  value,
  onSave,
  placeholder = 'Set date',
  className,
  disabled = false,
  showClear = true,
}: InlineDateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = useCallback(
    async (date: Date | undefined) => {
      const newDate = date || null;

      // Check if same date
      if (
        (newDate === null && value === null) ||
        (newDate && value && newDate.toDateString() === value.toDateString())
      ) {
        setIsOpen(false);
        return;
      }

      setIsSaving(true);
      try {
        await onSave(newDate);
        setIsOpen(false);
      } catch (error) {
        console.error('Failed to save:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [value, onSave]
  );

  const handleClear = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (value === null) return;

      setIsSaving(true);
      try {
        await onSave(null);
        setIsOpen(false);
      } catch (error) {
        console.error('Failed to clear:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [value, onSave]
  );

  if (disabled) {
    return (
      <span className={cn('text-[13px] text-muted-foreground', className)}>
        {value ? format(value, 'MMM d, yyyy') : placeholder}
      </span>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={isSaving}>
        <button
          className={cn(
            'inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[13px] transition-colors duration-150',
            'hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/20',
            'disabled:opacity-50',
            value ? 'text-foreground' : 'text-muted-foreground',
            className
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{value ? format(value, 'MMM d') : placeholder}</span>
          {isSaving && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          {showClear && value && !isSaving && (
            <X
              className="h-3 w-3 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={value || undefined}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
