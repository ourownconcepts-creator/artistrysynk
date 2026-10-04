import type { SeoCopy } from "@/components/seo/SeoCopyBlock";

const common = [
  { to: "/how-it-works", label: "How ArtistrySynk works" },
  { to: "/blog/archive", label: "Read the blog" },
  { to: "/success-stories", label: "Success stories" },
];

export const discoverCopy: SeoCopy = {
  heading: "Discover musicians, producers and creatives to collaborate with",
  intro:
    "Discover is the swipe-first way to find creative collaborators on ArtistrySynk. Every card is a real creative profile — music producers, singers, rappers, songwriters, photographers, videographers, designers, dancers, actors, athletes and more — ranked by how well their skills, genres and location fit yours.",
  sections: [
    { h: "Swipe to match", p: "Swipe right on creatives you'd like to work with. When the interest is mutual you match, unlock messaging and can start planning a project together." },
    { h: "Smart synergy scores", p: "Our matching looks at creative roles, genres such as Afrobeats, hip-hop, R&B and amapiano, skill tags and distance, so the best potential collaborators appear first." },
    { h: "Filter by role and location", p: "Narrow Discover to producers in your city, videographers near a shoot location or remote designers anywhere in the world." },
    { h: "Send proposals and book sessions", p: "Open any profile to send a collaboration proposal with files attached, or check their availability calendar and request a booking." },
  ],
  links: [{ to: "/auth", label: "Join free and start swiping" }, { to: "/music-producers", label: "Find music producers" }, ...common],
};

export const pricingCopy: SeoCopy = {
  heading: "Creative collaboration pricing explained",
  intro:
    "ArtistrySynk is free to join for every creative. Upgrade to Pro or Studio only when you need more reach, visibility and team tools to grow your music, film, design or performance career.",
  sections: [
    { h: "Free plan", p: "Build a full creative profile with portfolio, swipe on Discover, match with collaborators, message your matches and send collaboration proposals — no card required." },
    { h: "Pro for growing creatives", p: "Pro unlocks deeper search, more visibility on Discover, job board access and premium tools for freelancers who want more paid bookings and collaborations." },
    { h: "Studio for teams and labels", p: "Studio is built for studios, agencies, record labels and production companies that manage several members, gear and projects in one place." },
    { h: "Cancel any time", p: "Plans renew monthly and you can return to the free plan whenever you like. Your profile, matches and portfolio stay with you." },
  ],
  links: [{ to: "/features", label: "Compare features" }, ...common],
};

export const successCopy: SeoCopy = {
  heading: "Why creative collaborations succeed on ArtistrySynk",
  intro:
    "Behind every success story is the right partnership. Artists, producers, filmmakers, photographers and dancers use ArtistrySynk to find collaborators who complement their skills and turn ideas into released projects.",
  sections: [
    { h: "Find the right partner fast", p: "Discover surfaces creatives whose roles, genres and goals match yours, so you spend less time searching and more time creating." },
    { h: "Plan the project clearly", p: "Send a proposal with your idea and reference files, agree roles and credits, and book time using each creative's availability calendar." },
    { h: "Build verified credits", p: "Completed collaborations become creator credits on your profile — proof of experience that helps you win the next project." },
    { h: "Grow across borders", p: "Our members collaborate across countries and disciplines, reaching new audiences through features, joint shoots and co-produced releases." },
  ],
  links: [{ to: "/blog/benefits-of-creative-collaboration", label: "The benefits of collaboration" }, ...common],
};

export const legalCopy: Record<string, SeoCopy> = {
  terms: {
    heading: "Understanding the ArtistrySynk Terms of Service",
    intro: "These terms explain how our creative collaboration platform works and what we expect from every member, so musicians, filmmakers, designers and other creatives can work together safely.",
    sections: [
      { h: "Your account", p: "You must give accurate information, keep your password secure and use one personal account. You are responsible for activity on your account." },
      { h: "Your content and IP", p: "You keep ownership of the music, images, videos and files you upload. You give us permission to display them only to run the service." },
      { h: "Respectful collaboration", p: "Harassment, spam, impersonation and copyright infringement are not allowed. Reported content can be hidden and accounts suspended." },
      { h: "Paid plans", p: "Pro and Studio subscriptions renew until cancelled. Collaboration agreements between members are between those members." },
    ],
    links: [{ to: "/privacy", label: "Privacy Policy" }, { to: "/cookies", label: "Cookie Policy" }, { to: "/contact", label: "Contact us" }],
  },
  privacy: {
    heading: "How ArtistrySynk protects your privacy",
    intro: "We collect only what we need to match you with creative collaborators and run your account, and we give you clear controls over your data.",
    sections: [
      { h: "What we collect", p: "Profile details, creative roles, portfolio uploads, messages and basic usage data needed to provide matching, messaging and safety features." },
      { h: "Who can see you", p: "Visibility settings let you choose who can discover your profile and contact you. Identity documents are stored separately and never shown publicly." },
      { h: "Your rights", p: "You can download a copy of your data, correct it or delete your account at any time from Settings or the Privacy Center." },
      { h: "Security", p: "Data is encrypted in transit, access is restricted by role and we keep audit logs of sensitive actions." },
    ],
    links: [{ to: "/privacy-requests", label: "Make a privacy request" }, { to: "/data-deletion", label: "Delete your data" }, { to: "/terms", label: "Terms of Service" }],
  },
  cookies: {
    heading: "Cookies on ArtistrySynk",
    intro: "Cookies and similar storage keep you signed in, remember your preferences and help us understand how creatives use the platform.",
    sections: [
      { h: "Essential cookies", p: "Needed for sign-in, security and core features like Discover and messaging. These cannot be switched off." },
      { h: "Preference cookies", p: "Remember choices such as light or dark theme and language." },
      { h: "Analytics", p: "Help us improve the product with aggregated usage statistics, only with your consent." },
      { h: "Your choices", p: "You can change your cookie consent at any time and clear cookies in your browser settings." },
    ],
    links: [{ to: "/privacy", label: "Privacy Policy" }, { to: "/terms", label: "Terms of Service" }],
  },
};
