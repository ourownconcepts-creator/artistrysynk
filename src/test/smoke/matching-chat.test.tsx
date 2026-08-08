import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderUI } from "@/test/harness";

vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("@/test/mocks/supabase")).supabaseMock,
}));
vi.mock("@/lib/router-compat", async () => (await import("@/test/mocks/router")).routerCompatModule);

import Messages from "@/pages/Messages";
import { supabaseMock, setTables, setUser } from "@/test/mocks/supabase";
import { setParams } from "@/test/mocks/router";

const CONVO = "conv-1";

describe("smoke: matched conversation chat", () => {
  beforeEach(() => {
    setParams({ conversationId: CONVO });
    setUser("me");
    setTables({
      conversations: [{ id: CONVO, match_id: "m1", matches: { user_id_1: "me", user_id_2: "them" } }],
      profiles: [{ id: "them", full_name: "Ada Beats", username: "adabeats", avatar_url: null }],
      messages: [
        {
          id: "msg-1",
          conversation_id: CONVO,
          sender_id: "them",
          content: "Let's collaborate on a track",
          read: false,
          created_at: new Date().toISOString(),
        },
      ],
    });
    supabaseMock.inserts.length = 0;
    supabaseMock.updates.length = 0;
    vi.clearAllMocks();
  });

  it("loads the matched thread history and subscribes to realtime updates", async () => {
    renderUI(<Messages />);
    expect(await screen.findByText("Let's collaborate on a track")).toBeInTheDocument();
    expect(await screen.findByText(/Ada Beats/)).toBeInTheDocument();
    expect(supabaseMock.channel).toHaveBeenCalled();
  });

  it("marks incoming messages as read", async () => {
    renderUI(<Messages />);
    await screen.findByText("Let's collaborate on a track");
    await waitFor(() =>
      expect(
        supabaseMock.updates.some(
          (u) => u.table === "messages" && JSON.stringify(u.values).includes("read"),
        ),
      ).toBe(true),
    );
  });

  it("sends a new message into the conversation", async () => {
    renderUI(<Messages />);
    const input = await screen.findByPlaceholderText("Message...");
    await userEvent.type(input, "On it!{Enter}");
    await waitFor(() => {
      const insert = supabaseMock.inserts.find((i) => i.table === "messages");
      expect(JSON.stringify(insert?.values)).toContain("On it!");
      expect(JSON.stringify(insert?.values)).toContain(CONVO);
    });
  });
});
