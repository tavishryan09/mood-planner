'use client';

import { CloseIcon } from '@/components/shared/Icons';

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
  showArchived: boolean;
}

interface ColumnVisibilityModalProps {
  show: boolean;
  onClose: () => void;
  visibleColumns: VisibleColumns;
  tempVisibleColumns: VisibleColumns;
  setTempVisibleColumns: (columns: VisibleColumns) => void;
  onSave: () => void;
}

export default function ColumnVisibilityModal({
  show,
  onClose,
  visibleColumns,
  tempVisibleColumns,
  setTempVisibleColumns,
  onSave
}: ColumnVisibilityModalProps) {
  if (!show) return null;

  const handleSave = () => {
    onSave();
    onClose();
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <h3 className="font-bold text-lg mb-2">Column Visibility</h3>
        <p className="text-sm opacity-70 mb-5">Toggle visibility to show/hide columns in the table.</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
              <span className="text-sm">Project #</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.projectNumber}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, projectNumber: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
              <div className="flex items-baseline gap-2">
                <span className="text-sm">Project Name</span>
                <span className="text-xs opacity-60">(Required)</span>
              </div>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.projectName}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, projectName: e.target.checked })}
              disabled
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span className="text-sm">Client</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.clientName}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, clientName: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <path d="M4 7V4h16v3"/>
                <path d="M9 20h6"/>
                <path d="M12 4v16"/>
              </svg>
              <span className="text-sm">Common Name</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.commonName}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, commonName: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span className="text-sm">Status</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.status}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, status: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <line x1="12" y1="2" x2="12" y2="22"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span className="text-sm">Project Value</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.projectValue}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, projectValue: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              <span className="text-sm">Est. Billable</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.estimatedBillable}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, estimatedBillable: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span className="text-sm">Billable %</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.billablePercent}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, billablePercent: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="text-sm">Total Hours</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.totalHours}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, totalHours: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <span className="text-sm">Hours This Week</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.hoursThisWeek}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, hoursThisWeek: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <span className="text-sm">Hours This Month</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.hoursThisMonth}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, hoursThisMonth: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <span className="text-sm">Hours This Quarter</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={tempVisibleColumns.hoursThisQuarter}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, hoursThisQuarter: e.target.checked })}
            />
          </div>

          <div className="divider">Filters</div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 opacity-60">
                <rect x="2" y="3" width="20" height="5" rx="1"/>
                <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/>
                <path d="M10 12h4"/>
              </svg>
              <span className="text-sm">Show Archived Projects</span>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-warning"
              checked={tempVisibleColumns.showArchived}
              onChange={(e) => setTempVisibleColumns({ ...tempVisibleColumns, showArchived: e.target.checked })}
            />
          </div>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
