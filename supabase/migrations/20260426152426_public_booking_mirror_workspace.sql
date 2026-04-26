-- Public bookings from qualiasolutions.net mirror into `meetings` via
-- mirror_public_booking_to_meeting() trigger, but the original version did
-- not set workspace_id. getMeetings() filters by workspace_id, so those
-- mirrored rows were invisible in the ERP schedule.
--
-- Fix: pick the single Qualia workspace at trigger time and stamp it on the
-- mirrored meeting. Backfills existing orphan rows.

create or replace function public.mirror_public_booking_to_meeting()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  new_meeting_id uuid;
  qualia_workspace_id uuid;
begin
  if new.status = 'confirmed' then
    select id into qualia_workspace_id
    from public.workspaces
    order by created_at asc
    limit 1;

    insert into public.meetings (title, description, start_time, end_time, workspace_id)
    values (
      'Public: ' || new.name,
      'Booked via qualiasolutions.net' ||
        e'\nEmail: ' || new.email ||
        case when new.phone is not null and new.phone <> '' then e'\nPhone: ' || new.phone else '' end ||
        e'\nTimezone: ' || new.timezone ||
        case when new.notes is not null and new.notes <> '' then e'\n\nNotes:\n' || new.notes else '' end,
      new.start_time,
      new.end_time,
      qualia_workspace_id
    )
    returning id into new_meeting_id;

    new.meeting_id := new_meeting_id;
  end if;
  return new;
end;
$function$;

-- Backfill: orphaned mirror rows created before this migration.
update public.meetings m
set workspace_id = (
  select id from public.workspaces order by created_at asc limit 1
)
where m.workspace_id is null
  and exists (
    select 1 from public.public_bookings pb where pb.meeting_id = m.id
  );
