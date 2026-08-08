import { Link } from "@/lib/router-compat";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Calendar, User, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/seo";

const POST_URL = "https://artistrysynk.app/blog/how-to-find-a-music-producer";
const PUBLISHED = "2026-07-07";

const HowToFindAMusicProducer = () => {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Find a Music Producer: A Complete Guide for Artists",
    description:
      "Learn how to find the right music producer for your sound. Covers what to look for, red flags to avoid, and how to match with vetted producers on ArtistrySynk.",
    author: { "@type": "Organization", name: "ArtistrySynk" },
    publisher: {
      "@type": "Organization",
      name: "ArtistrySynk",
      logo: { "@type": "ImageObject", url: "https://artistrysynk.app/logo.png" },
    },
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    mainEntityOfPage: POST_URL,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <PageSEO
        title="How to Find a Music Producer: A Complete Guide"
        description="Learn how to find the right music producer for your sound — what to look for, red flags to avoid, and how to match with vetted producers on ArtistrySynk."
        canonicalUrl={POST_URL}
        ogType="article"
        keywords="how to find a music producer, music producer, find producer, hire music producer, beatmaker, music collaboration"
        breadcrumbs={[
          { name: "Home", url: "https://artistrysynk.app" },
          { name: "Blog", url: "https://artistrysynk.app/blog" },
          { name: "How to Find a Music Producer", url: POST_URL },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <article className="container mx-auto max-w-3xl px-4 py-16">
        <Button asChild variant="ghost" size="sm" className="mb-8">
          <Link to="/blog">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to blog
          </Link>
        </Button>

        <header className="mb-10">
          <div className="inline-block bg-gradient-to-r from-primary/10 to-secondary/10 px-3 py-1 rounded-full text-sm font-semibold text-primary mb-4">
            Tips &amp; Tricks
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            How to Find a Music Producer: A Complete Guide for Artists
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><User className="w-4 h-4" /> ArtistrySynk Team</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> July 7, 2026</span>
            <span>9 min read</span>
          </div>
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-foreground">
          <p className="text-xl text-muted-foreground">
            The right music producer can turn a rough voice memo into a chart-ready record.
            The wrong one can drain your budget and leave your project stuck in limbo. This
            guide walks you through exactly how to find a music producer who matches your
            sound, your workflow, and your ambition — and how to use ArtistrySynk to shortcut
            the search.
          </p>

          <h2 className="text-2xl font-bold mt-10">1. Get clear on the sound you actually want</h2>
          <p>
            Before you contact anyone, build a short reference playlist of 5–10 songs that
            capture the sonic direction you're chasing — production style, mix aesthetic,
            tempo range, and vibe. Producers listen in references, not adjectives. "Warm,
            analog, cinematic Afro-R&amp;B" tells a producer far more when it's backed by
            three specific tracks.
          </p>

          <h2 className="text-2xl font-bold mt-10">2. Know which type of producer you need</h2>
          <ul className="space-y-2">
            <li><strong>Beatmaker:</strong> supplies instrumentals, usually leased or exclusive.</li>
            <li><strong>Track producer:</strong> crafts the full arrangement around your vocal.</li>
            <li><strong>Executive producer:</strong> shapes the direction of an entire EP or album.</li>
            <li><strong>Mix-focused producer:</strong> strong on engineering and final polish.</li>
          </ul>
          <p>Matching the role to the project stops you from overpaying — or underspec-ing.</p>

          <h2 className="text-2xl font-bold mt-10">3. Criteria for choosing a producer</h2>
          <p>Judge every candidate against the same short list:</p>
          <ul className="space-y-3">
            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" /><span><strong>Discography fit.</strong> Have they made records in your genre that you'd genuinely play?</span></li>
            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" /><span><strong>Credits you can verify.</strong> Streaming links, splits, and named collaborators beat vague claims.</span></li>
            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" /><span><strong>Communication cadence.</strong> Do they reply clearly within a reasonable window?</span></li>
            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" /><span><strong>Splits &amp; contracts.</strong> They should offer a written producer agreement, not a handshake.</span></li>
            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" /><span><strong>Session workflow.</strong> Remote stems, in-studio, or hybrid — make sure it fits your reality.</span></li>
          </ul>

          <h2 className="text-2xl font-bold mt-10">4. Red flags to walk away from</h2>
          <ul className="space-y-2">
            <li>No public catalog or portfolio of finished work.</li>
            <li>Refuses to sign a split sheet before the session.</li>
            <li>Full payment demanded upfront with no deliverable milestones.</li>
            <li>Pushback when you ask for stems or project files after payment.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10">5. How to find a music producer on ArtistrySynk</h2>
          <p>
            ArtistrySynk was built to remove the guesswork. Every producer profile shows
            verified credits, genres, portfolio audio, and mutual-match messaging — so you
            never cold-DM into a void.
          </p>
          <ol className="space-y-3 list-decimal pl-6">
            <li><strong>Filter by role &amp; genre.</strong> On the Discover feed, set the role filter to <em>Producer</em> or <em>Beatmaker</em> and pick your genre.</li>
            <li><strong>Use AI Synergy Scoring.</strong> Pro and Studio members get a match score that ranks producers by how well their history aligns with your goals.</li>
            <li><strong>Check the portfolio tab.</strong> Every profile has playable tracks and pinned credits — listen before you swipe.</li>
            <li><strong>Look for the verified badge.</strong> Verified producers have had their identity and credits reviewed.</li>
            <li><strong>Match, then open a Project Room.</strong> Once matched, invite them into a private room with file sharing, briefs, and collab agreements.</li>
          </ol>

          <h2 className="text-2xl font-bold mt-10">6. What to send in your first message</h2>
          <p>Keep it short, specific, and respectful of their time:</p>
          <Card className="bg-card/50 border-primary/20 my-4">
            <CardContent className="pt-6 italic text-muted-foreground">
              "Hey — loved the drums on [track]. I'm working on a 4-track EP in a similar
              lane and I've got demos ready. Budget is X, timeline is Y. Open to a paid test
              track first?"
            </CardContent>
          </Card>

          <h2 className="text-2xl font-bold mt-10">Start finding your producer</h2>
          <p>
            The best time to lock in your producer is before you're desperate for one.
            Browse verified producers, listen to their catalogs, and match with the ones
            whose sound already lives in your reference playlist.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button asChild variant="hero" size="lg">
              <Link to="/auth">Find a producer on ArtistrySynk</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/how-it-works">See how matching works</Link>
            </Button>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default HowToFindAMusicProducer;