import { useState } from 'react';

interface MilestoneTask {
  id: number;
  projectId?: number;
  taskDescription?: string;
  taskType: 'Deadline' | 'Internal Deadline' | 'Milestone';
  taskDate: string;
  rowIndex: number;
  projectCommonName?: string;
  projectName?: string;
}

interface MilestoneFormData {
  projectId: string;
  taskDescription: string;
  taskType: 'Deadline' | 'Internal Deadline' | 'Milestone';
}

interface SelectedMilestoneCell {
  date: Date;
  rowIndex: number;
}

interface UseMilestonesProps {
  milestoneTasks: MilestoneTask[];
  refetchMilestones: () => Promise<void>;
}

interface UseMilestonesReturn {
  // Modal state
  showMilestoneModal: boolean;
  setShowMilestoneModal: (show: boolean) => void;
  editingMilestone: MilestoneTask | null;
  selectedMilestoneCell: SelectedMilestoneCell | null;
  setSelectedMilestoneCell: (cell: SelectedMilestoneCell | null) => void;
  milestoneFormData: MilestoneFormData;
  setMilestoneFormData: (data: MilestoneFormData) => void;

  // Milestone operations
  handleMilestoneEdit: (milestone: MilestoneTask) => void;
  handleMilestoneSave: () => Promise<void>;
  handleMilestoneDelete: () => Promise<void>;
  handleMilestoneCellDoubleClick: (date: Date, rowIndex: number) => void;

  // Selection
  selectedMilestone: MilestoneTask | null;
  setSelectedMilestone: (milestone: MilestoneTask | null) => void;
  handleDeleteSelectedMilestone: () => Promise<void>;
}

export function useMilestones({ milestoneTasks, refetchMilestones }: UseMilestonesProps): UseMilestonesReturn {
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneTask | null>(null);
  const [selectedMilestoneCell, setSelectedMilestoneCell] = useState<SelectedMilestoneCell | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneTask | null>(null);

  const [milestoneFormData, setMilestoneFormData] = useState<MilestoneFormData>({
    projectId: '',
    taskDescription: '',
    taskType: 'Deadline'
  });

  const handleMilestoneCellDoubleClick = (date: Date, rowIndex: number) => {
    setSelectedMilestoneCell({ date, rowIndex });
    setEditingMilestone(null);
    setMilestoneFormData({
      projectId: '',
      taskDescription: '',
      taskType: 'Deadline'
    });
    setShowMilestoneModal(true);
  };

  const handleMilestoneEdit = (milestone: MilestoneTask) => {
    setEditingMilestone(milestone);
    setMilestoneFormData({
      projectId: milestone.projectId?.toString() || '',
      taskDescription: milestone.taskDescription || '',
      taskType: milestone.taskType
    });
    setShowMilestoneModal(true);
  };

  const handleMilestoneSave = async () => {
    try {
      if (editingMilestone) {
        // Update existing milestone
        const response = await fetch(`/api/milestone-tasks/${editingMilestone.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: milestoneFormData.projectId ? parseInt(milestoneFormData.projectId) : null,
            taskDescription: milestoneFormData.taskDescription || null,
            taskType: milestoneFormData.taskType,
            taskDate: editingMilestone.taskDate,
            rowIndex: editingMilestone.rowIndex
          })
        });

        if (response.ok) {
          await refetchMilestones();
          setShowMilestoneModal(false);
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to update milestone');
        }
      } else if (selectedMilestoneCell) {
        // Create new milestone
        const taskDate = selectedMilestoneCell.date.toISOString().split('T')[0];
        const response = await fetch('/api/milestone-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: milestoneFormData.projectId ? parseInt(milestoneFormData.projectId) : null,
            taskDescription: milestoneFormData.taskDescription || null,
            taskType: milestoneFormData.taskType,
            taskDate,
            rowIndex: selectedMilestoneCell.rowIndex
          })
        });

        if (response.ok) {
          await refetchMilestones();
          setShowMilestoneModal(false);
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to create milestone');
        }
      }
    } catch (error) {
      console.error('Error saving milestone:', error);
      alert('An error occurred while saving the milestone');
    }
  };

  const handleMilestoneDelete = async () => {
    if (!editingMilestone) return;

    if (window.confirm('Are you sure you want to delete this milestone?')) {
      try {
        const response = await fetch(`/api/milestone-tasks/${editingMilestone.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await refetchMilestones();
          setShowMilestoneModal(false);
        } else {
          alert('Error deleting milestone. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting milestone:', error);
        alert('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleDeleteSelectedMilestone = async () => {
    if (!selectedMilestone) return;

    if (window.confirm('Are you sure you want to delete this milestone?')) {
      try {
        const response = await fetch(`/api/milestone-tasks/${selectedMilestone.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await refetchMilestones();
          setSelectedMilestone(null);
          console.log('Milestone deleted successfully');
        } else {
          const error = await response.json();
          alert(`Error deleting milestone: ${error.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting milestone:', error);
        alert('An unexpected error occurred. Please try again.');
      }
    }
  };

  return {
    showMilestoneModal,
    setShowMilestoneModal,
    editingMilestone,
    selectedMilestoneCell,
    setSelectedMilestoneCell,
    milestoneFormData,
    setMilestoneFormData,
    handleMilestoneEdit,
    handleMilestoneSave,
    handleMilestoneDelete,
    handleMilestoneCellDoubleClick,
    selectedMilestone,
    setSelectedMilestone,
    handleDeleteSelectedMilestone
  };
}
