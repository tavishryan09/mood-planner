'use client';

import Sidebar from '@/components/Sidebar';
import UserModal from '@/components/settings/UserModal';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, Suspense } from 'react';
import { useUserManagement } from '@/hooks/settings/useUserManagement';
import { useOutlookIntegration } from '@/hooks/settings/useOutlookIntegration';

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // User management
  const {
    showModal,
    editingUser,
    formData,
    setFormData,
    handleAddNew,
    handleEdit,
    handleSave,
    handleDelete,
    closeModal
  } = useUserManagement({ users, setUsers, isManager: user?.role === 'Manager' });

  // Outlook integration
  const {
    outlookConnected,
    outlookEmail,
    outlookLoading,
    handleConnectOutlook,
    handleDisconnectOutlook
  } = useOutlookIntegration();

  useEffect(() => {
    if (user?.role === 'Admin' || user?.role === 'Manager') {
      fetchUsers();
    }
  }, [user]);

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

        {/* Team Billing Rates (Manager only) */}
        {user?.role === 'Manager' && (
          <div className="card bg-base-100">
            <div className="card-body">
              <div className="mb-4">
                <h2 className="card-title">Team Billing Rates</h2>
                <p className="text-sm text-base-content/70 mt-1">
                  Manage billing rates for Managers and Designers
                </p>
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
                        <th>Role</th>
                        <th>Billing Rate</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u => u.role === 'Manager' || u.role === 'Designer')
                        .map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>
                            <span className={`badge ${
                              u.role === 'Manager' ? 'badge-warning' :
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

      <UserModal
        show={showModal}
        editingUser={editingUser}
        formData={formData}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={handleDelete}
        onFormDataChange={setFormData}
        isManager={user?.role === 'Manager'}
      />
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
