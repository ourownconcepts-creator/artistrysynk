-- Creative Talent Hunt progression hardening
-- Server-side gates for judging, decisions, advancement and score corrections.

create or replace function public.creative_talent_hunt_round_progress(p_round_id uuid)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_round public.competition_rounds%rowtype;
  v_comp uuid;
  v_contestants int := 0;
  v_assigned int := 0;
  v_scored int := 0;
  v_decided int := 0;
  v_criteria int := 0;
begin
  select r.*, r.competition_id into v_round from public.competition_rounds r where r.id=p_round_id;
  if v_round.id is null then raise exception 'round not found'; end if;
  v_comp := v_round.competition_id;

  select count(*) into v_contestants
  from public.competition_applications a
  where a.competition_id=v_comp and a.current_round_id=p_round_id
    and a.progress_state not in ('WITHDRAWN','DISQUALIFIED','ELIMINATED');

  select count(*) into v_assigned
  from public.competition_judge_assignments ja
  where ja.round_id=p_round_id;

  select count(*) into v_scored
  from public.competition_judge_assignments ja
  where ja.round_id=p_round_id and ja.status in ('SCORED','LOCKED');

  select count(*) into v_decided
  from public.competition_applications a
  where a.current_round_id=p_round_id
    and a.progress_state in ('ADVANCED','ELIMINATED','WINNER');

  select count(*) into v_criteria
  from public.competition_scoring_criteria c where c.round_id=p_round_id;

  return jsonb_build_object(
    'ok',true,'contestants_in_round',v_contestants,'assigned_judges',v_assigned,
    'judging_complete',v_scored,'judging_pending',greatest(v_assigned-v_scored,0),
    'criteria_count',v_criteria,'decisions',v_decided,
    'unresolved',greatest(v_contestants-v_decided,0)
  );
end;
$$;
grant execute on function public.creative_talent_hunt_round_progress(uuid) to authenticated;

create or replace function public.set_creative_talent_hunt_round_status(
  p_round_id uuid, p_status text, p_override boolean default false, p_reason text default ''
)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_round public.competition_rounds%rowtype;
  v_progress jsonb;
  v_pending int;
  v_unresolved int;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  select * into v_round from public.competition_rounds where id=p_round_id;
  if v_round.id is null then raise exception 'round not found'; end if;

  v_progress := public.creative_talent_hunt_round_progress(p_round_id);
  v_pending := coalesce((v_progress->>'judging_pending')::int,0);
  v_unresolved := coalesce((v_progress->>'unresolved')::int,0);

  if p_status='DECISION_PENDING' and v_round.status not in ('JUDGING','OPEN') then
    raise exception 'invalid transition';
  end if;
  if p_status='DECIDED' and not p_override and (v_pending>0 or v_unresolved>0) then
    raise exception 'round is not ready for decision';
  end if;
  if p_status='CLOSED' and v_round.status <> 'DECIDED' and not p_override then
    raise exception 'round must be decided before closing';
  end if;
  if p_override and trim(p_reason)='' then raise exception 'reason required for override'; end if;

  update public.competition_rounds set status=p_status where id=p_round_id;

  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_round.competition_id,auth.uid(),'ROUND_STATUS_CHANGED','ROUND',p_round_id,
    jsonb_build_object('from',v_round.status,'to',p_status,'override',p_override,'reason',p_reason));

  return jsonb_build_object('ok',true,'previous_state',v_round.status,'new_state',p_status,'progress',v_progress);
end;
$$;
grant execute on function public.set_creative_talent_hunt_round_status(uuid,text,boolean,text) to authenticated;

create or replace function public.decide_creative_talent_hunt_round(
  p_application_id uuid, p_outcome text, p_reason text default ''
)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_app public.competition_applications%rowtype;
  v_round public.competition_rounds%rowtype;
  v_next public.competition_rounds%rowtype;
  v_existing text;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  if p_outcome not in ('ADVANCED','ELIMINATED','HELD') then raise exception 'invalid outcome'; end if;
  if p_outcome='ELIMINATED' and trim(p_reason)='' then raise exception 'reason required'; end if;

  select * into v_app from public.competition_applications where id=p_application_id;
  if v_app.id is null then raise exception 'application not found'; end if;
  select * into v_round from public.competition_rounds where id=v_app.current_round_id;
  if v_round.id is null then raise exception 'no active round'; end if;
  if v_round.status not in ('DECISION_PENDING','JUDGING','IN_PROGRESS') then raise exception 'round is not accepting decisions'; end if;

  if exists (
    select 1 from public.competition_audit_logs l
    where l.entity_id=p_application_id and l.action='ROUND_DECISION'
      and (l.metadata->>'round_id')::uuid=v_round.id
  ) then
    raise exception 'duplicate decision';
  end if;

  if p_outcome='HELD' then
    insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
    values(v_app.competition_id,auth.uid(),'ROUND_DECISION_HELD','APPLICATION',p_application_id,
      jsonb_build_object('round_id',v_round.id,'reason',p_reason));
    return jsonb_build_object('ok',true,'outcome','HELD');
  end if;

  if p_outcome='ELIMINATED' then
    update public.competition_applications
      set progress_state='ELIMINATED', status='REJECTED', updated_at=now()
      where id=p_application_id;
  else
    select * into v_next
    from public.competition_rounds
    where competition_id=v_app.competition_id and sequence>v_round.sequence
      and status <> 'CLOSED'
    order by sequence limit 1;

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
    jsonb_build_object('round_id',v_round.id,'outcome',p_outcome,'next_round_id',v_next.id,'reason',p_reason));

  return jsonb_build_object('ok',true,'outcome',p_outcome,'next_round_id',v_next.id);
end;
$$;
grant execute on function public.decide_creative_talent_hunt_round(uuid,text,text) to authenticated;

create or replace function public.creative_talent_hunt_correct_score(
  p_score_id uuid, p_value numeric, p_reason text
)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_score public.competition_scores%rowtype;
  v_max numeric;
  v_comp uuid;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  if trim(coalesce(p_reason,''))='' then raise exception 'reason required'; end if;

  select s.* into v_score from public.competition_scores s where s.id=p_score_id;
  if v_score.id is null then raise exception 'score not found'; end if;

  select c.max_score,r.competition_id into v_max,v_comp
  from public.competition_scoring_criteria c
  join public.competition_judge_assignments a on a.id=v_score.assignment_id
  join public.competition_rounds r on r.id=a.round_id
  where c.id=v_score.criterion_id;

  if p_value < 0 or p_value > v_max then raise exception 'score outside allowed range'; end if;

  update public.competition_scores
    set score=p_value, updated_at=now()
    where id=p_score_id;

  update public.competition_judge_assignments
    set status='ASSIGNED'
    where id=v_score.assignment_id and status in ('SCORED','LOCKED');

  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_comp,auth.uid(),'SCORE_CORRECTED','SCORE',p_score_id,
    jsonb_build_object('before',v_score.score,'after',p_value,'reason',p_reason,'assignment_id',v_score.assignment_id));

  return jsonb_build_object('ok',true,'before',v_score.score,'after',p_value,'max_score',v_max);
end;
$$;
grant execute on function public.creative_talent_hunt_correct_score(uuid,numeric,text) to authenticated;
