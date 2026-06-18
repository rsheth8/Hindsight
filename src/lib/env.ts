/** Server-side config — which data paths are live vs fallback. */

export function hasFmpKey(): boolean {
  return Boolean(process.env.FMP_API_KEY?.trim());
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function hasSubmissionStore(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim(),
  );
}

/** Live realtime sync (Ably) is enabled when a server key is present. Without it
 *  duels still work over REST polling — the same graceful-fallback philosophy. */
export function hasRealtime(): boolean {
  return Boolean(process.env.ABLY_API_KEY?.trim());
}

export function appPublicUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://hindsight.game").replace(/\/$/, "");
}

export function serverMode() {
  return {
    fmp: hasFmpKey() ? "live" as const : "fallback" as const,
    ai: hasAnthropicKey() ? "live" as const : "heuristic" as const,
    submissions: hasSubmissionStore() ? "kv" as const : "file" as const,
    duelStore: hasSubmissionStore() ? "kv" as const : "file" as const,
    realtime: hasRealtime() ? "ably" as const : "polling" as const,
  };
}
