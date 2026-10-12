-- Creative Talent Hunt voting, progression, operations and public pages. Safe to re-run. Additive only.
-- Privileged RPCs check public.cth_is_competition_admin(). Votes only via cast_creative_talent_hunt_vote().

alter table public.competition_votes add column if not exists voided_at timestamptz;
alter table public.competition_votes add column if not exists voided_by uuid;
alter table public.competition_votes add column if not exists void_reason text;
create index if not exists competition_votes_valid_app_idx on public.competition_votes(application_id) where voided_at is null;
create index if not exists competition_votes_voter_time_idx on public.competition_votes(voter_user_id, created_at);
create index if not exists competition_audit_logs_comp_time_idx on public.competition_audit_logs(competition_id, created_at desc);

drop policy if exists "Authenticated users can vote" on public.competition_votes;
revoke insert, update, delete on public.competition_votes from anon, authenticated;

create or replace function public.cth_scoring_weights(p_config jsonb)
returns table(judge_weight numeric, vote_weight numeric)
language plpgsql immutable set search_path = public as $$
declare jw numeric; vw numeric;
begin
  begin
    jw := coalesce((p_config->>'judge_weight')::numeric, 1);
    vw := coalesce((p_config->>'public_vote_weight')::numeric, 0);
  exception when others then
    raise exception 'invalid scoring configuration: weights must be numbers';
  end;
  if jw < 0 or vw < 0 or jw + vw <= 0 then
    raise exception 'invalid scoring configuration: judge_weight=% public_vote_weight=%', jw, vw;
  end if;
  return query select jw, vw;
end; $$;

create or replace function public.cast_creative_talent_hunt_vote(p_application_id uuid, p_round_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_app public.competition_applications%rowtype;
  v_comp public.competition_competitions%rowtype;
  v_minute int; v_today int; v_per_day int; v_per_min int; v_rows int;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED'); end if;
  select * into v_app from public.competition_applications where id = p_application_id;
  if v_app.id is null or v_app.status <> 'APPROVED' or not v_app.is_public
     or v_app.progress_state in ('ELIMINATED', 'WITHDRAWN', 'DISQUALIFIED') then
    return jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  if v_app.user_id = v_user then return jsonb_build_object('ok', false, 'reason', 'SELF_VOTE'); end if;
  select * into v_comp from public.competition_competitions where id = v_app.competition_id;
  if v_comp.voting_starts_at is null or v_comp.voting_ends_at is null
     or now() < v_comp.voting_starts_at or now() > v_comp.voting_ends_at then
    return jsonb_build_object('ok', false, 'reason', 'WINDOW_CLOSED');
  end if;
  if v_app.current_round_id is distinct from p_round_id or not exists (
    select 1 from public.competition_rounds r
    where r.id = p_round_id and r.competition_id = v_comp.id and r.public_voting_enabled
      and r.status in ('OPEN', 'IN_PROGRESS', 'JUDGING')) then
    return jsonb_build_object('ok', false, 'reason', 'WINDOW_CLOSED');
  end if;
  v_per_day := greatest(coalesce((v_comp.config->>'votes_per_user_per_day')::int, 10), 1);
  v_per_min := greatest(coalesce((v_comp.config->>'vote_rate_limit_per_minute')::int, 5), 1);
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 42));
  select count(*) into v_minute from public.competition_votes
   where voter_user_id = v_user and voided_at is null and created_at > now() - interval '1 minute';
  if v_minute >= v_per_min then return jsonb_build_object('ok', false, 'reason', 'RATE_LIMITED'); end if;
  select count(*) into v_today from public.competition_votes
   where voter_user_id = v_user and competition_id = v_comp.id and voided_at is null
     and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  if v_today >= v_per_day then return jsonb_build_object('ok', false, 'reason', 'DAILY_LIMIT_REACHED'); end if;
  insert into public.competition_votes(competition_id, round_id, application_id, voter_user_id)
  values (v_comp.id, p_round_id, p_application_id, v_user)
  on conflict (round_id, application_id, voter_user_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('ok', false, 'reason', 'DUPLICATE'); end if;
  return jsonb_build_object('ok', true, 'votes_remaining_today', greatest(v_per_day - v_today - 1, 0));
end; $$;

create or replace function public.decide_creative_talent_hunt_round(p_application_id uuid, p_outcome text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_app public.competition_applications%rowtype; v_round public.competition_rounds%rowtype; v_next public.competition_rounds%rowtype;
begin
  if not public.cth_is_competition_admin() then raise exception 'not authorised'; end if;
  if p_outcome not in ('ADVANCED', 'ELIMINATED', 'HELD') then raise exception 'invalid outcome'; end if;
  select * into v_app from public.competition_applications where id = p_application_id for update;
  if v_app.id is null then raise exception 'application not found'; end if;
  if v_app.status <> 'APPROVED' then raise exception 'only approved entries can progress'; end if;
  select * into v_round from public.competition_rounds where id = v_app.current_round_id;
  if v_round.id is null then raise exception 'no active round'; end if;
  if p_outcome = 'ELIMINATED' then
    update public.competition_applications set progress_state = 'ELIMINATED', updated_at = now() where id = p_application_id;
  elsif p_outcome = 'ADVANCED' then
    select * into v_next from public.competition_rounds
     where competition_id = v_app.competition_id and sequence > v_round.sequence and status not in ('CLOSED', 'COMPLETED')
     order by sequence limit 1;
    if v_next.id is null then
      update public.competition_applications set progress_state = 'WINNER', updated_at = now() where id = p_application_id;
    else
      update public.competition_applications set current_round_id = v_next.id, progress_state = 'ROUND_ACTIVE', updated_at = now() where id = p_application_id;
    end if;
  end if;
  insert into public.competition_audit_logs(competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_app.competition_id, auth.uid(), 'ROUND_DECISION', 'APPLICATION', p_application_id,
          jsonb_build_object('round_id', v_round.id, 'outcome', p_outcome, 'next_round_id', v_next.id));
  return jsonb_build_object('ok', true, 'outcome', p_outcome, 'next_round_id', v_next.id);
end; $$;

create or replace function public.admin_cth_set_voting_window(p_starts_at timestamptz, p_ends_at timestamptz, p_reason text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_comp public.competition_competitions%rowtype;
begin
  if not public.cth_is_competition_admin() then raise exception 'not authorised'; end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then raise exception 'voting must end after it starts'; end if;
  select * into v_comp from public.competition_competitions where slug = 'creative-talent-hunt' for update;
  update public.competition_competitions set voting_starts_at = p_starts_at, voting_ends_at = p_ends_at, updated_at = now() where id = v_comp.id;
  insert into public.competition_audit_logs(competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_comp.id, auth.uid(), 'VOTING_WINDOW_SET', 'COMPETITION', v_comp.id,
          jsonb_build_object('before', jsonb_build_object('starts', v_comp.voting_starts_at, 'ends', v_comp.voting_ends_at),
                             'after', jsonb_build_object('starts', p_starts_at, 'ends', p_ends_at), 'reason', coalesce(p_reason, '')));
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_cth_set_round_voting(p_round_id uuid, p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_comp uuid;
begin
  if not public.cth_is_competition_admin() then raise exception 'not authorised'; end if;
  update public.competition_rounds set public_voting_enabled = p_enabled where id = p_round_id returning competition_id into v_comp;
  if v_comp is null then raise exception 'round not found'; end if;
  insert into public.competition_audit_logs(competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_comp, auth.uid(), 'ROUND_VOTING_SET', 'ROUND', p_round_id, jsonb_build_object('enabled', p_enabled));
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_cth_set_scoring_weights(p_judge_weight numeric, p_public_vote_weight numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_comp public.competition_competitions%rowtype; v_new jsonb;
begin
  if not public.cth_is_competition_admin() then raise exception 'not authorised'; end if;
  select * into v_comp from public.competition_competitions where slug = 'creative-talent-hunt' for update;
  v_new := v_comp.config || jsonb_build_object('judge_weight', p_judge_weight, 'public_vote_weight', p_public_vote_weight);
  perform * from public.cth_scoring_weights(v_new);
  update public.competition_competitions set config = v_new, updated_at = now() where id = v_comp.id;
  insert into public.competition_audit_logs(competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_comp.id, auth.uid(), 'SCORING_WEIGHTS_SET', 'COMPETITION', v_comp.id,
          jsonb_build_object('before', jsonb_build_object('judge_weight', v_comp.config->'judge_weight', 'public_vote_weight', v_comp.config->'public_vote_weight'),
                             'after', jsonb_build_object('judge_weight', p_judge_weight, 'public_vote_weight', p_public_vote_weight)));
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_cth_update_public_info(p_info jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_comp public.competition_competitions%rowtype; v_patch jsonb := '{}'::jsonb; k text;
begin
  if not public.cth_is_competition_admin() then raise exception 'not authorised'; end if;
  foreach k in array array['rules', 'eligibility', 'consent_requirements', 'prizes'] loop
    if p_info ? k then
      if jsonb_typeof(p_info->k) <> 'array' then raise exception '% must be a list', k; end if;
      v_patch := v_patch || jsonb_build_object(k, p_info->k);
    end if;
  end loop;
  if p_info ? 'judges_public' then v_patch := v_patch || jsonb_build_object('judges_public', (p_info->>'judges_public')::boolean); end if;
  select * into v_comp from public.competition_competitions where slug = 'creative-talent-hunt' for update;
  update public.competition_competitions set config = config || v_patch, updated_at = now() where id = v_comp.id;
  insert into public.competition_audit_logs(competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_comp.id, auth.uid(), 'PUBLIC_INFO_UPDATED', 'COMPETITION', v_comp.id, jsonb_build_object('keys', (select jsonb_agg(x) from jsonb_object_keys(v_patch) x)));
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.admin_cth_vote_totals()
returns table(application_id uuid, display_name text, handle text, category_name text, round_name text,
              valid_votes bigint, voided_votes bigint, distinct_voters bigint, last_vote_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.cth_is_competition_admin() then raise exception 'not authorised'; end if;
  return query
  select a.id, a.display_name, a.handle, cat.name, r.name,
         count(v.id) filter (where v.voided_at is null),
         count(v.id) filter (where v.voided_at is not null),
         count(distinct v.voter_user_id) filter (where v.voided_at is null),
         max(v.created_at)
  from public.competition_applications a
  join public.competition_competitions c on c.id = a.competition_id and c.slug = 'creative-talent-hunt'
  join public.competition_categories cat on cat.id = a.category_id
  left join public.competition_rounds r on r.id = a.current_round_id
  left join public.competition_votes v on v.application_id = a.id
  where a.status = 'APPROVED'
  group by a.id, a.display_name, a.handle, cat.name, r.name
  order by 6 desc, a.display_name;
end; $$;

create or replace function public.admin_cth_suspicious_votes(p_limit int default 50)
returns table(voter_user_id uuid, username text, votes_today bigint, votes_last_hour bigint, distinct_contestants bigint, account_created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.cth_is_competition_admin() then raise exception 'not authorised'; end if;
  return query
  select v.voter_user_id, p.username,
         count(*) filter (where v.created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc' and v.voided_at is null),
         count(*) filter (where v.created_at > now() - interval '1 hour' and v.voided_at is null),
         count(distinct v.application_id), p.created_at
  from public.competition_votes v
  join public.competition_competitions c on c.id = v.competition_id and c.slug = 'creative-talent-hunt'
  left join public.profiles p on p.id = v.voter_user_id
  group by v.voter_user_id, p.username, p.created_at
  order by 4 desc, 3 desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end; $$;

create or replace function public.admin_cth_void_votes(p_reason text, p_application_id uuid default null, p_voter_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_count int; v_comp uuid;
begin
  if not public.cth_is_competition_admin() then raise exception 'not authorised'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'a reason is required'; end if;
  if p_application_id is null and p_voter_user_id is null then raise exception 'choose a contestant or a voter'; end if;
  select id into v_comp from public.competition_competitions where slug = 'creative-talent-hunt';
  with updated as (
    update public.competition_votes set voided_at = now(), voided_by = auth.uid(), void_reason = left(trim(p_reason), 500)
     where voided_at is null and competition_id = v_comp
       and (p_application_id is null or application_id = p_application_id)
       and (p_voter_user_id is null or voter_user_id = p_voter_user_id)
    returning id
  ) select count(*) into v_count from updated;
  insert into public.competition_audit_logs(competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_comp, auth.uid(), 'VOTES_VOIDED', 'VOTE', coalesce(p_application_id, p_voter_user_id),
          jsonb_build_object('voided', v_count, 'reason', trim(p_reason), 'application_id', p_application_id, 'voter_user_id', p_voter_user_id));
  return jsonb_build_object('ok', true, 'voided', v_count);
end; $$;

create or replace function public.admin_cth_audit_feed(p_limit int default 100)
returns table(id uuid, action text, entity_type text, entity_id uuid, actor_username text, metadata jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.cth_is_competition_admin() then raise exception 'not authorised'; end if;
  return query
  select l.id, l.action, l.entity_type, l.entity_id, p.username, l.metadata, l.created_at
  from public.competition_audit_logs l
  join public.competition_competitions c on c.id = l.competition_id and c.slug = 'creative-talent-hunt'
  left join public.profiles p on p.id = l.actor_user_id
  order by l.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
end; $$;

create or replace function public.get_public_creative_talent_hunt_leaderboard()
returns table(rank bigint, application_id uuid, display_name text, handle text, category_name text, judge_score numeric, combined_score numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_comp public.competition_competitions%rowtype; jw numeric; vw numeric;
begin
  select * into v_comp from public.competition_competitions where slug = 'creative-talent-hunt';
  if v_comp.id is null or not coalesce((v_comp.config->>'leaderboard_published')::boolean, false) then return; end if;
  select w.judge_weight, w.vote_weight into jw, vw from public.cth_scoring_weights(v_comp.config) w;
  return query
  with scored as (
    select ap.id, ap.display_name, ap.handle, cat.name as category_name,
           round(avg(public.cth_assignment_score(a.id)), 2) as judge_score
    from public.competition_applications ap
    join public.competition_categories cat on cat.id = ap.category_id
    join public.competition_judge_assignments a on a.application_id = ap.id and a.status = 'FINALIZED'
    where ap.competition_id = v_comp.id and ap.status = 'APPROVED' and ap.is_public
    group by ap.id, ap.display_name, ap.handle, cat.name
  ), votes as (
    select s.id, count(v.id) filter (where v.voided_at is null) as cnt
    from scored s left join public.competition_votes v on v.application_id = s.id
    group by s.id
  ), mx as (select greatest(max(cnt), 0) as m from votes), blended as (
    select s.*, round((s.judge_score * jw
             + (case when (select m from mx) > 0 then vt.cnt::numeric / (select m from mx) * 100 else 0 end) * vw)
             / (jw + vw), 2) as combined
    from scored s join votes vt on vt.id = s.id
  )
  select rank() over (order by b.combined desc), b.id, b.display_name, b.handle, b.category_name, b.judge_score, b.combined
  from blended b order by b.combined desc, b.display_name;
end; $$;

create or replace function public.get_public_creative_talent_hunt_contestant(p_handle text)
returns table(id uuid, handle text, display_name text, location text, bio text, experience text, audition_url text,
              category_name text, category_slug text, progress_state text, current_round_id uuid, round_name text, voting_open boolean)
language sql stable security definer set search_path = public as $$
  select a.id, a.handle, a.display_name, a.location, a.bio, a.experience, a.audition_url,
         c.name, c.slug, a.progress_state, a.current_round_id, r.name,
         coalesce(r.public_voting_enabled and r.status in ('OPEN', 'IN_PROGRESS', 'JUDGING')
           and cp.voting_starts_at is not null and cp.voting_ends_at is not null
           and now() between cp.voting_starts_at and cp.voting_ends_at, false)
  from public.competition_applications a
  join public.competition_competitions cp on cp.id = a.competition_id and cp.slug = 'creative-talent-hunt'
  join public.competition_categories c on c.id = a.category_id
  left join public.competition_rounds r on r.id = a.current_round_id
  where lower(a.handle) = lower(p_handle) and a.status = 'APPROVED' and a.is_public
  limit 1;
$$;

create or replace function public.get_public_creative_talent_hunt_judges()
returns table(display_name text, bio text)
language sql stable security definer set search_path = public as $$
  select j.display_name, j.bio
  from public.competition_judges j
  join public.competition_competitions c on c.id = j.competition_id and c.slug = 'creative-talent-hunt'
  where j.is_active and coalesce((c.config->>'judges_public')::boolean, false)
  order by j.display_name;
$$;

revoke all on function public.cth_scoring_weights(jsonb) from public, anon, authenticated;
revoke all on function public.cast_creative_talent_hunt_vote(uuid, uuid) from public, anon;
revoke all on function public.decide_creative_talent_hunt_round(uuid, text) from public, anon;
revoke all on function public.admin_cth_set_voting_window(timestamptz, timestamptz, text) from public, anon;
revoke all on function public.admin_cth_set_round_voting(uuid, boolean) from public, anon;
revoke all on function public.admin_cth_set_scoring_weights(numeric, numeric) from public, anon;
revoke all on function public.admin_cth_update_public_info(jsonb) from public, anon;
revoke all on function public.admin_cth_vote_totals() from public, anon;
revoke all on function public.admin_cth_suspicious_votes(int) from public, anon;
revoke all on function public.admin_cth_void_votes(text, uuid, uuid) from public, anon;
revoke all on function public.admin_cth_audit_feed(int) from public, anon;
grant execute on function public.cast_creative_talent_hunt_vote(uuid, uuid) to authenticated;
grant execute on function public.decide_creative_talent_hunt_round(uuid, text) to authenticated;
grant execute on function public.admin_cth_set_voting_window(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.admin_cth_set_round_voting(uuid, boolean) to authenticated;
grant execute on function public.admin_cth_set_scoring_weights(numeric, numeric) to authenticated;
grant execute on function public.admin_cth_update_public_info(jsonb) to authenticated;
grant execute on function public.admin_cth_vote_totals() to authenticated;
grant execute on function public.admin_cth_suspicious_votes(int) to authenticated;
grant execute on function public.admin_cth_void_votes(text, uuid, uuid) to authenticated;
grant execute on function public.admin_cth_audit_feed(int) to authenticated;
grant execute on function public.get_public_creative_talent_hunt_leaderboard() to anon, authenticated;
grant execute on function public.get_public_creative_talent_hunt_contestant(text) to anon, authenticated;
grant execute on function public.get_public_creative_talent_hunt_judges() to anon, authenticated;