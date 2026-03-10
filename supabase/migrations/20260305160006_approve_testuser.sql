-- Ensure the test super_admin user is approved
UPDATE public.profiles 
SET is_approved = true 
WHERE email = 'testuser1772708483495@gmail.com';
