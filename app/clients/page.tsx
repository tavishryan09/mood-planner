'use client';

import Sidebar from '@/components/Sidebar';
import { useState, useEffect } from 'react';

interface Project {
  id: number;
  projectNumber?: string;
  projectName: string;
  commonName?: string;
  projectValue?: number;
}

interface Client {
  id: number;
  businessName: string;
  businessAddress: string;
  website: string;
  primaryContact: string;
  email: string;
  phone: string;
  avatar: string;
  avatarUrl?: string;
  projects?: Project[];
}

export default function Clients() {
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<number | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    businessName: '',
    businessAddress: '',
    website: '',
    primaryContact: '',
    email: '',
    phone: '',
    avatarUrl: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData({
        businessName: client.businessName,
        businessAddress: client.businessAddress,
        website: client.website,
        primaryContact: client.primaryContact,
        email: client.email,
        phone: client.phone,
        avatarUrl: client.avatarUrl || ''
      });
      setEditingClient(clientId);
      setShowModal(true);
    }
  };

  const handleAddNew = () => {
    setFormData({
      businessName: '',
      businessAddress: '',
      website: '',
      primaryContact: '',
      email: '',
      phone: '',
      avatarUrl: ''
    });
    setEditingClient(null);
    setShowModal(true);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, '');

    // Handle different lengths
    if (phoneNumber.length === 0) return '';

    // Check if it starts with country code (1 for US/Canada)
    let formatted = '';
    let digits = phoneNumber;

    if (phoneNumber.length > 10) {
      // Has country code
      const countryCode = phoneNumber.substring(0, phoneNumber.length - 10);
      digits = phoneNumber.substring(phoneNumber.length - 10);
      formatted = `+${countryCode} `;
    }

    // Format the main number
    if (digits.length <= 3) {
      formatted += `(${digits}`;
    } else if (digits.length <= 6) {
      formatted += `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      formatted += `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }

    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      if (editingClient) {
        // Update existing client
        const response = await fetch(`/api/clients/${editingClient}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error('Failed to update client');

        const updatedClient = await response.json();
        setClients(clients.map(client =>
          client.id === editingClient ? updatedClient : client
        ));
      } else {
        // Add new client
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error('Failed to create client');

        const newClient = await response.json();
        setClients([...clients, newClient]);
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleDelete = async () => {
    if (!editingClient) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this client? This action cannot be undone.');

    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/clients/${editingClient}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete client');

      setClients(clients.filter(client => client.id !== editingClient));
      setShowModal(false);
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/clients/export?format=csv');
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export clients');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import');
      }

      setImportResult(result);

      // Refresh clients list if any were imported successfully
      if (result.success > 0) {
        fetchClients();
      }
    } catch (error) {
      console.error('Error importing clients:', error);
      setImportResult({
        success: 0,
        errors: [{ row: 0, error: error instanceof Error ? error.message : 'Failed to import' }],
        warnings: [],
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
      ['Business Name', 'Business Address', 'Website', 'Primary Contact', 'Email', 'Phone'],
      ['Acme Corporation', '123 Main St, New York, NY 10001', 'https://acme.com', 'John Doe', 'john@acme.com', '555-123-4567'],
      ['Tech Solutions Inc', '456 Oak Ave, San Francisco, CA 94102', 'https://techsolutions.com', 'Jane Smith', 'jane@techsolutions.com', '555-987-6543'],
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
    a.download = 'client-import-template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Sidebar
      title="Clients"
      hideNavbar={true}
    >
      <div className="p-4">
        <div className="card bg-base-100">
          <div className="card-body p-0 lg:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">Client List</h2>
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
                  onClick={handleAddNew}
                  className="btn btn-primary btn-sm gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Client
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="skeleton h-12 w-12 shrink-0 rounded-lg"></div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="skeleton h-4 w-48"></div>
                    <div className="skeleton h-3 w-64"></div>
                    <div className="skeleton h-3 w-56"></div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="skeleton h-12 w-12 shrink-0 rounded-lg"></div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="skeleton h-4 w-48"></div>
                    <div className="skeleton h-3 w-64"></div>
                    <div className="skeleton h-3 w-56"></div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="skeleton h-12 w-12 shrink-0 rounded-lg"></div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="skeleton h-4 w-48"></div>
                    <div className="skeleton h-3 w-64"></div>
                    <div className="skeleton h-3 w-56"></div>
                  </div>
                </div>
              </div>
            ) : (
              <ul className="list border border-base-300 rounded-lg">
                {clients.sort((a, b) => a.businessName.localeCompare(b.businessName)).map((client) => (
                <li key={client.id} className="list-row items-start">
                  <div className="avatar placeholder">
                    <div className="mask mask-squircle w-12">
                      {client.avatarUrl ? (
                        <img src={client.avatarUrl} alt={client.businessName} />
                      ) : (
                        <div className="bg-primary text-primary-content w-12 h-12 flex items-center justify-center">
                          <span>{client.avatar}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{client.businessName}</div>
                    {client.businessAddress && (
                      <div className="list-col-wrap">
                        <span className="text-sm">{client.businessAddress}</span>
                      </div>
                    )}
                    {client.website && (
                      <div className="list-col-wrap">
                        <span className="text-sm">Website: {client.website}</span>
                      </div>
                    )}
                    {client.primaryContact && (
                      <div className="list-col-wrap">
                        <span className="text-sm">Contact: {client.primaryContact}</span>
                      </div>
                    )}
                    {(client.email || client.phone) && (
                      <div className="list-col-wrap">
                        <span className="text-sm">
                          {client.email}{client.email && client.phone ? ' • ' : ''}{client.phone}
                        </span>
                      </div>
                    )}
                    {client.projects && client.projects.length > 0 && (
                      <div className="list-col-wrap mt-2">
                        <span className="text-sm font-semibold">Projects ({client.projects.length}):</span>
                        <ul className="ml-4 mt-1 space-y-1">
                          {client.projects.map((project) => (
                            <li key={project.id} className="text-sm">
                              {project.projectNumber && <span className="text-base-content/60">{project.projectNumber} - </span>}
                              <span className="font-medium">{project.projectName}</span>
                              {project.commonName && <span className="text-base-content/60"> ({project.commonName})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm btn-square"
                    onClick={() => handleEdit(client.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </li>
              ))}

              <li className="list-row">
                <button
                  className="btn btn-ghost btn-block"
                  onClick={handleAddNew}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                  </svg>
                  Add Client
                </button>
              </li>
            </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Add/Edit Client */}
      {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setShowModal(false)}
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-5">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h3>

            <label className="input input-bordered w-full mb-5">
              <span className="label">Business Name</span>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
              />
            </label>

            <label className="input input-bordered w-full mb-5">
              <span className="label">Business Address</span>
              <input
                type="text"
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
              />
            </label>

            <label className="input input-bordered w-full mb-5">
              <span className="label">Website</span>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </label>

            <label className="input input-bordered w-full mb-5">
              <span className="label">Primary Contact</span>
              <input
                type="text"
                value={formData.primaryContact}
                onChange={(e) => setFormData({ ...formData, primaryContact: e.target.value })}
              />
            </label>

            <label className="input input-bordered w-full mb-5">
              <span className="label">Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@example.com"
              />
            </label>

            <label className="input input-bordered w-full mb-5">
              <span className="label">Phone</span>
              <input
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
              />
            </label>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Avatar Image</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input file-input-bordered w-full"
              />
              {formData.avatarUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={formData.avatarUrl}
                    alt="Avatar preview"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setFormData({ ...formData, avatarUrl: '' })}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="modal-action">
              {editingClient && (
                <button className="btn btn-error mr-auto" onClick={handleDelete}>
                  Delete
                </button>
              )}
              <button className="btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingClient ? 'Save Changes' : 'Add Client'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <dialog open className="modal">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Import Clients</h3>

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
                    <li>Required column: Business Name</li>
                    <li>Optional: Business Address, Website, Primary Contact, Email, Phone</li>
                    <li>Duplicate clients (same name or email) will be skipped</li>
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
                      <div className="stat-value text-warning">{importResult.warnings?.length || 0}</div>
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
                  {importResult.warnings && importResult.warnings.length > 0 && (
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
                  'Import Clients'
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
