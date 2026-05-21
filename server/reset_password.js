import { db } from './db.js';
import bcrypt from 'bcrypt';

async function resetPassword() {
  try {
    const newPassword = 'Testing@123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const email = 'sandeep@ishpo.com';
    const result = await db.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id',
      [hashedPassword, email]
    );

    if (result.rowCount > 0) {
      console.log(`Password successfully reset for ${email}. New password is: ${newPassword}`);
    } else {
      console.log(`User ${email} not found.`);
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    process.exit();
  }
}

resetPassword();
