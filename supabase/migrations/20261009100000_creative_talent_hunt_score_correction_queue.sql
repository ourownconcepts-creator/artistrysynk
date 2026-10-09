-- Secure admin-only score correction queue for Creative Talent Hunt.
create or replace function public.creative_talent_hunt_score_details(p_round_id uuid)
returns table(
  score_id uuid,
  assignment_id uuid,
  application_id uuid,
  display_name text,
  handle text,
  judge_name text,
  criterion_name text,
  score numeric,
  max_score numeric,
  assignment_status text
)
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then
    raise exception 'not authorised';
  end if;

  return query
  select cs.id, ja.id, app.id, app.display_name, app.handle, j.display_name,
         criterion.name, cs.score, criterion.max_score, ja.status
  from public.competition_scores cs
  join public.competition_judge_assignments ja on ja.id=cs.assignment_id
  join public.competition_judges j on j.id=ja.judge_id
  join public.competition_applications app on app.id=ja.application_id
  join public.competition_scoring_criteria criterion on criterion.id=cs.criterion_id
  where ja.round_id=p_round_id
    and app.competition_id=(select id from public.competition_competitions where slug='creative-talent-hunt')
  order by app.display_name, j.display_name, criterion.sort_order;
end;
$$;
grant execute on function public.creative_talent_hunt_score_details(uuid) to authenticated;
