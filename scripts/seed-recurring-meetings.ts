import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { hasGoogleCalendarConfig } from '../lib/google-calendar';
import { materializeRecurringMeetings } from '../lib/meeting-recurrence';

config({ path: '.env.production.local' });
config({ path: '.env.local', override: false });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type Client = {
  id: string;
  name: string | null;
  display_name: string | null;
  website: string | null;
  description: string | null;
};

type ClientContact = {
  name: string | null;
  email: string | null;
};

const TIMEZONE = 'Europe/Nicosia';

function normalized(value: string | null | undefined) {
  return (value || '').toLowerCase();
}

function textForClient(client: Client) {
  return [client.display_name, client.name, client.website, client.description]
    .map(normalized)
    .join(' ');
}

function findProfile(profiles: Profile[], terms: string[]) {
  return (
    profiles.find((profile) => {
      const text = normalized(profile.full_name);
      return terms.some((term) => text.includes(term));
    }) ||
    profiles.find((profile) => {
      const text = normalized(profile.email);
      return terms.some((term) => text.includes(term));
    })
  );
}

function findClient(clients: Client[], terms: string[]) {
  return clients.find((client) => {
    const text = textForClient(client);
    return terms.some((term) => text.includes(term));
  });
}

async function getWorkspaceId() {
  if (process.env.DEFAULT_WORKSPACE_ID) return process.env.DEFAULT_WORKSPACE_ID;

  const { data, error } = await supabase.from('workspaces').select('id, name').limit(1).single();
  if (error) throw error;
  if (!data?.id) throw new Error('No workspace found');
  return data.id as string;
}

async function upsertRule(input: {
  workspaceId: string;
  title: string;
  description: string;
  clientId: string | null;
  dayOfWeek: number;
  startTime: string;
  internalProfileIds: string[];
  externalAttendees: Array<{ name: string | null; email: string }>;
}) {
  const { data: existing, error: existingError } = await supabase
    .from('meeting_recurrence_rules')
    .select('id')
    .eq('workspace_id', input.workspaceId)
    .eq('title', input.title)
    .eq('day_of_week', input.dayOfWeek)
    .eq('start_time', input.startTime)
    .maybeSingle();

  if (existingError) throw existingError;

  let ruleId = existing?.id as string | undefined;
  if (ruleId) {
    const { error: updateError } = await supabase
      .from('meeting_recurrence_rules')
      .update({
        description: input.description,
        client_id: input.clientId,
        duration_minutes: 60,
        timezone: TIMEZONE,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ruleId);

    if (updateError) throw updateError;
  } else {
    const { data: rule, error: ruleError } = await supabase
      .from('meeting_recurrence_rules')
      .insert({
        workspace_id: input.workspaceId,
        title: input.title,
        description: input.description,
        client_id: input.clientId,
        day_of_week: input.dayOfWeek,
        start_time: input.startTime,
        duration_minutes: 60,
        timezone: TIMEZONE,
        starts_on: new Date().toISOString().slice(0, 10),
        is_active: true,
      })
      .select('id')
      .single();

    if (ruleError) throw ruleError;
    ruleId = rule.id as string;
  }

  if (input.internalProfileIds.length > 0) {
    const { error } = await supabase.from('meeting_recurrence_rule_attendees').upsert(
      input.internalProfileIds.map((profileId) => ({
        rule_id: ruleId,
        profile_id: profileId,
      })),
      { onConflict: 'rule_id,profile_id', ignoreDuplicates: true }
    );
    if (error) throw error;
  }

  if (input.externalAttendees.length > 0) {
    const { error } = await supabase.from('meeting_recurrence_rule_external_attendees').upsert(
      input.externalAttendees.map((attendee) => ({
        rule_id: ruleId,
        name: attendee.name,
        email: attendee.email.toLowerCase(),
      })),
      { onConflict: 'rule_id,email', ignoreDuplicates: true }
    );
    if (error) throw error;
  }

  return ruleId;
}

async function getClientContacts(clientId: string | null) {
  if (!clientId) return [];

  const { data, error } = await supabase
    .from('client_contacts')
    .select('name, email')
    .eq('client_id', clientId)
    .not('email', 'is', null);

  if (error) throw error;
  return ((data || []) as ClientContact[])
    .filter((contact) => contact.email)
    .map((contact) => ({ name: contact.name, email: contact.email as string }));
}

async function main() {
  const workspaceId = await getWorkspaceId();

  const [{ data: profiles, error: profilesError }, { data: clients, error: clientsError }] =
    await Promise.all([
      supabase.from('profiles').select('id, email, full_name'),
      supabase.from('clients').select('id, name, display_name, website, description'),
    ]);

  if (profilesError) throw profilesError;
  if (clientsError) throw clientsError;

  const allProfiles = (profiles || []) as Profile[];
  const allClients = (clients || []) as Client[];

  const fawzi = findProfile(allProfiles, ['fawzi', 'info@qualiasolutions.net']);
  const hasan = findProfile(allProfiles, ['hasan', 'hassan']);
  const moayad = findProfile(allProfiles, ['moayad']);
  const innrvo = findClient(allClients, ['innrvo', 'inrvo']);
  const giuliu = findClient(allClients, ['giuliu', 'underdog', 'undersales']);
  const giuliuProfile = findProfile(allProfiles, ['gsc@underdogsales.com', 'underdog sales']);
  const tasosClient = findClient(allClients, [
    'eventmaster',
    'event master',
    'urban catering',
    'urbans melons',
    'urban',
  ]);

  const fawziHasan = [fawzi?.id, hasan?.id].filter((id): id is string => Boolean(id));
  const tasosInternal = [moayad?.id, fawzi?.id].filter((id): id is string => Boolean(id));
  const giuliuInternal = [fawzi?.id, giuliuProfile?.id].filter((id): id is string => Boolean(id));
  const innrvoContacts = await getClientContacts(innrvo?.id || null);

  const rules = [
    await upsertRule({
      workspaceId,
      title: 'Innrvo weekly team meeting',
      description: 'Weekly Innrvo meeting with Hasan and the Fawzi team.',
      clientId: innrvo?.id || null,
      dayOfWeek: 2,
      startTime: '19:00:00',
      internalProfileIds: fawziHasan,
      externalAttendees: innrvoContacts,
    }),
    await upsertRule({
      workspaceId,
      title: 'Innrvo weekly team meeting',
      description: 'Weekly Innrvo meeting with Hasan and the Fawzi team.',
      clientId: innrvo?.id || null,
      dayOfWeek: 6,
      startTime: '11:00:00',
      internalProfileIds: fawziHasan,
      externalAttendees: innrvoContacts,
    }),
    await upsertRule({
      workspaceId,
      title: 'Giuliu weekly client meeting',
      description: 'Weekly Giuliu / Underdog Sales client meeting.',
      clientId: giuliu?.id || null,
      dayOfWeek: 2,
      startTime: '14:00:00',
      internalProfileIds: giuliuInternal,
      externalAttendees: [],
    }),
    await upsertRule({
      workspaceId,
      title: 'Tasos weekly client meeting',
      description: 'Weekly Tasos meeting for Eventmaster / Urban Catering.',
      clientId: tasosClient?.id || null,
      dayOfWeek: 1,
      startTime: '14:00:00',
      internalProfileIds: tasosInternal,
      externalAttendees: [{ name: 'Tasos', email: 'an.kyriakides@gmail.com' }],
    }),
    await upsertRule({
      workspaceId,
      title: 'Tasos weekly client meeting',
      description: 'Weekly Tasos meeting for Eventmaster / Urban Catering.',
      clientId: tasosClient?.id || null,
      dayOfWeek: 3,
      startTime: '14:00:00',
      internalProfileIds: tasosInternal,
      externalAttendees: [{ name: 'Tasos', email: 'an.kyriakides@gmail.com' }],
    }),
  ];
  const materialized = hasGoogleCalendarConfig()
    ? await materializeRecurringMeetings(supabase, { maxOccurrencesPerRule: 4 })
    : await materializeRecurringMeetings(supabase, {
        maxOccurrencesPerRule: 4,
        createCalendarEvents: false,
      });

  console.log(
    JSON.stringify(
      {
        success: true,
        rules,
        materialized,
        found: {
          fawzi: Boolean(fawzi),
          hasan: Boolean(hasan),
          moayad: Boolean(moayad),
          innrvo: innrvo?.display_name || innrvo?.name || null,
          giuliu: giuliu?.display_name || giuliu?.name || null,
          giuliuProfile: Boolean(giuliuProfile),
          tasosClient: tasosClient?.display_name || tasosClient?.name || null,
          innrvoContactCount: innrvoContacts.length,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
