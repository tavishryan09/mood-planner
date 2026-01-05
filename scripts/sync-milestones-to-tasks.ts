import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function syncMilestonesToTasks() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Syncing project milestones and deadlines to milestone_tasks table...\n');

  try {
    // Sync project_milestones to milestone_tasks
    console.log('Syncing project_milestones...');
    const milestones = await sql`
      SELECT
        pm.project_id,
        pm.milestone_name,
        pm.due_date,
        p.project_name
      FROM project_milestones pm
      LEFT JOIN projects p ON pm.project_id = p.id
    `;

    for (const milestone of milestones) {
      await sql`
        INSERT INTO milestone_tasks (
          project_id,
          task_description,
          task_type,
          task_date,
          row_index
        )
        VALUES (
          ${milestone.project_id},
          ${milestone.milestone_name},
          'Milestone',
          ${milestone.due_date},
          0
        )
        ON CONFLICT (task_date, row_index) DO UPDATE
        SET
          project_id = ${milestone.project_id},
          task_description = ${milestone.milestone_name},
          task_type = 'Milestone'
      `;
    }
    console.log(`✓ Synced ${milestones.length} project milestones`);

    // Sync project deadlines to milestone_tasks
    console.log('\nSyncing project deadlines...');
    const deadlines = await sql`
      SELECT id, project_name, deadline
      FROM projects
      WHERE deadline IS NOT NULL
    `;

    for (const project of deadlines) {
      await sql`
        INSERT INTO milestone_tasks (
          project_id,
          task_description,
          task_type,
          task_date,
          row_index
        )
        VALUES (
          ${project.id},
          ${project.project_name},
          'Deadline',
          ${project.deadline},
          0
        )
        ON CONFLICT (task_date, row_index) DO UPDATE
        SET
          project_id = ${project.id},
          task_description = ${project.project_name},
          task_type = 'Deadline'
      `;
    }
    console.log(`✓ Synced ${deadlines.length} project deadlines`);

    // Sync project internal deadlines to milestone_tasks
    console.log('\nSyncing internal deadlines...');
    const internalDeadlines = await sql`
      SELECT id, project_name, internal_deadline
      FROM projects
      WHERE internal_deadline IS NOT NULL
    `;

    for (const project of internalDeadlines) {
      await sql`
        INSERT INTO milestone_tasks (
          project_id,
          task_description,
          task_type,
          task_date,
          row_index
        )
        VALUES (
          ${project.id},
          ${project.project_name},
          'Internal Deadline',
          ${project.internal_deadline},
          1
        )
        ON CONFLICT (task_date, row_index) DO UPDATE
        SET
          project_id = ${project.id},
          task_description = ${project.project_name},
          task_type = 'Internal Deadline'
      `;
    }
    console.log(`✓ Synced ${internalDeadlines.length} internal deadlines`);

    console.log('\n✅ Sync completed successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error syncing milestones:', error);
    process.exit(1);
  }
}

syncMilestonesToTasks().catch(console.error);
