import type { PricepointLite } from "./types";

/** Shift continuation timestamps so they attach to the end of the visible series.
 *  Blind replay only sends a truncated window to the client, but the reveal
 *  continuation is indexed from the full decision date. */
export function alignContinuation(
  series: PricepointLite[],
  continuation: PricepointLite[],
): PricepointLite[] {
  if (!series.length || !continuation.length) return continuation;
  const lastT = series[series.length - 1]!.t;
  const offset = lastT - continuation[0]!.t;
  if (offset === 0) return continuation;
  return continuation.map((p) => ({ t: p.t + offset, v: p.v }));
}
