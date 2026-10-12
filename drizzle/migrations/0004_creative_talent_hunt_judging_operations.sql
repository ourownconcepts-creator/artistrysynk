-- Creative Talent Hunt judging operations (adapter, corrected for the live ArtistrySynk schema)
-- Safe to re-run. Additive only. Scores stay RPC-only; no direct client write policies.

create or replace function public.creative_talent_hunt_is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _user_id is not null and _user_id = auth.uid() and public.cth_is_competition_admin();
$$;
revoke all on function public.creative_talent_hunt_is_admin(uuid) from public, anon;
grant execute on function public.creative_talent_hunt_is_admin(uuid) to authenticated;

drop policy if exists "Creative Talent Hunt admins manage judges" on public.competition_judges;
drop policy if exists "Creative Talent Hunt admins manage assignments" on public.competition_judge_assignments;
drop policy if exists "Judges can write their scores" on public.competition_scores;
drop policy if exists "Judges can update their scores" on public.competition_scores;

drop policy if exists "Judges can view their judge record" on public.competition_judges;
create policy "Judges can view their judge record" on public.competition_judges
for select to authenticated using (user_id = auth.uid());

create or replace function public.create_creative_talent_hunt_judge(p_competition_id uuid, p_user_id uuid, p_display_name text, p_bio text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.cth_is_competition_admin() then raise exception 'not authorised'; end if;
  if not exists (select 1 from public.competition_competitions where id = p_competition_id) then raise exception 'competition not found'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'member not found'; end if;
  if coalesce(trim(p_display_name), '') = '' then raise exception 'display name required'; end if;
  insert into public.competition_judges(competition_id, user_id, display_name, bio, is_active)
  values (p_competition_id, p_user_id, left(trim(p_display_name), 120), left(coalesce(p_bio, ''), 2000), true)
  on conflict (competition_id, user_id) do update set display_name = excluded.display_name, bio = excluded.bio, is_active = true
  returning id into v_id;
  insert into public.competition_audit_logs(competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_competition_id, auth.uid(), 'JUDGE_APPOINTED', 'JUDGE', v_id, jsonb_build_object('user_id', p_user_id));
  return v_id;
end; $$;

create or replace function public.assign_creative_talent_hunt_judge(p_judge_id uuid, p_application_id uuid, p_round_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_judge public.competition_judges%rowtype; v_app public.competition_applications%rowtype;
begin
  if not public.cth_is_competition_admin() then raise exception 'not authorised'; end if;
  select * into v_judge from public.competition_judges where id = p_judge_id;
  select * into v_app from public.competition_applications where id = p_application_id;
  if v_judge.id is null or not v_judge.is_active then raise exception 'judge not found or inactive'; end if;
  if v_app.id is null or v_app.competition_id <> v_judge.competition_id then raise exception 'application not found'; end if;
  if v_app.user_id = v_judge.user_id then raise exception 'judges cannot score their own entry'; end if;
  if not exists (select 1 from public.competition_rounds where id = p_round_id and competition_id = v_app.competition_id) then raise exception 'round not found'; end if;
  insert into public.competition_judge_assignments(judge_id, application_id, round_id, status)
  values (p_judge_id, p_application_id, p_round_id, 'ASSIGNED')
  on conflict (judge_id, application_id, round_id)
  do update set status = case when public.competition_judge_assignments.status = 'REMOVED' then 'ASSIGNED' else public.competition_judge_assignments.status end
  returning id into v_id;
  insert into public.competition_audit_logs(competition_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_app.competition_id, auth.uid(), 'JUDGE_ASSIGNED', 'JUDGE_ASSIGNMENT', v_id,
          jsonb_build_object('judge_id', p_judge_id, 'application_id', p_application_id, 'round_id', p_round_id));
  return v_id;
end; $$;

revoke all on function public.create_creative_talent_hunt_judge(uuid, uuid, text, text) from public, anon;
revoke all on function public.assign_creative_talent_hunt_judge(uuid, uuid, uuid) from public, anon;
grant execute on function public.create_creative_talent_hunt_judge(uuid, uuid, text, text) to authenticated;
grant execute on function public.assign_creative_talent_hunt_judge(uuid, uuid, uuid) to authenticated;