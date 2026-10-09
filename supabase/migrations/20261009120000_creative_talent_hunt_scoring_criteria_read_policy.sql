-- Judges can read criteria only for their own active Creative Talent Hunt assignments.
-- Administrators may inspect Creative Talent Hunt criteria for operations.
-- Remove the earlier permissive policy; PostgreSQL combines SELECT policies with OR.
drop policy if exists "Public can view scoring criteria" on public.competition_scoring_criteria;
drop policy if exists "Creative Talent Hunt assigned judges read criteria"
  on public.competition_scoring_criteria;

create policy "Creative Talent Hunt assigned judges read criteria"
on public.competition_scoring_criteria
for select
to authenticated
using (
  competition_id = (
    select id
    from public.competition_competitions
    where slug = 'creative-talent-hunt'
  )
  and (
    public.creative_talent_hunt_admin(auth.uid())
    or exists (
      select 1
      from public.competition_judge_assignments a
      join public.competition_judges j on j.id = a.judge_id
      where a.round_id = competition_scoring_criteria.round_id
        and j.competition_id = competition_scoring_criteria.competition_id
        and j.user_id = auth.uid()
        and j.is_active = true
    )
  )
);
