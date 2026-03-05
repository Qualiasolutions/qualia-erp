-- Update moayad's role to manager
UPDATE profiles SET role = 'manager' WHERE email = 'moayad@qualiasolutions.net';

-- Update sally's role to employee and set full_name
UPDATE profiles SET role = 'employee', full_name = 'Sally' WHERE email = 'sally@qualiasolutions.net';
