import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Folder, FolderTree, Package } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface AutocompleteService {
  id: string;
  title: string;
  category: string;
  subcategory?: string | null;
}

type Suggestion =
  | { kind: "category"; label: string }
  | { kind: "subcategory"; label: string; category: string }
  | { kind: "service"; label: string; id: string; category: string; subcategory?: string | null };

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  categories: string[];
  subcategories: { label: string; category_label: string }[];
  services: AutocompleteService[];
  onSelectCategory: (category: string) => void;
  onSelectSubcategory: (category: string, subcategory: string) => void;
  onSelectService: (service: AutocompleteService) => void;
}

const ICONS = {
  category: Folder,
  subcategory: FolderTree,
  service: Package,
} as const;

const LABELS = {
  category: "Category",
  subcategory: "Subcategory",
  service: "Service",
} as const;

export const MarketplaceAutocomplete = ({
  query,
  onQueryChange,
  categories,
  subcategories,
  services,
  onSelectCategory,
  onSelectSubcategory,
  onSelectService,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const match = (s: string) => s.toLowerCase().includes(q);

    const cats: Suggestion[] = categories
      .filter(match)
      .slice(0, 4)
      .map((label) => ({ kind: "category", label }));

    const subs: Suggestion[] = subcategories
      .filter((s) => match(s.label))
      .slice(0, 4)
      .map((s) => ({ kind: "subcategory", label: s.label, category: s.category_label }));

    const svcs: Suggestion[] = services
      .filter((s) => match(s.title))
      .slice(0, 6)
      .map((s) => ({
        kind: "service",
        label: s.title,
        id: s.id,
        category: s.category,
        subcategory: s.subcategory,
      }));

    return [...cats, ...subs, ...svcs];
  }, [query, categories, subcategories, services]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const pick = (s: Suggestion) => {
    setOpen(false);
    if (s.kind === "category") {
      onQueryChange("");
      onSelectCategory(s.label);
    } else if (s.kind === "subcategory") {
      onQueryChange("");
      onSelectSubcategory(s.category, s.label);
    } else {
      onQueryChange(s.label);
      onSelectService({ id: s.id, title: s.label, category: s.category, subcategory: s.subcategory });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      <Input
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search categories and services..."
        className="pl-10"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        aria-label="Search marketplace categories and services"
      />
      {showList && (
        <ul
          role="listbox"
          className="absolute z-50 mt-2 w-full max-h-80 overflow-y-auto rounded-md border bg-popover p-1 shadow-lg"
        >
          {suggestions.map((s, i) => {
            const Icon = ICONS[s.kind];
            return (
              <li key={`${s.kind}-${s.label}-${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm ${
                    i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pick(s)}
                >
                  <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{s.label}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {s.kind === "subcategory" ? `in ${s.category}` : LABELS[s.kind]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
