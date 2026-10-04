import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/lib/router-compat";
import { buildPageHead } from "@/lib/seoHead";
import { authEmailClient } from "@/lib/authEmailFlow";
import { emailSchema, passwordSchema, usernameSchema } from "@/lib/authValidation";

export const Route = createFileRoute("/membership")({
  head: () =>
    buildPageHead({
      path: "/membership",
      title: "Become a Member or Creative | ArtistrySynk Membership",
      description:
        "Join ArtistrySynk free as a member to find and hire creatives, or as a creative to show your work, list services and get booked. Sign up in under a minute.",
      keywords: "join creative network, sign up as a creative, creative membership, find collaborators",
    }),
  component: MembershipPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(100),
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

function MembershipPage() {
  const [type, setType] = useState<"member" | "creative">("creative");
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Check the form");
    if (!agree) return void toast.error("Please accept the Terms and Privacy Policy");
    setBusy(true);
    const next = type === "creative" ? "/setup-profile" : "/discover";
    const { error } = await authEmailClient.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName, username: parsed.data.username, account_type: type },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) return void toast.error(error.message);
    setSent(true);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen">
      <main className="container mx-auto grid max-w-6xl gap-12 px-4 py-14 lg:grid-cols-2">
        <section>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Join ArtistrySynk</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            One free account, two ways to use it. Pick the one that fits you today. You can switch any time.
          </p>
          <h2 className="mt-8 text-2xl font-semibold">Join as a member</h2>
          <p className="mt-2 text-muted-foreground">
            For artists, brands, managers and anyone who needs creative talent. Browse profiles in{" "}
            <Link to="/discover" className="text-primary hover:underline">Discover</Link>, compare prices in the{" "}
            <Link to="/collab-hub" className="text-primary hover:underline">Collaboration Hub</Link>, send proposals and book open dates.
          </p>
          <h2 className="mt-8 text-2xl font-semibold">Join as a creative</h2>
          <p className="mt-2 text-muted-foreground">
            For musicians, producers, photographers, designers, athletes and every other creative. Build a portfolio,
            list your services and rates, publish your availability and get booked by people near you and worldwide.
          </p>
          <h2 className="mt-8 text-2xl font-semibold">How sign-up works</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Fill in the form with your name, a username, email and password.</li>
            <li>Open the confirmation email we send you and tap the link.</li>
            <li>Creatives finish their profile; members go straight to Discover.</li>
          </ol>
          <p className="mt-4 text-muted-foreground">
            Joining is free. See <Link to="/pricing" className="text-primary hover:underline">Pricing</Link> for Pro and Studio extras.
          </p>
        </section>

        <section className="rounded-2xl border p-6">
          {sent ? (
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold">Check your email</h2>
              <p className="text-muted-foreground">We sent a confirmation link to {form.email}. Tap it to activate your account.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h2 className="text-2xl font-semibold">Create your account</h2>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
                {(["creative", "member"] as const).map((t) => (
                  <Button key={t} type="button" variant={type === t ? "default" : "outline"} aria-pressed={type === t} onClick={() => setType(t)}>
                    {t === "creative" ? "I'm a creative" : "I'm a member"}
                  </Button>
                ))}
              </div>
              <div><Label htmlFor="m-name">Full name</Label><Input id="m-name" value={form.fullName} onChange={set("fullName")} maxLength={100} /></div>
              <div><Label htmlFor="m-user">Username</Label><Input id="m-user" value={form.username} onChange={set("username")} maxLength={30} /></div>
              <div><Label htmlFor="m-email">Email</Label><Input id="m-email" type="email" value={form.email} onChange={set("email")} maxLength={255} /></div>
              <div>
                <Label htmlFor="m-pass">Password</Label>
                <Input id="m-pass" type="password" value={form.password} onChange={set("password")} />
                <p className="mt-1 text-xs text-muted-foreground">8+ characters with upper and lower case, a number and a symbol.</p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
                <span>I agree to the <Link to="/terms" className="text-primary hover:underline">Terms</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</span>
              </label>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating account…" : "Create free account"}</Button>
              <p className="text-center text-sm text-muted-foreground">
                Already a member? <Link to="/auth" className="text-primary hover:underline">Sign in</Link> · Prefer Google or Apple? <Link to="/auth" className="text-primary hover:underline">Use social sign-in</Link>
              </p>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
