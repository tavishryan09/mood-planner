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
  canManageUsers: boolean;
}

function SettingsContent() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showResetLinkModal, setShowResetLinkModal] = useState(false);
  const [resetLinkData, setResetLinkData] = useState<{
    link: string;
    userName: string;
    userEmail: string;
  } | null>(null);
  const [resetLinkLoading, setResetLinkLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

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
  } = useUserManagement({ users, setUsers, isManager: user?.role === 'Manager' && !user?.canManageUsers });

  // Outlook integration
  const {
    outlookConnected,
    outlookEmail,
    outlookLoading,
    handleConnectOutlook,
    handleDisconnectOutlook
  } = useOutlookIntegration();

  const hasUserManageAccess = user?.role === 'Admin' || user?.canManageUsers;

  useEffect(() => {
    if (hasUserManageAccess || user?.role === 'Manager') {
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

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || 'Failed to change password');
        return;
      }

      setPasswordSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Close the form after 2 seconds
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('An error occurred. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleGenerateResetLink = async (userId: number) => {
    try {
      setResetLinkLoading(true);
      const response = await fetch('/api/auth/generate-reset-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to generate reset link');
        return;
      }

      setResetLinkData({
        link: data.resetLink,
        userName: data.userName,
        userEmail: data.userEmail,
      });
      setShowResetLinkModal(true);
    } catch (error) {
      console.error('Error generating reset link:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setResetLinkLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (resetLinkData) {
      navigator.clipboard.writeText(resetLinkData.link);
    }
  };

  const handleProfileUpdate = async () => {
    setProfileError('');
    setProfileSuccess(false);

    // Validation
    if (!profileData.name.trim() || !profileData.email.trim()) {
      setProfileError('Name and email are required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      setProfileError('Please enter a valid email address');
      return;
    }

    try {
      setProfileLoading(true);
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProfileError(data.error || 'Failed to update profile');
        return;
      }

      setProfileSuccess(true);

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileError('An error occurred. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Initialize profile data when user is loaded
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name,
        email: user.email,
      });
    }
  }, [user]);

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
                  <p className="mb-2">Go to the Planning page and click the "Sync to Outlook" button to sync your tasks with your outlook calendar.</p>
                  
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
              <div className="space-y-6 mt-4">
                {/* Profile Information */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Name</span>
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="input input-bordered"
                        placeholder="Enter your name"
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Role</span>
                      </label>
                      <input
                        type="text"
                        value={user.role}
                        disabled
                        className="input input-bordered bg-base-200"
                      />
                      <label className="label">
                        <span className="label-text-alt text-base-content/60">
                          Role cannot be changed
                        </span>
                      </label>
                    </div>

                    <div className="form-control md:col-span-2">
                      <label className="label">
                        <span className="label-text font-medium">Email</span>
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="input input-bordered"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  {profileError && (
                    <div className="alert alert-error">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{profileError}</span>
                    </div>
                  )}

                  {profileSuccess && (
                    <div className="alert alert-success">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Profile updated successfully!</span>
                    </div>
                  )}

                  {(profileData.name !== user.name || profileData.email !== user.email) && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleProfileUpdate}
                        disabled={profileLoading}
                        className="btn btn-primary"
                      >
                        {profileLoading ? (
                          <>
                            <span className="loading loading-spinner loading-sm"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="w-4 h-4 mr-1">
                              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                              <polyline points="17 21 17 13 7 13 7 21"></polyline>
                              <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            Save Changes
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setProfileData({ name: user.name, email: user.email });
                          setProfileError('');
                          setProfileSuccess(false);
                        }}
                        disabled={profileLoading}
                        className="btn btn-ghost"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Password Section */}
                <div className="border-t border-base-300 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-base">Password</h3>
                      <p className="text-sm text-base-content/60">
                        {showPasswordChange ? 'Update your account password' : 'Change your password to keep your account secure'}
                      </p>
                    </div>
                    {!showPasswordChange && (
                      <button
                        onClick={() => setShowPasswordChange(true)}
                        className="btn btn-outline btn-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="w-4 h-4 mr-1">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Change Password
                      </button>
                    )}
                  </div>

                  {showPasswordChange && (
                    <div className="space-y-4 bg-base-200/50 p-4 rounded-lg">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">Current Password</span>
                        </label>
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="input input-bordered"
                          placeholder="Enter current password"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">New Password</span>
                          </label>
                          <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="input input-bordered"
                            placeholder="Enter new password"
                          />
                        </div>

                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-medium">Confirm New Password</span>
                          </label>
                          <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="input input-bordered"
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>

                      <div className="text-xs text-base-content/60 bg-base-300/50 p-3 rounded">
                        <span className="font-semibold">Password requirements:</span> At least 8 characters with uppercase, lowercase, number, and special character
                      </div>

                      {passwordError && (
                        <div className="alert alert-error">
                          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{passwordError}</span>
                        </div>
                      )}

                      {passwordSuccess && (
                        <div className="alert alert-success">
                          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Password changed successfully!</span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handlePasswordChange}
                          disabled={passwordLoading}
                          className="btn btn-primary"
                        >
                          {passwordLoading ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Updating...
                            </>
                          ) : (
                            'Update Password'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowPasswordChange(false);
                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            setPasswordError('');
                            setPasswordSuccess(false);
                          }}
                          disabled={passwordLoading}
                          className="btn btn-ghost"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Management (Admin or users with manage access) */}
        {hasUserManageAccess && (
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
                            <div className="flex gap-1">
                              <button
                                className="btn btn-ghost btn-sm btn-square"
                                onClick={() => handleEdit(u.id)}
                                title="Edit user"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className="btn btn-ghost btn-sm btn-square"
                                onClick={() => handleGenerateResetLink(u.id)}
                                disabled={resetLinkLoading}
                                title="Generate password reset link"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                              </button>
                            </div>
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

        {/* Team Billing Rates (Manager without full manage access) */}
        {user?.role === 'Manager' && !user?.canManageUsers && (
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
        isManager={user?.role === 'Manager' && !user?.canManageUsers}
      />

      {/* Password Reset Link Modal */}
      {showResetLinkModal && resetLinkData && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Password Reset Link Generated</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-base-content/70 mb-2">
                  Send this link to <strong>{resetLinkData.userName}</strong> ({resetLinkData.userEmail})
                </p>
                <p className="text-sm text-base-content/70">
                  The link will expire in 24 hours.
                </p>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Reset Link</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resetLinkData.link}
                    readOnly
                    className="input input-bordered flex-1 text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="btn btn-square btn-primary"
                    title="Copy to clipboard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="alert alert-warning">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm">Keep this link secure. Anyone with this link can reset the user's password.</span>
              </div>
            </div>

            <div className="modal-action">
              <button
                onClick={() => {
                  setShowResetLinkModal(false);
                  setResetLinkData(null);
                }}
                className="btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
