'use client';

import Sidebar from '@/components/Sidebar';
import ProjectModal from '@/components/projects/ProjectModal';
import ColumnVisibilityModal from '@/components/projects/ColumnVisibilityModal';
import ImportModal from '@/components/projects/ImportModal';
import ProjectsTable from '@/components/projects/ProjectsTable';
import { useProjectsData } from '@/hooks/projects/useProjectsData';
import { useProjectManagement } from '@/hooks/projects/useProjectManagement';
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
  // Use custom hooks for data and project management
  const {
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
  } = useProjectsData();

  const {
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
  } = useProjectManagement({
    projects,
    users,
    fetchProjects,
    fetchClients
  });

  // Modal state
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Table state
  const [sortField, setSortField] = useState<keyof Project>('projectName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

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

            <ProjectsTable
              projects={projects}
              loading={loading}
              visibleColumns={visibleColumns}
              sortConfig={{ field: sortField, direction: sortDirection }}
              editingCell={editingCell}
              editValue={editValue}
              onSort={handleSort}
              onEdit={handleEdit}
              onCellEdit={startCellEdit}
              onCellSave={saveCellEdit}
              onCellCancel={cancelCellEdit}
              onEditValueChange={setEditValue}
              getSortedProjects={getSortedProjects}
            />

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

      <ImportModal
        show={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportResult(null);
        }}
        onImport={handleImport}
        onFileChange={handleFileChange}
        onDownloadTemplate={handleDownloadTemplate}
        importFile={importFile}
        importing={importing}
        importResult={importResult}
      />
    </Sidebar>
  );
}
