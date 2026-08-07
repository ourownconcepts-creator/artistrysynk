/**
 * Shared source of truth for SEO landing pages (creative disciplines + cities).
 * Used by the routes, the sitemap generator and the prerender step.
 */

export interface DisciplineLanding {
  slug: string;
  /** creative_role enum value used to filter creators */
  role: string;
  title: string;
  heading: string;
  description: string;
  keywords: string;
  intro: string;
}

export const DISCIPLINE_LANDINGS: DisciplineLanding[] = [
  {
    slug: "designers",
    role: "designer",
    title: "Hire Designers & Collaborate with Design Talent",
    heading: "Designers on ArtistrySynk",
    description:
      "Browse designers on ArtistrySynk. See portfolios, skills and locations, then connect and collaborate on your next creative project.",
    keywords: "hire designers, graphic designers, brand designers, creative collaboration, design portfolios",
    intro:
      "Designers on ArtistrySynk work across brand identity, graphics, product and digital design. Browse verified profiles, review portfolio highlights and start a collaboration.",
  },
  {
    slug: "photographers",
    role: "photographer",
    title: "Find Photographers for Shoots & Creative Projects",
    heading: "Photographers on ArtistrySynk",
    description:
      "Discover photographers on ArtistrySynk — portraits, editorial, events and campaign work. View portfolios and collaborate directly.",
    keywords: "hire photographers, portrait photographer, editorial photography, photo shoots, creative network",
    intro:
      "From portrait and editorial to events and campaign photography, these photographers share portfolio highlights and are open to new collaborations.",
  },
  {
    slug: "music-producers",
    role: "producer",
    title: "Find Music Producers to Work On Your Next Record",
    heading: "Music Producers on ArtistrySynk",
    description:
      "Connect with music producers on ArtistrySynk. Browse credits, genres and portfolio highlights, then start a collaboration on your next release.",
    keywords: "music producers, beat makers, record production, studio collaboration, find a producer",
    intro:
      "Producers here cover everything from beat making and full record production to mixing collaborations. Filter by genre, review their work and reach out.",
  },
  {
    slug: "videographers",
    role: "videographer",
    title: "Hire Videographers & Video Creators",
    heading: "Videographers on ArtistrySynk",
    description:
      "Find videographers for music videos, campaigns and documentary work on ArtistrySynk. Review reels and collaborate directly.",
    keywords: "hire videographers, music video director, video production, reels, creative collaboration",
    intro:
      "Videographers on ArtistrySynk shoot music videos, brand campaigns, documentary and short-form content. Browse reels and start a conversation.",
  },
  {
    slug: "dancers",
    role: "dancer",
    title: "Find Dancers & Choreography Collaborators",
    heading: "Dancers on ArtistrySynk",
    description:
      "Browse dancers and choreographers on ArtistrySynk for videos, live shows and campaigns. See performance reels and collaborate.",
    keywords: "hire dancers, choreographers, dance performers, music video dancers, creative talent",
    intro:
      "Dancers and choreographers available for music videos, stage productions, campaigns and creative direction work.",
  },
  {
    slug: "actors",
    role: "actor",
    title: "Find Actors for Film, TV and Campaign Work",
    heading: "Actors on ArtistrySynk",
    description:
      "Discover actors on ArtistrySynk for film, series, short-form and brand work. View showreels and connect directly.",
    keywords: "casting, hire actors, film talent, showreels, screen actors, creative network",
    intro:
      "Actors on ArtistrySynk list showreels, credits and availability for film, series, short-form and commercial work.",
  },
  {
    slug: "software-developers",
    role: "software_developer",
    title: "Hire Software Developers for Creative Products",
    heading: "Software Developers on ArtistrySynk",
    description:
      "Find software developers on ArtistrySynk who build creative products, tools and platforms. Review work and collaborate.",
    keywords: "hire developers, software engineers, technical cofounder, creative technologists, product builders",
    intro:
      "Developers on ArtistrySynk build creative tools, platforms and products — from frontend and mobile to AI and infrastructure work.",
  },
  {
    slug: "creative-directors",
    role: "creative_director",
    title: "Find Creative Directors to Lead Your Vision",
    heading: "Creative Directors on ArtistrySynk",
    description:
      "Connect with creative directors on ArtistrySynk who shape campaigns, visual identity and artist rollouts.",
    keywords: "creative director, art direction, campaign direction, visual identity, brand creative",
    intro:
      "Creative directors here lead campaigns, artist rollouts, visual identity systems and production teams end to end.",
  },
  {
    slug: "graphic-designers",
    role: "graphic_designer",
    title: "Hire Graphic Designers for Covers & Campaigns",
    heading: "Graphic Designers on ArtistrySynk",
    description:
      "Browse graphic designers on ArtistrySynk for cover art, campaign assets and brand systems. View portfolios and collaborate.",
    keywords: "graphic designers, cover art, album artwork, campaign design, visual design",
    intro:
      "Graphic designers covering cover art, album packaging, campaign assets, social kits and full brand systems.",
  },
  {
    slug: "songwriters",
    role: "songwriter",
    title: "Find Songwriters & Topline Collaborators",
    heading: "Songwriters on ArtistrySynk",
    description:
      "Connect with songwriters and topliners on ArtistrySynk. Browse writing credits, genres and collaborate on new records.",
    keywords: "songwriters, toplining, co-writing, lyricists, music collaboration",
    intro:
      "Songwriters and topliners open to co-writes, sessions and catalogue work across genres.",
  },
];

export const getDisciplineBySlug = (slug: string) =>
  DISCIPLINE_LANDINGS.find((d) => d.slug === slug);

export interface CityLanding {
  slug: string;
  city: string;
  country: string;
}

/** Seed cities that always get a landing page. */
export const CITY_LANDINGS: CityLanding[] = [
  { slug: "lagos", city: "Lagos", country: "Nigeria" },
  { slug: "ibadan", city: "Ibadan", country: "Nigeria" },
  { slug: "abuja", city: "Abuja", country: "Nigeria" },
  { slug: "accra", city: "Accra", country: "Ghana" },
  { slug: "nairobi", city: "Nairobi", country: "Kenya" },
  { slug: "johannesburg", city: "Johannesburg", country: "South Africa" },
  { slug: "london", city: "London", country: "United Kingdom" },
  { slug: "new-york", city: "New York", country: "United States" },
  { slug: "atlanta", city: "Atlanta", country: "United States" },
  { slug: "toronto", city: "Toronto", country: "Canada" },
];

export const getCityBySlug = (slug: string) => CITY_LANDINGS.find((c) => c.slug === slug);

export const cityTitle = (c: CityLanding) => `Creatives in ${c.city} — Musicians, Designers & Producers`;
export const cityDescription = (c: CityLanding) =>
  `Find creative professionals in ${c.city}, ${c.country} on ArtistrySynk — musicians, producers, designers, photographers, dancers and more. Browse profiles and collaborate locally.`;
