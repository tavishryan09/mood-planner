import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) return null;

  try {
    const payload = verifyToken(token);
    if (!payload) return null;

    const users = await sql`
      SELECT id, name, email, role
      FROM users
      WHERE id = ${payload.userId}
    `;
    return users[0] || null;
  } catch {
    return null;
  }
}

// GET - Load all estimated hours for current user
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await sql`
      SELECT
        project_id as "projectId",
        estimated_hours as "estimatedHours"
      FROM user_estimated_hours
      WHERE user_id = ${currentUser.id}
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching estimated hours:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimated hours' },
      { status: 500 }
    );
  }
}

// POST - Upsert estimated hours for a project
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { projectId, estimatedHours } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (estimatedHours === null || estimatedHours === 0) {
      // Delete the record if hours is null or 0
      await sql`
        DELETE FROM user_estimated_hours
        WHERE user_id = ${currentUser.id}
          AND project_id = ${projectId}
      `;
      return NextResponse.json({ projectId, estimatedHours: 0 });
    }

    const result = await sql`
      INSERT INTO user_estimated_hours (user_id, project_id, estimated_hours)
      VALUES (${currentUser.id}, ${projectId}, ${estimatedHours})
      ON CONFLICT (user_id, project_id)
      DO UPDATE SET
        estimated_hours = ${estimatedHours},
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        project_id as "projectId",
        estimated_hours as "estimatedHours"
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error saving estimated hours:', error);
    return NextResponse.json(
      { error: 'Failed to save estimated hours' },
      { status: 500 }
    );
  }
}
