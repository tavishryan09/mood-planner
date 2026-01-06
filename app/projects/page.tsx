'use client';

import Sidebar from '@/components/Sidebar';
import ProjectModal from '@/components/projects/ProjectModal';
import ColumnVisibilityModal from '@/components/projects/ColumnVisibilityModal';
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

interface TeamMemberRate {
  userId: number;
  billingRate: number;
}

export default function Projects() {
  const [showModal, setShowModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProject, setEditingProject] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<number[]>([]);
  const [teamMemberRates, setTeamMemberRates] = useState<TeamMemberRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [sortField, setSortField] = useState<keyof Project>('projectName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [visibleColumns, setVisibleColumns] = useState({
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
  const [tempVisibleColumns, setTempVisibleColumns] = useState({
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

  const [formData, setFormData] = useState({
    projectNumber: '',
    projectName: '',
    clientId: '',
    commonName: '',
    projectValue: '',
    billingRate: '',
    useTeamRates: true
  });

  useEffect(() => {
    // Load column visibility preferences from database
    const loadColumnPreferences = async () => {
      try {
        const response = await fetch('/api/projects-column-preferences');
        if (response.ok) {
          const data = await response.json();
          setVisibleColumns(data.columnSettings);
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
    // We can check if projects have been loaded as an indicator
    if (projects.length > 0 || !loading) {
      saveColumnPreferences();
    }
  }, [visibleColumns]);

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
      // Check if project has no client (confidential) but has data
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

      // Fetch team members and their rates for this project
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

  const handleClientChange = (value: string) => {
    if (value === 'create-new') {
      setShowNewClientInput(true);
      setFormData({ ...formData, clientId: '' });
    } else {
      setShowNewClientInput(false);
      setNewClientName('');
      setFormData({ ...formData, clientId: value });
    }
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

    // Return user's default billing rate if no project-specific rate is set
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
      // Handle clientId: if "confidential" is selected, use null; otherwise parse the number
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
        // Update existing project
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
        // Add new project
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

      // Update team members
      await fetch(`/api/projects/${projectId}/team`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: selectedTeamMembers }),
      });

      // Update team member billing rates if using team rates
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

      setProjects(projects.filter(project => project.id !== editingProject));
      setShowModal(false);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const handleSort = (field: keyof Project) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const startCellEdit = (project: Project, field: string) => {
    setEditingCell({ id: project.id, field });
    let value = '';
    if (field === 'projectName') value = project.projectName;
    else if (field === 'projectNumber') value = project.projectNumber || '';
    else if (field === 'commonName') value = project.commonName || '';
    else if (field === 'projectValue') value = project.projectValue?.toString() || '';
    setEditValue(value);
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveCellEdit = async (projectId: number, field: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      let value: string | number | null = editValue;

      // Convert value based on field type
      if (field === 'projectValue') {
        value = editValue ? parseFloat(editValue) : null;
      } else if (!editValue.trim()) {
        value = null;
      }

      const payload = {
        projectNumber: field === 'projectNumber' ? value : (project.projectNumber || null),
        projectName: field === 'projectName' ? value : project.projectName,
        clientId: project.clientId || null,
        commonName: field === 'commonName' ? value : (project.commonName || null),
        projectValue: field === 'projectValue' ? value : (project.projectValue || null)
      };

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update project');

      await fetchProjects();
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project. Please try again.');
    }
  };

  const getSortedProjects = () => {
    return [...projects].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Special handling for clientName
      if (sortField === 'clientName') {
        aValue = a.clientName || 'Confidential';
        bValue = b.clientName || 'Confidential';
      }

      // Convert to string for comparison if needed
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  };

  const SortIcon = ({ field }: { field: keyof Project }) => {
    if (sortField !== field) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 opacity-30">
          <path d="M8 9l4 -4l4 4"></path>
          <path d="M16 15l-4 4l-4 -4"></path>
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M8 9l4 -4l4 4"></path>
        <path d="M16 15l-4 4l-4 -4" className="opacity-30"></path>
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M8 9l4 -4l4 4" className="opacity-30"></path>
        <path d="M16 15l-4 4l-4 -4"></path>
      </svg>
    );
  };

  const handleExportExcel = async () => {
    try {
      const response = await fetch('/api/projects/export?format=xlsx');
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export projects');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/projects/export?format=csv');
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export projects');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import');
      }

      setImportResult(result);

      // Refresh projects list if any were imported successfully
      if (result.success > 0) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Error importing projects:', error);
      setImportResult({
        success: 0,
        errors: [{ row: 0, error: error instanceof Error ? error.message : 'Failed to import' }],
        warnings: [],
        clientsCreated: 0,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        alert('Please select a valid CSV or Excel file');
        return;
      }

      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      ['Project Number', 'Project Name', 'Common Name', 'Client Name', 'Client Email', 'Client Phone', 'Project Value', 'Billing Rate', 'Use Team Rates'],
      ['24001', 'Sample Project', 'Sample', 'John Doe', 'john@example.com', '555-1234', '50000', '150', 'No'],
      ['24002', 'Another Project', '', 'Jane Smith', 'jane@example.com', '555-5678', '75000', '175', 'Yes'],
    ];

    const csvContent = template.map(row =>
      row.map(cell => {
        const escaped = String(cell).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-import-template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Sidebar
      title="Projects"
      hideNavbar={true}
    >
      <div className="p-4">
        <div className="card bg-base-100">
          <div className="card-body p-0 lg:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">Project List</h2>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-sm gap-2 hidden lg:flex"
                  onClick={handleExportCSV}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export CSV
                </button>
                <button
                  className="btn btn-ghost btn-sm gap-2 hidden lg:flex"
                  onClick={() => setShowImportModal(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Import
                </button>
                <button
                  className="btn btn-ghost btn-sm gap-2"
                  onClick={() => {
                    setTempVisibleColumns(visibleColumns);
                    setShowColumnModal(true);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  Column Visibility
                </button>
                <button
                  onClick={handleAddNew}
                  className="btn btn-primary btn-sm gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Project
                </button>
              </div>
            </div>

            {loading ? (
              <div className="overflow-x-auto border border-base-300 rounded-lg">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Project #</th>
                      <th>Project Name</th>
                      <th>Client</th>
                      <th>Common Name</th>
                      <th>Project Value</th>
                      <th>Est. Billable</th>
                      <th>Billable %</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><div className="skeleton h-4 w-16"></div></td>
                      <td><div className="skeleton h-4 w-48"></div></td>
                      <td><div className="skeleton h-4 w-32"></div></td>
                      <td><div className="skeleton h-4 w-24"></div></td>
                      <td><div className="skeleton h-4 w-20"></div></td>
                      <td><div className="skeleton h-4 w-20"></div></td>
                      <td><div className="skeleton h-4 w-24"></div></td>
                      <td><div className="skeleton h-8 w-16"></div></td>
                    </tr>
                    <tr>
                      <td><div className="skeleton h-4 w-16"></div></td>
                      <td><div className="skeleton h-4 w-48"></div></td>
                      <td><div className="skeleton h-4 w-32"></div></td>
                      <td><div className="skeleton h-4 w-24"></div></td>
                      <td><div className="skeleton h-4 w-20"></div></td>
                      <td><div className="skeleton h-4 w-20"></div></td>
                      <td><div className="skeleton h-4 w-24"></div></td>
                      <td><div className="skeleton h-8 w-16"></div></td>
                    </tr>
                    <tr>
                      <td><div className="skeleton h-4 w-16"></div></td>
                      <td><div className="skeleton h-4 w-48"></div></td>
                      <td><div className="skeleton h-4 w-32"></div></td>
                      <td><div className="skeleton h-4 w-24"></div></td>
                      <td><div className="skeleton h-4 w-20"></div></td>
                      <td><div className="skeleton h-4 w-20"></div></td>
                      <td><div className="skeleton h-4 w-24"></div></td>
                      <td><div className="skeleton h-8 w-16"></div></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center p-8 text-base-content/60">
                <p>No projects yet. Click "Add Project" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-base-300 rounded-lg">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      {visibleColumns.projectNumber && (
                        <th>
                          <button
                            className="flex items-center gap-1 hover:text-primary"
                            onClick={() => handleSort('projectNumber')}
                          >
                            Project #
                            <SortIcon field="projectNumber" />
                          </button>
                        </th>
                      )}
                      {visibleColumns.projectName && (
                        <th>
                          <button
                            className="flex items-center gap-1 hover:text-primary"
                            onClick={() => handleSort('projectName')}
                          >
                            Project Name
                            <SortIcon field="projectName" />
                          </button>
                        </th>
                      )}
                      {visibleColumns.clientName && (
                        <th>
                          <button
                            className="flex items-center gap-1 hover:text-primary"
                            onClick={() => handleSort('clientName')}
                          >
                            Client
                            <SortIcon field="clientName" />
                          </button>
                        </th>
                      )}
                      {visibleColumns.commonName && (
                        <th>
                          <button
                            className="flex items-center gap-1 hover:text-primary"
                            onClick={() => handleSort('commonName')}
                          >
                            Common Name
                            <SortIcon field="commonName" />
                          </button>
                        </th>
                      )}
                      {visibleColumns.projectValue && (
                        <th>
                          <button
                            className="flex items-center gap-1 hover:text-primary"
                            onClick={() => handleSort('projectValue')}
                          >
                            Value
                            <SortIcon field="projectValue" />
                          </button>
                        </th>
                      )}
                      {visibleColumns.estimatedBillable && (
                        <th>
                          <button
                            className="flex items-center gap-1 hover:text-primary"
                            onClick={() => handleSort('estimatedBillable')}
                          >
                            Est. Billable
                            <SortIcon field="estimatedBillable" />
                          </button>
                        </th>
                      )}
                      {visibleColumns.billablePercent && (
                        <th>Billable %</th>
                      )}
                      {visibleColumns.totalHours && (
                        <th>
                          <button
                            className="flex items-center gap-1 hover:text-primary"
                            onClick={() => handleSort('totalHours')}
                          >
                            Total Hours
                            <SortIcon field="totalHours" />
                          </button>
                        </th>
                      )}
                      {visibleColumns.hoursThisWeek && (
                        <th>
                          <button
                            className="flex items-center gap-1 hover:text-primary"
                            onClick={() => handleSort('hoursThisWeek')}
                          >
                            This Week
                            <SortIcon field="hoursThisWeek" />
                          </button>
                        </th>
                      )}
                      {visibleColumns.hoursThisMonth && (
                        <th>
                          <button
                            className="flex items-center gap-1 hover:text-primary"
                            onClick={() => handleSort('hoursThisMonth')}
                          >
                            This Month
                            <SortIcon field="hoursThisMonth" />
                          </button>
                        </th>
                      )}
                      {visibleColumns.hoursThisQuarter && (
                        <th>
                          <button
                            className="flex items-center gap-1 hover:text-primary"
                            onClick={() => handleSort('hoursThisQuarter')}
                          >
                            This Quarter
                            <SortIcon field="hoursThisQuarter" />
                          </button>
                        </th>
                      )}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedProjects().map((project) => (
                      <tr key={project.id} className="hover">
                        {visibleColumns.projectNumber && (
                          <td
                            className="cursor-pointer"
                            onDoubleClick={() => startCellEdit(project, 'projectNumber')}
                          >
                            {editingCell?.id === project.id && editingCell?.field === 'projectNumber' ? (
                              <input
                                type="text"
                                className="input input-sm input-bordered w-full"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveCellEdit(project.id, 'projectNumber')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCellEdit(project.id, 'projectNumber');
                                  if (e.key === 'Escape') cancelCellEdit();
                                }}
                                autoFocus
                              />
                            ) : (
                              project.projectNumber || '—'
                            )}
                          </td>
                        )}
                        {visibleColumns.projectName && (
                          <td
                            className="font-semibold cursor-pointer"
                            onDoubleClick={() => startCellEdit(project, 'projectName')}
                          >
                            {editingCell?.id === project.id && editingCell?.field === 'projectName' ? (
                              <input
                                type="text"
                                className="input input-sm input-bordered w-full"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveCellEdit(project.id, 'projectName')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCellEdit(project.id, 'projectName');
                                  if (e.key === 'Escape') cancelCellEdit();
                                }}
                                autoFocus
                              />
                            ) : (
                              project.projectName
                            )}
                          </td>
                        )}
                        {visibleColumns.clientName && (
                          <td>{project.clientName || 'Confidential'}</td>
                        )}
                        {visibleColumns.commonName && (
                          <td
                            className="cursor-pointer"
                            onDoubleClick={() => startCellEdit(project, 'commonName')}
                          >
                            {editingCell?.id === project.id && editingCell?.field === 'commonName' ? (
                              <input
                                type="text"
                                className="input input-sm input-bordered w-full"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveCellEdit(project.id, 'commonName')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCellEdit(project.id, 'commonName');
                                  if (e.key === 'Escape') cancelCellEdit();
                                }}
                                autoFocus
                              />
                            ) : (
                              project.commonName || '—'
                            )}
                          </td>
                        )}
                        {visibleColumns.projectValue && (
                          <td
                            className="font-semibold text-success cursor-pointer"
                            onDoubleClick={() => startCellEdit(project, 'projectValue')}
                          >
                            {editingCell?.id === project.id && editingCell?.field === 'projectValue' ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="input input-sm input-bordered w-full"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveCellEdit(project.id, 'projectValue')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCellEdit(project.id, 'projectValue');
                                  if (e.key === 'Escape') cancelCellEdit();
                                }}
                                autoFocus
                              />
                            ) : (
                              project.projectValue ? formatCurrency(project.projectValue) : '—'
                            )}
                          </td>
                        )}
                        {visibleColumns.estimatedBillable && (
                          <td className="font-semibold text-info">
                            {project.estimatedBillable ? formatCurrency(project.estimatedBillable) : '—'}
                          </td>
                        )}
                        {visibleColumns.billablePercent && (
                          <td>
                            {project.projectValue && project.estimatedBillable ? (
                              <div className="flex items-center gap-2">
                                <progress
                                  className="progress progress-primary w-20"
                                  value={Math.min((project.estimatedBillable / project.projectValue) * 100, 100)}
                                  max="100"
                                ></progress>
                                <span className="text-xs font-medium">
                                  {Math.round((project.estimatedBillable / project.projectValue) * 100)}%
                                </span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                        {visibleColumns.totalHours && (
                          <td className="font-semibold">
                            {project.totalHours ? `${project.totalHours.toFixed(1)}h` : '—'}
                          </td>
                        )}
                        {visibleColumns.hoursThisWeek && (
                          <td>
                            {project.hoursThisWeek ? `${project.hoursThisWeek.toFixed(1)}h` : '—'}
                          </td>
                        )}
                        {visibleColumns.hoursThisMonth && (
                          <td>
                            {project.hoursThisMonth ? `${project.hoursThisMonth.toFixed(1)}h` : '—'}
                          </td>
                        )}
                        {visibleColumns.hoursThisQuarter && (
                          <td>
                            {project.hoursThisQuarter ? `${project.hoursThisQuarter.toFixed(1)}h` : '—'}
                          </td>
                        )}
                        <td>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-ghost btn-sm btn-square"
                              onClick={() => window.location.href = `/projects/${project.projectNumber || project.id}`}
                              title="View project dashboard"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-square"
                              onClick={() => handleEdit(project.id)}
                              title="Edit project details"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && projects.length > 0 && (
              <div className="mt-4">
                <button
                  className="btn btn-ghost btn-block"
                  onClick={handleAddNew}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                  </svg>
                  Add Project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSave={async (formData, selectedTeamMembers, teamMemberRates) => {
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!response.ok) throw new Error('Failed to update project');
              projectId = editingProject;
              await fetchProjects();
            } else {
              const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!response.ok) throw new Error('Failed to create project');
              const newProject = await response.json();
              projectId = newProject.id;
              await fetchProjects();
            }

            await fetch(`/api/projects/${projectId}/team`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userIds: selectedTeamMembers }),
            });

            if (formData.useTeamRates) {
              await fetch(`/api/projects/${projectId}/team-rates`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rates: teamMemberRates }),
              });
            }

            setShowModal(false);
          } catch (error) {
            console.error('Error saving project:', error);
            alert('Failed to save project. Please try again.');
          }
        }}
        onDelete={editingProject ? async () => {
          const confirmDelete = window.confirm('Are you sure you want to delete this project? This action cannot be undone.');
          if (!confirmDelete) return;

          try {
            const response = await fetch(`/api/projects/${editingProject}`, {
              method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete project');
            setProjects(projects.filter(project => project.id !== editingProject));
            setShowModal(false);
          } catch (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project. Please try again.');
          }
        } : undefined}
        editingProject={editingProject}
        formData={formData}
        setFormData={setFormData}
        clients={clients}
        users={users}
        selectedTeamMembers={selectedTeamMembers}
        setSelectedTeamMembers={setSelectedTeamMembers}
        teamMemberRates={teamMemberRates}
        setTeamMemberRates={setTeamMemberRates}
        onClientCreated={(newClient) => {
          setClients([...clients, newClient]);
        }}
      />

      <ColumnVisibilityModal
        show={showColumnModal}
        onClose={() => setShowColumnModal(false)}
        visibleColumns={visibleColumns}
        tempVisibleColumns={tempVisibleColumns}
        setTempVisibleColumns={setTempVisibleColumns}
        onSave={() => setVisibleColumns(tempVisibleColumns)}
      />

      {/* Import Modal */}
      {showImportModal && (
        <dialog open className="modal">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Import Projects</h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">
                    <span className="label-text">Select File (CSV or Excel)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="btn btn-sm btn-outline gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Template
                  </button>
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="file-input file-input-bordered w-full"
                  disabled={importing}
                />
                {importFile && (
                  <p className="text-sm text-gray-500 mt-2">
                    Selected: {importFile.name}
                  </p>
                )}
              </div>

              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div className="text-sm">
                  <p className="font-semibold">Import Instructions:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Download the template file to see the required format</li>
                    <li>Required columns: Project Number, Project Name</li>
                    <li>Optional: Common Name, Client Name, Client Email, Client Phone, Project Value, Billing Rate, Use Team Rates</li>
                    <li>If a client doesn't exist, it will be created automatically</li>
                    <li>Duplicate project numbers will be skipped</li>
                  </ul>
                </div>
              </div>

              {/* Import Results */}
              {importResult && (
                <div className="space-y-3">
                  {/* Success Summary */}
                  <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
                    <div className="stat">
                      <div className="stat-title">Imported</div>
                      <div className="stat-value text-success">{importResult.success}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Errors</div>
                      <div className="stat-value text-error">{importResult.errors.length}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Warnings</div>
                      <div className="stat-value text-warning">{importResult.warnings.length}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Clients Created</div>
                      <div className="stat-value text-info">{importResult.clientsCreated}</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {importResult.errors.length > 0 && (
                    <div className="alert alert-error">
                      <div className="w-full">
                        <h4 className="font-semibold mb-2">Errors:</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {importResult.errors.map((error: any, idx: number) => (
                            <div key={idx} className="text-sm">
                              Row {error.row}: {error.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {importResult.warnings.length > 0 && (
                    <div className="alert alert-warning">
                      <div className="w-full">
                        <h4 className="font-semibold mb-2">Warnings:</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {importResult.warnings.map((warning: any, idx: number) => (
                            <div key={idx} className="text-sm">
                              Row {warning.row}: {warning.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                disabled={importing}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={!importFile || importing}
              >
                {importing ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Importing...
                  </>
                ) : (
                  'Import Projects'
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
                setImportResult(null);
              }}
              disabled={importing}
            >
              close
            </button>
          </form>
        </dialog>
      )}
    </Sidebar>
  );
}
