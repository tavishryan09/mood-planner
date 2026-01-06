'use client';

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string }>;
  warnings: Array<{ row: number; message: string }>;
  clientsCreated: number;
}

interface ImportModalProps {
  show: boolean;
  onClose: () => void;
  onImport: () => Promise<void>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  importFile: File | null;
  importing: boolean;
  importResult: ImportResult | null;
}

export default function ImportModal({
  show,
  onClose,
  onImport,
  onFileChange,
  onDownloadTemplate,
  importFile,
  importing,
  importResult
}: ImportModalProps) {
  if (!show) return null;

  return (
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
                onClick={onDownloadTemplate}
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
              onChange={onFileChange}
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
                      {importResult.errors.map((error, idx) => (
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
                      {importResult.warnings.map((warning, idx) => (
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
            onClick={onClose}
            disabled={importing}
          >
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={onImport}
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
          onClick={onClose}
          disabled={importing}
        >
          close
        </button>
      </form>
    </dialog>
  );
}
