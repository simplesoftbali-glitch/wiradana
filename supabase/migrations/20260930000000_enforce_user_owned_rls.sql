alter table public.rab_items
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.actual_expenses
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.rab_items as items
set user_id = projects.user_id
from public.projects
where projects.id = items.project_id
  and items.user_id is distinct from projects.user_id;

update public.actual_expenses as expenses
set user_id = projects.user_id
from public.projects
where projects.id = expenses.project_id
  and expenses.user_id is distinct from projects.user_id;

do $$
begin
  if exists (
    select 1
    from public.rab_items as items
    left join public.projects on projects.id = items.project_id
    where projects.user_id is null
  ) then
    raise exception 'Cannot enable owner-only RLS: rab_items contains rows without an owning project.';
  end if;

  if exists (
    select 1
    from public.actual_expenses as expenses
    left join public.projects on projects.id = expenses.project_id
    where projects.user_id is null
  ) then
    raise exception 'Cannot enable owner-only RLS: actual_expenses contains rows without an owning project.';
  end if;
end
$$;

alter table public.rab_items
  alter column user_id set default auth.uid(),
  alter column user_id set not null;
alter table public.actual_expenses
  alter column user_id set default auth.uid(),
  alter column user_id set not null;

do $$
declare
  target_table text;
  existing_policy record;
begin
  foreach target_table in array array[
    'projects',
    'rab_items',
    'actual_expenses',
    'invoices',
    'company_profiles'
  ] loop
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format(
        'drop policy %I on public.%I',
        existing_policy.policyname,
        target_table
      );
    end loop;

    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all privileges on table public.%I from anon, public', target_table);
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      target_table
    );

    execute format(
      'create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)',
      'owner_select',
      target_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)',
      'owner_insert',
      target_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      'owner_update',
      target_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)',
      'owner_delete',
      target_table
    );
  end loop;

  execute 'drop policy owner_insert on public.invoices';
  execute $policy$
    create policy owner_insert on public.invoices
    for insert to authenticated
    with check (
      auth.uid() = user_id
      and exists (
        select 1
        from public.projects
        where projects.id = invoices.project_id
          and projects.user_id = auth.uid()
      )
    )
  $policy$;

  execute 'drop policy owner_update on public.invoices';
  execute $policy$
    create policy owner_update on public.invoices
    for update to authenticated
    using (auth.uid() = user_id)
    with check (
      auth.uid() = user_id
      and exists (
        select 1
        from public.projects
        where projects.id = invoices.project_id
          and projects.user_id = auth.uid()
      )
    )
  $policy$;
end
$$;
