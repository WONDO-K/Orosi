create table if not exists public.publications (
  id uuid primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  state text not null check (state in ('published', 'unpublished', 'removed', 'quarantined')) default 'published',
  current_version integer not null,
  created_at timestamptz not null default now(),
  unpublished_at timestamptz
);
create table if not exists public.publication_versions (
  publication_id uuid not null references public.publications(id) on delete cascade,
  version integer not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  document jsonb not null,
  derived_text text not null,
  tags text[] not null default '{}',
  digest text not null,
  published_at timestamptz not null default now(),
  primary key (publication_id, version)
);
create table if not exists public.provenance_links (
  owner_id uuid not null references auth.users(id) on delete cascade,
  destination_note_id uuid not null,
  publication_id uuid not null,
  version integer not null,
  author_id uuid not null,
  scope text not null check (scope in ('note', 'paragraph', 'sentence')),
  digest text not null,
  destination_block_ids text[] not null default '{}',
  imported_at timestamptz not null default now()
);
alter table public.publications enable row level security;
alter table public.publication_versions enable row level security;
alter table public.provenance_links enable row level security;
create policy "published public reads" on public.publications for select using (state = 'published');
create policy "published version reads" on public.publication_versions for select using (exists (select 1 from public.publications p where p.id = publication_id and p.state = 'published'));
create policy "authors create publications" on public.publications for insert with check (author_id = auth.uid());
create policy "authors update publications" on public.publications for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors create versions" on public.publication_versions for insert with check (author_id = auth.uid());
create policy "owners read provenance" on public.provenance_links for select using (owner_id = auth.uid());
create policy "owners create provenance" on public.provenance_links for insert with check (owner_id = auth.uid());
create index if not exists publication_search_idx on public.publication_versions using gin (to_tsvector('simple', title || ' ' || derived_text || ' ' || array_to_string(tags, ' ')));

create or replace function public.search_publications(query text)
returns table (id uuid, version integer, author_id uuid, title text, tags text[], derived_text text)
language sql stable security invoker set search_path = public as $$
  select p.id, v.version, v.author_id, v.title, v.tags, v.derived_text
  from public.publications p join public.publication_versions v on v.publication_id = p.id and v.version = p.current_version
  where p.state = 'published' and to_tsvector('simple', v.title || ' ' || v.derived_text || ' ' || array_to_string(v.tags, ' ')) @@ websearch_to_tsquery('simple', query)
  order by ts_rank(to_tsvector('simple', v.title || ' ' || v.derived_text || ' ' || array_to_string(v.tags, ' ')), websearch_to_tsquery('simple', query)) desc;
$$;
grant execute on function public.search_publications(text) to anon, authenticated;
