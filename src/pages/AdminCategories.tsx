import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, FolderTree, Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { useServiceTaxonomy } from "@/hooks/useServiceTaxonomy";
import { PageSEO } from "@/components/seo";

const AdminCategories = () => {
  const { categories, subcategories, loading, reload } = useServiceTaxonomy(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [editing, setEditing] = useState<{ table: "cat" | "sub"; id: string; value: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const activeCategory = selected ?? categories[0]?.label ?? null;
  const childSubcategories = useMemo(
    () => subcategories.filter((s) => s.category_label === activeCategory),
    [subcategories, activeCategory]
  );

  const run = async (fn: () => Promise<{ error: any }>, successMessage: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      toast.error(error.message || "Action failed");
      return false;
    }
    toast.success(successMessage);
    await reload();
    return true;
  };

  const addCategory = async () => {
    const label = newCategory.trim();
    if (!label) return;
    const ok = await run(
      () =>
        supabase.from("service_categories").insert({
          label,
          sort_order: (categories.at(-1)?.sort_order ?? 0) + 1,
        }),
      "Category added"
    );
    if (ok) setNewCategory("");
  };

  const addSubcategory = async () => {
    const label = newSubcategory.trim();
    if (!label || !activeCategory) return;
    const ok = await run(
      () =>
        supabase.from("service_subcategories").insert({
          category_label: activeCategory,
          label,
          sort_order: (childSubcategories.at(-1)?.sort_order ?? 0) + 1,
        }),
      "Subcategory added"
    );
    if (ok) setNewSubcategory("");
  };

  const rename = async () => {
    if (!editing) return;
    const label = editing.value.trim();
    if (!label) return;
    const table = editing.table === "cat" ? "service_categories" : "service_subcategories";
    const ok = await run(
      () => supabase.from(table).update({ label }).eq("id", editing.id),
      "Renamed"
    );
    if (ok) {
      if (editing.table === "cat" && selected) setSelected(label);
      setEditing(null);
    }
  };

  const toggleActive = (table: "cat" | "sub", id: string, is_active: boolean) =>
    run(
      () =>
        supabase
          .from(table === "cat" ? "service_categories" : "service_subcategories")
          .update({ is_active })
          .eq("id", id),
      is_active ? "Enabled" : "Hidden from the marketplace"
    );

  const remove = (table: "cat" | "sub", id: string) =>
    run(
      () =>
        supabase
          .from(table === "cat" ? "service_categories" : "service_subcategories")
          .delete()
          .eq("id", id),
      "Deleted"
    );

  const move = async (
    table: "cat" | "sub",
    list: { id: string; sort_order: number }[],
    index: number,
    direction: -1 | 1
  ) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const a = list[index];
    const b = list[target];
    const tableName = table === "cat" ? "service_categories" : "service_subcategories";
    setBusy(true);
    const results = await Promise.all([
      supabase.from(tableName).update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from(tableName).update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    setBusy(false);
    if (results.some((r) => r.error)) {
      toast.error("Could not reorder");
      return;
    }
    await reload();
  };

  const renderRow = (
    table: "cat" | "sub",
    item: { id: string; label: string; sort_order: number; is_active: boolean },
    index: number,
    list: { id: string; label: string; sort_order: number; is_active: boolean }[]
  ) => (
    <div
      key={item.id}
      className={`flex items-center gap-2 rounded-md border p-2 ${
        table === "cat" && item.label === activeCategory ? "border-primary bg-accent/40" : ""
      }`}
    >
      <div className="flex flex-col">
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-6"
          disabled={busy || index === 0}
          aria-label={`Move ${item.label} up`}
          onClick={() => move(table, list, index, -1)}
        >
          <ArrowUp className="w-3 h-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-6"
          disabled={busy || index === list.length - 1}
          aria-label={`Move ${item.label} down`}
          onClick={() => move(table, list, index, 1)}
        >
          <ArrowDown className="w-3 h-3" />
        </Button>
      </div>

      {editing?.table === table && editing.id === item.id ? (
        <>
          <Input
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && rename()}
            className="h-8"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={rename} aria-label="Save name">
            <Check className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(null)} aria-label="Cancel rename">
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <button
            className="flex-1 truncate text-left text-sm font-medium"
            onClick={() => table === "cat" && setSelected(item.label)}
          >
            {item.label}
          </button>
          {!item.is_active && <Badge variant="outline">Hidden</Badge>}
          <Switch
            checked={item.is_active}
            disabled={busy}
            aria-label={`Toggle ${item.label} visibility`}
            onCheckedChange={(checked) => toggleActive(table, item.id, checked)}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={`Rename ${item.label}`}
            onClick={() => setEditing({ table, id: item.id, value: item.label })}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            disabled={busy}
            aria-label={`Delete ${item.label}`}
            onClick={() => remove(table, item.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <PageSEO
        title="Marketplace Taxonomy | ArtistrySynk Admin"
        description="Create, edit, and reorder marketplace categories and subcategories."
        noindex
      />
      <div className="max-w-6xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderTree className="w-7 h-7" />
            Marketplace Taxonomy
          </h1>
          <p className="text-muted-foreground">
            Manage the Category → Subcategory → Service hierarchy used across the marketplace.
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading taxonomy...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Select a category to manage its subcategories.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                    placeholder="New category name"
                  />
                  <Button onClick={addCategory} disabled={busy || !newCategory.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {categories.map((cat, i) => renderRow("cat", cat, i, categories))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subcategories</CardTitle>
                <CardDescription>
                  {activeCategory ? `Inside "${activeCategory}"` : "Create a category first"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.length > 0 && (
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={activeCategory ?? undefined} onValueChange={setSelected}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.label}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSubcategory()}
                    placeholder="New subcategory name"
                    disabled={!activeCategory}
                  />
                  <Button onClick={addSubcategory} disabled={busy || !activeCategory || !newSubcategory.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {childSubcategories.map((sub, i) => renderRow("sub", sub, i, childSubcategories))}
                  {activeCategory && childSubcategories.length === 0 && (
                    <p className="text-sm text-muted-foreground">No subcategories yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>
              Services are created by sellers and are validated on the server: every service must use an active
              category, and its subcategory must belong to that category. Hiding or deleting an entry here stops new
              services from using it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.open("/admin-dashboard", "_self")}>
              Manage services in the Marketplace tab
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCategories;
