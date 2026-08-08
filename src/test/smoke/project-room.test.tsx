import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderUI } from "@/test/harness";

vi.mock("@/integrations/supabase/client", async () => ({
  supabase: (await import("@/test/mocks/supabase")).supabaseMock,
}));
vi.mock("@/lib/router-compat", async () => (await import("@/test/mocks/router")).routerCompatModule);

import CollaborationRoom from "@/pages/CollaborationRoom";
import { supabaseMock, setTables, setUser } from "@/test/mocks/supabase";
import { setParams } from "@/test/mocks/router";
import { PROJECT_ROOM_SECTIONS } from "@/hooks/useHashTarget";

const PROJECT = "proj-1";

function seed() {
  setParams({ projectId: PROJECT });
  setUser("me");
  setTables({
    projects: [
      {
        id: PROJECT,
        title: "Neon Nights Video",
        description: "Music video shoot",
        status: "active",
        created_by: "me",
        role_approval_sla_hours: 48,
        role_approval_fallback: "escalate",
      },
    ],
    project_tasks: [
      { id: "t1", project_id: PROJECT, title: "Storyboard", status: "todo", priority: "high", created_by: "me" },
    ],
    project_members: [{ user_id: "me", role: "creator", profiles: { full_name: "Me", avatar_url: null } }],
    project_invites: [],
    project_role_changes: [],
    project_activity_logs: [],
    project_files: [],
  });
}

describe("smoke: project room collaboration", () => {
  beforeEach(() => {
    window.location.hash = "";
    seed();
    vi.clearAllMocks();
  });

  it("loads the room with tasks, members and realtime sync", async () => {
    renderUI(<CollaborationRoom />);
    expect(await screen.findByText("Neon Nights Video")).toBeInTheDocument();
    expect(await screen.findByText("Storyboard")).toBeInTheDocument();
    expect(supabaseMock.channel).toHaveBeenCalled();
  });

  it("renders every deep-linkable section", async () => {
    renderUI(<CollaborationRoom />);
    await screen.findByText("Neon Nights Video");
    for (const section of PROJECT_ROOM_SECTIONS) {
      await waitFor(() => expect(document.getElementById(section)).toBeTruthy());
    }
  });

  it.each(PROJECT_ROOM_SECTIONS)("opens the %s section from a push deep link", async (section) => {
    const scrollIntoView = vi.spyOn(window.HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});
    window.location.hash = `#${section}`;

    renderUI(<CollaborationRoom />);
    await screen.findByText("Neon Nights Video");

    await waitFor(() =>
      expect(document.getElementById(section)?.getAttribute("data-deeplink-target")).toBe("true"),
    );
    expect(scrollIntoView).toHaveBeenCalled();
    scrollIntoView.mockRestore();
  });
});
