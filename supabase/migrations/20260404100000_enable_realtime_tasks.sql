-- Enable Supabase Realtime on the tasks table for instant UI updates
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
