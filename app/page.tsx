'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { formatDateLocal } from '@/lib/date-utils';

interface PlanningTask {
  id: number;
  userId: number;
  projectId: number | null;
  taskDescription: string;
  taskType: 'Project Task' | 'Out of Office' | 'Unavailable' | 'PTO' | 'Internal';
  taskDate: string;
  rowIndex: number;
  rowSpan: number;
  completed: boolean;
  projectCommonName?: string;
  projectName?: string;
  clientName?: string;
  internalTaskTypeId?: number;
  internalTaskTypeName?: string;
}

interface User {
  id: number;
  name: string;
}

interface UserDisplay extends User {
  visible: boolean;
  order: number;
  billingRate: number;
}

interface Project {
  id: number;
  projectNumber?: string;
  projectName: string;
  commonName?: string;
  clientName?: string;
  taskCount: number;
}

interface MilestoneTask {
  id: number;
  projectId?: number;
  taskDescription?: string;
  taskType: 'Deadline' | 'Internal Deadline' | 'Milestone';
  taskDate: string;
  rowIndex: number;
  projectCommonName?: string;
  projectName?: string;
}

interface DashboardWidget {
  id: string;
  name: string;
  width: 'full' | '1/2' | '1/3' | '1/4';
  order: number;
  visible: boolean;
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [todaysTasks, setTodaysTasks] = useState<PlanningTask[]>([]);
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<PlanningTask[]>([]);
  const [upcomingMilestones, setUpcomingMilestones] = useState<MilestoneTask[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [tempUsers, setTempUsers] = useState<UserDisplay[]>([]);
  const [draggedUser, setDraggedUser] = useState<number | null>(null);
  const [showDashboardConfig, setShowDashboardConfig] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    { id: 'projects', name: 'My Current Projects', width: '1/3', order: 0, visible: true },
    { id: 'tasks', name: 'My Upcoming Tasks', width: '1/3', order: 1, visible: true },
    { id: 'milestones', name: 'Upcoming Deadlines/Milestones', width: '1/3', order: 2, visible: true },
    { id: 'team-tasks', name: 'Tasks by Team Member', width: 'full', order: 3, visible: true }
  ]);
  const [tempWidgets, setTempWidgets] = useState<DashboardWidget[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [showProjectsWithNoTasks, setShowProjectsWithNoTasks] = useState(false);

  useEffect(() => {
    const fetchTasksForDate = async () => {
      setLoading(true);
      try {
        // Format date in local timezone to avoid UTC conversion issues
        const dateStr = formatDateLocal(selectedDate);

        // Fetch tasks for selected date
        const tasksRes = await fetch(`/api/planning-tasks?startDate=${dateStr}&endDate=${dateStr}`);
        if (tasksRes.ok) {
          const tasks = await tasksRes.json();
          setTodaysTasks(tasks);
        }

        // Fetch users with their display settings from database
        const usersRes = await fetch('/api/user-display-settings');
        if (usersRes.ok) {
          const usersWithDisplay = await usersRes.json();
          setUsers(usersWithDisplay);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasksForDate();
  }, [selectedDate]);

  // Fetch all dashboard data in a single bundled request
  useEffect(() => {
    const fetchAllDashboardData = async () => {
      setProjectsLoading(true);
      setTasksLoading(true);
      setMilestonesLoading(true);

      try {
        // Calculate date range
        const today = formatDateLocal(new Date());
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 90);
        const endDateStr = formatDateLocal(endDate);

        // Single bundled API call instead of 4 separate calls
        const params = new URLSearchParams({
          includeNoTasks: showProjectsWithNoTasks.toString(),
          startDate: today,
          endDate: endDateStr,
          taskLimit: '10'
        });

        const response = await fetch(`/api/dashboard-bundle?${params}`);

        if (response.ok) {
          const data = await response.json();

          setMyProjects(data.projects);
          setUpcomingTasks(data.upcomingTasks);

          // Sort and limit milestones
          const sortedMilestones = data.milestones
            .sort((a: MilestoneTask, b: MilestoneTask) =>
              new Date(a.taskDate).getTime() - new Date(b.taskDate).getTime()
            )
            .slice(0, 10);
          setUpcomingMilestones(sortedMilestones);

          if (data.widgets && data.widgets.length > 0) {
            setWidgets(data.widgets);
          }
          if (data.showAllProjects !== undefined) {
            setShowProjectsWithNoTasks(data.showAllProjects);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setProjectsLoading(false);
        setTasksLoading(false);
        setMilestonesLoading(false);
      }
    };

    fetchAllDashboardData();
  }, [showProjectsWithNoTasks]);


  const getTasksByUser = (userId: number) => {
    return todaysTasks.filter(task => task.userId === userId);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
      return newDate;
    });
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const getVisibleUsers = () => {
    return users
      .filter(user => user.visible)
      .sort((a, b) => a.order - b.order);
  };

  const openUserSettings = () => {
    setTempUsers([...users]);
    setShowUserSettings(true);
  };

  const saveSettings = async () => {
    setUsers(tempUsers);

    // Save to database
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

  // Dashboard widget configuration handlers
  const openDashboardConfig = () => {
    setTempWidgets([...widgets]);
    setShowDashboardConfig(true);
  };

  const saveDashboardConfig = async () => {
    try {
      const response = await fetch('/api/dashboard-widget-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgets: tempWidgets,
          showAllProjects: showProjectsWithNoTasks
        }),
      });

      if (response.ok) {
        setWidgets(tempWidgets);
        setShowDashboardConfig(false);
      } else {
        console.error('Failed to save widget settings');
      }
    } catch (error) {
      console.error('Error saving widget settings:', error);
    }
  };

  const handleShowAllProjectsToggle = async (checked: boolean) => {
    setShowProjectsWithNoTasks(checked);

    // Save preference to database
    try {
      await fetch('/api/dashboard-widget-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgets,
          showAllProjects: checked
        }),
      });
    } catch (error) {
      console.error('Error saving show all projects preference:', error);
    }
  };

  const cancelDashboardConfig = () => {
    setTempWidgets([]);
    setShowDashboardConfig(false);
  };

  const handleWidgetDragStart = (widgetId: string) => {
    setDraggedWidget(widgetId);
  };

  const handleWidgetDragOver = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (draggedWidget === null || draggedWidget === targetWidgetId) return;

    const draggedIndex = tempWidgets.findIndex(w => w.id === draggedWidget);
    const targetIndex = tempWidgets.findIndex(w => w.id === targetWidgetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newWidgets = [...tempWidgets];
    const [removed] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);

    // Update order values
    const reorderedWidgets = newWidgets.map((widget, index) => ({
      ...widget,
      order: index
    }));

    setTempWidgets(reorderedWidgets);
  };

  const handleWidgetDragEnd = () => {
    setDraggedWidget(null);
  };

  const updateWidgetWidth = (widgetId: string, width: 'full' | '1/2' | '1/3' | '1/4') => {
    setTempWidgets(tempWidgets.map(widget =>
      widget.id === widgetId ? { ...widget, width } : widget
    ));
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setTempWidgets(tempWidgets.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    ));
  };

  const getWidgetColSpan = (width: 'full' | '1/2' | '1/3' | '1/4') => {
    switch (width) {
      case 'full': return 'col-span-full';
      case '1/2': return 'lg:col-span-6';
      case '1/3': return 'lg:col-span-4';
      case '1/4': return 'lg:col-span-3';
    }
  };

  const handleToggleComplete = async (taskId: number, currentCompleted: boolean) => {
    try {
      const response = await fetch(`/api/planning-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted }),
      });

      if (response.ok) {
        // Update the upcomingTasks state
        setUpcomingTasks(prev =>
          prev.map(task =>
            task.id === taskId ? { ...task, completed: !currentCompleted } : task
          )
        );
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  return (
    <Sidebar
      title="Dashboard"
      hideNavbar={true}
    >
      <div className="p-4">
        <div className="card bg-base-100">
          <div className="card-body p-4 lg:p-8">
            <div className="flex justify-between items-center w-full mb-4">
              <div>
                <h2 className="text-2xl opacity-70">{formatDate(new Date())}</h2>
              </div>
              <button
                onClick={openDashboardConfig}
                className="btn btn-sm btn-ghost"
                aria-label="Configure Dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Configure Dashboard
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {widgets.filter(w => w.visible).sort((a, b) => a.order - b.order).map((widget) => (
            <div
              key={widget.id}
              className={`${getWidgetColSpan(widget.width)}`}
            >
              {widget.id === 'projects' && (
                <div className="card bg-base-100 shadow-xl border border-base-300 h-80">
                  <div className="card-body p-4 lg:p-8 flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center flex-shrink-0 mb-2">
                      <h2 className="card-title">My Current Projects</h2>
                      <label className="label cursor-pointer gap-2 p-0">
                        <span className="label-text text-xs">Show all</span>
                        <input
                          type="checkbox"
                          className="toggle toggle-xs toggle-primary"
                          checked={showProjectsWithNoTasks}
                          onChange={(e) => handleShowAllProjectsToggle(e.target.checked)}
                        />
                      </label>
                    </div>
                    {projectsLoading ? (
                      <div className="space-y-2">
                        <div className="skeleton h-12"></div>
                        <div className="skeleton h-12"></div>
                        <div className="skeleton h-12"></div>
                      </div>
                    ) : myProjects.length === 0 ? (
                      <p className="text-sm opacity-60">
                        {showProjectsWithNoTasks
                          ? 'No projects where you are a team member'
                          : 'No active projects with upcoming tasks'}
                      </p>
                    ) : (
                      <div className="overflow-y-auto flex-1 pr-2">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Project</th>
                              <th>Client</th>
                              <th className="text-right">Upcoming Tasks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myProjects.map((project) => (
                              <tr key={project.id} className="hover">
                                <td>
                                  <div className="font-semibold">
                                    {project.commonName || project.projectName}
                                  </div>
                                  {project.projectNumber && (
                                    <div className="text-xs opacity-60">{project.projectNumber}</div>
                                  )}
                                </td>
                                <td className="text-sm opacity-70">
                                  {project.clientName || 'Confidential'}
                                </td>
                                <td className="text-right">
                                  <span className="badge badge-primary">{project.taskCount}</span>
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

              {widget.id === 'tasks' && (
                <div className="card bg-base-100 shadow-xl border border-base-300 h-80">
                  <div className="card-body p-4 lg:p-8 flex flex-col h-full overflow-hidden">
                    <h2 className="card-title flex-shrink-0">My Upcoming Tasks</h2>
                    {tasksLoading ? (
                      <div className="space-y-2">
                        <div className="skeleton h-12"></div>
                        <div className="skeleton h-12"></div>
                        <div className="skeleton h-12"></div>
                      </div>
                    ) : upcomingTasks.length === 0 ? (
                      <p className="text-sm opacity-60">No upcoming tasks</p>
                    ) : (
                      <div className="overflow-y-auto flex-1 pr-2">
                        <div className="space-y-2">
                          {upcomingTasks.map((task) => (
                            <div
                              key={task.id}
                              className={`p-3 rounded-lg ${
                                task.completed ? 'opacity-50' : ''
                              } ${
                                task.taskType === 'Project Task'
                                  ? 'bg-primary text-primary-content'
                                  : task.taskType === 'Out of Office'
                                  ? 'bg-warning text-warning-content'
                                  : task.taskType === 'PTO'
                                  ? 'bg-info text-info-content'
                                  : task.taskType === 'Internal'
                                  ? 'bg-secondary text-secondary-content'
                                  : 'bg-error text-error-content'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={task.completed || false}
                                  onChange={() => handleToggleComplete(task.id, task.completed || false)}
                                  className="checkbox checkbox-sm mt-0.5 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                    <div className={`font-semibold text-sm ${task.completed ? 'line-through' : ''}`}>
                                      {task.taskType === 'Internal'
                                        ? task.internalTaskTypeName || 'Internal'
                                        : task.taskType === 'Project Task'
                                        ? task.projectCommonName || task.projectName
                                        : task.taskType}
                                    </div>
                                    <div className="text-xs opacity-70 flex-shrink-0 ml-2">{formatShortDate(task.taskDate)}</div>
                                  </div>
                                  {task.taskDescription && task.taskDescription !== task.taskType && (
                                    <div className={`text-xs opacity-80 ${task.completed ? 'line-through' : ''}`}>{task.taskDescription}</div>
                                  )}
                                  {task.clientName && (
                                    <div className="text-xs opacity-60 mt-1">{task.clientName}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {widget.id === 'milestones' && (
                <div className="card bg-base-100 shadow-xl border border-base-300 h-80">
                  <div className="card-body p-4 lg:p-8 flex flex-col h-full overflow-hidden">
                    <h2 className="card-title flex-shrink-0">Upcoming Deadlines/Milestones</h2>
                    {milestonesLoading ? (
                      <div className="space-y-2">
                        <div className="skeleton h-12"></div>
                        <div className="skeleton h-12"></div>
                        <div className="skeleton h-12"></div>
                      </div>
                    ) : upcomingMilestones.length === 0 ? (
                      <p className="text-sm opacity-60">No upcoming deadlines or milestones</p>
                    ) : (
                      <div className="overflow-y-auto flex-1 pr-2">
                        <div className="space-y-2">
                          {upcomingMilestones.map((milestone) => (
                            <div
                              key={milestone.id}
                              className={`p-3 ${
                                milestone.taskType === 'Deadline'
                                  ? 'bg-error text-error-content'
                                  : milestone.taskType === 'Internal Deadline'
                                  ? 'bg-warning text-warning-content'
                                  : 'bg-neutral text-neutral-content'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <div className="font-semibold text-sm">
                                  {milestone.taskType}
                                </div>
                                <div className="text-xs opacity-70 flex-shrink-0 ml-2">
                                  {formatShortDate(milestone.taskDate)}
                                </div>
                              </div>
                              {milestone.projectCommonName && (
                                <div className="text-xs font-medium opacity-90">
                                  {milestone.projectCommonName}
                                </div>
                              )}
                              {milestone.taskDescription && (
                                <div className="text-xs opacity-80 mt-1">
                                  {milestone.taskDescription}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {widget.id === 'team-tasks' && (
                <div className="card bg-base-100 shadow-xl border border-base-300">
                  <div className="card-body p-4 lg:p-8 flex flex-col">
                    <div className="flex justify-between items-center flex-shrink-0 mb-4">
                      <h2 className="card-title">
                        {isToday() ? "Today's" : formatShortDate(selectedDate.toISOString())} Tasks by Team Member
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn btn-sm btn-circle btn-ghost"
                          onClick={openUserSettings}
                          aria-label="Team member visibility settings"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                        <div className="divider divider-horizontal mx-0"></div>
                        <button
                          className="btn btn-sm btn-circle btn-ghost"
                          onClick={() => navigateDay('prev')}
                          aria-label="Previous day"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                            <polyline points="15 18 9 12 15 6"></polyline>
                          </svg>
                        </button>
                        <button
                          className="btn btn-sm btn-circle btn-ghost"
                          onClick={() => navigateDay('next')}
                          aria-label="Next day"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {loading ? (
                      <div className="flex gap-4 overflow-x-auto">
                        <div className="skeleton flex-1 min-w-[200px]" style={{ height: '288px' }}></div>
                        <div className="skeleton flex-1 min-w-[200px]" style={{ height: '288px' }}></div>
                        <div className="skeleton flex-1 min-w-[200px]" style={{ height: '288px' }}></div>
                        <div className="skeleton flex-1 min-w-[200px]" style={{ height: '288px' }}></div>
                      </div>
                    ) : (
                      <div className="flex gap-4 overflow-x-auto">
                        {getVisibleUsers().map(user => {
                          const userTasks = getTasksByUser(user.id);

                          return (
                            <div key={user.id} className="border border-base-300 rounded-lg p-4 flex-1 min-w-[200px]">
                              <h3 className="font-semibold text-lg mb-3">{user.name}</h3>
                              <div className="flex flex-col gap-2">
                                {Array.from({ length: 4 }).map((_, rowIndex) => {
                                  // Find task that starts at this rowIndex
                                  const task = userTasks.find(t => t.rowIndex === rowIndex);

                                  // Check if this row is occupied by a task that started earlier
                                  const isOccupied = userTasks.some(t =>
                                    t.rowIndex < rowIndex && t.rowIndex + t.rowSpan > rowIndex
                                  );

                                  if (isOccupied) {
                                    return null; // Skip rendering, this row is part of a multi-row task
                                  }

                                  if (task) {
                                    // Calculate height: base height * rowSpan + gap between rows * (rowSpan - 1)
                                    const baseHeight = 48;
                                    const gap = 8; // 0.5rem = 8px
                                    const totalHeight = (baseHeight * task.rowSpan) + (gap * (task.rowSpan - 1));

                                    return (
                                      <div
                                        key={rowIndex}
                                        className={`rounded px-3 py-2 text-sm ${
                                          task.taskType === 'Project Task'
                                            ? 'bg-primary text-primary-content'
                                            : task.taskType === 'Out of Office'
                                            ? 'bg-warning text-warning-content'
                                            : task.taskType === 'PTO'
                                            ? 'bg-info text-info-content'
                                            : task.taskType === 'Internal'
                                            ? 'bg-secondary text-secondary-content'
                                            : 'bg-error text-error-content'
                                        }`}
                                        style={{
                                          height: `${totalHeight}px`,
                                          minHeight: `${totalHeight}px`
                                        }}
                                      >
                                        <div className="font-semibold">
                                          {task.taskType === 'Internal'
                                            ? task.internalTaskTypeName || 'Internal'
                                            : task.projectCommonName || task.projectName || task.taskType}
                                        </div>
                                        {task.taskDescription && task.taskDescription !== task.taskType && (
                                          <div className="text-xs opacity-90 mt-1">
                                            {task.taskDescription}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={rowIndex}
                                      className="border border-dashed border-base-300 rounded px-3 py-2 text-sm opacity-30 text-center flex items-center justify-center"
                                      style={{ height: '48px', minHeight: '48px' }}
                                    >
                                      —
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Configuration Modal */}
      {showDashboardConfig && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={cancelDashboardConfig}
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-4">Configure Dashboard</h3>
            <p className="text-sm opacity-70 mb-4">
              Drag widgets to reorder them. Select widget width from the dropdown. Toggle visibility to show/hide widgets.
            </p>

            <div className="space-y-2">
              {tempWidgets.map((widget) => (
                <div
                  key={widget.id}
                  draggable
                  onDragStart={() => handleWidgetDragStart(widget.id)}
                  onDragOver={(e) => handleWidgetDragOver(e, widget.id)}
                  onDragEnd={handleWidgetDragEnd}
                  className={`flex items-center justify-between p-3 rounded-lg border border-base-300 bg-base-100 cursor-move ${
                    draggedWidget === widget.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-5 opacity-50">
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="3" y1="15" x2="21" y2="15"></line>
                    </svg>
                    <div className="font-medium">{widget.name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      className="select select-sm select-bordered"
                      value={widget.width}
                      onChange={(e) => updateWidgetWidth(widget.id, e.target.value as 'full' | '1/2' | '1/3' | '1/4')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="full">Full Width</option>
                      <option value="1/2">1/2 Width</option>
                      <option value="1/3">1/3 Width</option>
                      <option value="1/4">1/4 Width</option>
                    </select>
                    <label className="cursor-pointer">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={widget.visible}
                        onChange={() => toggleWidgetVisibility(widget.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-action">
              <button className="btn" onClick={cancelDashboardConfig}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveDashboardConfig}>
                Save
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={cancelDashboardConfig}>close</button>
          </form>
        </dialog>
      )}

      {/* User Settings Modal */}
      {showUserSettings && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setShowUserSettings(false)}
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-4">Manage Team Members</h3>
            <p className="text-sm opacity-70 mb-4">
              Drag team members to reorder them. Toggle visibility to show/hide team members in the dashboard.
            </p>

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
              <button className="btn" onClick={cancelSettings}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveSettings}>
                Save
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={cancelSettings}>close</button>
          </form>
        </dialog>
      )}
    </Sidebar>
  );
}
