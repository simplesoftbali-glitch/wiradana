drop policy if exists "Users can update their own project invoices" on public.invoices;
create policy "Users can update their own project invoices"
  on public.invoices for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.projects
      where projects.id = invoices.project_id
        and projects.user_id = auth.uid()
    )
  );

grant update on public.invoices to authenticated;
