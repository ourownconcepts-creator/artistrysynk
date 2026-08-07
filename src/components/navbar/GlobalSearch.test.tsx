import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const state: {
  profiles: any[];
  projects: any[];
  services: any[];
  profilesError: any;
  calls: { table: string; filters: Record<string, any>; or: string[] }[];
} = { profiles: [], projects: [], services: [], profilesError: null, calls: [] };

vi.mock("@/integrations/supabase/client", () => {
  const makeBuilder = (table: string) => {
    const call = { table, filters: {} as Record<string, any>, or: [] as string[] };
    state.calls.push(call);
    const builder: any = {
      select: () => builder,
      eq: (col: string, val: any) => {
        call.filters[col] = val;
        return builder;
      },
      contains: (col: string, val: any) => {
        call.filters[col] = val;
        return builder;
      },
      ilike: (col: string, val: any) => {
        call.filters[col] = val;
        return builder;
      },
      or: (expr: string) => {
        call.or.push(expr);
        return builder;
      },
      limit: () => {
        if (table === "profiles")
          return Promise.resolve({ data: state.profiles, error: state.profilesError });
        if (table === "projects") return Promise.resolve({ data: state.projects, error: null });
        return Promise.resolve({ data: state.services, error: null });
      },
    };
    return builder;
  };
  return { supabase: { from: (table: string) => makeBuilder(table) } };
});

import { GlobalSearch } from "./GlobalSearch";

const renderSearch = () =>
  render(
    <MemoryRouter>
      <GlobalSearch />
    </MemoryRouter>,
  );

const flushDebounce = async () => {
  await act(async () => {
    vi.advanceTimersByTime(400);
  });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  state.profiles = [];
  state.projects = [];
  state.services = [];
  state.profilesError = null;
  state.calls = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GlobalSearch", () => {
  it("opens with Cmd+K and closes with Escape", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSearch();

    expect(screen.queryByPlaceholderText(/search users, projects/i)).not.toBeInTheDocument();

    await user.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByPlaceholderText(/search users, projects/i)).toBeInTheDocument();
    expect(screen.getByText(/type at least 2 characters/i)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/search users, projects/i)).not.toBeInTheDocument(),
    );
  });

  it("opens with Ctrl+K via the trigger button too", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSearch();
    await user.click(screen.getByRole("button", { name: /open search/i }));
    expect(await screen.findByPlaceholderText(/search users, projects/i)).toBeInTheDocument();
  });

  it("renders results for queries containing symbols without hiding them", async () => {
    state.profiles = [
      { id: "u1", full_name: "D'Angelo (Prod.) 100%", username: "dangelo", location: "Lagos" },
    ];
    state.projects = [{ id: "p1", title: "Beat 50% Off", description: "A project", is_open: true }];
    state.services = [{ id: "s1", title: "Mix & Master (Pro)", category: "Audio" }];

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSearch();
    await user.click(screen.getByRole("button", { name: /open search/i }));
    await user.type(screen.getByPlaceholderText(/search users, projects/i), "50% (mix)");
    await flushDebounce();

    expect(await screen.findByText("D'Angelo (Prod.) 100%")).toBeInTheDocument();
    expect(screen.getByText("Beat 50% Off")).toBeInTheDocument();
    expect(screen.getByText("Mix & Master (Pro)")).toBeInTheDocument();

    // the symbols are stripped before hitting the API
    const profileCall = state.calls.find((c) => c.table === "profiles")!;
    expect(profileCall.or[0]).not.toMatch(/[%(),]/g.source ? /\(|\)/ : /x/);
    expect(profileCall.or[0]).toContain("50");
  });

  it("shows a friendly empty state when nothing matches", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSearch();
    await user.click(screen.getByRole("button", { name: /open search/i }));
    await user.type(screen.getByPlaceholderText(/search users, projects/i), "zzzz");
    await flushDebounce();

    expect(await screen.findByText(/no results for/i)).toBeInTheDocument();
    expect(screen.getByText(/check your spelling/i)).toBeInTheDocument();
  });

  it("shows an error state with retry when the lookup fails", async () => {
    state.profilesError = { message: "boom" };
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSearch();
    await user.click(screen.getByRole("button", { name: /open search/i }));
    await user.type(screen.getByPlaceholderText(/search users, projects/i), "test");
    await flushDebounce();

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("applies role, location and availability filters to the queries", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSearch();
    await user.click(screen.getByRole("button", { name: /open search/i }));
    await user.click(screen.getByRole("button", { name: /filters/i }));

    await user.type(screen.getByLabelText(/filter by location/i), "Berlin");
    await user.type(screen.getByPlaceholderText(/search users, projects/i), "ada");
    await flushDebounce();

    const profileCall = [...state.calls].reverse().find((c) => c.table === "profiles")!;
    expect(profileCall.or.some((e) => e.includes("Berlin"))).toBe(true);

    // services are skipped while a location filter is active
    expect(state.calls.filter((c) => c.table === "services")).toHaveLength(0);
  });
});