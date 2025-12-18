/**
 * Script to assign the first "Todo" task to Moayad
 * Run with: npx tsx scripts/assign-todo-to-moayad.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function assignTodoToMoayad() {
  try {
    // Find Moayad's user ID
    const { data: moayad, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('full_name', '%moayad%')
      .limit(1)
      .single();

    if (userError || !moayad) {
      console.error('Error finding Moayad:', userError);
      console.log('Available users:');
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .limit(10);
      console.log(allUsers);
      return;
    }

    console.log(`Found Moayad: ${moayad.full_name} (${moayad.email}) - ID: ${moayad.id}`);

    // Find the first "Todo" task
    const { data: todoTask, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, status, assignee_id')
      .eq('status', 'Todo')
      .is('assignee_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (taskError || !todoTask) {
      console.log('No unassigned Todo task found. Checking all Todo tasks:');
      const { data: allTodos } = await supabase
        .from('tasks')
        .select('id, title, status, assignee_id')
        .eq('status', 'Todo')
        .limit(5);
      console.log(allTodos);
      return;
    }

    console.log(`Found Todo task: "${todoTask.title}" (ID: ${todoTask.id})`);

    // Assign the task to Moayad
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ assignee_id: moayad.id })
      .eq('id', todoTask.id);

    if (updateError) {
      console.error('Error assigning task:', updateError);
      return;
    }

    console.log(`✅ Successfully assigned task "${todoTask.title}" to Moayad!`);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

assignTodoToMoayad();
