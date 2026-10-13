import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { isCompetitionAdmin } from "@/features/competitions/judging.service";
import {
  decideRound, getAuditFeed, getCompetitionInfo, getSuspiciousVoters, getVoteTotals, listRounds,
  setRoundVoting, setScoringWeights, setVotingWindow, updatePublicInfo, voidVotes,
  type AuditEntry, type CompetitionInfo, type Round, type SuspiciousVoter, type VoteTotal,
} from "@/features/competitions/operations.service";

export const Route = createFileRoute("/admin_/creative-talent-hunt_/operations")({
  head: () => ({ meta: [{ title: "Talent Hunt Operations — ArtistrySynk Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: OperationsPage,
});

const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong.");
const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function OperationsPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [info, setInfo] = useState<CompetitionInfo | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [totals, setTotals] = useState<VoteTotal[]>([]);
  const [suspicious, setSuspicious] = useState<SuspiciousVoter[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const load = useCallback(async () => {
    const [i, r, t, s, a] = await Promise.all([getCompetitionInfo(), listRounds(), getVoteTotals(), getSuspiciousVoters(), getAuditFeed()]);
    setInfo(i); setRounds(r); setTotals(t); setSuspicious(s); setAudit(a);
  }, []);

  useEffect(() => {
    void isCompetitionAdmin().then(async (ok) => { setAllowed(ok); if (ok) await load(); }).catch((e) => { setAllowed(false); err(e); });
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); await load(); } catch (e) { err(e); }
  };

  if (allowed === null) return <Shell><p className="text-muted-foreground">Checking access…</p></Shell>;
  if (!allowed) return <Shell><p>Access restricted to competition administrators.</p></Shell>;
  if (!info) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-2">
        <VotingWindow info={info} onSave={(s, e, r) => run(() => setVotingWindow(s, e, r), "Voting window saved.")} />
        <Weights info={info} onSave={(j, v) => run(() => setScoringWeights(j, v), "Weights saved.")} />
        <Card title="Round voting">
          {rounds.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
              <span>{r.sequence}. {r.name} <span className="text-muted-foreground">({r.status})</span></span>
              <Switch checked={r.public_voting_enabled} aria-label={`Public voting for ${r.name}`}
                onCheckedChange={(v) => void run(() => setRoundVoting(r.id, v), "Round updated.")} />
            </div>
          ))}
        </Card>
        <PublicInfo info={info} onSave={(p) => run(() => updatePublicInfo(p), "Public information saved.")} />
      </div>

      <Card title="Votes & round decisions" className="mt-6">
        {totals.length === 0 ? <p className="text-sm text-muted-foreground">No approved entries yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="py-2">Contestant</th><th>Round</th><th>Valid</th><th>Voided</th><th>Voters</th><th /></tr></thead>
              <tbody>
                {totals.map((t) => (
                  <tr key={t.application_id} className="border-t">
                    <td className="py-2">{t.display_name} <span className="text-muted-foreground">@{t.handle}</span></td>
                    <td>{t.round_name ?? "—"}</td><td>{t.valid_votes}</td><td>{t.voided_votes}</td><td>{t.distinct_voters}</td>
                    <td className="space-x-1 whitespace-nowrap py-2 text-right">
                      {(["ADVANCED", "HELD", "ELIMINATED"] as const).map((o) => (
                        <Button key={o} size="sm" variant={o === "ELIMINATED" ? "destructive" : "outline"}
                          onClick={() => { if (confirm(`${o} ${t.display_name}?`)) void run(() => decideRound(t.application_id, o), "Decision recorded."); }}>{o.toLowerCase()}</Button>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => { const r = prompt("Reason for voiding this contestant's votes?"); if (r) void run(() => voidVotes(r, { applicationId: t.application_id }), "Votes voided."); }}>void votes</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Suspicious voting activity" className="mt-6">
        {suspicious.length === 0 ? <p className="text-sm text-muted-foreground">No votes recorded yet.</p> : suspicious.map((s) => (
          <div key={s.voter_user_id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
            <span>@{s.username ?? s.voter_user_id.slice(0, 8)} · {s.votes_last_hour} last hour · {s.votes_today} today · {s.distinct_contestants} contestants</span>
            <Button size="sm" variant="ghost" onClick={() => { const r = prompt("Reason for voiding all of this voter's votes?"); if (r) void run(() => voidVotes(r, { voterUserId: s.voter_user_id }), "Votes voided."); }}>void voter</Button>
          </div>
        ))}
      </Card>

      <Card title="Audit trail" className="mt-6">
        {audit.length === 0 ? <p className="text-sm text-muted-foreground">No actions recorded yet.</p> : audit.map((a) => (
          <div key={a.id} className="border-b py-2 text-sm last:border-0">
            <span className="font-semibold">{a.action}</span> · {a.actor_username ? `@${a.actor_username}` : "system"} · <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
          </div>
        ))}
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/admin/creative-talent-hunt" className="text-muted-foreground hover:text-foreground">← Review queue</Link>
            <Link to="/admin/creative-talent-hunt/judging" className="text-muted-foreground hover:text-foreground">Judging →</Link>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Talent Hunt Operations</h1>
          <p className="mt-2 text-muted-foreground">Voting windows, weights, round progression, vote integrity and audit trail.</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </PageTransition>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl border p-6 ${className}`}><h2 className="mb-4 text-lg font-bold">{title}</h2>{children}</section>;
}

function VotingWindow({ info, onSave }: { info: CompetitionInfo; onSave: (s: string | null, e: string | null, r: string) => void }) {
  const [s, setS] = useState(toLocal(info.voting_starts_at));
  const [e, setE] = useState(toLocal(info.voting_ends_at));
  const [r, setR] = useState("");
  return (
    <Card title="Public voting window">
      <label className="block text-sm">Opens (UTC)<Input type="datetime-local" value={s} onChange={(x) => setS(x.target.value)} className="mt-1" /></label>
      <label className="mt-3 block text-sm">Closes (UTC)<Input type="datetime-local" value={e} onChange={(x) => setE(x.target.value)} className="mt-1" /></label>
      <label className="mt-3 block text-sm">Reason<Input value={r} onChange={(x) => setR(x.target.value)} className="mt-1" /></label>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => onSave(s ? new Date(s + "Z").toISOString() : null, e ? new Date(e + "Z").toISOString() : null, r)}>Save window</Button>
        <Button variant="outline" onClick={() => onSave(info.voting_starts_at, new Date().toISOString(), r || "Closed now")}>Close voting now</Button>
      </div>
    </Card>
  );
}

function Weights({ info, onSave }: { info: CompetitionInfo; onSave: (j: number, v: number) => void }) {
  const [j, setJ] = useState(String(info.config.judge_weight ?? 1));
  const [v, setV] = useState(String(info.config.public_vote_weight ?? 0));
  return (
    <Card title="Scoring weights">
      <p className="mb-3 text-sm text-muted-foreground">Final score = (judge score × judge weight + vote score × vote weight) ÷ total weight. Vote score is a contestant's valid votes as a share of the top contestant's, out of 100.</p>
      <label className="block text-sm">Judge weight<Input type="number" min={0} step="0.1" value={j} onChange={(x) => setJ(x.target.value)} className="mt-1" /></label>
      <label className="mt-3 block text-sm">Public vote weight<Input type="number" min={0} step="0.1" value={v} onChange={(x) => setV(x.target.value)} className="mt-1" /></label>
      <Button className="mt-4" onClick={() => onSave(Number(j), Number(v))}>Save weights</Button>
    </Card>
  );
}

function PublicInfo({ info, onSave }: { info: CompetitionInfo; onSave: (p: Parameters<typeof updatePublicInfo>[0]) => void }) {
  const [rules, setRules] = useState((info.config.rules ?? []).join("\n"));
  const [elig, setElig] = useState((info.config.eligibility ?? []).join("\n"));
  const [consent, setConsent] = useState((info.config.consent_requirements ?? []).join("\n"));
  const [prizes, setPrizes] = useState((info.config.prizes ?? []).join("\n"));
  const [judgesPublic, setJudgesPublic] = useState(!!info.config.judges_public);
  return (
    <Card title="Public information (one item per line)">
      {([["Eligibility", elig, setElig], ["Rules", rules, setRules], ["Consent", consent, setConsent], ["Prizes", prizes, setPrizes]] as const).map(([l, val, set]) => (
        <label key={l} className="mb-3 block text-sm">{l}<Textarea value={val} onChange={(x) => set(x.target.value)} className="mt-1" rows={3} /></label>
      ))}
      <label className="flex items-center gap-2 text-sm"><Switch checked={judgesPublic} onCheckedChange={setJudgesPublic} /> Show judging panel publicly</label>
      <Button className="mt-4" onClick={() => onSave({ rules: lines(rules), eligibility: lines(elig), consent_requirements: lines(consent), prizes: lines(prizes), judges_public: judgesPublic })}>Save</Button>
    </Card>
  );
}
