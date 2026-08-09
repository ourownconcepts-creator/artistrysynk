import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { fetchOptedOutIds } from "@/lib/discoverability";
import {
  Search,
  User,
  FolderOpen,
  Store,
  Loader2,
  SlidersHorizontal,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allRoles, getRoleLabel } from "@/lib/creativeRoles";
import { rankScore, rankSort } from "@/lib/searchRanking";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SearchResult {
  id: string;
  type: "user" | "project" | "service";
  title: string;
  subtitle?: string;
  avatar?: string;
}

type Availability = "all" | "open" | "closed";

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [availability, setAvailability] = useState<Availability>("all");

  const activeFilterCount = useMemo(
    () =>
      (roleFilter !== "all" ? 1 : 0) +
      (locationFilter.trim() ? 1 : 0) +
      (availability !== "all" ? 1 : 0),
    [roleFilter, locationFilter, availability],
  );

  const clearFilters = () => {
    setRoleFilter("all");
    setLocationFilter("");
    setAvailability("all");
  };

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const search = useCallback(
    async (searchQuery: string) => {
      // Strip PostgREST-hostile characters so symbol queries still work
      const escaped = searchQuery.replace(/[%,()*\\]/g, " ").trim();
      const location = locationFilter.replace(/[%,()*\\]/g, " ").trim();

      if (escaped.length < 2) {
        setResults([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const searchResults: SearchResult[] = [];
      let failed = false;

      // Search users
      let usersQuery = supabase
        .from("profiles")
        .select(
          roleFilter !== "all"
            ? "id, full_name, username, avatar_url, location, is_verified, is_featured, synergy_boost_score, user_creative_roles!inner(role)"
            : "id, full_name, username, avatar_url, location, is_verified, is_featured, synergy_boost_score",
        )
        .or(`full_name.ilike.%${escaped}%,username.ilike.%${escaped}%`);

      if (roleFilter !== "all") {
        usersQuery = usersQuery.eq("user_creative_roles.role", roleFilter as never);
      }
      if (location) {
        usersQuery = usersQuery.or(
          `location.ilike.%${location}%,city.ilike.%${location}%,country.ilike.%${location}%`,
        );
      }

      // Respect the "don't show me in search" privacy preference.
      const searchOptOuts = await fetchOptedOutIds("search");
      if (searchOptOuts.length > 0) {
        usersQuery = usersQuery.not("id", "in", `(${searchOptOuts.join(",")})`);
      }

      // Fetch a wider slate than we show so ranking can pick the best 5.
      const { data: users, error: usersError } = await usersQuery.limit(20);
      if (usersError) {
        failed = true;
        console.error("Global search (users) failed:", usersError);
      }

      if (users) {
        // Filters already ran server-side; ranking only reorders the matches.
        const rankedUsers = rankSort(users as any[], (user) =>
          rankScore({
            query: escaped,
            roles: (user.user_creative_roles ?? []).map((r: any) => r.role),
            text: [user.full_name, user.username, user.location],
            activeRoles: roleFilter !== "all" ? [roleFilter] : [],
            popularity: {
              isVerified: user.is_verified,
              isFeatured: user.is_featured,
              synergy: user.synergy_boost_score,
            },
          }),
        ).slice(0, 5);

        rankedUsers.forEach((user) => {
          searchResults.push({
            id: user.id,
            type: "user",
            title: user.full_name,
            subtitle: user.location
              ? `@${user.username} · ${user.location}`
              : `@${user.username}`,
            avatar: user.avatar_url || undefined,
          });
        });
      }

      // Search projects
      let projectsQuery = supabase
        .from("projects")
        .select("id, title, description, is_open")
        .eq("is_public", true)
        .ilike("title", `%${escaped}%`);

      if (availability !== "all") {
        projectsQuery = projectsQuery.eq("is_open", availability === "open");
      }
      if (roleFilter !== "all") {
        projectsQuery = projectsQuery.contains("looking_for", [roleFilter]);
      }

      const { data: projects, error: projectsError } = await projectsQuery.limit(5);
      if (projectsError) {
        failed = true;
        console.error("Global search (projects) failed:", projectsError);
      }

      if (projects) {
        (projects as any[]).forEach((project) => {
          searchResults.push({
            id: project.id,
            type: "project",
            title: project.title,
            subtitle: project.description?.slice(0, 50) || "Open Project",
          });
        });
      }

      // Search services (skipped when creative-role or location filters are active)
      if (roleFilter === "all" && !location) {
        const { data: services, error: servicesError } = await supabase
          .from("services")
          .select("id, title, category")
          .eq("is_active", true)
          .ilike("title", `%${escaped}%`)
          .limit(5);

        if (servicesError) {
          failed = true;
          console.error("Global search (services) failed:", servicesError);
        }

        if (services) {
          services.forEach((service) => {
            searchResults.push({
              id: service.id,
              type: "service",
              title: service.title,
              subtitle: service.category,
            });
          });
        }
      }

      if (failed && searchResults.length === 0) {
        setError("Something went wrong while searching. Please try again.");
      }
      setResults(searchResults);
      setLoading(false);
    },
    [roleFilter, locationFilter, availability],
  );

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    switch (result.type) {
      case "user":
        navigate(`/profile/${result.id}`);
        break;
      case "project":
        navigate(`/projects/${result.id}`);
        break;
      case "service":
        navigate(`/marketplace`);
        break;
    }
  };

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "user":
        return <User className="w-4 h-4" />;
      case "project":
        return <FolderOpen className="w-4 h-4" />;
      case "service":
        return <Store className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
        aria-label="Open search"
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded-sm border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search users, projects, services..."
          value={query}
          onValueChange={setQuery}
        />
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={showFilters}
            aria-controls="search-filters"
            onClick={() => setShowFilters((s) => !s)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
        {showFilters && (
          <div id="search-filters" className="grid gap-3 border-b p-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="search-role" className="text-xs">
                Role
              </Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="search-role" aria-label="Filter by role">
                  <SelectValue placeholder="Any role" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">Any role</SelectItem>
                  {allRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {getRoleLabel(role.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="search-location" className="text-xs">
                Location
              </Label>
              <Input
                id="search-location"
                aria-label="Filter by location"
                placeholder="City or country"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="search-availability" className="text-xs">
                Project availability
              </Label>
              <Select
                value={availability}
                onValueChange={(v) => setAvailability(v as Availability)}
              >
                <SelectTrigger id="search-availability" aria-label="Filter by project availability">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="open">Open to collaborators</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <CommandList>
          {loading && (
            <div
              className="flex flex-col items-center justify-center gap-2 py-8"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Searching…</p>
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center gap-2 py-8 text-center" role="alert">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm font-medium">{error}</p>
              <Button size="sm" variant="outline" onClick={() => search(query)}>
                Try again
              </Button>
            </div>
          )}
          {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>
              <div className="flex flex-col items-center gap-1 py-6 text-center">
                <Search className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">No results for “{query.trim()}”</p>
                <p className="text-xs text-muted-foreground">
                  {activeFilterCount > 0
                    ? "Try clearing your filters or searching a different term."
                    : "Check your spelling or try a shorter term."}
                </p>
                {activeFilterCount > 0 && (
                  <Button size="sm" variant="outline" className="mt-2" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </CommandEmpty>
          )}
          {!loading && !error && query.trim().length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search.
            </div>
          )}
          {!loading && !error && results.length > 0 && (
            <>
              {results.some((r) => r.type === "user") && (
              <CommandGroup heading="Users">
                {results
                  .filter((r) => r.type === "user")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      value={`user-${result.id}`}
                      onSelect={() => handleSelect(result)}
                      className="cursor-pointer"
                    >
                      <Avatar className="w-6 h-6 mr-2">
                        <AvatarImage src={result.avatar} />
                        <AvatarFallback>{result.title.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
              )}
              {results.some((r) => r.type === "project") && (
              <CommandGroup heading="Projects">
                {results
                  .filter((r) => r.type === "project")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      value={`project-${result.id}`}
                      onSelect={() => handleSelect(result)}
                      className="cursor-pointer"
                    >
                      {getIcon(result.type)}
                      <div className="ml-2">
                        <p className="font-medium">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
              )}
              {results.some((r) => r.type === "service") && (
              <CommandGroup heading="Services">
                {results
                  .filter((r) => r.type === "service")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      value={`service-${result.id}`}
                      onSelect={() => handleSelect(result)}
                      className="cursor-pointer"
                    >
                      {getIcon(result.type)}
                      <div className="ml-2">
                        <p className="font-medium">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
