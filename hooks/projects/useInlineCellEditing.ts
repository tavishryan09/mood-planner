import { useState, Dispatch, SetStateAction } from 'react';

interface Project {
  id: number;
  projectNumber?: string;
  projectName: string;
  clientId?: number;
  clientName?: string;
  commonName?: string;
  projectValue?: number;
  currentlyBilled?: number;
  adjustmentDate?: string;
  adjustedValue?: number;
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
  setProjects: Dispatch<SetStateAction<Project[]>>
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
    else if (field === 'currentlyBilled') value = project.currentlyBilled?.toString() || '';
    else if (field === 'adjustmentDate') {
      // Normalize date to YYYY-MM-DD format for the DatePicker
      if (project.adjustmentDate) {
        const dateStr = project.adjustmentDate;
        // If it includes a timestamp, extract just the date part
        value = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      } else {
        value = '';
      }
    }
    setEditValue(value);
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveCellEdit = async (projectId: number, field: string, overrideValue?: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      // Use override value if provided, otherwise use editValue from state
      const currentValue = overrideValue !== undefined ? overrideValue : editValue;
      let value: string | number | null = currentValue;

      // Convert value based on field type
      if (field === 'projectValue' || field === 'currentlyBilled') {
        value = currentValue ? parseFloat(currentValue) : null;
      } else if (field === 'adjustmentDate') {
        value = currentValue || null;
      } else if (!currentValue.trim()) {
        value = null;
      }

      const payload = {
        projectNumber: field === 'projectNumber' ? value : (project.projectNumber ?? null),
        projectName: field === 'projectName' ? value : project.projectName,
        clientId: project.clientId ?? null,
        commonName: field === 'commonName' ? value : (project.commonName ?? null),
        projectValue: field === 'projectValue' ? value : (project.projectValue ?? null),
        currentlyBilled: field === 'currentlyBilled' ? value : (project.currentlyBilled ?? null),
        adjustmentDate: field === 'adjustmentDate' ? value : (project.adjustmentDate ?? null),
        billingRate: project.billingRate ?? null,
        useTeamRates: project.useTeamRates ?? false,
        archived: project.archived ?? false
      };

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update project');

      // Check if adjustment date changed - if so, we need to refetch estimated billable
      const adjustmentDateChanged = field === 'adjustmentDate' && project.adjustmentDate !== value;

      // Update local state immediately to avoid page refresh
      const updatedProjects = projects.map(p => {
        if (p.id === projectId) {
          const updatedProject = {
            ...p,
            [field]: value
          };

          // Recalculate adjusted value if project value or currently billed changed
          if (field === 'projectValue' || field === 'currentlyBilled') {
            const projectValue = field === 'projectValue' ? (value as number | null) : p.projectValue;
            const currentlyBilled = field === 'currentlyBilled' ? (value as number | null) : p.currentlyBilled;

            updatedProject.adjustedValue = projectValue && currentlyBilled
              ? projectValue - currentlyBilled
              : undefined;
          }

          return updatedProject;
        }
        return p;
      });

      setProjects(updatedProjects);

      // If adjustment date changed, refetch estimated billable in the background
      if (adjustmentDateChanged) {
        try {
          const billableResponse = await fetch(`/api/projects/${projectId}/estimated-billable`);
          if (billableResponse.ok) {
            const billableData = await billableResponse.json();
            setProjects((prev: Project[]): Project[] => prev.map((p): Project =>
              p.id === projectId
                ? { ...p, estimatedBillable: billableData.estimatedBillable }
                : p
            ));
          }
        } catch (error) {
          console.error('Error refetching estimated billable:', error);
        }
      }

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
