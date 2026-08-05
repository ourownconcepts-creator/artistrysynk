import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";

export interface TaxonomyCategory {
  id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface TaxonomySubcategory {
  id: string;
  category_label: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

const FALLBACK_CATEGORIES: TaxonomyCategory[] = SERVICE_CATEGORIES.map((c, i) => ({
  id: `fallback-${i}`,
  label: c.label,
  sort_order: i + 1,
  is_active: true,
}));

const FALLBACK_SUBCATEGORIES: TaxonomySubcategory[] = SERVICE_CATEGORIES.flatMap((c) =>
  c.subcategories.map((s, i) => ({
    id: `fallback-${c.label}-${s}`,
    category_label: c.label,
    label: s,
    sort_order: i + 1,
    is_active: true,
  }))
);

/** Loads the admin-managed marketplace taxonomy, falling back to the static list. */
export const useServiceTaxonomy = (includeInactive = false) => {
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomySubcategory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [catRes, subRes] = await Promise.all([
      supabase.from("service_categories").select("id, label, sort_order, is_active").order("sort_order"),
      supabase.from("service_subcategories").select("id, category_label, label, sort_order, is_active").order("sort_order"),
    ]);

    const cats = (catRes.data as TaxonomyCategory[] | null) ?? [];
    const subs = (subRes.data as TaxonomySubcategory[] | null) ?? [];

    setCategories(
      cats.length ? (includeInactive ? cats : cats.filter((c) => c.is_active)) : FALLBACK_CATEGORIES
    );
    setSubcategories(
      cats.length ? (includeInactive ? subs : subs.filter((s) => s.is_active)) : FALLBACK_SUBCATEGORIES
    );
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => {
    reload();
  }, [reload]);

  const categoryLabels = categories.map((c) => c.label);

  const getSubcategoriesFor = useCallback(
    (category: string) =>
      subcategories.filter((s) => s.category_label === category).map((s) => s.label),
    [subcategories]
  );

  return { categories, subcategories, categoryLabels, getSubcategoriesFor, loading, reload };
};
