import { useState } from 'react';

interface Milestone {
  id: number;
  milestoneName: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'missed';
  createdAt: string;
  updatedAt: string;
}

interface MilestoneFormData {
  milestoneName: string;
  description: string;
  dueDate: string;
  status: Milestone['status'];
}

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
  deadline?: string;
  deadlineTitle?: string;
  deadlineDescription?: string;
  internalDeadline?: string;
  internalDeadlineTitle?: string;
  internalDeadlineDescription?: string;
  estimatedBillable?: number;
  totalHours?: number;
  hoursThisWeek?: number;
  hoursThisMonth?: number;
  hoursThisQuarter?: number;
  createdAt: string;
  updatedAt: string;
}

export function useMilestoneManagement(
  project: Project | null,
  onMilestonesUpdate: () => Promise<void>,
  onProjectUpdate: () => Promise<void>
) {
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneFormData, setMilestoneFormData] = useState<MilestoneFormData>({
    milestoneName: '',
    description: '',
    dueDate: '',
    status: 'pending'
  });
  const [deadlineType, setDeadlineType] = useState<'milestone' | 'deadline' | 'internal-deadline'>('milestone');

  const handleAddMilestone = () => {
    setMilestoneFormData({
      milestoneName: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'pending'
    });
    setDeadlineType('milestone');
    setEditingMilestone(null);
    setShowMilestoneModal(true);
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setMilestoneFormData({
      milestoneName: milestone.milestoneName,
      description: milestone.description || '',
      dueDate: milestone.dueDate.split('T')[0],
      status: milestone.status
    });
    setDeadlineType('milestone');
    setEditingMilestone(milestone);
    setShowMilestoneModal(true);
  };

  const handleSaveMilestone = async () => {
    if (!project) return;

    try {
      if (deadlineType === 'deadline' || deadlineType === 'internal-deadline') {
        // Save as project deadline
        const updateData = deadlineType === 'deadline'
          ? {
              deadline: milestoneFormData.dueDate,
              deadlineTitle: milestoneFormData.milestoneName,
              deadlineDescription: milestoneFormData.description
            }
          : {
              internalDeadline: milestoneFormData.dueDate,
              internalDeadlineTitle: milestoneFormData.milestoneName,
              internalDeadlineDescription: milestoneFormData.description
            };

        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...project,
            ...updateData
          })
        });

        if (!response.ok) throw new Error('Failed to update project deadline');

        // Update project data and refresh milestones for Gantt chart
        await Promise.all([
          onProjectUpdate(),
          onMilestonesUpdate()
        ]);
      } else {
        // Save as milestone
        const milestoneData = milestoneFormData;

        if (editingMilestone) {
          const response = await fetch(`/api/projects/${project.id}/milestones/${editingMilestone.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(milestoneData)
          });

          if (!response.ok) throw new Error('Failed to update milestone');
        } else {
          const response = await fetch(`/api/projects/${project.id}/milestones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(milestoneData)
          });

          if (!response.ok) throw new Error('Failed to create milestone');
        }

        await onMilestonesUpdate();
      }

      setShowMilestoneModal(false);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save. Please try again.');
    }
  };

  const handleDeleteMilestone = async (milestoneId: number) => {
    if (!project) return;
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const response = await fetch(`/api/projects/${project.id}/milestones/${milestoneId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete milestone');

      await onMilestonesUpdate();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      alert('Failed to delete milestone. Please try again.');
    }
  };

  const handleRemoveDeadline = async (type: 'deadline' | 'internal-deadline') => {
    if (!project) return;

    try {
      const updateData = type === 'deadline'
        ? { deadline: null }
        : { internalDeadline: null };

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...project,
          ...updateData
        })
      });

      if (!response.ok) throw new Error('Failed to remove deadline');

      await onProjectUpdate();
    } catch (error) {
      console.error('Error removing deadline:', error);
      alert('Failed to remove deadline. Please try again.');
    }
  };

  return {
    showMilestoneModal,
    setShowMilestoneModal,
    editingMilestone,
    milestoneFormData,
    setMilestoneFormData,
    deadlineType,
    setDeadlineType,
    handleAddMilestone,
    handleEditMilestone,
    handleSaveMilestone,
    handleDeleteMilestone,
    handleRemoveDeadline
  };
}
