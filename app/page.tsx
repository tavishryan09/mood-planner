'use client';

import Sidebar from '@/components/Sidebar';
import { useState } from 'react';
import DashboardConfigModal from '@/components/dashboard/DashboardConfigModal';
import UserSettingsModal from '@/components/dashboard/UserSettingsModal';
import ProjectsWidget from '@/components/dashboard/ProjectsWidget';
import TasksWidget from '@/components/dashboard/TasksWidget';
import MilestonesWidget from '@/components/dashboard/MilestonesWidget';
import TeamTasksWidget from '@/components/dashboard/TeamTasksWidget';
import { useDashboardData } from '@/hooks/dashboard/useDashboardData';
import { useWidgetManagement } from '@/hooks/dashboard/useWidgetManagement';
import { useUserDisplaySettings } from '@/hooks/dashboard/useUserDisplaySettings';

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

  // Widget management
  const {
    widgets,
    setWidgets,
    showDashboardConfig,
    tempWidgets,
    draggedWidget,
    showProjectsWithNoTasks,
    setShowProjectsWithNoTasks,
    openDashboardConfig,
    saveDashboardConfig,
    handleShowAllProjectsToggle,
    cancelDashboardConfig,
    handleWidgetDragStart,
    handleWidgetDragOver,
    handleWidgetDragEnd,
    updateWidgetWidth,
    toggleWidgetVisibility,
    getWidgetColSpan
  } = useWidgetManagement([
    { id: 'projects', name: 'My Current Projects', width: '1/3', order: 0, visible: true },
    { id: 'tasks', name: 'My Upcoming Tasks', width: '1/3', order: 1, visible: true },
    { id: 'milestones', name: 'Upcoming Deadlines/Milestones', width: '1/3', order: 2, visible: true },
    { id: 'team-tasks', name: 'Tasks by Team Member', width: 'full', order: 3, visible: true }
  ]);

  // Dashboard data
  const {
    todaysTasks,
    users,
    setUsers,
    loading,
    myProjects,
    upcomingTasks,
    upcomingMilestones,
    projectsLoading,
    tasksLoading,
    milestonesLoading,
    handleToggleComplete
  } = useDashboardData(selectedDate, showProjectsWithNoTasks, setWidgets, setShowProjectsWithNoTasks);

  // User display settings
  const {
    showUserSettings,
    tempUsers,
    draggedUser,
    openUserSettings: openUserSettingsModal,
    saveSettings,
    cancelSettings,
    toggleUserVisibility,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  } = useUserDisplaySettings();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
                    <ProjectsWidget
                      projects={myProjects}
                      loading={projectsLoading}
                      showProjectsWithNoTasks={showProjectsWithNoTasks}
                      onToggleShowAll={handleShowAllProjectsToggle}
                    />
                  )}

                  {widget.id === 'tasks' && (
                    <TasksWidget
                      tasks={upcomingTasks}
                      loading={tasksLoading}
                      onToggleComplete={handleToggleComplete}
                    />
                  )}

                  {widget.id === 'milestones' && (
                    <MilestonesWidget
                      milestones={upcomingMilestones}
                      loading={milestonesLoading}
                    />
                  )}

                  {widget.id === 'team-tasks' && (
                    <TeamTasksWidget
                      todaysTasks={todaysTasks}
                      users={users}
                      selectedDate={selectedDate}
                      loading={loading}
                      onOpenUserSettings={() => openUserSettingsModal(users)}
                      onNavigateDay={navigateDay}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DashboardConfigModal
        show={showDashboardConfig}
        tempWidgets={tempWidgets}
        draggedWidget={draggedWidget}
        onClose={cancelDashboardConfig}
        onSave={saveDashboardConfig}
        onWidgetDragStart={handleWidgetDragStart}
        onWidgetDragOver={handleWidgetDragOver}
        onWidgetDragEnd={handleWidgetDragEnd}
        onUpdateWidgetWidth={updateWidgetWidth}
        onToggleWidgetVisibility={toggleWidgetVisibility}
      />

      <UserSettingsModal
        show={showUserSettings}
        tempUsers={tempUsers}
        draggedUser={draggedUser}
        onClose={cancelSettings}
        onSave={() => saveSettings(users, setUsers)}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onToggleVisibility={toggleUserVisibility}
      />
    </Sidebar>
  );
}
