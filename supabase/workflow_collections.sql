create table if not exists public.workflow_collections (
  kind text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_workflow_collections_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists workflow_collections_set_updated_at on public.workflow_collections;
create trigger workflow_collections_set_updated_at
before update on public.workflow_collections
for each row
execute function public.set_workflow_collections_updated_at();

insert into public.workflow_collections (kind, data)
values
  ('assets', '[]'::jsonb),
  ('schedules', '[]'::jsonb),
  ('activities', '[]'::jsonb),
  ('questions', '[]'::jsonb),
  ('socialMetrics', '[]'::jsonb),
  ('postAnalyses', '[]'::jsonb)
on conflict (kind) do nothing;
