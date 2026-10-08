-- Creative Talent Hunt judging operations: judge appointments, assignments and score finalisation
create or replace function public.creative_talent_hunt_admin_judges()
returns table(
  id uuid, user_id uuid, display_name text, bio text, is_active boolean, created_at timestamptz,
  assigned_count bigint, scored_count bigint
)
language sql security definer set search_path=public as $$
  select j.id,j.user_id,j.display_name,j.bio,j.is_active,j.created_at,
    count(distinct a.id) filter (where a.status in ('ASSIGNED','SCORED','LOCKED'))::bigint,
    count(distinct a.id) filter (where a.status in ('SCORED','LOCKED'))::bigint
  from public.competition_judges j
  left join public.competition_judge_assignments a on a.judge_id=j.id
  where j.competition_id=(select id from public.competition_competitions where slug='creative-talent-hunt')
    and public.creative_talent_hunt_admin(auth.uid())
  group by j.id
  order by j.display_name;
$$;
grant execute on function public.creative_talent_hunt_admin_judges() to authenticated;

create or replace function public.appoint_creative_talent_hunt_judge(
  p_user_id uuid, p_display_name text, p_bio text default ''
)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_competition uuid; v_id uuid;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  select id into v_competition from public.competition_competitions where slug='creative-talent-hunt';
  if v_competition is null then raise exception 'competition not found'; end if;
  insert into public.competition_judges(competition_id,user_id,display_name,bio,is_active)
  values(v_competition,p_user_id,trim(p_display_name),coalesce(p_bio,''),true)
  on conflict (competition_id,user_id) do update
    set display_name=excluded.display_name,bio=excluded.bio,is_active=true
  returning id into v_id;
  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_competition,auth.uid(),'JUDGE_APPOINTED','JUDGE',v_id,jsonb_build_object('user_id',p_user_id));
  return jsonb_build_object('ok',true,'judge_id',v_id);
end;
$$;
grant execute on function public.appoint_creative_talent_hunt_judge(uuid,text,text) to authenticated;

create or replace function public.set_creative_talent_hunt_judge_active(p_judge_id uuid,p_active boolean)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_competition uuid;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  select competition_id into v_competition from public.competition_judges where id=p_judge_id;
  if v_competition is null then raise exception 'judge not found'; end if;
  update public.competition_judges set is_active=p_active where id=p_judge_id;
  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_competition,auth.uid(),case when p_active then 'JUDGE_ACTIVATED' else 'JUDGE_DEACTIVATED' end,'JUDGE',p_judge_id,'{}'::jsonb);
  return jsonb_build_object('ok',true,'active',p_active);
end;
$$;
grant execute on function public.set_creative_talent_hunt_judge_active(uuid,boolean) to authenticated;

create or replace function public.assign_creative_talent_hunt_judge(
  p_judge_id uuid,p_application_id uuid,p_round_id uuid
)
returns uuid
language plpgsql security definer set search_path=public as $
declare v_competition uuid; v_app_competition uuid; v_judge_competition uuid; v_id uuid;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  select competition_id into v_judge_competition from public.competition_judges where id=p_judge_id and is_active=true;
  select competition_id into v_app_competition from public.competition_applications where id=p_application_id;
  select competition_id into v_competition from public.competition_rounds where id=p_round_id;
  if v_judge_competition is null or v_app_competition is null or v_competition is null
     or v_judge_competition<>v_app_competition or v_app_competition<>v_competition
  then raise exception 'invalid judge, application or round'; end if;
  insert into public.competition_judge_assignments(judge_id,application_id,round_id,status)
  values(p_judge_id,p_application_id,p_round_id,'ASSIGNED')
  on conflict(judge_id,application_id,round_id) do update set status='ASSIGNED';
  select id into v_id from public.competition_judge_assignments
    where judge_id=p_judge_id and application_id=p_application_id and round_id=p_round_id;
  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_app_competition,auth.uid(),'JUDGE_ASSIGNED','JUDGE_ASSIGNMENT',v_id,
    jsonb_build_object('judge_id',p_judge_id,'application_id',p_application_id,'round_id',p_round_id));
  return v_id;
end;
$;
grant execute on function public.assign_creative_talent_hunt_judge(uuid,uuid,uuid) to authenticated;

create or replace function public.finalize_creative_talent_hunt_scores(p_assignment_id uuid)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_round uuid; v_criteria int; v_scored int; v_comp uuid;
begin
  select a.round_id,r.competition_id into v_round,v_comp
  from public.competition_judge_assignments a
  join public.competition_rounds r on r.id=a.round_id
  join public.competition_judges j on j.id=a.judge_id
  where a.id=p_assignment_id and j.user_id=auth.uid() and j.is_active=true and a.status='ASSIGNED';
  if v_round is null then raise exception 'judge assignment not found or not authorised'; end if;
  select count(*) into v_criteria from public.competition_scoring_criteria where round_id=v_round;
  select count(*) into v_scored from public.competition_scores where assignment_id=p_assignment_id;
  if v_criteria=0 then raise exception 'no scoring criteria configured'; end if;
  if v_scored < v_criteria then raise exception 'all scoring criteria must be completed before finalising'; end if;
  update public.competition_judge_assignments set status='SCORED' where id=p_assignment_id;
  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_comp,auth.uid(),'JUDGE_SCORES_FINALISED','JUDGE_ASSIGNMENT',p_assignment_id,
    jsonb_build_object('round_id',v_round,'criteria_count',v_criteria));
  return jsonb_build_object('ok',true,'status','SCORED');
end;
$$;
grant execute on function public.finalize_creative_talent_hunt_scores(uuid) to authenticated;

create or replace function public.creative_talent_hunt_judge_queue(p_judge_id uuid default null)
returns table(
 assignment_id uuid, application_id uuid, round_id uuid, status text,
 display_name text, handle text, category_name text, bio text, audition_url text, round_name text,
 criteria_count bigint, scored_criteria bigint
)
language sql security definer set search_path=public as $$
  select a.id,a.application_id,a.round_id,a.status,
    app.display_name,app.handle,cat.name,app.bio,app.audition_url,r.name,
    (select count(*) from public.competition_scoring_criteria c where c.round_id=a.round_id),
    (select count(*) from public.competition_scores s where s.assignment_id=a.id)
  from public.competition_judge_assignments a
  join public.competition_judges j on j.id=a.judge_id
  join public.competition_applications app on app.id=a.application_id
  join public.competition_categories cat on cat.id=app.category_id
  join public.competition_rounds r on r.id=a.round_id
  where j.user_id=auth.uid() and j.is_active=true
    and (p_judge_id is null or j.id=p_judge_id)
  order by a.assigned_at;
$$;
grant execute on function public.creative_talent_hunt_judge_queue(uuid) to authenticated;
