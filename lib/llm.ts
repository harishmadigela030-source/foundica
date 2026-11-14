import Anthropic from '@anthropic-ai/sdk';
import { parseJsonObject } from './citations';
import { mockJSON, mockResearchBlocks } from './mock';

export const isMock = () => process.env.MOCK_AI === '1' || process.env.MOCK_AI === 'true';
const model = () => process.env.FOUNDICA_MODEL || 'claude-sonnet-5-5';
const maxSearches = () => Math.max(1, Math.min(15, Number(process.env.FOUNDICA_MAX_SEARCHES) || 6));

let client: Anthropic | null = null;
function api(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set on the server.');
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 240_000 });
  return client;
}

function textOf(content: { type: string; text?: string }[]): string {
  return content.filter((b) => b.type === 'text').map((b) => b.text || '').join('');
}

/** Ask for one JSON object. Retries once if the reply does not parse. */
export async function askJSON(kind: string, system: string, prompt: string, maxTokens = 4000): Promise<Record<string, unknown>> {
  if (isMock()) return mockJSON(kind);
  let lastText = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await api().messages.create({
      model: model(),
      max_tokens: maxTokens,
      system,
      messages: [
        {
          role: 'user',
          content:
            attempt === 0
              ? prompt
              : prompt + '\n\nYour previous reply was not valid JSON. Reply with ONLY the JSON object, no prose, no code fence.',
        },
      ],
    });
    lastText = textOf(msg.content as { type: string; text?: string }[]);
    const v = parseJsonObject(lastText);
    if (v) return v;
  }
  throw new Error(`The ${kind} agent did not return valid JSON.`);
}

export type ResearchHooks = { onQuery?: (q: string) => void; onSource?: (s: { url: string; title: string }) => void };

/**
 * Research with Claude's server-side web search tool.
 * Streams so we can show the founder each search as it happens, and
 * continues after `pause_turn` (the API may pause long search turns).
 * Returns every assistant content block, for citation extraction.
 */
export async function researchWithSearch(system: string, prompt: string, hooks: ResearchHooks = {}): Promise<unknown[]> {
  if (isMock()) {
    const blocks = mockResearchBlocks();
    for (const b of blocks as { type: string; input?: { query?: string }; content?: { url: string; title: string }[] }[]) {
      if (b.type === 'server_tool_use' && b.input?.query) hooks.onQuery?.(b.input.query);
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) b.content.forEach((r) => hooks.onSource?.({ url: r.url, title: r.title }));
      await new Promise((r) => setTimeout(r, 40));
    }
    return blocks;
  }
  const all: unknown[] = [];
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }];
  for (let turn = 0; turn < 4; turn++) {
    const stream = api().messages.stream({
      model: model(),
      max_tokens: 8000,
      system,
      messages,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxSearches() }],
    });
    const partial: Record<number, { type: string; json: string }> = {};
    for await (const ev of stream as AsyncIterable<{ type: string; index?: number; content_block?: { type: string; content?: unknown }; delta?: { type: string; partial_json?: string } }>) {
      if (ev.type === 'content_block_start' && ev.content_block && typeof ev.index === 'number') {
        partial[ev.index] = { type: ev.content_block.type, json: '' };
        if (ev.content_block.type === 'web_search_tool_result' && Array.isArray(ev.content_block.content)) {
          for (const r of ev.content_block.content as { type?: string; url?: string; title?: string }[]) {
            if (r?.type === 'web_search_result' && r.url) hooks.onSource?.({ url: r.url, title: r.title || r.url });
          }
        }
      } else if (ev.type === 'content_block_delta' && ev.delta?.type === 'input_json_delta' && typeof ev.index === 'number') {
        if (partial[ev.index]) partial[ev.index].json += ev.delta.partial_json || '';
      } else if (ev.type === 'content_block_stop' && typeof ev.index === 'number') {
        const p = partial[ev.index];
        if (p && p.type === 'server_tool_use') {
          try {
            const q = JSON.parse(p.json || '{}').query;
            if (typeof q === 'string') hooks.onQuery?.(q);
          } catch {
            /* ignore partial json */
          }
        }
      }
    }
    const final = await stream.finalMessage();
    all.push(...final.content);
    if (final.stop_reason !== 'pause_turn') break;
    // Continue a paused turn by sending the assistant content back unchanged.
    messages.push({ role: 'assistant', content: final.content as Anthropic.ContentBlockParam[] });
  }
  return all;
}
