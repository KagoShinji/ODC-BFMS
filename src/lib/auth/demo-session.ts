import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_COOKIE_NAME = "odc_demo_session";
export const DEMO_SESSION_MAX_AGE = 8 * 60 * 60;

const defaultEmail = "demo@odc.local";
const defaultPassword = "demo1234";

function secret() {
  return process.env.DEMO_AUTH_SECRET || "odc-bfms-local-demo-session-only";
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function demoLoginHint() {
  if (
    (process.env.DEMO_LOGIN_EMAIL || defaultEmail) !== defaultEmail ||
    (process.env.DEMO_LOGIN_PASSWORD || defaultPassword) !== defaultPassword
  )
    return null;
  return { email: defaultEmail, password: defaultPassword };
}

export function validDemoCredentials(email: string, password: string) {
  const expectedEmail = process.env.DEMO_LOGIN_EMAIL || defaultEmail;
  const expectedPassword = process.env.DEMO_LOGIN_PASSWORD || defaultPassword;
  return (
    equal(signature(email.trim().toLowerCase()), signature(expectedEmail.toLowerCase())) &&
    equal(signature(password), signature(expectedPassword))
  );
}

export function createDemoSession(nowMs = Date.now()) {
  const issuedAt = Math.floor(nowMs / 1000);
  const payload = `v1.${issuedAt}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyDemoSession(token: string | undefined, nowMs = Date.now()) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || !/^\d{10,}$/.test(parts[1])) return false;
  const issuedAt = Number(parts[1]);
  const now = Math.floor(nowMs / 1000);
  if (
    !Number.isSafeInteger(issuedAt) ||
    issuedAt > now + 30 ||
    now - issuedAt >= DEMO_SESSION_MAX_AGE
  )
    return false;
  return equal(parts[2], signature(`${parts[0]}.${parts[1]}`));
}
