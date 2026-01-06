import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const meetings = [
  {
    title: 'Inrvo',
    start_time: '2025-01-05T15:00:00+02:00',
    end_time: '2025-01-05T15:30:00+02:00',
  },
  { title: 'ZNSO', start_time: '2025-01-05T15:30:00+02:00', end_time: '2025-01-05T16:30:00+02:00' },
  {
    title: 'Antonis',
    start_time: '2025-01-05T17:00:00+02:00',
    end_time: '2025-01-05T17:15:00+02:00',
  },
  { title: 'Jay', start_time: '2025-01-05T17:30:00+02:00', end_time: '2025-01-05T18:00:00+02:00' },
  {
    title: 'Alecci Media',
    start_time: '2025-01-05T18:00:00+02:00',
    end_time: '2025-01-05T19:00:00+02:00',
  },
];

async function main() {
  const { data, error } = await supabase.from('meetings').insert(meetings).select();

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } else {
    console.log('Added', data.length, 'meetings:');
    data.forEach((m) =>
      console.log(
        '-',
        m.title,
        new Date(m.start_time).toLocaleTimeString('en-CY', {
          timeZone: 'Europe/Nicosia',
          hour: '2-digit',
          minute: '2-digit',
        })
      )
    );
  }
}

main();
