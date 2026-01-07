import { useState, useEffect, useRef } from 'react';
import { formatDateLocal } from '@/lib/date-utils';

interface PlanningTask {
  id: number;
  userId: number;
  projectId: number | null;
  taskDescription: string;
  taskType: 'Project Task' | 'Out of Office' | 'Unavailable' | 'PTO' | 'Internal';
  taskDate: string;
  rowIndex: number;
  rowSpan: number;
  completed: boolean;
  projectCommonName?: string;
  projectName?: string;
  clientName?: string;
  internalTaskTypeId?: number;
  internalTaskTypeName?: string;
}

interface UserDisplay {
  id: number;
  name: string;
  visible: boolean;
  order: number;
  billingRate: number;
}

interface Project {
  id: number;
  projectNumber?: string;
  projectName: string;
  commonName?: string;
  clientName?: string;
  archived?: boolean;
  taskCount: number;
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

interface DashboardWidget {
  id: string;
  name: string;
  width: 'full' | '1/2' | '1/3' | '1/4';
  order: number;
  visible: boolean;
}

export function useDashboardData(
  selectedDate: Date,
  showProjectsWithNoTasks: boolean,
  onWidgetsLoad?: (widgets: DashboardWidget[]) => void,
  onShowAllProjectsLoad?: (showAll: boolean) => void
) {
  const [todaysTasks, setTodaysTasks] = useState<PlanningTask[]>([]);
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<PlanningTask[]>([]);
  const [upcomingMilestones, setUpcomingMilestones] = useState<MilestoneTask[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const isInitialLoad = useRef(true);

  // Fetch tasks for selected date and users
  useEffect(() => {
    const fetchTasksForDate = async () => {
      setLoading(true);
      try {
        const dateStr = formatDateLocal(selectedDate);

        // Fetch tasks for selected date
        const tasksRes = await fetch(`/api/planning-tasks?startDate=${dateStr}&endDate=${dateStr}`);
        if (tasksRes.ok) {
          const tasks = await tasksRes.json();
          setTodaysTasks(tasks);
        }

        // Fetch users with their display settings from database
        const usersRes = await fetch('/api/user-display-settings');
        if (usersRes.ok) {
          const usersWithDisplay = await usersRes.json();
          setUsers(usersWithDisplay);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasksForDate();
  }, [selectedDate]);

  // Fetch all dashboard data in a single bundled request
  useEffect(() => {
    const fetchAllDashboardData = async () => {
      // Only show loading for projects widget when toggling show all
      // On initial load, show loading for all widgets
      // On subsequent loads (toggle), only show loading for projects
      if (isInitialLoad.current) {
        setProjectsLoading(true);
        setTasksLoading(true);
        setMilestonesLoading(true);
      } else {
        setProjectsLoading(true);
      }

      try {
        // Calculate date range
        const today = formatDateLocal(new Date());
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 90);
        const endDateStr = formatDateLocal(endDate);

        // Single bundled API call
        const params = new URLSearchParams({
          includeNoTasks: showProjectsWithNoTasks.toString(),
          startDate: today,
          endDate: endDateStr,
          taskLimit: '10'
        });

        const response = await fetch(`/api/dashboard-bundle?${params}`);

        if (response.ok) {
          const data = await response.json();

          setMyProjects(data.projects);
          setUpcomingTasks(data.upcomingTasks);

          // Sort and limit milestones
          const sortedMilestones = data.milestones
            .sort((a: MilestoneTask, b: MilestoneTask) =>
              new Date(a.taskDate).getTime() - new Date(b.taskDate).getTime()
            )
            .slice(0, 10);
          setUpcomingMilestones(sortedMilestones);

          if (data.widgets && data.widgets.length > 0 && onWidgetsLoad) {
            onWidgetsLoad(data.widgets);
          }
          if (data.showAllProjects !== undefined && onShowAllProjectsLoad) {
            onShowAllProjectsLoad(data.showAllProjects);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setProjectsLoading(false);
        setTasksLoading(false);
        setMilestonesLoading(false);
        isInitialLoad.current = false;
      }
    };

    fetchAllDashboardData();
  }, [showProjectsWithNoTasks, onWidgetsLoad, onShowAllProjectsLoad]);

  const handleToggleComplete = async (taskId: number, currentCompleted: boolean) => {
    try {
      const response = await fetch(`/api/planning-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted }),
      });

      if (response.ok) {
        setUpcomingTasks(prev =>
          prev.map(task =>
            task.id === taskId ? { ...task, completed: !currentCompleted } : task
          )
        );
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  return {
    todaysTasks,
    users,
    setUsers,
    loading,
    myProjects,
    upcomingTasks,
    upcomingMilestones,
    projectsLoading,
    tasksLoading,
    milestonesLoading,
    handleToggleComplete
  };
}
