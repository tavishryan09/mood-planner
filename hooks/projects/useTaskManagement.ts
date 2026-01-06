import { useState } from 'react';

interface Task {
  id: number;
  taskName: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  category?: string;
  assignedUsers: Array<{ id: number; name: string }>;
  progress: number;
  dependencies?: number[];
  createdAt: string;
}

interface TaskFormData {
  taskName: string;
  description: string;
  startDate: string;
  endDate: string;
  status: Task['status'];
  category: string;
  assignedUserIds: number[];
  progress: number;
}

export function useTaskManagement(
  projectId: number | null,
  onTasksUpdate: () => Promise<void>,
  onCategoriesUpdate: () => Promise<void>
) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFormData, setTaskFormData] = useState<TaskFormData>({
    taskName: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'not-started',
    category: '',
    assignedUserIds: [],
    progress: 0
  });
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddTask = () => {
    setTaskFormData({
      taskName: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'not-started',
      category: '',
      assignedUserIds: [],
      progress: 0
    });
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setTaskFormData({
      taskName: task.taskName,
      description: task.description || '',
      startDate: task.startDate.split('T')[0],
      endDate: task.endDate.split('T')[0],
      status: task.status,
      category: task.category || '',
      assignedUserIds: task.assignedUsers.map(u => u.id),
      progress: task.progress
    });
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!projectId) return;

    try {
      const payload = {
        ...taskFormData
      };

      if (editingTask) {
        const response = await fetch(`/api/projects/${projectId}/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to update task');
      } else {
        const response = await fetch(`/api/projects/${projectId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to create task');
      }

      await onTasksUpdate();
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!projectId) return;
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete task');

      await onTasksUpdate();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }

      await onCategoriesUpdate();
      setTaskFormData({ ...taskFormData, category: newCategoryName.trim() });
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    } catch (error: any) {
      console.error('Error creating category:', error);
      alert(error.message || 'Failed to create category. Please try again.');
    }
  };

  return {
    showTaskModal,
    setShowTaskModal,
    editingTask,
    taskFormData,
    setTaskFormData,
    showNewCategoryInput,
    setShowNewCategoryInput,
    newCategoryName,
    setNewCategoryName,
    handleAddTask,
    handleEditTask,
    handleSaveTask,
    handleDeleteTask,
    handleAddCategory
  };
}
