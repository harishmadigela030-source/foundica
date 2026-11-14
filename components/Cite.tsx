import type { Segment, Source } from '@/lib/types';
import React from 'react';

export function hostOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}

export function Favicon({ url }: { url: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="favicon" alt="" aria-hidden="true" src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=32`} />;
}

export function Cite({ id, sources }: { id: number; sources: Source[] }) {
  const s = sources.find((x) => x.id === id);
  if (!s) return null;
  return (
    <a className="cite" href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`Source ${id}: ${s.title}`}>
      {id}
      <span className="tip" role="tooltip">
        <strong>{s.title}</strong>
        <br />
        {hostOf(s.url)}
        {s.citedText ? <><br />“{s.citedText}”</> : null}
      </span>
    </a>
  );
}

export function Cites({ ids, sources }: { ids: number[]; sources: Source[] }) {
  if (!ids.length) return null;
  return <>{ids.map((i) => <Cite key={i} id={i} sources={sources} />)}</>;
}

/** Render the research brief: markdown-ish headings and paragraphs with inline citation chips. */
export function Brief({ segments, sources }: { segments: Segment[]; sources: Source[] }) {
  type Block = { kind: 'h' | 'p'; nodes: React.ReactNode[] };
  const blocks: Block[] = [{ kind: 'p', nodes: [] }];
  const cur = () => blocks[blocks.length - 1];
  let k = 0;
  for (const seg of segments) {
    const lines = seg.text.replace(/\*\*/g, '').split('\n');
    lines.forEach((line, i) => {
      if (i > 0) blocks.push({ kind: 'p', nodes: [] });
      const h = line.match(/^\s*#{1,6}\s+(.*)$/);
      if (h) {
        blocks.push({ kind: 'h', nodes: [h[1]] });
        blocks.push({ kind: 'p', nodes: [] });
      } else if (line) {
        cur().nodes.push(<React.Fragment key={k++}>{line.replace(/^\s*[-*]\s+/, '• ')}</React.Fragment>);
      }
    });
    if (seg.sourceIds.length) cur().nodes.push(<Cites key={k++} ids={seg.sourceIds} sources={sources} />);
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      {blocks
        .filter((b) => b.nodes.length)
        .map((b, i) => (b.kind === 'h' ? <h3 key={i} style={{ fontSize: 16, marginTop: 8 }}>{b.nodes}</h3> : <p key={i} style={{ margin: 0 }}>{b.nodes}</p>))}
    </div>
  );
}
