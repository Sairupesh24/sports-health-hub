-- Confirm all user emails to allow login testing
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
