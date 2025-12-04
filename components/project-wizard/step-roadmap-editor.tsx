'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, Check, Edit2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhaseTemplate, PhaseItemTemplate, ProjectType } from '@/lib/phase-templates';
import { getPhaseTemplates } from '@/lib/phase-templates';

interface StepRoadmapEditorProps {
  phases: PhaseTemplate[];
  projectType: ProjectType | null;
  onChange: (phases: PhaseTemplate[]) => void;
}

export function StepRoadmapEditor({ phases, projectType, onChange }: StepRoadmapEditorProps) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [editingPhase, setEditingPhase] = useState<number | null>(null);
  const [newPhaseName, setNewPhaseName] = useState('');

  const handlePhaseNameChange = (index: number, name: string) => {
    const updated = [...phases];
    updated[index] = { ...updated[index], name };
    onChange(updated);
  };

  const handleDeletePhase = (index: number) => {
    const updated = phases.filter((_, i) => i !== index);
    onChange(updated);
    if (expandedPhase === index) {
      setExpandedPhase(null);
    } else if (expandedPhase !== null && expandedPhase > index) {
      setExpandedPhase(expandedPhase - 1);
    }
  };

  const handleMovePhase = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === phases.length - 1)
    ) {
      return;
    }

    const updated = [...phases];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    onChange(updated);

    if (expandedPhase === index) {
      setExpandedPhase(targetIndex);
    } else if (expandedPhase === targetIndex) {
      setExpandedPhase(index);
    }
  };

  const handleAddPhase = () => {
    if (!newPhaseName.trim()) return;

    const newPhase: PhaseTemplate = {
      templateKey: `custom_${Date.now()}`,
      name: newPhaseName.trim(),
      description: '',
      items: [],
    };

    onChange([...phases, newPhase]);
    setNewPhaseName('');
    setExpandedPhase(phases.length);
  };

  const handleAddItem = (phaseIndex: number) => {
    const updated = [...phases];
    const newItem: PhaseItemTemplate = {
      templateKey: `custom_item_${Date.now()}`,
      title: 'New item',
      description: '',
    };
    updated[phaseIndex] = {
      ...updated[phaseIndex],
      items: [...updated[phaseIndex].items, newItem],
    };
    onChange(updated);
  };

  const handleItemTitleChange = (phaseIndex: number, itemIndex: number, title: string) => {
    const updated = [...phases];
    const items = [...updated[phaseIndex].items];
    items[itemIndex] = { ...items[itemIndex], title };
    updated[phaseIndex] = { ...updated[phaseIndex], items };
    onChange(updated);
  };

  const handleDeleteItem = (phaseIndex: number, itemIndex: number) => {
    const updated = [...phases];
    const items = updated[phaseIndex].items.filter((_, i) => i !== itemIndex);
    updated[phaseIndex] = { ...updated[phaseIndex], items };
    onChange(updated);
  };

  const handleResetToDefault = () => {
    if (projectType) {
      onChange(getPhaseTemplates(projectType));
      setExpandedPhase(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="mb-1 text-lg font-medium">Customize Roadmap</h3>
          <p className="text-sm text-muted-foreground">
            Edit, add, or remove phases before creating the project.
          </p>
        </div>
        {projectType && (
          <Button variant="outline" size="sm" onClick={handleResetToDefault}>
            Reset to Default
          </Button>
        )}
      </div>

      {/* Phase List */}
      <div className="space-y-2">
        {phases.map((phase, phaseIndex) => (
          <div key={phase.templateKey} className="overflow-hidden rounded-lg border">
            {/* Phase Header */}
            <div
              className={cn(
                'flex cursor-pointer items-center gap-2 p-3 transition-colors',
                expandedPhase === phaseIndex ? 'bg-muted/50' : 'hover:bg-muted/30'
              )}
              onClick={() => setExpandedPhase(expandedPhase === phaseIndex ? null : phaseIndex)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />

              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-qualia-500/10 text-xs font-medium text-qualia-400">
                {phaseIndex + 1}
              </div>

              {editingPhase === phaseIndex ? (
                <Input
                  value={phase.name}
                  onChange={(e) => handlePhaseNameChange(phaseIndex, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingPhase(null);
                    if (e.key === 'Escape') setEditingPhase(null);
                  }}
                  className="h-7 flex-1"
                  autoFocus
                />
              ) : (
                <span className="flex-1 font-medium">{phase.name}</span>
              )}

              <span className="text-xs text-muted-foreground">{phase.items.length} items</span>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditingPhase(editingPhase === phaseIndex ? null : phaseIndex)}
                >
                  {editingPhase === phaseIndex ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Edit2 className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleMovePhase(phaseIndex, 'up')}
                  disabled={phaseIndex === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleMovePhase(phaseIndex, 'down')}
                  disabled={phaseIndex === phases.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDeletePhase(phaseIndex)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Phase Items (expanded) */}
            {expandedPhase === phaseIndex && (
              <div className="space-y-2 border-t bg-muted/20 p-3">
                {phase.items.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    No items in this phase
                  </p>
                ) : (
                  phase.items.map((item, itemIndex) => (
                    <div
                      key={item.templateKey}
                      className="flex items-center gap-2 rounded bg-background p-2"
                    >
                      <div className="h-4 w-4 rounded border border-muted-foreground/30" />
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          handleItemTitleChange(phaseIndex, itemIndex, e.target.value)
                        }
                        className="h-7 flex-1 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteItem(phaseIndex, itemIndex)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => handleAddItem(phaseIndex)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Item
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Phase */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="New phase name..."
          value={newPhaseName}
          onChange={(e) => setNewPhaseName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddPhase();
          }}
        />
        <Button onClick={handleAddPhase} disabled={!newPhaseName.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Add Phase
        </Button>
      </div>
    </div>
  );
}
