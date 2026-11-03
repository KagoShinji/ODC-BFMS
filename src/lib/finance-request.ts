export type FinanceResponse = { ok: true; id?: string } | { ok: false; error: string };
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function normalize(value: unknown, field = ""): unknown {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    const items = value.map((item) => normalize(item));
    return field === "allocations"
      ? items.sort((a, b) =>
          String((a as { collectionId?: string })?.collectionId).localeCompare(
            String((b as { collectionId?: string })?.collectionId),
          ),
        )
      : items;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalize(item, key)]),
    );
  }
  return value;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** A logical submission keeps its ID until the server confirms its outcome. */
export function createFinanceRequester(
  scope: string,
  dependencies: { fetch?: typeof fetch; storage?: () => StorageLike } = {},
) {
  const requests = new Map<string, string>();
  const inFlight = new Map<string, Promise<FinanceResponse>>();
  const storage = () => (dependencies.storage ? dependencies.storage() : sessionStorage);
  return async (action: string, args: object): Promise<FinanceResponse> => {
    const normalizedArgs = normalize(args);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonical([action, normalizedArgs])),
    );
    const fingerprint = Array.from(new Uint8Array(digest), (part) =>
      part.toString(16).padStart(2, "0"),
    ).join("");
    const key = `odc-finance-request:${scope}:${fingerprint}`;
    const existing = inFlight.get(key);
    if (existing) return existing;
    let requestId = requests.get(key);
    try {
      requestId ??= storage().getItem(key) ?? undefined;
    } catch {
      /* Memory guard remains available. */
    }
    if (
      !requestId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)
    )
      requestId = crypto.randomUUID();
    requests.set(key, requestId);
    try {
      storage().setItem(key, requestId);
    } catch {
      /* Private browsing can disable storage. */
    }
    const forget = () => {
      requests.delete(key);
      try {
        storage().removeItem(key);
      } catch {
        /* See storage fallback above. */
      }
    };
    const run = async (): Promise<FinanceResponse> => {
      try {
        const response = await (dependencies.fetch ?? fetch)("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
          body: JSON.stringify({ action, args: normalizedArgs }),
        });
        const result = await response.json().catch(() => null);
        if (response.ok && result?.ok === true) {
          forget();
          return { ok: true, ...(typeof result.id === "string" ? { id: result.id } : {}) };
        }
        // Only confirmed success releases the key. Even a rejected retry may
        // follow an earlier committed response that was lost (for example, if
        // access was revoked between attempts). Changed values get a new key.
        return {
          ok: false,
          error:
            typeof result?.error === "string"
              ? result.error
              : "The result could not be confirmed. Retry with the same values to check this submission safely.",
        };
      } catch {
        return {
          ok: false,
          error:
            "The result could not be confirmed. Retry with the same values to check this submission safely.",
        };
      }
    };
    const promise = run();
    inFlight.set(key, promise);
    try {
      return await promise;
    } finally {
      inFlight.delete(key);
    }
  };
}
