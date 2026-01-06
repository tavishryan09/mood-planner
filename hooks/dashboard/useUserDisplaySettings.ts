import { useState } from 'react';

interface UserDisplay {
  id: number;
  name: string;
  visible: boolean;
  order: number;
  billingRate: number;
}

export function useUserDisplaySettings() {
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [tempUsers, setTempUsers] = useState<UserDisplay[]>([]);
  const [draggedUser, setDraggedUser] = useState<number | null>(null);

  const openUserSettings = (currentUsers: UserDisplay[]) => {
    setTempUsers([...currentUsers]);
    setShowUserSettings(true);
  };

  const saveSettings = async (users: UserDisplay[], onUpdate: (users: UserDisplay[]) => void) => {
    onUpdate(tempUsers);

    try {
      const response = await fetch('/api/user-display-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: tempUsers.map(({ id, visible, order }) => ({
            userId: id,
            visible,
            order
          }))
        }),
      });

      if (!response.ok) {
        console.error('Failed to save user display settings');
      }
    } catch (error) {
      console.error('Error saving user display settings:', error);
    }

    setShowUserSettings(false);
  };

  const cancelSettings = () => {
    setTempUsers([]);
    setShowUserSettings(false);
  };

  const toggleUserVisibility = (userId: number) => {
    setTempUsers(tempUsers.map(user =>
      user.id === userId ? { ...user, visible: !user.visible } : user
    ));
  };

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

  return {
    showUserSettings,
    tempUsers,
    draggedUser,
    openUserSettings,
    saveSettings,
    cancelSettings,
    toggleUserVisibility,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
}
