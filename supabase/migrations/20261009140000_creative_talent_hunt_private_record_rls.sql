-- Public profiles must use safe RPCs, not direct table access to private application/submission columns.
-- The old is_public predicate exposed full_name, email, phone, date_of_birth and review metadata
-- to every authenticated user who selected a public application.
drop policy if exists "Users can view their competition applications"
  on public.competition_applications;

create policy "Users can view their own competition applications"
on public.competition_applications
for select
to authenticated
using (auth.uid() = user_id);

-- Public submissions are also exposed through curated security-definer RPCs only.
drop policy if exists "Users can view their submissions"
  on public.competition_submissions;

create policy "Users can view their own submissions"
on public.competition_submissions
for select
to authenticated
using (
  exists (
    select 1
    from public.competition_applications a
    where a.id = application_id
      and a.user_id = auth.uid()
  )
);
