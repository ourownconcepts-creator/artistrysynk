import { describe, it, expect } from "vitest";
import { resolveNotificationUrl } from "@/lib/notificationLinks";
import { PROJECT_ROOM_SECTIONS } from "@/hooks/useHashTarget";

const PROJECT = "11111111-1111-1111-1111-111111111111";

describe("smoke: push notification deep links", () => {
  it("opens the invites section of the intended project room", () => {
    expect(
      resolveNotificationUrl({ project_id: PROJECT, invite_id: "inv-1" }, "project_invite"),
    ).toBe(`/projects/${PROJECT}#invites`);
  });

  it("opens the role-approval section for role change events", () => {
    expect(
      resolveNotificationUrl({ project_id: PROJECT, role_change_id: "rc-1" }, "role_change"),
    ).toBe(`/projects/${PROJECT}#role-approvals`);
  });

  it("opens the activity section for room activity and uploads", () => {
    expect(resolveNotificationUrl({ project_id: PROJECT, activity_id: "a-1" }, "room_activity")).toBe(
      `/projects/${PROJECT}#activity`,
    );
    expect(resolveNotificationUrl({ project_id: PROJECT, file_id: "f-1" }, "room_activity")).toBe(
      `/projects/${PROJECT}#activity`,
    );
  });

  it("falls back to the room itself, conversations, profiles and matches", () => {
    expect(resolveNotificationUrl({ project_id: PROJECT }, "project")).toBe(`/projects/${PROJECT}`);
    expect(resolveNotificationUrl({ conversation_id: "c-1" }, "message")).toBe("/messages/c-1");
    expect(resolveNotificationUrl({ liker_id: "u-1" }, "like")).toBe("/profile/u-1");
    expect(resolveNotificationUrl({}, "match")).toBe("/matches");
    expect(resolveNotificationUrl(null)).toBe("/notifications");
  });

  it("honours an explicit in-app url and ignores external ones", () => {
    expect(resolveNotificationUrl({ url: "/notifications?tab=email" })).toBe(
      "/notifications?tab=email",
    );
    expect(resolveNotificationUrl({ url: "https://evil.example/x" })).toBe("/notifications");
  });

  it("only resolves hashes the project room can render", () => {
    for (const section of PROJECT_ROOM_SECTIONS) {
      const url = resolveNotificationUrl({
        project_id: PROJECT,
        ...(section === "invites"
          ? { invite_id: "i" }
          : section === "role-approvals"
            ? { role_change_id: "r" }
            : { activity_id: "a" }),
      });
      expect(url.endsWith(`#${section}`)).toBe(true);
    }
  });
});
