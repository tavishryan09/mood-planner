'use client';

import Sidebar from '@/components/Sidebar';
import { useState, useEffect } from 'react';
import ClientModal from '@/components/clients/ClientModal';
import ImportModal from '@/components/clients/ImportModal';
import { useClientManagement } from '@/hooks/clients/useClientManagement';
import { useClientImportExport } from '@/hooks/clients/useClientImportExport';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchClients();
  }, []);

  // Client management hook
  const {
    showModal,
    setShowModal,
    editingClient,
    formData,
    setFormData,
    handlePhoneChange,
    handleImageUpload,
    handleEdit,
    handleAddNew,
    handleSave,
    handleDelete
  } = useClientManagement(clients, setClients);

  // Import/Export hook
  const {
    showImportModal,
    setShowImportModal,
    importFile,
    importing,
    importResult,
    handleExportCSV,
    handleImport,
    handleFileChange,
    handleDownloadTemplate,
    closeImportModal
  } = useClientImportExport(fetchClients);

  return (
    <Sidebar title="Clients" hideNavbar={true}>
      <div className="p-4">
        <div className="card bg-base-100">
          <div className="card-body">
            <div className="flex justify-between items-center mb-6">
              <h1 className="card-title">Clients</h1>
              <div className="flex gap-2">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setShowImportModal(true)}
                >
                  Import
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleExportCSV}
                >
                  Export CSV
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleAddNew}
                >
                  Add Client
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                <div className="skeleton h-32 w-full"></div>
                <div className="skeleton h-32 w-full"></div>
                <div className="skeleton h-32 w-full"></div>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-base-content/60 mb-4">No clients yet</p>
                <button className="btn btn-primary" onClick={handleAddNew}>
                  Add Your First Client
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {[...clients].sort((a, b) => a.businessName.localeCompare(b.businessName)).map((client) => (
                  <div
                    key={client.id}
                    className="card bg-base-200 hover:shadow-lg transition-shadow"
                  >
                    <div className="card-body">
                      <div className="flex items-start gap-4">
                        <div className="avatar">
                          <div className="w-16 h-16 rounded-full bg-primary text-primary-content flex items-center justify-center text-2xl font-bold">
                            {client.avatarUrl ? (
                              <img
                                src={client.avatarUrl}
                                alt={client.businessName}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              client.businessName.charAt(0).toUpperCase()
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate">{client.businessName}</h3>
                          {client.primaryContact && (
                            <p className="text-sm opacity-70 truncate">{client.primaryContact}</p>
                          )}
                          {client.email && (
                            <p className="text-sm opacity-70 truncate">{client.email}</p>
                          )}
                          {client.phone && (
                            <p className="text-sm opacity-70">{client.phone}</p>
                          )}
                          {client.businessAddress && (
                            <p className="text-sm opacity-70 truncate">{client.businessAddress}</p>
                          )}
                          {client.website && (
                            <p className="text-sm opacity-70 truncate">
                              <a
                                href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link link-primary"
                              >
                                {client.website}
                              </a>
                            </p>
                          )}
                          {client.projects && client.projects.length > 0 && (
                            <div className="mt-2">
                              <span className="badge badge-primary badge-sm">
                                {client.projects.length} {client.projects.length === 1 ? 'Project' : 'Projects'}
                              </span>
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ClientModal
        show={showModal}
        editingClient={editingClient}
        formData={formData}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        onFormDataChange={setFormData}
        onPhoneChange={handlePhoneChange}
        onImageUpload={handleImageUpload}
      />

      <ImportModal
        show={showImportModal}
        importFile={importFile}
        importing={importing}
        importResult={importResult}
        onClose={closeImportModal}
        onImport={handleImport}
        onFileChange={handleFileChange}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </Sidebar>
  );
}
