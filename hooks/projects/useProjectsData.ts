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
  estimatedBillable?: number;
  totalHours?: number;
  hoursThisWeek?: number;
  hoursThisMonth?: number;
  hoursThisQuarter?: number;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: number;
  businessName: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  billingRate?: number;
}

interface VisibleColumns {
  projectNumber: boolean;
  projectName: boolean;
  clientName: boolean;
  commonName: boolean;
  projectValue: boolean;
  estimatedBillable: boolean;
  billablePercent: boolean;
  totalHours: boolean;
  hoursThisWeek: boolean;
  hoursThisMonth: boolean;
  hoursThisQuarter: boolean;
}

interface UseProjectsDataReturn {
  // Data state
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  clients: Client[];
  setClients: (clients: Client[]) => void;
  users: User[];
  loading: boolean;

  // Column visibility
  visibleColumns: VisibleColumns;
  setVisibleColumns: (columns: VisibleColumns) => void;
  tempVisibleColumns: VisibleColumns;
  setTempVisibleColumns: (columns: VisibleColumns) => void;

  // Data fetching methods
  fetchProjects: () => Promise<void>;
  fetchClients: () => Promise<void>;
  fetchUsers: () => Promise<void>;
}

export function useProjectsData(): UseProjectsDataReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    projectNumber: true,
    projectName: true,
    clientName: true,
    commonName: true,
    projectValue: true,
    estimatedBillable: true,
    billablePercent: true,
    totalHours: true,
    hoursThisWeek: true,
    hoursThisMonth: true,
    hoursThisQuarter: true
  });

  const [tempVisibleColumns, setTempVisibleColumns] = useState<VisibleColumns>({
    projectNumber: true,
    projectName: true,
    clientName: true,
    commonName: true,
    projectValue: true,
    estimatedBillable: true,
    billablePercent: true,
    totalHours: true,
    hoursThisWeek: true,
    hoursThisMonth: true,
    hoursThisQuarter: true
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();

      // Fetch estimated billable and hours for each project
      const projectsWithData = await Promise.all(
        data.map(async (project: Project) => {
          let estimatedBillable = 0;
          let totalHours = 0;
          let hoursThisWeek = 0;
          let hoursThisMonth = 0;
          let hoursThisQuarter = 0;

          try {
            const billableResponse = await fetch(`/api/projects/${project.id}/estimated-billable`);
            if (billableResponse.ok) {
              const billableData = await billableResponse.json();
              estimatedBillable = billableData.estimatedBillable;
            }
          } catch (error) {
            console.error(`Error fetching billable for project ${project.id}:`, error);
          }

          try {
            const hoursResponse = await fetch(`/api/projects/${project.id}/hours`);
            if (hoursResponse.ok) {
              const hoursData = await hoursResponse.json();
              totalHours = hoursData.totalHours;
              hoursThisWeek = hoursData.hoursThisWeek;
              hoursThisMonth = hoursData.hoursThisMonth;
              hoursThisQuarter = hoursData.hoursThisQuarter;
            }
          } catch (error) {
            console.error(`Error fetching hours for project ${project.id}:`, error);
          }

          return {
            ...project,
            estimatedBillable,
            totalHours,
            hoursThisWeek,
            hoursThisMonth,
            hoursThisQuarter,
          };
        })
      );

      setProjects(projectsWithData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Load column visibility preferences on mount
  useEffect(() => {
    const loadColumnPreferences = async () => {
      try {
        const response = await fetch('/api/projects-column-preferences');
        if (response.ok) {
          const data = await response.json();
          setVisibleColumns(data.columnSettings);
          setTempVisibleColumns(data.columnSettings);
        }
      } catch (error) {
        console.error('Error loading column visibility preferences:', error);
      }
    };

    loadColumnPreferences();
    fetchProjects();
    fetchClients();
    fetchUsers();
  }, []);

  // Save column visibility to database whenever it changes
  useEffect(() => {
    const saveColumnPreferences = async () => {
      try {
        await fetch('/api/projects-column-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnSettings: visibleColumns })
        });
      } catch (error) {
        console.error('Error saving column visibility preferences:', error);
      }
    };

    // Only save if we're not in the initial render
    if (projects.length > 0 || !loading) {
      saveColumnPreferences();
    }
  }, [visibleColumns, projects.length, loading]);

  return {
    projects,
    setProjects,
    clients,
    setClients,
    users,
    loading,
    visibleColumns,
    setVisibleColumns,
    tempVisibleColumns,
    setTempVisibleColumns,
    fetchProjects,
    fetchClients,
    fetchUsers
  };
}
