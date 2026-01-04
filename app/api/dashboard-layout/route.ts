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

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const layouts = await sql`
      SELECT
        widget_id as "widgetId",
        position_x as "x",
        position_y as "y",
        width as "w",
        height as "h"
      FROM dashboard_layouts
      WHERE user_id = ${currentUser.id}
      ORDER BY position_y, position_x
    `;

    return NextResponse.json(layouts);
  } catch (error) {
    console.error('Error fetching dashboard layout:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard layout' },
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
    const { layouts } = body;

    if (!Array.isArray(layouts)) {
      return NextResponse.json(
        { error: 'layouts must be an array' },
        { status: 400 }
      );
    }

    // Delete existing layouts for this user
    await sql`
      DELETE FROM dashboard_layouts
      WHERE user_id = ${currentUser.id}
    `;

    // Insert new layouts
    for (const layout of layouts) {
      await sql`
        INSERT INTO dashboard_layouts (user_id, widget_id, position_x, position_y, width, height)
        VALUES (${currentUser.id}, ${layout.widgetId}, ${layout.x}, ${layout.y}, ${layout.w}, ${layout.h})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving dashboard layout:', error);
    return NextResponse.json(
      { error: 'Failed to save dashboard layout' },
      { status: 500 }
    );
  }
}
