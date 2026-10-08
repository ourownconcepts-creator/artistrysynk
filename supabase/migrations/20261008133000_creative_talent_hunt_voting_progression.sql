-- Creative Talent Hunt voting and round progression adapter
create or replace function public.decide_creative_talent_hunt_round(
  p_application_id uuid,
  p_outcome text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.competition_applications%rowtype;
  v_round public.competition_rounds%rowtype;
  v_next public.competition_rounds%rowtype;
begin
  if not public.creative_talent_hunt_is_admin(auth.uid()) then
    raise exception 'not authorised';
  end if;

  if p_outcome not in ('ADVANCED','ELIMINATED','HELD') then
    raise exception 'invalid outcome';
  end if;

  select * into v_app from public.competition_applications where id=p_application_id;
  if v_app.id is null then raise exception 'application not found'; end if;

  select * into v_round from public.competition_rounds where id=v_app.current_round_id;
  if v_round.id is null then raise exception 'no active round'; end if;

  if p_outcome='ELIMINATED' then
    update public.competition_applications
      set progress_state='ELIMINATED', status='REJECTED', updated_at=now()
      where id=p_application_id;
  elsif p_outcome='ADVANCED' then
    select * into v_next
      from public.competition_rounds
      where competition_id=v_app.competition_id
        and sequence > v_round.sequence
        and status <> 'CLOSED'
      order by sequence
      limit 1;

    if v_next.id is null then
      update public.competition_applications
        set progress_state='WINNER', status='APPROVED', updated_at=now()
        where id=p_application_id;
    else
      update public.competition_applications
        set current_round_id=v_next.id, progress_state='ROUND_ACTIVE', status='APPROVED', updated_at=now()
        where id=p_application_id;
    end if;
  end if;

  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_app.competition_id,auth.uid(),'ROUND_DECISION','APPLICATION',p_application_id,
         jsonb_build_object('round_id',v_round.id,'outcome',p_outcome,'next_round_id',v_next.id));

  return jsonb_build_object('ok',true,'outcome',p_outcome,'next_round_id',v_next.id);
end;
$$;

grant execute on function public.decide_creative_talent_hunt_round(uuid,text) to authenticated;

create or replace function public.cast_creative_talent_hunt_vote(
  p_application_id uuid,
  p_round_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_comp uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select competition_id into v_comp
  from public.competition_applications
  where id=p_application_id;

  if v_comp is null then raise exception 'application not found'; end if;

  if not exists (
    select 1 from public.competition_rounds
    where id=p_round_id
      and competition_id=v_comp
      and public.competition_rounds.public_voting_enabled=true
      and public.competition_rounds.status in ('OPEN','JUDGING')
  ) then
    raise exception 'voting is closed';
  end if;

  insert into public.competition_votes(competition_id,round_id,application_id,voter_user_id)
  values(v_comp,p_round_id,p_application_id,auth.uid())
  on conflict (round_id,application_id,voter_user_id) do nothing;

  return jsonb_build_object('ok',true);
end;
$$;

grant execute on function public.cast_creative_talent_hunt_vote(uuid,uuid) to authenticated;
