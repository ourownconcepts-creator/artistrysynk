-- Sensitive state changes must go through validated security-definer RPCs.
-- Direct table writes bypass vote eligibility, score range checks, finalisation locks and audit logging.

drop policy if exists "Users can create their submissions"
  on public.competition_submissions;

drop policy if exists "Users can update their submissions"
  on public.competition_submissions;

drop policy if exists "Authenticated users can vote"
  on public.competition_votes;

drop policy if exists "Judges can write their scores"
  on public.competition_scores;

drop policy if exists "Judges can update their scores"
  on public.competition_scores;

-- Keep owner/admin SELECT policies in place. Submissions are created/reviewed
-- by submit_creative_talent_hunt_application and review_creative_talent_hunt_submission;
-- votes use cast_creative_talent_hunt_vote; scores use save_creative_talent_hunt_scores.
