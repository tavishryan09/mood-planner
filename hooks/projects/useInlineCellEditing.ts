import { useState } from 'react';

interface Project {
  id: number;
  projectNumber?: string;
  projectName: string;
  clientId?: number;
  clientName?: string;
  commonName?: string;
  projectValue?: number;
  billingRate?: number;
  useTeamRates?: boolean;
  archived?: boolean;
  estimatedBillable?: number;
  totalHours?: number;
  hoursThisWeek?: number;
  hoursThisMonth?: number;
  hoursThisQuarter?: number;
  createdAt: string;
  updatedAt: string;
}

interface EditingCell {
  id: number;
  field: string;
}

export function useInlineCellEditing(
  projects: Project[],
  onUpdate: () => Promise<void>
) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const startCellEdit = (project: Project, field: string) => {
    setEditingCell({ id: project.id, field });
    let value = '';
    if (field === 'projectName') value = project.projectName;
    else if (field === 'projectNumber') value = project.projectNumber || '';
    else if (field === 'commonName') value = project.commonName || '';
    else if (field === 'projectValue') value = project.projectValue?.toString() || '';
    setEditValue(value);
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveCellEdit = async (projectId: number, field: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      let value: string | number | null = editValue;

      // Convert value based on field type
      if (field === 'projectValue') {
        value = editValue ? parseFloat(editValue) : null;
      } else if (!editValue.trim()) {
        value = null;
      }

      const payload = {
        projectNumber: field === 'projectNumber' ? value : (project.projectNumber || null),
        projectName: field === 'projectName' ? value : project.projectName,
        clientId: project.clientId || null,
        commonName: field === 'commonName' ? value : (project.commonName || null),
        projectValue: field === 'projectValue' ? value : (project.projectValue || null)
      };

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update project');

      await onUpdate();
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project. Please try again.');
    }
  };

  return {
    editingCell,
    editValue,
    startCellEdit,
    cancelCellEdit,
    saveCellEdit,
    setEditValue
  };
}
