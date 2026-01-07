'use client';

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

interface UserDisplay {
  id: number;
  name: string;
  visible: boolean;
  order: number;
  billingRate: number;
}

interface TeamTasksWidgetProps {
  todaysTasks: PlanningTask[];
  users: UserDisplay[];
  selectedDate: Date;
  loading: boolean;
  onOpenUserSettings: () => void;
  onNavigateDay: (direction: 'prev' | 'next') => void;
}

export default function TeamTasksWidget({
  todaysTasks,
  users,
  selectedDate,
  loading,
  onOpenUserSettings,
  onNavigateDay
}: TeamTasksWidgetProps) {
  const getTasksByUser = (userId: number) => {
    return todaysTasks.filter(task => task.userId === userId);
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300">
      <div className="card-body p-4 lg:p-8 flex flex-col">
        <div className="flex justify-between items-center flex-shrink-0 mb-4">
          <h2 className="card-title">
            {isToday() ? "Today's" : formatShortDate(selectedDate.toISOString())} Tasks by Team Member
          </h2>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onOpenUserSettings}
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
              onClick={() => onNavigateDay('prev')}
              aria-label="Previous day"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor" className="size-4">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              className="btn btn-sm btn-circle btn-ghost"
              onClick={() => onNavigateDay('next')}
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
                                ? 'bg-secondary text-secondary-content'
                                : task.taskType === 'PTO'
                                ? 'bg-info text-info-content'
                                : task.taskType === 'Internal'
                                ? 'bg-success text-success-content'
                                : 'bg-accent text-accent-content'
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
  );
}
