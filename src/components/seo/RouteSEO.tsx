import { Helmet } from "react-helmet-async";
import { useLocation } from "@/lib/router-compat";

/**
 * Route-level crawl management. Any authenticated/private area gets
 * noindex,nofollow regardless of what the page component renders.
 */
const PRIVATE_PREFIXES = [
  "/auth",
  "/login",
  "/signup",
  "/reset-password",
  "/force-password-change",
  "/admin",
  "/master-admin",
  "/super-admin",
  "/dashboard",
  "/settings",
  "/billing",
  "/messages",
  "/notifications",
  "/setup-profile",
  "/edit-profile",
  "/matches",
  "/who-liked-you",
  "/discover",
  "/marketplace",
  "/jobs",
  "/projects",
  "/open-projects",
  "/studio",
  "/teams",
  "/feed",
  "/credits",
  "/explore",
  "/api",
];

/** Exact paths that are private but whose children are public (e.g. /profile/:username). */
const PRIVATE_EXACT = ["/profile"];

export const isPrivatePath = (pathname: string) =>
  PRIVATE_EXACT.includes(pathname) ||
  PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const RouteSEO = () => {
  const { pathname } = useLocation();
  if (!isPrivatePath(pathname)) return null;

  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="googlebot" content="noindex, nofollow" />
    </Helmet>
  );
};
