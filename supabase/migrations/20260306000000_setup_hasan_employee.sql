-- Set Hasan's role to employee and ensure full_name is set
UPDATE profiles
SET role = 'employee', full_name = 'Hasan'
WHERE email = 'hasan@qualiasolutions.net';
