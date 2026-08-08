/** Singleton router-compat mock shared by vi.mock factories and tests. */
import { vi } from "vitest";
import { createElement, type ReactNode } from "react";

export const navigateMock = vi.fn();
export const params: Record<string, string> = {};

export function setParams(next: Record<string, string>) {
  for (const key of Object.keys(params)) delete params[key];
  Object.assign(params, next);
}

export const routerCompatModule = {
  useNavigate: () => navigateMock,
  useParams: () => params,
  useLocation: () => ({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: null,
  }),
  useSearchParams: () => [new URLSearchParams(window.location.search), vi.fn()] as const,
  Link: ({ children, to, ...rest }: { children?: ReactNode; to?: string; [k: string]: unknown }) =>
    createElement("a", { href: to, ...rest }, children),
  Navigate: () => null,
  Outlet: () => null,
  useNavigationType: () => "PUSH",
};
