import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createSupabaseMock, routerCompatMock, renderUI } from "@/test/harness";

const supabaseMock = createSupabaseMock({ userId: "me", tables: { portfolio_items: [], matches: [] } });
vi.mock("@/integrations/supabase/client", () => ({ supabase: supabaseMock }));
const router = routerCompatMock();
vi.mock("@/lib/router-compat", () => router.module);

import { DiscoverProfileCard } from "@/components/discover/DiscoverProfileCard";

const profile = {
  id: "them",
  full_name: "Ada Beats",
  username: "adabeats",
  bio: "Producer and beatmaker",
  location: "Lagos",
  avatar_url: "",
  user_creative_roles: [{ role: "producer" }],
  user_genres: [{ genre: "afrobeats" }],
  synergyScore: 88,
};

describe("smoke: discovery swipe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the creative card with synergy signal", async () => {
    renderUI(
      <DiscoverProfileCard
        profile={profile}
        currentUserId="me"
        onSwipe={vi.fn()}
        onRewind={vi.fn()}
        canRewind={false}
        hasLastSwipe={false}
        isTransitioning={false}
      />,
    );
    expect(await screen.findByText("Ada Beats")).toBeInTheDocument();
    expect(screen.getByText(/88/)).toBeInTheDocument();
  });

  it("emits like and pass swipes", async () => {
    const onSwipe = vi.fn();
    renderUI(
      <DiscoverProfileCard
        profile={profile}
        currentUserId="me"
        onSwipe={onSwipe}
        onRewind={vi.fn()}
        canRewind
        hasLastSwipe
        isTransitioning={false}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Like Ada Beats/i }));
    await userEvent.click(screen.getByRole("button", { name: /Pass on Ada Beats/i }));
    await waitFor(() => expect(onSwipe.mock.calls).toEqual([[true], [false]]));
  });

  it("gates rewind until a swipe exists", () => {
    renderUI(
      <DiscoverProfileCard
        profile={profile}
        currentUserId="me"
        onSwipe={vi.fn()}
        onRewind={vi.fn()}
        canRewind={false}
        hasLastSwipe={false}
        isTransitioning={false}
      />,
    );
    expect(screen.getByRole("button", { name: /Undo last swipe/i })).toBeDisabled();
  });
});
