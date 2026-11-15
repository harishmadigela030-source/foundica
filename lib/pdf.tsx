import React from 'react';
import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { Report } from './types';

/* The built-in PDF fonts only cover Latin-1 (WinAnsi). Map common extras, drop the rest. */
const WIN_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split(''));
export function pdfText(v: unknown): string {
  const s = String(v ?? '')
    .replace(/₹/g, 'Rs.')
    .replace(/[≈~]/g, '~')
    .replace(/[→⇒]/g, '->')
    .replace(/[←]/g, '<-')
    .replace(/[≥]/g, '>=')
    .replace(/[≤]/g, '<=')
    .replace(/[✓✔]/g, 'v')
    .replace(/[‐-‒]/g, '-')
    .replace(/[   ]/g, ' ');
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || WIN_EXTRA.has(ch)) out += ch;
    else if (c > 255) out += '';
  }
  return out;
}

const C = { ink: '#0E1526', mute: '#5A6377', line: '#E3E6EC', blue: '#1F4FD8', blueBg: '#E6ECFC', warn: '#B4470A', ok: '#1D5E3A', bg: '#F6F7F9' };
const st = StyleSheet.create({
  page: { padding: 36, paddingBottom: 54, fontSize: 9.5, color: C.ink, fontFamily: 'Helvetica', lineHeight: 1.4 },
  brand: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.blue },
  h1: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginTop: 4, marginBottom: 4, lineHeight: 1.25 },
  h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 6 },
  mute: { color: C.mute },
  row: { flexDirection: 'row' },
  card: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 10, marginRight: 8 },
  big: { fontSize: 22, fontFamily: 'Helvetica-Bold' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 4 },
  th: { fontFamily: 'Helvetica-Bold', color: C.mute },
  note: { backgroundColor: C.bg, padding: 8, borderRadius: 6, marginTop: 6 },
  footer: { position: 'absolute', bottom: 22, left: 36, right: 36, fontSize: 7.5, color: C.mute, flexDirection: 'row', justifyContent: 'space-between' },
  sup: { fontSize: 7, color: C.blue },
});
import type { Style } from '@react-pdf/stylesheet';
type TextStyle = Style | Style[];
const T = (p: { children: unknown; style?: TextStyle }) => <Text style={p.style}>{pdfText(p.children)}</Text>;
const refs = (ids: number[]) => (ids.length ? ' ' + ids.map((i) => `[${i}]`).join('') : '');

function ReportDoc({ r }: { r: Report }) {
  const quick = r.tier === 'quick';
  const date = new Date(r.createdAt).toISOString().slice(0, 10);
  return (
    <Document title={pdfText(`Foundica report - ${r.startup.name}`)} author="Foundica">
      <Page size="A4" style={st.page}>
        <T style={st.brand}>{quick ? 'Foundica · Quick Score' : 'Foundica · Founder Report'}</T>
        <T style={st.h1}>{r.startup.name}</T>
        <T style={st.mute}>{[r.startup.sector, r.startup.stage, r.startup.geography, date, r.mock ? 'DEMO DATA' : ''].filter(Boolean).join(' · ')}</T>

        <View style={[st.row, { marginTop: 14 }]}>
          <View style={st.card}><T style={st.mute}>Founder-Market Fit</T><T style={st.big}>{`${r.fmf.score}/100`}</T></View>
          <View style={st.card}><T style={st.mute}>AI-Durability</T><T style={st.big}>{`${r.durability.score}/100`}</T></View>
          <View style={st.card}><T style={st.mute}>Market half-life</T><T style={st.big}>{`${r.durability.halfLife.low}-${r.durability.halfLife.high} yrs`}</T></View>
          <View style={[st.card, { marginRight: 0 }]}><T style={st.mute}>Competition</T><T style={st.big}>{`${r.competition.intensity}/10`}</T></View>
        </View>
        <View style={st.note}><T>{`Report confidence: ${r.critic.confidence}% (set by an independent critic agent). ${r.durability.verdict}`}</T></View>

        <T style={st.h2}>Next steps</T>
        {r.nextSteps.map((s, i) => <T key={i}>{`${i + 1}. ${s}`}</T>)}

        <T style={st.h2}>Founder-Market Fit</T>
        <T>{r.fmf.summary}</T>
        <View style={[st.tr, { marginTop: 6 }]}><T style={[st.th, { width: '24%' }]}>Signal</T><T style={[st.th, { width: '10%' }]}>Score</T><T style={[st.th, { width: '33%' }]}>Evidence</T><T style={[st.th, { width: '33%' }]}>Improve in 30 days</T></View>
        {r.fmf.signals.map((s) => (
          <View key={s.key} style={st.tr} wrap={false}>
            <T style={{ width: '24%' }}>{`${s.name} (${Math.round(s.weight * 100)}%)`}</T>
            <T style={{ width: '10%' }}>{`${s.score}/10`}</T>
            <T style={{ width: '33%', paddingRight: 6 }}>{s.evidence + (s.adjusted ? ` (Critic: ${s.adjusted})` : '')}</T>
            <T style={{ width: '33%' }}>{s.improve}</T>
          </View>
        ))}
        {r.fmf.redFlags.length ? <T style={{ marginTop: 6, color: C.warn }}>{`Red flags: ${r.fmf.redFlags.join(' · ')}`}</T> : null}

        <T style={st.h2}>AI-Durability: will this last 5-10 years?</T>
        <T>{`Biggest threat: ${r.durability.biggestThreat}`}</T>
        {r.durability.tests.map((t) => (
          <View key={t.key} style={st.tr} wrap={false}>
            <T style={{ width: '28%' }}>{t.name}</T>
            <T style={{ width: '10%' }}>{`${t.score}/10`}</T>
            <T style={{ width: '62%' }}>{t.finding + refs(t.sourceIds) + (t.adjusted ? ` (Critic: ${t.adjusted})` : '')}</T>
          </View>
        ))}
        <T style={{ fontFamily: 'Helvetica-Bold', marginTop: 8 }}>Outlook by year</T>
        {r.durability.timeline.map((y) => <T key={y.year}>{`${y.year} (${y.risk} risk): ${y.outlook}`}</T>)}
        <T style={{ fontFamily: 'Helvetica-Bold', marginTop: 8 }}>Moves that extend durability</T>
        {r.durability.moves.map((m, i) => <T key={i}>{`${i + 1}. ${m.move} (${m.impact})`}</T>)}

        {quick ? (
        <View style={st.note}>
          <T style={{ fontFamily: 'Helvetica-Bold' }}>Free Quick Score</T>
          <T>This report is based on your answers only. Live competitor research, the market brief and cited sources are in the Full Report at thefoundica.com.</T>
        </View>
        ) : (
          <>
        <T style={st.h2}>Competitors</T>
        <View style={st.tr}><T style={[st.th, { width: '22%' }]}>Company</T><T style={[st.th, { width: '13%' }]}>Type</T><T style={[st.th, { width: '35%' }]}>What they do</T><T style={[st.th, { width: '18%' }]}>Scale</T><T style={[st.th, { width: '12%' }]}>Threat</T></View>
        {r.competition.competitors.map((c, i) => (
          <View key={i} style={st.tr} wrap={false}>
            <T style={{ width: '22%' }}>{c.name + refs(c.sourceIds)}</T>
            <T style={{ width: '13%' }}>{c.type.replace('_', ' ')}</T>
            <T style={{ width: '35%', paddingRight: 6 }}>{c.what}</T>
            <T style={{ width: '18%', paddingRight: 6 }}>{c.scale}</T>
            <T style={{ width: '12%' }}>{c.threat}</T>
          </View>
        ))}
        {r.competition.facts.length ? <T style={{ fontFamily: 'Helvetica-Bold', marginTop: 8 }}>Market facts</T> : null}
        {r.competition.facts.map((f, i) => <T key={i}>{`- ${f.claim}${refs(f.sourceIds)}`}</T>)}

        <T style={st.h2}>Research brief</T>
        <T>{r.research.segments.map((s) => s.text.replace(/^#+\s*/gm, '') + refs(s.sourceIds)).join('')}</T>

          </>
        )}
        {r.critic.warnings.length || r.critic.unsupported.length ? (
          <View style={st.note}>
            <T style={{ fontFamily: 'Helvetica-Bold' }}>Critic agent notes</T>
            {r.critic.warnings.map((w, i) => <T key={'w' + i}>{`- ${w}`}</T>)}
            {r.critic.unsupported.map((w, i) => <T key={'u' + i}>{`- Unsupported: ${w}`}</T>)}
          </View>
        ) : null}

        {quick ? null : (
          <>
        <T style={st.h2}>Sources</T>
        {r.research.sources.map((s) => (
          <View key={s.id} style={{ marginBottom: 4 }} wrap={false}>
            <T>{`[${s.id}] ${s.title}${s.pageAge ? ` (${s.pageAge})` : ''}`}</T>
            <Link src={s.url} style={{ color: C.blue, fontSize: 8 }}>{pdfText(s.url)}</Link>
          </View>
        ))}
        {!r.research.sources.length ? <T style={st.mute}>No sources were cited.</T> : null}

          </>
        )}
        <T style={[st.mute, { marginTop: 14, fontSize: 8 }]}>
          AI-generated assessment by Foundica agents using live web search. It can be wrong: check the sources. This is not investment, legal or financial advice.
        </T>
        <View style={st.footer} fixed>
          <Text>{pdfText(`Foundica · ${r.startup.name}`)}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function reportPdf(r: Report): Promise<Buffer> {
  return renderToBuffer(<ReportDoc r={r} />);
}
