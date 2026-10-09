-- Prevent participants from changing moderation/publication state through direct table UPDATE.
-- Profile edits go through a server-validated, owner-only RPC.
drop policy if exists "Users can update their competition applications"
  on public.competition_applications;

drop policy if exists "Users can create their competition applications"
  on public.competition_applications;

create policy "Users can create draft competition applications"
on public.competition_applications
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'DRAFT'
  and submission_state = 'DRAFT'
  and progress_state = 'PROFILE'
  and is_public = false
  and media_is_public = false
  and review_decision is null
  and reviewed_at is null
  and reviewed_by is null
);

create or replace function public.update_creative_talent_hunt_application(
  p_application_id uuid,
  p_display_name text,
  p_handle text,
  p_location text,
  p_bio text,
  p_experience text,
  p_audition_url text,
  p_audition_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.competition_applications%rowtype;
  v_handle text;
  v_url text := trim(coalesce(p_audition_url, ''));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  v_handle := lower(regexp_replace(trim(coalesce(p_handle, '')), '[^a-zA-Z0-9_]', '', 'g'));
  if v_handle = '' or length(v_handle) > 32 then
    raise exception 'choose a valid creator handle of at most 32 characters';
  end if;

  if trim(coalesce(p_display_name, '')) = '' or length(trim(p_display_name)) > 100 then
    raise exception 'display name is required and must be at most 100 characters';
  end if;

  if v_url <> '' and v_url !~* '^https?://' then
    raise exception 'audition or portfolio link must use http or https';
  end if;

  select * into v_app
  from public.competition_applications
  where id = p_application_id
    and user_id = auth.uid()
    and competition_id = (
      select id from public.competition_competitions where slug = 'creative-talent-hunt'
    )
  for update;

  if v_app.id is null then
    raise exception 'application not found';
  end if;

  if not (
    v_app.status = 'DRAFT'
    or v_app.status = 'REJECTED'
    or v_app.submission_state = 'REVISION_REQUESTED'
  ) then
    raise exception 'application cannot be edited while it is under active review or approved';
  end if;

  update public.competition_applications
  set display_name = trim(p_display_name),
      handle = v_handle,
      location = trim(coalesce(p_location, '')),
      bio = trim(coalesce(p_bio, '')),
      experience = trim(coalesce(p_experience, '')),
      audition_url = v_url,
      audition_notes = trim(coalesce(p_audition_notes, '')),
      progress_state = case
        when v_app.status in ('DRAFT', 'REJECTED')
          then case when v_url <> '' then 'AUDITION' else 'PROFILE' end
        else v_app.progress_state
      end,
      updated_at = now()
  where id = v_app.id
  returning * into v_app;

  return to_jsonb(v_app);
end;
$$;

grant execute on function public.update_creative_talent_hunt_application(
  uuid, text, text, text, text, text, text, text
) to authenticated;
