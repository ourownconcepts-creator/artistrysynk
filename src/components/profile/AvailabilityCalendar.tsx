import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CalendarCheck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/lib/router-compat";
import { db, fmtDay, fmtTime, sameDay, type Slot } from "@/lib/collab";

interface Props {
  profileId: string;
  profileName: string;
  currentUserId: string | null;
  isOwner: boolean;
}

export function AvailabilityCalendar({ profileId, profileName, currentUserId, isOwner }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [day, setDay] = useState<Date | undefined>(undefined);
  const [booking, setBooking] = useState<Slot | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("12:00");

  const load = useCallback(async () => {
    const { data } = await db("availability_slots")
      .select("id,user_id,starts_at,ends_at,note")
      .eq("user_id", profileId)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(200);
    setSlots((data ?? []) as Slot[]);
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const daysWithSlots = useMemo(() => slots.map((s) => new Date(s.starts_at)), [slots]);
  const visible = day ? slots.filter((s) => sameDay(new Date(s.starts_at), day)) : slots.slice(0, 6);

  const addSlot = async () => {
    if (!day) return void toast.error("Pick a day first");
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const s = new Date(day); s.setHours(sh ?? 0, sm ?? 0, 0, 0);
    const e = new Date(day); e.setHours(eh ?? 0, em ?? 0, 0, 0);
    if (e <= s) return void toast.error("End time must be after start time");
    if (s < new Date()) return void toast.error("Choose a time in the future");
    setBusy(true);
    const { error } = await db("availability_slots").insert({ user_id: profileId, starts_at: s.toISOString(), ends_at: e.toISOString() });
    setBusy(false);
    if (error) return void toast.error("Couldn't add that slot");
    toast.success("Availability added");
    void load();
  };

  const removeSlot = async (id: string) => {
    const { error } = await db("availability_slots").delete().eq("id", id);
    if (error) return void toast.error("Couldn't remove slot");
    void load();
  };

  const requestBooking = async () => {
    if (!booking || !currentUserId) return;
    setBusy(true);
    const { error } = await db("booking_requests").insert({
      requester_id: currentUserId,
      creative_id: profileId,
      slot_id: booking.id,
      starts_at: booking.starts_at,
      ends_at: booking.ends_at,
      note: note.trim().slice(0, 1000) || null,
    });
    setBusy(false);
    if (error) return void toast.error("Couldn't send booking request");
    toast.success(`Booking request sent to ${profileName}`);
    setBooking(null);
    setNote("");
  };

  return (
    <section aria-labelledby="availability-heading" className="mt-8 rounded-2xl border border-border p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 id="availability-heading" className="text-sm font-bold uppercase tracking-widest">Availability</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <Calendar
          mode="single"
          selected={day}
          onSelect={setDay}
          disabled={{ before: new Date() }}
          modifiers={{ open: daysWithSlots }}
          modifiersClassNames={{ open: "font-bold text-primary underline underline-offset-4" }}
          className="rounded-xl border border-border"
        />
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {day ? `Open times on ${fmtDay(day.toISOString())}` : "Upcoming open times — pick a highlighted day to filter."}
          </p>
          {visible.length === 0 && <p className="text-sm text-muted-foreground">No open times {day ? "on this day" : "yet"}.</p>}
          <ul className="space-y-2">
            {visible.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                <span className="text-sm">
                  <span className="font-semibold">{fmtDay(s.starts_at)}</span> · {fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}
                </span>
                {isOwner ? (
                  <Button size="icon" variant="ghost" aria-label="Remove slot" onClick={() => removeSlot(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : currentUserId ? (
                  <Button size="sm" onClick={() => setBooking(s)}>Book</Button>
                ) : (
                  <Button size="sm" variant="outline" asChild><Link to="/auth">Sign in to book</Link></Button>
                )}
              </li>
            ))}
          </ul>
          {isOwner && (
            <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
              <div><Label htmlFor="slot-start" className="text-xs">From</Label><Input id="slot-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-28" /></div>
              <div><Label htmlFor="slot-end" className="text-xs">To</Label><Input id="slot-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-28" /></div>
              <Button onClick={addSlot} disabled={busy || !day} className="gap-1"><Plus className="h-4 w-4" />Add open time</Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!booking} onOpenChange={(o) => !o && setBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a booking</DialogTitle>
            <DialogDescription>
              {booking && `${fmtDay(booking.starts_at)}, ${fmtTime(booking.starts_at)}–${fmtTime(booking.ends_at)} with ${profileName}. They'll accept or decline.`}
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="booking-note">What's the session for? (optional)</Label>
          <Textarea id="booking-note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBooking(null)}>Cancel</Button>
            <Button onClick={requestBooking} disabled={busy}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
