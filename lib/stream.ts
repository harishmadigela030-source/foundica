import type { StreamEvent } from './types';

/** NDJSON stream with keep-alive, shared by the long-running agent routes. */
export function ndjson(work: (emit: (e: StreamEvent) => void) => Promise<void>): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (t: string) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(t));
        } catch {
          open = false;
        }
      };
      const ka = setInterval(() => send('\n'), 15000);
      try {
        await work((e) => send(JSON.stringify(e) + '\n'));
      } finally {
        clearInterval(ka);
        open = false;
        try {
          controller.close();
        } catch {
          /* closed */
        }
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
}

export function friendly(e: unknown): string {
  const err = e as { status?: number; message?: string };
  if (err?.status === 401) return 'The server API key is invalid. (Admin: check ANTHROPIC_API_KEY.)';
  if (err?.status === 429) return 'The AI is busy right now. Please try again in a minute.';
  if (err?.status === 529 || err?.status === 503) return 'The AI service is overloaded. Please try again shortly.';
  if (err?.message?.includes('ANTHROPIC_API_KEY')) return 'The server is not configured yet. (Admin: set ANTHROPIC_API_KEY.)';
  return 'Something went wrong. Please try again.';
}
