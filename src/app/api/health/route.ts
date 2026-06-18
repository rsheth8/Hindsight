import { NextResponse } from "next/server";
import { appPublicUrl, serverMode } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Lightweight deploy check — confirms env + which backends are active. */
export async function GET() {
  const mode = serverMode();
  return NextResponse.json({
    ok: true,
    app: appPublicUrl(),
    mode,
    hint:
      mode.fmp === "fallback" || mode.ai === "heuristic"
        ? "Add FMP_API_KEY and ANTHROPIC_API_KEY to .env.local (not .env.locl) for live data."
        : undefined,
  });
}
