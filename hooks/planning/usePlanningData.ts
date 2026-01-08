import { useState, useEffect, useCallback } from 'react';

interface UserDisplay {
  id: number;
  name: string;
  email: string;
  role: string;
  visible: boolean;
  order: number;
  billingRate: number;
}

interface Project {
  id: number;
  projectNumber?: string;
  projectName: string;
  commonName?: string;
  archived?: boolean;
}

interface InternalTaskType {
  id: number;
  name: string;
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

interface UsePlanningDataProps {
  quarterDays: Date[];
  enabled?: boolean;
}

interface UsePlanningDataReturn {
  users: UserDisplay[];
  projects: Project[];
  internalTaskTypes: InternalTaskType[];
  tasks: PlanningTask[];
  milestoneTasks: MilestoneTask[];
  outlookConnected: boolean;
  showInstructions: boolean;
  compactView: boolean;
  loading: boolean;
  setUsers: (users: UserDisplay[]) => void;
  setProjects: (projects: Project[]) => void;
  setInternalTaskTypes: (types: InternalTaskType[]) => void;
  setTasks: (tasks: PlanningTask[]) => void;
  setMilestoneTasks: (milestones: MilestoneTask[]) => void;
  setOutlookConnected: (connected: boolean) => void;
  setShowInstructions: (show: boolean) => void;
  setCompactView: (compact: boolean) => void;
  refetchAll: () => Promise<void>;
  refetchTasks: () => Promise<void>;
  refetchMilestones: () => Promise<void>;
}

export function usePlanningData({ quarterDays, enabled = true }: UsePlanningDataProps): UsePlanningDataReturn {
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [internalTaskTypes, setInternalTaskTypes] = useState<InternalTaskType[]>([]);
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [milestoneTasks, setMilestoneTasks] = useState<MilestoneTask[]>([]);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [loading, setLoading] = useState(true);

  const sortProjects = (projectsToSort: Project[]) => {
    return projectsToSort.sort((a, b) => {
      const nameA = (a.commonName || a.projectName).toLowerCase();
      const nameB = (b.commonName || b.projectName).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  const fetchAllPlanningData = useCallback(async () => {
    if (!enabled) return;

    if (quarterDays.length === 0) {
      // Load base data without date range
      try {
        const response = await fetch('/api/planning-bundle');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
          setProjects(sortProjects(data.projects));
          setInternalTaskTypes(data.internalTaskTypes);
          setOutlookConnected(data.outlookConnected);
          setShowInstructions(data.planningPreferences.showInstructions);
          setCompactView(data.planningPreferences.compactView ?? false);
        }
      } catch (error) {
        console.error('Error fetching planning data:', error);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Load all data including tasks/milestones
    try {
      setLoading(true);
      const startDate = quarterDays[0].toISOString().split('T')[0];
      const endDate = quarterDays[quarterDays.length - 1].toISOString().split('T')[0];

      const response = await fetch(`/api/planning-bundle?startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setProjects(sortProjects(data.projects));
        setInternalTaskTypes(data.internalTaskTypes);
        setTasks(data.tasks || []);
        setMilestoneTasks(data.milestoneTasks || []);
        setOutlookConnected(data.outlookConnected);
        setShowInstructions(data.planningPreferences.showInstructions);
        setCompactView(data.planningPreferences.compactView ?? false);
      }
    } catch (error) {
      console.error('Error fetching planning data:', error);
    } finally {
      setLoading(false);
    }
  }, [quarterDays, enabled]);

  const refetchTasks = useCallback(async () => {
    if (quarterDays.length === 0) return;

    try {
      const startDate = quarterDays[0].toISOString().split('T')[0];
      const endDate = quarterDays[quarterDays.length - 1].toISOString().split('T')[0];

      const response = await fetch(`/api/planning-tasks?startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, [quarterDays]);

  const refetchMilestones = useCallback(async () => {
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
  }, [quarterDays]);

  useEffect(() => {
    fetchAllPlanningData();
  }, [fetchAllPlanningData]);

  return {
    users,
    projects,
    internalTaskTypes,
    tasks,
    milestoneTasks,
    outlookConnected,
    showInstructions,
    compactView,
    loading,
    setUsers,
    setProjects,
    setInternalTaskTypes,
    setTasks,
    setMilestoneTasks,
    setOutlookConnected,
    setShowInstructions,
    setCompactView,
    refetchAll: fetchAllPlanningData,
    refetchTasks,
    refetchMilestones
  };
}
