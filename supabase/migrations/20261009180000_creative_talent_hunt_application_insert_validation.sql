-- Validate new application identity and category at the database boundary.
drop policy if exists "Users can create draft competition applications"
  on public.competition_applications;

create policy "Users can create draft competition applications"
on public.competition_applications
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.competition_competitions comp
    join public.competition_categories cat
      on cat.competition_id = comp.id
    where comp.id = competition_id
      and cat.id = category_id
      and comp.status = 'REGISTRATION_OPEN'
      and cat.is_active = true
  )
  and length(trim(display_name)) between 1 and 100
  and handle ~ '^[a-zA-Z0-9_]{1,32}$'
  and status = 'DRAFT'
  and submission_state = 'DRAFT'
  and progress_state = 'PROFILE'
  and current_round_id is null
  and reference_code is null
  and submitted_at is null
  and is_public = false
  and media_is_public = false
  and review_decision is null
  and review_reason is null
  and reviewed_at is null
  and reviewed_by is null
);
