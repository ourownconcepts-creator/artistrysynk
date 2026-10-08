drop policy if exists "Admins can review competition applications" on public.competition_applications;
create policy "Admins can review competition applications"
  on public.competition_applications for select
  using (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'master_admin'::public.app_role) or public.has_role(auth.uid(), 'super_admin'::public.app_role));

drop policy if exists "Admins can view competition submissions" on public.competition_submissions;
create policy "Admins can view competition submissions"
  on public.competition_submissions for select
  using (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'master_admin'::public.app_role) or public.has_role(auth.uid(), 'super_admin'::public.app_role));

create or replace function public.review_creative_talent_hunt_application(
  p_application_id uuid, p_decision text, p_reason text default ''
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_application public.competition_applications%rowtype;
  v_decision text := upper(trim(p_decision));
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'master_admin'::public.app_role) or public.has_role(auth.uid(), 'super_admin'::public.app_role)) then
    raise exception 'Competition administrator access required';
  end if;
  if v_decision not in ('APPROVE', 'REJECT') then raise exception 'Decision must be APPROVE or REJECT'; end if;

  select * into v_application from public.competition_applications where id = p_application_id for update;
  if not found then raise exception 'Application not found'; end if;
  if v_application.status not in ('PENDING_REVIEW', 'REJECTED') then raise exception 'Application is not awaiting review'; end if;

  if v_decision = 'APPROVE' then
    update public.competition_applications
    set status = 'APPROVED', submission_state = 'APPROVED', review_decision = 'APPROVED', review_reason = v_reason,
      reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now()
    where id = v_application.id;
    update public.competition_submissions set status = 'APPROVED', approved_at = now(), approved_by = auth.uid()
    where application_id = v_application.id and status = 'PENDING_REVIEW';
  else
    update public.competition_applications
    set status = 'REJECTED', submission_state = 'REJECTED', review_decision = 'REJECTED', review_reason = v_reason,
      reviewed_at = now(), reviewed_by = auth.uid(), is_public = false, media_is_public = false, updated_at = now()
    where id = v_application.id;
    update public.competition_submissions set status = 'REJECTED'
    where application_id = v_application.id and status = 'PENDING_REVIEW';
  end if;

  insert into public.competition_audit_logs (competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_application.competition_id, auth.uid(),
    case when v_decision = 'APPROVE' then 'APPLICATION_APPROVED' else 'APPLICATION_REJECTED' end,
    'competition_application', v_application.id, jsonb_build_object('reason', v_reason));

  return jsonb_build_object('application_id', v_application.id, 'decision', v_decision,
    'status', case when v_decision = 'APPROVE' then 'APPROVED' else 'REJECTED' end, 'reason', v_reason);
end;
$$;

grant execute on function public.review_creative_talent_hunt_application(uuid, text, text) to authenticated;