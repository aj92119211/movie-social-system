create table if not exists public.tw_entertainment_news_items (
  id uuid primary key default gen_random_uuid(),
  result_type text not null check (result_type in ('news', 'social')),
  title text,
  source_name text,
  platform text,
  account_name text,
  article_url text,
  post_url text,
  published_date date,
  related_title text,
  category text,
  tags text[] not null default '{}',
  snippet text,
  ai_summary text,
  key_point text,
  useful_for text[] not null default '{}',
  interaction_observation text,
  note text,
  raw_content text,
  search_keyword text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tw_entertainment_news_items_article_url_unique
on public.tw_entertainment_news_items (article_url)
where article_url is not null and article_url <> '';

create unique index if not exists tw_entertainment_news_items_post_url_unique
on public.tw_entertainment_news_items (post_url)
where post_url is not null and post_url <> '';

create index if not exists tw_entertainment_news_items_keyword_idx
on public.tw_entertainment_news_items (search_keyword);

create index if not exists tw_entertainment_news_items_type_idx
on public.tw_entertainment_news_items (result_type);

create or replace function public.set_tw_entertainment_news_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tw_entertainment_news_items_updated_at on public.tw_entertainment_news_items;

create trigger set_tw_entertainment_news_items_updated_at
before update on public.tw_entertainment_news_items
for each row
execute function public.set_tw_entertainment_news_items_updated_at();
