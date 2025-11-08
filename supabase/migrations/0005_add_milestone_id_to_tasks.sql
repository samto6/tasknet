-- Add milestone_id column to tasks table
alter table public.tasks
  add column if not exists milestone_id uuid references public.milestones(id) on delete set null;

-- Add index for better query performance
create index if not exists idx_tasks_milestone_id on public.tasks(milestone_id);

-- Add comment
comment on column public.tasks.milestone_id is 'Optional reference to a milestone for grouping tasks';
