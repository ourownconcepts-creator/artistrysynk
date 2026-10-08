-- Creative Talent Hunt judging operations
-- Repository-first phase. Lovable/database synchronization can apply this migration later.
-- Uses the existing ArtistrySynk role system: has_role(user_id, role).

create or replace function public.creative_talent_hunt_is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_role(_user_id, 'admin'::public.app_role)
    or public.has_role(_user_id, 'master_admin'::public.app_role)
    or public.has_role(_user_id, 'super_admin'::public.app_role);
$$;

grant execute on function public.creative_talent_hunt_is_admin(uuid) to authenticated;

drop policy if exists "Creative Talent Hunt admins manage judges" on public.competition_judges;
create policy "Creative Talent Hunt admins manage judges"
on public.competition_judges
for all to authenticated
using (public.creative_talent_hunt_is_admin(auth.uid()))
with check (public.creative_talent_hunt_is_admin(auth.uid()));

drop policy if exists "Judges can view their judge record" on public.competition_judges;
create policy "Judges can view their judge record"
on public.competition_judges
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Creative Talent Hunt admins manage assignments" on public.competition_judge_assignments;
create policy "Creative Talent Hunt admins manage assignments"
on public.competition_judge_assignments
for all to authenticated
using (public.creative_talent_hunt_is_admin(auth.uid()))
with check (public.creative_talent_hunt_is_admin(auth.uid()));

drop policy if exists "Judges can view their assignments" on public.competition_judge_assignments;
create policy "Judges can view their assignments"
on public.competition_judge_assignments
for select to authenticated
using (
  exists (
    select 1
    from public.competition_judges j
    where j.id = judge_id
      and j.user_id = auth.uid()
      and j.is_active = true
  )
);

drop policy if exists "Judges can read their scores" on public.competition_scores;
create policy "Judges can read their scores"
on public.competition_scores
for select to authenticated
using (
  exists (
    select 1
    from public.competition_judge_assignments a
    join public.competition_judges j on j.id = a.judge_id
    where a.id = assignment_id
      and j.user_id = auth.uid()
  )
);

drop policy if exists "Judges can write their scores" on public.competition_scores;
create policy "Judges can write their scores"
on public.competition_scores
for insert to authenticated
with check (
  exists (
    select 1
    from public.competition_judge_assignments a
    join public.competition_judges j on j.id = a.judge_id
    where a.id = assignment_id
      and j.user_id = auth.uid()
      and j.is_active = true
      and a.status = 'ASSIGNED'
  )
);

drop policy if exists "Judges can update their scores" on public.competition_scores;
create policy "Judges can update their scores"
on public.competition_scores
for update to authenticated
using (
  exists (
    select 1
    from public.competition_judge_assignments a
    join public.competition_judges j on j.id = a.judge_id
    where a.id = assignment_id
      and j.user_id = auth.uid()
      and j.is_active = true
      and a.status = 'ASSIGNED'
  )
)
with check (
  exists (
    select 1
    from public.competition_judge_assignments a
    join public.competition_judges j on j.id = a.judge_id
    where a.id = assignment_id
      and j.user_id = auth.uid()
      and j.is_active = true
      and a.status = 'ASSIGNED'
  )
);

create or replace function public.create_creative_talent_hunt_judge(
  p_competition_id uuid,
  p_user_id uuid,
  p_display_name text,
  p_bio text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.creative_talent_hunt_is_admin(auth.uid()) then
    raise exception 'not authorised';
  end if;

  insert into public.competition_judges(competition_id,user_id,display_name,bio,is_active)
  values(p_competition_id,p_user_id,trim(p_display_name),coalesce(p_bio,''),true)
  on conflict (competition_id,user_id)
  do update set display_name=excluded.display_name,bio=excluded.bio,is_active=true
  returning id into v_id;

  insert into public.competition_audit_logs(competition_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_competition_id,auth.uid(),'JUDGE_APPOINTED','JUDGE',v_id,jsonb_build_object('user_id',p_user_id));

  return v_id;
end;
$$;

create or replace function public.assign_creative_talent_hunt_judge(
  p_judge_id uuid,
  p_application_id uuid,
  p_round_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.creative_talent_hunt_is_admin(auth.uid()) then
    raise exception 'not authorised';
  end if;

  insert into public.competition_judge_assignments(judge_id,application_id,round_id,status)
  values(p_judge_id,p_application_id,p_round_id,'ASSIGNED')
  on conflict (judge_id,application_id,round_id)
  do update set status='ASSIGNED'
  returning id into v_id;

  insert into public.competition_audit_logs(
    competition_id,actor_user_id,action,entity_type,entity_id,metadata
  )
  select a.competition_id,auth.uid(),'JUDGE_ASSIGNED','JUDGE_ASSIGNMENT',v_id,
         jsonb_build_object('judge_id',p_judge_id,'application_id',p_application_id,'round_id',p_round_id)
  from public.competition_applications a
  where a.id=p_application_id;

  return v_id;
end;
$$;

grant execute on function public.create_creative_talent_hunt_judge(uuid,uuid,text,text) to authenticated;
grant execute on function public.assign_creative_talent_hunt_judge(uuid,uuid,uuid) to authenticated;
