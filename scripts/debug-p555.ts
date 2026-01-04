import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function debugP555() {
  console.log('Debugging P555 hours calculation...\n');

  // Find project by common name or project name containing P555
  const projects = await sql`
    SELECT id, project_number, project_name, common_name
    FROM projects
    WHERE project_number LIKE '%555%'
       OR project_name LIKE '%P555%'
       OR common_name LIKE '%P555%'
  `;

  console.log(`Found ${projects.length} project(s) matching P555:\n`);

  for (const project of projects) {
    console.log(`Project ID: ${project.id}`);
    console.log(`Project Number: ${project.project_number}`);
    console.log(`Project Name: ${project.project_name}`);
    console.log(`Common Name: ${project.common_name}`);
    console.log('---');

    // Get all tasks for this project
    const tasks = await sql`
      SELECT
        id,
        user_id,
        task_date,
        row_span,
        task_type,
        task_description
      FROM planning_tasks
      WHERE project_id = ${project.id}
      ORDER BY task_date
    `;

    console.log(`\nTotal tasks for this project: ${tasks.length}`);
    console.log(`Expected hours (${tasks.length} tasks × 2): ${tasks.length * 2}h\n`);

    if (tasks.length > 0) {
      console.log('Task details:');
      tasks.forEach((task, index) => {
        console.log(`  ${index + 1}. [${task.task_type}] ${task.task_description}`);
        console.log(`     Date: ${task.task_date}, Row Span: ${task.row_span || 1}`);
      });
    }
    console.log('\n');
  }
}

debugP555();
