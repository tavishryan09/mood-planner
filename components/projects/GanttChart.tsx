'use client';

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

interface Milestone {
  id: number;
  milestoneName: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'missed';
  createdAt: string;
  updatedAt: string;
}

interface Project {
  deadline?: string;
  deadlineTitle?: string;
  deadlineDescription?: string;
  internalDeadline?: string;
  internalDeadlineTitle?: string;
  internalDeadlineDescription?: string;
}

interface GanttChartProps {
  tasks: Task[];
  milestones: Milestone[];
  project: Project | null;
  formatDate: (dateString: string) => string;
}

export default function GanttChart({ tasks, milestones, project, formatDate }: GanttChartProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          <path d="M8 18h.01"></path>
          <path d="M12 18h.01"></path>
          <path d="M16 18h.01"></path>
        </svg>
        <p className="text-base-content/60">No tasks created yet. Click "Add Task" or "Add Deadline" to create a Gantt chart for your project.</p>
      </div>
    );
  }

  // Parse date without timezone conversion
  const parseDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Calculate date range
  const allDates = tasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  // Generate timeline header labels
  const daysDiff = totalDays;
  const timelineLabels: string[] = [];
  for (let i = 0; i <= daysDiff; i += Math.ceil(daysDiff / 6)) {
    const date = new Date(minDate.getTime() + i * 24 * 60 * 60 * 1000);
    timelineLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  // Calculate today's position
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = Math.ceil((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  const todayPercent = (todayOffset / totalDays) * 100;
  const showTodayMarker = todayPercent >= 0 && todayPercent <= 100;

  // Calculate deadline positions
  const getDeadlinePercent = (deadlineStr: string) => {
    const deadlineDate = parseDate(deadlineStr);
    const deadlineOffset = Math.ceil((deadlineDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return (deadlineOffset / totalDays) * 100;
  };

  const projectDeadlinePercent = project?.deadline ? getDeadlinePercent(project.deadline) : null;
  const internalDeadlinePercent = project?.internalDeadline ? getDeadlinePercent(project.internalDeadline) : null;
  const showProjectDeadline = projectDeadlinePercent !== null && projectDeadlinePercent >= 0 && projectDeadlinePercent <= 100;
  const showInternalDeadline = internalDeadlinePercent !== null && internalDeadlinePercent >= 0 && internalDeadlinePercent <= 100;

  // Calculate milestone positions
  const milestonePositions = milestones.map(milestone => {
    const percent = getDeadlinePercent(milestone.dueDate);
    return {
      ...milestone,
      percent,
      show: percent >= 0 && percent <= 100
    };
  }).filter(m => m.show);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold mb-3 opacity-70">Gantt Chart Timeline</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Timeline Header */}
          <div className="flex border-b border-base-300 pb-2 mb-2 pt-6">
            <div className="w-48 font-semibold text-sm">Task</div>
            <div className="flex-1 relative">
              {/* Milestone indicators above timeline */}
              {milestonePositions.map(milestone => (
                <div
                  key={`milestone-label-${milestone.id}`}
                  className="absolute -top-6 h-6 flex items-center justify-center"
                  style={{ left: `${milestone.percent}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="text-[10px] font-bold text-secondary whitespace-nowrap">{milestone.milestoneName || milestone.description || 'Milestone'}</span>
                </div>
              ))}

              {/* Deadline indicators above timeline */}
              {showProjectDeadline && (
                <div
                  className="absolute -top-6 h-6 flex items-center justify-center"
                  style={{ left: `${projectDeadlinePercent}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="text-[10px] font-bold text-error whitespace-nowrap">{project?.deadlineTitle || 'Deadline'}</span>
                </div>
              )}
              {showInternalDeadline && (
                <div
                  className="absolute -top-6 h-6 flex items-center justify-center"
                  style={{ left: `${internalDeadlinePercent}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="text-[10px] font-bold text-warning whitespace-nowrap">{project?.internalDeadlineTitle || 'Internal'}</span>
                </div>
              )}

              <div className="flex justify-between text-xs opacity-60">
                {timelineLabels.map((label, idx) => (
                  <span key={idx}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Task Rows Container with continuous lines */}
          <div className="relative">
            {/* Continuous milestone lines that span all rows */}
            {milestonePositions.map(milestone => (
              <div
                key={`milestone-line-${milestone.id}`}
                className="absolute top-0 bottom-0 w-px bg-secondary pointer-events-none z-10"
                style={{ left: `calc(12rem + (100% - 12rem) * ${milestone.percent} / 100)` }}
                title={`Milestone: ${milestone.milestoneName || milestone.description || 'Milestone'}`}
              />
            ))}

            {/* Continuous deadline lines that span all rows */}
            {showProjectDeadline && (
              <div
                className="absolute top-0 bottom-0 w-px bg-error pointer-events-none z-10"
                style={{ left: `calc(12rem + (100% - 12rem) * ${projectDeadlinePercent} / 100)` }}
                title="Project Deadline"
              />
            )}
            {showInternalDeadline && (
              <div
                className="absolute top-0 bottom-0 w-px bg-warning pointer-events-none z-10"
                style={{ left: `calc(12rem + (100% - 12rem) * ${internalDeadlinePercent} / 100)` }}
                title="Internal Deadline"
              />
            )}

            {/* Task Rows */}
            {tasks.map((task, index) => {
            const taskStart = parseDate(task.startDate);
            const taskEnd = parseDate(task.endDate);
            const startOffset = Math.ceil((taskStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
            const taskDuration = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));

            const leftPercent = (startOffset / totalDays) * 100;
            const widthPercent = (taskDuration / totalDays) * 100;

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
    </div>
  );
}
