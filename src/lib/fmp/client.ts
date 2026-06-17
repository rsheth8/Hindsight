/**
 * Minimal server-side FMP client. Uses the `/stable/` endpoints only (legacy
 * /api/v3 is disabled for newer keys). The key never leaves the server.
 * Graceful: callers check hasFmpApiKey() and fall back to the static bank.
 */

const FMP_BASE = "https://financialmodelingprep.com/stable";

export class FmpError extends Error {
  constructor(message: string, readonly code: "CONFIG" | "HTTP" | "PARSE" = "HTTP") {
    super(message);
    this.name = "FmpError";
  }
}

export function hasFmpApiKey(): boolean {
  return Boolean(process.env.FMP_API_KEY?.trim());
}

function getApiKey(): string {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) throw new FmpError("FMP_API_KEY is not configured", "CONFIG");
  return key;
}

const RETRY_STATUSES = new Set([429, 503]);
const MAX_RETRIES = 2;

export async function fmpFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(`${FMP_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  url.searchParams.set("apikey", getApiKey());

  let res: Response | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    res = await fetch(url.toString(), { cache: "no-store" });
    if (res.ok || !RETRY_STATUSES.has(res.status) || attempt === MAX_RETRIES) break;
    await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
  }
  if (!res!.ok) throw new FmpError(`FMP request failed (${res!.status}) for ${path}`, "HTTP");
  const data = (await res!.json()) as T;
  if (data === null || data === undefined) throw new FmpError(`Empty response for ${path}`, "PARSE");
  return data;
}
