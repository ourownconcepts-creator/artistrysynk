import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, Surface } from "@/components/native-ui";
import { toast } from "sonner";
import { Loader2, Search, ShieldCheck, Sparkles, UserSearch } from "lucide-react";
import { allRoles, getRoleLabel } from "@/lib/creativeRoles";
import { OPPORTUNITY_TYPES } from "@/lib/identity";
import { useNavigate } from "@/lib/router-compat";
import { PageSEO } from "@/components/seo";

type Candidate = {
  reference: string;
  user_id: string | null;
  display_label: string;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  roles: string[];
  skills: string[];
  is_verified: boolean | null;
  identity_verified: boolean;
  opportunity_types: string[];
  anonymous: boolean;
  collaborations: number;
};

/**
 * Talent scouting search. Candidates only appear when they opted into
 * opportunities and their scouting audience allows the viewer; anonymous
 * candidates are returned as a reference code with no identifying data.
 */
const Talent = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState("all");
  const [opportunity, setOpportunity] = useState("all");
  const [skill, setSkill] = useState("");
  const [city, setCity] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [results, setResults] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_talent_candidates", {
      _role: role === "all" ? null : role,
      _skill: skill.trim() || null,
      _city: city.trim() || null,
      _verified_only: verifiedOnly,
      _opportunity: opportunity === "all" ? null : opportunity,
      _limit: 24,
      _offset: 0,
    });
    if (error) toast.error("Talent search is unavailable right now.");
    setResults((data ?? []) as Candidate[]);
    setLoading(false);
  }, [role, skill, city, verifiedOnly, opportunity]);

  useEffect(() => {
    const t = setTimeout(() => void search(), 250);
    return () => clearTimeout(t);
  }, [search]);

  const requestIntro = async (reference: string) => {
    setRequesting(reference);
    const { error } = await supabase.rpc("request_introduction", {
      _reference: reference,
      _message: "I would like to discuss an opportunity with you.",
    });
    setRequesting(null);
    if (error) toast.error("Could not send that request.");
    else toast.success("Introduction requested — they'll decide whether to reveal their profile.");
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <PageSEO
        title="Talent scouting — ArtistrySynk"
        description="Search creatives who are open to opportunities, with privacy-preserving candidate profiles."
        noindex
      />
      <header className="mb-6 space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <UserSearch className="h-6 w-6 text-primary" aria-hidden="true" />
          Talent scouting
        </h1>
        <p className="text-sm text-muted-foreground">
          Only creatives who opted into opportunities appear here. Some stay anonymous until they
          accept an introduction.
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Search by discipline, skill, city or opportunity type.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="talent-role">Discipline</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="talent-role" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All disciplines</SelectItem>
                {allRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {getRoleLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="talent-opportunity">Opportunity type</Label>
            <Select value={opportunity} onValueChange={setOpportunity}>
              <SelectTrigger id="talent-opportunity" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any opportunity</SelectItem>
                {OPPORTUNITY_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="talent-skill">Skill</Label>
            <Input
              id="talent-skill"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="e.g. mixing, motion design"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="talent-city">City</Label>
            <Input
              id="talent-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Lagos, London"
            />
          </div>
          <Button
            variant={verifiedOnly ? "default" : "outline"}
            onClick={() => setVerifiedOnly((v) => !v)}
            className="gap-2 sm:col-span-2"
          >
            <ShieldCheck className="h-4 w-4" />
            {verifiedOnly ? "Verified candidates only" : "Include unverified candidates"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching talent…
        </p>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="No candidates match these filters"
          description="Try a broader discipline or remove the city filter."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {results.map((c) => (
            <li key={c.reference}>
              <Surface inset className="h-full space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={c.avatar_url ?? undefined} alt={c.display_label} />
                    <AvatarFallback>{c.anonymous ? "?" : c.display_label.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.display_label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {c.reference}
                      {c.city ? ` · ${c.city}` : ""}
                      {c.country ? `, ${c.country}` : ""}
                    </p>
                  </div>
                  {c.identity_verified || c.is_verified ? (
                    <Badge variant="secondary" className="ml-auto gap-1 text-[10px]">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-1">
                  {c.roles.slice(0, 3).map((r) => (
                    <Badge key={r} variant="secondary" className="text-[10px]">
                      {getRoleLabel(r)}
                    </Badge>
                  ))}
                  {c.skills.slice(0, 3).map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>

                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  {c.collaborations} verified collaboration{c.collaborations === 1 ? "" : "s"}
                  {c.opportunity_types.length
                    ? ` · open to ${c.opportunity_types.map((o) => o.replace(/_/g, " ")).join(", ")}`
                    : ""}
                </p>

                {c.anonymous || !c.user_id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={requesting === c.reference}
                    onClick={() => void requestIntro(c.reference)}
                  >
                    {requesting === c.reference ? "Requesting…" : "Request introduction"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/profile/${c.user_id}`)}
                  >
                    View profile
                  </Button>
                )}
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Talent;