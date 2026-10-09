-- Creative Talent Hunt voting controls and secure vote casting
alter table public.competition_votes
  add column if not exists is_voided boolean not null default false,
  add column if not exists void_reason text not null default '',
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references auth.users(id) on delete set null;

create index if not exists idx_competition_votes_round_valid
  on public.competition_votes(round_id, application_id)
  where is_voided = false;

drop policy if exists "Authenticated users can vote" on public.competition_votes;

create or replace function public.cast_creative_talent_hunt_vote(p_application_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_app public.competition_applications%rowtype;
  v_comp public.competition_competitions%rowtype;
  v_round public.competition_rounds%rowtype;
  v_vote uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_app
  from public.competition_applications
  where id=p_application_id
    and status='APPROVED'
    and is_public=true;

  if v_app.id is null then raise exception 'contestant is not eligible for voting'; end if;

  select * into v_comp from public.competition_competitions where id=v_app.competition_id;
  select * into v_round from public.competition_rounds where id=v_app.current_round_id;

  if v_round.id is null or not v_round.public_voting_enabled then
    raise exception 'voting is not open for this contestant';
  end if;

  if v_comp.status <> 'VOTING_OPEN' then
    raise exception 'voting is currently closed';
  end if;

  if v_comp.voting_starts_at is not null and now() < v_comp.voting_starts_at then
    raise exception 'voting has not started';
  end if;
  if v_comp.voting_ends_at is not null and now() > v_comp.voting_ends_at then
    raise exception 'voting has ended';
  end if;

  select id into v_vote from public.competition_votes
  where round_id=v_round.id and application_id=v_app.id and voter_user_id=auth.uid();
  if v_vote is not null then raise exception 'you have already voted for this contestant'; end if;

  insert into public.competition_votes(competition_id,round_id,application_id,voter_user_id)
  values(v_app.competition_id,v_round.id,v_app.id,auth.uid())
  returning id into v_vote;

  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_app.competition_id,auth.uid(),'VOTE_CAST','VOTE',v_vote,jsonb_build_object('round_id',v_round.id,'application_id',v_app.id));

  return jsonb_build_object('ok',true,'vote_id',v_vote);
end;
$$;

grant execute on function public.cast_creative_talent_hunt_vote(uuid) to authenticated;

create or replace function public.creative_talent_hunt_vote_totals(p_round_id uuid)
returns table(application_id uuid,display_name text,handle text,valid_votes bigint,voided_votes bigint,distinct_voters bigint)
language sql security definer set search_path=public as $$
  select a.id,a.display_name,a.handle,
    count(v.id) filter (where v.is_voided=false)::bigint,
    count(v.id) filter (where v.is_voided=true)::bigint,
    count(distinct v.voter_user_id) filter (where v.is_voided=false)::bigint
  from public.competition_applications a
  left join public.competition_votes v on v.application_id=a.id and v.round_id=p_round_id
  where a.current_round_id=p_round_id
    and a.status='APPROVED'
    and public.creative_talent_hunt_admin(auth.uid())
  group by a.id,a.display_name,a.handle
  order by count(v.id) filter (where v.is_voided=false) desc,a.display_name;
$$;
grant execute on function public.creative_talent_hunt_vote_totals(uuid) to authenticated;

create or replace function public.creative_talent_hunt_suspicious_votes(p_round_id uuid)
returns table(voter_id uuid,votes_today bigint,votes_last_hour bigint,distinct_contestants bigint)
language sql security definer set search_path=public as $$
  select v.voter_user_id,
    count(*) filter (where v.created_at >= current_date and v.is_voided=false)::bigint,
    count(*) filter (where v.created_at >= now()-interval '1 hour' and v.is_voided=false)::bigint,
    count(distinct v.application_id) filter (where v.is_voided=false)::bigint
  from public.competition_votes v
  where v.round_id=p_round_id
    and public.creative_talent_hunt_admin(auth.uid())
  group by v.voter_user_id
  having count(*) filter (where v.created_at >= current_date and v.is_voided=false) >= 10
      or count(*) filter (where v.created_at >= now()-interval '1 hour' and v.is_voided=false) >= 5
      or count(distinct v.application_id) filter (where v.is_voided=false) >= 10
  order by count(*) filter (where v.created_at >= current_date and v.is_voided=false) desc;
$$;
grant execute on function public.creative_talent_hunt_suspicious_votes(uuid) to authenticated;

create or replace function public.creative_talent_hunt_void_votes(
  p_reason text,
  p_application_id uuid default null,
  p_voter_id uuid default null,
  p_vote_ids uuid[] default null
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  if trim(coalesce(p_reason,''))='' then raise exception 'reason is required'; end if;
  if p_application_id is null and p_voter_id is null and (p_vote_ids is null or cardinality(p_vote_ids)=0) then
    raise exception 'choose which votes to void';
  end if;

  update public.competition_votes
  set is_voided=true,void_reason=trim(p_reason),voided_at=now(),voided_by=auth.uid()
  where is_voided=false
    and (p_application_id is null or application_id=p_application_id)
    and (p_voter_id is null or voter_user_id=p_voter_id)
    and (p_vote_ids is null or id=any(p_vote_ids));
  get diagnostics v_count=row_count;

  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,metadata)
  select distinct competition_id,auth.uid(),'VOTES_VOIDED','VOTE',jsonb_build_object(
    'count',v_count,'reason',trim(p_reason),'application_id',p_application_id,'voter_id',p_voter_id)
  from public.competition_votes
  where (p_application_id is null or application_id=p_application_id)
    and (p_voter_id is null or voter_user_id=p_voter_id)
    and (p_vote_ids is null or id=any(p_vote_ids));

  return jsonb_build_object('ok',true,'voided',v_count);
end;
$$;
grant execute on function public.creative_talent_hunt_void_votes(text,uuid,uuid,uuid[]) to authenticated;

create or replace function public.set_creative_talent_hunt_voting_window(
  p_opens_at timestamptz,p_closes_at timestamptz
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  if p_opens_at is not null and p_closes_at is not null and p_closes_at <= p_opens_at then
    raise exception 'voting window must close after it opens';
  end if;
  select id into v_id from public.competition_competitions where slug='creative-talent-hunt';
  if v_id is null then raise exception 'competition not found'; end if;
  update public.competition_competitions
  set voting_starts_at=p_opens_at,voting_ends_at=p_closes_at,updated_at=now()
  where id=v_id;
  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_id,auth.uid(),'VOTING_WINDOW_CHANGED','COMPETITION',v_id,jsonb_build_object('opens_at',p_opens_at,'closes_at',p_closes_at));
  return jsonb_build_object('ok',true);
end;
$$;
grant execute on function public.set_creative_talent_hunt_voting_window(timestamptz,timestamptz) to authenticated;

create or replace function public.close_creative_talent_hunt_voting()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.creative_talent_hunt_admin(auth.uid()) then raise exception 'not authorised'; end if;
  select id into v_id from public.competition_competitions where slug='creative-talent-hunt';
  if v_id is null then raise exception 'competition not found'; end if;
  update public.competition_competitions
  set status='IN_PROGRESS',voting_ends_at=coalesce(voting_ends_at,now()),updated_at=now()
  where id=v_id;
  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(v_id,auth.uid(),'VOTING_CLOSED','COMPETITION',v_id,'{}'::jsonb);
  return jsonb_build_object('ok',true);
end;
$$;
grant execute on function public.close_creative_talent_hunt_voting() to authenticated;
