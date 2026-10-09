-- Secure submission-level review for Creative Talent Hunt.
create or replace function public.review_creative_talent_hunt_submission(
  p_application_id uuid,
  p_state text,
  p_reason text default '',
  p_publish boolean default false
)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  a public.competition_applications%rowtype;
  s public.competition_submissions%rowtype;
  state text := upper(trim(p_state));
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  if state not in ('PENDING_REVIEW','APPROVED','REJECTED','REVISION_REQUESTED') then raise exception 'invalid submission state'; end if;
  if state in ('REJECTED','REVISION_REQUESTED') and trim(coalesce(p_reason,''))='' then raise exception 'reason required'; end if;

  select * into a from public.competition_applications where id=p_application_id for update;
  if a.id is null then raise exception 'entry not found'; end if;

  select * into s from public.competition_submissions
  where application_id=a.id order by submitted_at desc nulls last, created_at desc limit 1 for update;
  if s.id is null then raise exception 'submission not found'; end if;

  update public.competition_submissions
    set status=state,
        approved_by=case when state='APPROVED' then auth.uid() else approved_by end,
        approved_at=case when state='APPROVED' then now() else approved_at end
    where id=s.id;

  if state='APPROVED' then
    update public.competition_applications
      set submission_state='APPROVED',
          status='APPROVED',
          progress_state='SHORTLISTED',
          is_public=p_publish,
          media_is_public=p_publish,
          review_decision='APPROVED',
          review_reason=trim(coalesce(p_reason,'')),
          updated_at=now()
      where id=a.id;
  elsif state='REJECTED' then
    update public.competition_applications
      set submission_state='REJECTED',
          status='REJECTED',
          review_decision='REJECTED',
          review_reason=trim(p_reason),
          updated_at=now()
      where id=a.id;
  elsif state='REVISION_REQUESTED' then
    update public.competition_applications
      set submission_state='REVISION_REQUESTED',
          status='PENDING_REVIEW',
          progress_state='UNDER_REVIEW',
          review_decision='CORRECTION_REQUESTED',
          review_reason=trim(p_reason),
          updated_at=now()
      where id=a.id;
  else
    update public.competition_applications
      set submission_state='PENDING_REVIEW',
          status='PENDING_REVIEW',
          progress_state='UNDER_REVIEW',
          updated_at=now()
      where id=a.id;
  end if;

  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(a.competition_id,auth.uid(),'SUBMISSION_REVIEWED','SUBMISSION',s.id,
    jsonb_build_object('application_id',a.id,'state',state,'reason',trim(coalesce(p_reason,'')),'published',p_publish));

  return jsonb_build_object('ok',true,'application_id',a.id,'submission_id',s.id,'state',state,'published',p_publish);
end;
$$;
grant execute on function public.review_creative_talent_hunt_submission(uuid,text,text,boolean) to authenticated;
