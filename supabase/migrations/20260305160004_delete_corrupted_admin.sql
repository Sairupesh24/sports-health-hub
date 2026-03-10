-- Delete the corrupted user inserted via SQL to allow recreation via API
DELETE FROM auth.users WHERE email = 'masteradmin@ishpo.com';
