import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function checkTasks() {
  console.log('Checking all projects and tasks...\n');

  // Get all projects
  const projects = await sql`
    SELECT id, project_number, project_name
    FROM projects
    ORDER BY project_number
  `;

  console.log(`Total projects: ${projects.length}\n`);

  for (const project of projects) {
    // Get tasks for this project
    const tasks = await sql`
      SELECT id, task_type, task_description, start_date, end_date
      FROM planning_tasks
      WHERE project_id = ${project.id}
      ORDER BY start_date
    `;

    if (tasks.length > 0) {
      console.log(`\n${project.project_number} - ${project.project_name} (ID: ${project.id})`);
      console.log(`Tasks: ${tasks.length}`);

      tasks.forEach((task, index) => {
        console.log(`  ${index + 1}. [${task.task_type}] ${task.task_description} (${task.start_date} to ${task.end_date})`);
      });

      const projectTasks = tasks.filter(t => t.task_type === 'Project Task');
      console.log(`  → Project Tasks: ${projectTasks.length}, All Tasks: ${tasks.length}`);
      console.log(`  → Hours (Project Tasks only × 2): ${projectTasks.length * 2}h`);
      console.log(`  → Hours (All Tasks × 2): ${tasks.length * 2}h`);
    }
  }
}

checkTasks();
