-- Admin score corrections must not silently unlock a finalized judge assignment.
-- The correction itself and its reason remain recorded in the audit log.
create or replace function public.creative_talent_hunt_correct_score(
  p_score_id uuid,
  p_value numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score public.competition_scores%rowtype;
  v_max numeric;
  v_comp uuid;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then
    raise exception 'not authorised';
  end if;

  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'reason required';
  end if;

  select s.* into v_score
  from public.competition_scores s
  where s.id = p_score_id;

  if v_score.id is null then
    raise exception 'score not found';
  end if;

  select c.max_score, r.competition_id into v_max, v_comp
  from public.competition_scoring_criteria c
  join public.competition_judge_assignments a on a.id = v_score.assignment_id
  join public.competition_rounds r on r.id = a.round_id
  where c.id = v_score.criterion_id;

  if v_comp is null
     or v_comp <> (select id from public.competition_competitions where slug = 'creative-talent-hunt')
  then
    raise exception 'score is not part of Creative Talent Hunt';
  end if;

  if p_value is null or p_value < 0 or p_value > v_max then
    raise exception 'score outside allowed range';
  end if;

  update public.competition_scores
  set score = p_value, updated_at = now()
  where id = p_score_id;

  insert into public.competition_audit_logs(
    competition_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    v_comp, auth.uid(), 'SCORE_CORRECTED', 'SCORE', p_score_id,
    jsonb_build_object(
      'before', v_score.score,
      'after', p_value,
      'reason', trim(p_reason),
      'assignment_id', v_score.assignment_id,
      'criterion_id', v_score.criterion_id
    )
  );

  return jsonb_build_object('ok', true, 'before', v_score.score, 'after', p_value, 'max_score', v_max);
end;
$$;

grant execute on function public.creative_talent_hunt_correct_score(uuid, numeric, text) to authenticated;
