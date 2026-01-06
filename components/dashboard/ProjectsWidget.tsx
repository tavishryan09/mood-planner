'use client';

interface Project {
  id: number;
  projectNumber?: string;
  projectName: string;
  commonName?: string;
  clientName?: string;
  taskCount: number;
}

interface ProjectsWidgetProps {
  projects: Project[];
  loading: boolean;
  showProjectsWithNoTasks: boolean;
  onToggleShowAll: (checked: boolean) => void;
}

export default function ProjectsWidget({
  projects,
  loading,
  showProjectsWithNoTasks,
  onToggleShowAll
}: ProjectsWidgetProps) {
  return (
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
              onChange={(e) => onToggleShowAll(e.target.checked)}
            />
          </label>
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-12"></div>
            <div className="skeleton h-12"></div>
            <div className="skeleton h-12"></div>
          </div>
        ) : projects.length === 0 ? (
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
                {projects.map((project) => (
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
  );
}
