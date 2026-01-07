import { Client } from '@microsoft/microsoft-graph-client';

export function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

export async function getMoodPlannerCalendar(accessToken: string) {
  const client = getGraphClient(accessToken);

  try {
    // First, try to find existing "Mood Tracker" calendar
    const calendars = await client.api('/me/calendars').get();
    const moodCalendar = calendars.value.find((cal: any) => cal.name === 'Mood Tracker');

    if (moodCalendar) {
      return moodCalendar.id;
    }

    // If it doesn't exist, create it
    try {
      const newCalendar = await client.api('/me/calendars').post({
        name: 'Mood Tracker',
        color: 'auto',
      });

      return newCalendar.id;
    } catch (createError: any) {
      // If we get a 409 conflict, the calendar was created by another request
      // Re-fetch calendars to find it
      if (createError.statusCode === 409 || createError.code === 'ErrorFolderExists') {
        console.log('Calendar already exists, re-fetching to find it...');
        const calendarsRetry = await client.api('/me/calendars').get();
        const moodCalendarRetry = calendarsRetry.value.find((cal: any) => cal.name === 'Mood Tracker');

        if (moodCalendarRetry) {
          return moodCalendarRetry.id;
        }
      }

      // If it's a different error or we still can't find the calendar, throw
      throw createError;
    }
  } catch (error) {
    console.error('Error getting/creating Mood Tracker calendar:', error);
    throw error;
  }
}

export async function createCalendarEvent(accessToken: string, event: {
  subject: string;
  start: string;
  end: string;
  body?: string;
  isAllDay?: boolean;
  calendarId?: string;
  categories?: string[];
}) {
  const client = getGraphClient(accessToken);

  const calendarEvent: any = {
    subject: event.subject,
    body: {
      contentType: 'Text',
      content: event.body || '',
    },
  };

  // Add categories if provided
  if (event.categories && event.categories.length > 0) {
    calendarEvent.categories = event.categories;
  }

  if (event.isAllDay) {
    // For all-day events, use date-only format
    // End date must be at least 1 day after start for all-day events
    calendarEvent.isAllDay = true;
    const startDate = new Date(event.start.split('T')[0]);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    calendarEvent.start = {
      dateTime: startDate.toISOString().split('T')[0],
      timeZone: 'UTC',
    };
    calendarEvent.end = {
      dateTime: endDate.toISOString().split('T')[0],
      timeZone: 'UTC',
    };
  } else {
    // For timed events, use full datetime
    calendarEvent.start = {
      dateTime: event.start,
      timeZone: 'UTC',
    };
    calendarEvent.end = {
      dateTime: event.end,
      timeZone: 'UTC',
    };
  }

  try {
    // Use specified calendar or default calendar
    const endpoint = event.calendarId
      ? `/me/calendars/${event.calendarId}/events`
      : '/me/events';

    const result = await client.api(endpoint).post(calendarEvent);
    return result;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

export async function updateCalendarEvent(accessToken: string, eventId: string, event: {
  subject: string;
  start: string;
  end: string;
  body?: string;
  isAllDay?: boolean;
  calendarId?: string;
  categories?: string[];
}) {
  const client = getGraphClient(accessToken);

  const calendarEvent: any = {
    subject: event.subject,
    body: {
      contentType: 'Text',
      content: event.body || '',
    },
  };

  // Add categories if provided
  if (event.categories && event.categories.length > 0) {
    calendarEvent.categories = event.categories;
  }

  if (event.isAllDay) {
    // For all-day events, use date-only format
    // End date must be at least 1 day after start for all-day events
    calendarEvent.isAllDay = true;
    const startDate = new Date(event.start.split('T')[0]);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    calendarEvent.start = {
      dateTime: startDate.toISOString().split('T')[0],
      timeZone: 'UTC',
    };
    calendarEvent.end = {
      dateTime: endDate.toISOString().split('T')[0],
      timeZone: 'UTC',
    };
  } else {
    // For timed events, use full datetime
    calendarEvent.start = {
      dateTime: event.start,
      timeZone: 'UTC',
    };
    calendarEvent.end = {
      dateTime: event.end,
      timeZone: 'UTC',
    };
  }

  try {
    // Use specified calendar or default endpoint
    const endpoint = event.calendarId
      ? `/me/calendars/${event.calendarId}/events/${eventId}`
      : `/me/events/${eventId}`;

    const result = await client.api(endpoint).patch(calendarEvent);
    return result;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string, calendarId?: string) {
  const client = getGraphClient(accessToken);

  try {
    // Use specified calendar or default endpoint
    const endpoint = calendarId
      ? `/me/calendars/${calendarId}/events/${eventId}`
      : `/me/events/${eventId}`;

    await client.api(endpoint).delete();
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

export async function getUserInfo(accessToken: string) {
  const client = getGraphClient(accessToken);

  try {
    const user = await client.api('/me').select('mail,userPrincipalName').get();
    return user;
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
}
