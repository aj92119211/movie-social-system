-- Supabase RLS hardening for movie-social-system.
-- Goal:
-- 1. Enable RLS on all public tables used by this project (plus legacy table names if they already exist).
-- 2. Remove any existing policies on those tables to avoid leaving overly broad anon/authenticated access behind.
-- 3. Re-create only the minimal public-read policies required by the current site.
--
-- Notes:
-- - The current app writes to Supabase through server.js using SUPABASE_SERVICE_ROLE_KEY.
-- - service_role bypasses RLS, so private tables do not need anon/authenticated write policies.
-- - This script is idempotent and safe to run multiple times.

do $$
declare
  table_name text;
  policy_name text;
  target_tables text[] := array[
    'movies',
    'project_boards',
    'movie_assets',
    'social_schedules',
    'comment_replies',
    'ai_style_examples',
    'social_post_metrics',
    'social_analytics_periods',
    'workflow_collections',
    'tw_entertainment_news_items'
  ];
begin
  foreach table_name in array target_tables loop
    if to_regclass(format('public.%s', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);

    for policy_name in
      select pol.policyname
      from pg_policies pol
      where pol.schemaname = 'public'
        and pol.tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.movies') is not null then
    create policy movies_public_read
      on public.movies
      for select
      to anon
      using (true);
  end if;

  if to_regclass('public.movie_assets') is not null then
    create policy movie_assets_public_read
      on public.movie_assets
      for select
      to anon
      using (true);
  end if;
end $$;
