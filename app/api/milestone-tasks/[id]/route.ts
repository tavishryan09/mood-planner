import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { syncMilestoneToAllTeamMembers, deleteMilestoneFromAllTeamMembers } from '@/lib/outlook-sync';
import { planningEvents } from '@/lib/planning-events';

// Helper to get current user from token
async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(token);

    if (!payload) {
      return null;
    }

    const users = await sql`
      SELECT id, name, email, role
      FROM users
      WHERE id = ${payload.userId}
    `;
    return users[0] || null;
  } catch (error) {
    return null;
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { projectId, taskDescription, taskType, taskDate, rowIndex } = body;

    if (!taskType || !taskDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rowIndex !== undefined && ![0, 1].includes(rowIndex)) {
      return NextResponse.json(
        { error: 'Row index must be 0 or 1' },
        { status: 400 }
      );
    }

    if (!['Deadline', 'Internal Deadline', 'Milestone'].includes(taskType)) {
      return NextResponse.json(
        { error: 'Invalid task type' },
        { status: 400 }
      );
    }

    // Get existing event IDs before updating
    const oldMilestone = await sql`
      SELECT outlook_event_id as "outlookEventId"
      FROM milestone_tasks
      WHERE id = ${id}
    `;

    const existingEventIds = oldMilestone.length > 0 ? oldMilestone[0].outlookEventId : null;

    const result = await sql`
      UPDATE milestone_tasks
      SET
        project_id = ${projectId || null},
        task_description = ${taskDescription || null},
        task_type = ${taskType},
        task_date = ${taskDate},
        row_index = COALESCE(${rowIndex}, row_index)
      WHERE id = ${id}
      RETURNING
        id,
        project_id as "projectId",
        task_description as "taskDescription",
        task_type as "taskType",
        task_date as "taskDate",
        row_index as "rowIndex",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Milestone task not found' },
        { status: 404 }
      );
    }

    const updatedMilestone = result[0];

    // Sync changes back to source tables (projects or project_milestones)
    if (updatedMilestone.projectId && updatedMilestone.taskType) {
      try {
        if (updatedMilestone.taskType === 'Deadline') {
          // Update the project's deadline field
          await sql`
            UPDATE projects
            SET deadline = ${updatedMilestone.taskDate}
            WHERE id = ${updatedMilestone.projectId}
          `;
        } else if (updatedMilestone.taskType === 'Internal Deadline') {
          // Update the project's internal_deadline field
          await sql`
            UPDATE projects
            SET internal_deadline = ${updatedMilestone.taskDate}
            WHERE id = ${updatedMilestone.projectId}
          `;
        } else if (updatedMilestone.taskType === 'Milestone') {
          // Find and update the corresponding project milestone
          // Match by project_id and the task description (milestone name)
          const milestones = await sql`
            SELECT id, milestone_name as "milestoneName"
            FROM project_milestones
            WHERE project_id = ${updatedMilestone.projectId}
            LIMIT 1
          `;

          if (milestones.length > 0) {
            await sql`
              UPDATE project_milestones
              SET
                due_date = ${updatedMilestone.taskDate},
                milestone_name = ${updatedMilestone.taskDescription}
              WHERE id = ${milestones[0].id}
            `;
          }
        }
      } catch (syncError) {
        console.error('Error syncing to source table:', syncError);
        // Don't fail the request if sync fails
      }
    }

    // Sync updated milestone to all team members (updates existing events)
    try {
      // Get project details if needed
      let projectDetails = null;
      if (projectId) {
        const project = await sql`
          SELECT project_name, project_number, common_name
          FROM projects
          WHERE id = ${projectId}
        `;
        projectDetails = project[0];
      }

      await syncMilestoneToAllTeamMembers({
        id: updatedMilestone.id,
        projectId: updatedMilestone.projectId,
        taskDescription: updatedMilestone.taskDescription,
        taskType: updatedMilestone.taskType,
        taskDate: updatedMilestone.taskDate,
        projectName: projectDetails?.project_name,
        projectNumber: projectDetails?.project_number,
        projectCommonName: projectDetails?.common_name,
        existingEventIds: existingEventIds,
      });
    } catch (error) {
      console.error('Error syncing milestone to Outlook:', error);
    }

    // Broadcast milestone update to SSE listeners
    planningEvents.broadcastMilestoneUpdate('updated', updatedMilestone.id, updatedMilestone);

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating milestone task:', error);
    return NextResponse.json(
      { error: 'Failed to update milestone task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // First get the milestone to get outlook_event_id and other details
    const milestone = await sql`
      SELECT
        id,
        outlook_event_id as "outlookEventId",
        project_id as "projectId",
        task_type as "taskType",
        task_description as "taskDescription",
        task_date as "taskDate"
      FROM milestone_tasks
      WHERE id = ${id}
    `;

    if (milestone.length === 0) {
      return NextResponse.json(
        { error: 'Milestone task not found' },
        { status: 404 }
      );
    }

    const milestoneToDelete = milestone[0];

    // Sync deletion to source tables (projects or project_milestones)
    if (milestoneToDelete.projectId && milestoneToDelete.taskType) {
      try {
        if (milestoneToDelete.taskType === 'Deadline') {
          // Clear the project's deadline field
          await sql`
            UPDATE projects
            SET deadline = NULL
            WHERE id = ${milestoneToDelete.projectId}
          `;
        } else if (milestoneToDelete.taskType === 'Internal Deadline') {
          // Clear the project's internal_deadline field
          await sql`
            UPDATE projects
            SET internal_deadline = NULL
            WHERE id = ${milestoneToDelete.projectId}
          `;
        } else if (milestoneToDelete.taskType === 'Milestone') {
          // Delete the corresponding project milestone
          await sql`
            DELETE FROM project_milestones
            WHERE project_id = ${milestoneToDelete.projectId}
              AND milestone_name = ${milestoneToDelete.taskDescription}
              AND due_date = ${milestoneToDelete.taskDate}
          `;
        }
      } catch (syncError) {
        console.error('Error syncing deletion to source table:', syncError);
        // Don't fail the request if sync fails
      }
    }

    // Delete from database
    await sql`
      DELETE FROM milestone_tasks
      WHERE id = ${id}
    `;

    // Delete from all team members' Outlook calendars
    if (milestoneToDelete.outlookEventId) {
      try {
        await deleteMilestoneFromAllTeamMembers(milestoneToDelete.outlookEventId);
      } catch (error) {
        console.error('Error deleting milestone from Outlook:', error);
      }
    }

    // Broadcast milestone deletion to SSE listeners
    planningEvents.broadcastMilestoneUpdate('deleted', parseInt(id), null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting milestone task:', error);
    return NextResponse.json(
      { error: 'Failed to delete milestone task' },
      { status: 500 }
    );
  }
}
