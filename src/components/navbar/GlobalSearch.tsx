import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, FolderOpen, Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

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

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];
    const escaped = searchQuery.replace(/[%,()]/g, " ").trim();
    if (!escaped) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Search users
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .or(`full_name.ilike.%${escaped}%,username.ilike.%${escaped}%`)
      .limit(5);
    if (usersError) console.error("Global search (users) failed:", usersError);

    if (users) {
      users.forEach((user) => {
        searchResults.push({
          id: user.id,
          type: "user",
          title: user.full_name,
          subtitle: `@${user.username}`,
          avatar: user.avatar_url || undefined,
        });
      });
    }

    // Search projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id, title, description")
      .eq("is_public", true)
      .ilike("title", `%${escaped}%`)
      .limit(5);

    if (projects) {
      projects.forEach((project) => {
        searchResults.push({
          id: project.id,
          type: "project",
          title: project.title,
          subtitle: project.description?.slice(0, 50) || "Open Project",
        });
      });
    }

    // Search services
    const { data: services } = await supabase
      .from("services")
      .select("id, title, category")
      .eq("is_active", true)
      .ilike("title", `%${escaped}%`)
      .limit(5);

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

    setResults(searchResults);
    setLoading(false);
  }, []);

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
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search users, projects, services..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {!loading && results.length > 0 && (
            <>
              <CommandGroup heading="Users">
                {results
                  .filter((r) => r.type === "user")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
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
              <CommandGroup heading="Projects">
                {results
                  .filter((r) => r.type === "project")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
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
              <CommandGroup heading="Services">
                {results
                  .filter((r) => r.type === "service")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
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
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
