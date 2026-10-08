-- Public content RPCs for Creative Talent Hunt.
create or replace function public.get_public_creative_talent_hunt_announcements()
returns table(id uuid,title text,body text,is_pinned boolean,published_at timestamptz,round_name text)
language sql stable security definer set search_path=public as $$
  select a.id,a.title,a.body,a.is_pinned,a.published_at,r.name
  from public.competition_announcements a
  left join public.competition_rounds r on r.id=a.round_id
  join public.competition_competitions c on c.id=a.competition_id
  where c.slug='creative-talent-hunt'
    and a.audience='PUBLIC' and a.is_published=true
    and (a.scheduled_for is null or a.scheduled_for<=now())
  order by a.is_pinned desc,a.published_at desc nulls last,a.created_at desc;
$$;
grant execute on function public.get_public_creative_talent_hunt_announcements() to anon,authenticated;

create or replace function public.get_public_creative_talent_hunt_judges()
returns table(id uuid,display_name text,bio text)
language sql stable security definer set search_path=public as $$
  select j.id,j.display_name,j.bio
  from public.competition_judges j
  join public.competition_competitions c on c.id=j.competition_id
  where c.slug='creative-talent-hunt' and j.is_active=true
  order by j.created_at;
$$;
grant execute on function public.get_public_creative_talent_hunt_judges() to anon,authenticated;
