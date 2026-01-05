import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { syncMilestoneToAllTeamMembers } from '@/lib/outlook-sync';

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

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let tasks;

    if (startDate && endDate) {
      // Get tasks for date range from milestone_tasks table
      tasks = await sql`
        SELECT
          mt.id,
          mt.project_id as "projectId",
          mt.task_description as "taskDescription",
          mt.task_type as "taskType",
          mt.task_date as "taskDate",
          mt.row_index as "rowIndex",
          mt.created_at as "createdAt",
          mt.updated_at as "updatedAt",
          p.common_name as "projectCommonName",
          p.project_name as "projectName"
        FROM milestone_tasks mt
        LEFT JOIN projects p ON mt.project_id = p.id
        WHERE mt.task_date >= ${startDate}
          AND mt.task_date <= ${endDate}
        ORDER BY mt.task_date ASC
      `;
    } else {
      // Get all tasks
      tasks = await sql`
        SELECT
          mt.id,
          mt.project_id as "projectId",
          mt.task_description as "taskDescription",
          mt.task_type as "taskType",
          mt.task_date as "taskDate",
          mt.row_index as "rowIndex",
          mt.created_at as "createdAt",
          mt.updated_at as "updatedAt",
          p.common_name as "projectCommonName",
          p.project_name as "projectName"
        FROM milestone_tasks mt
        LEFT JOIN projects p ON mt.project_id = p.id
        ORDER BY mt.task_date ASC
      `;
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching milestone tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch milestone tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { projectId, taskDescription, taskType, taskDate, rowIndex } = body;

    if (!taskType || !taskDate || rowIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (![0, 1].includes(rowIndex)) {
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

    const result = await sql`
      INSERT INTO milestone_tasks (
        project_id,
        task_description,
        task_type,
        task_date,
        row_index
      )
      VALUES (
        ${projectId || null},
        ${taskDescription || null},
        ${taskType},
        ${taskDate},
        ${rowIndex}
      )
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

    const createdMilestone = result[0];

    // Sync to source tables (projects or project_milestones)
    if (createdMilestone.projectId && createdMilestone.taskType) {
      try {
        if (createdMilestone.taskType === 'Deadline') {
          // Update the project's deadline field
          await sql`
            UPDATE projects
            SET deadline = ${createdMilestone.taskDate}
            WHERE id = ${createdMilestone.projectId}
          `;
        } else if (createdMilestone.taskType === 'Internal Deadline') {
          // Update the project's internal_deadline field
          await sql`
            UPDATE projects
            SET internal_deadline = ${createdMilestone.taskDate}
            WHERE id = ${createdMilestone.projectId}
          `;
        } else if (createdMilestone.taskType === 'Milestone') {
          // Create a new project milestone
          await sql`
            INSERT INTO project_milestones (
              project_id,
              milestone_name,
              due_date,
              status
            )
            VALUES (
              ${createdMilestone.projectId},
              ${createdMilestone.taskDescription},
              ${createdMilestone.taskDate},
              'pending'
            )
            ON CONFLICT DO NOTHING
          `;
        }
      } catch (syncError) {
        console.error('Error syncing to source table:', syncError);
        // Don't fail the request if sync fails
      }
    }

    // Automatically sync to all team members' Outlook calendars
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
        id: createdMilestone.id,
        projectId: createdMilestone.projectId,
        taskDescription: createdMilestone.taskDescription,
        taskType: createdMilestone.taskType,
        taskDate: createdMilestone.taskDate,
        projectName: projectDetails?.project_name,
        projectNumber: projectDetails?.project_number,
      });
    } catch (error) {
      // Log error but don't fail milestone creation
      console.error('Error syncing milestone to Outlook:', error);
    }

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating milestone task:', error);

    // Check if it's a duplicate key error
    if (error?.code === '23505' || error?.constraint?.includes('task_date_row_index')) {
      return NextResponse.json(
        { error: 'Duplicate task - a task already exists at this date and row' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create milestone task' },
      { status: 500 }
    );
  }
}
