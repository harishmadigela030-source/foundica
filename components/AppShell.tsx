'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { REQUIRED_FIELDS, STEPS as REPORT_STEPS, type Intake, type Report, type StreamEvent } from '@/lib/types';
import type { ProblemMap } from '@/lib/journey';
import { FIELD_LABELS, nextQuestion, OPENING, QUESTIONS, SKIP, type Q } from '@/lib/intake';
import type { PricingCfg } from '@/lib/pricing';
import ReportView from './ReportView';
import { MapStart, MapView, type MapForm } from './MapPanel';
import { Favicon, hostOf } from './Cite';
import { LANGS, MicButton, useDictation } from './Voice';

/* ---------- types ---------- */
type Me = { email: string; name: string; phone: string; country: string };
type Item = { kind: 'report' | 'map'; id: string; title: string; at: number; meta: string };
type Msg =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'ai'; text: string; chips?: string[]; long?: boolean }
  | { id: string; role: 'summary' }
  | { id: string; role: 'run'; kind: 'report' | 'map' }
  | { id: string; role: 'report'; report: Report };
type View = { v: 'home' } | { v: 'chat' } | { v: 'report'; id: string } | { v: 'map'; id: string } | { v: 'mapNew' };
type RunState = { kind: 'report' | 'map'; steps: ('wait' | 'run' | 'done' | 'error')[]; notes: string[]; queries: string[]; sources: { url: string; title: string }[]; started: number; error: string };

const CHAT = 'foundica.chat.v2';
const RESUME = 'foundica.resume';
const MAP_STEPS = ['Buyer research agent (live web search)', 'Problem-map agent'];
const rid = () => Math.random().toString(36).slice(2, 10);
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

function load<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
}
function save(k: string, v: unknown) {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* blocked */
  }
}
async function readStream(res: Response, on: (e: StreamEvent) => void) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) if (line.trim()) on(JSON.parse(line) as StreamEvent);
  }
}

/* ---------- small pieces ---------- */
function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="logo" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20V4h12" /><path d="M6 12h8" /></svg>
    </span>
  );
}

function RunBlock({ run, title }: { run: RunState; title: string }) {
  const [open, setOpen] = useState(true);
  const [now, setNow] = useState(Date.now());
  const live = run.steps.some((s) => s === 'run');
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live]);
  const names = run.kind === 'map' ? MAP_STEPS : REPORT_STEPS;
  const secs = Math.max(0, Math.round((now - run.started) / 1000));
  return (
    <div className="runblock" aria-live="polite">
      <button className="runhead" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={`spark ${live ? 'on' : ''}`} aria-hidden="true" />
        <strong>{live ? title : run.error ? 'Stopped' : 'Done'}</strong>
        <span className="muted small">{live ? `${secs}s` : `${run.queries.length} searches · ${run.sources.length} sources`}</span>
        <span className="chev" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="runbody">
          <ol className="runsteps">
            {names.map((n, i) => (
              <li key={n} className={run.steps[i]}>
                <span className="rdot" aria-hidden="true">{run.steps[i] === 'done' ? '✓' : run.steps[i] === 'error' ? '!' : ''}</span>
                <span>{n}</span>
                {run.notes[i] ? <span className="muted small">· {run.notes[i]}</span> : null}
              </li>
            ))}
          </ol>
          {run.queries.length ? (
            <div className="qrow">{run.queries.slice(-6).map((q) => <span key={q} className="qchip">🔍 {q}</span>)}</div>
          ) : null}
          {run.sources.length ? (
            <div className="srcgrid">
              {run.sources.slice(0, 12).map((s) => (
                <a key={s.url} className="srccard" href={s.url} target="_blank" rel="noopener noreferrer">
                  <Favicon url={s.url} />
                  <span className="srct">{s.title}</span>
                  <span className="hint">{hostOf(s.url)}</span>
                </a>
              ))}
            </div>
          ) : null}
          {run.error ? <div className="banner" role="alert">{run.error}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- modals ---------- */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input,button')?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => {
      document.removeEventListener('keydown', k);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mtitle" ref={ref}>
        <div className="row between"><h2 id="mtitle" style={{ fontSize: 21 }}>{title}</h2><button className="iconbtn" onClick={onClose} aria-label="Close">✕</button></div>
        {children}
      </div>
    </div>
  );
}

function LoginModal({ onDone, onClose }: { onDone: (me: Me, credits: number) => void; onClose: () => void }) {
  const [step, setStep] = useState<'email' | 'code' | 'profile'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [dev, setDev] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [got, setGot] = useState<{ me: Me; credits: number } | null>(null);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/auth/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setDev(j.devCode || '');
      setStep('code');
    } catch (x) {
      setErr((x as Error).message || 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/auth/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, code: code.trim() }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (j.user.phone) onDone(j.user, j.credits);
      else {
        setGot({ me: j.user, credits: j.credits });
        setStep('profile');
      }
    } catch (x) {
      setErr((x as Error).message || 'That code did not work.');
    } finally {
      setBusy(false);
    }
  }
  async function profile(e: React.FormEvent, skip = false) {
    e.preventDefault();
    if (!got) return;
    if (skip || !phone.trim()) return onDone(got.me, got.credits);
    setBusy(true);
    try {
      const r = await fetch('/api/me', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: phone.trim(), consent }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      onDone(j.user, got.credits);
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title={step === 'profile' ? 'Get report updates on WhatsApp?' : 'Sign in to Foundica'} onClose={onClose}>
      {step === 'email' ? (
        <form className="stack" onSubmit={send}>
          <p className="muted" style={{ margin: 0 }}>Your reports are saved to your account, so you can come back to them on any device. No password: we email you a 6-digit code.</p>
          <div className="field"><label htmlFor="li_email">Email</label><input id="li_email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          {err ? <div className="banner" role="alert">{err}</div> : null}
          <button className="btn" disabled={busy || !email.includes('@')}>{busy ? 'Sending…' : 'Email me a code'}</button>
        </form>
      ) : step === 'code' ? (
        <form className="stack" onSubmit={verify}>
          <p className="muted" style={{ margin: 0 }}>We sent a code to <strong>{email}</strong>. It expires in 10 minutes.</p>
          {dev ? <div className="banner info">Test mode: your code is <strong>{dev}</strong></div> : null}
          <div className="field"><label htmlFor="li_code">6-digit code</label><input id="li_code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="codein" /></div>
          {err ? <div className="banner" role="alert">{err}</div> : null}
          <button className="btn" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Sign in'}</button>
          <button type="button" className="linkbtn" onClick={() => { setStep('email'); setCode(''); }}>Use a different email</button>
        </form>
      ) : (
        <form className="stack" onSubmit={(e) => profile(e)}>
          <p className="muted" style={{ margin: 0 }}>Optional. We send a short note when your report is ready and when expert reviews open. You can stop any time.</p>
          <div className="field"><label htmlFor="li_phone">WhatsApp number with country code</label><input id="li_phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <label className="check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />Foundica may message me about my reports and expert reviews.</label>
          {err ? <div className="banner" role="alert">{err}</div> : null}
          <div className="row"><button className="btn" disabled={busy}>Save</button><button type="button" className="btn ghost" onClick={(e) => profile(e, true)}>Skip</button></div>
        </form>
      )}
    </Modal>
  );
}

function BuyModal({ pricing, credits, onClose, onError }: { pricing: PricingCfg; credits: number; onClose: () => void; onError: (m: string) => void }) {
  const [plan, setPlan] = useState<'single' | 'pack'>('single');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const r = await fetch('/api/pay/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      window.location.href = j.url;
    } catch (x) {
      setBusy(false);
      onError((x as Error).message || 'Could not start the payment.');
    }
  }
  return (
    <Modal title={credits > 0 ? 'Get more reports' : 'Unlock your report'} onClose={onClose}>
      <p className="muted" style={{ margin: 0 }}>Pilot price, about the cost of a coffee. Each credit runs one Founder Report or one Problem Map with live research and cited sources.</p>
      <div className="plans">
        <label className="plan"><input type="radio" name="bplan" checked={plan === 'single'} onChange={() => setPlan('single')} /><span className="tag">Pilot</span><strong>1 report</strong><span className="price">{inr(pricing.single)}</span><span className="hint">≈ ${pricing.singleUsd} outside India</span></label>
        <label className="plan"><input type="radio" name="bplan" checked={plan === 'pack'} onChange={() => setPlan('pack')} /><strong>{pricing.packCredits} reports</strong><span className="price">{inr(pricing.pack)}</span><span className="hint">≈ ${pricing.packUsd} · {inr(Math.round(pricing.pack / pricing.packCredits))} each</span></label>
      </div>
      <span className="hint">UPI, cards and wallets in India; international cards everywhere else. Secure checkout by Dodo Payments. <Link href="/refunds" target="_blank">Refund policy</Link></span>
      <button className="btn" onClick={go} disabled={busy}>{busy ? 'Opening checkout…' : `Continue to pay ${inr(plan === 'pack' ? pricing.pack : pricing.single)}`}</button>
    </Modal>
  );
}

/* ---------- the app ---------- */
export default function AppShell({ initialPricing, needsCode }: { initialPricing: PricingCfg; needsCode: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [credits, setCredits] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [pricing, setPricing] = useState<PricingCfg>(initialPricing);
  const [view, setView] = useState<View>({ v: 'home' });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [fields, setFields] = useState<Partial<Intake>>({});
  const [asked, setAsked] = useState<string[]>([]);
  const [current, setCurrent] = useState<Q | null>(null);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [run, setRun] = useState<RunState | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [map, setMap] = useState<ProblemMap | null>(null);
  const [modal, setModal] = useState<'login' | 'buy' | null>(null);
  const [toast, setToast] = useState('');
  const [side, setSide] = useState(false);
  const [code, setCode] = useState('');
  const after = useRef<(() => void) | null>(null);
  const meRef = useRef<Me | null>(null);
  const creditsRef = useRef(0);
  meRef.current = me;
  creditsRef.current = credits;
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const grow = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(220, el.scrollHeight) + 'px';
  };
  const dict = useDictation((t) => {
    setInput(t);
    requestAnimationFrame(grow);
  });

  const refresh = useCallback(async () => {
    const r = await fetch('/api/me', { cache: 'no-store' });
    const j = await r.json();
    setMe(j.user);
    setCredits(j.credits || 0);
    setItems(j.items || []);
    if (j.pricing) setPricing(j.pricing);
    setLoaded(true);
    return j as { user: Me | null; credits?: number };
  }, []);

  /* restore chat draft, handle ?paid / ?r / ?m / ?new on load */
  useEffect(() => {
    const d = load<{ msgs: Msg[]; fields: Partial<Intake>; asked: string[] } | null>(CHAT, null);
    if (d?.msgs?.length) {
      setMsgs(d.msgs.filter((m) => m.role !== 'run'));
      setFields(d.fields || {});
      setAsked(d.asked || []);
      setCurrent(nextQuestion(d.fields || {}, d.asked || []));
    }
    const q = new URLSearchParams(window.location.search);
    (async () => {
      const j = await refresh();
      if (q.get('paid') && q.get('payment_id') && j.user) {
        let c = j.credits || 0;
        for (let i = 0; i < 10; i++) {
          const r = await fetch('/api/pay/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paymentId: q.get('payment_id') }) });
          const x = await r.json().catch(() => ({}));
          c = x.credits ?? c;
          if (c > 0) break;
          await new Promise((res) => setTimeout(res, 2500));
        }
        setCredits(c);
        window.history.replaceState(null, '', '/app');
        if (c > 0) {
          setToast(`Payment received. You have ${c} credit${c === 1 ? '' : 's'}.`);
          const resume = load<{ kind: 'report' | 'map'; form?: MapForm } | null>(RESUME, null);
          save(RESUME, null);
          if (resume?.kind === 'report' && d?.msgs?.length) {
            setView({ v: 'chat' });
            setTimeout(() => startReportRef.current?.(), 50);
          } else if (resume?.kind === 'map' && resume.form) {
            setView({ v: 'mapNew' });
            setTimeout(() => startMapRef.current?.(resume.form!), 50);
          }
        } else setToast(q.get('status') === 'succeeded' ? 'Payment is processing. Your credits will appear in a minute.' : 'The payment did not go through. You have not been charged.');
        return;
      }
      if (q.get('r')) openItem({ kind: 'report', id: q.get('r')! } as Item);
      else if (q.get('m')) openItem({ kind: 'map', id: q.get('m')! } as Item);
      else if (q.get('new') === 'map') setView({ v: 'mapNew' });
      else if (d?.msgs?.length) setView({ v: 'chat' });
    })().catch(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (msgs.length) save(CHAT, { msgs: msgs.filter((m) => m.role !== 'report' && m.role !== 'run'), fields, asked });
  }, [msgs, fields, asked]);
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, thinking, run?.steps, run?.sources.length]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  /* gate: signed in, then has a credit (when payments are on) */
  function ensure(then: () => void, resume: { kind: 'report' | 'map'; form?: MapForm }) {
    if (!meRef.current) {
      after.current = () => ensure(then, resume);
      setModal('login');
      return;
    }
    if (pricing.payments && creditsRef.current < 1) {
      save(RESUME, resume);
      setModal('buy');
      return;
    }
    then();
  }

  /* ---------- intake chat ---------- */
  function newReport() {
    save(CHAT, null);
    setFields({});
    setAsked([]);
    setRun(null);
    setReport(null);
    setCurrent(null);
    setMsgs([{ id: rid(), role: 'ai', text: OPENING, long: true }]);
    setView({ v: 'chat' });
    setSide(false);
    window.history.replaceState(null, '', '/app');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function askNext(f: Partial<Intake>, a: string[]) {
    const q = nextQuestion(f, a);
    setCurrent(q);
    if (q) {
      setAsked([...a, q.key]);
      setMsgs((m) => [...m, { id: rid(), role: 'ai', text: q.ask, chips: q.optional ? [...(q.chips || []), SKIP] : q.chips, long: q.long }]);
    } else setMsgs((m) => [...m, { id: rid(), role: 'summary' }]);
  }

  async function send(text: string) {
    const t = text.trim();
    if (!t || thinking) return;
    if (dict.listening) dict.stop();
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    if (view.v === 'home') {
      setMsgs([{ id: rid(), role: 'ai', text: OPENING, long: true }, { id: rid(), role: 'user', text: t }]);
      setView({ v: 'chat' });
    } else setMsgs((m) => [...m.filter((x) => x.role !== 'summary'), { id: rid(), role: 'user', text: t }]);
    const key = current?.key ?? null;
    if (t === SKIP && key) {
      askNext(fields, asked.includes(key) ? asked : [...asked, key]);
      return;
    }
    setThinking(true);
    try {
      const r = await fetch('/api/intake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: t, asked: key, fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => typeof v === 'string')) }) });
      const j = await r.json();
      const nf = { ...fields, ...(j.fields || (key ? { [key]: t } : { problem: t })) };
      setFields(nf);
      const got = Object.keys(j.fields || {}).filter((k) => k !== key && FIELD_LABELS[k as keyof Intake]);
      if (got.length > 1) setMsgs((m) => [...m, { id: rid(), role: 'ai', text: `Got it. I noted: ${got.map((k) => FIELD_LABELS[k as keyof Intake]).join(', ')}.` }]);
      askNext(nf, key && !asked.includes(key) ? [...asked, key] : asked);
    } catch {
      setMsgs((m) => [...m, { id: rid(), role: 'ai', text: 'I could not read that. Please try again.' }]);
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  function editField(k: keyof Intake) {
    setCurrent(QUESTION_FOR(k));
    setMsgs((m) => [...m.filter((x) => x.role !== 'summary'), { id: rid(), role: 'ai', text: `Okay, tell me again: ${QUESTION_FOR(k)?.ask || FIELD_LABELS[k]}` }]);
    setFields((f) => ({ ...f, [k]: '' }));
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  /* ---------- runs ---------- */
  const startReportRef = useRef<() => void>(undefined);
  const startMapRef = useRef<(f: MapForm) => void>(undefined);

  async function startReport() {
    const st: RunState = { kind: 'report', steps: REPORT_STEPS.map(() => 'wait'), notes: REPORT_STEPS.map(() => ''), queries: [], sources: [], started: Date.now(), error: '' };
    setRun(st);
    setMsgs((m) => [...m.filter((x) => x.role !== 'summary' && x.role !== 'run'), { id: rid(), role: 'run', kind: 'report' }]);
    try {
      const body = { ...fields, geography: fields.geography || 'India', email: me?.email || '', consent: true, accessCode: code, tier: 'full', orderId: '' };
      const res = await fetch('/api/assess', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        if (j.needLogin) setModal('login');
        if (j.needPayment) {
          save(RESUME, { kind: 'report' });
          setModal('buy');
        }
        throw new Error(j.error || 'The server could not start your report.');
      }
      let got: Report | null = null;
      await readStream(res, (e) => {
        if (e.type === 'step') setRun((r) => r && { ...r, steps: r.steps.map((x, i) => (i === e.step ? e.status : x)), notes: e.note ? r.notes.map((x, i) => (i === e.step ? e.note! : x)) : r.notes });
        else if (e.type === 'query') setRun((r) => r && { ...r, queries: [...r.queries, e.q] });
        else if (e.type === 'source') setRun((r) => r && (r.sources.some((s) => s.url === e.source.url) ? r : { ...r, sources: [...r.sources, e.source] }));
        else if (e.type === 'error') throw new Error(e.message);
        else if (e.type === 'report') {
          got = e.report;
          if (typeof e.creditsLeft === 'number') setCredits(e.creditsLeft);
        }
      });
      if (!got) throw new Error('The connection closed before the report was ready. Please try again.');
      const rep: Report = got;
      setReport(rep);
      setMsgs((m) => [...m, { id: rid(), role: 'report', report: rep }]);
      window.history.replaceState(null, '', `/app?r=${rep.id}`);
      save(CHAT, null);
      refresh();
    } catch (x) {
      setRun((r) => r && { ...r, error: (x as Error).message, steps: r.steps.map((s) => (s === 'run' ? 'error' : s)) });
    }
  }
  startReportRef.current = startReport;

  async function startMap(f: MapForm) {
    setView({ v: 'mapNew' });
    setMap(null);
    setRun({ kind: 'map', steps: ['wait', 'wait'], notes: ['', ''], queries: [], sources: [], started: Date.now(), error: '' });
    try {
      const intake = { ...fields, ...(report ? { founderName: report.startup.founder, geography: report.startup.geography } : {}), ...f, accessCode: code, tier: 'full', orderId: '' };
      const res = await fetch('/api/map', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ intake, target: f.customer }) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        if (j.needLogin) setModal('login');
        if (j.needPayment) {
          save(RESUME, { kind: 'map', form: f });
          setModal('buy');
        }
        throw new Error(j.error || 'The server could not start your problem map.');
      }
      let got: ProblemMap | null = null;
      await readStream(res, (e) => {
        if (e.type === 'step') setRun((r) => r && { ...r, steps: r.steps.map((x, i) => (i === e.step ? e.status : x)), notes: e.note ? r.notes.map((x, i) => (i === e.step ? e.note! : x)) : r.notes });
        else if (e.type === 'query') setRun((r) => r && { ...r, queries: [...r.queries, e.q] });
        else if (e.type === 'source') setRun((r) => r && (r.sources.some((s) => s.url === e.source.url) ? r : { ...r, sources: [...r.sources, e.source] }));
        else if (e.type === 'error') throw new Error(e.message);
        else if (e.type === 'map') {
          got = e.map;
          if (typeof e.creditsLeft === 'number') setCredits(e.creditsLeft);
        }
      });
      if (!got) throw new Error('The connection closed before the map was ready. Please try again.');
      const m: ProblemMap = got;
      setMap(m);
      setRun(null);
      setView({ v: 'map', id: m.id });
      window.history.replaceState(null, '', `/app?m=${m.id}`);
      refresh();
    } catch (x) {
      setRun((r) => r && { ...r, error: (x as Error).message, steps: r.steps.map((s) => (s === 'run' ? 'error' : s)) });
    }
  }
  startMapRef.current = startMap;

  async function openItem(it: Pick<Item, 'kind' | 'id'>) {
    setSide(false);
    setRun(null);
    const r = await fetch(`/api/items?kind=${it.kind}&id=${encodeURIComponent(it.id)}`);
    if (!r.ok) {
      setToast(r.status === 401 ? 'Sign in to open your saved work.' : 'Could not open that item.');
      if (r.status === 401) setModal('login');
      return;
    }
    const j = await r.json();
    if (it.kind === 'map') {
      setMap(j.map);
      setView({ v: 'map', id: it.id });
      window.history.replaceState(null, '', `/app?m=${it.id}`);
    } else {
      setReport(j.report);
      setView({ v: 'report', id: it.id });
      window.history.replaceState(null, '', `/app?r=${it.id}`);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setMe(null);
    setItems([]);
    setCredits(0);
    setView({ v: 'home' });
    window.history.replaceState(null, '', '/app');
  }

  const runLabel = (kind: 'report' | 'map') =>
    !pricing.payments ? (kind === 'map' ? 'Map my customer’s problem' : 'Generate my report') : credits > 0 ? `Use 1 credit · ${credits} left` : `Unlock for ${inr(pricing.single)}`;

  const missingReq = REQUIRED_FIELDS.filter((k) => !String(fields[k] || '').trim());
  const latestReportItem = items.find((i) => i.kind === 'report');

  /* ---------- render ---------- */
  const sidebar = (
    <aside className={`side ${side ? 'open' : ''}`} aria-label="Foundica navigation">
      <div className="row between" style={{ padding: '4px 6px 10px' }}>
        <Link href="/" className="brand" style={{ fontSize: 17 }}><Logo size={28} />Foundica</Link>
        <button className="iconbtn mobile-only" onClick={() => setSide(false)} aria-label="Close menu">✕</button>
      </div>
      <button className="newbtn" onClick={newReport}><span aria-hidden="true">＋</span> New founder report</button>
      <button className="navbtn" onClick={() => { setView({ v: 'mapNew' }); setRun(null); setSide(false); }}><span aria-hidden="true">◎</span> Map customer problem</button>
      <div className="hist">
        {me ? (
          items.length ? (
            <>
              <span className="histh">Your work</span>
              {items.map((it) => (
                <button key={it.kind + it.id} className={`histitem ${(view.v === 'report' || view.v === 'map') && view.id === it.id ? 'on' : ''}`} onClick={() => openItem(it)}>
                  <span className="ht">{it.kind === 'map' ? '◎ ' : ''}{it.title}</span>
                  <span className="hm">{it.meta}</span>
                </button>
              ))}
            </>
          ) : <span className="hint" style={{ padding: '8px 10px' }}>Your reports and maps will appear here.</span>
        ) : <span className="hint" style={{ padding: '8px 10px' }}>Sign in to keep your reports on every device.</span>}
      </div>
      <div className="sidefoot">
        {pricing.payments && me ? (
          <button className="credits" onClick={() => setModal('buy')}><span><strong>{credits}</strong> credit{credits === 1 ? '' : 's'}</span><span className="muted small">Buy more</span></button>
        ) : null}
        {me ? (
          <div className="row between" style={{ padding: '6px 8px' }}>
            <span className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{me.email}</span>
            <button className="linkbtn small" onClick={logout}>Sign out</button>
          </div>
        ) : loaded ? <button className="btn ghost sm" style={{ width: '100%' }} onClick={() => setModal('login')}>Sign in</button> : null}
        <div className="row small muted" style={{ gap: 10, padding: '4px 8px' }}><Link href="/pricing">Pricing</Link><Link href="/privacy">Privacy</Link><Link href="/contact">Help</Link></div>
      </div>
    </aside>
  );

  const composer = (placeholder: string, big = false) => (
    <div className="composer-box">
      <form className={`composer ${big ? 'big' : ''} ${dict.listening ? 'listening' : ''}`} onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <label htmlFor="composer" className="sr-only">Message Foundica</label>
        <textarea
          id="composer"
          ref={inputRef}
          rows={big ? 3 : 1}
          value={input}
          placeholder={dict.listening ? 'Listening… speak now' : placeholder}
          maxLength={4000}
          onChange={(e) => {
            setInput(e.target.value);
            grow();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <MicButton d={dict} value={input} />
        <button className="sendbtn" disabled={!input.trim() || thinking} aria-label="Send">↑</button>
      </form>
      {dict.error ? <span className="hint center" role="alert" style={{ color: 'var(--bad)' }}>{dict.error}</span> : dict.listening ? <span className="hint center" role="status">Listening in {LANGS.find((l) => l.code === dict.lang)?.label || dict.lang}. Tap the mic again or press Enter when you are done.</span> : null}
    </div>
  );

  let main: React.ReactNode;
  if (view.v === 'home') {
    main = (
      <div className="home">
        <Logo size={44} />
        <h1>What are you building?</h1>
        <p className="muted">Foundica&apos;s agents score your founder-market fit, test whether your AI startup lasts 5–10 years, research your competitors live with sources, and map your customer&apos;s problem.</p>
        {composer('Describe your startup, or tap the mic and say it…', true)}
        <div className="suggest">
          <button onClick={newReport}><strong>Score my founder-market fit</strong><span>Am I the right founder for this market?</span></button>
          <button onClick={newReport}><strong>Will my AI startup last?</strong><span>A 5–10 year durability test and half-life</span></button>
          <button onClick={() => setView({ v: 'mapNew' })}><strong>Map my customer&apos;s problem</strong><span>Workflow, who pays, riskiest assumptions</span></button>
        </div>
        <span className="hint">{pricing.payments ? `Pilot price ${inr(pricing.single)} per report · ` : ''}Every claim links to its source · Download as PDF</span>
      </div>
    );
  } else if (view.v === 'chat') {
    main = (
      <>
        <div className="thread" ref={threadRef}>
          <div className={`thread-in ${msgs.some((m) => m.role === 'report') ? 'wide' : ''}`}>
            {msgs.map((m) => {
              if (m.role === 'user') return <div key={m.id} className="msg user"><div className="bubble">{m.text}</div></div>;
              if (m.role === 'ai')
                return (
                  <div key={m.id} className="msg ai">
                    <Logo size={26} />
                    <div className="stack" style={{ gap: 10 }}>
                      <div>{m.text}</div>
                      {m.chips && m.id === [...msgs].reverse().find((x) => x.role === 'ai')?.id ? (
                        <div className="chips">{m.chips.map((c) => <button key={c} className={`chip ${c === SKIP ? 'skip' : ''}`} onClick={() => send(c)} disabled={thinking}>{c}</button>)}</div>
                      ) : null}
                    </div>
                  </div>
                );
              if (m.role === 'summary')
                return (
                  <div key={m.id} className="msg ai">
                    <Logo size={26} />
                    <div className="card stack summary">
                      <strong>Here&apos;s what I&apos;ll send to the agents</strong>
                      <dl className="facts">
                        {(Object.keys(FIELD_LABELS) as (keyof Intake)[]).filter((k) => String(fields[k] || '').trim()).map((k) => (
                          <div key={k}><dt>{FIELD_LABELS[k]}</dt><dd>{String(fields[k]).slice(0, 220)}{String(fields[k]).length > 220 ? '…' : ''} <button className="linkbtn small" onClick={() => editField(k)}>Edit</button></dd></div>
                        ))}
                      </dl>
                      {needsCode ? <div className="field"><label htmlFor="acode">Access code</label><input id="acode" value={code} onChange={(e) => setCode(e.target.value)} /></div> : null}
                      {missingReq.length ? <div className="banner">Still missing: {missingReq.map((k) => FIELD_LABELS[k]).join(', ')}</div> : null}
                      <div className="row">
                        <button className="btn" disabled={!!missingReq.length} onClick={() => ensure(startReport, { kind: 'report' })}>{runLabel('report')}</button>
                        <span className="hint">Five agents · live web research · 1–3 minutes</span>
                      </div>
                    </div>
                  </div>
                );
              if (m.role === 'run') return run && run.kind === 'report' ? <div key={m.id} className="msg ai"><Logo size={26} /><RunBlock run={run} title="Foundica agents are researching" /></div> : null;
              return (
                <div key={m.id} className="msg report">
                  <ReportView report={m.report} onMap={() => setView({ v: 'mapNew' })} />
                </div>
              );
            })}
            {thinking ? <div className="msg ai"><Logo size={26} /><span className="typing" aria-label="Foundica is thinking"><i /><i /><i /></span></div> : null}
            {run?.error && run.kind === 'report' ? <div className="row" style={{ paddingLeft: 40 }}><button className="btn sm" onClick={() => ensure(startReport, { kind: 'report' })}>Try again</button></div> : null}
          </div>
        </div>
        {!msgs.some((m) => m.role === 'report') ? <div className="composer-wrap">{composer(current ? 'Type your answer…' : 'Add anything else, or press the button above…')}<span className="hint center">Foundica can make mistakes. Check the sources.</span></div> : (
          <div className="composer-wrap"><div className="row" style={{ justifyContent: 'center' }}><button className="btn ghost sm" onClick={newReport}>＋ New report</button><button className="btn sm" onClick={() => setView({ v: 'mapNew' })}>Next: map customer problem</button></div></div>
        )}
      </>
    );
  } else if (view.v === 'report' && report) {
    main = <div className="thread"><div className="thread-in wide"><ReportView report={report} onMap={() => setView({ v: 'mapNew' })} /></div></div>;
  } else if (view.v === 'map' && map) {
    main = <div className="thread"><div className="thread-in wide"><MapView map={map} onChange={(m) => { setMap(m); refresh(); }} onNeedLogin={() => setModal('login')} /></div></div>;
  } else if (view.v === 'mapNew') {
    const initial: Partial<Intake> = { ...fields, ...(report ? { startupName: report.startup.name, sector: report.startup.sector } : {}) };
    main = (
      <div className="thread" ref={threadRef}>
        <div className="thread-in">
          {run?.kind === 'map' ? (
            <div className="stack">
              <h1 style={{ fontSize: 26 }}>Mapping your customer&apos;s problem</h1>
              <RunBlock run={run} title="Agents are mapping your customer" />
              {run.error ? <div><button className="btn sm" onClick={() => setRun(null)}>Back</button></div> : null}
            </div>
          ) : (
            <>
              {!latestReportItem && !report ? <div className="banner info" style={{ marginBottom: 16 }}>Tip: start with a founder report. It checks your fundamentals first, and fills this form for you. <button className="linkbtn" onClick={newReport}>Start a report</button></div> : null}
              {needsCode ? <div className="field" style={{ marginBottom: 12 }}><label htmlFor="acode2">Access code</label><input id="acode2" value={code} onChange={(e) => setCode(e.target.value)} /></div> : null}
              <MapStart initial={initial} priceLabel={runLabel('map')} busy={false} onSubmit={(f) => ensure(() => startMap(f), { kind: 'map', form: f })} />
            </>
          )}
        </div>
      </div>
    );
  } else main = <div className="home"><span className="typing"><i /><i /><i /></span></div>;

  return (
    <div className="shell">
      {sidebar}
      {side ? <div className="scrim" onClick={() => setSide(false)} /> : null}
      <main className="main">
        <div className="topbar mobile-only">
          <button className="iconbtn" onClick={() => setSide(true)} aria-label="Open menu">☰</button>
          <span className="brand" style={{ fontSize: 16 }}><Logo size={24} />Foundica</span>
          <button className="iconbtn" onClick={newReport} aria-label="New report">＋</button>
        </div>
        {main}
      </main>
      {modal === 'login' ? (
        <LoginModal
          onClose={() => { setModal(null); after.current = null; }}
          onDone={(u, c) => {
            setMe(u);
            setCredits(c);
            meRef.current = u;
            creditsRef.current = c;
            setModal(null);
            refresh();
            const f = after.current;
            after.current = null;
            if (f) setTimeout(f, 0);
          }}
        />
      ) : null}
      {modal === 'buy' ? <BuyModal pricing={pricing} credits={credits} onClose={() => setModal(null)} onError={(m) => { setModal(null); setToast(m); }} /> : null}
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}

function QUESTION_FOR(k: keyof Intake): Q | null {
  return QUESTIONS.find((q) => q.key === k) || null;
}
