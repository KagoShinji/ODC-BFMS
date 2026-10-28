import test from "node:test";
import assert from "node:assert/strict";
import {
  brandingFromStored,
  brandPalette,
  brandTitle,
  defaultBranding,
  isPortalSlug,
  logoFormat,
  portalAddress,
  portalSlug,
  slugFromHost,
  validateBranding,
} from "../src/lib/branding.ts";

test("branding validation trims input and rejects unsafe values", () => {
  const result = validateBranding({
    ...defaultBranding,
    appName: "  Bayan   Finance  ",
    accentColor: "#1F7A5A",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.appName, "Bayan Finance");
  assert.equal(result.value.accentColor, "#1f7a5a");
  assert.equal(validateBranding({ ...defaultBranding, appName: "" }).ok, false);
  assert.equal(validateBranding({ ...defaultBranding, markText: "TOOLONG" }).ok, false);
  assert.equal(validateBranding({ ...defaultBranding, accentColor: "red; x: y" }).ok, false);
  assert.equal(validateBranding({ ...defaultBranding, logoUrl: "javascript:alert(1)" }).ok, false);
  assert.equal(validateBranding({ ...defaultBranding, logoUrl: "http://x.test/a.png" }).ok, false);
  assert.equal(validateBranding({ ...defaultBranding, logoUrl: "https://x.test/a.png" }).ok, true);
});

test("stored branding falls back to defaults field by field", () => {
  assert.deepEqual(brandingFromStored(null), defaultBranding);
  const stored = brandingFromStored({ appName: "Bayan Finance", accentColor: "url(evil)" });
  assert.equal(stored.appName, "Bayan Finance");
  assert.equal(stored.accentColor, defaultBranding.accentColor);
  assert.equal(stored.markText, defaultBranding.markText);
});

test("brand title and palette derive from settings", () => {
  assert.equal(brandTitle(defaultBranding), "Barangay Financial Management System by ODC");
  assert.equal(brandTitle({ ...defaultBranding, organizationName: "" }), defaultBranding.appName);
  assert.equal(brandPalette("#f56618")["--brand-foreground"], "#ffffff");
  assert.equal(brandPalette("#ffd400")["--brand-foreground"], "#172a3b");
  assert.match(brandPalette("#f56618")["--brand-strong"], /^#[0-9a-f]{6}$/);
});

test("barangay sign-in slugs are derived from names and validated", () => {
  assert.equal(portalSlug("Barangay San Isidro"), "barangay-san-isidro");
  assert.equal(portalSlug("  Sto. Niño (Poblacion) "), "sto-nino-poblacion");
  assert.equal(portalSlug("!!!"), "barangay");
  assert.equal(isPortalSlug("barangay-san-isidro"), true);
  assert.equal(isPortalSlug("Bad Slug"), false);
  assert.equal(isPortalSlug("-edge"), false);
  assert.equal(isPortalSlug("a".repeat(61)), false);
});

test("logo uploads are identified by file signature", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  assert.deepEqual(logoFormat(png), { extension: "png", contentType: "image/png" });
  assert.equal(logoFormat(jpg)?.contentType, "image/jpeg");
  assert.equal(logoFormat(webp)?.extension, "webp");
  assert.equal(logoFormat(svg), null);
});

test("barangay subdomains resolve only under the configured root domain", () => {
  assert.equal(slugFromHost("san-isidro.bfms.example.ph", "bfms.example.ph"), "san-isidro");
  assert.equal(slugFromHost("San-Isidro.localhost:3000", "localhost:3000"), "san-isidro");
  assert.equal(slugFromHost("bfms.example.ph", "bfms.example.ph"), null);
  assert.equal(slugFromHost("www.bfms.example.ph", "bfms.example.ph"), null);
  assert.equal(slugFromHost("a.b.bfms.example.ph", "bfms.example.ph"), null);
  assert.equal(slugFromHost("san-isidro.evil.ph", "bfms.example.ph"), null);
  assert.equal(slugFromHost("san-isidro.bfms.example.ph", ""), null);
  assert.equal(
    portalAddress("san-isidro", "https://bfms.example.ph", "bfms.example.ph"),
    "https://san-isidro.bfms.example.ph",
  );
  assert.equal(
    portalAddress("san-isidro", "http://localhost:3000", ""),
    "http://localhost:3000/b/san-isidro",
  );
});
