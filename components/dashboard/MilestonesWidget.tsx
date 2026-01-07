'use client';

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

interface MilestonesWidgetProps {
  milestones: MilestoneTask[];
  loading: boolean;
}

export default function MilestonesWidget({
  milestones,
  loading
}: MilestonesWidgetProps) {
  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300 h-80">
      <div className="card-body p-4 lg:p-8 flex flex-col h-full overflow-hidden">
        <h2 className="card-title flex-shrink-0">Upcoming Deadlines/Milestones</h2>
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-12"></div>
            <div className="skeleton h-12"></div>
            <div className="skeleton h-12"></div>
          </div>
        ) : milestones.length === 0 ? (
          <p className="text-sm opacity-60">No upcoming deadlines or milestones</p>
        ) : (
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`p-3 ${
                    milestone.taskType === 'Deadline'
                      ? 'bg-error text-error-content'
                      : milestone.taskType === 'Internal Deadline'
                      ? 'bg-warning text-warning-content'
                      : 'bg-success text-success-content'
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
  );
}
