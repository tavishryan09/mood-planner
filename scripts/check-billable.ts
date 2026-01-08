import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL as string);

async function calculateEstimatedBillable() {
  const projectId = 17;
  
  // Get project details
  const projectResult = await sql`
    SELECT
      id,
      project_name,
      billing_rate as "billingRate",
      use_team_rates as "useTeamRates",
      adjustment_date as "adjustmentDate"
    FROM projects
    WHERE id = ${projectId}
  `;
  
  const project = projectResult[0];
  console.log('Project:', JSON.stringify(project, null, 2));
  
  // Get tasks
  const tasks = await sql`
    SELECT
      pt.user_id as "userId",
      pt.row_span as "rowSpan",
      COALESCE(ptr.billing_rate, u.billing_rate, 0) as "billingRate",
      u.name as "userName",
      u.billing_rate as "userBillingRate",
      ptr.billing_rate as "teamRate"
    FROM planning_tasks pt
    LEFT JOIN users u ON pt.user_id = u.id
    LEFT JOIN project_team_rates ptr ON ptr.project_id = ${projectId} AND ptr.user_id = pt.user_id
    WHERE pt.project_id = ${projectId}
      AND pt.task_type IN ('Project Task', 'Out of Office')
  `;
  
  console.log('Tasks:', JSON.stringify(tasks, null, 2));
  
  // Calculate
  let totalEstimatedBillable = 0;
  for (const task of tasks) {
    const hours = Number(task.rowSpan || 1) * 2;
    const rate = Number(task.billingRate || 0);
    const billable = hours * rate;
    console.log(`  Task: user=${task.userName}, rowSpan=${task.rowSpan}, hours=${hours}, rate=${rate}, billable=${billable}`);
    totalEstimatedBillable += billable;
  }
  
  console.log('Total Estimated Billable:', totalEstimatedBillable);
}

calculateEstimatedBillable().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
