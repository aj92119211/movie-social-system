alter table public.ai_style_examples
add column if not exists quality_tags text[] not null default '{}';

alter table public.ai_style_examples
add column if not exists use_case text not null default '';

alter table public.ai_style_examples
add column if not exists is_active boolean not null default true;

alter table public.ai_style_examples
add column if not exists score integer not null default 3;

alter table public.ai_style_examples
add column if not exists ai_instruction text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_style_examples_score_range'
  ) then
    alter table public.ai_style_examples
    add constraint ai_style_examples_score_range
    check (score between 1 and 5);
  end if;
end $$;

create index if not exists ai_style_examples_active_score_idx
on public.ai_style_examples (is_active, score desc);

create index if not exists ai_style_examples_match_idx
on public.ai_style_examples (type, platform, movie_genre, campaign_stage);
