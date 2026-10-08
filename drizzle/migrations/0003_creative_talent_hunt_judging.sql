-- Creative Talent Hunt judging engine (idempotent, additive only)

-- 1. Assignment lifecycle columns
alter table public.competition_judge_assignments add column if not exists comment text not null default '';
alter table public.competition_judge_assignments add column if not exists finalized_at timestamptz;
alter table public.competition_judge_assignments add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'competition_judge_assignments_status_check') then
    alter table public.competition_judge_assignments add constraint competition_judge_assignments_status_check
      check (status in ('ASSIGNED','IN_PROGRESS','FINALIZED','REMOVED'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'competition_scores_score_nonnegative') then
    alter table public.competition_scores add constraint competition_scores_score_nonnegative check (score >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'competition_scoring_criteria_bounds') then
    alter table public.competition_scoring_criteria add constraint competition_scoring_criteria_bounds check (max_score > 0 and weight > 0);
  end if;
end $$;

create index if not exists idx_competition_judges_user on public.competition_judges(user_id);
create index if not exists idx_competition_judge_assignments_judge on public.competition_judge_assignments(judge_id);
create index if not exists idx_competition_judge_assignments_application on public.competition_judge_assignments(application_id);
create index if not exists idx_competition_scores_assignment on public.competition_scores(assignment_id);
create index if not exists idx_competition_scoring_criteria_round on public.competition_scoring_criteria(round_id);

-- 2. Criteria are public configuration (no private data)
grant select on public.competition_scoring_criteria to anon, authenticated;
grant all on public.competition_scoring_criteria to service_role;
drop policy if exists "Public can view scoring criteria" on public.competition_scoring_criteria;
create policy "Public can view scoring criteria" on public.competition_scoring_criteria for select using (true);

-- 3. Seed open-entry criteria: max 10, 20% each
insert into public.competition_scoring_criteria (competition_id, round_id, name, description, max_score, weight, sort_order)
select r.competition_id, r.id, v.name, v.description, 10, 0.2, v.sort_order
from public.competition_rounds r
join public.competition_competitions c on c.id = r.competition_id
cross join (values
  ('Creativity', 'Imagination and fresh creative thinking.', 1),
  ('Skill / Execution', 'Technical ability and quality of delivery.', 2),
  ('Originality', 'A distinct voice that stands apart.', 3),
  ('Presentation / Impact', 'Stage presence, polish and audience impact.', 4),
  ('Overall Potential', 'Room to grow into a standout creative.', 5)
) v(name, description, sort_order)
where c.slug = 'creative-talent-hunt' and r.slug = 'open-entry'
on conflict (round_id, name) do nothing;

-- 4. Leaderboard configuration defaults (only add missing keys)
update public.competition_competitions
set config = jsonb_build_object('leaderboard_published', false, 'judge_weight', 1, 'public_vote_weight', 0) || config
where slug = 'creative-talent-hunt'
  and not (config ? 'leaderboard_published');

-- 5. Helpers
create or replace function public.cth_is_competition_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'master_admin'::public.app_role)
    or public.has_role(auth.uid(), 'super_admin'::public.app_role));
$$;
grant execute on function public.cth_is_competition_admin() to authenticated;

create or replace function public.cth_assignment_score(p_assignment_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select case when sum(c.weight) > 0
    then round(sum((s.score / c.max_score) * c.weight) / sum(c.weight) * 100, 2) end
  from public.competition_scores s
  join public.competition_scoring_criteria c on c.id = s.criterion_id
  where s.assignment_id = p_assignment_id;
$$;
revoke execute on function public.cth_assignment_score(uuid) from public, anon, authenticated;

-- 6. Score guard: bounds + no changes after finalization
create or replace function public.cth_guard_score()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status text; v_max numeric; v_assign uuid;
begin
  v_assign := coalesce(new.assignment_id, old.assignment_id);
  select status into v_status from public.competition_judge_assignments where id = v_assign;
  if v_status in ('FINALIZED', 'REMOVED') then
    raise exception 'Scores are locked for this assignment';
  end if;
  if tg_op <> 'DELETE' then
    select max_score into v_max from public.competition_scoring_criteria where id = new.criterion_id;
    if new.score < 0 or new.score > v_max then
      raise exception 'Score must be between 0 and %', v_max;
    end if;
    new.updated_at := now();
    return new;
  end if;
  return old;
end $$;
drop trigger if exists trg_cth_guard_score on public.competition_scores;
create trigger trg_cth_guard_score before insert or update or delete on public.competition_scores
  for each row execute function public.cth_guard_score();

-- 7. Admin RPCs
create or replace function public.admin_cth_upsert_judge(p_username text, p_display_name text default null, p_bio text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_name text; v_comp uuid; v_id uuid;
begin
  if not public.cth_is_competition_admin() then raise exception 'Competition administrator access required'; end if;
  select id, coalesce(nullif(display_name, ''), nullif(full_name, ''), username) into v_user, v_name
  from public.profiles where lower(username) = lower(trim(both '@' from trim(p_username)));
  if v_user is null then raise exception 'No member found with that username'; end if;
  select id into v_comp from public.competition_competitions where slug = 'creative-talent-hunt';
  insert into public.competition_judges (competition_id, user_id, display_name, bio, is_active)
  values (v_comp, v_user, coalesce(nullif(trim(p_display_name), ''), v_name), coalesce(p_bio, ''), true)
  on conflict (competition_id, user_id) do update
    set display_name = excluded.display_name, bio = excluded.bio, is_active = true
  returning id into v_id;
  insert into public.competition_audit_logs (competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_comp, auth.uid(), 'JUDGE_UPSERTED', 'competition_judge', v_id, jsonb_build_object('user_id', v_user));
  return v_id;
end $$;

create or replace function public.admin_cth_set_judge_active(p_judge_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_comp uuid;
begin
  if not public.cth_is_competition_admin() then raise exception 'Competition administrator access required'; end if;
  update public.competition_judges set is_active = p_active where id = p_judge_id returning competition_id into v_comp;
  if not found then raise exception 'Judge not found'; end if;
  insert into public.competition_audit_logs (competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_comp, auth.uid(), case when p_active then 'JUDGE_ACTIVATED' else 'JUDGE_DEACTIVATED' end, 'competition_judge', p_judge_id, '{}'::jsonb);
end $$;

create or replace function public.admin_cth_assign_judge(p_judge_id uuid, p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_app public.competition_applications%rowtype; v_judge public.competition_judges%rowtype; v_round uuid; v_id uuid;
begin
  if not public.cth_is_competition_admin() then raise exception 'Competition administrator access required'; end if;
  select * into v_judge from public.competition_judges where id = p_judge_id;
  if not found or not v_judge.is_active then raise exception 'Judge is not active'; end if;
  select * into v_app from public.competition_applications where id = p_application_id;
  if not found or v_app.competition_id <> v_judge.competition_id then raise exception 'Contestant not found'; end if;
  if v_app.status <> 'APPROVED' then raise exception 'Only approved contestants can be assigned'; end if;
  if v_app.user_id = v_judge.user_id then raise exception 'Judges cannot score their own entry'; end if;
  select id into v_round from public.competition_rounds where competition_id = v_app.competition_id and slug = 'open-entry';
  insert into public.competition_judge_assignments (judge_id, application_id, round_id, status)
  values (p_judge_id, p_application_id, v_round, 'ASSIGNED')
  on conflict (judge_id, application_id, round_id) do update
    set status = case when public.competition_judge_assignments.status = 'REMOVED' then 'ASSIGNED' else public.competition_judge_assignments.status end,
        updated_at = now()
  returning id into v_id;
  insert into public.competition_audit_logs (competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_app.competition_id, auth.uid(), 'JUDGE_ASSIGNED', 'competition_judge_assignment', v_id,
    jsonb_build_object('judge_id', p_judge_id, 'application_id', p_application_id));
  return v_id;
end $$;

create or replace function public.admin_cth_unassign_judge(p_assignment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_a public.competition_judge_assignments%rowtype; v_comp uuid;
begin
  if not public.cth_is_competition_admin() then raise exception 'Competition administrator access required'; end if;
  select * into v_a from public.competition_judge_assignments where id = p_assignment_id for update;
  if not found then raise exception 'Assignment not found'; end if;
  if v_a.status = 'FINALIZED' then raise exception 'Finalized scores cannot be unassigned'; end if;
  update public.competition_judge_assignments set status = 'REMOVED', updated_at = now() where id = p_assignment_id;
  select competition_id into v_comp from public.competition_judges where id = v_a.judge_id;
  insert into public.competition_audit_logs (competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_comp, auth.uid(), 'JUDGE_UNASSIGNED', 'competition_judge_assignment', p_assignment_id, '{}'::jsonb);
end $$;

create or replace function public.admin_cth_judging_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.cth_is_competition_admin() then raise exception 'Competition administrator access required'; end if;
  return jsonb_build_object(
    'judges', coalesce((select jsonb_agg(jsonb_build_object(
        'id', j.id, 'user_id', j.user_id, 'display_name', j.display_name, 'bio', j.bio, 'is_active', j.is_active,
        'username', p.username,
        'assigned', (select count(*) from public.competition_judge_assignments a where a.judge_id = j.id and a.status <> 'REMOVED'),
        'finalized', (select count(*) from public.competition_judge_assignments a where a.judge_id = j.id and a.status = 'FINALIZED')
      ) order by j.display_name)
      from public.competition_judges j
      join public.competition_competitions c on c.id = j.competition_id and c.slug = 'creative-talent-hunt'
      left join public.profiles p on p.id = j.user_id), '[]'::jsonb),
    'contestants', coalesce((select jsonb_agg(jsonb_build_object(
        'id', ap.id, 'display_name', ap.display_name, 'handle', ap.handle, 'category_name', cat.name,
        'assignments', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'judge_id', a.judge_id, 'status', a.status))
          from public.competition_judge_assignments a where a.application_id = ap.id and a.status <> 'REMOVED'), '[]'::jsonb)
      ) order by ap.display_name)
      from public.competition_applications ap
      join public.competition_categories cat on cat.id = ap.category_id
      join public.competition_competitions c on c.id = ap.competition_id and c.slug = 'creative-talent-hunt'
      where ap.status = 'APPROVED'), '[]'::jsonb),
    'leaderboard_published', coalesce((select (config->>'leaderboard_published')::boolean from public.competition_competitions where slug = 'creative-talent-hunt'), false)
  );
end $$;

create or replace function public.admin_cth_results()
returns table (application_id uuid, display_name text, handle text, category_name text, judge_score numeric,
  finalized_count bigint, assigned_count bigint, rank bigint, breakdown jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.cth_is_competition_admin() then raise exception 'Competition administrator access required'; end if;
  return query
  with per as (
    select a.application_id, a.id as assignment_id, a.status, j.display_name as judge_name,
      public.cth_assignment_score(a.id) as score, a.comment
    from public.competition_judge_assignments a
    join public.competition_judges j on j.id = a.judge_id
    where a.status <> 'REMOVED'
  ), agg as (
    select ap.id, ap.display_name, ap.handle, cat.name as category_name,
      round(avg(per.score) filter (where per.status = 'FINALIZED'), 2) as judge_score,
      count(*) filter (where per.status = 'FINALIZED') as finalized_count,
      count(per.assignment_id) as assigned_count,
      coalesce(jsonb_agg(jsonb_build_object('judge', per.judge_name, 'status', per.status, 'score', per.score, 'comment', per.comment))
        filter (where per.assignment_id is not null), '[]'::jsonb) as breakdown
    from public.competition_applications ap
    join public.competition_categories cat on cat.id = ap.category_id
    join public.competition_competitions c on c.id = ap.competition_id and c.slug = 'creative-talent-hunt'
    left join per on per.application_id = ap.id
    where ap.status = 'APPROVED'
    group by ap.id, ap.display_name, ap.handle, cat.name
  )
  select agg.id, agg.display_name, agg.handle, agg.category_name, agg.judge_score, agg.finalized_count, agg.assigned_count,
    case when agg.judge_score is null then null else rank() over (order by agg.judge_score desc nulls last) end,
    agg.breakdown
  from agg
  order by agg.judge_score desc nulls last, agg.display_name;
end $$;

create or replace function public.admin_cth_set_leaderboard_published(p_published boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_comp uuid;
begin
  if not public.cth_is_competition_admin() then raise exception 'Competition administrator access required'; end if;
  update public.competition_competitions set config = config || jsonb_build_object('leaderboard_published', p_published), updated_at = now()
  where slug = 'creative-talent-hunt' returning id into v_comp;
  insert into public.competition_audit_logs (competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_comp, auth.uid(), case when p_published then 'LEADERBOARD_PUBLISHED' else 'LEADERBOARD_UNPUBLISHED' end, 'competition', v_comp, '{}'::jsonb);
end $$;

-- 8. Judge RPCs (only own active assignments; no private contestant fields)
create or replace function public.judge_cth_my_assignments()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return jsonb_build_object(
    'is_judge', exists (select 1 from public.competition_judges j join public.competition_competitions c on c.id = j.competition_id
      where j.user_id = auth.uid() and j.is_active and c.slug = 'creative-talent-hunt'),
    'assignments', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'status', a.status, 'comment', a.comment, 'finalized_at', a.finalized_at,
      'application_id', ap.id, 'display_name', ap.display_name, 'handle', ap.handle, 'location', ap.location,
      'bio', ap.bio, 'experience', ap.experience, 'audition_url', ap.audition_url, 'audition_notes', ap.audition_notes,
      'category_name', cat.name,
      'scores', coalesce((select jsonb_agg(jsonb_build_object('criterion_id', s.criterion_id, 'score', s.score))
        from public.competition_scores s where s.assignment_id = a.id), '[]'::jsonb)
    ) order by a.status = 'FINALIZED', ap.display_name)
    from public.competition_judge_assignments a
    join public.competition_judges j on j.id = a.judge_id
    join public.competition_applications ap on ap.id = a.application_id
    join public.competition_categories cat on cat.id = ap.category_id
    where j.user_id = auth.uid() and j.is_active and a.status in ('ASSIGNED','IN_PROGRESS','FINALIZED')), '[]'::jsonb),
    'criteria', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'description', c.description,
        'max_score', c.max_score, 'weight', c.weight) order by c.sort_order)
      from public.competition_scoring_criteria c join public.competition_rounds r on r.id = c.round_id
      join public.competition_competitions cp on cp.id = r.competition_id
      where cp.slug = 'creative-talent-hunt' and r.slug = 'open-entry'), '[]'::jsonb)
  );
end $$;

create or replace function public.cth_lock_own_assignment(p_assignment_id uuid)
returns public.competition_judge_assignments language plpgsql security definer set search_path = public as $$
declare v_a public.competition_judge_assignments%rowtype;
begin
  select a.* into v_a from public.competition_judge_assignments a
  join public.competition_judges j on j.id = a.judge_id
  where a.id = p_assignment_id and j.user_id = auth.uid() and j.is_active for update of a;
  if not found then raise exception 'Assignment not found'; end if;
  if v_a.status = 'FINALIZED' then raise exception 'Scores are already finalized'; end if;
  if v_a.status = 'REMOVED' then raise exception 'Assignment is no longer active'; end if;
  return v_a;
end $$;
revoke execute on function public.cth_lock_own_assignment(uuid) from public, anon, authenticated;

create or replace function public.judge_cth_save_scores(p_assignment_id uuid, p_scores jsonb, p_comment text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_a public.competition_judge_assignments%rowtype; v_item jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_a := public.cth_lock_own_assignment(p_assignment_id);
  for v_item in select * from jsonb_array_elements(coalesce(p_scores, '[]'::jsonb)) loop
    if not exists (select 1 from public.competition_scoring_criteria where id = (v_item->>'criterion_id')::uuid and round_id = v_a.round_id) then
      raise exception 'Unknown scoring criterion';
    end if;
    insert into public.competition_scores (assignment_id, criterion_id, score)
    values (v_a.id, (v_item->>'criterion_id')::uuid, (v_item->>'score')::numeric)
    on conflict (assignment_id, criterion_id) do update set score = excluded.score;
  end loop;
  update public.competition_judge_assignments set status = 'IN_PROGRESS', comment = left(coalesce(p_comment, ''), 4000), updated_at = now()
  where id = v_a.id;
  return jsonb_build_object('assignment_id', v_a.id, 'status', 'IN_PROGRESS', 'score', public.cth_assignment_score(v_a.id));
end $$;

create or replace function public.judge_cth_finalize(p_assignment_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_a public.competition_judge_assignments%rowtype; v_missing int; v_score numeric; v_comp uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_a := public.cth_lock_own_assignment(p_assignment_id);
  select count(*) into v_missing from public.competition_scoring_criteria c
  where c.round_id = v_a.round_id and not exists (select 1 from public.competition_scores s where s.assignment_id = v_a.id and s.criterion_id = c.id);
  if v_missing > 0 then raise exception 'Score every criterion before finalizing'; end if;
  v_score := public.cth_assignment_score(v_a.id);
  update public.competition_judge_assignments set status = 'FINALIZED', finalized_at = now(), updated_at = now() where id = v_a.id;
  select competition_id into v_comp from public.competition_judges where id = v_a.judge_id;
  insert into public.competition_audit_logs (competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_comp, auth.uid(), 'SCORE_FINALIZED', 'competition_judge_assignment', v_a.id,
    jsonb_build_object('application_id', v_a.application_id, 'score', v_score));
  return jsonb_build_object('assignment_id', v_a.id, 'status', 'FINALIZED', 'score', v_score);
end $$;

-- 9. Public leaderboard (only when published; no judge identities or comments)
create or replace function public.get_public_creative_talent_hunt_leaderboard()
returns table (rank bigint, application_id uuid, display_name text, handle text, category_name text,
  judge_score numeric, combined_score numeric)
language sql stable security definer set search_path = public as $$
  with cfg as (
    select id, coalesce((config->>'leaderboard_published')::boolean, false) as published,
      coalesce((config->>'judge_weight')::numeric, 1) as jw
    from public.competition_competitions where slug = 'creative-talent-hunt'
  ), scored as (
    select ap.id, ap.display_name, ap.handle, cat.name as category_name,
      round(avg(public.cth_assignment_score(a.id)), 2) as judge_score
    from cfg
    join public.competition_applications ap on ap.competition_id = cfg.id
    join public.competition_categories cat on cat.id = ap.category_id
    join public.competition_judge_assignments a on a.application_id = ap.id and a.status = 'FINALIZED'
    where cfg.published and ap.status = 'APPROVED' and ap.is_public
    group by ap.id, ap.display_name, ap.handle, cat.name
  )
  -- combined_score: judges only for now; public votes join here later via public_vote_weight
  select rank() over (order by s.judge_score desc), s.id, s.display_name, s.handle, s.category_name, s.judge_score,
    round(s.judge_score * (select jw from cfg) / greatest((select jw from cfg), 1), 2)
  from scored s
  order by s.judge_score desc, s.display_name;
$$;

grant execute on function public.get_public_creative_talent_hunt_leaderboard() to anon, authenticated;
grant execute on function public.admin_cth_upsert_judge(text, text, text) to authenticated;
grant execute on function public.admin_cth_set_judge_active(uuid, boolean) to authenticated;
grant execute on function public.admin_cth_assign_judge(uuid, uuid) to authenticated;
grant execute on function public.admin_cth_unassign_judge(uuid) to authenticated;
grant execute on function public.admin_cth_judging_overview() to authenticated;
grant execute on function public.admin_cth_results() to authenticated;
grant execute on function public.admin_cth_set_leaderboard_published(boolean) to authenticated;
grant execute on function public.judge_cth_my_assignments() to authenticated;
grant execute on function public.judge_cth_save_scores(uuid, jsonb, text) to authenticated;
grant execute on function public.judge_cth_finalize(uuid) to authenticated;
revoke execute on function public.get_public_creative_talent_hunt_leaderboard() from public;
