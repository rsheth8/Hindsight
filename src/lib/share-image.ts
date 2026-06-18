/** Render a Wordle-style Hindsight result card to a PNG blob (web share). */

export interface ShareImageInput {
  date: string;
  rating: number;
  delta: number;
  streak: number;
  correct: boolean;
  brier: number;
  reasoning: number;
}

function sq(good: number, ok: number, v: number): string {
  return v >= good ? "🟩" : v >= ok ? "🟨" : "🟥";
}

export function shareRow(input: Pick<ShareImageInput, "correct" | "brier" | "reasoning">): string {
  const calib = 1 - input.brier;
  return `${input.correct ? "🟩" : "🟥"}${sq(0.8, 0.55, calib)}${sq(0.66, 0.4, input.reasoning)}`;
}

export function shareText(input: ShareImageInput): string {
  const row = shareRow(input);
  return (
    `Hindsight ${input.date}\n` +
    `${row}\n` +
    `Rating ${input.rating} (${input.delta >= 0 ? "+" : ""}${input.delta}) · 🔥 ${input.streak}\n` +
    `Better-calibrated than I was yesterday.\n` +
    `play › ${(process.env.NEXT_PUBLIC_APP_URL ?? "hindsight.game").replace(/^https?:\/\//, "")}`
  );
}

export async function renderShareImage(input: ShareImageInput): Promise<Blob> {
  const W = 400;
  const H = 480;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  // background
  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, W, H);

  // card
  const pad = 24;
  const cardR = 20;
  ctx.fillStyle = "#121820";
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, cardR);
  ctx.fill();
  ctx.strokeStyle = "#1e2836";
  ctx.lineWidth = 1;
  ctx.stroke();

  // brand
  ctx.fillStyle = "#6b7a8f";
  ctx.font = "600 11px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("HINDSIGHT", W / 2, pad + 36);
  ctx.fillStyle = "#8fa0b8";
  ctx.font = "500 12px system-ui, -apple-system, sans-serif";
  ctx.fillText(input.date, W / 2, pad + 56);

  // emoji row
  const row = shareRow(input);
  ctx.font = "48px system-ui, -apple-system, sans-serif";
  ctx.fillText(row, W / 2, pad + 120);

  ctx.fillStyle = "#6b7a8f";
  ctx.font = "500 11px system-ui, -apple-system, sans-serif";
  ctx.fillText("outcome · calibration · reasoning", W / 2, pad + 148);

  // rating hero
  const deltaColor = input.delta >= 0 ? "#f0c560" : "#ff7a6b";
  ctx.fillStyle = deltaColor;
  ctx.font = "800 64px system-ui, -apple-system, sans-serif";
  ctx.fillText(String(input.rating), W / 2, pad + 230);

  ctx.font = "600 16px system-ui, -apple-system, sans-serif";
  const deltaStr = `${input.delta >= 0 ? "+" : ""}${input.delta} rating · 🔥 ${input.streak}`;
  ctx.fillText(deltaStr, W / 2, pad + 262);

  // tagline
  ctx.fillStyle = "#8fa0b8";
  ctx.font = "500 13px system-ui, -apple-system, sans-serif";
  wrapText(ctx, "Better-calibrated than I was yesterday.", W / 2, pad + 300, W - pad * 2 - 32, 18);

  // footer
  ctx.fillStyle = "#f0c560";
  ctx.font = "700 13px system-ui, -apple-system, sans-serif";
  ctx.fillText("play › hindsight.game", W / 2, H - pad - 28);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas toBlob failed"))), "image/png");
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineH));
}

export async function shareResultImage(input: ShareImageInput): Promise<void> {
  const blob = await renderShareImage(input);
  const file = new File([blob], `hindsight-${input.date}.png`, { type: "image/png" });
  const text = shareText(input);

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hindsight-${input.date}.png`;
  a.click();
  URL.revokeObjectURL(url);

  try {
    await navigator.clipboard.writeText(text);
  } catch { /* optional fallback */ }
}
