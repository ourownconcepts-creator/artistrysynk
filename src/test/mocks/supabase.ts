/** Singleton Supabase mock so vi.mock factories and tests share one instance. */
import { createSupabaseMock, type TableData } from "@/test/harness";

export const state: { tables: TableData; userId: string | null; rpc: Record<string, unknown> } = {
  tables: {},
  userId: "me",
  rpc: {},
};

export const supabaseMock = createSupabaseMock({
  get tables() {
    return state.tables;
  },
  get userId() {
    return state.userId ?? undefined;
  },
  get rpc() {
    return state.rpc;
  },
} as never);

export function setTables(tables: TableData) {
  state.tables = tables;
}
export function setUser(userId: string | null) {
  state.userId = userId;
}
