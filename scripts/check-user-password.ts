import { sql } from '../lib/db';

async function checkUser() {
  try {
    const users = await sql`
      SELECT id, name, email, password_hash, role
      FROM users
      WHERE email = 'tavishryan@gmail.com'
    `;
    
    if (users.length === 0) {
      console.log('No user found with email tavishryan@gmail.com');
    } else {
      console.log('User found:');
      console.log('ID:', users[0].id);
      console.log('Name:', users[0].name);
      console.log('Email:', users[0].email);
      console.log('Role:', users[0].role);
      console.log('\nPassword hash:', users[0].password_hash);
      console.log('\n⚠️  The password is hashed with bcrypt and cannot be reversed.');
      console.log('If you forgot your password, you need to create a new one.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkUser();
