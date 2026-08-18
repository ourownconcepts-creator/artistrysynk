/**
 * Beauty & Grooming vertical: role grouping, specialties, service modes and
 * the credential doc types used for professional verification.
 */

export const BEAUTY_ROLE_VALUES = [
  "nail_technician",
  "nail_artist",
  "pedicurist",
  "lash_technician",
  "brow_artist",
  "hair_stylist",
  "barber",
  "wig_maker",
  "braider",
  "makeup_artist",
  "sfx_makeup_artist",
  "body_painter",
  "esthetician",
  "skincare_specialist",
  "tattoo_artist",
  "piercing_artist",
  "beauty_content_creator",
  "wardrobe_stylist",
  "stylist",
] as const;

export type BeautyRole = (typeof BEAUTY_ROLE_VALUES)[number];

export const isBeautyRole = (role: string): boolean =>
  (BEAUTY_ROLE_VALUES as readonly string[]).includes(role);

/** Specialty buckets used by discovery filters and profile fields. */
export const BEAUTY_SPECIALTIES = [
  { value: "nails", label: "Nails" },
  { value: "lashes", label: "Lashes" },
  { value: "brows", label: "Brows" },
  { value: "hair", label: "Hair" },
  { value: "barbering", label: "Barbering" },
  { value: "wigs", label: "Wigs & Installs" },
  { value: "braids", label: "Braids & Locs" },
  { value: "makeup", label: "Makeup" },
  { value: "sfx", label: "SFX & Body Art" },
  { value: "skincare", label: "Skincare & Facials" },
  { value: "tattoo", label: "Tattoo & Piercing" },
  { value: "styling", label: "Wardrobe Styling" },
] as const;

export const BEAUTY_SERVICE_MODES = [
  { value: "studio", label: "In studio / salon" },
  { value: "mobile", label: "Mobile (I travel)" },
  { value: "home", label: "Home service" },
  { value: "onset", label: "On set / events" },
] as const;

export const BEAUTY_CURRENCIES = ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR", "CAD", "AUD", "AED"];

export interface BeautyService {
  name: string;
  price_min?: number | null;
  price_max?: number | null;
  duration_mins?: number | null;
}

export interface BeautyProfile {
  user_id: string;
  specialties: string[];
  services: BeautyService[];
  price_min: number | null;
  price_max: number | null;
  currency: string;
  service_modes: string[];
  service_areas: string[];
  travel_radius_km: number | null;
  years_experience: number | null;
  booking_url: string | null;
  is_accepting_clients: boolean;
}

export const specialtyLabel = (value: string) =>
  BEAUTY_SPECIALTIES.find((s) => s.value === value)?.label ?? value;

export const serviceModeLabel = (value: string) =>
  BEAUTY_SERVICE_MODES.find((s) => s.value === value)?.label ?? value;

export const formatPriceRange = (
  currency: string,
  min?: number | null,
  max?: number | null,
): string | null => {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${currency} ${min}–${max}`;
  return `${currency} ${min ?? max}+`;
};

/** Credential document types accepted for beauty role verification. */
export const BEAUTY_CREDENTIAL_DOCS = [
  { value: "beauty_certification", label: "Beauty certification / training certificate" },
  { value: "beauty_license", label: "Cosmetology or practice licence" },
  { value: "business_proof", label: "Business / salon proof" },
] as const;

export const PROFESSIONAL_REQUEST_TYPE = "professional_credential";