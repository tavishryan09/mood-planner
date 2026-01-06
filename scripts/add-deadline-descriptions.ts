import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('Running migration: add-deadline-descriptions.sql');

    const migrationPath = path.join(__dirname, '..', 'db', 'add-deadline-descriptions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 100) + '...');
      await sql.query(statement);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
