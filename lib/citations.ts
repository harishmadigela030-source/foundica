import type { Research, Segment, Source } from './types';

/** Minimal shape of the content blocks we read from a Claude response. */
type AnyBlock = {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
  content?: unknown;
  citations?: { type: string; url?: string; title?: string | null; cited_text?: string }[] | null;
};

function cleanUrl(u: string): string {
  try {
    const url = new URL(u);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Turn the content blocks of one or more research turns into
 * text segments with numbered sources, Perplexity style.
 * Sources are numbered in the order they are first cited.
 */
export function extractResearch(blocks: AnyBlock[]): Research {
  const sources: Source[] = [];
  const byUrl = new Map<string, number>();
  const pageAges = new Map<string, string | null>();
  const queries: string[] = [];
  const segments: Segment[] = [];
  let sawResults = false;

  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;
    if (b.type === 'server_tool_use' && b.name === 'web_search') {
      const q = (b.input as { query?: unknown } | undefined)?.query;
      if (typeof q === 'string' && q.trim()) queries.push(q.trim().slice(0, 200));
      continue;
    }
    if (b.type === 'web_search_tool_result') {
      sawResults = true;
      if (Array.isArray(b.content)) {
        for (const r of b.content as { type?: string; url?: string; page_age?: string | null }[]) {
          if (r && r.type === 'web_search_result' && typeof r.url === 'string') {
            const u = cleanUrl(r.url);
            if (u) pageAges.set(u, r.page_age ?? null);
          }
        }
      }
      continue;
    }
    if (b.type !== 'text' || typeof b.text !== 'string') continue;

    const ids: number[] = [];
    for (const c of b.citations || []) {
      if (!c || c.type !== 'web_search_result_location' || typeof c.url !== 'string') continue;
      const u = cleanUrl(c.url);
      if (!u) continue;
      let id = byUrl.get(u);
      if (!id) {
        id = sources.length + 1;
        byUrl.set(u, id);
        sources.push({
          id,
          url: u,
          title: (c.title || hostOf(u)).slice(0, 200),
          citedText: (c.cited_text || '').slice(0, 300),
          pageAge: pageAges.get(u) ?? null,
        });
      }
      if (!ids.includes(id)) ids.push(id);
    }
    // Drop narration that comes before any search result and cites nothing ("I'll search for...").
    if (!sawResults && ids.length === 0) continue;
    const text = b.text;
    if (!text.trim() && ids.length === 0) continue;
    const last = segments[segments.length - 1];
    if (last && ids.length === 0 && last.sourceIds.length === 0) last.text += text;
    else segments.push({ text, sourceIds: ids });
  }
  // late page ages (result arrived after a citation used it)
  for (const src of sources) if (!src.pageAge && pageAges.has(src.url)) src.pageAge = pageAges.get(src.url) ?? null;
  return { segments: segments.filter((s) => s.text.trim() || s.sourceIds.length), sources, queries };
}

export function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}

/** The research brief with [n] markers, plus the numbered source list, for later agents to read. */
export function briefWithMarkers(r: Research, maxChars = 24000): string {
  const body = r.segments.map((s) => s.text + (s.sourceIds.length ? ' ' + s.sourceIds.map((i) => `[${i}]`).join('') : '')).join('');
  const list = r.sources.map((s) => `[${s.id}] ${s.title} — ${s.url}\n    "${s.citedText}"`).join('\n');
  return (body.slice(0, maxChars) + '\n\nSOURCES:\n' + list).slice(0, maxChars + 12000);
}

/** Keep only ids that point at a real source. */
export function validIds(ids: unknown, sources: Source[]): number[] {
  if (!Array.isArray(ids)) return [];
  const ok = new Set(sources.map((s) => s.id));
  const out: number[] = [];
  for (const x of ids) {
    const n = Number(x);
    if (Number.isInteger(n) && ok.has(n) && !out.includes(n)) out.push(n);
  }
  return out.slice(0, 6);
}

/** Pull one JSON object out of a model reply (whole reply, a ```json fence, or first { .. last }). */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const tryParse = (t: string) => {
    try {
      const v = JSON.parse(t);
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  const t = text.trim();
  const direct = tryParse(t);
  if (direct) return direct;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    const f = tryParse(fence[1].trim());
    if (f) return f;
  }
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) return tryParse(t.slice(a, b + 1));
  return null;
}
