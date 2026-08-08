/**
 * Resolves the in-app destination for a notification payload.
 * Used by native push handling and in-app notification lists so both
 * deep-link to the exact project room, invite or conversation.
 */
export const resolveNotificationUrl = (
  data: Record<string, unknown> | null | undefined,
  type?: string | null,
): string => {
  const str = (key: string) => {
    const v = data?.[key];
    return typeof v === "string" && v.length > 0 ? v : null;
  };

  const explicit = str("url");
  if (explicit && explicit.startsWith("/")) return explicit;

  const projectId = str("project_id");
  if (projectId) {
    if (str("invite_id")) return `/projects/${projectId}#invites`;
    if (str("role_change_id")) return `/projects/${projectId}#role-approvals`;
    if (str("activity_id") || str("file_id")) return `/projects/${projectId}#activity`;
    return `/projects/${projectId}`;
  }

  const conversationId = str("conversation_id");
  if (conversationId) return `/messages/${conversationId}`;

  const profileId = str("profile_id") || str("liker_id") || str("matched_user");
  if (profileId) return `/profile/${profileId}`;

  if (type === "match") return "/matches";
  return "/notifications";
};
