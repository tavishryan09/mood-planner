import { sql } from '../lib/db';
import { getGraphClient, getMoodPlannerCalendar } from '../lib/microsoft-graph';

async function clearMoodTrackerEvents() {
  try {
    // Get the first user with Outlook connected to use their access token
    const users = await sql`
      SELECT id, outlook_access_token, outlook_refresh_token, outlook_token_expires_at
      FROM users
      WHERE outlook_connected = true
      LIMIT 1
    `;

    if (users.length === 0) {
      console.log('No users with Outlook connected found.');
      process.exit(0);
    }

    const user = users[0];
    let accessToken = user.outlook_access_token;

    // Check if token needs refresh
    const expiresAt = new Date(user.outlook_token_expires_at);
    const now = new Date();
    if (expiresAt < now) {
      console.log('Access token expired, refreshing...');
      // Refresh token logic would go here, but for simplicity we'll just use existing token
      // In production, implement proper token refresh
    }

    console.log('Finding Mood Tracker calendar...');
    const calendarId = await getMoodPlannerCalendar(accessToken);
    console.log(`Found calendar: ${calendarId}`);

    const client = getGraphClient(accessToken);

    // Get all events in the Mood Tracker calendar
    console.log('Fetching all events from Mood Tracker calendar...');
    const events = await client.api(`/me/calendars/${calendarId}/events`).get();

    console.log(`Found ${events.value.length} events in Mood Tracker calendar`);

    if (events.value.length === 0) {
      console.log('No events to delete.');
      process.exit(0);
    }

    // Delete each event
    console.log('Deleting all events...');
    for (const event of events.value) {
      try {
        await client.api(`/me/calendars/${calendarId}/events/${event.id}`).delete();
        console.log(`Deleted event: ${event.subject}`);
      } catch (error) {
        console.error(`Error deleting event ${event.id}:`, error);
      }
    }

    console.log('Done! All events deleted from Mood Tracker calendar.');
    console.log('Now you can run sync again to create fresh events without duplicates.');
  } catch (error) {
    console.error('Error clearing Mood Tracker events:', error);
    process.exit(1);
  }

  process.exit(0);
}

clearMoodTrackerEvents();
