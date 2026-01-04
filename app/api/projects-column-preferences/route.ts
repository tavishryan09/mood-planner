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

// GET - Load user's column preferences
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const result = await sql`
      SELECT column_settings as "columnSettings"
      FROM projects_column_preferences
      WHERE user_id = ${currentUser.id}
    `;

    if (result.length === 0) {
      // Return default settings if none exist
      return NextResponse.json({
        columnSettings: {
          projectNumber: true,
          projectName: true,
          clientName: true,
          commonName: true,
          projectValue: true,
          estimatedBillable: true,
          billablePercent: true,
          totalHours: true,
          hoursThisWeek: true,
          hoursThisMonth: true,
          hoursThisQuarter: true,
        }
      });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error loading column preferences:', error);
    return NextResponse.json(
      { error: 'Failed to load column preferences' },
      { status: 500 }
    );
  }
}

// POST - Save user's column preferences
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
    const { columnSettings } = body;

    if (!columnSettings || typeof columnSettings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid column settings' },
        { status: 400 }
      );
    }

    // Upsert (insert or update)
    const result = await sql`
      INSERT INTO projects_column_preferences (user_id, column_settings)
      VALUES (${currentUser.id}, ${JSON.stringify(columnSettings)}::jsonb)
      ON CONFLICT (user_id)
      DO UPDATE SET
        column_settings = ${JSON.stringify(columnSettings)}::jsonb,
        updated_at = CURRENT_TIMESTAMP
      RETURNING
        id,
        user_id as "userId",
        column_settings as "columnSettings",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error saving column preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save column preferences' },
      { status: 500 }
    );
  }
}
