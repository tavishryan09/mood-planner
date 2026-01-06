'use client';

import Sidebar from '@/components/Sidebar';
import TaskModal from '@/components/projects/TaskModal';
import MilestoneModal from '@/components/projects/MilestoneModal';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Project {
  id: number;
  projectNumber?: string;
  projectName: string;
  clientId?: number;
  clientName?: string;
  commonName?: string;
  projectValue?: number;
  billingRate?: number;
  useTeamRates?: boolean;
  deadline?: string;
  internalDeadline?: string;
  estimatedBillable?: number;
  totalHours?: number;
  hoursThisWeek?: number;
  hoursThisMonth?: number;
  hoursThisQuarter?: number;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  billingRate?: number;
}

interface TimeEntry {
  id: number;
  date: string;
  hours: number;
  description: string;
  userName: string;
  userEmail: string;
}

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

interface Category {
  id: number;
  name: string;
  color?: string;
  createdAt: string;
}

interface Milestone {
  id: number;
  milestoneName: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'missed';
  createdAt: string;
  updatedAt: string;
}

export default function ProjectDetails() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [taskFormData, setTaskFormData] = useState({
    taskName: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'not-started' as Task['status'],
    category: '',
    assignedUserIds: [] as number[],
    progress: 0
  });
  const [milestoneFormData, setMilestoneFormData] = useState({
    milestoneName: '',
    description: '',
    dueDate: '',
    status: 'pending' as Milestone['status']
  });
  const [deadlineType, setDeadlineType] = useState<'milestone' | 'deadline' | 'internal-deadline'>('milestone');

  useEffect(() => {
    fetchProjectDetails();
  }, [slug]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);

      // First, fetch all projects to find by project number
      const projectsResponse = await fetch('/api/projects');
      if (!projectsResponse.ok) throw new Error('Failed to fetch projects');
      const projects = await projectsResponse.json();

      // Find project by projectNumber or id
      const foundProject = projects.find((p: Project) =>
        p.projectNumber === slug || p.id.toString() === slug
      );

      if (!foundProject) {
        throw new Error('Project not found');
      }

      const projectId = foundProject.id;

      // Fetch full project details
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project details');
      const data = await response.json();

      // Fetch estimated billable and hours
      let estimatedBillable = 0;
      let totalHours = 0;
      let hoursThisWeek = 0;
      let hoursThisMonth = 0;
      let hoursThisQuarter = 0;

      try {
        const billableResponse = await fetch(`/api/projects/${projectId}/estimated-billable`);
        if (billableResponse.ok) {
          const billableData = await billableResponse.json();
          estimatedBillable = billableData.estimatedBillable;
        }
      } catch (error) {
        console.error('Error fetching billable:', error);
      }

      try {
        const hoursResponse = await fetch(`/api/projects/${projectId}/hours`);
        if (hoursResponse.ok) {
          const hoursData = await hoursResponse.json();
          totalHours = hoursData.totalHours;
          hoursThisWeek = hoursData.hoursThisWeek;
          hoursThisMonth = hoursData.hoursThisMonth;
          hoursThisQuarter = hoursData.hoursThisQuarter;
        }
      } catch (error) {
        console.error('Error fetching hours:', error);
      }

      setProject({
        ...data,
        estimatedBillable,
        totalHours,
        hoursThisWeek,
        hoursThisMonth,
        hoursThisQuarter,
      });

      // Fetch team members, time entries, tasks, categories, and milestones
      await Promise.all([
        fetchTeamMembers(projectId),
        fetchTimeEntries(projectId),
        fetchTasks(projectId),
        fetchCategories(),
        fetchMilestones(projectId)
      ]);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/team`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchTimeEntries = async (projectId: number) => {
    try {
      const response = await fetch(`/api/time-entries?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setTimeEntries(data);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const fetchTasks = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMilestones = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`);
      if (response.ok) {
        const data = await response.json();
        setMilestones(data);
      }
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

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
    if (!project) return;

    try {
      const payload = {
        ...taskFormData
      };

      if (editingTask) {
        const response = await fetch(`/api/projects/${project.id}/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to update task');
      } else {
        const response = await fetch(`/api/projects/${project.id}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to create task');
      }

      await fetchTasks(project.id);
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!project) return;
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete task');

      await fetchTasks(project.id);
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

      await fetchCategories();
      setTaskFormData({ ...taskFormData, category: newCategoryName.trim() });
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    } catch (error: any) {
      console.error('Error creating category:', error);
      alert(error.message || 'Failed to create category. Please try again.');
    }
  };

  const handleAddMilestone = () => {
    setMilestoneFormData({
      milestoneName: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'pending'
    });
    setDeadlineType('milestone');
    setEditingMilestone(null);
    setShowMilestoneModal(true);
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setMilestoneFormData({
      milestoneName: milestone.milestoneName,
      description: milestone.description || '',
      dueDate: milestone.dueDate.split('T')[0],
      status: milestone.status
    });
    setDeadlineType('milestone');
    setEditingMilestone(milestone);
    setShowMilestoneModal(true);
  };

  const handleSaveMilestone = async () => {
    if (!project) return;

    try {
      if (deadlineType === 'deadline' || deadlineType === 'internal-deadline') {
        // Save as project deadline
        const updateData = deadlineType === 'deadline'
          ? { deadline: milestoneFormData.dueDate }
          : { internalDeadline: milestoneFormData.dueDate };

        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...project,
            ...updateData
          })
        });

        if (!response.ok) throw new Error('Failed to update project deadline');

        // Refresh project details
        await fetchProjectDetails();
      } else {
        // Save as milestone
        if (editingMilestone) {
          const response = await fetch(`/api/projects/${project.id}/milestones/${editingMilestone.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(milestoneFormData)
          });

          if (!response.ok) throw new Error('Failed to update milestone');
        } else {
          const response = await fetch(`/api/projects/${project.id}/milestones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(milestoneFormData)
          });

          if (!response.ok) throw new Error('Failed to create milestone');
        }

        await fetchMilestones(project.id);
      }

      setShowMilestoneModal(false);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save. Please try again.');
    }
  };

  const handleDeleteMilestone = async (milestoneId: number) => {
    if (!project) return;
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const response = await fetch(`/api/projects/${project.id}/milestones/${milestoneId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete milestone');

      await fetchMilestones(project.id);
    } catch (error) {
      console.error('Error deleting milestone:', error);
      alert('Failed to delete milestone. Please try again.');
    }
  };

  const handleRemoveDeadline = async (type: 'deadline' | 'internal-deadline') => {
    if (!project) return;

    try {
      const updateData = type === 'deadline'
        ? { deadline: null }
        : { internalDeadline: null };

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...project,
          ...updateData
        })
      });

      if (!response.ok) throw new Error('Failed to remove deadline');

      await fetchProjectDetails();
    } catch (error) {
      console.error('Error removing deadline:', error);
      alert('Failed to remove deadline. Please try again.');
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'in-progress': return 'badge-info';
      case 'blocked': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Sidebar title="Project Details" hideNavbar={true}>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="skeleton h-8 w-8"></div>
            <div className="skeleton h-8 w-64"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card bg-base-100 shadow"><div className="card-body"><div className="skeleton h-20 w-full"></div></div></div>
            <div className="card bg-base-100 shadow"><div className="card-body"><div className="skeleton h-20 w-full"></div></div></div>
            <div className="card bg-base-100 shadow"><div className="card-body"><div className="skeleton h-20 w-full"></div></div></div>
            <div className="card bg-base-100 shadow"><div className="card-body"><div className="skeleton h-20 w-full"></div></div></div>
          </div>
        </div>
      </Sidebar>
    );
  }

  if (error || !project) {
    return (
      <Sidebar title="Project Details" hideNavbar={true}>
        <div className="p-4">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{error || 'Project not found'}</span>
          </div>
          <button className="btn btn-primary mt-4" onClick={() => router.push('/projects')}>
            Back to Projects
          </button>
        </div>
      </Sidebar>
    );
  }

  const billablePercent = project.projectValue && project.estimatedBillable
    ? Math.round((project.estimatedBillable / project.projectValue) * 100)
    : 0;

  return (
    <Sidebar title="Project Details" hideNavbar={true}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={() => router.push('/projects')}
              title="Back to projects"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold">{project.projectName}</h1>
              {project.projectNumber && (
                <p className="text-sm opacity-60">Project #{project.projectNumber}</p>
              )}
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm gap-2"
            onClick={() => router.push('/projects')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit Project
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="text-sm opacity-60">Project Value</h3>
              <p className="text-2xl font-bold text-success">{formatCurrency(project.projectValue)}</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="text-sm opacity-60">Estimated Billable</h3>
              <p className="text-2xl font-bold text-info">{formatCurrency(project.estimatedBillable)}</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="text-sm opacity-60">Billable Percentage</h3>
              <div className="flex items-center gap-2">
                <progress
                  className="progress progress-primary w-full"
                  value={Math.min(billablePercent, 100)}
                  max="100"
                ></progress>
                <span className="text-xl font-bold">{billablePercent}%</span>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="text-sm opacity-60">Total Hours</h3>
              <p className="text-2xl font-bold">{project.totalHours?.toFixed(1) || '0.0'}h</p>
            </div>
          </div>
        </div>

        {/* Project Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">Project Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm opacity-60">Client</p>
                  <p className="font-semibold">{project.clientName || 'Confidential'}</p>
                </div>
                {project.commonName && (
                  <div>
                    <p className="text-sm opacity-60">Common Name</p>
                    <p className="font-semibold">{project.commonName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm opacity-60">Billing Rate</p>
                  <p className="font-semibold">
                    {project.useTeamRates ? 'Using team rates' : formatCurrency(project.billingRate) + '/hr'}
                  </p>
                </div>
                <div>
                  <p className="text-sm opacity-60">Created</p>
                  <p className="font-semibold">{formatDate(project.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-60">Last Updated</p>
                  <p className="font-semibold">{formatDate(project.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="card-title">Hours Breakdown</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="opacity-60">This Week</span>
                  <span className="font-bold text-lg">{project.hoursThisWeek?.toFixed(1) || '0.0'}h</span>
                </div>
                <div className="divider my-0"></div>
                <div className="flex justify-between items-center">
                  <span className="opacity-60">This Month</span>
                  <span className="font-bold text-lg">{project.hoursThisMonth?.toFixed(1) || '0.0'}h</span>
                </div>
                <div className="divider my-0"></div>
                <div className="flex justify-between items-center">
                  <span className="opacity-60">This Quarter</span>
                  <span className="font-bold text-lg">{project.hoursThisQuarter?.toFixed(1) || '0.0'}h</span>
                </div>
                <div className="divider my-0"></div>
                <div className="flex justify-between items-center">
                  <span className="opacity-60">Total</span>
                  <span className="font-bold text-xl text-primary">{project.totalHours?.toFixed(1) || '0.0'}h</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Planning */}
        <div className="card bg-base-100 shadow mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">Project Planning</h2>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm gap-2"
                  onClick={handleAddTask}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Task
                </button>
                <button
                  className="btn btn-secondary btn-sm gap-2"
                  onClick={handleAddMilestone}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M12 5v14"></path>
                    <path d="m5 12 7-7 7 7"></path>
                  </svg>
                  Add Deadline
                </button>
              </div>
            </div>

            {tasks.length === 0 && milestones.length === 0 && !project?.deadline && !project?.internalDeadline ? (
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-12 mx-auto opacity-30 mb-3">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <path d="M8 14h.01"></path>
                  <path d="M12 14h.01"></path>
                  <path d="M16 14h.01"></path>
                  <path d="M8 18h.01"></path>
                  <path d="M12 18h.01"></path>
                  <path d="M16 18h.01"></path>
                </svg>
                <p className="text-base-content/60">No tasks created yet. Click "Add Task" or "Add Deadline" to create a Gantt chart for your project.</p>
              </div>
            ) : (
              <>
                {/* Gantt Chart View */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-3 opacity-70">Gantt Chart Timeline</h3>
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                      {/* Timeline Header */}
                      <div className="flex border-b border-base-300 pb-2 mb-2">
                        <div className="w-48 font-semibold text-sm">Task</div>
                        <div className="flex-1 flex justify-between text-xs opacity-60">
                          {(() => {
                            const allDates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
                            const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
                            const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
                            const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                            const months: string[] = [];

                            for (let i = 0; i <= daysDiff; i += Math.ceil(daysDiff / 6)) {
                              const date = new Date(minDate.getTime() + i * 24 * 60 * 60 * 1000);
                              months.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                            }

                            return months.map((month, idx) => (
                              <span key={idx}>{month}</span>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Task Rows */}
                      {tasks.map((task, index) => {
                        const allDates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
                        const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
                        const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
                        const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

                        const taskStart = new Date(task.startDate);
                        const taskEnd = new Date(task.endDate);
                        const startOffset = Math.ceil((taskStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                        const taskDuration = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));

                        const leftPercent = (startOffset / totalDays) * 100;
                        const widthPercent = (taskDuration / totalDays) * 100;

                        // Calculate today's position
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const todayOffset = Math.ceil((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                        const todayPercent = (todayOffset / totalDays) * 100;
                        const showTodayMarker = todayPercent >= 0 && todayPercent <= 100;

                        return (
                          <div key={task.id} className="flex items-center py-2 hover:bg-base-200/50">
                            <div className="w-48 text-sm pr-2">
                              <div className="truncate">{task.taskName}</div>
                              {task.category && (
                                <span className="badge badge-ghost badge-xs mt-0.5">{task.category}</span>
                              )}
                            </div>
                            <div className="flex-1 relative h-8">
                              {/* Today marker - only show on first row */}
                              {index === 0 && showTodayMarker && (
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                                  style={{ left: `${todayPercent}%` }}
                                  title="Today"
                                >
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary whitespace-nowrap">
                                    Today
                                  </div>
                                </div>
                              )}
                              {/* Show line for all rows after first */}
                              {index > 0 && showTodayMarker && (
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-primary opacity-50"
                                  style={{ left: `${todayPercent}%` }}
                                />
                              )}

                              {/* Milestone markers */}
                              {milestones.map((milestone) => {
                                const milestoneDate = new Date(milestone.dueDate);
                                milestoneDate.setHours(0, 0, 0, 0);
                                const milestoneOffset = Math.ceil((milestoneDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                                const milestonePercent = (milestoneOffset / totalDays) * 100;
                                const showMilestone = milestonePercent >= 0 && milestonePercent <= 100;

                                if (!showMilestone) return null;

                                return (
                                  <div key={`milestone-${milestone.id}`}>
                                    {index === 0 && (
                                      <div
                                        className="absolute top-0 bottom-0 w-1 bg-secondary z-10"
                                        style={{ left: `${milestonePercent}%` }}
                                        title={`Milestone: ${milestone.milestoneName}`}
                                      >
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-secondary whitespace-nowrap">
                                          {milestone.milestoneName}
                                        </div>
                                      </div>
                                    )}
                                    {index > 0 && (
                                      <div
                                        className="absolute top-0 bottom-0 w-1 bg-secondary opacity-50"
                                        style={{ left: `${milestonePercent}%` }}
                                      />
                                    )}
                                  </div>
                                );
                              })}

                              {/* Project deadline marker */}
                              {project?.deadline && (() => {
                                const deadlineDate = new Date(project.deadline);
                                deadlineDate.setHours(0, 0, 0, 0);
                                const deadlineOffset = Math.ceil((deadlineDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                                const deadlinePercent = (deadlineOffset / totalDays) * 100;
                                const showDeadline = deadlinePercent >= 0 && deadlinePercent <= 100;

                                if (!showDeadline) return null;

                                return (
                                  <div key="deadline">
                                    {index === 0 && (
                                      <div
                                        className="absolute top-0 bottom-0 w-1 bg-error z-10"
                                        style={{ left: `${deadlinePercent}%` }}
                                        title="Project Deadline"
                                      >
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-error whitespace-nowrap">
                                          Deadline
                                        </div>
                                      </div>
                                    )}
                                    {index > 0 && (
                                      <div
                                        className="absolute top-0 bottom-0 w-1 bg-error opacity-50"
                                        style={{ left: `${deadlinePercent}%` }}
                                      />
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Internal deadline marker */}
                              {project?.internalDeadline && (() => {
                                const internalDeadlineDate = new Date(project.internalDeadline);
                                internalDeadlineDate.setHours(0, 0, 0, 0);
                                const internalDeadlineOffset = Math.ceil((internalDeadlineDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                                const internalDeadlinePercent = (internalDeadlineOffset / totalDays) * 100;
                                const showInternalDeadline = internalDeadlinePercent >= 0 && internalDeadlinePercent <= 100;

                                if (!showInternalDeadline) return null;

                                return (
                                  <div key="internal-deadline">
                                    {index === 0 && (
                                      <div
                                        className="absolute top-0 bottom-0 w-1 bg-warning z-10"
                                        style={{ left: `${internalDeadlinePercent}%` }}
                                        title="Internal Deadline"
                                      >
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-warning whitespace-nowrap">
                                          Internal
                                        </div>
                                      </div>
                                    )}
                                    {index > 0 && (
                                      <div
                                        className="absolute top-0 bottom-0 w-1 bg-warning opacity-50"
                                        style={{ left: `${internalDeadlinePercent}%` }}
                                      />
                                    )}
                                  </div>
                                );
                              })()}

                              <div
                                className={`absolute h-6 rounded flex items-center px-2 text-xs font-medium text-white ${
                                  task.status === 'completed' ? 'bg-success' :
                                  task.status === 'in-progress' ? 'bg-info' :
                                  task.status === 'blocked' ? 'bg-error' :
                                  'bg-base-300'
                                }`}
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`
                                }}
                                title={`${task.taskName}${task.category ? ` (${task.category})` : ''}: ${formatDate(task.startDate)} - ${formatDate(task.endDate)}`}
                              >
                                {widthPercent > 10 && (
                                  <span className="truncate">{task.progress}%</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Milestones Section */}
                {(milestones.length > 0 || project?.deadline || project?.internalDeadline) && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3 opacity-70">Milestones</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Project Deadline */}
                      {project?.deadline && (
                        <div
                          className="card bg-base-200 cursor-pointer hover:bg-base-300 transition-colors border-l-4 border-error"
                          onClick={() => {
                            setDeadlineType('deadline');
                            setMilestoneFormData({
                              milestoneName: '',
                              description: '',
                              dueDate: project.deadline!.split('T')[0],
                              status: 'pending'
                            });
                            setEditingMilestone(null);
                            setShowMilestoneModal(true);
                          }}
                        >
                          <div className="card-body p-4">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-sm">Project Deadline</h4>
                              <span className="badge badge-sm badge-error">deadline</span>
                            </div>
                            <div className="text-xs mt-2 opacity-70">
                              Due: {formatDate(project.deadline)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Internal Deadline */}
                      {project?.internalDeadline && (
                        <div
                          className="card bg-base-200 cursor-pointer hover:bg-base-300 transition-colors border-l-4 border-warning"
                          onClick={() => {
                            setDeadlineType('internal-deadline');
                            setMilestoneFormData({
                              milestoneName: '',
                              description: '',
                              dueDate: project.internalDeadline!.split('T')[0],
                              status: 'pending'
                            });
                            setEditingMilestone(null);
                            setShowMilestoneModal(true);
                          }}
                        >
                          <div className="card-body p-4">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-sm">Internal Deadline</h4>
                              <span className="badge badge-sm badge-warning">internal</span>
                            </div>
                            <div className="text-xs mt-2 opacity-70">
                              Due: {formatDate(project.internalDeadline)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Milestones */}
                      {milestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className="card bg-base-200 cursor-pointer hover:bg-base-300 transition-colors border-l-4 border-secondary"
                          onClick={() => handleEditMilestone(milestone)}
                        >
                          <div className="card-body p-4">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-sm">{milestone.milestoneName}</h4>
                              <span className={`badge badge-sm ${
                                milestone.status === 'completed' ? 'badge-success' :
                                milestone.status === 'missed' ? 'badge-error' :
                                'badge-warning'
                              }`}>
                                {milestone.status}
                              </span>
                            </div>
                            {milestone.description && (
                              <p className="text-xs opacity-60 mt-1">{milestone.description}</p>
                            )}
                            <div className="text-xs mt-2 opacity-70">
                              Due: {formatDate(milestone.dueDate)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Task List Table */}
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Status</th>
                        <th>Category</th>
                        <th>Assigned To</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Progress</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.id}>
                          <td>
                            <div className="font-semibold">{task.taskName}</div>
                            {task.description && (
                              <div className="text-xs opacity-60">{task.description}</div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${getStatusColor(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                          </td>
                          <td>
                            {task.category ? (
                              <span className="badge badge-ghost badge-sm">{task.category}</span>
                            ) : '—'}
                          </td>
                          <td>
                            {task.assignedUsers.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {task.assignedUsers.map(user => (
                                  <span key={user.id} className="badge badge-sm badge-outline">{user.name}</span>
                                ))}
                              </div>
                            ) : '—'}
                          </td>
                          <td>{formatDate(task.startDate)}</td>
                          <td>{formatDate(task.endDate)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <progress className="progress progress-primary w-20" value={task.progress} max="100"></progress>
                              <span className="text-xs">{task.progress}%</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button
                                className="btn btn-ghost btn-xs btn-square"
                                onClick={() => handleEditTask(task)}
                                title="Edit task"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className="btn btn-ghost btn-xs btn-square"
                                onClick={() => handleDeleteTask(task.id)}
                                title="Delete task"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Team Members */}
        <div className="card bg-base-100 shadow mb-6">
          <div className="card-body">
            <h2 className="card-title">Team Members</h2>
            {teamMembers.length === 0 ? (
              <p className="text-base-content/60 py-4">No team members assigned to this project.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Billing Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="font-semibold">{member.name}</td>
                        <td className="opacity-60">{member.email}</td>
                        <td className="font-semibold">{formatCurrency(member.billingRate)}/hr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Time Entries */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title">Recent Time Entries</h2>
            {timeEntries.length === 0 ? (
              <p className="text-base-content/60 py-4">No time entries recorded for this project yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Description</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeEntries.slice(0, 10).map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.date)}</td>
                        <td>
                          <div>
                            <div className="font-semibold">{entry.userName}</div>
                            <div className="text-xs opacity-60">{entry.userEmail}</div>
                          </div>
                        </td>
                        <td>{entry.description || '—'}</td>
                        <td className="font-bold">{entry.hours.toFixed(1)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {timeEntries.length > 10 && (
                  <div className="text-center mt-4">
                    <p className="text-sm opacity-60">Showing 10 of {timeEntries.length} entries</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        show={showTaskModal}
        editingTask={editingTask}
        taskFormData={taskFormData}
        teamMembers={teamMembers}
        categories={categories}
        showNewCategoryInput={showNewCategoryInput}
        newCategoryName={newCategoryName}
        onClose={() => setShowTaskModal(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onFormDataChange={setTaskFormData}
        onAddCategory={handleAddCategory}
        onNewCategoryNameChange={setNewCategoryName}
        onShowNewCategoryInput={setShowNewCategoryInput}
      />

      {/* Milestone Modal */}
      <MilestoneModal
        show={showMilestoneModal}
        editingMilestone={editingMilestone}
        milestoneFormData={milestoneFormData}
        deadlineType={deadlineType}
        projectId={project?.id || null}
        onClose={() => setShowMilestoneModal(false)}
        onSave={handleSaveMilestone}
        onDelete={handleDeleteMilestone}
        onRemoveDeadline={handleRemoveDeadline}
        onFormDataChange={setMilestoneFormData}
        onDeadlineTypeChange={setDeadlineType}
      />
    </Sidebar>
  );
}
