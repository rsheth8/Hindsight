/**
 * Minimal, dependency-free server-side Anthropic Messages client (fetch only).
 * The key never reaches the client bundle. When ANTHROPIC_API_KEY is unset,
 * callers fall back to deterministic heuristics — graceful degradation.
 */
export const AI_MODELS = {
  fast: process.env.ANTHROPIC_MODEL_FAST?.trim() || "claude-haiku-4-5-20251001",
  smart: process.env.ANTHROPIC_MODEL_SMART?.trim() || "claude-sonnet-4-6",
  deep: process.env.ANTHROPIC_MODEL_DEEP?.trim() || "claude-opus-4-8",
} as const;
export type ModelTier = keyof typeof AI_MODELS;

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

interface TextBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

export interface AiMessageOptions {
  tier?: ModelTier;
  system: TextBlock[];
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  error?: { message?: string };
}

export async function aiMessage(opts: AiMessageOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  const model = AI_MODELS[opts.tier ?? "fast"];

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 700,
      temperature: opts.temperature ?? 0.3,
      system: opts.system,
      messages: opts.messages,
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as AnthropicResponse;
  if (!res.ok) throw new Error(data.error?.message || `Anthropic request failed (${res.status})`);
  return (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
}
