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
  internalDeadline?: string;
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

  // Calculate date range
  const allDates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
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

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold mb-3 opacity-70">Gantt Chart Timeline</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Timeline Header */}
          <div className="flex border-b border-base-300 pb-2 mb-2">
            <div className="w-48 font-semibold text-sm">Task</div>
            <div className="flex-1 flex justify-between text-xs opacity-60">
              {timelineLabels.map((label, idx) => (
                <span key={idx}>{label}</span>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          {tasks.map((task, index) => {
            const taskStart = new Date(task.startDate);
            const taskEnd = new Date(task.endDate);
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
  );
}
