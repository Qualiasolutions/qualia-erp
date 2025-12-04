'use client';

import { Filter, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterDropdownProps {
  filters: FilterGroup[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
  onClearAll: () => void;
}

export function FilterDropdown({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
}: FilterDropdownProps) {
  // Count total active filters
  const activeCount = Object.values(activeFilters).reduce((sum, values) => sum + values.length, 0);

  const handleToggle = (groupKey: string, value: string, checked: boolean) => {
    const current = activeFilters[groupKey] || [];
    if (checked) {
      onFilterChange(groupKey, [...current, value]);
    } else {
      onFilterChange(
        groupKey,
        current.filter((v) => v !== value)
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Filter className="h-4 w-4" />
          <span>Filter</span>
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-qualia-600 px-1.5 py-0.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {filters.map((group, index) => (
          <div key={group.key}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>{group.label}</span>
                {(activeFilters[group.key]?.length || 0) > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {activeFilters[group.key].length}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {group.options.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={activeFilters[group.key]?.includes(option.value) || false}
                    onCheckedChange={(checked) => handleToggle(group.key, option.value, checked)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </div>
        ))}
        {activeCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={onClearAll}
              >
                <X className="mr-2 h-4 w-4" />
                Clear all filters
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
