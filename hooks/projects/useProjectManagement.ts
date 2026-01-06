import { useState } from 'react';

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

interface User {
  id: number;
  name: string;
  email: string;
  billingRate?: number;
}

interface TeamMemberRate {
  userId: number;
  billingRate: number;
}

interface ProjectFormData {
  projectNumber: string;
  projectName: string;
  clientId: string;
  commonName: string;
  projectValue: string;
  billingRate: string;
  useTeamRates: boolean;
}

interface UseProjectManagementProps {
  projects: Project[];
  users: User[];
  fetchProjects: () => Promise<void>;
  fetchClients: () => Promise<void>;
}

interface UseProjectManagementReturn {
  // Modal state
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  editingProject: number | null;
  setEditingProject: (id: number | null) => void;

  // Form state
  formData: ProjectFormData;
  setFormData: (data: ProjectFormData) => void;
  selectedTeamMembers: number[];
  setSelectedTeamMembers: (members: number[]) => void;
  teamMemberRates: TeamMemberRate[];
  setTeamMemberRates: (rates: TeamMemberRate[]) => void;

  // Client state
  showNewClientInput: boolean;
  setShowNewClientInput: (show: boolean) => void;
  newClientName: string;
  setNewClientName: (name: string) => void;

  // Operations
  handleEdit: (projectId: number) => Promise<void>;
  handleAddNew: () => void;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  createNewClient: () => Promise<void>;
  updateTeamMemberRate: (userId: number, rate: string) => void;
  getTeamMemberRate: (userId: number) => number;
}

export function useProjectManagement({
  projects,
  users,
  fetchProjects,
  fetchClients
}: UseProjectManagementProps): UseProjectManagementReturn {
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<number | null>(null);

  const [formData, setFormData] = useState<ProjectFormData>({
    projectNumber: '',
    projectName: '',
    clientId: '',
    commonName: '',
    projectValue: '',
    billingRate: '',
    useTeamRates: true
  });

  const [selectedTeamMembers, setSelectedTeamMembers] = useState<number[]>([]);
  const [teamMemberRates, setTeamMemberRates] = useState<TeamMemberRate[]>([]);
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  const fetchProjectTeam = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/team`);
      if (!response.ok) throw new Error('Failed to fetch project team');
      const data = await response.json();
      setSelectedTeamMembers(data.map((member: User) => member.id));
    } catch (error) {
      console.error('Error fetching project team:', error);
      setSelectedTeamMembers([]);
    }
  };

  const fetchProjectTeamRates = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/team-rates`);
      if (!response.ok) throw new Error('Failed to fetch team rates');
      const data = await response.json();
      setTeamMemberRates(data);
    } catch (error) {
      console.error('Error fetching team rates:', error);
      setTeamMemberRates([]);
    }
  };

  const handleEdit = async (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const isConfidential = !project.clientId && !project.clientName;

      setFormData({
        projectNumber: project.projectNumber || '',
        projectName: project.projectName,
        clientId: isConfidential ? 'confidential' : (project.clientId?.toString() || ''),
        commonName: project.commonName || '',
        projectValue: project.projectValue?.toString() || '',
        billingRate: project.billingRate?.toString() || '',
        useTeamRates: project.useTeamRates || false
      });
      setEditingProject(projectId);
      setShowNewClientInput(false);
      setNewClientName('');

      await fetchProjectTeam(projectId);
      await fetchProjectTeamRates(projectId);

      setShowModal(true);
    }
  };

  const handleAddNew = () => {
    setFormData({
      projectNumber: '',
      projectName: '',
      clientId: '',
      commonName: '',
      projectValue: '',
      billingRate: '',
      useTeamRates: true
    });
    setEditingProject(null);
    setSelectedTeamMembers([]);
    setTeamMemberRates([]);
    setShowNewClientInput(false);
    setNewClientName('');
    setShowModal(true);
  };

  const updateTeamMemberRate = (userId: number, rate: string) => {
    const numericRate = parseFloat(rate) || 0;
    const existingRate = teamMemberRates.find(r => r.userId === userId);

    if (existingRate) {
      setTeamMemberRates(teamMemberRates.map(r =>
        r.userId === userId ? { ...r, billingRate: numericRate } : r
      ));
    } else {
      setTeamMemberRates([...teamMemberRates, { userId, billingRate: numericRate }]);
    }
  };

  const getTeamMemberRate = (userId: number): number => {
    const rate = teamMemberRates.find(r => r.userId === userId);
    if (rate) return rate.billingRate;

    const user = users.find(u => u.id === userId);
    return user?.billingRate || 0;
  };

  const createNewClient = async () => {
    if (!newClientName.trim()) return;

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName: newClientName,
          businessAddress: '',
          website: '',
          primaryContact: '',
          email: '',
          phone: '',
        }),
      });

      if (!response.ok) throw new Error('Failed to create client');

      const newClient = await response.json();
      await fetchClients();
      setFormData({ ...formData, clientId: newClient.id.toString() });
      setShowNewClientInput(false);
      setNewClientName('');
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Failed to create client. Please try again.');
    }
  };

  const handleSave = async () => {
    try {
      let clientId = null;
      if (formData.clientId && formData.clientId !== 'confidential') {
        clientId = parseInt(formData.clientId);
      }

      const payload = {
        projectNumber: formData.projectNumber || null,
        projectName: formData.projectName,
        clientId: clientId,
        commonName: formData.commonName || null,
        projectValue: formData.projectValue ? parseFloat(formData.projectValue) : null,
        billingRate: formData.billingRate ? parseFloat(formData.billingRate) : null,
        useTeamRates: formData.useTeamRates
      };

      let projectId: number;

      if (editingProject) {
        const response = await fetch(`/api/projects/${editingProject}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error('Failed to update project');

        projectId = editingProject;
        await fetchProjects();
      } else {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error('Failed to create project');

        const newProject = await response.json();
        projectId = newProject.id;
        await fetchProjects();
      }

      await fetch(`/api/projects/${projectId}/team`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: selectedTeamMembers }),
      });

      if (formData.useTeamRates) {
        await fetch(`/api/projects/${projectId}/team-rates`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rates: teamMemberRates }),
        });
      }

      setShowModal(false);
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!editingProject) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this project? This action cannot be undone.');

    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/projects/${editingProject}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete project');

      await fetchProjects();
      setShowModal(false);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  return {
    showModal,
    setShowModal,
    editingProject,
    setEditingProject,
    formData,
    setFormData,
    selectedTeamMembers,
    setSelectedTeamMembers,
    teamMemberRates,
    setTeamMemberRates,
    showNewClientInput,
    setShowNewClientInput,
    newClientName,
    setNewClientName,
    handleEdit,
    handleAddNew,
    handleSave,
    handleDelete,
    createNewClient,
    updateTeamMemberRate,
    getTeamMemberRate
  };
}
