-- Creative Talent Hunt: restore source-compatible weighted scoring.
-- Weights are read from competition_competitions.config; only missing keys are backfilled
-- from the destination's already-established judge-only defaults (1:0).
-- When weights are absent/invalid, combined_score is NULL so the UI cannot present
-- an unconfigured score as an authoritative ranking.

-- Backfill only missing configuration keys from the repository's existing defaults.
-- Existing administrator-configured values are preserved.
update public.competition_competitions
set config = jsonb_build_object(
  'judge_weight', 1,
  'public_vote_weight', 0,
  'leaderboard_published', false
) || coalesce(config, '{}'::jsonb),
updated_at = now()
where slug = 'creative-talent-hunt'
  and (
    not (coalesce(config, '{}'::jsonb) ? 'judge_weight')
    or not (coalesce(config, '{}'::jsonb) ? 'public_vote_weight')
    or not (coalesce(config, '{}'::jsonb) ? 'leaderboard_published')
  );

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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comp_id uuid;
  v_config jsonb;
  v_judge_weight numeric;
  v_public_weight numeric;
  v_weights_valid boolean := false;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then
    raise exception 'not authorised';
  end if;

  select c.id, c.config
    into v_comp_id, v_config
  from public.competition_competitions c
  join public.competition_rounds r on r.competition_id = c.id
  where r.id = p_round_id
    and c.slug = 'creative-talent-hunt';

  if v_comp_id is null then
    return;
  end if;

  if coalesce(v_config->>'judge_weight', '') ~ '^[0-9]+([.][0-9]+)?$' then
    v_judge_weight := (v_config->>'judge_weight')::numeric;
  end if;
  if coalesce(v_config->>'public_vote_weight', '') ~ '^[0-9]+([.][0-9]+)?$' then
    v_public_weight := (v_config->>'public_vote_weight')::numeric;
  end if;

  v_weights_valid := v_judge_weight >= 0
    and v_public_weight >= 0
    and (v_judge_weight + v_public_weight) > 0;

  return query
  with apps as (
    select a.id, a.handle, a.display_name, a.progress_state, cat.name as category_name
    from public.competition_applications a
    join public.competition_categories cat on cat.id = a.category_id
    where a.competition_id = v_comp_id
      and coalesce(a.current_round_id, p_round_id) = p_round_id
      and a.status in ('SUBMITTED', 'APPROVED')
  ),
  judge_totals as (
    select ja.application_id,
      coalesce(
        sum((s.score / nullif(c.max_score, 0)) * c.weight)
          / nullif(sum(c.weight), 0) * 100,
        0
      ) as score
    from public.competition_judge_assignments ja
    join public.competition_scores s on s.assignment_id = ja.id
    join public.competition_scoring_criteria c on c.id = s.criterion_id
    where ja.round_id = p_round_id
    group by ja.application_id
  ),
  votes as (
    select v.application_id, count(*)::bigint as total
    from public.competition_votes v
    where v.round_id = p_round_id and v.is_voided = false
    group by v.application_id
  ),
  vote_scale as (
    select greatest(coalesce(max(total), 0), 1)::numeric as max_votes
    from votes
  )
  select
    a.id,
    a.handle,
    a.display_name,
    a.category_name,
    a.progress_state,
    round(coalesce(j.score, 0), 2),
    coalesce(v.total, 0),
    case when v_weights_valid then
      round(
        (coalesce(j.score, 0) * v_judge_weight
          + (coalesce(v.total, 0)::numeric / vs.max_votes * 100) * v_public_weight)
          / nullif(v_judge_weight + v_public_weight, 0),
        2
      )
    else null end
  from apps a
  left join judge_totals j on j.application_id = a.id
  left join votes v on v.application_id = a.id
  cross join vote_scale vs
  order by 8 desc nulls last, a.display_name asc;
end;
$$;

-- Public leaderboard uses the same configured formula and vote normalization.
-- Only approved, explicitly published entries from this competition are returned.
create or replace function public.get_public_creative_talent_hunt_results(p_round_id uuid)
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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comp_id uuid;
  v_config jsonb;
  v_judge_weight numeric;
  v_public_weight numeric;
  v_leaderboard_published boolean := false;
  v_weights_valid boolean := false;
begin
  select c.id, c.config
    into v_comp_id, v_config
  from public.competition_competitions c
  join public.competition_rounds r on r.competition_id = c.id
  where r.id = p_round_id
    and c.slug = 'creative-talent-hunt';

  if v_comp_id is null then
    return;
  end if;

  v_leaderboard_published := coalesce((v_config->>'leaderboard_published')::boolean, false);
  if not v_leaderboard_published then
    return;
  end if;

  if coalesce(v_config->>'judge_weight', '') ~ '^[0-9]+([.][0-9]+)?$' then
    v_judge_weight := (v_config->>'judge_weight')::numeric;
  end if;
  if coalesce(v_config->>'public_vote_weight', '') ~ '^[0-9]+([.][0-9]+)?$' then
    v_public_weight := (v_config->>'public_vote_weight')::numeric;
  end if;

  v_weights_valid := v_judge_weight >= 0
    and v_public_weight >= 0
    and (v_judge_weight + v_public_weight) > 0;

  return query
  with apps as (
    select a.id, a.handle, a.display_name, a.progress_state, cat.name as category_name
    from public.competition_applications a
    join public.competition_categories cat on cat.id = a.category_id
    where a.competition_id = v_comp_id
      and a.current_round_id = p_round_id
      and a.status = 'APPROVED'
      and a.is_public = true
  ),
  judge_totals as (
    select ja.application_id,
      coalesce(
        sum((s.score / nullif(c.max_score, 0)) * c.weight)
          / nullif(sum(c.weight), 0) * 100,
        0
      ) as score
    from public.competition_judge_assignments ja
    join public.competition_scores s on s.assignment_id = ja.id
    join public.competition_scoring_criteria c on c.id = s.criterion_id
    where ja.round_id = p_round_id
    group by ja.application_id
  ),
  votes as (
    select v.application_id, count(*)::bigint as total
    from public.competition_votes v
    where v.round_id = p_round_id and v.is_voided = false
    group by v.application_id
  ),
  vote_scale as (
    select greatest(coalesce(max(total), 0), 1)::numeric as max_votes
    from votes
  )
  select
    a.id,
    a.handle,
    a.display_name,
    a.category_name,
    a.progress_state,
    round(coalesce(j.score, 0), 2),
    coalesce(v.total, 0),
    case when v_weights_valid then
      round(
        (coalesce(j.score, 0) * v_judge_weight
          + (coalesce(v.total, 0)::numeric / vs.max_votes * 100) * v_public_weight)
          / nullif(v_judge_weight + v_public_weight, 0),
        2
      )
    else null end
  from apps a
  left join judge_totals j on j.application_id = a.id
  left join votes v on v.application_id = a.id
  cross join vote_scale vs
  order by 8 desc nulls last, a.display_name asc;
end;
$$;

revoke all on function public.get_creative_talent_hunt_results(uuid) from public, anon;
revoke all on function public.get_public_creative_talent_hunt_results(uuid) from public;
grant execute on function public.get_creative_talent_hunt_results(uuid) to authenticated;
grant execute on function public.get_public_creative_talent_hunt_results(uuid) to anon, authenticated;
