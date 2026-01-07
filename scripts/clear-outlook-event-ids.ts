import { sql } from '../lib/db';

async function clearOutlookEventIds() {
  try {
    console.log('Clearing all outlook_event_id values...');
    
    // Clear planning_tasks
    const planningResult = await sql`
      UPDATE planning_tasks
      SET outlook_event_id = NULL
      WHERE outlook_event_id IS NOT NULL
    `;
    console.log(`Cleared ${planningResult.count} planning task event IDs`);

    // Clear milestone_tasks
    const milestoneResult = await sql`
      UPDATE milestone_tasks
      SET outlook_event_id = NULL
      WHERE outlook_event_id IS NOT NULL
    `;
    console.log(`Cleared ${milestoneResult.count} milestone task event IDs`);

    console.log('Done! All Outlook event IDs cleared.');
    console.log('Next sync will create fresh events in your Mood Tracker calendar.');
  } catch (error) {
    console.error('Error clearing event IDs:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

clearOutlookEventIds();
