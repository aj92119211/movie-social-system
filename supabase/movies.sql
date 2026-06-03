create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  genre text not null,
  release_date date,
  release_status text not null default '未上映' check (release_status in ('未上映', '上映中', '下檔')),
  social_tone text not null,
  core_selling_points text[] not null default '{}',
  phase text not null default 'Planning',
  owner text not null default 'Unassigned',
  progress integer not null default 10 check (progress >= 0 and progress <= 100),
  color text not null default '#234a8f',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.movies
alter column release_date drop not null;

alter table public.movies
add column if not exists release_status text not null default '未上映';

alter table public.movies
drop constraint if exists movies_release_status_check;

alter table public.movies
add constraint movies_release_status_check
check (release_status in ('未上映', '上映中', '下檔'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists movies_set_updated_at on public.movies;

create trigger movies_set_updated_at
before update on public.movies
for each row
execute function public.set_updated_at();

alter table public.movies
add column if not exists cover_url text not null default '';
