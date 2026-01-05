import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const milestones = await sql`
      SELECT
        id,
        milestone_name as "milestoneName",
        description,
        due_date as "dueDate",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM project_milestones
      WHERE project_id = ${id}
      ORDER BY due_date ASC
    `;

    return NextResponse.json(milestones);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch milestones' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { milestoneName, description, dueDate, status } = body;

    const result = await sql`
      INSERT INTO project_milestones (
        project_id,
        milestone_name,
        description,
        due_date,
        status
      )
      VALUES (
        ${id},
        ${milestoneName},
        ${description || null},
        ${dueDate},
        ${status || 'pending'}
      )
      RETURNING
        id,
        milestone_name as "milestoneName",
        description,
        due_date as "dueDate",
        status,
        created_at as "createdAt"
    `;

    const newMilestone = result[0];

    // Also add to milestone_tasks table for planning calendar
    try {
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
    } catch (milestoneTaskError) {
      console.error('Error syncing to milestone_tasks:', milestoneTaskError);
      // Don't fail the request if milestone_tasks sync fails
    }

    return NextResponse.json(newMilestone);
  } catch (error) {
    console.error('Error creating milestone:', error);
    return NextResponse.json(
      { error: 'Failed to create milestone' },
      { status: 500 }
    );
  }
}
