'use client';

import { useState } from 'react';
import { useServerAction } from '@/lib/hooks/use-server-action';
import { useProjects } from '@/lib/swr';
import { useProfiles } from '@/lib/swr';
import { useAllAssignments, invalidateAllAssignments } from '@/lib/swr';
import {
  assignEmployeeToProject,
  removeAssignment,
  reassignEmployee,
} from '@/app/actions/project-assignments';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { Trash2, UserPlus, Pencil } from 'lucide-react';

interface AssignmentRow {
  id: string;
  employee?: { full_name?: string; email?: string; avatar_url?: string } | null;
  project?: { id: string; name?: string } | null;
  assigned_at: string;
  removed_at?: string | null;
  notes?: string | null;
}

export function EmployeeAssignmentManager() {
  // State
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Reassignment state
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassigningAssignment, setReassigningAssignment] = useState<AssignmentRow | null>(null);
  const [newProjectId, setNewProjectId] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');

  // Data fetching
  const { projects } = useProjects();
  const { profiles } = useProfiles();
  const { data: assignments, isLoading: assignmentsLoading } = useAllAssignments();

  // All profiles are potential assignees
  const employees = profiles || [];

  // Server actions
  const {
    execute: assign,
    isPending: isAssigning,
    error: assignError,
  } = useServerAction(assignEmployeeToProject, {
    onSuccess: () => {
      toast.success('Employee assigned successfully');
      invalidateAllAssignments(true);
      setSelectedProject('');
      setSelectedEmployee('');
      setNotes('');
    },
    onError: (error) => {
      toast.error(error || 'Failed to assign employee');
    },
  });

  const { execute: remove, isPending: isRemoving } = useServerAction(removeAssignment, {
    onSuccess: () => {
      toast.success('Assignment removed');
      invalidateAllAssignments(true);
    },
    onError: (error) => {
      toast.error(error || 'Failed to remove assignment');
    },
  });

  const { execute: reassign, isPending: isReassigning } = useServerAction(reassignEmployee, {
    onSuccess: () => {
      toast.success('Employee reassigned successfully');
      invalidateAllAssignments(true);
      setReassignDialogOpen(false);
      setReassigningAssignment(null);
      setNewProjectId('');
      setReassignNotes('');
    },
    onError: (error) => {
      toast.error(error || 'Failed to reassign employee');
    },
  });

  // Handlers
  const handleAssign = async () => {
    if (!selectedProject || !selectedEmployee) {
      toast.error('Please select both project and employee');
      return;
    }

    const formData = new FormData();
    formData.append('project_id', selectedProject);
    formData.append('employee_id', selectedEmployee);
    if (notes) formData.append('notes', notes);

    await assign(formData);
  };

  const handleRemove = async (assignmentId: string) => {
    if (!confirm('Remove this assignment?')) return;
    await remove(assignmentId);
  };

  const handleReassign = async () => {
    if (!newProjectId || !reassigningAssignment) {
      toast.error('Please select a new project');
      return;
    }

    const formData = new FormData();
    formData.append('assignment_id', reassigningAssignment.id);
    formData.append('new_project_id', newProjectId);
    if (reassignNotes) formData.append('notes', reassignNotes);

    await reassign(formData);
  };

  const openReassignDialog = (assignment: AssignmentRow) => {
    setReassigningAssignment(assignment);
    setNewProjectId('');
    setReassignNotes('');
    setReassignDialogOpen(true);
  };

  // Filter active assignments only
  const activeAssignments = Array.isArray(assignments)
    ? assignments.filter((a) => !a.removed_at)
    : [];

  // Render
  return (
    <div className="space-y-6">
      {/* Assignment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Employee to Project</CardTitle>
          <CardDescription>
            Select a project and employee to create a new assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name || employee.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any context about this assignment..."
              rows={2}
              maxLength={500}
            />
          </div>

          {assignError && <p className="text-sm text-destructive">{assignError}</p>}

          <Button
            onClick={handleAssign}
            disabled={isAssigning || !selectedProject || !selectedEmployee}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {isAssigning ? 'Assigning...' : 'Assign Employee'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
          <CardDescription>
            {activeAssignments.length} active assignment{activeAssignments.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <p className="text-muted-foreground">Loading assignments...</p>
          ) : activeAssignments.length === 0 ? (
            <p className="text-muted-foreground">No active assignments yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={assignment.employee?.avatar_url || ''} />
                          <AvatarFallback>
                            {assignment.employee?.full_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {assignment.employee?.full_name || assignment.employee?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{assignment.project?.name}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(assignment.assigned_at, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {assignment.notes || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReassignDialog(assignment)}
                          disabled={isReassigning}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(assignment.id)}
                          disabled={isRemoving}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reassignment Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Employee</DialogTitle>
            <DialogDescription>
              Move {reassigningAssignment?.employee?.full_name || 'this employee'} from{' '}
              {reassigningAssignment?.project?.name} to a different project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Project</Label>
              <Select value={newProjectId} onValueChange={setNewProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    ?.filter((p) => p.id !== reassigningAssignment?.project?.id)
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={reassignNotes}
                onChange={(e) => setReassignNotes(e.target.value)}
                placeholder="Reason for reassignment..."
                rows={2}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReassignDialogOpen(false)}
              disabled={isReassigning}
            >
              Cancel
            </Button>
            <Button onClick={handleReassign} disabled={isReassigning || !newProjectId}>
              {isReassigning ? 'Reassigning...' : 'Reassign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
