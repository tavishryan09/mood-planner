'use client';

import Sidebar from '@/components/Sidebar';
import ProjectModal from '@/components/projects/ProjectModal';
import ColumnVisibilityModal from '@/components/projects/ColumnVisibilityModal';
import ImportModal from '@/components/projects/ImportModal';
import ProjectsTable from '@/components/projects/ProjectsTable';
import { useProjectsData } from '@/hooks/projects/useProjectsData';
import { useProjectManagement } from '@/hooks/projects/useProjectManagement';
import { useInlineCellEditing } from '@/hooks/projects/useInlineCellEditing';
import { useProjectsSorting } from '@/hooks/projects/useProjectsSorting';
import { useProjectsImportExport } from '@/hooks/projects/useProjectsImportExport';
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
  archived?: boolean;
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

  // Filter projects based on archived status
  const filteredProjects = visibleColumns.showArchived
    ? projects
    : projects.filter(p => !p.archived);

  // Inline cell editing
  const {
    editingCell,
    editValue,
    startCellEdit,
    cancelCellEdit,
    saveCellEdit,
    setEditValue
  } = useInlineCellEditing(filteredProjects, fetchProjects);

  // Sorting
  const {
    sortField,
    sortDirection,
    handleSort,
    getSortedProjects
  } = useProjectsSorting(filteredProjects);

  // Import/Export
  const {
    importFile,
    importing,
    importResult,
    handleExportExcel,
    handleExportCSV,
    handleImport,
    handleFileChange,
    handleDownloadTemplate,
    setImportFile,
    setImportResult
  } = useProjectsImportExport(fetchProjects);

  // Modal state
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const formatCurrency = (value?: number) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
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
              projects={filteredProjects}
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
              useTeamRates: formData.useTeamRates,
              archived: formData.archived || false
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
