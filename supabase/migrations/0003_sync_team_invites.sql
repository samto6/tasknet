-- Ensure teams.invite_code is mirrored into team_invites so join links work.
create or replace function public.sync_team_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invite_code is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.invite_code is not null and old.invite_code <> new.invite_code then
    delete from public.team_invites where token = old.invite_code;
  end if;

  insert into public.team_invites(token, team_id)
  values (new.invite_code, new.id)
  on conflict (token) do update
    set team_id = excluded.team_id;

  return new;
end;
$$;

drop trigger if exists t_sync_team_invite on public.teams;
create trigger t_sync_team_invite
  after insert or update of invite_code on public.teams
  for each row execute function public.sync_team_invite();

-- Backfill any existing teams so legacy rows get an invite entry.
insert into public.team_invites(token, team_id)
select invite_code, id
from public.teams
where invite_code is not null
on conflict (token) do nothing;
