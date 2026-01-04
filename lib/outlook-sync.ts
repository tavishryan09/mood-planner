import { sql } from '@/lib/db';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getMoodPlannerCalendar } from '@/lib/microsoft-graph';

// Helper to map task types to Outlook categories
function getOutlookCategory(taskType: string): string[] {
  const categoryMap: Record<string, string> = {
    'Project Task': 'Project Task',
    'Deadline': 'Deadline',
    'Internal Deadline': 'Internal Deadline',
    'Milestone': 'Project Milestone',
    'Out of office': 'Out of office',
    'Time off': 'Time off',
    'Unavailable': 'Unavailable',
  };

  const category = categoryMap[taskType];
  return category ? [category] : [];
}

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
    return null; // User hasn't connected Outlook
  }

  const { outlook_access_token, outlook_refresh_token, outlook_token_expires_at } = user[0];

  // If refresh token exists, always try to refresh if token appears invalid or expired
  if (outlook_refresh_token) {
    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = new Date(outlook_token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Also check if token is malformed (should have 2 dots for JWT format)
    const tokenAppearsMalformed = !outlook_access_token ||
                                  (typeof outlook_access_token === 'string' &&
                                   outlook_access_token.split('.').length !== 3);

    if (expiresAt < fiveMinutesFromNow || tokenAppearsMalformed) {
      // Token expired, about to expire, or malformed - refresh it
      return await refreshAccessToken(userId, outlook_refresh_token);
    }
  }

  return outlook_access_token;
}

export async function syncTaskToOutlook(task: {
  id: number;
  userId: number;
  taskDescription?: string;
  taskType: string;
  taskDate: string;
  projectName?: string;
  projectNumber?: string;
  projectCommonName?: string;
  outlookEventId?: string;
}) {
  try {
    const accessToken = await getValidAccessToken(task.userId);

    if (!accessToken) {
      // User hasn't connected Outlook, skip sync
      return null;
    }

    // Get or create the Mood Planner calendar
    const calendarId = await getMoodPlannerCalendar(accessToken);

    // Ensure task_date is in YYYY-MM-DD format
    const taskDate = task.taskDate instanceof Date
      ? task.taskDate.toISOString().split('T')[0]
      : task.taskDate;

    const eventStart = new Date(`${taskDate}T09:00:00Z`);
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour duration

    // Build subject based on project and task info
    let subject: string;
    if (task.projectCommonName && task.taskDescription) {
      // Project with description: "Common Name - Description"
      subject = `${task.projectCommonName} - ${task.taskDescription}`;
    } else if (task.projectCommonName) {
      // Project without description: just "Common Name"
      subject = task.projectCommonName;
    } else if (task.taskDescription) {
      // No project but has description: just description
      subject = task.taskDescription;
    } else {
      // No project, no description - show task type only if not "Project Task"
      subject = task.taskType === 'Project Task' ? 'Task' : task.taskType;
    }

    const body = task.projectName
      ? `Project: ${task.projectName}\nTask: ${task.taskDescription || task.taskType}`
      : (task.taskDescription || task.taskType);

    const categories = getOutlookCategory(task.taskType);

    if (task.outlookEventId) {
      // Update existing event
      await updateCalendarEvent(accessToken, task.outlookEventId, {
        subject,
        start: eventStart.toISOString(),
        end: eventEnd.toISOString(),
        body,
        isAllDay: true,
        calendarId,
        categories,
      });
      return task.outlookEventId;
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
      });

      // Store the event ID in the database
      await sql`
        UPDATE planning_tasks
        SET outlook_event_id = ${event.id}
        WHERE id = ${task.id}
      `;

      return event.id;
    }
  } catch (error) {
    console.error('Error syncing task to Outlook:', error);
    // Don't throw - we don't want to fail task operations if Outlook sync fails
    return null;
  }
}

export async function deleteTaskFromOutlook(userId: number, outlookEventId: string) {
  try {
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken || !outlookEventId) {
      return;
    }

    // Get the Mood Planner calendar ID
    const calendarId = await getMoodPlannerCalendar(accessToken);

    await deleteCalendarEvent(accessToken, outlookEventId, calendarId);
  } catch (error) {
    console.error('Error deleting task from Outlook:', error);
    // Don't throw - we don't want to fail task operations if Outlook sync fails
  }
}

export async function syncMilestoneToAllTeamMembers(milestone: {
  id: number;
  projectId?: number;
  taskDescription?: string;
  taskType: string;
  taskDate: string;
  projectName?: string;
  projectNumber?: string;
  projectCommonName?: string;
  existingEventIds?: string; // JSON string of existing event IDs
}) {
  try {
    // Parse existing event IDs if provided
    let existingEventIdMap: Record<number, string> = {};
    if (milestone.existingEventIds) {
      try {
        existingEventIdMap = JSON.parse(milestone.existingEventIds);
      } catch (e) {
        console.error('Error parsing existing event IDs:', e);
      }
    }

    // Get all users who have Outlook connected OR who already have an event
    const userIdsWithEvents = Object.keys(existingEventIdMap).map(Number);
    const connectedUsers = await sql`
      SELECT id, outlook_connected
      FROM users
      WHERE outlook_connected = true
        OR id = ANY(${userIdsWithEvents})
    `;

    if (connectedUsers.length === 0) {
      return;
    }

    // Ensure task_date is in YYYY-MM-DD format
    const taskDate = milestone.taskDate instanceof Date
      ? milestone.taskDate.toISOString().split('T')[0]
      : milestone.taskDate;

    const eventStart = new Date(`${taskDate}T09:00:00Z`);
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour duration

    // Build subject - always show task type for milestones if no project
    const subject = milestone.projectCommonName
      ? `${milestone.projectCommonName} - ${milestone.taskDescription || milestone.taskType}`
      : (milestone.taskDescription || milestone.taskType);

    const body = milestone.projectName
      ? `Project: ${milestone.projectName}\n${milestone.taskType}: ${milestone.taskDescription || milestone.taskType}`
      : `${milestone.taskType}: ${milestone.taskDescription || milestone.taskType}`;

    const categories = getOutlookCategory(milestone.taskType);

    // Create or update event for each user
    const syncPromises = connectedUsers.map(async (user) => {
      try {
        const accessToken = await getValidAccessToken(user.id);

        if (!accessToken) {
          return null;
        }

        // Get or create the Mood Planner calendar for this user
        const calendarId = await getMoodPlannerCalendar(accessToken);

        const existingEventId = existingEventIdMap[user.id];

        if (existingEventId) {
          // Try to update existing event
          try {
            await updateCalendarEvent(accessToken, existingEventId, {
              subject,
              start: eventStart.toISOString(),
              end: eventEnd.toISOString(),
              body,
              isAllDay: true,
              calendarId,
              categories,
            });
            return { userId: user.id, eventId: existingEventId };
          } catch (updateError: any) {
            // If event not found, create a new one
            if (updateError.code === 'ErrorItemNotFound' || updateError.statusCode === 404) {
              console.log(`Milestone event ${existingEventId} not found for user ${user.id}, creating new event`);
              const event = await createCalendarEvent(accessToken, {
                subject,
                start: eventStart.toISOString(),
                end: eventEnd.toISOString(),
                body,
                isAllDay: true,
                calendarId,
                categories,
              });
              return { userId: user.id, eventId: event.id };
            } else {
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
          });
          return { userId: user.id, eventId: event.id };
        }
      } catch (error) {
        console.error(`Error syncing milestone to user ${user.id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(syncPromises);

    // Store the event IDs in a JSON column (we'll need to track multiple event IDs)
    const eventIdMap = results
      .filter(r => r !== null)
      .reduce((acc, r) => {
        if (r) {
          acc[r.userId] = r.eventId;
        }
        return acc;
      }, {} as Record<number, string>);

    if (Object.keys(eventIdMap).length > 0) {
      await sql`
        UPDATE milestone_tasks
        SET outlook_event_id = ${JSON.stringify(eventIdMap)}
        WHERE id = ${milestone.id}
      `;
    }

    return eventIdMap;
  } catch (error) {
    console.error('Error syncing milestone to team members:', error);
    return null;
  }
}

export async function deleteMilestoneFromAllTeamMembers(outlookEventIds: string) {
  try {
    const eventIdMap = JSON.parse(outlookEventIds) as Record<number, string>;

    const deletePromises = Object.entries(eventIdMap).map(async ([userId, eventId]) => {
      try {
        await deleteTaskFromOutlook(Number(userId), eventId);
      } catch (error) {
        console.error(`Error deleting milestone from user ${userId}:`, error);
      }
    });

    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting milestone from team members:', error);
  }
}
