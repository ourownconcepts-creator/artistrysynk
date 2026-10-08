do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'competition_submissions_application_round_unique') then
    alter table public.competition_submissions add constraint competition_submissions_application_round_unique unique (application_id, round_id);
  end if;
end $$;

drop policy if exists "Users can view their competition applications" on public.competition_applications;
-- Compatibility: file drops this policy twice and never recreates it; restore owner-only read
-- (private, no is_public exposure) so participants can load their own application.
create policy "Users can view their competition applications"
  on public.competition_applications for select
  using (auth.uid() = user_id);

revoke insert on public.competition_applications from anon, authenticated;
grant insert (
  competition_id, category_id, user_id, handle, display_name, full_name, email,
  phone, location, date_of_birth, bio, experience, audition_url, audition_notes,
  submission_answers
) on public.competition_applications to authenticated;

revoke update on public.competition_applications from anon, authenticated;
grant update (
  handle, display_name, full_name, phone, location, date_of_birth, bio, experience,
  audition_url, audition_notes, submission_answers, is_public, media_is_public
) on public.competition_applications to authenticated;

revoke insert, update, delete on public.competition_submissions from anon, authenticated;

create or replace function public.get_public_creative_talent_hunt_entries()
returns table (id uuid, handle text, display_name text, location text, bio text, audition_url text, status text, category_id uuid, category_name text)
language sql stable security definer set search_path = public
as $$
  select a.id, a.handle, a.display_name, a.location, a.bio, a.audition_url, a.status, a.category_id, c.name as category_name
  from public.competition_applications a
  join public.competition_categories c on c.id = a.category_id
  join public.competition_competitions cp on cp.id = a.competition_id
  where cp.slug = 'creative-talent-hunt' and a.is_public = true and a.status = 'APPROVED'
  order by a.created_at desc;
$$;

grant execute on function public.get_public_creative_talent_hunt_entries() to anon, authenticated;

create or replace function public.submit_creative_talent_hunt_application(
  p_application_id uuid,
  p_publish_publicly boolean default false
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_application public.competition_applications%rowtype;
  v_competition public.competition_competitions%rowtype;
  v_round public.competition_rounds%rowtype;
  v_submission public.competition_submissions%rowtype;
  v_reference text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_application from public.competition_applications
  where id = p_application_id and user_id = auth.uid() for update;
  if not found then raise exception 'Application not found'; end if;

  select * into v_competition from public.competition_competitions where id = v_application.competition_id;
  if v_competition.status <> 'REGISTRATION_OPEN' then raise exception 'Registration is not currently open'; end if;
  if coalesce(trim(v_application.display_name), '') = '' then raise exception 'Creator name is required'; end if;
  if coalesce(trim(v_application.handle), '') = '' then raise exception 'Creator handle is required'; end if;
  if coalesce(trim(v_application.bio), '') = '' then raise exception 'Tell us about your creative work before submitting'; end if;
  if coalesce(trim(v_application.audition_url), '') = '' then raise exception 'Add an audition or portfolio link before submitting'; end if;

  select * into v_round from public.competition_rounds
  where competition_id = v_application.competition_id and sequence = 1 order by sequence limit 1;
  if not found then raise exception 'Competition entry round is not configured'; end if;

  v_reference := 'AS-CTH-2026-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.competition_submissions (application_id, round_id, title, description, media_url, media_type, metadata, status)
  values (
    v_application.id, v_round.id,
    v_application.display_name || ' — Creative Talent Hunt Entry',
    v_application.bio, v_application.audition_url, 'LINK',
    jsonb_build_object('handle', v_application.handle, 'location', v_application.location, 'submitted_via', 'artistrysynk'),
    'PENDING_REVIEW'
  )
  on conflict (application_id, round_id)
  do update set title = excluded.title, description = excluded.description, media_url = excluded.media_url,
    metadata = excluded.metadata, status = 'PENDING_REVIEW', submitted_at = now()
  returning * into v_submission;

  update public.competition_applications
  set current_round_id = v_round.id, submission_state = 'SUBMITTED', progress_state = 'SUBMITTED',
    status = 'PENDING_REVIEW', reference_code = coalesce(reference_code, v_reference),
    submitted_at = coalesce(submitted_at, now()), is_public = p_publish_publicly,
    media_is_public = p_publish_publicly, updated_at = now()
  where id = v_application.id;

  insert into public.competition_audit_logs (competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_application.competition_id, auth.uid(), 'APPLICATION_SUBMITTED', 'competition_application', v_application.id,
    jsonb_build_object('round_id', v_round.id, 'reference_code', coalesce(v_application.reference_code, v_reference), 'public_opt_in', p_publish_publicly));

  return jsonb_build_object('application_id', v_application.id, 'submission_id', v_submission.id,
    'reference_code', coalesce(v_application.reference_code, v_reference),
    'submission_state', 'SUBMITTED', 'status', 'PENDING_REVIEW', 'is_public', p_publish_publicly);
end;
$$;

grant execute on function public.submit_creative_talent_hunt_application(uuid, boolean) to authenticated;

update public.competition_rounds
set status = 'IN_PROGRESS'
where competition_id = (select id from public.competition_competitions where slug = 'creative-talent-hunt')
and slug = 'open-entry';