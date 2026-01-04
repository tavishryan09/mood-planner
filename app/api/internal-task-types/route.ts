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

// GET - Fetch all internal task types
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const types = await sql`
      SELECT
        id,
        name,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM internal_task_types
      ORDER BY name ASC
    `;

    return NextResponse.json(types);
  } catch (error) {
    console.error('Error fetching internal task types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch internal task types' },
      { status: 500 }
    );
  }
}

// POST - Create a new internal task type
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
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check if name already exists
    const existing = await sql`
      SELECT id FROM internal_task_types WHERE name = ${trimmedName}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Internal task type already exists' },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO internal_task_types (name)
      VALUES (${trimmedName})
      RETURNING
        id,
        name,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating internal task type:', error);
    return NextResponse.json(
      { error: 'Failed to create internal task type' },
      { status: 500 }
    );
  }
}
