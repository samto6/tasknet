-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- (moved below after memberships table is created)

-- Users (profile)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  created_at timestamptz not null default now()
);
alter table public.users enable row level security;
drop policy if exists "users can read self" on public.users;
create policy "users can read self" on public.users
  for select using (id = auth.uid());
drop policy if exists "users can upsert self" on public.users;
create policy "users can upsert self" on public.users
  for insert with check (id = auth.uid());
drop policy if exists "users can update self" on public.users;
create policy "users can update self" on public.users
  for update using (id = auth.uid());

-- Teams / Memberships
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  semester_start_date date,
  semester_weeks int default 16,
  invite_code text unique,              -- for join-by-link
  created_at timestamptz not null default now()
);
alter table public.teams enable row level security;
-- policies created after helper functions are defined

create table if not exists public.memberships (
  user_id uuid references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  role text not null check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (user_id, team_id)
);
alter table public.memberships enable row level security;
drop policy if exists "membership readable to self" on public.memberships;
create policy "membership readable to self" on public.memberships
  for select using (user_id = auth.uid());
drop policy if exists "membership insert self" on public.memberships;
create policy "membership insert self" on public.memberships
  for insert with check (user_id = auth.uid());
-- delete policy created after helper functions are defined

-- Helper membership checks (now that memberships table exists)
create or replace function public.is_team_member(_team uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.memberships m
    where m.team_id = _team and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_admin(_team uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.memberships m
    where m.team_id = _team and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- Now that helper functions exist, create policies that depend on them
drop policy if exists "team readable to members" on public.teams;
create policy "team readable to members" on public.teams
  for select using (is_team_member(id));
drop policy if exists "team update admin only" on public.teams;
create policy "team update admin only" on public.teams
  for update using (is_team_admin(id));
drop policy if exists "team insert any authed" on public.teams;
create policy "team insert any authed" on public.teams
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "membership delete admin" on public.memberships;
create policy "membership delete admin" on public.memberships
  for delete using (is_team_admin(team_id));

-- Auto-create admin membership on team insert
create or replace function public.add_creator_membership()
returns trigger language plpgsql as $$
begin
  insert into public.memberships(user_id, team_id, role)
  values (auth.uid(), new.id, 'admin');
  return new;
end; $$;
drop trigger if exists t_add_creator_membership on public.teams;
create trigger t_add_creator_membership after insert on public.teams
for each row execute function public.add_creator_membership();

-- Projects / Milestones
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  template_key text,
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;
drop policy if exists "project readable to team" on public.projects;
create policy "project readable to team" on public.projects
  for select using (is_team_member(team_id));
drop policy if exists "project insert by team member" on public.projects;
create policy "project insert by team member" on public.projects
  for insert with check (is_team_member(team_id));
drop policy if exists "project update admin" on public.projects;
create policy "project update admin" on public.projects
  for update using (is_team_admin(team_id));
create index if not exists idx_projects_team on public.projects(team_id);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','done'))
);
alter table public.milestones enable row level security;
drop policy if exists "milestones read team" on public.milestones;
create policy "milestones read team" on public.milestones
  for select using (
    exists(select 1 from public.projects p where p.id = project_id and is_team_member(p.team_id))
  );
drop policy if exists "milestones insert admin" on public.milestones;
create policy "milestones insert admin" on public.milestones
  for insert with check (
    exists(select 1 from public.projects p where p.id = project_id and is_team_admin(p.team_id))
  );
drop policy if exists "milestones update admin" on public.milestones;
create policy "milestones update admin" on public.milestones
  for update using (
    exists(select 1 from public.projects p where p.id = project_id and is_team_admin(p.team_id))
  );
create index if not exists idx_milestones_project_due on public.milestones(project_id, due_at);

-- Tasks / Assignees / Comments
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','in_progress','done')),
  size int,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
drop policy if exists "tasks read team" on public.tasks;
create policy "tasks read team" on public.tasks
  for select using (exists(
    select 1 from public.projects p
    where p.id = project_id and is_team_member(p.team_id)
  ));
drop policy if exists "tasks insert member" on public.tasks;
create policy "tasks insert member" on public.tasks
  for insert with check (exists(
    select 1 from public.projects p
    where p.id = project_id and is_team_member(p.team_id)
  ) and created_by = auth.uid());
drop policy if exists "tasks update member" on public.tasks;
create policy "tasks update member" on public.tasks
  for update using (exists(
    select 1 from public.projects p
    where p.id = project_id and is_team_member(p.team_id)
  ));
drop policy if exists "tasks delete admin or creator" on public.tasks;
create policy "tasks delete admin or creator" on public.tasks
  for delete using (
    exists(select 1 from public.projects p where p.id = project_id and is_team_admin(p.team_id))
    or created_by = auth.uid()
  );
create index if not exists idx_tasks_proj_status_due on public.tasks(project_id, status, due_at);

create table if not exists public.task_assignees (
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  primary key (task_id, user_id)
);
alter table public.task_assignees enable row level security;
drop policy if exists "assignees crud team" on public.task_assignees;
create policy "assignees crud team" on public.task_assignees
  for all using (exists(
    select 1 from public.tasks t join public.projects p on p.id = t.project_id
    where t.id = task_id and is_team_member(p.team_id)
  )) with check (exists(
    select 1 from public.tasks t join public.projects p on p.id = t.project_id
    where t.id = task_id and is_team_member(p.team_id)
  ));
create index if not exists idx_task_assignees_user on public.task_assignees(user_id);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.task_comments enable row level security;
drop policy if exists "comments read team" on public.task_comments;
create policy "comments read team" on public.task_comments
  for select using (exists(
    select 1 from public.tasks t join public.projects p on p.id = t.project_id
    where t.id = task_id and is_team_member(p.team_id)
  ));
drop policy if exists "comments insert team" on public.task_comments;
create policy "comments insert team" on public.task_comments
  for insert with check (exists(
    select 1 from public.tasks t join public.projects p on p.id = t.project_id
    where t.id = task_id and is_team_member(p.team_id)
  ) and user_id = auth.uid());

-- Wellness / Gamification
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  mood int not null check (mood between 1 and 5),
  note_private text,
  created_at timestamptz not null default now()
);
alter table public.checkins enable row level security;
drop policy if exists "checkins owner only" on public.checkins;
create policy "checkins owner only" on public.checkins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Use a generated column for immutable unique constraint per user per day (UTC)
alter table public.checkins
  add column if not exists created_on date generated always as ((created_at at time zone 'UTC')::date) stored;
create unique index if not exists uniq_checkins_user_day
  on public.checkins (user_id, created_on);

create table if not exists public.streaks (
  user_id uuid primary key references public.users(id) on delete cascade,
  current_days int not null default 0,
  longest_days int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.streaks enable row level security;
drop policy if exists "streaks owner only" on public.streaks;
create policy "streaks owner only" on public.streaks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  awarded_at timestamptz not null default now(),
  unique (user_id, kind)
);
alter table public.rewards enable row level security;
drop policy if exists "rewards owner only" on public.rewards;
create policy "rewards owner only" on public.rewards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  kind text not null, -- 'checkin'|'task_completed'
  payload_json jsonb,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
drop policy if exists "events owner only" on public.events;
create policy "events owner only" on public.events
  for select using (user_id = auth.uid());
create index if not exists idx_events_user_created on public.events(user_id, created_at desc);

-- Notifications / Prefs
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  payload_json jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists "notifications owner only" on public.notifications;
create policy "notifications owner only" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.user_prefs (
  user_id uuid primary key references public.users(id) on delete cascade,
  email_mentions boolean not null default true,
  email_due boolean not null default true,
  email_digest boolean not null default true
);
alter table public.user_prefs enable row level security;
drop policy if exists "prefs owner only" on public.user_prefs;
create policy "prefs owner only" on public.user_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Join-by-link token
create table if not exists public.team_invites (
  token text primary key,                     -- short code
  team_id uuid not null references public.teams(id) on delete cascade,
  max_uses int not null default 0,            -- 0 = unlimited
  used_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.team_invites enable row level security;
drop policy if exists "invites visible to admins" on public.team_invites;
create policy "invites visible to admins" on public.team_invites
  for select using (is_team_admin(team_id));
drop policy if exists "invites insert admin" on public.team_invites;
create policy "invites insert admin" on public.team_invites
  for insert with check (is_team_admin(team_id));
drop policy if exists "invites update admin" on public.team_invites;
create policy "invites update admin" on public.team_invites
  for update using (is_team_admin(team_id));

-- Safe RPC to join team by token (keeps notes private)
create or replace function public.join_team_by_token(_token text)
returns void language plpgsql security definer as $$
declare _team uuid;
begin
  select team_id into _team
  from public.team_invites
  where token = _token
    and (expires_at is null or expires_at > now())
    and (max_uses = 0 or used_count < max_uses)
  for update;

  if _team is null then
    raise exception 'Invalid or expired invite';
  end if;

  insert into public.memberships(user_id, team_id, role)
  values (auth.uid(), _team, 'member')
  on conflict do nothing;

  update public.team_invites
    set used_count = used_count + 1
  where token = _token;
end $$;
grant execute on function public.join_team_by_token(text) to authenticated;

-- Index budgets (hot paths)
create index if not exists idx_tasks_due_status on public.tasks(project_id, due_at, status);
create index if not exists idx_comments_task_created on public.task_comments(task_id, created_at desc);
