create table if not exists public.private_notes (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision integer not null default 0,
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.private_note_idempotency (
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  note_id uuid not null,
  revision integer not null,
  primary key (owner_id, idempotency_key)
);

create table if not exists public.private_note_revisions (
  note_id uuid not null references public.private_notes(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (note_id, revision)
);

alter table public.private_notes enable row level security;
alter table public.private_note_idempotency enable row level security;
alter table public.private_note_revisions enable row level security;

create policy "owners read private notes" on public.private_notes for select using (owner_id = auth.uid());
create policy "owners insert private notes" on public.private_notes for insert with check (owner_id = auth.uid());
create policy "owners update private notes" on public.private_notes for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners read idempotency" on public.private_note_idempotency for select using (owner_id = auth.uid());
create policy "owners read private note revisions" on public.private_note_revisions for select using (owner_id = auth.uid());

create or replace function public.sync_private_note(
  input_note jsonb,
  input_base_revision integer,
  input_idempotency_key uuid
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  current_note public.private_notes%rowtype;
  acknowledged_revision integer;
  note_id uuid := (input_note->>'id')::uuid;
begin
  if (input_note->>'ownerId')::uuid <> auth.uid() then raise exception 'owner mismatch'; end if;
  select revision into acknowledged_revision from public.private_note_idempotency
    where owner_id = auth.uid() and idempotency_key = input_idempotency_key;
  if found then return jsonb_build_object('status', 'acknowledged', 'revision', acknowledged_revision); end if;
  select * into current_note from public.private_notes where id = note_id and owner_id = auth.uid() for update;
  if found and current_note.revision <> input_base_revision then
    return jsonb_build_object('status', 'conflict', 'note', current_note.payload);
  end if;
  insert into public.private_notes (id, owner_id, payload, revision, deleted_at, updated_at)
    values (note_id, auth.uid(), input_note, coalesce(current_note.revision, 0) + 1,
      nullif(input_note->>'deletedAt', '')::timestamptz, now())
    on conflict (id) do update set payload = excluded.payload, revision = excluded.revision,
      deleted_at = excluded.deleted_at, updated_at = excluded.updated_at
    returning revision into acknowledged_revision;
  insert into public.private_note_idempotency (owner_id, idempotency_key, note_id, revision)
    values (auth.uid(), input_idempotency_key, note_id, acknowledged_revision);
  insert into public.private_note_revisions (note_id, owner_id, revision, payload)
    values (note_id, auth.uid(), acknowledged_revision, input_note);
  return jsonb_build_object('status', 'acknowledged', 'revision', acknowledged_revision);
end;
$$;

revoke all on function public.sync_private_note(jsonb, integer, uuid) from public;
grant execute on function public.sync_private_note(jsonb, integer, uuid) to authenticated;
