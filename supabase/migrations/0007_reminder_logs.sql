-- Reminder logs table to track sent reminders
create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('task', 'milestone')),
  entity_id uuid not null,
  recipient_id uuid not null references public.users(id) on delete cascade,
  sent_by uuid not null references public.users(id) on delete cascade,
  sent_at timestamptz not null default now()
);

alter table public.reminder_logs enable row level security;

-- Admins can view reminder logs for their team's entities
drop policy if exists "reminder_logs readable by team" on public.reminder_logs;
create policy "reminder_logs readable by team" on public.reminder_logs
  for select using (
    -- For tasks
    (entity_type = 'task' and exists(
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = entity_id and is_team_member(p.team_id)
    ))
    or
    -- For milestones
    (entity_type = 'milestone' and exists(
      select 1 from public.milestones m
      join public.projects p on p.id = m.project_id
      where m.id = entity_id and is_team_member(p.team_id)
    ))
  );

-- Only admins can insert reminder logs (server action will verify admin status)
drop policy if exists "reminder_logs insert by admin" on public.reminder_logs;
create policy "reminder_logs insert by admin" on public.reminder_logs
  for insert with check (
    -- For tasks
    (entity_type = 'task' and exists(
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = entity_id and is_team_admin(p.team_id)
    ))
    or
    -- For milestones
    (entity_type = 'milestone' and exists(
      select 1 from public.milestones m
      join public.projects p on p.id = m.project_id
      where m.id = entity_id and is_team_admin(p.team_id)
    ))
  );

-- Index for quick lookups
create index if not exists idx_reminder_logs_entity on public.reminder_logs(entity_type, entity_id);
create index if not exists idx_reminder_logs_recipient on public.reminder_logs(recipient_id);
