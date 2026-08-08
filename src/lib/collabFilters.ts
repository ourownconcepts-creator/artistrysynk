export type FeedFilterState = {
  q: string;
  roles: string[];
  location: string;
  skills: string[];
  collabTypes: string[];
};

export const emptyFeedFilters: FeedFilterState = {
  q: "",
  roles: [],
  location: "",
  skills: [],
  collabTypes: [],
};

/** Collaboration types inferred from post copy / hashtags. */
export const COLLAB_TYPES: { key: string; label: string; keywords: string[] }[] = [
  { key: "paid", label: "Paid", keywords: ["paid", "budget", "fee", "rate", "hiring", "commission"] },
  { key: "revenue_share", label: "Revenue share", keywords: ["revenue share", "revshare", "royalt", "split", "profit share"] },
  { key: "equity", label: "Equity", keywords: ["equity", "cofounder", "co-founder", "shares"] },
  { key: "free", label: "Passion project", keywords: ["free", "unpaid", "passion", "for exposure", "portfolio"] },
  { key: "remote", label: "Remote", keywords: ["remote", "online", "anywhere", "worldwide", "virtual"] },
  { key: "onsite", label: "On-site", keywords: ["on-site", "onsite", "studio session", "in person", "in-person", "location"] },
  { key: "long_term", label: "Long-term", keywords: ["long term", "long-term", "ongoing", "full time", "full-time", "residency"] },
  { key: "one_off", label: "One-off", keywords: ["one off", "one-off", "single", "gig", "quick", "session"] },
];

export const collabTypeLabel = (key: string) =>
  COLLAB_TYPES.find((t) => t.key === key)?.label ?? key;

/** Which collaboration types a post looks like, based on its text + hashtags. */
export function inferCollabTypes(content: string, hashtags: string[] = []): string[] {
  const haystack = `${content} ${hashtags.join(" ")}`.toLowerCase();
  return COLLAB_TYPES.filter((t) => t.keywords.some((k) => haystack.includes(k))).map((t) => t.key);
}

export function activeFilterCount(f: FeedFilterState): number {
  return (
    (f.q.trim() ? 1 : 0) +
    f.roles.length +
    (f.location.trim() ? 1 : 0) +
    f.skills.length +
    f.collabTypes.length
  );
}
