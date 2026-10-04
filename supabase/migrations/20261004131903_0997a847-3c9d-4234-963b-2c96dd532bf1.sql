
CREATE TABLE public.collaboration_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  file_path text,
  file_name text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proposal_not_self CHECK (sender_id <> recipient_id),
  CONSTRAINT proposal_status CHECK (status IN ('pending','accepted','declined')),
  CONSTRAINT proposal_lengths CHECK (char_length(subject) BETWEEN 1 AND 150 AND char_length(message) BETWEEN 1 AND 3000)
);
GRANT SELECT, INSERT, UPDATE ON public.collaboration_proposals TO authenticated;
GRANT ALL ON public.collaboration_proposals TO service_role;
ALTER TABLE public.collaboration_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view proposals" ON public.collaboration_proposals FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Members send proposals" ON public.collaboration_proposals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND status = 'pending' AND NOT EXISTS (
    SELECT 1 FROM public.blocked_users b WHERE (b.blocker_id = recipient_id AND b.blocked_id = sender_id) OR (b.blocker_id = sender_id AND b.blocked_id = recipient_id)));
CREATE POLICY "Recipient responds" ON public.collaboration_proposals FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
CREATE INDEX ON public.collaboration_proposals (recipient_id, created_at DESC);
CREATE INDEX ON public.collaboration_proposals (sender_id, created_at DESC);

CREATE TABLE public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slot_order CHECK (ends_at > starts_at),
  CONSTRAINT slot_note_len CHECK (note IS NULL OR char_length(note) <= 200)
);
GRANT SELECT ON public.availability_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slots TO authenticated;
GRANT ALL ON public.availability_slots TO service_role;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views availability" ON public.availability_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owner manages availability" ON public.availability_slots FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.availability_slots (user_id, starts_at);

CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  creative_id uuid NOT NULL,
  slot_id uuid REFERENCES public.availability_slots(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_not_self CHECK (requester_id <> creative_id),
  CONSTRAINT booking_order CHECK (ends_at > starts_at),
  CONSTRAINT booking_status CHECK (status IN ('pending','accepted','declined','cancelled')),
  CONSTRAINT booking_note_len CHECK (note IS NULL OR char_length(note) <= 1000)
);
GRANT SELECT, INSERT, UPDATE ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view bookings" ON public.booking_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = creative_id);
CREATE POLICY "Members request bookings" ON public.booking_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND status = 'pending' AND NOT EXISTS (
    SELECT 1 FROM public.blocked_users b WHERE (b.blocker_id = creative_id AND b.blocked_id = requester_id) OR (b.blocker_id = requester_id AND b.blocked_id = creative_id)));
CREATE POLICY "Participants update bookings" ON public.booking_requests FOR UPDATE TO authenticated
  USING (auth.uid() = creative_id OR auth.uid() = requester_id)
  WITH CHECK (auth.uid() = creative_id OR (auth.uid() = requester_id AND status = 'cancelled'));
CREATE INDEX ON public.booking_requests (creative_id, starts_at);
CREATE INDEX ON public.booking_requests (requester_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at_generic() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER proposals_touch BEFORE UPDATE ON public.collaboration_proposals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();
CREATE TRIGGER bookings_touch BEFORE UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();

CREATE OR REPLACE FUNCTION public.notify_proposal_booking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF TG_TABLE_NAME = 'collaboration_proposals' THEN
    IF TG_OP = 'INSERT' THEN
      SELECT full_name INTO _name FROM profiles WHERE id = NEW.sender_id;
      INSERT INTO user_notifications(user_id, type, title, message, data)
      VALUES (NEW.recipient_id, 'collab_proposal', 'New collaboration proposal', coalesce(_name,'A member') || ': ' || NEW.subject, jsonb_build_object('proposal_id', NEW.id, 'link', '/proposals'));
    ELSIF NEW.status <> OLD.status THEN
      INSERT INTO user_notifications(user_id, type, title, message, data)
      VALUES (NEW.sender_id, 'collab_proposal', 'Proposal ' || NEW.status, 'Your proposal "' || NEW.subject || '" was ' || NEW.status || '.', jsonb_build_object('proposal_id', NEW.id, 'link', '/proposals'));
    END IF;
  ELSE
    IF TG_OP = 'INSERT' THEN
      SELECT full_name INTO _name FROM profiles WHERE id = NEW.requester_id;
      INSERT INTO user_notifications(user_id, type, title, message, data)
      VALUES (NEW.creative_id, 'booking_request', 'New booking request', coalesce(_name,'A member') || ' wants to book time with you.', jsonb_build_object('booking_id', NEW.id, 'link', '/proposals'));
    ELSIF NEW.status <> OLD.status AND NEW.status IN ('accepted','declined') THEN
      INSERT INTO user_notifications(user_id, type, title, message, data)
      VALUES (NEW.requester_id, 'booking_request', 'Booking ' || NEW.status, 'Your booking request was ' || NEW.status || '.', jsonb_build_object('booking_id', NEW.id, 'link', '/proposals'));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_proposal_booking() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER proposals_notify AFTER INSERT OR UPDATE ON public.collaboration_proposals FOR EACH ROW EXECUTE FUNCTION public.notify_proposal_booking();
CREATE TRIGGER bookings_notify AFTER INSERT OR UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.notify_proposal_booking();

INSERT INTO public.blog_posts (slug, title, excerpt, content, author, category, read_time, published_at) VALUES
('benefits-of-creative-collaboration', 'The Real Benefits of Creative Collaboration',
 'Why the best songs, films, campaigns and shoots are rarely made alone — and how working with other creatives grows your skills, audience and income.',
$c$Some of the most memorable creative work in history was made by teams. A hit record usually has a writer, a producer, a vocalist, an engineer and a designer behind it. A music video needs a director, a cinematographer, a stylist and a dancer. Collaboration is not a shortcut — it is how great work gets made.

Collaboration multiplies skill. When you work with someone who is strong where you are weak, the finished project is better than either of you could make alone. A songwriter with a melody gains from a producer who knows arrangement; a photographer gains from a stylist who understands colour and texture.

Collaboration grows your audience. Every partner brings their own followers, fans and clients. A single feature, joint shoot or co-written track can introduce your work to people who would never have found it on their own. Cross-genre and cross-discipline projects are especially powerful because they reach entirely new communities.

Collaboration speeds up learning. Watching how another creative plans a session, prices a job or handles feedback teaches you things no tutorial will. Many professionals say their biggest leaps came from a single project with someone more experienced.

Collaboration creates income. Shared projects open doors to paid briefs, brand deals, sync licensing and bookings. Teams can pitch for larger jobs than solo creatives, and splitting the workload means you can take on more.

Collaboration builds reputation. Credits matter. Each finished project is proof that you are reliable, easy to work with and able to deliver. On ArtistrySynk, completed collaborations become verified creator credits that future partners can see on your profile.

How to start: be clear about what you bring and what you need, agree on roles, credits and money before you begin, put the plan in writing, and communicate often. Use Discover to find creatives whose skills complement yours, send a collaboration proposal with your idea and any reference files, and check their availability calendar to book a session that suits you both.

The creative world rewards people who build together. Your next breakthrough may be one proposal away.$c$,
 'ArtistrySynk Team', 'Collaboration', '5 min read', now() - interval '4 days'),

('olu-jacobs-a-creative-legend', 'Olu Jacobs: The Life of a Creative Legend',
 'A tribute to Olu Jacobs — the stage and screen actor whose voice, discipline and craft made him one of the most respected artists of his generation.',
$c$Few performers carry a scene the way Olu Jacobs does. With a commanding voice, a calm authority and an eye for detail, he has spent more than five decades showing what it means to treat acting as a craft. For many creatives, he is not just a famous actor — he is proof that talent, training and patience can build a legacy.

Early life and training. Olu Jacobs was born in 1942 in Kano, Nigeria, with family roots in Abeokuta. Drawn to performance from a young age, he travelled to the United Kingdom to study drama formally, training at the Royal Academy of Dramatic Art in London. That classical grounding — voice work, movement, text — shaped the precision audiences still recognise in his performances.

A career across stages and screens. Jacobs worked in British theatre, television and film before returning home, where he became one of the defining faces of Nigerian cinema as Nollywood grew into a global industry. Across hundreds of roles he has played kings, fathers, judges, villains and mentors, often bringing weight and dignity to characters that a lesser actor might have played flat.

A creative partnership. His long marriage and working partnership with actress Joke Silva is one of the industry's most admired. Together they built ventures that support the business of film and performing arts, and championed training for the next generation of actors — a reminder that the best creatives invest in the ecosystem around them.

Why he is a hero to creatives. Olu Jacobs represents the values every artist can learn from: study your craft seriously, respect your collaborators, protect your voice and show up prepared. His career shows that longevity is built on consistency, not trends. Many younger actors, directors and screenwriters describe working opposite him as a masterclass.

Honours and influence. Over the years he has received lifetime achievement recognition and countless tributes from peers. More importantly, his influence lives in the actors, filmmakers and storytellers who learned what excellence looks like by watching him.

Lessons for today's creatives. Train, even after you succeed. Choose collaborators who raise your standard. Build institutions, not just a filmography. And never stop telling stories that matter.

On ArtistrySynk we celebrate legends like Olu Jacobs because they light the path for every actor, director and screenwriter building their own career today.$c$,
 'ArtistrySynk Team', 'Legends', '6 min read', now() - interval '3 days'),

('the-growth-of-afrobeats', 'The Growth of Afrobeats: From Lagos to the World',
 'How Afrobeats grew from West African clubs into one of the most streamed genres on the planet — and what it means for producers, artists and creatives.',
$c$In little more than a decade, Afrobeats has gone from a regional sound to a global force. Its rhythms fill stadiums, chart in the United States and Europe, and soundtrack films, ads and fashion shows around the world.

Roots. Afrobeats draws on a rich musical family: highlife, juju, fuji and the Afrobeat pioneered by Fela Kuti, blended with hip-hop, dancehall, R&B and electronic production. The result is a bright, percussive, dance-friendly sound that travels easily across languages.

The digital breakthrough. Streaming platforms, social video and diaspora communities in London, Toronto, Paris and New York carried the sound far beyond Africa. Viral dance challenges turned songs into worldwide moments, and international artists began seeking out African producers and features.

Global collaboration. Many of the biggest Afrobeats records are collaborations — between artists from different countries, between African producers and international songwriters, and between musicians and visual creators who shape the culture through videos, styling and choreography. Sub-genres such as amapiano and Afro-fusion keep pushing the sound forward.

Opportunities for creatives. The growth of Afrobeats has created demand for far more than singers. Producers, beatmakers, sound engineers, songwriters, dancers, choreographers, directors, stylists, photographers and graphic designers all play a role in a release. Brands want Afrobeats energy in campaigns, and film and TV supervisors are licensing the sound for sync.

How to ride the wave. Learn the rhythms and respect the roots. Collaborate across borders. Invest in quality mixing and visuals. And build a team you trust.

ArtistrySynk was built for exactly this kind of global, cross-discipline collaboration. Filter Discover by the Afrobeats or amapiano genre, find producers, vocalists and dancers who match your style, and send a proposal to start your next record.$c$,
 'ArtistrySynk Team', 'Music', '5 min read', now() - interval '2 days'),

('rap-and-hip-hop-will-return', 'Rap and Hip-Hop Will Return to the Top',
 'Hip-hop has always reinvented itself. Here is why rap is primed for a powerful comeback — and how independent artists and producers can lead it.',
$c$Every few years someone declares that hip-hop has lost its crown. And every time, the culture answers by reinventing itself. Rap began at block parties with DJs, MCs, dancers and graffiti artists working together, and that spirit of collaboration is exactly why it keeps coming back.

Cycles, not decline. Popular music moves in waves. Sounds rise, peak and make room for others, then return refreshed. Hip-hop has survived changes in technology, business models and taste because it adapts quickly and absorbs new influences — from trap and drill to Afro-swing and alternative rap.

What is driving the return. A new generation of independent rappers is building audiences directly through streaming and short video. Producers are mixing hip-hop with Afrobeats, amapiano, electronic and live instrumentation. Storytelling and lyricism are valued again, and fans are hungry for authentic voices.

Hip-hop is a team sport. Behind every great rap record are beatmakers, producers, engineers, DJs, video directors, photographers, stylists and designers. The artists who break through are usually those who assemble the right team early.

How to be part of the comeback. Write honestly and sharpen your craft. Collaborate with producers who push your sound. Release consistently. Invest in strong visuals. Build community, not just followers.

On ArtistrySynk you can find rappers, producers, beatmakers, DJs and video creators who share your vision. Swipe on Discover, send a proposal with your demo attached, and book studio time using their availability calendar. The next era of hip-hop will be built by collaborators — make sure you are one of them.$c$,
 'ArtistrySynk Team', 'Music', '4 min read', now() - interval '1 day'),

('athletes-are-creatives-too', 'Sportsmen and Sportswomen Are Creatives Too',
 'Athletes perform, tell stories and build brands — just like artists. Here is why sports people belong on ArtistrySynk, and how collaboration can grow an athletic career.',
$c$We often separate sport and art, but the line is thinner than it looks. A footballer reading the game, a gymnast composing a routine, a boxer's footwork, a skateboarder inventing a trick — these are creative acts performed under pressure in front of an audience.

Athletes are performers. Like musicians and actors, sports people train for years to deliver moments that move crowds. They manage nerves, express personality and create memories. Many celebrated athletes describe their best performances in the same words artists use: flow, rhythm, expression.

Athletes are storytellers and brands. Today's sports careers live as much online as on the field. Training content, documentaries, podcasts, fashion lines and community projects all require creative skills — and creative partners.

Why collaboration matters for sport. A strong sports brand is built by a team: photographers and videographers who capture training and match days, editors and motion designers who turn footage into stories, stylists and fashion designers for kit and personal style, graphic designers for logos and merchandise, writers and podcasters, and coaches, physios and nutritionists who keep performance high. Musicians and athletes also collaborate on walk-out songs, campaigns and events.

ArtistrySynk welcomes sports and performance creatives. You can choose roles such as athlete, footballer, basketball player, boxer, martial artist, gymnast, track athlete, esports player, personal trainer, fitness coach, choreographer, cheerleader and stunt performer. Build a profile with highlight videos and photos, set your availability for shoots and sessions, and receive collaboration proposals from brands, filmmakers and fellow creatives.

An invitation. If you compete, coach or perform in any sport, your story deserves great creative partners. Join ArtistrySynk free, add your sporting roles, and connect with the photographers, videographers and designers who can help the world see what you do.$c$,
 'ArtistrySynk Team', 'Sports & Performance', '5 min read', now())
ON CONFLICT (slug) DO NOTHING;
