'use client';

import { useState } from 'react';
import { CloseIcon } from '@/components/shared/Icons';

interface UserDisplay {
  id: number;
  name: string;
  email: string;
  role: string;
  visible: boolean;
  order: number;
  billingRate: number;
}

interface UserSettingsModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (users: UserDisplay[]) => void;
  users: UserDisplay[];
  showInstructions: boolean;
  onUpdateShowInstructions: (value: boolean) => Promise<void>;
  compactView: boolean;
  onUpdateCompactView: (value: boolean) => void;
  outlookConnected: boolean;
  onSyncToOutlook: () => void;
  isSyncing: boolean;
}

export default function UserSettingsModal({
  show,
  onClose,
  onSave,
  users,
  showInstructions,
  onUpdateShowInstructions,
  compactView,
  onUpdateCompactView,
  outlookConnected,
  onSyncToOutlook,
  isSyncing
}: UserSettingsModalProps) {
  const [tempUsers, setTempUsers] = useState<UserDisplay[]>(users);
  const [draggedUser, setDraggedUser] = useState<number | null>(null);

  if (!show) return null;

  const handleDragStart = (userId: number) => {
    setDraggedUser(userId);
  };

  const handleDragOver = (e: React.DragEvent, targetUserId: number) => {
    e.preventDefault();
    if (draggedUser === null || draggedUser === targetUserId) return;

    const draggedIndex = tempUsers.findIndex(u => u.id === draggedUser);
    const targetIndex = tempUsers.findIndex(u => u.id === targetUserId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newUsers = [...tempUsers];
    const [removed] = newUsers.splice(draggedIndex, 1);
    newUsers.splice(targetIndex, 0, removed);

    // Update order values
    const reorderedUsers = newUsers.map((user, index) => ({
      ...user,
      order: index
    }));

    setTempUsers(reorderedUsers);
  };

  const handleDragEnd = () => {
    setDraggedUser(null);
  };

  const toggleUserVisibility = (userId: number) => {
    setTempUsers(tempUsers.map(user =>
      user.id === userId ? { ...user, visible: !user.visible } : user
    ));
  };

  const handleSave = () => {
    onSave(tempUsers);
  };

  const handleCancel = () => {
    setTempUsers(users);
    onClose();
  };

  // Sync tempUsers when users prop changes (modal opens)
  if (show && tempUsers.length === 0) {
    setTempUsers(users);
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={handleCancel}
        >
          <CloseIcon />
        </button>

        {/* Visibility Settings Section */}
        <h3 className="font-bold text-lg mb-4">Visibility Settings</h3>

        {/* Show Instructions Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-base-300 bg-base-100 mb-4">
          <div>
            <div className="font-medium">Show Instructions</div>
            <div className="text-xs opacity-60">Display help text below the calendar</div>
          </div>
          <label className="cursor-pointer">
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={showInstructions}
              onChange={(e) => onUpdateShowInstructions(e.target.checked)}
            />
          </label>
        </div>

        {/* Compact View Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-base-300 bg-base-100 mb-4">
          <div>
            <div className="font-medium">Compact View</div>
            <div className="text-xs opacity-60">Show only project names and reduce cell height</div>
          </div>
          <label className="cursor-pointer">
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={compactView}
              onChange={(e) => onUpdateCompactView(e.target.checked)}
            />
          </label>
        </div>

        {/* Outlook Sync Button */}
        {outlookConnected && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-base-300 bg-base-100 mb-4">
            <div>
              <div className="font-medium">Outlook Calendar Sync</div>
              <div className="text-xs opacity-60">Sync all tasks to your Outlook calendar</div>
            </div>
            <button
              className="btn btn-sm btn-primary gap-2"
              onClick={onSyncToOutlook}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Syncing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                  Sync Now
                </>
              )}
            </button>
          </div>
        )}

        {/* Manage Team Members Section */}
        <h3 className="font-bold text-lg mb-4 mt-6">Manage Team Members</h3>
        <p className="text-sm opacity-70 mb-4">
          Drag team members to reorder them. Toggle visibility to show/hide team members in the planning table.
        </p>

        <div className="space-y-2">
          {tempUsers
            .map((user) => (
              <div
                key={user.id}
                draggable
                onDragStart={() => handleDragStart(user.id)}
                onDragOver={(e) => handleDragOver(e, user.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between p-3 rounded-lg border border-base-300 bg-base-100 cursor-move ${
                  draggedUser === user.id ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-5 opacity-50">
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="3" y1="15" x2="21" y2="15"></line>
                  </svg>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs opacity-60">{user.email}</div>
                  </div>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={user.visible}
                    onChange={() => toggleUserVisibility(user.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </label>
              </div>
            ))}
        </div>

        <div className="modal-action">
          <button className="btn" onClick={handleCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleCancel}>close</button>
      </form>
    </dialog>
  );
}
