-- 數據分析正式資料表
-- 使用方式：Supabase Dashboard -> SQL Editor -> New query -> 貼上本檔內容 -> Run

create table if not exists public.social_analytics_periods (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  week_label text not null default '',
  date_range text not null default '',
  platform text not null default 'Instagram',
  phase text not null default '上映首週',
  total_reach integer not null default 0 check (total_reach >= 0),
  total_views integer not null default 0 check (total_views >= 0),
  total_engagement integer not null default 0 check (total_engagement >= 0),
  new_followers integer not null default 0 check (new_followers >= 0),
  non_follower_rate numeric(8,2) not null default 0,
  engagement_rate numeric(8,2) not null default 0,
  best_post text not null default '',
  worst_post text not null default '',
  weekly_conclusion text not null default '',
  next_week_suggestion text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_post_metrics (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  platform text not null default 'Instagram',
  phase text not null default '上映首週',
  post_date date,
  recorded_date date,
  observation_period text not null default '發文後 7 天',
  post_title text not null default '',
  content_type text not null default '其他',
  post_url text not null default '',
  reach integer not null default 0 check (reach >= 0),
  views integer not null default 0 check (views >= 0),
  engagement integer not null default 0 check (engagement >= 0),
  shares integer not null default 0 check (shares >= 0),
  saves integer not null default 0 check (saves >= 0),
  comments integer not null default 0 check (comments >= 0),
  new_followers integer not null default 0 check (new_followers >= 0),
  non_follower_rate numeric(8,2) not null default 0,
  engagement_rate numeric(8,2) not null default 0,
  cta text not null default '',
  conclusion text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_social_analytics_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists social_analytics_periods_set_updated_at on public.social_analytics_periods;
create trigger social_analytics_periods_set_updated_at
before update on public.social_analytics_periods
for each row
execute function public.set_social_analytics_updated_at();

drop trigger if exists social_post_metrics_set_updated_at on public.social_post_metrics;
create trigger social_post_metrics_set_updated_at
before update on public.social_post_metrics
for each row
execute function public.set_social_analytics_updated_at();

create index if not exists social_analytics_periods_movie_id_idx
on public.social_analytics_periods(movie_id);

create index if not exists social_post_metrics_movie_id_idx
on public.social_post_metrics(movie_id);

create index if not exists social_post_metrics_movie_post_date_idx
on public.social_post_metrics(movie_id, post_date desc);
