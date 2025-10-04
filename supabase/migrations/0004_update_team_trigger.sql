-- Skip automatic membership creation when no authenticated user is present (e.g. service role inserts)
create or replace function public.add_creator_membership()
returns trigger
language plpgsql
security definer
as $$
declare
  creator uuid := auth.uid();
begin
  if creator is not null then
    insert into public.memberships(user_id, team_id, role)
    values (creator, new.id, 'admin')
    on conflict (user_id, team_id) do nothing;
  end if;
  return new;
end;
$$;
