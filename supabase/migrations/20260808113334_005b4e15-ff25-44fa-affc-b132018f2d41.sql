create or replace function public.claim_referral(_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _referrer uuid;
  _existing uuid;
  _row_id uuid;
begin
  if _uid is null then return 'unauthenticated'; end if;
  if _code is null or btrim(_code) = '' then return 'no_code'; end if;

  select id into _existing from public.referrals where referred_id = _uid limit 1;
  if _existing is not null then return 'already_attributed'; end if;

  select referrer_id into _referrer from public.referrals where referral_code = _code limit 1;
  if _referrer is null then return 'invalid_code'; end if;
  if _referrer = _uid then return 'self_referral'; end if;

  select id into _row_id
  from public.referrals
  where referral_code = _code and referred_id is null and status = 'active'
  limit 1;

  if _row_id is not null then
    update public.referrals
      set referred_id = _uid, status = 'completed', completed_at = now()
      where id = _row_id;
  else
    insert into public.referrals (referrer_id, referred_id, referral_code, status, completed_at)
    values (_referrer, _uid, _code, 'completed', now());
  end if;

  return 'attributed';
end;
$$;

revoke all on function public.claim_referral(text) from public, anon;
grant execute on function public.claim_referral(text) to authenticated;

create or replace function public.list_my_referrals()
returns table(referred_id uuid, full_name text, username text, avatar_url text, status text, completed_at timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.referred_id, p.full_name, p.username, p.avatar_url, r.status, r.completed_at, r.created_at
  from public.referrals r
  left join public.profiles p on p.id = r.referred_id
  where r.referrer_id = auth.uid() and r.referred_id is not null
  order by r.completed_at desc nulls last, r.created_at desc
$$;

revoke all on function public.list_my_referrals() from public, anon;
grant execute on function public.list_my_referrals() to authenticated;