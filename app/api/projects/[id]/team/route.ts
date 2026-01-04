import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// Helper to get current user from token
async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(token);
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const projectId = parseInt(id);

    // Get team members for this project
    const teamMembers = await sql`
      SELECT
        u.id,
        u.name,
        u.email
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      WHERE ptm.project_id = ${projectId}
      ORDER BY u.name
    `;

    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error('Error fetching project team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project team' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();
    const { userIds } = body;

    if (!Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'userIds must be an array' },
        { status: 400 }
      );
    }

    // Delete all existing team members for this project
    await sql`
      DELETE FROM project_team_members
      WHERE project_id = ${projectId}
    `;

    // Insert new team members
    for (const userId of userIds) {
      await sql`
        INSERT INTO project_team_members (project_id, user_id)
        VALUES (${projectId}, ${userId})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project team:', error);
    return NextResponse.json(
      { error: 'Failed to update project team' },
      { status: 500 }
    );
  }
}
