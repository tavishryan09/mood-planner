import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function checkAllTasks() {
  console.log('Checking all planning tasks around Jan 5, 2026...\n');

  const tasks = await sql`
    SELECT
      id,
      user_id,
      project_id,
      task_date,
      row_span,
      task_type,
      task_description
    FROM planning_tasks
    WHERE task_date >= '2026-01-01' AND task_date <= '2026-01-07'
    ORDER BY task_date, user_id
  `;

  console.log(`Total tasks: ${tasks.length}\n`);

  // Group by user
  const tasksByUser = new Map();
  for (const task of tasks) {
    if (!tasksByUser.has(task.user_id)) {
      tasksByUser.set(task.user_id, []);
    }
    tasksByUser.get(task.user_id).push(task);
  }

  // Get user names
  const userIds = Array.from(tasksByUser.keys());
  for (const userId of userIds) {
    const users = await sql`SELECT name FROM users WHERE id = ${userId}`;
    const userName = users[0]?.name || 'Unknown';

    console.log(`User: ${userName} (ID: ${userId})`);
    const userTasks = tasksByUser.get(userId);

    userTasks.forEach(task => {
      const projectInfo = task.project_id ? `Project ID: ${task.project_id}` : 'No project';
      console.log(`  - [${task.task_type}] ${task.task_description}`);
      console.log(`    Date: ${task.task_date}, Row Span: ${task.row_span || 1}, ${projectInfo}`);
    });
    console.log('');
  }
}

checkAllTasks();
