import { Link } from "@tanstack/react-router";

export const COMPETITION_NAV_ITEMS = [
  { label: "Overview", to: "/creative-talent-hunt" as const },
  { label: "Explore Talent", to: "/talent" as const },
];

export function CompetitionNav() {
  return (
    <nav aria-label="Competition navigation" className="flex flex-wrap gap-2">
      {COMPETITION_NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
