-- Expand Talent Hunt application review decisions.
create or replace function public.review_creative_talent_hunt_application(
  p_application_id uuid, p_decision text, p_reason text default ''
)
returns table(application_id uuid, decision text, status text, reason text)
language plpgsql security definer set search_path=public as $$
declare
  a public.competition_applications%rowtype;
  d text := upper(trim(p_decision));
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  if d not in ('APPROVE','REJECT','CORRECTION_REQUESTED','UNDER_REVIEW') then raise exception 'invalid decision'; end if;
  if d in ('REJECT','CORRECTION_REQUESTED') and trim(coalesce(p_reason,''))='' then raise exception 'reason required'; end if;

  select * into a from public.competition_applications where id=p_application_id for update;
  if a.id is null then raise exception 'entry not found'; end if;

  if d='APPROVE' then
    update public.competition_applications
      set status='APPROVED', progress_state='SHORTLISTED',
          review_decision=d, review_reason=trim(coalesce(p_reason,'')), updated_at=now()
      where id=a.id;
  elsif d='REJECT' then
    update public.competition_applications
      set status='REJECTED', progress_state='ELIMINATED',
          review_decision=d, review_reason=trim(coalesce(p_reason,'')), updated_at=now()
      where id=a.id;
  elsif d='CORRECTION_REQUESTED' then
    update public.competition_applications
      set status='PENDING_REVIEW', progress_state='UNDER_REVIEW', submission_state='REVISION_REQUESTED',
          review_decision=d, review_reason=trim(p_reason), updated_at=now()
      where id=a.id;
  else
    update public.competition_applications
      set status='PENDING_REVIEW', progress_state='UNDER_REVIEW',
          review_decision=d, review_reason=trim(coalesce(p_reason,'')), updated_at=now()
      where id=a.id;
  end if;

  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(a.competition_id,auth.uid(),'APPLICATION_REVIEWED','APPLICATION',a.id,
    jsonb_build_object('decision',d,'reason',trim(coalesce(p_reason,''))));

  return query select a.id,d,case when d='APPROVE' then 'APPROVED' when d='REJECT' then 'REJECTED' else 'PENDING_REVIEW' end,trim(coalesce(p_reason,''));
end;
$$;
grant execute on function public.review_creative_talent_hunt_application(uuid,text,text) to authenticated;
