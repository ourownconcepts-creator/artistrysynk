-- Source parity operations retained under the ArtistrySynk competition namespace.
create or replace function public.creative_talent_hunt_set_application_state(
  p_application_id uuid,p_state text,p_reason text default ''
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.competition_applications%rowtype; s text:=upper(trim(p_state));
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  if s not in ('APPLIED','SUBMITTED','UNDER_REVIEW','APPROVED','SHORTLISTED','ROUND_ACTIVE','ADVANCED','ELIMINATED','WITHDRAWN','DISQUALIFIED','WINNER') then raise exception 'invalid application state'; end if;
  if s in ('ELIMINATED','DISQUALIFIED') and trim(coalesce(p_reason,''))='' then raise exception 'reason required'; end if;
  select * into a from public.competition_applications where id=p_application_id for update;
  if a.id is null then raise exception 'entry not found'; end if;
  update public.competition_applications set progress_state=s,updated_at=now() where id=a.id;
  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(a.competition_id,auth.uid(),'APPLICATION_STATE_CHANGED','APPLICATION',a.id,jsonb_build_object('from',a.progress_state,'to',s,'reason',p_reason));
  return jsonb_build_object('ok',true,'application_id',a.id,'state',s);
end; $$;
grant execute on function public.creative_talent_hunt_set_application_state(uuid,text,text) to authenticated;

create or replace function public.creative_talent_hunt_list_score_corrections()
returns table(id uuid,score_id uuid,actor_user_id uuid,metadata jsonb,created_at timestamptz)
language sql security definer set search_path=public as $$
  select l.id,l.entity_id,l.actor_user_id,l.metadata,l.created_at
  from public.competition_audit_logs l
  join public.competition_competitions c on c.id=l.competition_id
  where c.slug='creative-talent-hunt' and l.action='SCORE_CORRECTED'
    and public.creative_talent_hunt_admin(auth.uid())
  order by l.created_at desc;
$$;
grant execute on function public.creative_talent_hunt_list_score_corrections() to authenticated;

create or replace function public.creative_talent_hunt_round_results_detail(p_round_id uuid)
returns jsonb language sql security definer set search_path=public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.combined_score desc), '[]'::jsonb)
  from public.get_creative_talent_hunt_results(p_round_id) x;
$$;
grant execute on function public.creative_talent_hunt_round_results_detail(uuid) to authenticated;

create or replace function public.creative_talent_hunt_judge_dashboard(p_judge_id uuid default null)
returns jsonb language sql security definer set search_path=public as $$
  select jsonb_build_object(
    'assignments',count(*)::int,
    'scored',count(*) filter (where a.status in ('SCORED','LOCKED'))::int,
    'pending',count(*) filter (where a.status='ASSIGNED')::int
  )
  from public.competition_judge_assignments a
  join public.competition_judges j on j.id=a.judge_id
  where j.competition_id=(select id from public.competition_competitions where slug='creative-talent-hunt')
    and j.user_id=auth.uid()
    and (p_judge_id is null or j.id=p_judge_id);
$$;
grant execute on function public.creative_talent_hunt_judge_dashboard(uuid) to authenticated;

create or replace function public.creative_talent_hunt_admin_accounts()
returns table(user_id uuid,email text,display_name text)
language sql security definer set search_path=public as $$
  select u.id,u.email,coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',u.email)
  from auth.users u
  where public.creative_talent_hunt_admin(auth.uid())
  order by coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',u.email);
$$;
grant execute on function public.creative_talent_hunt_admin_accounts() to authenticated;
