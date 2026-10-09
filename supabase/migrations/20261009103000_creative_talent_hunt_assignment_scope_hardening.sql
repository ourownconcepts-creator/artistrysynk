-- Keep judge assignment operations scoped to Creative Talent Hunt.
-- A repeated assignment request must never reset a scored/locked assignment.

create or replace function public.assign_creative_talent_hunt_judge(
  p_judge_id uuid,
  p_application_id uuid,
  p_round_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competition uuid;
  v_app_competition uuid;
  v_judge_competition uuid;
  v_id uuid;
  v_inserted boolean := false;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then
    raise exception 'not authorised';
  end if;

  select id into v_competition
  from public.competition_competitions
  where slug = 'creative-talent-hunt';

  select competition_id into v_judge_competition
  from public.competition_judges
  where id = p_judge_id and is_active = true;

  select competition_id into v_app_competition
  from public.competition_applications
  where id = p_application_id;

  if v_competition is null
     or v_judge_competition is distinct from v_competition
     or v_app_competition is distinct from v_competition
     or not exists (
       select 1 from public.competition_rounds
       where id = p_round_id and competition_id = v_competition
     )
  then
    raise exception 'invalid Creative Talent Hunt judge, application or round';
  end if;

  insert into public.competition_judge_assignments(judge_id, application_id, round_id, status)
  values (p_judge_id, p_application_id, p_round_id, 'ASSIGNED')
  on conflict (judge_id, application_id, round_id) do nothing
  returning id into v_id;

  if v_id is not null then
    v_inserted := true;
  else
    select id into v_id
    from public.competition_judge_assignments
    where judge_id = p_judge_id
      and application_id = p_application_id
      and round_id = p_round_id;
  end if;

  if v_inserted then
    insert into public.competition_audit_logs(
      competition_id, actor_user_id, action, entity_type, entity_id, metadata
    )
    values (
      v_competition, auth.uid(), 'JUDGE_ASSIGNED', 'JUDGE_ASSIGNMENT', v_id,
      jsonb_build_object(
        'judge_id', p_judge_id,
        'application_id', p_application_id,
        'round_id', p_round_id
      )
    );
  end if;

  return v_id;
end;
$$;

grant execute on function public.assign_creative_talent_hunt_judge(uuid, uuid, uuid) to authenticated;

create or replace function public.creative_talent_hunt_judge_queue(p_judge_id uuid default null)
returns table(
  assignment_id uuid,
  application_id uuid,
  round_id uuid,
  status text,
  display_name text,
  handle text,
  category_name text,
  bio text,
  audition_url text,
  round_name text,
  criteria_count bigint,
  scored_criteria bigint
)
language sql
security definer
set search_path = public
as $$
  select
    a.id, a.application_id, a.round_id, a.status,
    app.display_name, app.handle, cat.name, app.bio, app.audition_url, r.name,
    (select count(*) from public.competition_scoring_criteria c where c.round_id = a.round_id),
    (select count(*) from public.competition_scores s where s.assignment_id = a.id)
  from public.competition_judge_assignments a
  join public.competition_judges j on j.id = a.judge_id
  join public.competition_applications app on app.id = a.application_id
  join public.competition_categories cat on cat.id = app.category_id
  join public.competition_rounds r on r.id = a.round_id
  join public.competition_competitions comp on comp.id = r.competition_id
  where comp.slug = 'creative-talent-hunt'
    and app.competition_id = comp.id
    and j.competition_id = comp.id
    and j.user_id = auth.uid()
    and j.is_active = true
    and (p_judge_id is null or j.id = p_judge_id)
  order by a.assigned_at;
$$;

grant execute on function public.creative_talent_hunt_judge_queue(uuid) to authenticated;
