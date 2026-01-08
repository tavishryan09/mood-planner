import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createCalendarEvent, getUserInfo, getMoodPlannerCalendar } from '@/lib/microsoft-graph';

// Helper to refresh access token if expired
async function refreshAccessToken(userId: number, refreshToken: string) {
  const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to refresh access token');
  }

  const tokens = await tokenResponse.json();
  const { access_token, refresh_token, expires_in } = tokens;
  const expiresAt = new Date(Date.now() + expires_in * 1000);

  // Update tokens in database
  await sql`
    UPDATE users
    SET
      outlook_access_token = ${access_token},
      outlook_refresh_token = ${refresh_token || refreshToken},
      outlook_token_expires_at = ${expiresAt.toISOString()}
    WHERE id = ${userId}
  `;

  return access_token;
}

async function getValidAccessToken(userId: number) {
  const user = await sql`
    SELECT
      outlook_access_token,
      outlook_refresh_token,
      outlook_token_expires_at,
      outlook_connected
    FROM users
    WHERE id = ${userId}
  `;

  if (!user[0] || !user[0].outlook_connected) {
    throw new Error('Outlook not connected');
  }

  const { outlook_access_token, outlook_refresh_token, outlook_token_expires_at } = user[0];

  // Check if token is expired or about to expire (within 5 minutes)
  const expiresAt = new Date(outlook_token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt < fiveMinutesFromNow) {
    // Token expired or about to expire, refresh it
    return await refreshAccessToken(userId, outlook_refresh_token);
  }

  return outlook_access_token;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date } = await request.json();

    // Get valid access token (refreshes if needed)
    const accessToken = await getValidAccessToken(payload.userId);

    // Get or create the Mood Planner calendar
    const calendarId = await getMoodPlannerCalendar(accessToken);

    // Get all tasks for the user (or filter by date if provided)
    const tasks = date
      ? await sql`
          SELECT
            t.id,
            t.task_description,
            t.task_type,
            t.task_date,
            t.project_id,
            t.outlook_event_id,
            t.internal_task_type_id,
            p.project_name,
            p.project_number,
            p.common_name,
            itt.name as internal_task_type_name,
            'planning' as source
          FROM planning_tasks t
          LEFT JOIN projects p ON t.project_id = p.id
          LEFT JOIN internal_task_types itt ON t.internal_task_type_id = itt.id
          WHERE t.user_id = ${payload.userId}
            AND t.task_date = ${date}
          ORDER BY t.row_index
        `
      : await sql`
          SELECT
            t.id,
            t.task_description,
            t.task_type,
            t.task_date,
            t.project_id,
            t.outlook_event_id,
            t.internal_task_type_id,
            p.project_name,
            p.project_number,
            p.common_name,
            itt.name as internal_task_type_name,
            'planning' as source
          FROM planning_tasks t
          LEFT JOIN projects p ON t.project_id = p.id
          LEFT JOIN internal_task_types itt ON t.internal_task_type_id = itt.id
          WHERE t.user_id = ${payload.userId}
          ORDER BY t.task_date, t.row_index
        `;

    // Get milestone tasks (deadlines, internal deadlines, milestones)
    const milestones = date
      ? await sql`
          SELECT
            m.id,
            m.task_description,
            m.task_type,
            m.task_date,
            m.project_id,
            m.outlook_event_id,
            p.project_name,
            p.project_number,
            p.common_name,
            'milestone' as source
          FROM milestone_tasks m
          LEFT JOIN projects p ON m.project_id = p.id
          WHERE m.task_date = ${date}
          ORDER BY m.row_index
        `
      : await sql`
          SELECT
            m.id,
            m.task_description,
            m.task_type,
            m.task_date,
            m.project_id,
            m.outlook_event_id,
            p.project_name,
            p.project_number,
            p.common_name,
            'milestone' as source
          FROM milestone_tasks m
          LEFT JOIN projects p ON m.project_id = p.id
          ORDER BY m.task_date, m.row_index
        `;

    // Combine tasks and milestones
    const allItems = [...tasks, ...milestones];

    console.log(`[Outlook Sync] Found ${tasks.length} planning tasks and ${milestones.length} milestones for user ${payload.userId}`);

    if (allItems.length === 0) {
      return NextResponse.json({ message: 'No tasks to sync', synced: 0 });
    }

    // Create or update calendar events for each task/milestone
    const results = [];
    console.log(`[Outlook Sync] Starting sync of ${allItems.length} items to calendar ${calendarId}`);

    for (const item of allItems) {
      // Ensure task_date is in YYYY-MM-DD format
      const taskDate = item.task_date instanceof Date
        ? item.task_date.toISOString().split('T')[0]
        : item.task_date;

      const eventStart = new Date(`${taskDate}T09:00:00Z`);
      const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour duration

      // Build subject based on source type
      let subject: string;
      if (item.common_name && item.task_description) {
        // Project with description: "Common Name - Description"
        subject = `${item.common_name} - ${item.task_description}`;
      } else if (item.common_name) {
        // Project without description: just "Common Name"
        subject = item.common_name;
      } else if (item.source === 'milestone') {
        // Milestones always show task type if no project
        subject = item.task_description || item.task_type;
      } else if (item.task_description) {
        // Planning tasks with description
        subject = item.task_description;
      } else {
        // Planning tasks without description - don't say "Project Task"
        subject = item.task_type === 'Project Task' ? 'Task' : item.task_type;
      }

      const body = item.project_name
        ? `Project: ${item.project_name}\nTask: ${item.task_description || item.task_type}`
        : (item.task_description || item.task_type);

      // Map task type to Outlook category
      let categories: string[] = [];
      if (item.task_type === 'Internal' && item.internal_task_type_name) {
        // Use the internal task type name as the category
        categories = [item.internal_task_type_name];
      } else {
        const categoryMap: Record<string, string> = {
          'Project Task': 'Project Task',
          'Deadline': 'Deadline',
          'Internal Deadline': 'Internal Deadline',
          'Milestone': 'Project Milestone',
          'Out of office': 'Out of office',
          'Out of Office': 'Out of office',
          'Time off': 'Time off',
          'Unavailable': 'Unavailable',
          'PTO': 'PTO',
        };
        const category = categoryMap[item.task_type];
        categories = category ? [category] : [];
      }

      try {
        if (item.source === 'milestone') {
          // Milestones store event IDs as JSON for all team members
          // Extract this user's event ID from the JSON
          let eventId: string | null = null;
          if (item.outlook_event_id) {
            try {
              const eventIdMap = JSON.parse(item.outlook_event_id) as Record<number, string>;
              eventId = eventIdMap[payload.userId] || null;
            } catch (e) {
              // Not valid JSON, treat as null
              eventId = null;
            }
          }

          if (eventId) {
            // Try to update existing event for this user
            try {
              const { updateCalendarEvent } = await import('@/lib/microsoft-graph');
              await updateCalendarEvent(accessToken, eventId, {
                subject,
                start: eventStart.toISOString(),
                end: eventEnd.toISOString(),
                body,
                isAllDay: true,
                calendarId,
                categories,
                showAs: 'free',
                isReminderOn: false,
              });
            } catch (updateError: any) {
              // If event not found, create a new one
              const isNotFoundError =
                updateError.code === 'ErrorItemNotFound' ||
                updateError.statusCode === 404 ||
                updateError.message?.includes('does not exist') ||
                updateError.message?.includes('not found');

              if (isNotFoundError) {
                console.log(`Milestone event ${eventId} not found, creating new event for milestone ${item.id}`);
                const event = await createCalendarEvent(accessToken, {
                  subject,
                  start: eventStart.toISOString(),
                  end: eventEnd.toISOString(),
                  body,
                  isAllDay: true,
                  calendarId,
                  categories,
                  showAs: 'free',
                  isReminderOn: false,
                });
                eventId = event.id;

                // Update the event ID map in the database
                const existingMap = item.outlook_event_id ? JSON.parse(item.outlook_event_id) : {};
                existingMap[payload.userId] = eventId;
                await sql`
                  UPDATE milestone_tasks
                  SET outlook_event_id = ${JSON.stringify(existingMap)}
                  WHERE id = ${item.id}
                `;
              } else {
                console.error(`Unexpected error updating milestone event ${eventId}:`, updateError);
                throw updateError;
              }
            }
          } else {
            // Create new event for this user
            const event = await createCalendarEvent(accessToken, {
              subject,
              start: eventStart.toISOString(),
              end: eventEnd.toISOString(),
              body,
              isAllDay: true,
              calendarId,
              categories,
              showAs: 'free',
              isReminderOn: false,
            });
            eventId = event.id;

            // Store the event ID in the JSON map
            const existingMap = item.outlook_event_id ? JSON.parse(item.outlook_event_id) : {};
            existingMap[payload.userId] = eventId;
            await sql`
              UPDATE milestone_tasks
              SET outlook_event_id = ${JSON.stringify(existingMap)}
              WHERE id = ${item.id}
            `;
          }

          results.push({ taskId: item.id, source: item.source, success: true, eventId });
        } else {
          // Regular planning task - sync to current user only
          let eventId = item.outlook_event_id;

          if (eventId) {
            // Try to update existing event
            try {
              const { updateCalendarEvent } = await import('@/lib/microsoft-graph');
              await updateCalendarEvent(accessToken, eventId, {
                subject,
                start: eventStart.toISOString(),
                end: eventEnd.toISOString(),
                body,
                isAllDay: true,
                calendarId,
                categories,
                showAs: 'free',
                isReminderOn: false,
              });
            } catch (updateError: any) {
              // If event not found, create a new one
              const isNotFoundError =
                updateError.code === 'ErrorItemNotFound' ||
                updateError.statusCode === 404 ||
                updateError.message?.includes('does not exist') ||
                updateError.message?.includes('not found');

              if (isNotFoundError) {
                console.log(`Event ${eventId} not found, creating new event for task ${item.id}`);
                const event = await createCalendarEvent(accessToken, {
                  subject,
                  start: eventStart.toISOString(),
                  end: eventEnd.toISOString(),
                  body,
                  isAllDay: true,
                  calendarId,
                  categories,
                  showAs: 'free',
                  isReminderOn: false,
                });
                eventId = event.id;

                // Update the event ID in the database
                await sql`
                  UPDATE planning_tasks
                  SET outlook_event_id = ${eventId}
                  WHERE id = ${item.id}
                `;
              } else {
                console.error(`Unexpected error updating planning task event ${eventId}:`, updateError);
                throw updateError;
              }
            }
          } else {
            // Create new event
            const event = await createCalendarEvent(accessToken, {
              subject,
              start: eventStart.toISOString(),
              end: eventEnd.toISOString(),
              body,
              isAllDay: true,
              calendarId,
              categories,
              showAs: 'free',
              isReminderOn: false,
            });
            eventId = event.id;

            // Store the Outlook event ID in the database
            await sql`
              UPDATE planning_tasks
              SET outlook_event_id = ${eventId}
              WHERE id = ${item.id}
            `;
          }

          results.push({ taskId: item.id, source: item.source, success: true, eventId });
        }
      } catch (error) {
        console.error(`Error syncing ${item.source} task ${item.id}:`, error);
        results.push({ taskId: item.id, source: item.source, success: false, error: (error as Error).message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[Outlook Sync] Completed: ${successCount} successful, ${failureCount} failed`);
    if (failureCount > 0) {
      console.error('[Outlook Sync] Failed items:', results.filter(r => !r.success));
    }

    return NextResponse.json({
      message: `Synced ${successCount} of ${allItems.length} items`,
      synced: successCount,
      total: allItems.length,
      results,
    });
  } catch (error) {
    console.error('Error syncing to Outlook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync' },
      { status: 500 }
    );
  }
}
