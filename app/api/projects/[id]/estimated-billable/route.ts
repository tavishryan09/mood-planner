import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get project details to check billing rate type and adjustment date
    const projectResult = await sql`
      SELECT
        billing_rate as "billingRate",
        use_team_rates as "useTeamRates",
        adjustment_date as "adjustmentDate"
      FROM projects
      WHERE id = ${id}
    `;

    if (projectResult.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = projectResult[0];
    const useTeamRates = project.useTeamRates;
    const projectBillingRate = Number(project.billingRate || 0);
    const adjustmentDate = project.adjustmentDate;

    let totalEstimatedBillable = 0;

    if (useTeamRates) {
      // Calculate based on individual team member rates
      // Get all tasks for this project with user billing rates
      // If adjustment date is set, only include tasks after that date
      const tasks = adjustmentDate
        ? await sql`
            SELECT
              pt.user_id as "userId",
              pt.row_span as "rowSpan",
              COALESCE(ptr.billing_rate, u.billing_rate, 0) as "billingRate"
            FROM planning_tasks pt
            LEFT JOIN users u ON pt.user_id = u.id
            LEFT JOIN project_team_rates ptr ON ptr.project_id = ${id} AND ptr.user_id = pt.user_id
            WHERE pt.project_id = ${id}
              AND pt.task_type IN ('Project Task', 'Out of Office')
              AND pt.task_date > ${adjustmentDate}
          `
        : await sql`
            SELECT
              pt.user_id as "userId",
              pt.row_span as "rowSpan",
              COALESCE(ptr.billing_rate, u.billing_rate, 0) as "billingRate"
            FROM planning_tasks pt
            LEFT JOIN users u ON pt.user_id = u.id
            LEFT JOIN project_team_rates ptr ON ptr.project_id = ${id} AND ptr.user_id = pt.user_id
            WHERE pt.project_id = ${id}
              AND pt.task_type IN ('Project Task', 'Out of Office')
          `;

      // Calculate total: each row_span unit = 2 hours
      for (const task of tasks) {
        const hours = Number(task.rowSpan || 1) * 2;
        const rate = Number(task.billingRate || 0);
        totalEstimatedBillable += hours * rate;
      }
    } else {
      // Use standard project billing rate
      // Get total row_span for all tasks
      // If adjustment date is set, only include tasks after that date
      const tasksResult = adjustmentDate
        ? await sql`
            SELECT
              COALESCE(SUM(row_span), 0) as "totalRowSpan"
            FROM planning_tasks
            WHERE project_id = ${id}
              AND task_type IN ('Project Task', 'Out of Office')
              AND task_date > ${adjustmentDate}
          `
        : await sql`
            SELECT
              COALESCE(SUM(row_span), 0) as "totalRowSpan"
            FROM planning_tasks
            WHERE project_id = ${id}
              AND task_type IN ('Project Task', 'Out of Office')
          `;

      const totalRowSpan = Number(tasksResult[0]?.totalRowSpan || 0);
      const totalHours = totalRowSpan * 2;
      totalEstimatedBillable = totalHours * projectBillingRate;
    }

    return NextResponse.json({
      projectId: parseInt(id),
      estimatedBillable: totalEstimatedBillable,
      useTeamRates
    });
  } catch (error) {
    console.error('Error calculating estimated billable:', error);
    return NextResponse.json(
      { error: 'Failed to calculate estimated billable' },
      { status: 500 }
    );
  }
}
