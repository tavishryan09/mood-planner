import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id, milestoneId } = await params;
    const body = await request.json();
    const { milestoneName, description, dueDate, status } = body;

    // Get old due date before updating
    const oldMilestone = await sql`
      SELECT due_date as "dueDate", milestone_name as "milestoneName"
      FROM project_milestones
      WHERE id = ${milestoneId} AND project_id = ${id}
    `;

    const result = await sql`
      UPDATE project_milestones
      SET
        milestone_name = ${milestoneName},
        description = ${description || null},
        due_date = ${dueDate},
        status = ${status},
        updated_at = NOW()
      WHERE id = ${milestoneId} AND project_id = ${id}
      RETURNING
        id,
        milestone_name as "milestoneName",
        description,
        due_date as "dueDate",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    const updatedMilestone = result[0];

    // Sync changes to milestone_tasks table
    if (oldMilestone.length > 0) {
      const oldDueDate = oldMilestone[0].dueDate;
      const oldMilestoneName = oldMilestone[0].milestoneName;

      // If due date changed, delete old entry and create new one
      if (oldDueDate !== dueDate) {
        await sql`
          DELETE FROM milestone_tasks
          WHERE project_id = ${id}
            AND task_type = 'Milestone'
            AND task_date = ${oldDueDate}
            AND task_description = ${oldMilestoneName}
        `;

        await sql`
          INSERT INTO milestone_tasks (
            project_id,
            task_description,
            task_type,
            task_date,
            row_index
          )
          VALUES (
            ${id},
            ${milestoneName},
            'Milestone',
            ${dueDate},
            0
          )
          ON CONFLICT (task_date, row_index) DO UPDATE
          SET
            project_id = ${id},
            task_description = ${milestoneName},
            task_type = 'Milestone'
        `;
      } else {
        // If only name changed, update existing entry
        await sql`
          UPDATE milestone_tasks
          SET task_description = ${milestoneName}
          WHERE project_id = ${id}
            AND task_type = 'Milestone'
            AND task_date = ${dueDate}
        `;
      }
    }

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    console.error('Error updating milestone:', error);
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id, milestoneId } = await params;

    // Get milestone details before deleting
    const milestone = await sql`
      SELECT due_date as "dueDate", milestone_name as "milestoneName"
      FROM project_milestones
      WHERE id = ${milestoneId} AND project_id = ${id}
    `;

    await sql`
      DELETE FROM project_milestones
      WHERE id = ${milestoneId} AND project_id = ${id}
    `;

    // Also delete from milestone_tasks table
    if (milestone.length > 0) {
      await sql`
        DELETE FROM milestone_tasks
        WHERE project_id = ${id}
          AND task_type = 'Milestone'
          AND task_date = ${milestone[0].dueDate}
          AND task_description = ${milestone[0].milestoneName}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json(
      { error: 'Failed to delete milestone' },
      { status: 500 }
    );
  }
}
