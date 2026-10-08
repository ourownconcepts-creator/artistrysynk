-- Creative Talent Hunt scoring hardening and weighted result aggregation
create or replace function public.save_creative_talent_hunt_scores(
  p_assignment_id uuid,
  p_scores jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_judge_user uuid;
  v_round_id uuid;
  v_item jsonb;
  v_criterion public.competition_scoring_criteria%rowtype;
  v_score numeric;
  v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select j.user_id, a.round_id
    into v_judge_user, v_round_id
  from public.competition_judge_assignments a
  join public.competition_judges j on j.id=a.judge_id
  where a.id=p_assignment_id
    and j.is_active=true
    and j.user_id=auth.uid()
    and a.status='ASSIGNED';

  if v_judge_user is null then
    raise exception 'judge assignment not found or not authorised';
  end if;

  if jsonb_typeof(p_scores) <> 'array' or jsonb_array_length(p_scores)=0 then
    raise exception 'at least one score is required';
  end if;

  for v_item in select * from jsonb_array_elements(p_scores)
  loop
    select * into v_criterion
    from public.competition_scoring_criteria
    where id=(v_item->>'criterion_id')::uuid
      and round_id=v_round_id;

    if v_criterion.id is null then raise exception 'invalid scoring criterion'; end if;

    v_score := (v_item->>'score')::numeric;
    if v_score is null or v_score < 0 or v_score > v_criterion.max_score then
      raise exception 'score outside allowed range';
    end if;

    insert into public.competition_scores(assignment_id,criterion_id,score,comment,submitted_at,updated_at)
    values(
      p_assignment_id,
      v_criterion.id,
      v_score,
      coalesce(v_item->>'comment',''),
      now(),
      now()
    )
    on conflict (assignment_id,criterion_id)
    do update set score=excluded.score,comment=excluded.comment,updated_at=now();

    v_count := v_count + 1;
  end loop;

  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  select a.competition_id,auth.uid(),'JUDGE_SCORES_SAVED','JUDGE_ASSIGNMENT',a.id,
         jsonb_build_object('round_id',a.round_id,'score_count',v_count)
  from public.competition_judge_assignments a
  join public.competition_rounds r on r.id=a.round_id
  where a.id=p_assignment_id;

  return jsonb_build_object('ok',true,'saved',v_count);
end;
$$;

grant execute on function public.save_creative_talent_hunt_scores(uuid,jsonb) to authenticated;

create or replace function public.get_creative_talent_hunt_results(p_round_id uuid)
returns table(
  application_id uuid,
  handle text,
  display_name text,
  category_name text,
  progress_state text,
  judge_score numeric,
  public_votes bigint,
  combined_score numeric
)
language sql
security definer
set search_path = public
as $$
  with apps as (
    select a.id,a.handle,a.display_name,a.progress_state,c.name as category_name
    from public.competition_applications a
    join public.competition_categories c on c.id=a.category_id
    where a.current_round_id=p_round_id
      and a.status in ('SUBMITTED','APPROVED')
  ),
  judge_totals as (
    select ja.application_id,
      coalesce(sum((s.score / nullif(c.max_score,0)) * c.weight) / nullif(sum(c.weight),0) * 100,0) as score
    from public.competition_judge_assignments ja
    join public.competition_scores s on s.assignment_id=ja.id
    join public.competition_scoring_criteria c on c.id=s.criterion_id
    where ja.round_id=p_round_id
    group by ja.application_id
  ),
  votes as (
    select v.application_id,count(*)::bigint as total
    from public.competition_votes v
    where v.round_id=p_round_id and v.is_voided=false
    group by v.application_id
  )
  select apps.id,apps.handle,apps.display_name,apps.category_name,apps.progress_state,
         round(coalesce(j.score,0),2),
         coalesce(v.total,0),
         round(coalesce(j.score,0) + coalesce(v.total,0),2)
  from apps
  left join judge_totals j on j.application_id=apps.id
  left join votes v on v.application_id=apps.id
  order by round(coalesce(j.score,0) + coalesce(v.total,0),2) desc, apps.display_name asc;
$$;

grant execute on function public.get_creative_talent_hunt_results(uuid) to authenticated;
