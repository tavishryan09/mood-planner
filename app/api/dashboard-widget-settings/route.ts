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

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get widget settings for current user
    const settings = await sql`
      SELECT
        widget_id as "widgetId",
        widget_name as "widgetName",
        width,
        display_order as "displayOrder",
        show_all_projects as "showAllProjects",
        visible
      FROM dashboard_widget_settings
      WHERE user_id = ${currentUser.id}
      ORDER BY display_order ASC
    `;

    // Transform to expected format
    const widgets = settings.map((s: any) => ({
      id: s.widgetId,
      name: s.widgetName,
      width: s.width,
      order: s.displayOrder,
      visible: s.visible
    }));

    // Get show_all_projects preference from the 'projects' widget if it exists
    const projectsWidget = settings.find((s: any) => s.widgetId === 'projects');
    const showAllProjects = projectsWidget?.showAllProjects || false;

    return NextResponse.json({ widgets, showAllProjects });
  } catch (error) {
    console.error('Error fetching dashboard widget settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard widget settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { widgets, showAllProjects } = body;

    console.log('[Dashboard Widget Settings PUT] User:', currentUser.name);
    console.log('[Dashboard Widget Settings PUT] showAllProjects:', showAllProjects);
    console.log('[Dashboard Widget Settings PUT] widgets:', widgets);

    if (!widgets || !Array.isArray(widgets)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Update all widget settings for the user
    for (const widget of widgets) {
      // If this is the 'projects' widget, update show_all_projects preference
      const isProjectsWidget = widget.id === 'projects';
      const showAllValue = isProjectsWidget && showAllProjects !== undefined ? showAllProjects : false;
      const visibleValue = widget.visible !== undefined ? widget.visible : true;

      console.log(`[Dashboard Widget Settings PUT] Widget ${widget.id}: showAllValue=${showAllValue}`);

      await sql`
        INSERT INTO dashboard_widget_settings (user_id, widget_id, widget_name, width, display_order, show_all_projects, visible)
        VALUES (${currentUser.id}, ${widget.id}, ${widget.name}, ${widget.width}, ${widget.order}, ${showAllValue}, ${visibleValue})
        ON CONFLICT (user_id, widget_id)
        DO UPDATE SET
          width = ${widget.width},
          display_order = ${widget.order},
          widget_name = ${widget.name},
          show_all_projects = ${showAllValue},
          visible = ${visibleValue}
      `;
    }

    console.log('[Dashboard Widget Settings PUT] Save complete');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving dashboard widget settings:', error);
    return NextResponse.json(
      { error: 'Failed to save dashboard widget settings' },
      { status: 500 }
    );
  }
}
