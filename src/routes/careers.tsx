import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Careers from "@/pages/Careers";
const JOBS = [
  { title: "Senior Frontend Developer", description: "Build beautiful, responsive interfaces for creatives using React, TypeScript, and modern web technologies.", remote: true },
  { title: "Product Designer", description: "Shape the user experience for thousands of creatives. Design intuitive interfaces that make collaboration seamless.", remote: true },
  { title: "Community Manager", description: "Engage with our creative community, organize events, and help grow our global presence.", remote: false },
  { title: "Backend Engineer", description: "Build scalable backend systems to support millions of creatives. Work with Node.js, PostgreSQL, and cloud infrastructure.", remote: true },
];

const jobPostingJsonLd = JOBS.map((j) => ({
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: j.title,
  description: `<p>${j.description}</p>`,
  datePosted: "2026-11-02",
  validThrough: "2027-02-01T23:59:59Z",
  employmentType: "FULL_TIME",
  directApply: true,
  url: "https://artistrysynk.app/careers",
  hiringOrganization: { "@type": "Organization", name: "ArtistrySynk", sameAs: "https://artistrysynk.app", logo: "https://artistrysynk.app/favicon.png" },
  jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "Ibadan", addressRegion: "Oyo", addressCountry: "NG" } },
  ...(j.remote ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "Nigeria" } } : {}),
}));

import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

export const Route = createFileRoute("/careers")({
  head: () =>
    buildPageHead({
      path: "/careers",
      title: "Careers - Join Our Team | ArtistrySynk",
      description: "Help us build the future of creative collaboration. Explore open roles in engineering, design and marketing with a remote-first culture.",
      keywords: "ArtistrySynk jobs, creative tech jobs, startup careers, remote jobs",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }]), ...jobPostingJsonLd],
    }),
  component: () => (
    <PageTransition>
      <Careers />
    </PageTransition>
  ),
});