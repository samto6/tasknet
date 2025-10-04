-- Ensure team creation works for any authenticated user even if auth.role() is unset
set check_function_bodies = off;

drop policy if exists "team insert any authed" on public.teams;
create policy "team insert any authed" on public.teams
  for insert
  with check (auth.uid() is not null);
