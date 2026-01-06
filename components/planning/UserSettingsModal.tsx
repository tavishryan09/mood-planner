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
}

export default function UserSettingsModal({
  show,
  onClose,
  onSave,
  users,
  showInstructions,
  onUpdateShowInstructions
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
        <h3 className="font-bold text-lg mb-4">Manage Team Members</h3>
        <p className="text-sm opacity-70 mb-4">
          Drag team members to reorder them. Toggle visibility to show/hide team members in the planning table.
        </p>

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

        <div className="space-y-2">
          {tempUsers.map((user) => (
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
