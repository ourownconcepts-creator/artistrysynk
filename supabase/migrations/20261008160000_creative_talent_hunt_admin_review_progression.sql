-- Secure admin review/detail and progression operations for Creative Talent Hunt
create or replace function public.creative_talent_hunt_admin_applications(p_status text default null)
returns table(
  id uuid, reference_code text, display_name text, handle text, category_name text,
  location text, bio text, experience text, audition_url text, audition_notes text,
  status text, progress_state text, submission_state text, review_decision text,
  review_reason text, submitted_at timestamptz, created_at timestamptz
)
language sql security definer set search_path=public as $$
  select a.id,a.reference_code,a.display_name,a.handle,c.name,a.location,a.bio,a.experience,
         a.audition_url,a.audition_notes,a.status,a.progress_state,a.submission_state,
         a.review_decision,a.review_reason,a.submitted_at,a.created_at
  from public.competition_applications a
  join public.competition_categories c on c.id=a.category_id
  where a.competition_id=(select id from public.competition_competitions where slug='creative-talent-hunt')
    and (p_status is null or a.status=p_status)
    and public.creative_talent_hunt_admin(auth.uid())
  order by a.submitted_at nulls last,a.created_at;
$$;
grant execute on function public.creative_talent_hunt_admin_applications(text) to authenticated;

create or replace function public.creative_talent_hunt_admin_entry_detail(p_application_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  select jsonb_build_object(
    'entry',to_jsonb(a),
    'category',c.name,
    'round',r.name,
    'submission',coalesce((select jsonb_agg(to_jsonb(s) order by s.submitted_at desc) from public.competition_submissions s where s.application_id=a.id),'[]'::jsonb),
    'scores',coalesce((select jsonb_agg(jsonb_build_object('criterion',cr.name,'score',cs.score,'max_score',cr.max_score,'comment',cs.comment,'updated_at',cs.updated_at)) from public.competition_scores cs join public.competition_judge_assignments ja on ja.id=cs.assignment_id join public.competition_scoring_criteria cr on cr.id=cs.criterion_id where ja.application_id=a.id),'[]'::jsonb)
  ) into v
  from public.competition_applications a
  join public.competition_categories c on c.id=a.category_id
  left join public.competition_rounds r on r.id=a.current_round_id
  where a.id=p_application_id;
  if v is null then raise exception 'entry not found'; end if;
  return v;
end;
$$;
grant execute on function public.creative_talent_hunt_admin_entry_detail(uuid) to authenticated;

create or replace function public.decide_creative_talent_hunt_round(
  p_application_id uuid,p_outcome text,p_reason text default ''
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  a public.competition_applications%rowtype;
  r public.competition_rounds%rowtype;
  next_round public.competition_rounds%rowtype;
  outcome text:=upper(trim(p_outcome));
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  if outcome not in ('ADVANCED','ELIMINATED','HELD') then raise exception 'invalid outcome'; end if;

  select * into a from public.competition_applications where id=p_application_id for update;
  if a.id is null then raise exception 'entry not found'; end if;
  select * into r from public.competition_rounds where id=a.current_round_id;
  if r.id is null then raise exception 'no active round'; end if;
  if r.status not in ('DECISION_PENDING','JUDGING','IN_PROGRESS') then raise exception 'round is not accepting decisions'; end if;

  if outcome='ADVANCED' then
    select * into next_round from public.competition_rounds
    where competition_id=a.competition_id and sequence>r.sequence
    order by sequence limit 1;
    if next_round.id is null then
      update public.competition_applications set progress_state='WINNER',status='APPROVED',updated_at=now() where id=a.id;
    else
      update public.competition_applications set current_round_id=next_round.id,progress_state='ADVANCED',updated_at=now() where id=a.id;
    end if;
  elsif outcome='ELIMINATED' then
    update public.competition_applications set progress_state='ELIMINATED',updated_at=now() where id=a.id;
  end if;

  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(a.competition_id,auth.uid(),'ROUND_RESULT_DECIDED','APPLICATION',a.id,
    jsonb_build_object('round_id',r.id,'outcome',outcome,'reason',trim(coalesce(p_reason,''))));
  return jsonb_build_object('ok',true,'outcome',outcome,'application_id',a.id);
end;
$$;
grant execute on function public.decide_creative_talent_hunt_round(uuid,text,text) to authenticated;
