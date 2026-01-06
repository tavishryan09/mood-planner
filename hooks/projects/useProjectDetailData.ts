import { useState, useEffect } from 'react';

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
  internalDeadline?: string;
  estimatedBillable?: number;
  totalHours?: number;
  hoursThisWeek?: number;
  hoursThisMonth?: number;
  hoursThisQuarter?: number;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  billingRate?: number;
}

interface TimeEntry {
  id: number;
  date: string;
  hours: number;
  description: string;
  userName: string;
  userEmail: string;
}

interface Task {
  id: number;
  taskName: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  category?: string;
  assignedUsers: Array<{ id: number; name: string }>;
  progress: number;
  dependencies?: number[];
  createdAt: string;
}

interface Category {
  id: number;
  name: string;
  color?: string;
  createdAt: string;
}

interface Milestone {
  id: number;
  milestoneName: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'missed';
  createdAt: string;
  updatedAt: string;
}

export function useProjectDetailData(slug: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/team`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchTimeEntries = async (projectId: number) => {
    try {
      const response = await fetch(`/api/time-entries?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setTimeEntries(data);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const fetchTasks = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMilestones = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`);
      if (response.ok) {
        const data = await response.json();
        setMilestones(data);
      }
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);

      // First, fetch all projects to find by project number
      const projectsResponse = await fetch('/api/projects');
      if (!projectsResponse.ok) throw new Error('Failed to fetch projects');
      const projects = await projectsResponse.json();

      // Find project by projectNumber or id
      const foundProject = projects.find((p: Project) =>
        p.projectNumber === slug || p.id.toString() === slug
      );

      if (!foundProject) {
        throw new Error('Project not found');
      }

      const projectId = foundProject.id;

      // Fetch full project details
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project details');
      const data = await response.json();

      // Fetch estimated billable and hours
      let estimatedBillable = 0;
      let totalHours = 0;
      let hoursThisWeek = 0;
      let hoursThisMonth = 0;
      let hoursThisQuarter = 0;

      try {
        const billableResponse = await fetch(`/api/projects/${projectId}/estimated-billable`);
        if (billableResponse.ok) {
          const billableData = await billableResponse.json();
          estimatedBillable = billableData.estimatedBillable;
        }
      } catch (error) {
        console.error('Error fetching billable:', error);
      }

      try {
        const hoursResponse = await fetch(`/api/projects/${projectId}/hours`);
        if (hoursResponse.ok) {
          const hoursData = await hoursResponse.json();
          totalHours = hoursData.totalHours;
          hoursThisWeek = hoursData.hoursThisWeek;
          hoursThisMonth = hoursData.hoursThisMonth;
          hoursThisQuarter = hoursData.hoursThisQuarter;
        }
      } catch (error) {
        console.error('Error fetching hours:', error);
      }

      setProject({
        ...data,
        estimatedBillable,
        totalHours,
        hoursThisWeek,
        hoursThisMonth,
        hoursThisQuarter,
      });

      // Fetch team members, time entries, tasks, categories, and milestones
      await Promise.all([
        fetchTeamMembers(projectId),
        fetchTimeEntries(projectId),
        fetchTasks(projectId),
        fetchCategories(),
        fetchMilestones(projectId)
      ]);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [slug]);

  return {
    project,
    teamMembers,
    timeEntries,
    tasks,
    categories,
    milestones,
    loading,
    error,
    fetchProjectDetails,
    fetchTasks,
    fetchMilestones
  };
}
