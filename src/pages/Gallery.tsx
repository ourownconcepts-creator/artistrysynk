import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Music2, Video as VideoIcon, ImageIcon, FileText, LayoutGrid, Flag } from "lucide-react";
import { allRoles, getRoleLabel } from "@/lib/creativeRoles";
import { rankScore, rankSort } from "@/lib/searchRanking";
import { FlagContentDialog } from "@/components/FlagContentDialog";
import {
  BottomSheet,
  Chip,
  EmptyState,
  HScroll,
  Pressable,
  SectionHeader,
  SkeletonTiles,
  Surface,
} from "@/components/native-ui";

type Tile = {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  user_id: string;
  owner_name: string;
  owner_username: string;
  owner_avatar: string | null;
  roles: string[];
  skills: string[];
  is_verified: boolean;
  is_featured: boolean;
  synergy: number;
  works: number;
};

const MEDIA_TYPES = [
  { key: "all", label: "All media" },
  { key: "image", label: "Images" },
  { key: "video", label: "Video" },
  { key: "audio", label: "Audio" },
  { key: "document", label: "Docs" },
];

const REPORTABLE = true;

const mediaIcon = (type: string) =>
  type === "audio" ? Music2 : type === "video" ? VideoIcon : type === "image" ? ImageIcon : FileText;

const Gallery = () => {
  const navigate = useNavigate();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [mediaType, setMediaType] = useState("all");
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [skillFilters, setSkillFilters] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [roleQuery, setRoleQuery] = useState("");
  const [skillQuery, setSkillQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: items } = await supabase
        .from("portfolio_items")
        .select("id, title, description, media_type, media_url, thumbnail_url, user_id, is_hidden")
        .order("created_at", { ascending: false })
        .limit(200);

      const visible = (items ?? []).filter((i) => !i.is_hidden);
      const ownerIds = [...new Set(visible.map((i) => i.user_id))];

      if (!ownerIds.length) {
        setTiles([]);
        setLoading(false);
        return;
      }

      const [{ data: profiles }, { data: roles }, { data: skills }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, is_verified, is_featured, synergy_boost_score")
          .in("id", ownerIds),
        supabase.from("user_creative_roles").select("user_id, role").in("user_id", ownerIds),
        supabase.from("user_skill_tags").select("user_id, skill").in("user_id", ownerIds),
      ]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role as string]);
      });
      const skillMap = new Map<string, string[]>();
      (skills ?? []).forEach((s) => {
        skillMap.set(s.user_id, [...(skillMap.get(s.user_id) ?? []), s.skill]);
      });

      const workCount = new Map<string, number>();
      visible.forEach((i) => workCount.set(i.user_id, (workCount.get(i.user_id) ?? 0) + 1));

      setTiles(
        visible.map((i) => {
          const owner = profileMap.get(i.user_id);
          return {
            id: i.id,
            title: i.title,
            description: i.description,
            media_type: i.media_type,
            media_url: i.media_url,
            thumbnail_url: i.thumbnail_url,
            user_id: i.user_id,
            owner_name: owner?.full_name ?? "Creative",
            owner_username: owner?.username ?? "",
            owner_avatar: owner?.avatar_url ?? null,
            roles: roleMap.get(i.user_id) ?? [],
            skills: skillMap.get(i.user_id) ?? [],
            is_verified: Boolean(owner?.is_verified),
            is_featured: Boolean(owner?.is_featured),
            synergy: owner?.synergy_boost_score ?? 0,
            works: workCount.get(i.user_id) ?? 0,
          };
        }),
      );
      setLoading(false);
    };

    void load();
    void supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const allSkills = useMemo(
    () => [...new Set(tiles.flatMap((t) => t.skills))].sort((a, b) => a.localeCompare(b)),
    [tiles],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = tiles.filter((t) => {
      if (mediaType !== "all" && t.media_type !== mediaType) return false;
      if (roleFilters.length && !roleFilters.some((r) => t.roles.includes(r))) return false;
      if (
        skillFilters.length &&
        !skillFilters.some((s) => t.skills.some((ts) => ts.toLowerCase() === s.toLowerCase()))
      )
        return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        t.owner_name.toLowerCase().includes(q) ||
        t.owner_username.toLowerCase().includes(q) ||
        t.skills.some((s) => s.toLowerCase().includes(q)) ||
        t.roles.some((r) => getRoleLabel(r).toLowerCase().includes(q))
      );
    });

    // Filters decide what shows; ranking only decides the order.
    return rankSort(filtered, (t) =>
      rankScore({
        query,
        roles: t.roles,
        skills: t.skills,
        text: [t.title, t.description, t.owner_name, t.owner_username],
        activeRoles: roleFilters,
        activeSkills: skillFilters,
        popularity: {
          isVerified: t.is_verified,
          isFeatured: t.is_featured,
          synergy: t.synergy,
          works: t.works,
        },
      }),
    );
  }, [tiles, query, mediaType, roleFilters, skillFilters]);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const activeCount = roleFilters.length + skillFilters.length + (mediaType !== "all" ? 1 : 0);

  const roleOptions = useMemo(() => {
    const present = new Set(tiles.flatMap((t) => t.roles));
    const list = allRoles.filter((r) => present.has(r.value));
    const q = roleQuery.trim().toLowerCase();
    return q ? list.filter((r) => r.label.toLowerCase().includes(q)) : list;
  }, [tiles, roleQuery]);

  const skillOptions = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    return (q ? allSkills.filter((s) => s.toLowerCase().includes(q)) : allSkills).slice(0, 40);
  }, [allSkills, skillQuery]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
      <SectionHeader
        title="Portfolio gallery"
        subtitle={`${visible.length} of ${tiles.length} works`}
        className="px-0"
        action={
          <Pressable
            onClick={() => setSheetOpen(true)}
            aria-label="Open gallery filters"
            className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Filters{activeCount ? ` (${activeCount})` : ""}
          </Pressable>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search work, creatives, roles or skills"
          aria-label="Search the portfolio gallery"
          className="rounded-2xl pl-9"
        />
        {query ? (
          <Button
            size="icon"
            variant="ghost"
            aria-label="Clear search"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => setQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <HScroll className="flex gap-2">
        {MEDIA_TYPES.map((m) => (
          <Chip key={m.key} active={mediaType === m.key} onClick={() => setMediaType(m.key)}>
            {m.label}
          </Chip>
        ))}
      </HScroll>

      {(roleFilters.length || skillFilters.length) > 0 ? (
        <div className="flex flex-wrap gap-2">
          {roleFilters.map((r) => (
            <Chip key={r} active onClick={() => setRoleFilters((p) => toggle(p, r))}>
              {getRoleLabel(r)} ×
            </Chip>
          ))}
          {skillFilters.map((s) => (
            <Chip key={s} active onClick={() => setSkillFilters((p) => toggle(p, s))}>
              {s} ×
            </Chip>
          ))}
        </div>
      ) : null}

      {loading ? (
        <SkeletonTiles />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-6 w-6" />}
          title="No work matches these filters"
          description="Try a different role, skill or media type — or clear the search."
          action={
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setQuery("");
                setMediaType("all");
                setRoleFilters([]);
                setSkillFilters([]);
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((tile) => {
            const Icon = mediaIcon(tile.media_type);
            return (
              <Pressable
                key={tile.id}
                lift
                onClick={() => navigate(`/profile/${tile.owner_username || tile.user_id}`)}
                aria-label={`View ${tile.title} by ${tile.owner_name}`}
                className="text-left"
              >
                <Surface level={2} className="overflow-hidden">
                  <div className="relative aspect-square bg-surface-3">
                    {tile.media_type === "image" || tile.thumbnail_url ? (
                      <img
                        src={tile.thumbnail_url ?? tile.media_url}
                        alt={`${tile.title} by ${tile.owner_name}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="grid h-full w-full place-items-center"
                        style={{ backgroundImage: "var(--gradient-primary)" }}
                      >
                        <Icon className="h-8 w-8 text-primary-foreground/80" />
                      </div>
                    )}
                    <Badge variant="secondary" className="absolute left-2 top-2 text-[10px] capitalize">
                      {tile.media_type}
                    </Badge>
                    {REPORTABLE && currentUserId && currentUserId !== tile.user_id ? (
                      <div
                        className="absolute right-1 top-1"
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                      >
                        <FlagContentDialog
                          contentType="portfolio"
                          contentId={tile.id}
                          trigger={
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7 rounded-full bg-background/70 backdrop-blur"
                              aria-label={`Report ${tile.title}`}
                            >
                              <Flag className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="truncate text-sm font-medium">{tile.title}</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={tile.owner_avatar ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {tile.owner_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs text-muted-foreground">
                        {tile.owner_name}
                      </span>
                    </div>
                    {tile.roles.length ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {tile.roles.slice(0, 2).map(getRoleLabel).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </Surface>
              </Pressable>
            );
          })}
        </div>
      )}

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Filter the gallery"
        description="Narrow the gallery by creative role, skill tag and media type."
      >
        <div className="space-y-5 pb-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Media type</p>
            <div className="flex flex-wrap gap-2">
              {MEDIA_TYPES.map((m) => (
                <Chip key={m.key} active={mediaType === m.key} onClick={() => setMediaType(m.key)}>
                  {m.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Roles</p>
            <Input
              value={roleQuery}
              onChange={(e) => setRoleQuery(e.target.value)}
              placeholder="Search roles"
              aria-label="Search roles"
              className="rounded-2xl"
            />
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {roleOptions.length ? (
                roleOptions.map((r) => (
                  <Chip
                    key={r.value}
                    active={roleFilters.includes(r.value)}
                    onClick={() => setRoleFilters((p) => toggle(p, r.value))}
                  >
                    {r.label}
                  </Chip>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No matching roles</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Skill tags</p>
            <Input
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
              placeholder="Search skills"
              aria-label="Search skill tags"
              className="rounded-2xl"
            />
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {skillOptions.length ? (
                skillOptions.map((s) => (
                  <Chip
                    key={s}
                    active={skillFilters.includes(s)}
                    onClick={() => setSkillFilters((p) => toggle(p, s))}
                  >
                    {s}
                  </Chip>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No matching skills</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => {
                setRoleFilters([]);
                setSkillFilters([]);
                setMediaType("all");
              }}
            >
              Reset
            </Button>
            <Button className="flex-1 rounded-full" onClick={() => setSheetOpen(false)}>
              Show {visible.length} works
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default Gallery;
