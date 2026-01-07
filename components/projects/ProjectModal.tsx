'use client';

import { useState } from 'react';
import { CloseIcon } from '@/components/shared/Icons';

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

interface ProjectFormData {
  projectNumber: string;
  projectName: string;
  clientId: string;
  commonName: string;
  projectValue: string;
  billingRate: string;
  useTeamRates: boolean;
  archived: boolean;
}

interface ProjectModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (formData: ProjectFormData, selectedTeamMembers: number[], teamMemberRates: TeamMemberRate[]) => Promise<void>;
  onDelete?: () => Promise<void>;
  editingProject: number | null;
  formData: ProjectFormData;
  setFormData: (data: ProjectFormData) => void;
  clients: Client[];
  users: User[];
  selectedTeamMembers: number[];
  setSelectedTeamMembers: (members: number[]) => void;
  teamMemberRates: TeamMemberRate[];
  setTeamMemberRates: (rates: TeamMemberRate[]) => void;
  onClientCreated: (client: Client) => void;
}

export default function ProjectModal({
  show,
  onClose,
  onSave,
  onDelete,
  editingProject,
  formData,
  setFormData,
  clients,
  users,
  selectedTeamMembers,
  setSelectedTeamMembers,
  teamMemberRates,
  setTeamMemberRates,
  onClientCreated
}: ProjectModalProps) {
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  if (!show) return null;

  const handleClientChange = (value: string) => {
    if (value === 'create-new') {
      setShowNewClientInput(true);
      setFormData({ ...formData, clientId: '' });
    } else if (value === 'confidential') {
      setFormData({ ...formData, clientId: 'confidential' });
    } else {
      setFormData({ ...formData, clientId: value });
    }
  };

  const updateTeamMemberRate = (userId: number, rate: string) => {
    const rateValue = parseFloat(rate);
    const existingRate = teamMemberRates.find(r => r.userId === userId);
    if (existingRate) {
      setTeamMemberRates(
        teamMemberRates.map(r => (r.userId === userId ? { ...r, billingRate: rateValue } : r))
      );
    } else {
      setTeamMemberRates([...teamMemberRates, { userId, billingRate: rateValue }]);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: newClientName.trim() })
      });

      if (response.ok) {
        const newClient = await response.json();
        onClientCreated(newClient);
        setFormData({ ...formData, clientId: newClient.id.toString() });
        setNewClientName('');
        setShowNewClientInput(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create client');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('An error occurred while creating the client');
    }
  };

  const handleSaveClick = async () => {
    if (!formData.projectName.trim()) {
      alert('Project name is required');
      return;
    }
    await onSave(formData, selectedTeamMembers, teamMemberRates);
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
        <h3 className="font-bold text-lg mb-5">
          {editingProject ? 'Edit Project' : 'Add New Project'}
        </h3>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Project Name</span>
          <input
            type="text"
            value={formData.projectName}
            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
            required
          />
        </label>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Project Number (Optional)</span>
          <input
            type="text"
            value={formData.projectNumber}
            onChange={(e) => setFormData({ ...formData, projectNumber: e.target.value })}
            placeholder="e.g., PRJ-2025-001"
          />
        </label>

        <div className="form-control w-full mb-5">
          <label className="label">
            <span className="label-text">Client (Optional)</span>
          </label>
          {!showNewClientInput ? (
            <select
              className="select select-bordered w-full"
              value={formData.clientId}
              onChange={(e) => handleClientChange(e.target.value)}
            >
              <option value="">-- Select a client --</option>
              <option value="confidential">Confidential</option>
              <option disabled>───────────────</option>
              {clients.sort((a, b) => a.businessName.localeCompare(b.businessName)).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.businessName}
                </option>
              ))}
              <option disabled>───────────────</option>
              <option value="create-new">+ Create New Client</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                className="input input-bordered flex-1"
                placeholder="Enter new client name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createNewClient();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={createNewClient}
                disabled={!newClientName.trim()}
              >
                Add
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setShowNewClientInput(false);
                  setNewClientName('');
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Common Name (Optional)</span>
          <input
            type="text"
            value={formData.commonName}
            onChange={(e) => setFormData({ ...formData, commonName: e.target.value })}
            placeholder="e.g., Website Redesign"
          />
        </label>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Project Value (Optional)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.projectValue}
            onChange={(e) => setFormData({ ...formData, projectValue: e.target.value })}
            placeholder="0.00"
          />
        </label>

        <label className="input input-bordered w-full mb-5">
          <span className="label">Billing Rate ($/hr)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.billingRate}
            onChange={(e) => setFormData({ ...formData, billingRate: e.target.value })}
            placeholder="0.00"
          />
        </label>

        <div className="form-control w-full mb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="label-text font-medium block mb-1">Use different billing rates per team member</span>
              <p className="text-xs opacity-60">When enabled, you can set individual billing rates for each team member assigned to this project</p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary flex-shrink-0 mt-1"
              checked={formData.useTeamRates}
              onChange={(e) => setFormData({ ...formData, useTeamRates: e.target.checked })}
            />
          </div>
        </div>

        <div className="form-control w-full mb-5">
          <label className="label">
            <span className="label-text">Team Members (Optional)</span>
          </label>
          <div className="border border-base-300 rounded-lg p-3 max-h-48 overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-sm text-base-content/60">Loading users...</p>
            ) : (
              <div className="space-y-2">
                {users.sort((a, b) => a.name.localeCompare(b.name)).map((user) => (
                  <div key={user.id} className="hover:bg-base-200 p-2 rounded">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedTeamMembers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeamMembers([...selectedTeamMembers, user.id]);
                          } else {
                            setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== user.id));
                          }
                        }}
                      />
                      <span className="text-sm flex-1">{user.name}</span>
                      <span className="text-xs opacity-60">{user.email}</span>
                    </label>
                    {formData.useTeamRates && selectedTeamMembers.includes(user.id) && (
                      <div className="flex items-center gap-2 mt-2 ml-7">
                        <span className="text-xs opacity-70">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={getTeamMemberRate(user.id) || 0}
                          onChange={(e) => updateTeamMemberRate(user.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="input input-xs input-bordered w-24"
                          placeholder={user.billingRate?.toString() || "0.00"}
                        />
                        <span className="text-xs opacity-70">/hr</span>
                        {user.billingRate && (
                          <span className="text-xs opacity-60">(Default: ${Number(user.billingRate || 0).toFixed(2)}/hr)</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {editingProject && (
          <div className="form-control w-full mb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="label-text font-medium block mb-1">Archive Project</span>
                <p className="text-xs opacity-60">Archived projects will be hidden from the main project list unless you toggle their visibility</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-warning flex-shrink-0 mt-1"
                checked={formData.archived}
                onChange={(e) => setFormData({ ...formData, archived: e.target.checked })}
              />
            </div>
          </div>
        )}

        <div className="modal-action">
          {editingProject && onDelete && (
            <button className="btn btn-error mr-auto" onClick={onDelete}>
              Delete
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveClick}
            disabled={!formData.projectName.trim()}
          >
            {editingProject ? 'Save Changes' : 'Add Project'}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
