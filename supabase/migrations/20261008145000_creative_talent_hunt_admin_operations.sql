-- Creative Talent Hunt administrator operations
create or replace function public.creative_talent_hunt_admin(_uid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select _uid is not null and (
    public.has_role(_uid,'admin'::public.app_role)
    or public.has_role(_uid,'master_admin'::public.app_role)
    or public.has_role(_uid,'super_admin'::public.app_role)
  );
$$;

create or replace function public.creative_talent_hunt_admin_snapshot()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_comp public.competition_competitions%rowtype;
  v_round jsonb;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  select * into v_comp from public.competition_competitions where slug='creative-talent-hunt';
  if v_comp.id is null then raise exception 'competition not found'; end if;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.sequence),'[]'::jsonb) into v_round
    from public.competition_rounds r where r.competition_id=v_comp.id;
  return jsonb_build_object(
    'competition',to_jsonb(v_comp),
    'rounds',v_round,
    'applications',(select count(*) from public.competition_applications where competition_id=v_comp.id),
    'pending_review',(select count(*) from public.competition_applications where competition_id=v_comp.id and status='PENDING_REVIEW'),
    'approved',(select count(*) from public.competition_applications where competition_id=v_comp.id and status='APPROVED'),
    'public_entries',(select count(*) from public.competition_applications where competition_id=v_comp.id and is_public=true and status='APPROVED'),
    'votes',(select count(*) from public.competition_votes where competition_id=v_comp.id)
  );
end;
$$;
grant execute on function public.creative_talent_hunt_admin_snapshot() to authenticated;

create or replace function public.set_creative_talent_hunt_status(p_status text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  if p_status not in ('DRAFT','REGISTRATION_OPEN','REGISTRATION_CLOSED','IN_PROGRESS','VOTING_OPEN','COMPLETED','ARCHIVED') then raise exception 'invalid competition status'; end if;
  update public.competition_competitions set status=p_status,updated_at=now() where slug='creative-talent-hunt' returning id into v_id;
  if v_id is null then raise exception 'competition not found'; end if;
  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_id,auth.uid(),'COMPETITION_STATUS_CHANGED','COMPETITION',v_id,jsonb_build_object('status',p_status));
  return jsonb_build_object('ok',true,'status',p_status);
end;
$$;
grant execute on function public.set_creative_talent_hunt_status(text) to authenticated;

create or replace function public.set_creative_talent_hunt_round_status(p_round_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_comp uuid;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  if p_status not in ('DRAFT','OPEN','JUDGING','DECISION_PENDING','DECIDED','CLOSED','IN_PROGRESS') then raise exception 'invalid round status'; end if;
  select competition_id into v_comp from public.competition_rounds where id=p_round_id;
  if v_comp is null then raise exception 'round not found'; end if;
  if not exists(select 1 from public.competition_competitions where id=v_comp and slug='creative-talent-hunt') then raise exception 'invalid competition'; end if;
  update public.competition_rounds set status=p_status where id=p_round_id;
  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_comp,auth.uid(),'ROUND_STATUS_CHANGED','ROUND',p_round_id,jsonb_build_object('status',p_status));
  return jsonb_build_object('ok',true,'status',p_status);
end;
$$;
grant execute on function public.set_creative_talent_hunt_round_status(uuid,text) to authenticated;

create or replace function public.creative_talent_hunt_admin_voting_summary(p_round_id uuid)
returns table(application_id uuid,display_name text,handle text,vote_count bigint)
language sql security definer set search_path=public as $$
  select a.id,a.display_name,a.handle,count(v.id)::bigint
  from public.competition_applications a
  left join public.competition_votes v on v.application_id=a.id and v.round_id=p_round_id
  where a.current_round_id=p_round_id and a.status='APPROVED'
    and public.creative_talent_hunt_admin(auth.uid())
  group by a.id,a.display_name,a.handle
  order by count(v.id) desc,a.display_name;
$$;
grant execute on function public.creative_talent_hunt_admin_voting_summary(uuid) to authenticated;
