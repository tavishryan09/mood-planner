'use client';

import Sidebar from '@/components/Sidebar';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface UserDisplay extends User {
  visible: boolean;
  order: number;
  billingRate: number;
}

interface Project {
  id: number;
  projectNumber?: string;
  projectName: string;
  commonName?: string;
}

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

interface InternalTaskType {
  id: number;
  name: string;
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

export default function Planning() {
  const { user: currentUser } = useAuth();
  const [quarterDays, setQuarterDays] = useState<Date[]>([]);
  const [currentQuarter, setCurrentQuarter] = useState('');
  const [selectedQuarterOffset, setSelectedQuarterOffset] = useState(0); // 0 = current, 1 = next, -1 = previous
  const [loadedQuarterOffsets, setLoadedQuarterOffsets] = useState<number[]>([0]); // Track which quarters are loaded
  const [currentWeekNumber, setCurrentWeekNumber] = useState(1);
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [tempUsers, setTempUsers] = useState<UserDisplay[]>([]);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [draggedUser, setDraggedUser] = useState<number | null>(null);
  const [draggedTask, setDraggedTask] = useState<PlanningTask | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ userId: number; date: Date; rowIndex: number } | null>(null);
  const [resizingTask, setResizingTask] = useState<{ task: PlanningTask; edge: 'top' | 'bottom'; startY: number; startRowIndex: number; startRowSpan: number } | null>(null);
  const [draggedMilestone, setDraggedMilestone] = useState<MilestoneTask | null>(null);
  const [dragOverMilestoneCell, setDragOverMilestoneCell] = useState<{ date: Date; rowIndex: number } | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneTask | null>(null);
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [milestoneTasks, setMilestoneTasks] = useState<MilestoneTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedMilestoneCell, setSelectedMilestoneCell] = useState<{ date: Date; rowIndex: number } | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneTask | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ userId: number; date: Date; rowIndex: number } | null>(null);
  const [editingTask, setEditingTask] = useState<PlanningTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<PlanningTask | null>(null);
  const [copiedTask, setCopiedTask] = useState<PlanningTask | null>(null);
  const [isCutTask, setIsCutTask] = useState(false); // Track if copied task was cut
  const [isLoading, setIsLoading] = useState(true);
  const [internalTaskTypes, setInternalTaskTypes] = useState<InternalTaskType[]>([]);
  const [showNewInternalTaskTypeModal, setShowNewInternalTaskTypeModal] = useState(false);
  const [newInternalTaskTypeName, setNewInternalTaskTypeName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    projectId: '',
    taskDescription: '',
    taskType: 'Project Task' as 'Project Task' | 'Out of Office' | 'Unavailable' | 'PTO' | 'Internal',
    internalTaskTypeId: '',
    repeatEnabled: false,
    repeatType: 'daily' as 'daily' | 'weekly' | 'monthly',
    repeatWeekDays: [] as number[], // 0-6 for Sunday-Saturday
    repeatMonthDates: [] as number[], // 1-31 for day of month
    repeatEndDate: ''
  });
  const [milestoneFormData, setMilestoneFormData] = useState({
    projectId: '',
    taskDescription: '',
    taskType: 'Deadline' as 'Deadline' | 'Internal Deadline' | 'Milestone'
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const pendingScrollTarget = useRef<Date | null>(null);

  const fetchPlanningPreferences = async () => {
    try {
      const response = await fetch('/api/planning-preferences');
      if (response.ok) {
        const preferences = await response.json();
        setShowInstructions(preferences.showInstructions);
      }
    } catch (error) {
      console.error('Error fetching planning preferences:', error);
    }
  };

  const updateShowInstructions = async (value: boolean) => {
    try {
      setShowInstructions(value);
      const response = await fetch('/api/planning-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showInstructions: value })
      });
      if (!response.ok) {
        console.error('Failed to update show instructions preference');
        // Revert on error
        setShowInstructions(!value);
      }
    } catch (error) {
      console.error('Error updating show instructions preference:', error);
      // Revert on error
      setShowInstructions(!value);
    }
  };

  // Track window size for responsive calendar height
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Set initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Load quarters with tasks on mount
    const loadQuartersWithTasks = async () => {
      if (!currentUser) return;

      try {
        // Check current quarter and next 3 quarters for tasks
        const quartersToCheck = [0, 1, 2, 3];
        const quartersWithTasks: number[] = [];

        for (const offset of quartersToCheck) {
          const quarterInfo = getQuarterInfo(offset);
          const startDate = quarterInfo.quarterStart.toISOString().split('T')[0];
          const endDate = quarterInfo.quarterEnd.toISOString().split('T')[0];

          const response = await fetch(`/api/planning-tasks?startDate=${startDate}&endDate=${endDate}`);
          if (response.ok) {
            const tasksInQuarter = await response.json();
            if (tasksInQuarter.length > 0) {
              quartersWithTasks.push(offset);
            }
          }
        }

        // Load all quarters with tasks
        if (quartersWithTasks.length > 0) {
          // Generate days for all quarters with tasks
          const allDays: Date[] = [];
          const minOffset = Math.min(...quartersWithTasks);
          const maxOffset = Math.max(...quartersWithTasks);

          // Always include current quarter (offset 0) if not already included
          const startOffset = Math.min(0, minOffset);
          const endOffset = maxOffset;

          // Load from start to end to ensure continuity
          for (let offset = startOffset; offset <= endOffset; offset++) {
            const quarterDaysArray = generateQuarterDaysArray(offset);

            // Filter out duplicates
            const existingDates = new Set(allDays.map(d => d.toISOString().split('T')[0]));
            const uniqueDays = quarterDaysArray.filter(day => {
              const dateStr = day.toISOString().split('T')[0];
              return !existingDates.has(dateStr);
            });

            allDays.push(...uniqueDays);
          }

          setQuarterDays(allDays);
          setLoadedQuarterOffsets(Array.from({ length: endOffset - startOffset + 1 }, (_, i) => startOffset + i));

          // Set to current quarter (0) so we start viewing from today
          setSelectedQuarterOffset(0);

          const currentQuarterInfo = getQuarterInfo(0);
          setCurrentQuarter(currentQuarterInfo.quarterName);
        } else {
          // No tasks found, load current quarter
          generateQuarterDays(0);
        }
      } catch (error) {
        console.error('Error loading quarters with tasks:', error);
        // Fallback to current quarter
        generateQuarterDays(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuartersWithTasks();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
      fetchProjects();
      fetchInternalTaskTypes();
      fetchTasks();
      fetchMilestoneTasks();
      checkOutlookStatus();
      fetchPlanningPreferences();
    }
  }, [currentUser]);

  useEffect(() => {
    if (quarterDays.length > 0) {
      fetchTasks();
      fetchMilestoneTasks();

      // Handle pending scroll after quarter change
      if (pendingScrollTarget.current) {
        const monday = getMondayOfWeek(pendingScrollTarget.current);
        const weekNum = getWeekNumber(monday);
        setCurrentWeekNumber(weekNum);

        // Find the Monday in the new quarter days
        setTimeout(() => {
          scrollToMonday(monday);
          pendingScrollTarget.current = null;
        }, 50);
      }
    }
  }, [quarterDays]);

  useEffect(() => {
    console.log('Tasks updated:', tasks);
    if (tasks.length > 0) {
      console.log('Sample task:', tasks[0]);
    }
  }, [tasks]);

  const saveUserSettings = async (userSettings: UserDisplay[]) => {
    if (!currentUser) return;

    try {
      const response = await fetch('/api/planning-user-display-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: userSettings.map(({ id, visible, order }) => ({
            userId: id,
            visible,
            order
          }))
        }),
      });

      if (!response.ok) {
        console.error('Failed to save planning user display settings');
      }
    } catch (error) {
      console.error('Error saving planning user display settings:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/planning-user-display-settings');
      if (response.ok) {
        const usersWithDisplay = await response.json();
        setUsers(usersWithDisplay);
      }
    } catch (error) {
      console.error('Error fetching planning users:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        // Sort projects alphabetically by common name
        const sortedProjects = data.sort((a: Project, b: Project) => {
          const nameA = (a.commonName || a.projectName).toLowerCase();
          const nameB = (b.commonName || b.projectName).toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setProjects(sortedProjects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchInternalTaskTypes = async () => {
    try {
      const response = await fetch('/api/internal-task-types');
      if (response.ok) {
        const data = await response.json();
        setInternalTaskTypes(data);
      }
    } catch (error) {
      console.error('Error fetching internal task types:', error);
    }
  };

  const fetchTasks = async () => {
    if (quarterDays.length === 0) return;

    try {
      const startDate = quarterDays[0].toISOString().split('T')[0];
      const endDate = quarterDays[quarterDays.length - 1].toISOString().split('T')[0];

      const response = await fetch(`/api/planning-tasks?startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched tasks:', data);
        console.log('Tasks state will be updated with', data.length, 'tasks');
        if (data.length > 0) {
          console.log('First task:', data[0]);
        }
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchMilestoneTasks = async () => {
    if (quarterDays.length === 0) return;

    try {
      const startDate = quarterDays[0].toISOString().split('T')[0];
      const endDate = quarterDays[quarterDays.length - 1].toISOString().split('T')[0];

      const response = await fetch(`/api/milestone-tasks?startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const data = await response.json();
        setMilestoneTasks(data);
      }
    } catch (error) {
      console.error('Error fetching milestone tasks:', error);
    }
  };

  const checkOutlookStatus = async () => {
    try {
      const response = await fetch('/api/outlook/status');
      if (response.ok) {
        const data = await response.json();
        setOutlookConnected(data.connected);
      }
    } catch (error) {
      console.error('Error checking Outlook status:', error);
    }
  };

  const handleSyncToOutlook = async () => {
    if (!outlookConnected) {
      alert('Please connect your Outlook calendar in Settings first.');
      return;
    }

    setIsSyncing(true);
    try {
      // Sync all incomplete tasks (no date parameter)
      const response = await fetch('/api/outlook/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully synced ${data.synced} of ${data.total} tasks to Outlook calendar!`);
      } else {
        const error = await response.json();
        alert(`Failed to sync: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error syncing to Outlook:', error);
      alert('Failed to sync to Outlook. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCellClick = (userId: number, date: Date, rowIndex: number, event?: React.MouseEvent) => {
    setSelectedCell({ userId, date, rowIndex });
    setSelectedTask(null); // Deselect any selected task when clicking a cell
    setSelectedMilestone(null); // Deselect any selected milestone when clicking a cell

    // Only open modal if not a paste operation (double-click or single click without copied task)
    // For now, we'll use double-click to create tasks and single-click to select cells for pasting
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

  const handleTaskEdit = (task: PlanningTask) => {
    setEditingTask(task);
    setTaskFormData({
      projectId: task.projectId?.toString() || '',
      // Only show description if it's different from task type (i.e., it's a custom description)
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

  const handleTaskSave = async () => {
    console.log('handleTaskSave called', { editingTask, taskFormData });

    // Validate required fields
    if (taskFormData.taskType === 'Project Task' && !taskFormData.projectId) {
      alert('Please select a project for Project Tasks');
      return;
    }

    console.log('Validation passed, repeatEnabled:', taskFormData.repeatEnabled);

    // Validate repeat options
    if (taskFormData.repeatEnabled) {
      console.log('Validating repeat options, repeatType:', taskFormData.repeatType);
      if (taskFormData.repeatType === 'weekly' && taskFormData.repeatWeekDays.length === 0) {
        alert('Please select at least one day of the week to repeat on');
        return;
      }
      if (taskFormData.repeatType === 'monthly' && taskFormData.repeatMonthDates.length === 0) {
        alert('Please select at least one date of the month to repeat on');
        return;
      }
      console.log('Repeat validation passed');
    }

    try {
      console.log('Entering try block, editingTask:', !!editingTask);
      if (editingTask) {
        // If repeat is enabled, create new repeated tasks based on this one
        if (taskFormData.repeatEnabled) {
          // Generate dates for repeated tasks starting from the edited task's date
          const datesToCreate: string[] = [];

          // Parse dates properly to avoid timezone issues
          // Normalize the date string to just YYYY-MM-DD format (strip time if present)
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

          const currentDate = new Date(startDate);
          currentDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);

          console.log('Date range:', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            currentDate: currentDate.toISOString(),
            repeatEndDate: taskFormData.repeatEndDate,
            editingTaskDate: editingTask.taskDate
          });

          while (currentDate <= endDate) {
            let shouldInclude = false;

            if (taskFormData.repeatType === 'daily') {
              shouldInclude = true;
            } else if (taskFormData.repeatType === 'weekly') {
              const dayOfWeek = currentDate.getDay();
              shouldInclude = taskFormData.repeatWeekDays.includes(dayOfWeek);
            } else if (taskFormData.repeatType === 'monthly') {
              const dateOfMonth = currentDate.getDate();
              shouldInclude = taskFormData.repeatMonthDates.includes(dateOfMonth);
            }

            if (shouldInclude) {
              const year = currentDate.getFullYear();
              const month = String(currentDate.getMonth() + 1).padStart(2, '0');
              const day = String(currentDate.getDate()).padStart(2, '0');
              datesToCreate.push(`${year}-${month}-${day}`);
            }

            currentDate.setDate(currentDate.getDate() + 1);
          }

          // Create all repeated tasks (skip if task already exists at that date/row)
          let successCount = 0;
          let errorCount = 0;
          let skippedCount = 0;

          console.log('Dates to create:', datesToCreate);

          for (const date of datesToCreate) {
            // Check if a task already exists at this date and row index
            const existingTask = tasks.find(
              t => t.userId === editingTask.userId &&
                   t.taskDate === date &&
                   t.rowIndex === editingTask.rowIndex
            );

            if (existingTask) {
              console.log(`Skipping ${date} - already exists in frontend state`);
              skippedCount++;
              continue;
            }

            console.log(`Creating task for date ${date}`);
            const response = await fetch('/api/planning-tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: editingTask.userId,
                rowIndex: editingTask.rowIndex,
                projectId: taskFormData.projectId ? parseInt(taskFormData.projectId) : null,
                taskDescription: taskFormData.taskDescription,
                taskType: taskFormData.taskType,
                taskDate: date,
                internalTaskTypeId: taskFormData.internalTaskTypeId ? parseInt(taskFormData.internalTaskTypeId) : null
              })
            });

            if (response.ok) {
              console.log(`✓ Created task for ${date}`);
              successCount++;
            } else if (response.status === 409) {
              console.log(`Skipping ${date} - duplicate (409)`);
              skippedCount++;
            } else {
              console.error(`✗ Failed for ${date}:`, response.status);
              errorCount++;
            }
          }

          console.log('Final counts:', { successCount, errorCount, skippedCount });

          if (successCount > 0) {
            await fetchTasks();
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
          // Just update the existing task
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
            await fetchTasks();
            setShowTaskModal(false);
          } else {
            const error = await response.json();
            alert(`Error updating task: ${error.error || 'Unknown error'}`);
          }
        }
      } else if (selectedCell) {
        // Generate dates for repeated tasks
        const datesToCreate: string[] = [];

        if (taskFormData.repeatEnabled) {
          // Use local date components from selectedCell.date to avoid timezone issues
          const startDate = new Date(selectedCell.date.getFullYear(), selectedCell.date.getMonth(), selectedCell.date.getDate());

          let endDate: Date;
          if (taskFormData.repeatEndDate) {
            const [endYear, endMonth, endDay] = taskFormData.repeatEndDate.split('-').map(Number);
            endDate = new Date(endYear, endMonth - 1, endDay);
          } else {
            endDate = new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
          }

          const currentDate = new Date(startDate);
          currentDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);

          while (currentDate <= endDate) {
            let shouldInclude = false;

            if (taskFormData.repeatType === 'daily') {
              shouldInclude = true;
            } else if (taskFormData.repeatType === 'weekly') {
              const dayOfWeek = currentDate.getDay();
              shouldInclude = taskFormData.repeatWeekDays.includes(dayOfWeek);
            } else if (taskFormData.repeatType === 'monthly') {
              const dateOfMonth = currentDate.getDate();
              shouldInclude = taskFormData.repeatMonthDates.includes(dateOfMonth);
            }

            if (shouldInclude) {
              const year = currentDate.getFullYear();
              const month = String(currentDate.getMonth() + 1).padStart(2, '0');
              const day = String(currentDate.getDate()).padStart(2, '0');
              datesToCreate.push(`${year}-${month}-${day}`);
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else {
          // Single task
          datesToCreate.push(selectedCell.date.toISOString().split('T')[0]);
        }

        // Create all tasks (skip if task already exists at that date/row)
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const date of datesToCreate) {
          // Check if a task already exists at this date and row index
          const existingTask = tasks.find(
            t => t.userId === selectedCell.userId &&
                 t.taskDate === date &&
                 t.rowIndex === selectedCell.rowIndex
          );

          if (existingTask) {
            skippedCount++;
            continue;
          }

          const response = await fetch('/api/planning-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: selectedCell.userId,
              rowIndex: selectedCell.rowIndex,
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
            // Duplicate - already exists
            skippedCount++;
          } else {
            errorCount++;
          }
        }

        if (successCount > 0) {
          await fetchTasks();
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
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
          setTasks(tasks.filter(t => t.id !== editingTask.id));
          setShowTaskModal(false);
        }
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const getTaskForCell = (userId: number, date: Date, rowIndex: number) => {
    const dateStr = date.toISOString().split('T')[0];
    const foundTask = tasks.find(task => {
      const userMatch = task.userId === userId;
      // Check if this cell is within the task's row span
      const rowMatch = task.rowIndex <= rowIndex && rowIndex < task.rowIndex + task.rowSpan;
      // Normalize taskDate to just the date part for comparison
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
          const updatedMilestone = await response.json();
          setMilestoneTasks(milestoneTasks.map(m => m.id === updatedMilestone.id ? updatedMilestone : m));
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
          const newMilestone = await response.json();
          setMilestoneTasks([...milestoneTasks, newMilestone]);
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
          setMilestoneTasks(milestoneTasks.filter(m => m.id !== editingMilestone.id));
          setShowMilestoneModal(false);
        }
      } catch (error) {
        console.error('Error deleting milestone:', error);
      }
    }
  };

  const isCellOccupied = (userId: number, date: Date, rowIndex: number, rowSpan: number, excludeTaskId?: number) => {
    const dateStr = date.toISOString().split('T')[0];
    // Check if any of the rows that would be spanned are occupied
    for (let i = 0; i < rowSpan; i++) {
      const checkRow = rowIndex + i;
      if (checkRow >= 4) return true; // Would exceed available rows

      const occupyingTask = tasks.find(task => {
        if (excludeTaskId && task.id === excludeTaskId) return false; // Ignore the task being moved
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

    // Check if this cell matches the user and date of the drag target
    const dragDateStr = dragOverCell.date.toISOString().split('T')[0];
    const cellDateStr = date.toISOString().split('T')[0];

    if (userId !== dragOverCell.userId || cellDateStr !== dragDateStr) return false;

    // Check if this cell is within the span range
    const startRow = dragOverCell.rowIndex;
    const endRow = startRow + draggedTask.rowSpan;

    return rowIndex >= startRow && rowIndex < endRow;
  };

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

    // Update the task - including the new userId if moved to a different team member
    try {
      const response = await fetch(`/api/planning-tasks/${draggedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId, // Allow changing the user assignment
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
        await fetchTasks();
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
        await fetchMilestoneTasks();
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

  const handleMilestoneClick = (e: React.MouseEvent, milestone: MilestoneTask) => {
    e.stopPropagation();
    setSelectedMilestone(milestone);
    setSelectedTask(null); // Deselect any selected task when clicking a milestone
    setSelectedCell(null); // Deselect any selected cell when clicking a milestone
  };

  const handleResizeStart = (e: React.MouseEvent, task: PlanningTask, edge: 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    setResizingTask({
      task,
      edge,
      startY: e.clientY,
      startRowIndex: task.rowIndex,
      startRowSpan: task.rowSpan
    });
  };

  useEffect(() => {
    if (!resizingTask) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizingTask.startY;
      const rowHeight = 60; // Height of each row in pixels
      const rowDelta = Math.round(deltaY / rowHeight);

      let newRowIndex = resizingTask.task.rowIndex;
      let newRowSpan = resizingTask.task.rowSpan;

      if (resizingTask.edge === 'top') {
        // Dragging top edge - adjust rowIndex and rowSpan
        const proposedRowIndex = resizingTask.task.rowIndex + rowDelta;
        newRowIndex = Math.max(0, Math.min(3, proposedRowIndex));
        newRowSpan = resizingTask.task.rowSpan - (newRowIndex - resizingTask.task.rowIndex);
      } else {
        // Dragging bottom edge - adjust rowSpan only
        newRowSpan = resizingTask.task.rowSpan + rowDelta;
      }

      // Ensure rowSpan is within valid range
      newRowSpan = Math.max(1, Math.min(4, newRowSpan));
      // Ensure task doesn't exceed available rows
      if (newRowIndex + newRowSpan > 4) {
        if (resizingTask.edge === 'top') {
          newRowIndex = 4 - newRowSpan;
        } else {
          newRowSpan = 4 - newRowIndex;
        }
      }

      // Update visual feedback - only update if values changed
      if (newRowIndex !== resizingTask.startRowIndex || newRowSpan !== resizingTask.startRowSpan) {
        setResizingTask(prev => prev ? {
          ...prev,
          startRowIndex: newRowIndex,
          startRowSpan: newRowSpan
        } : null);
      }
    };

    const handleMouseUp = async () => {
      if (!resizingTask) return;

      const task = resizingTask.task;
      const newRowIndex = resizingTask.startRowIndex;
      const newRowSpan = resizingTask.startRowSpan;

      // Check if anything changed
      if (newRowIndex === task.rowIndex && newRowSpan === task.rowSpan) {
        setResizingTask(null);
        return;
      }

      // Check if new position would overlap with other tasks
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
          await fetchTasks();
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

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingTask, tasks]);

  // Keyboard shortcuts for copy/paste/delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+C (Mac) or Ctrl+C (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (selectedTask && !showTaskModal) {
          e.preventDefault();
          setCopiedTask(selectedTask);
          setIsCutTask(false); // Copy, not cut
          console.log('Task copied:', selectedTask);
        }
      }

      // Check for Cmd+X (Mac) or Ctrl+X (Windows/Linux) - Cut
      if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
        if (selectedTask && !showTaskModal) {
          e.preventDefault();
          setCopiedTask(selectedTask);
          setIsCutTask(true); // Mark as cut
          console.log('Task cut:', selectedTask);
        }
      }

      // Check for Cmd+V (Mac) or Ctrl+V (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (copiedTask && selectedCell && !showTaskModal) {
          e.preventDefault();
          handlePasteTask(selectedCell);
        }
      }

      // Backspace or Delete key to delete selected task
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedTask && !showTaskModal) {
        e.preventDefault();
        handleDeleteSelectedTask();
      }

      // Backspace or Delete key to delete selected milestone
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedMilestone && !showMilestoneModal) {
        e.preventDefault();
        handleDeleteSelectedMilestone();
      }

      // Escape key to deselect
      if (e.key === 'Escape') {
        setSelectedTask(null);
        setSelectedMilestone(null);
        setCopiedTask(null);
        setIsCutTask(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTask, selectedMilestone, copiedTask, selectedCell, showTaskModal, showMilestoneModal]);

  const handleTaskClick = (e: React.MouseEvent, task: PlanningTask) => {
    e.stopPropagation();
    setSelectedTask(task);
    setSelectedMilestone(null); // Deselect any selected milestone when clicking a task
    setSelectedCell(null); // Deselect any selected cell when clicking a task
  };

  const handlePasteTask = async (targetCell: { userId: number; date: Date; rowIndex: number }) => {
    if (!copiedTask) return;

    const dateStr = targetCell.date.toISOString().split('T')[0];

    // Check if target cells are occupied
    if (isCellOccupied(targetCell.userId, targetCell.date, targetCell.rowIndex, copiedTask.rowSpan)) {
      alert('Cannot paste task here - cells are occupied');
      return;
    }

    try {
      const response = await fetch('/api/planning-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetCell.userId,
          rowIndex: targetCell.rowIndex,
          projectId: copiedTask.projectId,
          taskDescription: copiedTask.taskDescription,
          taskType: copiedTask.taskType,
          taskDate: dateStr,
          rowSpan: copiedTask.rowSpan,
          internalTaskTypeId: copiedTask.internalTaskTypeId
        })
      });

      if (response.ok) {
        // If this was a cut operation, delete the original task
        if (isCutTask && copiedTask.id) {
          try {
            const deleteResponse = await fetch(`/api/planning-tasks/${copiedTask.id}`, {
              method: 'DELETE',
            });

            if (deleteResponse.ok) {
              console.log('Original task deleted after cut-paste');
              // Clear the cut state after successful move
              setCopiedTask(null);
              setIsCutTask(false);
              setSelectedTask(null);
            } else {
              console.error('Failed to delete original task after cut');
            }
          } catch (deleteError) {
            console.error('Error deleting original task:', deleteError);
          }
        }

        await fetchTasks();
        console.log(isCutTask ? 'Task moved successfully' : 'Task pasted successfully');
      } else if (response.status === 409) {
        alert('A task already exists at this location');
      } else {
        const error = await response.json();
        alert(`Error pasting task: ${error.error || 'Unknown error'}`);
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
          setTasks(tasks.filter(t => t.id !== selectedTask.id));
          setSelectedTask(null);
          console.log('Task deleted successfully');
        } else {
          const error = await response.json();
          alert(`Error deleting task: ${error.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting task:', error);
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
          setMilestoneTasks(milestoneTasks.filter(m => m.id !== selectedMilestone.id));
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

  const openUserSettings = () => {
    setTempUsers([...users]);
    setShowUserSettings(true);
  };

  const saveSettings = () => {
    setUsers(tempUsers);
    saveUserSettings(tempUsers);
    setShowUserSettings(false);
  };

  const cancelSettings = () => {
    setTempUsers([]);
    setShowUserSettings(false);
  };

  const toggleUserVisibility = (userId: number) => {
    setTempUsers(tempUsers.map(user =>
      user.id === userId ? { ...user, visible: !user.visible } : user
    ));
  };

  const handleDragStart = (userId: number) => {
    setDraggedUser(userId);
  };

  const handleDragOver = (e: React.DragEvent, targetUserId: number) => {
    e.preventDefault();
    if (draggedUser === null || draggedUser === targetUserId) return;

    const draggedIndex = tempUsers.findIndex(u => u.id === draggedUser);
    const targetIndex = tempUsers.findIndex(u => u.id === targetUserId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newUsers = [...tempUsers];
    const [removed] = newUsers.splice(draggedIndex, 1);
    newUsers.splice(targetIndex, 0, removed);

    // Update order values
    const reorderedUsers = newUsers.map((user, index) => ({
      ...user,
      order: index
    }));

    setTempUsers(reorderedUsers);
  };

  const handleDragEnd = () => {
    setDraggedUser(null);
  };

  const getVisibleUsers = () => {
    return users
      .filter(user => user.visible)
      .sort((a, b) => a.order - b.order);
  };

  useEffect(() => {
    // Scroll to current week's Monday after data is loaded (only on initial load)
    if (quarterDays.length > 0 && scrollContainerRef.current && !pendingScrollTarget.current) {
      // Only scroll to current week if we're viewing the current quarter
      if (selectedQuarterOffset === 0) {
        scrollToCurrentWeek();
      }
    }
  }, [quarterDays]);

  useEffect(() => {
    // Add scroll listener to update week number when manually scrolling
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || quarterDays.length === 0) return;

    const handleScroll = () => {
      // Skip if this is a programmatic scroll
      if (isProgrammaticScroll.current) return;

      const scrollLeft = scrollContainer.scrollLeft;
      const dayIndex = Math.round(scrollLeft / 140);

      if (dayIndex >= 0 && dayIndex < quarterDays.length) {
        const visibleDay = quarterDays[dayIndex];
        const weekNum = getWeekNumber(visibleDay);

        if (weekNum !== currentWeekNumber) {
          setCurrentWeekNumber(weekNum);
        }

        // Update quarter title based on visible date
        const month = visibleDay.getMonth();
        const year = visibleDay.getFullYear();
        let quarterName = '';

        if (month >= 0 && month <= 2) {
          quarterName = `Q1 ${year}`;
        } else if (month >= 3 && month <= 5) {
          quarterName = `Q2 ${year}`;
        } else if (month >= 6 && month <= 8) {
          quarterName = `Q3 ${year}`;
        } else {
          quarterName = `Q4 ${year}`;
        }

        if (quarterName !== currentQuarter) {
          setCurrentQuarter(quarterName);
        }
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [quarterDays, currentWeekNumber, currentQuarter]);

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getMondayOfWeek = (date: Date) => {
    const currentDay = date.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const scrollToCurrentWeek = () => {
    const today = new Date();
    const monday = getMondayOfWeek(today);
    const weekNum = getWeekNumber(monday);
    setCurrentWeekNumber(weekNum);
    scrollToMonday(monday);
  };

  const scrollToMonday = (monday: Date) => {
    if (!scrollContainerRef.current || quarterDays.length === 0) return;

    const mondayIndex = quarterDays.findIndex(day => {
      const d = new Date(day);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === monday.getTime();
    });

    if (mondayIndex >= 0) {
      // Set flag to indicate programmatic scroll
      isProgrammaticScroll.current = true;

      const scrollPosition = mondayIndex * 140;
      scrollContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });

      // Clear flag after scroll animation completes (smooth scroll takes ~300-500ms)
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 600);
    }
  };

  const getQuarterInfo = (offset: number = 0) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Determine current quarter
    let currentQuarterIndex: number;
    if (currentMonth >= 0 && currentMonth <= 2) {
      currentQuarterIndex = 0; // Q1
    } else if (currentMonth >= 3 && currentMonth <= 5) {
      currentQuarterIndex = 1; // Q2
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      currentQuarterIndex = 2; // Q3
    } else {
      currentQuarterIndex = 3; // Q4
    }

    // Apply offset
    const targetQuarterIndex = currentQuarterIndex + offset;
    const yearOffset = Math.floor(targetQuarterIndex / 4);
    const quarterInYear = ((targetQuarterIndex % 4) + 4) % 4;
    const targetYear = currentYear + yearOffset;

    let quarterStart: Date;
    let quarterEnd: Date;
    let quarterName: string;

    if (quarterInYear === 0) {
      // Q1: Jan-Mar
      quarterStart = new Date(targetYear, 0, 1);
      quarterEnd = new Date(targetYear, 2, 31);
      quarterName = `Q1 ${targetYear}`;
    } else if (quarterInYear === 1) {
      // Q2: Apr-Jun
      quarterStart = new Date(targetYear, 3, 1);
      quarterEnd = new Date(targetYear, 5, 30);
      quarterName = `Q2 ${targetYear}`;
    } else if (quarterInYear === 2) {
      // Q3: Jul-Sep
      quarterStart = new Date(targetYear, 6, 1);
      quarterEnd = new Date(targetYear, 8, 30);
      quarterName = `Q3 ${targetYear}`;
    } else {
      // Q4: Oct-Dec
      quarterStart = new Date(targetYear, 9, 1);
      quarterEnd = new Date(targetYear, 11, 31);
      quarterName = `Q4 ${targetYear}`;
    }

    return { quarterStart, quarterEnd, quarterName };
  };

  const generateQuarterDaysArray = (offset: number = 0): Date[] => {
    const { quarterStart, quarterEnd } = getQuarterInfo(offset);

    const days: Date[] = [];

    // Prepend days to start the week on Monday if quarter doesn't start on Monday
    const firstDayOfWeek = quarterStart.getDay(); // 0 = Sunday, 6 = Saturday
    const daysToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Days to go back to reach Monday

    let currentDate = new Date(quarterStart);
    currentDate.setDate(quarterStart.getDate() - daysToMonday);

    // Generate all days from the Monday before/at quarter start through quarter end
    while (currentDate <= quarterEnd) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Extend to complete the final week (through Sunday)
    const lastDay = days[days.length - 1];
    const lastDayOfWeek = lastDay.getDay(); // 0 = Sunday, 6 = Saturday

    // If the last day is not a Sunday, add days until we reach Sunday
    if (lastDayOfWeek !== 0) {
      const daysToAdd = 7 - lastDayOfWeek;
      for (let i = 1; i <= daysToAdd; i++) {
        const nextDay = new Date(lastDay);
        nextDay.setDate(lastDay.getDate() + i);
        days.push(nextDay);
      }
    }

    return days;
  };

  const generateQuarterDays = (offset: number = 0) => {
    const { quarterName } = getQuarterInfo(offset);
    setCurrentQuarter(quarterName);

    const days = generateQuarterDaysArray(offset);
    setQuarterDays(days);
    setLoadedQuarterOffsets([offset]);
  };

  const navigateToWeek = (direction: 'prev' | 'next') => {
    const currentlyDisplayedMonday = quarterDays.find(day => {
      const dayOfWeek = day.getDay();
      return dayOfWeek === 1 && getWeekNumber(day) === currentWeekNumber;
    });

    if (!currentlyDisplayedMonday) return;

    const targetMonday = new Date(currentlyDisplayedMonday);
    const daysToAdd = direction === 'prev' ? -7 : 7;
    targetMonday.setDate(currentlyDisplayedMonday.getDate() + daysToAdd);

    const weekNum = getWeekNumber(targetMonday);
    setCurrentWeekNumber(weekNum);
    scrollToMonday(targetMonday);
  };

  const navigateToNextWeek = () => navigateToWeek('next');
  const navigateToPrevWeek = () => navigateToWeek('prev');

  const appendQuarter = async (newOffset: number) => {
    // Check if this is navigating to a future quarter (relative to current quarter)
    if (newOffset > 0) {
      const confirmed = window.confirm(`Do you want to view the ${newOffset === 1 ? 'next' : 'future'} quarter?`);
      if (!confirmed) return;
    }

    // Check if user has tasks in target quarter
    const quarterInfo = getQuarterInfo(newOffset);
    const startDate = quarterInfo.quarterStart.toISOString().split('T')[0];
    const endDate = quarterInfo.quarterEnd.toISOString().split('T')[0];

    try {
      const response = await fetch(`/api/planning-tasks?startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const tasksInQuarter = await response.json();

        // Save preference only if user has tasks in the quarter
        if (tasksInQuarter.length > 0 && currentUser) {
          localStorage.setItem(`planning_quarter_offset_${currentUser.id}`, newOffset.toString());
        }
      }
    } catch (error) {
      console.error('Error checking quarter tasks:', error);
    }

    // Generate days for the new quarter
    const newQuarterDays = generateQuarterDaysArray(newOffset);

    // Filter out dates that already exist in quarterDays to avoid duplicates
    const existingDates = new Set(quarterDays.map(d => d.toISOString().split('T')[0]));
    const uniqueNewDays = newQuarterDays.filter(day => {
      const dateStr = day.toISOString().split('T')[0];
      return !existingDates.has(dateStr);
    });

    // Append to existing days
    setQuarterDays(prev => [...prev, ...uniqueNewDays]);
    setLoadedQuarterOffsets(prev => [...prev, newOffset]);
    setSelectedQuarterOffset(newOffset);
    setCurrentQuarter(quarterInfo.quarterName);

    // Continue to next week naturally
    setTimeout(() => navigateToNextWeek(), 100);
  };

  const prependQuarter = async (newOffset: number) => {
    // Confirm with user before loading previous quarter
    const confirmed = window.confirm(`Do you want to view the ${newOffset === -1 ? 'previous' : 'earlier'} quarter?`);
    if (!confirmed) return;

    // Generate days for the previous quarter
    const quarterInfo = getQuarterInfo(newOffset);
    const newQuarterDays = generateQuarterDaysArray(newOffset);

    // Filter out dates that already exist in quarterDays to avoid duplicates
    const existingDates = new Set(quarterDays.map(d => d.toISOString().split('T')[0]));
    const uniqueNewDays = newQuarterDays.filter(day => {
      const dateStr = day.toISOString().split('T')[0];
      return !existingDates.has(dateStr);
    });

    // Save current scroll position
    const scrollContainer = scrollContainerRef.current;
    const currentScrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;

    // Prepend to existing days
    setQuarterDays(prev => [...uniqueNewDays, ...prev]);
    setLoadedQuarterOffsets(prev => [...prev, newOffset]);
    setSelectedQuarterOffset(newOffset);

    // Adjust scroll position to maintain view (after DOM updates)
    // Each day column is 140px wide
    setTimeout(() => {
      if (scrollContainer) {
        const offsetPixels = uniqueNewDays.length * 140;
        scrollContainer.scrollLeft = currentScrollLeft + offsetPixels;
      }
      // Then continue to previous week naturally
      setTimeout(() => navigateToPrevWeek(), 50);
    }, 50);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    // Last weeks of each quarter (approximately)
    const quarterEndWeeks = [13, 26, 39, 52];

    // Check if navigating forward from a quarter-end week
    if (direction === 'next' && quarterEndWeeks.includes(currentWeekNumber)) {
      const newOffset = selectedQuarterOffset + 1;

      // Check if this quarter is already loaded
      if (!loadedQuarterOffsets.includes(newOffset)) {
        // Append the next quarter
        appendQuarter(newOffset);
      } else {
        // Just navigate to the next week normally
        navigateToNextWeek();
      }
      return;
    }

    // Check if navigating backward from a quarter-start week
    if (direction === 'prev' && (currentWeekNumber === 1 || quarterEndWeeks.map(w => w + 1).includes(currentWeekNumber))) {
      const newOffset = selectedQuarterOffset - 1;

      // Check if this quarter is already loaded
      if (!loadedQuarterOffsets.includes(newOffset)) {
        // Prepend the previous quarter
        prependQuarter(newOffset);
      } else {
        // Just navigate to the previous week normally
        navigateToPrevWeek();
      }
      return;
    }

    // Normal week navigation within the quarter
    navigateToWeek(direction);
  };

  const formatDate = (date: Date) => {
    return date.getDate().toString();
  };

  const formatMonthDay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  // Group days by month for better visual separation
  const groupedByMonth = quarterDays.reduce((acc, day) => {
    const monthKey = `${day.getFullYear()}-${day.getMonth()}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(day);
    return acc;
  }, {} as Record<string, Date[]>);

  // Calculate future tasks count (tasks from today onwards)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureTasks = tasks.filter(task => {
    const taskDate = new Date(task.taskDate.split('T')[0]);
    return taskDate >= today;
  });

  return (
    <Sidebar title="Planning" hideNavbar={true}>
      <div
        className="p-4"
        style={isMobile ? { paddingBottom: '0px' } : undefined}
      >
        <div className="card bg-base-100">
          <div className={`card-body ${isMobile ? 'p-0' : 'p-4'} lg:p-8`}>
            <div className="flex justify-between items-center w-full mb-4">
              <div className="flex items-center gap-2">
                <h2 className="card-title">{currentQuarter} Calendar</h2>
                <span className="text-xs opacity-60 hidden lg:inline">({futureTasks.length} tasks)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={openUserSettings}
                  aria-label="Team member visibility settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  Settings
                </button>
                <div className="divider divider-horizontal mx-0"></div>
                {outlookConnected && (
                  <>
                    <button
                      className="btn btn-sm btn-ghost gap-2"
                      onClick={handleSyncToOutlook}
                      disabled={isSyncing}
                      aria-label="Sync to Outlook"
                    >
                      {isSyncing ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                      )}
                      Sync to Outlook
                    </button>
                    <div className="divider divider-horizontal mx-0"></div>
                  </>
                )}
                <button
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={() => navigateWeek('prev')}
                  aria-label="Previous week"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <span className="font-semibold text-sm">Week {currentWeekNumber}</span>
                <button
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={() => navigateWeek('next')}
                  aria-label="Next week"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="border border-base-300 rounded-lg mt-4 p-4">
                <div className="skeleton h-8 w-full mb-4"></div>
                <div className="space-y-2">
                  <div className="skeleton h-12 w-full"></div>
                  <div className="skeleton h-12 w-full"></div>
                  <div className="skeleton h-12 w-full"></div>
                  <div className="skeleton h-12 w-full"></div>
                  <div className="skeleton h-12 w-full"></div>
                  <div className="skeleton h-12 w-full"></div>
                </div>
              </div>
            ) : (
              <div
                className="mt-4 overflow-auto border border-base-300 rounded-lg"
                style={{
                  maxHeight: isMobile
                    ? 'calc(100dvh - 170px)'
                    : showInstructions
                    ? 'calc(100vh - 200px)'
                    : 'calc(100vh - 150px)'
                }}
                ref={scrollContainerRef}
              >
                <table className="table table-zebra">
                  <thead className="bg-base-100 sticky top-0 z-30">
                    <tr>
                      <th className="bg-base-100 sticky left-0 z-50 text-center" style={{ minWidth: '120px', width: '120px' }}>
                        Date
                      </th>
                      {quarterDays.map((day, index) => {
                        const isNewMonth = index === 0 || day.getDate() === 1;
                        return (
                          <th
                            key={day.toISOString()}
                            className={`text-center px-2 ${
                              isToday(day)
                                ? 'bg-primary text-primary-content'
                                : isWeekend(day)
                                ? 'bg-base-300'
                                : 'bg-base-100'
                            } ${isNewMonth ? 'border-l-2 border-base-300' : ''}`}
                            style={{ minWidth: '140px', width: '140px' }}
                          >
                            <div className="flex flex-col items-center">
                              <div className="text-xs font-normal opacity-70">
                                {getDayName(day)}
                              </div>
                              <div className="text-sm font-bold">
                                {formatMonthDay(day)}
                              </div>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                  {/* Deadlines/Milestones Section */}
                  {Array.from({ length: 2 }).map((_, rowIndex) => (
                    <tr key={`milestone-${rowIndex}`} className="border-b-2 border-base-300 bg-base-200">
                      {rowIndex === 0 ? (
                        <th
                          rowSpan={2}
                          className="bg-base-200 font-semibold text-sm text-center align-middle sticky left-0 z-20"
                          style={{ minWidth: '120px', width: '120px' }}
                        >
                          Deadlines/
                          <br />
                          Milestones
                        </th>
                      ) : null}
                      {quarterDays.map((day, colIndex) => {
                        const isNewMonth = colIndex === 0 || day.getDate() === 1;
                        return (
                          <td
                            key={`milestone-${rowIndex}-${day.toISOString()}`}
                            onClick={() => {
                              const milestone = getMilestoneForCell(day, rowIndex);
                              if (!milestone) {
                                setSelectedMilestoneCell({ date: day, rowIndex });
                                setSelectedTask(null); // Deselect any selected task when clicking empty milestone cell
                                setSelectedMilestone(null); // Deselect any selected milestone when clicking empty milestone cell
                                setSelectedCell(null); // Deselect any selected cell when clicking empty milestone cell
                              }
                            }}
                            onDoubleClick={() => {
                              const milestone = getMilestoneForCell(day, rowIndex);
                              if (!milestone) {
                                handleMilestoneCellDoubleClick(day, rowIndex);
                              }
                            }}
                            onDragOver={(e) => handleMilestoneCellDragOver(e, day, rowIndex)}
                            onDrop={(e) => handleMilestoneCellDrop(e, day, rowIndex)}
                            className={`hover:bg-base-200 transition-colors cursor-pointer relative ${
                              isToday(day)
                                ? 'bg-primary/10'
                                : isWeekend(day)
                                ? 'bg-base-300/30'
                                : ''
                            } ${isNewMonth ? 'border-l-2 border-base-300' : ''} ${
                              draggedMilestone && !getMilestoneForCell(day, rowIndex) ? 'bg-primary/10' : ''
                            } ${
                              dragOverMilestoneCell?.date.toISOString().split('T')[0] === day.toISOString().split('T')[0] &&
                              dragOverMilestoneCell?.rowIndex === rowIndex
                                ? !getMilestoneForCell(day, rowIndex) || getMilestoneForCell(day, rowIndex)?.id === draggedMilestone?.id
                                  ? 'bg-success/30 border-2 border-success'
                                  : 'bg-error/30 border-2 border-error'
                                : ''
                            }`}
                            style={{
                              minWidth: '140px',
                              maxWidth: '140px',
                              width: '140px',
                              minHeight: '60px',
                              height: '60px'
                            }}
                          >
                            {(() => {
                              const milestone = getMilestoneForCell(day, rowIndex);
                              if (!milestone) return <div className="h-full w-full"></div>;

                              const bgColor =
                                milestone.taskType === 'Deadline'
                                  ? 'bg-error'
                                  : milestone.taskType === 'Internal Deadline'
                                  ? 'bg-warning'
                                  : 'bg-neutral';

                              const textColor =
                                milestone.taskType === 'Deadline'
                                  ? 'text-error-content'
                                  : milestone.taskType === 'Internal Deadline'
                                  ? 'text-warning-content'
                                  : 'text-neutral-content';

                              return (
                                <div
                                  draggable
                                  onDragStart={(e) => handleMilestoneDragStart(e, milestone)}
                                  onDragEnd={handleMilestoneDragEnd}
                                  onClick={(e) => handleMilestoneClick(e, milestone)}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    handleMilestoneEdit(milestone);
                                  }}
                                  className={`absolute text-xs font-medium cursor-move z-10 flex items-center px-2 ${bgColor} ${textColor} ${
                                    draggedMilestone?.id === milestone.id ? 'opacity-50' : ''
                                  } ${selectedMilestone?.id === milestone.id ? 'ring-4 ring-accent' : ''}`}
                                  style={{
                                    top: '0',
                                    left: '0',
                                    right: '0',
                                    bottom: '0',
                                    height: '100%'
                                  }}
                                >
                                  <div className="flex flex-col gap-0.5 overflow-hidden w-full">
                                    <div className="flex-1 overflow-hidden">
                                      <div className="font-semibold w-full truncate">
                                        {milestone.projectCommonName || milestone.taskType}
                                      </div>
                                      {milestone.taskDescription && (
                                        <div className="opacity-90 w-full truncate">
                                          {milestone.taskDescription}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Team Members Section */}
                  {getVisibleUsers().flatMap((user) => {
                    const firstName = user.name.split(' ')[0];
                    return Array.from({ length: 4 }).map((_, rowIndex) => (
                      <tr key={`${user.id}-${rowIndex}`}>
                        {rowIndex === 0 ? (
                          <th
                            rowSpan={4}
                            draggable
                            onDragStart={() => handleDragStart(user.id)}
                            onDragOver={(e) => handleDragOver(e, user.id)}
                            onDragEnd={handleDragEnd}
                            className={`bg-base-100 font-medium text-sm text-center align-middle cursor-move sticky left-0 z-20 ${
                              draggedUser === user.id ? 'opacity-50' : ''
                            }`}
                            style={{ minWidth: '120px', width: '120px' }}
                          >
                            {firstName}
                          </th>
                        ) : null}
                        {quarterDays.map((day, colIndex) => {
                          const isNewMonth = colIndex === 0 || day.getDate() === 1;
                          let task = getTaskForCell(user.id, day, rowIndex);

                          // Check if this task is currently being resized
                          let isResizing = resizingTask && task && resizingTask.task.id === task.id;

                          // Special case: if we're resizing and moved the top edge up, the task may now start at a different row
                          // Check if the resizing task should be rendered at this row instead
                          if (resizingTask && !task) {
                            const dateStr = day.toISOString().split('T')[0];
                            const taskDateStr = resizingTask.task.taskDate.split('T')[0];
                            if (resizingTask.task.userId === user.id && taskDateStr === dateStr && resizingTask.startRowIndex === rowIndex) {
                              task = resizingTask.task;
                              isResizing = true;
                            }
                          }

                          // Only render task in its starting row
                          const isTaskStartCell = task && task.rowIndex === rowIndex;

                          // Calculate visual dimensions for tasks (used for absolute positioning)
                          const visualRowSpan = isResizing && task ? resizingTask!.startRowSpan : task?.rowSpan || 1;
                          const visualRowIndex = isResizing && task ? resizingTask!.startRowIndex : task?.rowIndex || rowIndex;

                          // Check if this cell is part of the drag preview
                          const isPreviewCell = isCellInDragPreview(user.id, day, rowIndex);
                          const isPreviewValid = isPreviewCell && !isCellOccupied(user.id, day, dragOverCell!.rowIndex, draggedTask!.rowSpan, draggedTask!.id);

                          // Check if this cell is the selected cell for pasting
                          const isCellSelected = selectedCell &&
                            selectedCell.userId === user.id &&
                            selectedCell.date.toISOString().split('T')[0] === day.toISOString().split('T')[0] &&
                            selectedCell.rowIndex === rowIndex;

                          return (
                            <td
                              key={`${user.id}-${rowIndex}-${day.toISOString()}`}
                              onClick={() => !task && handleCellClick(user.id, day, rowIndex)}
                              onDoubleClick={() => !task && handleCellDoubleClick(user.id, day, rowIndex)}
                              onDragOver={(e) => handleCellDragOver(e, user.id, day, rowIndex)}
                              onDrop={(e) => handleCellDrop(e, user.id, day, rowIndex)}
                              className={`hover:bg-base-200 transition-colors cursor-pointer p-1 relative ${
                                isToday(day)
                                  ? 'bg-primary/10'
                                  : isWeekend(day)
                                  ? 'bg-base-300/30'
                                  : ''
                              } ${isNewMonth ? 'border-l-2 border-base-300' : ''} ${
                                draggedTask && !task ? 'bg-primary/10' : ''
                              } ${draggedTask ? 'z-20' : ''} ${
                                isPreviewCell ? (isPreviewValid ? 'bg-success/30 border-2 border-success' : 'bg-error/30 border-2 border-error') : ''
                              } ${isCellSelected && !task ? 'ring-2 ring-accent ring-inset' : ''}`}
                              style={{
                                minWidth: '140px',
                                maxWidth: '140px',
                                width: '140px',
                                minHeight: '60px',
                                height: '60px'
                              }}
                            >
                              {isTaskStartCell && task ? (
                                <div
                                  draggable
                                  onDragStart={(e) => handleTaskDragStart(e, task)}
                                  onDragEnd={handleTaskDragEnd}
                                  onClick={(e) => handleTaskClick(e, task)}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskEdit(task);
                                  }}
                                  className={`absolute rounded px-2 py-1 text-xs font-medium cursor-move z-10 flex items-center ${
                                    task.taskType === 'Project Task'
                                      ? 'bg-primary text-primary-content'
                                      : task.taskType === 'Out of Office'
                                      ? 'bg-secondary text-secondary-content'
                                      : task.taskType === 'PTO'
                                      ? 'bg-info text-info-content'
                                      : task.taskType === 'Internal'
                                      ? 'bg-success text-success-content'
                                       : task.taskType === 'Unavailable'
                                      ? 'bg-accent text-accent-content'
                                      : 'bg-error text-error-content'
                                  } ${draggedTask?.id === task.id ? 'opacity-50' : ''} ${isResizing ? 'ring-2 ring-base-content/30' : ''} ${selectedTask?.id === task.id ? 'ring-4 ring-accent' : ''} ${isCutTask && copiedTask?.id === task.id ? 'opacity-50 ring-2 ring-dashed ring-accent' : ''}`}
                                  style={{
                                    top: `${(visualRowIndex - task.rowIndex) * 60 + 6}px`,
                                    left: '4px',
                                    right: '4px',
                                    height: `${(visualRowSpan * 60) - 12}px`
                                  }}
                                >
                                  {/* Top resize handle */}
                                  <div
                                    onMouseDown={(e) => handleResizeStart(e, task, 'top')}
                                    className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-base-content/20 z-10"
                                    style={{ marginTop: '-2px' }}
                                  />

                                  <div className="flex flex-col gap-0.5 overflow-hidden w-full max-w-full h-full">
                                    <div className="flex-1 overflow-hidden">
                                      {/* Header line: Project name with task type in parentheses for non-Project tasks, or just project/task type */}
                                      <div className={`font-semibold w-full overflow-hidden ${visualRowSpan === 1 ? 'truncate' : ''}`}
                                        style={visualRowSpan > 1 ? {
                                          display: '-webkit-box',
                                          WebkitLineClamp: visualRowSpan,
                                          WebkitBoxOrient: 'vertical'
                                        } : undefined}>
                                        {task.taskType === 'Internal'
                                          ? task.internalTaskTypeName || 'Internal'
                                          : (task.projectCommonName || task.projectName) && task.taskType !== 'Project Task'
                                          ? `${task.projectCommonName || task.projectName} (${task.taskType})`
                                          : task.projectCommonName || task.projectName || task.taskType
                                        }
                                      </div>
                                      {/* Description line: Show custom description only if it's different from task type */}
                                      {task.taskDescription && task.taskDescription !== task.taskType ? (
                                        <div className={`opacity-90 w-full overflow-hidden ${visualRowSpan === 1 ? 'truncate' : ''}`}
                                          style={visualRowSpan > 1 ? {
                                            display: '-webkit-box',
                                            WebkitLineClamp: Math.max(1, visualRowSpan * 2 - 1),
                                            WebkitBoxOrient: 'vertical'
                                          } : undefined}>
                                          {task.taskDescription}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>

                                  {/* Bottom resize handle */}
                                  <div
                                    onMouseDown={(e) => handleResizeStart(e, task, 'bottom')}
                                    className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-base-content/20 z-10"
                                    style={{ marginBottom: '-2px' }}
                                  />
                                </div>
                              ) : (
                                <div className="h-full w-full"></div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
              </div>
            )}

            {showInstructions && (
              <div className="mt-4 text-sm opacity-60">
                <p>
                  <strong>Double-click</strong> empty cells to create tasks or milestones. <strong>Click</strong> a task to select it, then <strong>Cmd+C</strong> to copy.
                  Click an empty cell and <strong>Cmd+V</strong> to paste. Press <strong>Delete/Backspace</strong> to remove selected task or milestone.
                  Drag tasks/milestones to move them. Drag task edges to resize vertically. Double-click tasks/milestones to edit.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Settings Modal */}
      {showUserSettings && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setShowUserSettings(false)}
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-4">Manage Team Members</h3>
            <p className="text-sm opacity-70 mb-4">
              Drag team members to reorder them. Toggle visibility to show/hide team members in the planning table.
            </p>

            {/* Show Instructions Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-base-300 bg-base-100 mb-4">
              <div>
                <div className="font-medium">Show Instructions</div>
                <div className="text-xs opacity-60">Display help text below the calendar</div>
              </div>
              <label className="cursor-pointer">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={showInstructions}
                  onChange={(e) => updateShowInstructions(e.target.checked)}
                />
              </label>
            </div>

            <div className="space-y-2">
              {tempUsers.map((user) => (
                <div
                  key={user.id}
                  draggable
                  onDragStart={() => handleDragStart(user.id)}
                  onDragOver={(e) => handleDragOver(e, user.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between p-3 rounded-lg border border-base-300 bg-base-100 cursor-move ${
                    draggedUser === user.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-5 opacity-50">
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="3" y1="15" x2="21" y2="15"></line>
                    </svg>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs opacity-60">{user.email}</div>
                    </div>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={user.visible}
                      onChange={() => toggleUserVisibility(user.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="modal-action">
              <button className="btn" onClick={cancelSettings}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveSettings}>
                Save
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={cancelSettings}>close</button>
          </form>
        </dialog>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <dialog className="modal modal-open">
          <div className="modal-box overflow-visible">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setShowTaskModal(false)}
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-4">
              {editingTask ? 'Edit Planning Task' : 'New Planning Task'}
            </h3>

            <div className="space-y-4">
              {/* Task Type */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Task Type</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={taskFormData.taskType}
                  onChange={(e) =>
                    setTaskFormData({
                      ...taskFormData,
                      taskType: e.target.value as 'Project Task' | 'Out of Office' | 'Unavailable' | 'PTO' | 'Internal',
                      projectId: (e.target.value !== 'Project Task' && e.target.value !== 'Out of Office') ? '' : taskFormData.projectId,
                      internalTaskTypeId: e.target.value !== 'Internal' ? '' : taskFormData.internalTaskTypeId
                    })
                  }
                >
                  <option value="Project Task">Project Task</option>
                  <option value="Out of Office">Out of Office</option>
                  <option value="Unavailable">Unavailable</option>
                  <option value="PTO">PTO</option>
                  <option value="Internal">Internal</option>
                </select>
              </div>

              {/* Internal Task Type (for Internal tasks) */}
              {taskFormData.taskType === 'Internal' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Internal Task Type</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="select select-bordered flex-1"
                      value={taskFormData.internalTaskTypeId}
                      onChange={(e) =>
                        setTaskFormData({ ...taskFormData, internalTaskTypeId: e.target.value })
                      }
                      required
                    >
                      <option value="">Select internal task type</option>
                      {internalTaskTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-square btn-outline"
                      onClick={() => setShowNewInternalTaskTypeModal(true)}
                      title="Add new internal task type"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Project (for Project Task and Out of Office) */}
              {(taskFormData.taskType === 'Project Task' || taskFormData.taskType === 'Out of Office') && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Project{taskFormData.taskType === 'Out of Office' ? ' (optional)' : ''}</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={taskFormData.projectId}
                    onChange={(e) =>
                      setTaskFormData({ ...taskFormData, projectId: e.target.value })
                    }
                    required={taskFormData.taskType === 'Project Task'}
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.commonName || project.projectName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Task Description */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Description (optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  value={taskFormData.taskDescription}
                  onChange={(e) =>
                    setTaskFormData({ ...taskFormData, taskDescription: e.target.value })
                  }
                  placeholder="Enter task description..."
                />
              </div>

              {/* Repeat Options */}
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={taskFormData.repeatEnabled}
                    onChange={(e) =>
                      setTaskFormData({ ...taskFormData, repeatEnabled: e.target.checked })
                    }
                  />
                  <span className="label-text">Repeat this task{editingTask ? ' (creates new tasks based on this one)' : ''}</span>
                </label>
              </div>

              {taskFormData.repeatEnabled && (
                <>
                  {/* Repeat Type */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Repeat Frequency</span>
                        </label>
                        <select
                          className="select select-bordered w-full"
                          value={taskFormData.repeatType}
                          onChange={(e) =>
                            setTaskFormData({
                              ...taskFormData,
                              repeatType: e.target.value as 'daily' | 'weekly' | 'monthly',
                              repeatWeekDays: e.target.value === 'weekly' ? taskFormData.repeatWeekDays : [],
                              repeatMonthDates: e.target.value === 'monthly' ? taskFormData.repeatMonthDates : []
                            })
                          }
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>

                      {/* Weekly: Select Days */}
                      {taskFormData.repeatType === 'weekly' && (
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Repeat on days</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                              <label key={index} className="label cursor-pointer gap-2 flex-none">
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-sm"
                                  checked={taskFormData.repeatWeekDays.includes(index)}
                                  onChange={(e) => {
                                    const newDays = e.target.checked
                                      ? [...taskFormData.repeatWeekDays, index].sort()
                                      : taskFormData.repeatWeekDays.filter(d => d !== index);
                                    setTaskFormData({ ...taskFormData, repeatWeekDays: newDays });
                                  }}
                                />
                                <span className="label-text text-sm">{day}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Monthly: Select Dates */}
                      {taskFormData.repeatType === 'monthly' && (
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Repeat on dates (day of month)</span>
                          </label>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                              <label key={date} className="label cursor-pointer justify-center p-1 flex-col gap-0">
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-xs"
                                  checked={taskFormData.repeatMonthDates.includes(date)}
                                  onChange={(e) => {
                                    const newDates = e.target.checked
                                      ? [...taskFormData.repeatMonthDates, date].sort((a, b) => a - b)
                                      : taskFormData.repeatMonthDates.filter(d => d !== date);
                                    setTaskFormData({ ...taskFormData, repeatMonthDates: newDates });
                                  }}
                                />
                                <span className="label-text text-xs">{date}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Repeat End Date */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Repeat until (optional)</span>
                        </label>
                        <CalendarDatePicker
                          value={taskFormData.repeatEndDate}
                          onChange={(date) =>
                            setTaskFormData({ ...taskFormData, repeatEndDate: date })
                          }
                          id="repeat-end-date"
                          placeholder="Select end date"
                        />
                      </div>
                </>
              )}
            </div>

            <div className="modal-action">
              {editingTask && (
                <button className="btn btn-error mr-auto" onClick={handleTaskDelete}>
                  Delete
                </button>
              )}
              <button className="btn" onClick={() => setShowTaskModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleTaskSave}>
                Save
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowTaskModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* Add New Internal Task Type Modal */}
      {showNewInternalTaskTypeModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Add New Internal Task Type</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Task Type Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={newInternalTaskTypeName}
                onChange={(e) => setNewInternalTaskTypeName(e.target.value)}
                placeholder="e.g., Research, Development"
                autoFocus
              />
            </div>
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setShowNewInternalTaskTypeModal(false);
                  setNewInternalTaskTypeName('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!newInternalTaskTypeName.trim()) {
                    alert('Please enter a task type name');
                    return;
                  }

                  try {
                    const response = await fetch('/api/internal-task-types', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: newInternalTaskTypeName.trim() })
                    });

                    if (response.ok) {
                      const newType = await response.json();
                      setInternalTaskTypes([...internalTaskTypes, newType]);
                      setTaskFormData({ ...taskFormData, internalTaskTypeId: newType.id.toString() });
                      setShowNewInternalTaskTypeModal(false);
                      setNewInternalTaskTypeName('');
                    } else {
                      const error = await response.json();
                      alert(error.error || 'Failed to create internal task type');
                    }
                  } catch (error) {
                    console.error('Error creating internal task type:', error);
                    alert('An error occurred while creating the task type');
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => {
              setShowNewInternalTaskTypeModal(false);
              setNewInternalTaskTypeName('');
            }}>close</button>
          </form>
        </dialog>
      )}

      {/* Milestone Modal */}
      {showMilestoneModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setShowMilestoneModal(false)}
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-4">
              {editingMilestone ? 'Edit Milestone/Deadline' : 'New Milestone/Deadline'}
            </h3>

            <div className="space-y-4">
              {/* Task Type */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Type</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={milestoneFormData.taskType}
                  onChange={(e) =>
                    setMilestoneFormData({
                      ...milestoneFormData,
                      taskType: e.target.value as 'Deadline' | 'Internal Deadline' | 'Milestone'
                    })
                  }
                >
                  <option value="Deadline">Deadline</option>
                  <option value="Internal Deadline">Internal Deadline</option>
                  <option value="Milestone">Milestone</option>
                </select>
              </div>

              {/* Project (optional) */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Project (optional)</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={milestoneFormData.projectId}
                  onChange={(e) =>
                    setMilestoneFormData({ ...milestoneFormData, projectId: e.target.value })
                  }
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.commonName || project.projectName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Description (optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  value={milestoneFormData.taskDescription}
                  onChange={(e) =>
                    setMilestoneFormData({ ...milestoneFormData, taskDescription: e.target.value })
                  }
                  placeholder="Enter description..."
                />
              </div>
            </div>

            <div className="modal-action">
              {editingMilestone && (
                <button className="btn btn-error mr-auto" onClick={handleMilestoneDelete}>
                  Delete
                </button>
              )}
              <button className="btn" onClick={() => setShowMilestoneModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleMilestoneSave}>
                Save
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowMilestoneModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </Sidebar>
  );
}
