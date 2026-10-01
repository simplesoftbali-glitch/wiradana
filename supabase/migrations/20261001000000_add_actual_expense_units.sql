alter table public.actual_expenses
  add column if not exists unit text;
