/**
 * Consume one SSE HTTP response until the stream ends or `signal` aborts.
 * Parses `data: …` frames (split on blank line).
 */

export function sseDataFromBlock(block: string): string | null {
  for (const line of block.split("\n")) {
    if (line.startsWith("data:")) return line.slice(5).trim();
  }
  return null;
}

export async function consumeSseResponse(
  res: Response,
  signal: AbortSignal,
  onEvent: (data: Record<string, unknown>) => void
): Promise<void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (;;) {
      const idx = buffer.indexOf("\n\n");
      if (idx === -1) break;
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const raw = sseDataFromBlock(block);
      if (!raw) continue;
      try {
        onEvent(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        /* ignore malformed */
      }
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
