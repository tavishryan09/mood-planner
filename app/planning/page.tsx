'use client';

import Sidebar from '@/components/Sidebar';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import CalendarHeader from '@/components/planning/CalendarHeader';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TaskModal from '@/components/planning/TaskModal';
import MilestoneModal from '@/components/planning/MilestoneModal';
import UserSettingsModal from '@/components/planning/UserSettingsModal';
import { usePlanningData } from '@/hooks/planning/usePlanningData';
import { usePlanningTasks } from '@/hooks/planning/usePlanningTasks';
import { useMilestones } from '@/hooks/planning/useMilestones';
import { usePlanningInteractions } from '@/hooks/planning/usePlanningInteractions';
import { formatMonthDay, getDayName, isToday, isWeekend } from '@/lib/date-utils';

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
  const { user: currentUser, loading: authLoading } = useAuth();
  const [quarterDays, setQuarterDays] = useState<Date[]>([]);
  const [currentQuarter, setCurrentQuarter] = useState('');
  const [selectedQuarterOffset, setSelectedQuarterOffset] = useState(0); // 0 = current, 1 = next, -1 = previous
  const [loadedQuarterOffsets, setLoadedQuarterOffsets] = useState<number[]>([0]); // Track which quarters are loaded
  const [currentWeekNumber, setCurrentWeekNumber] = useState(1);

  // Use planning data hook for data fetching and state management
  const {
    users,
    projects,
    internalTaskTypes,
    tasks,
    milestoneTasks,
    outlookConnected,
    showInstructions,
    loading: isLoading,
    setUsers,
    setProjects,
    setInternalTaskTypes,
    setTasks,
    setMilestoneTasks,
    setOutlookConnected,
    setShowInstructions,
    refetchAll,
    refetchTasks,
    refetchMilestones
  } = usePlanningData({ quarterDays, enabled: !!currentUser });

  // Use planning tasks hook for task CRUD operations
  const {
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
  } = usePlanningTasks({ tasks, refetchTasks });

  // Use milestones hook for milestone CRUD operations
  const {
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
  } = useMilestones({ milestoneTasks, refetchMilestones });

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

  // Use planning interactions hook for drag-and-drop, resize, and keyboard shortcuts
  const {
    draggedTask,
    dragOverCell,
    handleTaskDragStart,
    handleTaskDragEnd,
    handleCellDragOver,
    handleCellDrop,
    draggedMilestone,
    dragOverMilestoneCell,
    handleMilestoneDragStart,
    handleMilestoneDragEnd,
    handleMilestoneCellDragOver,
    handleMilestoneCellDrop,
    resizingTask,
    handleResizeStart,
    draggedUser,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleTaskClick,
    handleMilestoneClick,
    getTaskForCell,
    getMilestoneForCell,
    isCellOccupied,
    isCellInDragPreview
  } = usePlanningInteractions({
    tasks,
    milestoneTasks,
    users,
    selectedTask,
    selectedMilestone,
    selectedCell,
    copiedTask,
    showTaskModal,
    showMilestoneModal,
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
  });

  const [showUserSettings, setShowUserSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const pendingScrollTarget = useRef<Date | null>(null);

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
      // Wait for auth to finish loading before attempting to load data
      if (authLoading) return;

      try {
        // Check current quarter and next 3 quarters for tasks in parallel
        const quartersToCheck = [0, 1, 2, 3];

        // Fetch all quarters in parallel instead of sequentially
        const quarterChecks = await Promise.all(
          quartersToCheck.map(async (offset) => {
            const quarterInfo = getQuarterInfo(offset);
            const startDate = quarterInfo.quarterStart.toISOString().split('T')[0];
            const endDate = quarterInfo.quarterEnd.toISOString().split('T')[0];

            try {
              const response = await fetch(`/api/planning-tasks?startDate=${startDate}&endDate=${endDate}`);
              if (response.ok) {
                const tasksInQuarter = await response.json();
                return tasksInQuarter.length > 0 ? offset : null;
              }
            } catch (error) {
              console.error(`Error checking quarter ${offset}:`, error);
            }
            return null;
          })
        );

        // Filter out null values to get quarters with tasks
        const quartersWithTasks = quarterChecks.filter((offset): offset is number => offset !== null);

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
      }
    };

    loadQuartersWithTasks();
  }, [authLoading]);

  // Handle pending scroll after quarter change
  useEffect(() => {
    if (quarterDays.length > 0 && pendingScrollTarget.current) {
      const monday = getMondayOfWeek(pendingScrollTarget.current);
      const weekNum = getWeekNumber(monday);
      setCurrentWeekNumber(weekNum);

      // Find the Monday in the new quarter days
      setTimeout(() => {
        scrollToMonday(monday);
        pendingScrollTarget.current = null;
      }, 50);
    }
  }, [quarterDays]);

  useEffect(() => {
    console.log('Tasks updated:', tasks);
    if (tasks.length > 0) {
      console.log('Sample task:', tasks[0]);
    }
  }, [tasks]);

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

  const openUserSettings = () => {
    setShowUserSettings(true);
  };

  const getVisibleUsers = () => {
    return users
      .filter(user => user.visible)
      .sort((a, b) => a.order - b.order);
  };

  useEffect(() => {
    // Scroll to current week's Monday after data is loaded (only on initial load)
    if (quarterDays.length > 0 && !isLoading && scrollContainerRef.current && !pendingScrollTarget.current) {
      // Only scroll to current week if we're viewing the current quarter
      if (selectedQuarterOffset === 0) {
        scrollToCurrentWeek();
      }
    }
  }, [quarterDays, isLoading, selectedQuarterOffset]);

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

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long' });
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

  // Show loading state while auth is being verified OR while quarters are being initialized
  if (authLoading || (quarterDays.length === 0 && isLoading)) {
    return (
      <Sidebar title="Planning" hideNavbar={true}>
        <div className="p-4">
          <div className="card bg-base-100">
            <div className="card-body p-4 lg:p-8">
              <div className="skeleton h-8 w-64 mb-4"></div>
              <div className="skeleton h-96 w-full"></div>
            </div>
          </div>
        </div>
      </Sidebar>
    );
  }

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
                    ? 'calc(100dvh - 190px)'
                    : showInstructions
                    ? 'calc(100vh - 200px)'
                    : 'calc(100vh - 150px)'
                }}
                ref={scrollContainerRef}
              >
                <table className="table table-zebra">
                  <CalendarHeader
                    quarterDays={quarterDays}
                    formatMonthDay={formatMonthDay}
                    getDayName={getDayName}
                    isToday={isToday}
                    isWeekend={isWeekend}
                  />
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
      <UserSettingsModal
        show={showUserSettings}
        onClose={() => setShowUserSettings(false)}
        onSave={(updatedUsers) => {
          setUsers(updatedUsers);
          saveUserSettings(updatedUsers);
          setShowUserSettings(false);
        }}
        users={users}
        showInstructions={showInstructions}
        onUpdateShowInstructions={updateShowInstructions}
        outlookConnected={outlookConnected}
        onSyncToOutlook={handleSyncToOutlook}
        isSyncing={isSyncing}
      />

      {/* Task Modal */}
      <TaskModal
        show={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleTaskSave}
        onDelete={editingTask ? handleTaskDelete : undefined}
        editingTask={editingTask}
        projects={projects}
        internalTaskTypes={internalTaskTypes}
        formData={taskFormData}
        setFormData={setTaskFormData}
        onAddInternalTaskType={(newType) => setInternalTaskTypes([...internalTaskTypes, newType])}
      />

      {/* Milestone Modal */}
      <MilestoneModal
        show={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        onSave={handleMilestoneSave}
        onDelete={editingMilestone ? handleMilestoneDelete : undefined}
        editingMilestone={editingMilestone}
        projects={projects}
        formData={milestoneFormData}
        setFormData={setMilestoneFormData}
      />
    </Sidebar>
  );
}
