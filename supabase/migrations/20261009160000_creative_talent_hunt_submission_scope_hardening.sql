-- The submission RPC is specific to Creative Talent Hunt and may not reopen
-- already-approved or terminal applications.
create or replace function public.submit_creative_talent_hunt_application(
  p_application_id uuid,
  p_publish_publicly boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.competition_applications%rowtype;
  v_competition public.competition_competitions%rowtype;
  v_round public.competition_rounds%rowtype;
  v_submission public.competition_submissions%rowtype;
  v_reference text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_application
  from public.competition_applications
  where id = p_application_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'application not found';
  end if;

  select * into v_competition
  from public.competition_competitions
  where id = v_application.competition_id;

  if v_competition.slug is distinct from 'creative-talent-hunt' then
    raise exception 'application is not part of Creative Talent Hunt';
  end if;

  if v_competition.status <> 'REGISTRATION_OPEN' then
    raise exception 'registration is not currently open';
  end if;

  if v_application.status = 'APPROVED'
     or v_application.progress_state in ('WINNER', 'ELIMINATED', 'DISQUALIFIED', 'WITHDRAWN')
  then
    raise exception 'approved or terminal applications cannot be resubmitted';
  end if;

  if not (
    v_application.status in ('DRAFT', 'REJECTED')
    or v_application.submission_state = 'REVISION_REQUESTED'
  ) then
    raise exception 'application is not eligible for submission or revision';
  end if;

  if trim(coalesce(v_application.display_name, '')) = '' then
    raise exception 'creator name is required';
  end if;
  if trim(coalesce(v_application.handle, '')) = '' then
    raise exception 'creator handle is required';
  end if;
  if trim(coalesce(v_application.bio, '')) = '' then
    raise exception 'tell us about your creative work before submitting';
  end if;
  if trim(coalesce(v_application.audition_url, '')) = ''
     or trim(v_application.audition_url) !~* '^https?://'
  then
    raise exception 'add a valid http or https audition or portfolio link before submitting';
  end if;

  select * into v_round
  from public.competition_rounds
  where competition_id = v_application.competition_id
    and sequence = 1
  order by sequence
  limit 1;

  if not found then
    raise exception 'competition entry round is not configured';
  end if;

  v_reference := 'AS-CTH-2026-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.competition_submissions(
    application_id, round_id, title, description, media_url, media_type, metadata, status
  )
  values (
    v_application.id,
    v_round.id,
    v_application.display_name || ' — Creative Talent Hunt Entry',
    v_application.bio,
    v_application.audition_url,
    'LINK',
    jsonb_build_object(
      'handle', v_application.handle,
      'location', v_application.location,
      'submitted_via', 'artistrysynk'
    ),
    'PENDING_REVIEW'
  )
  on conflict (application_id, round_id)
  do update set
    title = excluded.title,
    description = excluded.description,
    media_url = excluded.media_url,
    metadata = excluded.metadata,
    status = 'PENDING_REVIEW',
    submitted_at = now()
  returning * into v_submission;

  update public.competition_applications
  set current_round_id = v_round.id,
      submission_state = 'SUBMITTED',
      progress_state = 'SUBMITTED',
      status = 'PENDING_REVIEW',
      reference_code = coalesce(reference_code, v_reference),
      submitted_at = coalesce(submitted_at, now()),
      is_public = p_publish_publicly,
      media_is_public = p_publish_publicly,
      updated_at = now()
  where id = v_application.id;

  insert into public.competition_audit_logs(
    competition_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    v_application.competition_id, auth.uid(), 'APPLICATION_SUBMITTED',
    'competition_application', v_application.id,
    jsonb_build_object(
      'round_id', v_round.id,
      'reference_code', coalesce(v_application.reference_code, v_reference),
      'public_opt_in', p_publish_publicly
    )
  );

  return jsonb_build_object(
    'application_id', v_application.id,
    'submission_id', v_submission.id,
    'reference_code', coalesce(v_application.reference_code, v_reference),
    'submission_state', 'SUBMITTED',
    'status', 'PENDING_REVIEW',
    'is_public', p_publish_publicly
  );
end;
$$;

grant execute on function public.submit_creative_talent_hunt_application(uuid, boolean)
  to authenticated;
