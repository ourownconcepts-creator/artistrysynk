import { describe, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderUI } from "@/test/harness";
vi.mock("@/integrations/supabase/client", async () => ({ supabase: (await import("@/test/mocks/supabase")).supabaseMock }));
vi.mock("@/lib/router-compat", async () => (await import("@/test/mocks/router")).routerCompatModule);
import Messages from "@/pages/Messages";
import { setTables, setUser, supabaseMock } from "@/test/mocks/supabase";
import { setParams } from "@/test/mocks/router";
describe("dbg", () => { it("dump", async () => {
  setParams({ conversationId: "conv-1" }); setUser("me");
  setTables({ conversations: [{ id: "conv-1", match_id: "m1", matches: { user_id_1: "me", user_id_2: "them" } }], profiles: [{ id: "them", full_name: "Ada Beats", username: "ada", avatar_url: null }], messages: [{ id: "msg-1", conversation_id: "conv-1", sender_id: "them", content: "hello world", read: false, created_at: new Date().toISOString() }] });
  renderUI(<Messages />);
  await new Promise(r => setTimeout(r, 500));
  console.log("BODY:", document.body.textContent?.slice(0, 600));
  console.log("FROM CALLS:", supabaseMock.from.mock.calls.flat());
}); });
