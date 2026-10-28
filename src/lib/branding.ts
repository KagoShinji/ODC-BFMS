// White-label settings shared by the server, the client, and node tests.

export interface Branding {
  appName: string;
  organizationName: string;
  markText: string;
  logoUrl: string;
  accentColor: string;
}

export const defaultBranding: Branding = {
  appName: "Barangay Financial Management System",
  organizationName: "ODC",
  markText: "ODC",
  logoUrl: "",
  accentColor: "#f56618",
};

const brandingKeys = Object.keys(defaultBranding) as (keyof Branding)[];

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const validators: Record<keyof Branding, (value: string) => string | null> = {
  appName: (value) =>
    value && value.length <= 80 ? null : "Enter a system name of up to 80 characters.",
  organizationName: (value) =>
    value.length <= 40 ? null : "Keep the organization name to 40 characters or fewer.",
  markText: (value) =>
    value && value.length <= 4 ? null : "Enter a logo mark of 1 to 4 characters.",
  logoUrl: (value) =>
    !value || (value.length <= 500 && isHttpsUrl(value))
      ? null
      : "The logo must be an https:// image link.",
  accentColor: (value) =>
    /^#[0-9a-f]{6}$/.test(value) ? null : "Choose an accent color as a hex value like #f56618.",
};

function clean(key: keyof Branding, value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (key === "accentColor") return trimmed.toLowerCase();
  if (key === "logoUrl") return trimmed;
  return trimmed.replace(/\s+/g, " ");
}

function fields(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

export function validateBranding(
  input: unknown,
): { ok: true; value: Branding } | { ok: false; error: string } {
  const source = fields(input);
  const value = { ...defaultBranding };
  for (const key of brandingKeys) {
    value[key] = clean(key, source[key]);
    const error = validators[key](value[key]);
    if (error) return { ok: false, error };
  }
  return { ok: true, value };
}

/** Reads stored settings field by field, keeping the default for anything missing or invalid. */
export function brandingFromStored(input: unknown): Branding {
  const source = fields(input);
  const value = { ...defaultBranding };
  for (const key of brandingKeys) {
    if (!(key in source)) continue;
    const candidate = clean(key, source[key]);
    if (!validators[key](candidate)) value[key] = candidate;
  }
  return value;
}

export function brandTitle(branding: Branding) {
  return branding.organizationName
    ? `${branding.appName} by ${branding.organizationName}`
    : branding.appName;
}

function channels(hex: string) {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

function mix(hex: string, target: number, weight: number) {
  return `#${channels(hex)
    .map((channel) =>
      Math.round(channel + (target - channel) * weight)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** CSS custom properties derived from the accent color. */
export function brandPalette(accentColor: string) {
  return {
    "--brand": accentColor,
    "--brand-strong": mix(accentColor, 0, 0.12),
    "--brand-light": mix(accentColor, 255, 0.35),
    "--brand-soft": mix(accentColor, 255, 0.9),
    "--brand-foreground": luminance(accentColor) > 0.4 ? "#172a3b" : "#ffffff",
  };
}

// Barangay sign-in links look like /b/<slug>.
export const SLUG_MAX = 60;

export function isPortalSlug(value: unknown): value is string {
  return (
    typeof value === "string" && value.length <= SLUG_MAX && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
  );
}

export function portalSlug(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, SLUG_MAX)
    .replace(/^-+|-+$/g, "");
  return slug || "barangay";
}

export const LOGO_MAX_BYTES = 1024 * 1024;

const logoTypes = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
} as const;

/** Identifies an uploaded logo by its file signature; SVG and other types are refused. */
export function logoFormat(bytes: Uint8Array) {
  const starts = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);
  let extension: keyof typeof logoTypes | null = null;
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) extension = "png";
  else if (starts([0xff, 0xd8, 0xff])) extension = "jpg";
  else if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8))
    extension = "webp";
  return extension ? { extension, contentType: logoTypes[extension] } : null;
}

/** Set by middleware from the request's barangay subdomain; client values are discarded. */
export const PORTAL_HEADER = "x-portal-slug";

/**
 * Barangay subdomains: with NEXT_PUBLIC_ROOT_DOMAIN=bfms.example.ph, a request to
 * san-isidro.bfms.example.ph belongs to the barangay whose slug is "san-isidro".
 */
export function slugFromHost(host: string | null | undefined, rootDomain: string) {
  const root = rootDomain.trim().toLowerCase();
  const value = (host ?? "").trim().toLowerCase();
  if (!root || !value.endsWith(`.${root}`)) return null;
  const label = value.slice(0, -(root.length + 1));
  return label !== "www" && isPortalSlug(label) ? label : null;
}

/** The address staff use to reach a barangay's branded sign-in page. */
export function portalAddress(slug: string, origin: string, rootDomain: string) {
  const root = rootDomain.trim().toLowerCase();
  if (!root) return `${origin}/b/${slug}`;
  const protocol = origin.startsWith("http://") ? "http:" : "https:";
  return `${protocol}//${slug}.${root}`;
}
