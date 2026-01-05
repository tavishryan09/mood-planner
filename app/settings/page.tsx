'use client';

import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Designer' | 'Accountant';
  createdAt: string;
  billingRate: number;
}

function SettingsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookEmail, setOutlookEmail] = useState<string | null>(null);
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Designer' as 'Admin' | 'Manager' | 'Designer' | 'Accountant',
    billingRate: 0
  });

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchUsers();
    }
    fetchOutlookStatus();
  }, [user]);

  useEffect(() => {
    // Check for OAuth callback status
    const connected = searchParams.get('outlook_connected');
    const error = searchParams.get('outlook_error');

    if (connected === 'true') {
      alert('Successfully connected to Outlook Calendar!');
      fetchOutlookStatus();
      // Clear URL params
      window.history.replaceState({}, '', '/settings');
    } else if (error) {
      alert(`Failed to connect to Outlook: ${error}`);
      // Clear URL params
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams]);

  const fetchOutlookStatus = async () => {
    try {
      const response = await fetch('/api/outlook/status');
      if (response.ok) {
        const data = await response.json();
        setOutlookConnected(data.connected);
        setOutlookEmail(data.email);
      }
    } catch (error) {
      console.error('Error fetching Outlook status:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Designer',
      billingRate: 0
    });
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEdit = (userId: number) => {
    const userToEdit = users.find(u => u.id === userId);
    if (userToEdit) {
      setFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        password: '',
        role: userToEdit.role,
        billingRate: userToEdit.billingRate || 0
      });
      setEditingUser(userId);
      setShowModal(true);
    }
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        // Update existing user
        const response = await fetch(`/api/users/${editingUser}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || 'Failed to update user');
          return;
        }

        const updatedUser = await response.json();
        setUsers(users.map(u => u.id === editingUser ? updatedUser : u));
      } else {
        // Add new user
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || 'Failed to create user');
          return;
        }

        const newUser = await response.json();
        setUsers([newUser, ...users]);
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving user:', error);
      alert('An error occurred while saving the user');
    }
  };

  const handleDelete = async () => {
    if (!editingUser) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this user? This action cannot be undone.');

    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/users/${editingUser}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
        return;
      }

      setUsers(users.filter(u => u.id !== editingUser));
      setShowModal(false);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('An error occurred while deleting the user');
    }
  };

  const handleConnectOutlook = async () => {
    window.location.href = '/api/outlook/connect';
  };

  const handleDisconnectOutlook = async () => {
    if (!confirm('Are you sure you want to disconnect your Outlook calendar?')) {
      return;
    }

    setOutlookLoading(true);
    try {
      const response = await fetch('/api/outlook/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setOutlookConnected(false);
        setOutlookEmail(null);
        alert('Successfully disconnected from Outlook Calendar');
      } else {
        alert('Failed to disconnect from Outlook');
      }
    } catch (error) {
      console.error('Error disconnecting Outlook:', error);
      alert('An error occurred while disconnecting');
    } finally {
      setOutlookLoading(false);
    }
  };

  return (
    <Sidebar title="Settings">
      <div className="p-4 space-y-4">
        {/* Outlook Calendar Integration */}
        <div className="card bg-base-100">
          <div className="card-body">
            <h2 className="card-title">Microsoft Outlook Calendar</h2>
            <p className="text-sm text-base-content/70">
              Sync your planning tasks to your Outlook calendar as daily events
            </p>

            {outlookConnected ? (
              <div className="mt-4 space-y-4">
                <div className="alert alert-success">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="font-bold">Connected to Outlook</div>
                    <div className="text-sm">{outlookEmail}</div>
                  </div>
                </div>

                <button
                  onClick={handleDisconnectOutlook}
                  disabled={outlookLoading}
                  className="btn btn-error btn-sm"
                >
                  {outlookLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect Outlook'
                  )}
                </button>

                <div className="divider">How to Sync</div>
                <div className="text-sm">
                  <p className="mb-2">Go to the Planning page and click the "Sync to Outlook" button to sync your tasks for a specific day.</p>
                  <p className="text-base-content/60">Tasks will be created as 1-hour calendar events starting at 9 AM UTC.</p>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <button
                  onClick={handleConnectOutlook}
                  className="btn btn-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12s5.373 12 12 12 12-5.373 12-12zm-12 7a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm-1-10v6h2v-6h-2zm0-2v1h2V7h-2z"/>
                  </svg>
                  Connect Outlook Calendar
                </button>
                <p className="text-xs text-base-content/60 mt-2">
                  You'll be redirected to Microsoft to authorize access to your calendar
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Account Settings */}
        <div className="card bg-base-100">
          <div className="card-body">
            <h2 className="card-title">Account Settings</h2>

            {user && (
              <div className="space-y-4 mt-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Name</span>
                  </label>
                  <input
                    type="text"
                    value={user.name}
                    disabled
                    className="input input-bordered"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="input input-bordered"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Role</span>
                  </label>
                  <input
                    type="text"
                    value={user.role}
                    disabled
                    className="input input-bordered"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Management (Admin only) */}
        {user?.role === 'Admin' && (
          <div className="card bg-base-100">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title">User Management</h2>
                <button
                  onClick={handleAddNew}
                  className="btn btn-primary btn-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add User
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center p-8">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Billing Rate</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`badge ${
                              u.role === 'Admin' ? 'badge-error' :
                              u.role === 'Manager' ? 'badge-warning' :
                              u.role === 'Accountant' ? 'badge-success' :
                              'badge-info'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td>${Number(u.billingRate || 0).toFixed(2)}/hr</td>
                          <td>
                            <button
                              className="btn btn-ghost btn-sm btn-square"
                              onClick={() => handleEdit(u.id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit User */}
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
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>

            <label className="input input-bordered w-full mb-5">
              <span className="label">Name</span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </label>

            <label className="input input-bordered w-full mb-5">
              <span className="label">Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </label>

            <label className="input input-bordered w-full mb-5">
              <span className="label">
                Password {editingUser && '(leave blank to keep current)'}
              </span>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? 'Leave blank to keep current' : ''}
              />
            </label>

            <div className="form-control w-full mb-5">
              <label className="label">
                <span className="label-text">Role</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'Admin' | 'Manager' | 'Designer' | 'Accountant' })}
              >
                <option value="Designer">Designer</option>
                <option value="Manager">Manager</option>
                <option value="Accountant">Accountant</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {/* Only show billing rate for Designer and Manager roles */}
            {(formData.role === 'Designer' || formData.role === 'Manager') && (
              <div className="form-control w-full mb-5">
                <label className="label">
                  <span className="label-text">Billing Rate ($/hr)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input input-bordered w-full"
                  value={formData.billingRate}
                  onChange={(e) => setFormData({ ...formData, billingRate: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="modal-action">
              {editingUser && (
                <button className="btn btn-error mr-auto" onClick={handleDelete}>
                  Delete
                </button>
              )}
              <button className="btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingUser ? 'Save Changes' : 'Add User'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </Sidebar>
  );
}

export default function Settings() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
