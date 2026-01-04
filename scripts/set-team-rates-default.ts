import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function setTeamRatesDefault() {
  console.log('Setting use_team_rates to true for all existing projects...');

  try {
    const result = await sql`
      UPDATE projects
      SET use_team_rates = true
      WHERE use_team_rates = false OR use_team_rates IS NULL
    `;

    console.log(`✓ Updated ${result.length} projects to use team rates`);

    // Show summary
    const summary = await sql`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN use_team_rates = true THEN 1 ELSE 0 END) as using_team_rates,
        SUM(CASE WHEN use_team_rates = false THEN 1 ELSE 0 END) as using_project_rate
      FROM projects
    `;

    console.log('\nProject billing rate summary:');
    console.log(`Total projects: ${summary[0].total}`);
    console.log(`Using team rates: ${summary[0].using_team_rates}`);
    console.log(`Using project rate: ${summary[0].using_project_rate}`);

    console.log('\n✓ Migration completed successfully!');
  } catch (error) {
    console.error('Error updating projects:', error);
    process.exit(1);
  }
}

setTeamRatesDefault();
