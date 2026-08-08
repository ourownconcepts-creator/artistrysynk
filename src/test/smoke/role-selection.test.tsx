import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderUI } from "@/test/harness";

vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("@/test/mocks/supabase")).supabaseMock,
}));
vi.mock("@/lib/router-compat", async () => (await import("@/test/mocks/router")).routerCompatModule);

import SetupProfile from "@/pages/SetupProfile";
import { supabaseMock, setUser, setTables } from "@/test/mocks/supabase";
import { getRoleLabel } from "@/lib/creativeRoles";

describe("smoke: role selection", () => {
  beforeEach(() => {
    setUser("me");
    setTables({ profiles: [{ id: "me" }] });
    supabaseMock.inserts.length = 0;
    supabaseMock.updates.length = 0;
    vi.clearAllMocks();
  });

  it("saves selected creative roles and profile details", async () => {
    renderUI(<SetupProfile />);
    const producers = await screen.findAllByText(getRoleLabel("producer"));
    await userEvent.click(producers[0]);

    await userEvent.type(screen.getByPlaceholderText(/Tell the community about yourself/i), "Beatmaker");
    await userEvent.click(screen.getByRole("button", { name: /complete|continue|save|finish/i }));

    await waitFor(() => {
      expect(supabaseMock.updates.some((u) => u.table === "profiles")).toBe(true);
      const roleInsert = supabaseMock.inserts.find((i) => i.table === "user_creative_roles");
      expect(roleInsert).toBeTruthy();
      expect(JSON.stringify(roleInsert?.values)).toContain("producer");
    });
  });

  it("requires at least one role before continuing", async () => {
    renderUI(<SetupProfile />);
    await userEvent.click(
      await screen.findByRole("button", { name: /complete|continue|save|finish/i }),
    );
    await waitFor(() =>
      expect(supabaseMock.inserts.some((i) => i.table === "user_creative_roles")).toBe(false),
    );
  });
});
