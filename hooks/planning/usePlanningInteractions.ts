import { useState, useEffect, useRef } from 'react';

interface PlanningTask {
  id: number;
  userId: number;
  projectId?: number;
  taskDescription?: string;
  taskType: 'Project Task' | 'Out of Office' | 'Unavailable' | 'PTO' | 'Internal';
  taskDate: string;
  projectCommonName?: string;
  projectName?: string;
  rowIndex: number;
  rowSpan: number;
  internalTaskTypeId?: number;
  internalTaskTypeName?: string;
}

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

interface UserDisplay {
  id: number;
  name: string;
  email: string;
  role: string;
  visible: boolean;
  order: number;
  billingRate: number;
}

interface UsePlanningInteractionsProps {
  tasks: PlanningTask[];
  milestoneTasks: MilestoneTask[];
  users: UserDisplay[];
  selectedTask: PlanningTask | null;
  selectedMilestone: MilestoneTask | null;
  selectedCell: { userId: number; date: Date; rowIndex: number } | null;
  copiedTask: PlanningTask | null;
  showTaskModal: boolean;
  showMilestoneModal: boolean;
  userRowCounts: Record<number, number>;
  milestoneRowCount: number;
  setSelectedTask: (task: PlanningTask | null) => void;
  setSelectedMilestone: (milestone: MilestoneTask | null) => void;
  setSelectedCell: (cell: { userId: number; date: Date; rowIndex: number } | null) => void;
  setUsers: (users: UserDisplay[]) => void;
  handleCopyTask: () => void;
  handleCutTask: () => void;
  handlePasteTask: (userId: number, date: Date, rowIndex: number) => Promise<void>;
  handleDeleteSelectedTask: () => Promise<void>;
  handleDeleteSelectedMilestone: () => Promise<void>;
  handleTaskEdit: (task: PlanningTask) => void;
  handleMilestoneEdit: (milestone: MilestoneTask) => void;
  refetchTasks: () => Promise<void>;
  refetchMilestones: () => Promise<void>;
  saveUserSettings: (users: UserDisplay[]) => void;
}

interface UsePlanningInteractionsReturn {
  // Task drag and drop
  draggedTask: PlanningTask | null;
  dragOverCell: { userId: number; date: Date; rowIndex: number } | null;
  handleTaskDragStart: (e: React.DragEvent, task: PlanningTask) => void;
  handleTaskDragEnd: () => void;
  handleCellDragOver: (e: React.DragEvent, userId: number, date: Date, rowIndex: number) => void;
  handleCellDrop: (e: React.DragEvent, userId: number, date: Date, rowIndex: number) => Promise<void>;

  // Milestone drag and drop
  draggedMilestone: MilestoneTask | null;
  dragOverMilestoneCell: { date: Date; rowIndex: number } | null;
  handleMilestoneDragStart: (e: React.DragEvent, milestone: MilestoneTask) => void;
  handleMilestoneDragEnd: () => void;
  handleMilestoneCellDragOver: (e: React.DragEvent, date: Date, rowIndex: number) => void;
  handleMilestoneCellDrop: (e: React.DragEvent, date: Date, rowIndex: number) => Promise<void>;

  // Task resize
  resizingTask: { task: PlanningTask; edge: 'top' | 'bottom'; startY: number; startRowIndex: number; startRowSpan: number } | null;
  handleResizeStart: (e: React.MouseEvent | React.TouchEvent, task: PlanningTask, edge: 'top' | 'bottom') => void;

  // Click handlers
  handleTaskClick: (e: React.MouseEvent, task: PlanningTask) => void;
  handleMilestoneClick: (e: React.MouseEvent, milestone: MilestoneTask) => void;

  // Helper functions
  getTaskForCell: (userId: number, date: Date, rowIndex: number) => PlanningTask | undefined;
  getMilestoneForCell: (date: Date, rowIndex: number) => MilestoneTask | undefined;
  isCellOccupied: (userId: number, date: Date, rowIndex: number, rowSpan: number, excludeTaskId?: number) => boolean;
  isCellInDragPreview: (userId: number, date: Date, rowIndex: number) => boolean;
}

export function usePlanningInteractions(props: UsePlanningInteractionsProps): UsePlanningInteractionsReturn {
  const {
    tasks,
    milestoneTasks,
    users,
    selectedTask,
    selectedMilestone,
    selectedCell,
    copiedTask,
    showTaskModal,
    showMilestoneModal,
    userRowCounts,
    milestoneRowCount,
    setSelectedTask,
    setSelectedMilestone,
    setSelectedCell,
    setUsers,
    handleCopyTask,
    handleCutTask,
    handlePasteTask,
    handleDeleteSelectedTask,
    handleDeleteSelectedMilestone,
    handleTaskEdit,
    handleMilestoneEdit,
    refetchTasks,
    refetchMilestones,
    saveUserSettings
  } = props;

  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<PlanningTask | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ userId: number; date: Date; rowIndex: number } | null>(null);
  const [draggedMilestone, setDraggedMilestone] = useState<MilestoneTask | null>(null);
  const [dragOverMilestoneCell, setDragOverMilestoneCell] = useState<{ date: Date; rowIndex: number } | null>(null);

  // Resize state
  const [resizingTask, setResizingTask] = useState<{ task: PlanningTask; edge: 'top' | 'bottom'; startY: number; startRowIndex: number; startRowSpan: number } | null>(null);

  // Helper functions
  const getTaskForCell = (userId: number, date: Date, rowIndex: number) => {
    const dateStr = date.toISOString().split('T')[0];
    const foundTask = tasks.find(task => {
      const userMatch = task.userId === userId;
      const rowMatch = task.rowIndex <= rowIndex && rowIndex < task.rowIndex + task.rowSpan;
      const taskDateStr = task.taskDate.split('T')[0];
      const dateMatch = taskDateStr === dateStr;
      return userMatch && rowMatch && dateMatch;
    });
    return foundTask;
  };

  const getMilestoneForCell = (date: Date, rowIndex: number) => {
    const dateStr = date.toISOString().split('T')[0];
    const foundMilestone = milestoneTasks.find(milestone => {
      const taskDateStr = milestone.taskDate.split('T')[0];
      return taskDateStr === dateStr && milestone.rowIndex === rowIndex;
    });
    return foundMilestone;
  };

  const isCellOccupied = (userId: number, date: Date, rowIndex: number, rowSpan: number, excludeTaskId?: number) => {
    const dateStr = date.toISOString().split('T')[0];
    const maxRows = userRowCounts[userId] || 4;

    for (let i = 0; i < rowSpan; i++) {
      const checkRow = rowIndex + i;
      // Check if row exceeds the user's current row count
      if (checkRow >= maxRows) return true;

      const occupyingTask = tasks.find(task => {
        if (excludeTaskId && task.id === excludeTaskId) return false;
        const userMatch = task.userId === userId;
        const taskDateStr = task.taskDate.split('T')[0];
        const dateMatch = taskDateStr === dateStr;
        const rowMatch = task.rowIndex <= checkRow && checkRow < task.rowIndex + task.rowSpan;
        return userMatch && dateMatch && rowMatch;
      });

      if (occupyingTask) return true;
    }
    return false;
  };

  const isCellInDragPreview = (userId: number, date: Date, rowIndex: number) => {
    if (!dragOverCell || !draggedTask) return false;

    const dragDateStr = dragOverCell.date.toISOString().split('T')[0];
    const cellDateStr = date.toISOString().split('T')[0];

    if (userId !== dragOverCell.userId || cellDateStr !== dragDateStr) return false;

    const startRow = dragOverCell.rowIndex;
    const endRow = startRow + draggedTask.rowSpan;

    return rowIndex >= startRow && rowIndex < endRow;
  };

  // Task drag and drop handlers
  const handleTaskDragStart = (e: React.DragEvent, task: PlanningTask) => {
    e.stopPropagation();
    setDraggedTask(task);
  };

  const handleTaskDragEnd = () => {
    setDraggedTask(null);
    setDragOverCell(null);
  };

  const handleCellDragOver = (e: React.DragEvent, userId: number, date: Date, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTask) {
      setDragOverCell({ userId, date, rowIndex });
    }
  };

  const handleCellDrop = async (e: React.DragEvent, userId: number, date: Date, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTask) return;

    const dateStr = date.toISOString().split('T')[0];
    const taskDateStr = draggedTask.taskDate.split('T')[0];

    // Check if dropping on the same cell
    if (draggedTask.userId === userId && taskDateStr === dateStr && draggedTask.rowIndex === rowIndex) {
      setDraggedTask(null);
      return;
    }

    // Check if target cells are occupied
    if (isCellOccupied(userId, date, rowIndex, draggedTask.rowSpan, draggedTask.id)) {
      alert('Cannot move task here - cells are occupied');
      setDraggedTask(null);
      return;
    }

    // Update the task
    try {
      const response = await fetch(`/api/planning-tasks/${draggedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          projectId: draggedTask.projectId,
          taskDescription: draggedTask.taskDescription,
          taskType: draggedTask.taskType,
          taskDate: dateStr,
          rowIndex: rowIndex,
          rowSpan: draggedTask.rowSpan,
          internalTaskTypeId: draggedTask.internalTaskTypeId
        })
      });

      if (response.ok) {
        await refetchTasks();
      } else {
        const error = await response.json();
        alert(`Error moving task: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error moving task:', error);
      alert('An unexpected error occurred. Please try again.');
    }

    setDraggedTask(null);
    setDragOverCell(null);
  };

  // Milestone drag and drop handlers
  const handleMilestoneDragStart = (e: React.DragEvent, milestone: MilestoneTask) => {
    e.stopPropagation();
    setDraggedMilestone(milestone);
  };

  const handleMilestoneDragEnd = () => {
    setDraggedMilestone(null);
    setDragOverMilestoneCell(null);
  };

  const handleMilestoneCellDragOver = (e: React.DragEvent, date: Date, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedMilestone) {
      setDragOverMilestoneCell({ date, rowIndex });
    }
  };

  const handleMilestoneCellDrop = async (e: React.DragEvent, date: Date, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedMilestone) return;

    const dateStr = date.toISOString().split('T')[0];
    const milestoneDateStr = draggedMilestone.taskDate.split('T')[0];

    // Check if dropping on the same cell
    if (milestoneDateStr === dateStr && draggedMilestone.rowIndex === rowIndex) {
      setDraggedMilestone(null);
      return;
    }

    // Check if target cell is occupied
    const existingMilestone = getMilestoneForCell(date, rowIndex);
    if (existingMilestone && existingMilestone.id !== draggedMilestone.id) {
      alert('Cannot move milestone here - cell is occupied');
      setDraggedMilestone(null);
      return;
    }

    // Update the milestone
    try {
      const response = await fetch(`/api/milestone-tasks/${draggedMilestone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: draggedMilestone.projectId,
          taskDescription: draggedMilestone.taskDescription,
          taskType: draggedMilestone.taskType,
          taskDate: dateStr,
          rowIndex: rowIndex
        })
      });

      if (response.ok) {
        await refetchMilestones();
      } else {
        const error = await response.json();
        alert(`Error moving milestone: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error moving milestone:', error);
      alert('An unexpected error occurred. Please try again.');
    }

    setDraggedMilestone(null);
    setDragOverMilestoneCell(null);
  };

  // Click handlers
  const handleTaskClick = (e: React.MouseEvent, task: PlanningTask) => {
    e.stopPropagation();
    setSelectedTask(task);
    setSelectedMilestone(null);
    setSelectedCell(null);
  };

  const handleMilestoneClick = (e: React.MouseEvent, milestone: MilestoneTask) => {
    e.stopPropagation();
    setSelectedMilestone(milestone);
    setSelectedTask(null);
    setSelectedCell(null);
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, task: PlanningTask, edge: 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setResizingTask({
      task,
      edge,
      startY: clientY,
      startRowIndex: task.rowIndex,
      startRowSpan: task.rowSpan
    });
  };

  // Resize effect
  useEffect(() => {
    if (!resizingTask) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      // Prevent scrolling on touch devices while resizing
      if ('touches' in e) {
        e.preventDefault();
      }

      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - resizingTask.startY;
      const rowHeight = 60;
      const rowDelta = Math.round(deltaY / rowHeight);

      let newRowIndex = resizingTask.task.rowIndex;
      let newRowSpan = resizingTask.task.rowSpan;

      const maxRows = userRowCounts[resizingTask.task.userId] || 4;

      if (resizingTask.edge === 'top') {
        const proposedRowIndex = resizingTask.task.rowIndex + rowDelta;
        newRowIndex = Math.max(0, Math.min(maxRows - 1, proposedRowIndex));
        newRowSpan = resizingTask.task.rowSpan - (newRowIndex - resizingTask.task.rowIndex);
      } else {
        newRowSpan = resizingTask.task.rowSpan + rowDelta;
      }

      newRowSpan = Math.max(1, Math.min(maxRows, newRowSpan));
      if (newRowIndex + newRowSpan > maxRows) {
        if (resizingTask.edge === 'top') {
          newRowIndex = maxRows - newRowSpan;
        } else {
          newRowSpan = maxRows - newRowIndex;
        }
      }

      if (newRowIndex !== resizingTask.startRowIndex || newRowSpan !== resizingTask.startRowSpan) {
        setResizingTask(prev => prev ? {
          ...prev,
          startRowIndex: newRowIndex,
          startRowSpan: newRowSpan
        } : null);
      }
    };

    const handleEnd = async () => {
      if (!resizingTask) return;

      const task = resizingTask.task;
      const newRowIndex = resizingTask.startRowIndex;
      const newRowSpan = resizingTask.startRowSpan;

      if (newRowIndex === task.rowIndex && newRowSpan === task.rowSpan) {
        setResizingTask(null);
        return;
      }

      const date = new Date(task.taskDate);
      if (isCellOccupied(task.userId, date, newRowIndex, newRowSpan, task.id)) {
        alert('Cannot resize task - cells are occupied');
        setResizingTask(null);
        return;
      }

      try {
        const response = await fetch(`/api/planning-tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: task.projectId,
            taskDescription: task.taskDescription,
            taskType: task.taskType,
            taskDate: task.taskDate,
            rowIndex: newRowIndex,
            rowSpan: newRowSpan,
            internalTaskTypeId: task.internalTaskTypeId
          })
        });

        if (response.ok) {
          await refetchTasks();
        } else {
          const error = await response.json();
          alert(`Error updating task: ${error.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error updating task:', error);
        alert('An unexpected error occurred. Please try again.');
      }

      setResizingTask(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [resizingTask, tasks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (selectedTask && !showTaskModal) {
          e.preventDefault();
          handleCopyTask();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
        if (selectedTask && !showTaskModal) {
          e.preventDefault();
          handleCutTask();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (copiedTask && selectedCell && !showTaskModal) {
          e.preventDefault();
          handlePasteTask(selectedCell.userId, selectedCell.date, selectedCell.rowIndex);
        }
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedTask && !showTaskModal) {
        e.preventDefault();
        handleDeleteSelectedTask();
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedMilestone && !showMilestoneModal) {
        e.preventDefault();
        handleDeleteSelectedMilestone();
      }

      if (e.key === 'Escape') {
        setSelectedTask(null);
        setSelectedMilestone(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTask, selectedMilestone, copiedTask, selectedCell, showTaskModal, showMilestoneModal]);

  return {
    // Task drag and drop
    draggedTask,
    dragOverCell,
    handleTaskDragStart,
    handleTaskDragEnd,
    handleCellDragOver,
    handleCellDrop,

    // Milestone drag and drop
    draggedMilestone,
    dragOverMilestoneCell,
    handleMilestoneDragStart,
    handleMilestoneDragEnd,
    handleMilestoneCellDragOver,
    handleMilestoneCellDrop,

    // Task resize
    resizingTask,
    handleResizeStart,

    // Click handlers
    handleTaskClick,
    handleMilestoneClick,

    // Helper functions
    getTaskForCell,
    getMilestoneForCell,
    isCellOccupied,
    isCellInDragPreview
  };
}
