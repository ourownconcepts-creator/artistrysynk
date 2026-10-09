-- Public-safe Talent Hunt leaderboard results
create or replace function public.get_public_creative_talent_hunt_results(p_round_id uuid)
returns table(
  application_id uuid, handle text, display_name text, category_name text,
  progress_state text, judge_score numeric, public_votes bigint, combined_score numeric
)
language sql security definer set search_path=public as $$
  with apps as (
    select a.id,a.handle,a.display_name,a.progress_state,c.name category_name
    from public.competition_applications a
    join public.competition_categories c on c.id=a.category_id
    join public.competition_rounds r on r.id=a.current_round_id
    where a.current_round_id=p_round_id
      and a.status='APPROVED'
      and a.is_public=true
      and r.competition_id=(select id from public.competition_competitions where slug='creative-talent-hunt')
  ),
  judges as (
    select ja.application_id,
      coalesce(sum((s.score/nullif(c.max_score,0))*c.weight)/nullif(sum(c.weight),0)*100,0) score
    from public.competition_judge_assignments ja
    join public.competition_scores s on s.assignment_id=ja.id
    join public.competition_scoring_criteria c on c.id=s.criterion_id
    where ja.round_id=p_round_id
    group by ja.application_id
  ),
  votes as (
    select application_id,count(*)::bigint total
    from public.competition_votes
    where round_id=p_round_id and is_voided=false
    group by application_id
  )
  select a.id,a.handle,a.display_name,a.category_name,a.progress_state,
    round(coalesce(j.score,0),2),coalesce(v.total,0),
    round(coalesce(j.score,0)+coalesce(v.total,0),2)
  from apps a
  left join judges j on j.application_id=a.id
  left join votes v on v.application_id=a.id
  order by round(coalesce(j.score,0)+coalesce(v.total,0),2) desc,a.display_name;
$$;
grant execute on function public.get_public_creative_talent_hunt_results(uuid) to anon, authenticated;
