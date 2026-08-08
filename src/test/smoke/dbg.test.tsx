import { describe, it } from "vitest";
import { supabaseMock, setTables } from "@/test/mocks/supabase";
describe("dbg", () => { it("chain", async () => {
  setTables({ conversations: [{ id: "c", matches: { user_id_1: "me" } }] });
  const r = await supabaseMock.from("conversations").select("id, matches(user_id_1)").eq("id","c").single();
  console.log("RESULT", JSON.stringify(r));
}); });
