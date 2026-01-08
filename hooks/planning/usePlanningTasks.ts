import { useState } from 'react';

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

interface TaskFormData {
  projectId: string;
  taskDescription: string;
  taskType: 'Project Task' | 'Out of Office' | 'Unavailable' | 'PTO' | 'Internal';
  internalTaskTypeId: string;
  repeatEnabled: boolean;
  repeatType: 'daily' | 'weekly' | 'monthly';
  repeatWeekDays: number[];
  repeatMonthDates: number[];
  repeatEndDate: string;
}

interface SelectedCell {
  userId: number;
  date: Date;
  rowIndex: number;
}

interface UsePlanningTasksProps {
  tasks: PlanningTask[];
  refetchTasks: () => Promise<void>;
}

interface UsePlanningTasksReturn {
  // Modal state
  showTaskModal: boolean;
  setShowTaskModal: (show: boolean) => void;
  editingTask: PlanningTask | null;
  selectedCell: SelectedCell | null;
  setSelectedCell: (cell: SelectedCell | null) => void;
  taskFormData: TaskFormData;
  setTaskFormData: (data: TaskFormData) => void;

  // Task operations
  handleTaskEdit: (task: PlanningTask) => void;
  handleTaskSave: () => Promise<void>;
  handleTaskDelete: () => Promise<void>;
  handleCellDoubleClick: (userId: number, date: Date, rowIndex: number) => void;

  // Clipboard operations
  selectedTask: PlanningTask | null;
  setSelectedTask: (task: PlanningTask | null) => void;
  copiedTask: PlanningTask | null;
  isCutTask: boolean;
  handleCopyTask: () => void;
  handleCutTask: () => void;
  handlePasteTask: (userId: number, date: Date, rowIndex: number) => Promise<void>;
  handleDeleteSelectedTask: () => Promise<void>;
}

export function usePlanningTasks({ tasks, refetchTasks }: UsePlanningTasksProps): UsePlanningTasksReturn {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<PlanningTask | null>(null);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [selectedTask, setSelectedTask] = useState<PlanningTask | null>(null);
  const [copiedTask, setCopiedTask] = useState<PlanningTask | null>(null);
  const [isCutTask, setIsCutTask] = useState(false);

  const [taskFormData, setTaskFormData] = useState<TaskFormData>({
    projectId: '',
    taskDescription: '',
    taskType: 'Project Task',
    internalTaskTypeId: '',
    repeatEnabled: false,
    repeatType: 'daily',
    repeatWeekDays: [],
    repeatMonthDates: [],
    repeatEndDate: ''
  });

  const handleTaskEdit = (task: PlanningTask) => {
    setEditingTask(task);
    setTaskFormData({
      projectId: task.projectId?.toString() || '',
      taskDescription: task.taskDescription === task.taskType ? '' : (task.taskDescription || ''),
      taskType: task.taskType,
      internalTaskTypeId: task.internalTaskTypeId?.toString() || '',
      repeatEnabled: false,
      repeatType: 'daily',
      repeatWeekDays: [],
      repeatMonthDates: [],
      repeatEndDate: ''
    });
    setShowTaskModal(true);
  };

  const handleCellDoubleClick = (userId: number, date: Date, rowIndex: number) => {
    setSelectedCell({ userId, date, rowIndex });
    setEditingTask(null);
    setTaskFormData({
      projectId: '',
      taskDescription: '',
      taskType: 'Project Task',
      internalTaskTypeId: '',
      repeatEnabled: false,
      repeatType: 'daily',
      repeatWeekDays: [],
      repeatMonthDates: [],
      repeatEndDate: ''
    });
    setShowTaskModal(true);
  };

  const generateRepeatDates = (startDate: Date, endDate: Date, repeatType: 'daily' | 'weekly' | 'monthly', repeatWeekDays: number[], repeatMonthDates: number[]): string[] => {
    const datesToCreate: string[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const finalDate = new Date(endDate);
    finalDate.setHours(23, 59, 59, 999);

    while (currentDate <= finalDate) {
      let shouldInclude = false;

      if (repeatType === 'daily') {
        shouldInclude = true;
      } else if (repeatType === 'weekly') {
        const dayOfWeek = currentDate.getDay();
        shouldInclude = repeatWeekDays.includes(dayOfWeek);
      } else if (repeatType === 'monthly') {
        const dateOfMonth = currentDate.getDate();
        shouldInclude = repeatMonthDates.includes(dateOfMonth);
      }

      if (shouldInclude) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        datesToCreate.push(`${year}-${month}-${day}`);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return datesToCreate;
  };

  const createRepeatedTasks = async (baseUserId: number, baseRowIndex: number, baseDate: string, datesToCreate: string[]) => {
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const date of datesToCreate) {
      // Check if task already exists
      const existingTask = tasks.find(
        t => t.userId === baseUserId &&
             t.taskDate === date &&
             t.rowIndex === baseRowIndex
      );

      if (existingTask) {
        skippedCount++;
        continue;
      }

      const response = await fetch('/api/planning-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: baseUserId,
          rowIndex: baseRowIndex,
          projectId: taskFormData.projectId ? parseInt(taskFormData.projectId) : null,
          taskDescription: taskFormData.taskDescription,
          taskType: taskFormData.taskType,
          taskDate: date,
          internalTaskTypeId: taskFormData.internalTaskTypeId ? parseInt(taskFormData.internalTaskTypeId) : null
        })
      });

      if (response.ok) {
        successCount++;
      } else if (response.status === 409) {
        skippedCount++;
      } else {
        errorCount++;
      }
    }

    return { successCount, errorCount, skippedCount };
  };

  const handleTaskSave = async () => {
    // Validate required fields
    if (taskFormData.taskType === 'Project Task' && !taskFormData.projectId) {
      alert('Please select a project for Project Tasks');
      return;
    }

    if (taskFormData.taskType === 'Internal' && !taskFormData.internalTaskTypeId) {
      alert('Please select an internal task type');
      return;
    }

    // Validate repeat options
    if (taskFormData.repeatEnabled) {
      if (taskFormData.repeatType === 'weekly' && taskFormData.repeatWeekDays.length === 0) {
        alert('Please select at least one day of the week to repeat on');
        return;
      }
      if (taskFormData.repeatType === 'monthly' && taskFormData.repeatMonthDates.length === 0) {
        alert('Please select at least one date of the month to repeat on');
        return;
      }
    }

    try {
      if (editingTask) {
        // Editing existing task
        if (taskFormData.repeatEnabled) {
          // Create repeated tasks based on edited task
          const normalizedTaskDate = editingTask.taskDate.split('T')[0];
          const [startYear, startMonth, startDay] = normalizedTaskDate.split('-').map(Number);
          const startDate = new Date(startYear, startMonth - 1, startDay);

          let endDate: Date;
          if (taskFormData.repeatEndDate) {
            const [endYear, endMonth, endDay] = taskFormData.repeatEndDate.split('-').map(Number);
            endDate = new Date(endYear, endMonth - 1, endDay);
          } else {
            endDate = new Date(startYear + 1, startMonth - 1, startDay);
          }

          const datesToCreate = generateRepeatDates(
            startDate,
            endDate,
            taskFormData.repeatType,
            taskFormData.repeatWeekDays,
            taskFormData.repeatMonthDates
          );

          const { successCount, errorCount, skippedCount } = await createRepeatedTasks(
            editingTask.userId,
            editingTask.rowIndex,
            editingTask.taskDate,
            datesToCreate
          );

          if (successCount > 0) {
            await refetchTasks();
            setShowTaskModal(false);
            if (errorCount > 0 || skippedCount > 0) {
              const messages = [];
              if (successCount > 0) messages.push(`Created ${successCount} task(s)`);
              if (skippedCount > 0) messages.push(`skipped ${skippedCount} (already exist)`);
              if (errorCount > 0) messages.push(`${errorCount} failed`);
              alert(messages.join(', ') + '.');
            }
          } else if (skippedCount > 0) {
            alert(`All ${skippedCount} tasks were skipped because they already exist at those dates.`);
            setShowTaskModal(false);
          } else {
            alert('Error creating repeated tasks. Please try again.');
          }
        } else {
          // Update single task
          const response = await fetch(`/api/planning-tasks/${editingTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: taskFormData.projectId ? parseInt(taskFormData.projectId) : null,
              taskDescription: taskFormData.taskDescription,
              taskType: taskFormData.taskType,
              taskDate: editingTask.taskDate,
              rowSpan: editingTask.rowSpan,
              internalTaskTypeId: taskFormData.internalTaskTypeId ? parseInt(taskFormData.internalTaskTypeId) : null
            })
          });

          if (response.ok) {
            await refetchTasks();
            setShowTaskModal(false);
          } else {
            const error = await response.json();
            alert(`Error updating task: ${error.error || 'Unknown error'}`);
          }
        }
      } else if (selectedCell) {
        // Creating new task(s)
        let datesToCreate: string[];

        if (taskFormData.repeatEnabled) {
          const startDate = new Date(
            selectedCell.date.getFullYear(),
            selectedCell.date.getMonth(),
            selectedCell.date.getDate()
          );

          let endDate: Date;
          if (taskFormData.repeatEndDate) {
            const [endYear, endMonth, endDay] = taskFormData.repeatEndDate.split('-').map(Number);
            endDate = new Date(endYear, endMonth - 1, endDay);
          } else {
            endDate = new Date(
              startDate.getFullYear() + 1,
              startDate.getMonth(),
              startDate.getDate()
            );
          }

          datesToCreate = generateRepeatDates(
            startDate,
            endDate,
            taskFormData.repeatType,
            taskFormData.repeatWeekDays,
            taskFormData.repeatMonthDates
          );
        } else {
          datesToCreate = [selectedCell.date.toISOString().split('T')[0]];
        }

        const { successCount, errorCount, skippedCount } = await createRepeatedTasks(
          selectedCell.userId,
          selectedCell.rowIndex,
          selectedCell.date.toISOString().split('T')[0],
          datesToCreate
        );

        if (successCount > 0) {
          await refetchTasks();
          setShowTaskModal(false);
          if (errorCount > 0 || skippedCount > 0) {
            const messages = [];
            if (successCount > 0) messages.push(`Created ${successCount} task(s)`);
            if (skippedCount > 0) messages.push(`skipped ${skippedCount} (already exist)`);
            if (errorCount > 0) messages.push(`${errorCount} failed`);
            alert(messages.join(', ') + '.');
          }
        } else if (skippedCount > 0) {
          alert(`All ${skippedCount} tasks were skipped because they already exist at those dates.`);
          setShowTaskModal(false);
        } else {
          alert('Error creating tasks. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving task:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const handleTaskDelete = async () => {
    if (!editingTask) return;

    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const response = await fetch(`/api/planning-tasks/${editingTask.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await refetchTasks();
          setShowTaskModal(false);
        } else {
          alert('Error deleting task. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleCopyTask = () => {
    if (selectedTask) {
      setCopiedTask(selectedTask);
      setIsCutTask(false);
    }
  };

  const handleCutTask = () => {
    if (selectedTask) {
      setCopiedTask(selectedTask);
      setIsCutTask(true);
    }
  };

  const handlePasteTask = async (userId: number, date: Date, rowIndex: number) => {
    if (!copiedTask) return;

    try {
      const response = await fetch('/api/planning-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          rowIndex,
          projectId: copiedTask.projectId,
          taskDescription: copiedTask.taskDescription,
          taskType: copiedTask.taskType,
          taskDate: date.toISOString().split('T')[0],
          rowSpan: copiedTask.rowSpan,
          internalTaskTypeId: copiedTask.internalTaskTypeId
        })
      });

      if (response.ok) {
        if (isCutTask) {
          const deleteResponse = await fetch(`/api/planning-tasks/${copiedTask.id}`, {
            method: 'DELETE'
          });

          if (deleteResponse.ok) {
            setCopiedTask(null);
            setIsCutTask(false);
            setSelectedTask(null);
          }
        }
        await refetchTasks();
      } else if (response.status === 409) {
        alert('A task already exists at this location.');
      } else {
        alert('Error pasting task. Please try again.');
      }
    } catch (error) {
      console.error('Error pasting task:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const handleDeleteSelectedTask = async () => {
    if (!selectedTask) return;

    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const response = await fetch(`/api/planning-tasks/${selectedTask.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await refetchTasks();
          setSelectedTask(null);
        } else {
          alert('Error deleting task. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('An unexpected error occurred. Please try again.');
      }
    }
  };

  return {
    showTaskModal,
    setShowTaskModal,
    editingTask,
    selectedCell,
    setSelectedCell,
    taskFormData,
    setTaskFormData,
    handleTaskEdit,
    handleTaskSave,
    handleTaskDelete,
    handleCellDoubleClick,
    selectedTask,
    setSelectedTask,
    copiedTask,
    isCutTask,
    handleCopyTask,
    handleCutTask,
    handlePasteTask,
    handleDeleteSelectedTask
  };
}
