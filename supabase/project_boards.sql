-- 專案大表：集中管理 Google Sheet、Notion、Airtable、Drive 等外部協作連結。
-- 使用方式：Supabase Dashboard -> SQL Editor -> New query -> 貼上本檔內容 -> Run

create extension if not exists pgcrypto;

create table if not exists public.project_boards (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid null references public.movies(id) on delete set null,
  project_name text not null,
  project_type text,
  status text,
  link_label text,
  project_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists project_boards_movie_id_idx on public.project_boards(movie_id);
create index if not exists project_boards_status_idx on public.project_boards(status);
create index if not exists project_boards_project_type_idx on public.project_boards(project_type);

create or replace function public.set_project_boards_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_project_boards_updated_at on public.project_boards;

create trigger set_project_boards_updated_at
before update on public.project_boards
for each row
execute function public.set_project_boards_updated_at();
