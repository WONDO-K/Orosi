create table if not exists public.author_blocks (owner_id uuid not null references auth.users(id) on delete cascade, blocked_author_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), primary key(owner_id, blocked_author_id));
create table if not exists public.content_reports (id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id) on delete cascade, publication_id uuid, reported_author_id uuid not null references auth.users(id), category text not null check (category in ('spam','abuse','copyright','sexual','violence','other')), detail text not null default '', created_at timestamptz not null default now());
create table if not exists public.moderation_audit (id bigint generated always as identity primary key, actor_id uuid not null references auth.users(id), publication_id uuid, action text not null check (action in ('approve','hide','remove','warn','suspend','ban')), reason text not null default '', created_at timestamptz not null default now());
alter table public.author_blocks enable row level security;
alter table public.content_reports enable row level security;
alter table public.moderation_audit enable row level security;
create policy "owners manage blocks" on public.author_blocks for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "reporters create reports" on public.content_reports for insert with check (reporter_id = auth.uid());
create policy "reporters read own reports" on public.content_reports for select using (reporter_id = auth.uid());
-- Moderation audit access is granted only by a server-managed operator role; no client write policy exists.
