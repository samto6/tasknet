-- Fix team member visibility issues
-- Uses security definer functions to bypass RLS for membership checks

-- Make helper functions security definer to bypass RLS
create or replace function public.is_team_member(_team uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.memberships m
    where m.team_id = _team and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_admin(_team uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.memberships m
    where m.team_id = _team and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- Allow team members to read all memberships in their teams
drop policy if exists "team members can read team memberships" on public.memberships;
create policy "team members can read team memberships" on public.memberships
  for select using (is_team_member(team_id));

-- Allow team members to read each other's profiles
create policy "team members can read each other" on public.users
  for select using (
    id = auth.uid()
    or
    exists (
      select 1 from public.memberships m1
      join public.memberships m2 on m1.team_id = m2.team_id
      where m1.user_id = auth.uid()
        and m2.user_id = public.users.id
    )
  );
