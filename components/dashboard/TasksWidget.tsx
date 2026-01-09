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

interface TasksWidgetProps {
  tasks: PlanningTask[];
  loading: boolean;
  onToggleComplete: (taskId: number, currentCompleted: boolean) => void;
}

export default function TasksWidget({
  tasks,
  loading,
  onToggleComplete
}: TasksWidgetProps) {
  const formatShortDate = (dateString: string) => {
    // Extract YYYY-MM-DD from ISO string to avoid timezone conversion
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    // Create date using local timezone (month is 0-indexed)
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300 h-80">
      <div className="card-body p-4 lg:p-8 flex flex-col h-full overflow-hidden">
        <h2 className="card-title flex-shrink-0">My Upcoming Tasks</h2>
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-12"></div>
            <div className="skeleton h-12"></div>
            <div className="skeleton h-12"></div>
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm opacity-60">No upcoming tasks</p>
        ) : (
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg ${
                    task.completed ? 'opacity-50' : ''
                  } ${
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
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed || false}
                      onChange={() => onToggleComplete(task.id, task.completed || false)}
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
  );
}
