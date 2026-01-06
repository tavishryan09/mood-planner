'use client';

import Sidebar from '@/components/Sidebar';
import TaskModal from '@/components/projects/TaskModal';
import MilestoneModal from '@/components/projects/MilestoneModal';
import GanttChart from '@/components/projects/GanttChart';
import ProjectStats from '@/components/projects/ProjectStats';
import { useProjectDetailData } from '@/hooks/projects/useProjectDetailData';
import { useTaskManagement } from '@/hooks/projects/useTaskManagement';
import { useMilestoneManagement } from '@/hooks/projects/useMilestoneManagement';
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

  // Data fetching hook
  const {
    project,
    teamMembers,
    timeEntries,
    tasks,
    categories,
    milestones,
    loading,
    error,
    fetchProjectDetails,
    fetchTasks,
    fetchMilestones
  } = useProjectDetailData(slug);

  // Task management hook
  const {
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
  } = useTaskManagement(project?.id || null, async () => {
    if (project) await fetchTasks(project.id);
  }, fetchProjectDetails);

  // Milestone management hook
  const {
    showMilestoneModal,
    setShowMilestoneModal,
    editingMilestone,
    milestoneFormData,
    setMilestoneFormData,
    deadlineType,
    setDeadlineType,
    handleAddMilestone,
    handleEditMilestone,
    handleSaveMilestone,
    handleDeleteMilestone,
    handleRemoveDeadline
  } = useMilestoneManagement(project, async () => {
    if (project) await fetchMilestones(project.id);
  }, fetchProjectDetails);

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

        <ProjectStats project={project} formatCurrency={formatCurrency} formatDate={formatDate} />

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

            <GanttChart tasks={tasks} milestones={milestones} project={project} formatDate={formatDate} />

            {(tasks.length > 0 || milestones.length > 0 || project?.deadline || project?.internalDeadline) && (
              <>

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
                              <span className="badge badge-sm badge-secondary">milestone</span>
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
