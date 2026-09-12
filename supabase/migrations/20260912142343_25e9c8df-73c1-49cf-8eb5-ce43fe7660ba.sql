CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT 'ArtistrySynk Team',
  category text NOT NULL DEFAULT 'General',
  read_time text NOT NULL DEFAULT '5 min read',
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX blog_posts_published_idx ON public.blog_posts (published, published_at DESC);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published posts are publicly readable"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE OR REPLACE FUNCTION public.set_blog_posts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_blog_posts_updated_at();

INSERT INTO public.blog_posts (slug, title, excerpt, content, author, category, read_time, published_at) VALUES
(
  'how-to-find-a-music-producer',
  'How to Find a Music Producer: A Complete Guide for Artists',
  'What to look for, red flags to avoid, and how to match with vetted producers on ArtistrySynk — a step-by-step guide for artists at every level.',
  E'Finding the right music producer can define your entire career. The producer you choose shapes your sound, your workflow, and often your budget — so this is not a decision to rush.\n\nStart with your sound. Before you search, write down three to five reference tracks that capture where you want your music to go. Producers read references the way architects read blueprints; the clearer yours are, the faster the right match appears.\n\nLook for proof, not promises. A credible producer has a portfolio you can listen to — finished, released records, not just beat snippets. On ArtistrySynk, portfolios and verified credits let you hear exactly what a producer has shipped before you ever send a message.\n\nWatch for red flags: producers who refuse to discuss splits and ownership upfront, who have no verifiable credits, or who pressure you into paying everything before a first session. A professional is happy to put terms in writing.\n\nTest the chemistry with one song before committing to a project. A single paid session tells you more about communication, punctuality, and taste than any amount of messaging.\n\nFinally, agree the business early: fees, number of revisions, stems and session files, and publishing splits. The artists who thrive are the ones who treat the creative and the commercial with equal care.\n\nReady to start? Swipe through vetted producers on ArtistrySynk Discover and match with someone who hears your vision.',
  'ArtistrySynk Team',
  'Tips & Tricks',
  '9 min read',
  '2026-07-07T09:00:00Z'
),
(
  '5-tips-for-finding-the-perfect-creative-collaborator',
  '5 Tips for Finding the Perfect Creative Collaborator',
  'Learn how to identify and connect with creatives who complement your skills and share your vision for successful projects.',
  E'Great collaborations rarely happen by accident. Here are five principles that consistently separate magical partnerships from frustrating ones.\n\n1. Complement, don’t clone. The best collaborator fills your gaps. If you write melodies, look for someone strong on rhythm or lyrics — not a second version of yourself.\n\n2. Check the portfolio before the personality. Charm fades; shipped work doesn’t. Review what a potential collaborator has actually finished and released.\n\n3. Align on the goal early. Are you making a demo, a single, or a career? Misaligned ambitions sink more projects than mismatched talent.\n\n4. Do a small paid test. One low-stakes session or deliverable reveals communication style, reliability, and taste — the three things that decide whether a project survives.\n\n5. Put it in writing. Splits, credits, deadlines, and revision counts. Professionals are never offended by clarity.\n\nArtistrySynk was built around these principles: verified portfolios, synergy-based matching, and in-app agreements so you can move from match to masterpiece with confidence.',
  'Amaka Okonkwo',
  'Tips & Tricks',
  '5 min read',
  '2025-01-15T09:00:00Z'
),
(
  'how-artistrysynk-is-transforming-creative-collaboration',
  'How ArtistrySynk is Transforming Creative Collaboration',
  'Discover how producers, artists, and creatives are using our platform to create chart-topping collaborations across the globe.',
  E'The creative industry has always run on who you know. ArtistrySynk is changing that to what you can do.\n\nFor decades, talented artists without industry contacts had no way to reach the producers, directors, and designers who could elevate their work. Discovery was locked behind geography and gatekeepers.\n\nArtistrySynk replaces that with a swipe-first discovery engine. Every creative gets a portfolio, verified credits, and a synergy score that surfaces genuinely compatible partners — whether they are across the street or across the ocean.\n\nThe results speak for themselves: singles produced entirely by matched collaborators, films crewed through the platform, and beauty and sports creatives booking clients they would never have met otherwise.\n\nWhat makes it work is trust infrastructure: verified profiles, messaging gated behind mutual matches, and a credits system that turns completed projects into portable reputation.\n\nThe next wave of creative history will not be written in a handful of big-city studios. It will be written everywhere, by people who finally found each other.',
  'Tunde Adeyemi',
  'Success Stories',
  '8 min read',
  '2025-01-10T09:00:00Z'
),
(
  'the-rise-of-global-creative-collaboration',
  'The Rise of Global Creative Collaboration',
  'Explore how creatives from different countries are breaking barriers and building together.',
  E'Creative collaboration used to require a postcode. Today it requires a login.\n\nCheap distribution, cloud workstations, and platforms like ArtistrySynk have collapsed the distance between a vocalist in Lagos, a producer in London, and a filmmaker in Seoul. The project that once needed a studio block now needs a shared room and a deadline.\n\nThis shift is reshaping sound and style. Genre boundaries blur when a drummer raised on highlife trades stems with a techno producer. Audiences reward the fusion — streaming data shows cross-border collaborations growing every year.\n\nBut remote collaboration has rules. Time zones demand asynchronous habits: clear briefs, recorded feedback, and shared file conventions. The collaborators who thrive treat communication as a craft of its own.\n\nMoney matters too. Agree rates, currency, and payment schedules before work begins, and keep agreements in writing inside the platform.\n\nThe barrier is no longer distance. It is discoverability — and that is exactly the problem swipe-first matching was built to solve.',
  'Kwame Mensah',
  'Industry Insights',
  '6 min read',
  '2025-01-05T09:00:00Z'
),
(
  'building-your-creative-portfolio-a-complete-guide',
  'Building Your Creative Portfolio: A Complete Guide',
  'Essential tips for showcasing your work effectively and attracting the right collaborators on ArtistrySynk.',
  E'Your portfolio is your handshake, your audition, and your résumé in one. Here is how to make it unforgettable.\n\nLead with your best, not your latest. Order matters: the first three pieces decide whether anyone sees the fourth.\n\nShow range within a lane. Versatility is attractive; confusion is not. Pick the role you want to be hired for and demonstrate depth inside it.\n\nContext beats volume. For every piece, add one line: the brief, your role, and the outcome. “Mixed this single — 2M streams” says more than a bare audio embed.\n\nKeep media honest. Use high-quality images and uncompressed audio where possible, and never upload work you cannot discuss in detail — collaborators will ask.\n\nRefresh quarterly. A stale portfolio signals a stalled career. Even swapping one strong new piece in keeps your profile active in discovery.\n\nOn ArtistrySynk, your portfolio feeds the matching engine directly: richer portfolios earn better synergy scores and appear higher in Discover. Ten focused minutes of curation can change who swipes right on you.',
  'Zainab Mohammed',
  'Tips & Tricks',
  '7 min read',
  '2024-12-28T09:00:00Z'
),
(
  'from-match-to-masterpiece-a-filmmakers-journey',
  'From Match to Masterpiece: A Filmmaker’s Journey',
  'How one filmmaker found their cinematographer on ArtistrySynk and created award-winning content together.',
  E'Every filmmaker knows the loneliness of a script nobody can shoot. Mine sat in a drawer for a year — until a swipe changed everything.\n\nI had the story, the locations, and half the budget. What I lacked was a cinematographer who saw light the way I heard dialogue. Local networks came up empty.\n\nOn ArtistrySynk I filtered Discover for cinematographers, studied portfolios, and matched with someone whose reel stopped me cold: the same contrast, the same patience with shadows.\n\nOur first test was a single scene, shot in one afternoon. The chemistry was immediate — we finished each other’s shot lists. Within three months we had completed the short film the script deserved.\n\nThe film went on to screen at festivals neither of us could have entered alone. More importantly, we gained a standing partnership: three projects later, the credits system on our profiles tells that story better than any introduction could.\n\nThe lesson is simple. Your next collaborator is not missing — they are undiscovered. Match, test small, then build something neither of you could have made alone.',
  'David Okafor',
  'Success Stories',
  '10 min read',
  '2024-12-20T09:00:00Z'
),
(
  'the-future-of-creative-work',
  'The Future of Creative Work',
  'Trends, opportunities, and predictions for the creative industry in 2026 and beyond.',
  E'The creative economy is being rebuilt in real time. Here are the forces that will define the next five years.\n\nPortfolios over pedigrees. Clients and collaborators increasingly hire on shipped work, not school names or agency letterheads. Platforms that verify real credits will own this future.\n\nAI as an instrument, not a replacement. Creatives who direct AI tools are shipping faster and charging more; those who compete with them on volume are losing. Taste, direction, and relationships remain stubbornly human.\n\nBorderless teams by default. The typical project team is becoming multi-city and multi-currency. Tools for async communication, transparent agreements, and portable reputation are becoming infrastructure.\n\nReputation becomes portable. Ratings locked inside one marketplace are giving way to verified, portable credit systems that follow the creative across platforms.\n\nNiche is the new mainstream. Audiences fragment into micro-communities, and the winners are specialists — the nail artist, the sports videographer, the genre-fluent producer — who can be found by exactly the people looking for them.\n\nEvery one of these trends rewards the same behavior: build a verifiable body of work and make it easy to discover. That is the future ArtistrySynk is building for.',
  'Chioma Nwankwo',
  'Industry Insights',
  '12 min read',
  '2024-12-15T09:00:00Z'
);