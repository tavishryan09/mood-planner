import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function checkTasks() {
  console.log('Checking P555 tasks...\n');

  // Get project ID for P555
  const projects = await sql`
    SELECT id, project_number, project_name
    FROM projects
    WHERE project_number = 'P555'
  `;

  if (projects.length === 0) {
    console.log('No project found with number P555');
    return;
  }

  const project = projects[0];
  console.log(`Project: ${project.project_number} - ${project.project_name}`);
  console.log(`Project ID: ${project.id}\n`);

  // Get all tasks for this project
  const tasks = await sql`
    SELECT id, task_type, task_description, start_date, end_date
    FROM planning_tasks
    WHERE project_id = ${project.id}
    ORDER BY start_date
  `;

  console.log(`Total tasks: ${tasks.length}\n`);

  tasks.forEach((task, index) => {
    console.log(`Task ${index + 1}:`);
    console.log(`  Type: ${task.task_type}`);
    console.log(`  Description: ${task.task_description}`);
    console.log(`  Start: ${task.start_date}`);
    console.log(`  End: ${task.end_date}`);
    console.log('');
  });

  const projectTasks = tasks.filter(t => t.task_type === 'Project Task');
  console.log(`Project Tasks only: ${projectTasks.length}`);
  console.log(`Expected hours (all tasks × 2): ${tasks.length * 2}`);
  console.log(`Current calculation (Project Tasks only × 2): ${projectTasks.length * 2}`);
}

checkTasks();
