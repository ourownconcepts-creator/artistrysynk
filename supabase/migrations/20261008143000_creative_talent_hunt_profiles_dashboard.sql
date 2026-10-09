-- Creative Talent Hunt public profile and participant dashboard access
create or replace function public.get_public_creative_talent_hunt_entry(p_handle text)
returns table(
  id uuid,
  handle text,
  display_name text,
  location text,
  bio text,
  experience text,
  audition_url text,
  category_id uuid,
  category_name text,
  progress_state text
)
language sql
security definer
set search_path = public
as $$
  select a.id,a.handle,a.display_name,a.location,a.bio,a.experience,a.audition_url,
         a.category_id,c.name,a.progress_state
  from public.competition_applications a
  join public.competition_categories c on c.id=a.category_id
  join public.competition_competitions comp on comp.id=a.competition_id
  where comp.slug='creative-talent-hunt'
    and a.handle=lower(p_handle)
    and a.is_public=true
    and a.status='APPROVED';
$$;

grant execute on function public.get_public_creative_talent_hunt_entry(text) to anon, authenticated;

create or replace function public.get_my_creative_talent_hunt_dashboard()
returns table(
  id uuid,
  handle text,
  display_name text,
  category_name text,
  status text,
  progress_state text,
  submission_state text,
  reference_code text,
  is_public boolean,
  current_round_name text
)
language sql
security definer
set search_path = public
as $$
  select a.id,a.handle,a.display_name,c.name,a.status,a.progress_state,a.submission_state,
         a.reference_code,a.is_public,r.name
  from public.competition_applications a
  join public.competition_competitions comp on comp.id=a.competition_id
  join public.competition_categories c on c.id=a.category_id
  left join public.competition_rounds r on r.id=a.current_round_id
  where comp.slug='creative-talent-hunt'
    and a.user_id=auth.uid();
$$;

grant execute on function public.get_my_creative_talent_hunt_dashboard() to authenticated;
