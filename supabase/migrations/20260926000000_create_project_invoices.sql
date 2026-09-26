alter table public.company_profiles
  add column if not exists logo_url text,
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_account_holder text;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_name text not null,
  invoice_number text not null,
  invoice_date date not null default current_date,
  recipient_name text not null,
  recipient_address text not null default '',
  payment_terms text not null default 'Transfer',
  po_number text not null default '',
  currency text not null default 'IDR',
  items jsonb not null default '[]'::jsonb,
  discount_amount numeric(14, 2) not null default 0,
  tax_rate numeric(6, 3) not null default 0,
  other_fees numeric(14, 2) not null default 0,
  prepared_by text not null default '',
  company_details jsonb not null default '{}'::jsonb,
  payment_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint invoices_user_invoice_number_key unique (user_id, invoice_number),
  constraint invoices_discount_nonnegative check (discount_amount >= 0),
  constraint invoices_tax_rate_nonnegative check (tax_rate >= 0),
  constraint invoices_other_fees_nonnegative check (other_fees >= 0),
  constraint invoices_items_array check (jsonb_typeof(items) = 'array')
);

create index if not exists invoices_project_date_idx
  on public.invoices (project_id, invoice_date desc, created_at desc);

alter table public.invoices enable row level security;

drop policy if exists "Users can read their own project invoices" on public.invoices;
create policy "Users can read their own project invoices"
  on public.invoices for select
  using (user_id = auth.uid());

drop policy if exists "Users can create invoices for their own projects" on public.invoices;
create policy "Users can create invoices for their own projects"
  on public.invoices for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.projects
      where projects.id = invoices.project_id
        and projects.user_id = auth.uid()
    )
  );

grant select, insert on public.invoices to authenticated;
