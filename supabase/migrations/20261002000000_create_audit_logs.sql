create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type text not null check (entity_type in ('actual_expenses', 'rab_items')),
  action_type text not null check (action_type in ('CREATE', 'UPDATE', 'DELETE')),
  description text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_project_created_at_idx
  on public.audit_logs (project_id, created_at desc);

alter table public.audit_logs enable row level security;
revoke all privileges on table public.audit_logs from anon, public;
grant select, insert on table public.audit_logs to authenticated;

create policy audit_logs_owner_select
  on public.audit_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy audit_logs_owner_insert
  on public.audit_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);
