/**
 * Shared smoke-test harness: a chainable Supabase mock plus a render helper.
 * Kept deliberately small — it only needs to satisfy the query shapes the
 * smoke-tested flows use.
 */
import { render } from "@testing-library/react";
import { vi } from "vitest";
import type { ReactElement } from "react";

export type TableData = Record<string, unknown[]>;

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

export function createSupabaseMock(options: {
  userId?: string;
  tables?: TableData;
  rpc?: Record<string, unknown>;
}) {
  const inserts: { table: string; values: unknown }[] = [];
  const updates: { table: string; values: unknown }[] = [];
  const deletes: string[] = [];
  const makeBuilder = (table: string) => {
    const rows = () => ((options.tables ?? {})[table] ?? []) as Record<string, unknown>[];
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    const result = () => Promise.resolve({ data: rows(), error: null, count: rows().length });

    for (const key of [
      "select",
      "eq",
      "neq",
      "in",
      "or",
      "not",
      "is",
      "gte",
      "lte",
      "gt",
      "lt",
      "ilike",
      "like",
      "contains",
      "overlaps",
      "order",
      "range",
      "limit",
      "filter",
      "match",
      "returns",
    ]) {
      builder[key] = vi.fn(chain);
    }
    builder["single"] = vi.fn(() => Promise.resolve({ data: rows()[0] ?? null, error: null }));
    builder["maybeSingle"] = vi.fn(() => Promise.resolve({ data: rows()[0] ?? null, error: null }));
    builder["insert"] = vi.fn((values: unknown) => {
      inserts.push({ table, values });
      return builder;
    });
    builder["upsert"] = vi.fn((values: unknown) => {
      inserts.push({ table, values });
      return builder;
    });
    builder["update"] = vi.fn((values: unknown) => {
      updates.push({ table, values });
      return builder;
    });
    builder["delete"] = vi.fn(() => {
      deletes.push(table);
      return builder;
    });
    builder["then"] = (onFulfilled: (value: unknown) => unknown, onRejected?: (r: unknown) => unknown) =>
      result().then(onFulfilled, onRejected);
    return builder;
  };

  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
    track: vi.fn(() => Promise.resolve("ok")),
    unsubscribe: vi.fn(() => Promise.resolve("ok")),
    presenceState: vi.fn(() => ({})),
    send: vi.fn(() => Promise.resolve("ok")),
  };

  const getUser = () =>
    options.userId ? { id: options.userId, email: "smoke@artistrysynk.app" } : null;

  const client = {
    from: vi.fn((table: string) => makeBuilder(table)),
    rpc: vi.fn((name: string) =>
      Promise.resolve({ data: options.rpc?.[name] ?? null, error: null }),
    ),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: getUser() }, error: null })),
      getSession: vi.fn(() => {
        const user = getUser();
        return Promise.resolve({
          data: { session: user ? { user, access_token: "t" } : null },
          error: null,
        });
      }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: getUser() }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: getUser() }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: "p" }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/p" } })),
      })),
    },
    inserts,
    updates,
    deletes,
    channelMock: channel,
  };

  return client;
}

export const routerCompatMock = (params: Record<string, string> = {}) => {
  const navigate = vi.fn();
  return {
    navigate,
    module: {
      useNavigate: () => navigate,
      useParams: () => params,
      useLocation: () => ({ pathname: "/", search: "", hash: window.location.hash, state: null }),
      useSearchParams: () => [new URLSearchParams(window.location.search), vi.fn()],
      Link: ({ children, ...rest }: { children?: unknown; [k: string]: unknown }) => (
        <a {...(rest as object)}>{children as ReactElement}</a>
      ),
      Navigate: () => null,
      Outlet: () => null,
      useNavigationType: () => "PUSH",
    },
  };
};

export function renderUI(ui: ReactElement) {
  return render(ui);
}
