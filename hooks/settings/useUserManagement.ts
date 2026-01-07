import { useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Designer' | 'Accountant';
  createdAt: string;
  billingRate: number;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: 'Admin' | 'Manager' | 'Designer' | 'Accountant';
  billingRate: number;
}

interface UseUserManagementProps {
  users: User[];
  setUsers: (users: User[]) => void;
  isManager?: boolean;
}

export function useUserManagement({ users, setUsers, isManager = false }: UseUserManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'Designer',
    billingRate: 0
  });

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
        const payload = isManager
          ? { billingRate: formData.billingRate } // Manager can only update billing rate
          : formData; // Admin can update all fields

        const response = await fetch(`/api/users/${editingUser}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || 'Failed to update user');
          return;
        }

        const updatedUser = await response.json();
        setUsers(users.map(u => u.id === editingUser ? updatedUser : u));
      } else {
        // Add new user (only admins can do this)
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
      alert('Failed to save user');
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
      alert('Failed to delete user');
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return {
    showModal,
    editingUser,
    formData,
    setFormData,
    handleAddNew,
    handleEdit,
    handleSave,
    handleDelete,
    closeModal
  };
}
