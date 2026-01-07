'use client';

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

interface VisibleColumns {
  projectNumber: boolean;
  projectName: boolean;
  clientName: boolean;
  commonName: boolean;
  status: boolean;
  projectValue: boolean;
  estimatedBillable: boolean;
  billablePercent: boolean;
  totalHours: boolean;
  hoursThisWeek: boolean;
  hoursThisMonth: boolean;
  hoursThisQuarter: boolean;
}

interface EditingCell {
  id: number;
  field: string;
}

interface ProjectsTableProps {
  projects: Project[];
  loading: boolean;
  visibleColumns: VisibleColumns;
  sortConfig: { field: keyof Project | null; direction: 'asc' | 'desc' };
  editingCell: EditingCell | null;
  editValue: string;
  onSort: (field: keyof Project) => void;
  onEdit: (projectId: number) => void;
  onCellEdit: (project: Project, field: string) => void;
  onCellSave: (projectId: number, field: string) => void;
  onCellCancel: () => void;
  onEditValueChange: (value: string) => void;
  getSortedProjects: () => Project[];
}

export default function ProjectsTable({
  projects,
  loading,
  visibleColumns,
  sortConfig,
  editingCell,
  editValue,
  onSort,
  onEdit,
  onCellEdit,
  onCellSave,
  onCellCancel,
  onEditValueChange,
  getSortedProjects
}: ProjectsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortConfig.field !== field) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-3 opacity-30">
          <path d="m7 15 5 5 5-5"></path>
          <path d="m7 9 5-5 5 5"></path>
        </svg>
      );
    }
    if (sortConfig.direction === 'asc') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-3">
          <path d="m7 15 5 5 5-5"></path>
          <path d="m7 9 5-5 5 5"></path>
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-3">
        <path d="m7 15 5 5 5-5"></path>
        <path d="m7 9 5-5 5 5"></path>
      </svg>
    );
  };

  if (loading) {
    return (
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
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                <td><div className="skeleton h-4 w-16"></div></td>
                <td><div className="skeleton h-4 w-48"></div></td>
                <td><div className="skeleton h-4 w-32"></div></td>
                <td><div className="skeleton h-4 w-24"></div></td>
                <td><div className="skeleton h-4 w-20"></div></td>
                <td><div className="skeleton h-4 w-20"></div></td>
                <td><div className="skeleton h-4 w-24"></div></td>
                <td><div className="skeleton h-8 w-16"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center p-8 text-base-content/60">
        <p>No projects yet. Click "Add Project" to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-base-300 rounded-lg">
      <table className="table table-zebra">
        <thead>
          <tr>
            {visibleColumns.projectNumber && (
              <th>
                <button
                  className="flex items-center gap-1 hover:text-primary"
                  onClick={() => onSort('projectNumber')}
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
                  onClick={() => onSort('projectName')}
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
                  onClick={() => onSort('clientName')}
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
                  onClick={() => onSort('commonName')}
                >
                  Common Name
                  <SortIcon field="commonName" />
                </button>
              </th>
            )}
            {visibleColumns.status && (
              <th>Status</th>
            )}
            {visibleColumns.projectValue && (
              <th>
                <button
                  className="flex items-center gap-1 hover:text-primary"
                  onClick={() => onSort('projectValue')}
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
                  onClick={() => onSort('estimatedBillable')}
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
                  onClick={() => onSort('totalHours')}
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
                  onClick={() => onSort('hoursThisWeek')}
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
                  onClick={() => onSort('hoursThisMonth')}
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
                  onClick={() => onSort('hoursThisQuarter')}
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
                  onDoubleClick={() => onCellEdit(project, 'projectNumber')}
                >
                  {editingCell?.id === project.id && editingCell?.field === 'projectNumber' ? (
                    <input
                      type="text"
                      className="input input-sm input-bordered w-full"
                      value={editValue}
                      onChange={(e) => onEditValueChange(e.target.value)}
                      onBlur={() => onCellSave(project.id, 'projectNumber')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onCellSave(project.id, 'projectNumber');
                        if (e.key === 'Escape') onCellCancel();
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
                  onDoubleClick={() => onCellEdit(project, 'projectName')}
                >
                  {editingCell?.id === project.id && editingCell?.field === 'projectName' ? (
                    <input
                      type="text"
                      className="input input-sm input-bordered w-full"
                      value={editValue}
                      onChange={(e) => onEditValueChange(e.target.value)}
                      onBlur={() => onCellSave(project.id, 'projectName')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onCellSave(project.id, 'projectName');
                        if (e.key === 'Escape') onCellCancel();
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
                  onDoubleClick={() => onCellEdit(project, 'commonName')}
                >
                  {editingCell?.id === project.id && editingCell?.field === 'commonName' ? (
                    <input
                      type="text"
                      className="input input-sm input-bordered w-full"
                      value={editValue}
                      onChange={(e) => onEditValueChange(e.target.value)}
                      onBlur={() => onCellSave(project.id, 'commonName')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onCellSave(project.id, 'commonName');
                        if (e.key === 'Escape') onCellCancel();
                      }}
                      autoFocus
                    />
                  ) : (
                    project.commonName || '—'
                  )}
                </td>
              )}
              {visibleColumns.status && (
                <td>
                  {project.archived ? (
                    <span className="badge badge-warning badge-sm">Archived</span>
                  ) : (
                    <span className="badge badge-success badge-sm">Active</span>
                  )}
                </td>
              )}
              {visibleColumns.projectValue && (
                <td
                  className="font-semibold cursor-pointer"
                  onDoubleClick={() => onCellEdit(project, 'projectValue')}
                >
                  {editingCell?.id === project.id && editingCell?.field === 'projectValue' ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input input-sm input-bordered w-full"
                      value={editValue}
                      onChange={(e) => onEditValueChange(e.target.value)}
                      onBlur={() => onCellSave(project.id, 'projectValue')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onCellSave(project.id, 'projectValue');
                        if (e.key === 'Escape') onCellCancel();
                      }}
                      autoFocus
                    />
                  ) : (
                    project.projectValue ? formatCurrency(project.projectValue) : '—'
                  )}
                </td>
              )}
              {visibleColumns.estimatedBillable && (
                <td className="font-semibold">
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
                    onClick={() => onEdit(project.id)}
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
  );
}
