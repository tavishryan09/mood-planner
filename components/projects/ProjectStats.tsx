'use client';

interface Project {
  projectValue?: number;
  estimatedBillable?: number;
  totalHours?: number;
  hoursThisWeek?: number;
  hoursThisMonth?: number;
  hoursThisQuarter?: number;
  billingRate?: number;
  useTeamRates?: boolean;
  archived?: boolean;
  clientName?: string;
  commonName?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectStatsProps {
  project: Project;
  formatCurrency: (value?: number) => string;
  formatDate: (dateString: string) => string;
}

export default function ProjectStats({ project, formatCurrency, formatDate }: ProjectStatsProps) {
  const billablePercent = project.projectValue && project.estimatedBillable
    ? Math.round((project.estimatedBillable / project.projectValue) * 100)
    : 0;

  return (
    <>
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
    </>
  );
}
