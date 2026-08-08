import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SlidersHorizontal, Search, X, Bookmark, Trash2, Plus, MapPin } from "lucide-react";
import { BottomSheet, Chip, HScroll, Pressable } from "@/components/native-ui";
import { allRoles, getRoleLabel } from "@/lib/creativeRoles";
import {
  COLLAB_TYPES,
  activeFilterCount,
  emptyFeedFilters,
  type FeedFilterState,
} from "@/lib/collabFilters";

type Preset = { id: string; name: string; filters: FeedFilterState };

const SCOPE = "collab_feed";

export function FeedFilters({
  value,
  onChange,
  resultCount,
  userId,
}: {
  value: FeedFilterState;
  onChange: (next: FeedFilterState) => void;
  resultCount: number;
  userId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FeedFilterState>(value);
  const [roleQuery, setRoleQuery] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState("");

  const count = activeFilterCount(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const loadPresets = async (uid: string) => {
    const { data } = await supabase
      .from("saved_filter_presets")
      .select("id, name, filters")
      .eq("user_id", uid)
      .eq("scope", SCOPE)
      .order("created_at", { ascending: true });
    setPresets(
      (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        filters: { ...emptyFeedFilters, ...((p.filters ?? {}) as Partial<FeedFilterState>) },
      })),
    );
  };

  useEffect(() => {
    if (userId) void loadPresets(userId);
  }, [userId]);

  const roleResults = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    const list = q ? allRoles.filter((r) => r.label.toLowerCase().includes(q)) : allRoles;
    return list.slice(0, q ? 40 : 24);
  }, [roleQuery]);

  const toggle = (key: "roles" | "collabTypes" | "skills", item: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(item) ? d[key].filter((v) => v !== item) : [...d[key], item],
    }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (!draft.skills.some((x) => x.toLowerCase() === s.toLowerCase())) {
      setDraft((d) => ({ ...d, skills: [...d.skills, s] }));
    }
    setSkillInput("");
  };

  const savePreset = async () => {
    if (!userId) return;
    const name = presetName.trim();
    if (!name) {
      toast.error("Give the preset a name");
      return;
    }
    const { error } = await supabase
      .from("saved_filter_presets")
      .upsert(
        { user_id: userId, scope: SCOPE, name, filters: draft as never },
        { onConflict: "user_id,scope,name" },
      );
    if (error) {
      toast.error("Could not save preset");
      return;
    }
    toast.success(`Saved "${name}"`);
    setPresetName("");
    void loadPresets(userId);
  };

  const deletePreset = async (id: string) => {
    await supabase.from("saved_filter_presets").delete().eq("id", id);
    setPresets((p) => p.filter((x) => x.id !== id));
  };

  const applyPreset = (p: Preset) => {
    setDraft(p.filters);
    onChange(p.filters);
    setOpen(false);
    toast.success(`Applied "${p.name}"`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.q}
            onChange={(e) => onChange({ ...value, q: e.target.value })}
            placeholder="Search posts, roles, #tags"
            aria-label="Search the collaboration feed"
            className="rounded-full pl-9"
          />
        </div>
        <Pressable
          onClick={() => setOpen(true)}
          aria-label="Open filters"
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-foreground"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {count > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          ) : null}
        </Pressable>
      </div>

      <HScroll className="flex gap-2">
        {presets.map((p) => (
          <Chip key={p.id} icon={<Bookmark className="h-3.5 w-3.5" />} onClick={() => applyPreset(p)}>
            {p.name}
          </Chip>
        ))}
        {COLLAB_TYPES.slice(0, 5).map((t) => (
          <Chip
            key={t.key}
            active={value.collabTypes.includes(t.key)}
            onClick={() =>
              onChange({
                ...value,
                collabTypes: value.collabTypes.includes(t.key)
                  ? value.collabTypes.filter((k) => k !== t.key)
                  : [...value.collabTypes, t.key],
              })
            }
          >
            {t.label}
          </Chip>
        ))}
      </HScroll>

      {count > 0 ? (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>
            {resultCount} result{resultCount === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => onChange(emptyFeedFilters)}
            className="font-semibold text-primary"
          >
            Clear all
          </button>
        </div>
      ) : null}

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Filter the feed"
        description="Narrow by role, location, skills and collaboration type."
      >
        <div className="space-y-5 pb-4">
          {presets.length ? (
            <div className="space-y-2">
              <Label>Saved presets</Label>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <span key={p.id} className="flex items-center gap-1 rounded-full bg-surface-2 pl-1">
                    <Chip onClick={() => applyPreset(p)} icon={<Bookmark className="h-3.5 w-3.5" />}>
                      {p.name}
                    </Chip>
                    <button
                      type="button"
                      aria-label={`Delete preset ${p.name}`}
                      onClick={() => void deletePreset(p.id)}
                      className="pr-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Keywords</Label>
            <Input
              value={draft.q}
              onChange={(e) => setDraft({ ...draft, q: e.target.value })}
              placeholder="e.g. Afro-fusion vocalist"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="City or country"
                className="rounded-2xl pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="e.g. mixing, Ableton, React"
                className="rounded-2xl"
              />
              <Button type="button" variant="outline" onClick={addSkill} className="rounded-2xl">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {draft.skills.length ? (
              <div className="flex flex-wrap gap-1.5">
                {draft.skills.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => toggle("skills", s)}
                  >
                    {s}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Collaboration type</Label>
            <div className="flex flex-wrap gap-2">
              {COLLAB_TYPES.map((t) => (
                <Chip
                  key={t.key}
                  active={draft.collabTypes.includes(t.key)}
                  onClick={() => toggle("collabTypes", t.key)}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={roleQuery}
                onChange={(e) => setRoleQuery(e.target.value)}
                placeholder="Search roles"
                className="rounded-2xl pl-9"
              />
            </div>
            {draft.roles.length ? (
              <div className="flex flex-wrap gap-1.5">
                {draft.roles.map((r) => (
                  <Badge
                    key={r}
                    className="cursor-pointer gap-1"
                    onClick={() => toggle("roles", r)}
                  >
                    {getRoleLabel(r)}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="app-scroll flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-2xl bg-surface-2 p-2">
              {roleResults.map((r) => (
                <Badge
                  key={r.value}
                  variant={draft.roles.includes(r.value) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => toggle("roles", r.value)}
                >
                  {r.label}
                </Badge>
              ))}
              {roleResults.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">No roles match "{roleQuery}"</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl bg-surface-2 p-3">
            <Label>Save this as a preset</Label>
            <div className="flex gap-2">
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name"
                className="rounded-2xl bg-surface-1"
              />
              <Button type="button" variant="outline" onClick={savePreset} className="rounded-2xl">
                <Bookmark className="mr-1.5 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => {
                setDraft(emptyFeedFilters);
                onChange(emptyFeedFilters);
                setOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              className="flex-1 rounded-full"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              Apply filters
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
