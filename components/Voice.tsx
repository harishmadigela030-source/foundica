'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice input with the browser's built-in speech recognition (Chrome, Edge, Safari, Android, iOS).
 * Free and fast: audio is handled by the browser, Foundica's server only receives text.
 * Firefox has no speech recognition, so the mic button hides itself there.
 */
type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecCtor = new () => Rec;

export const LANGS: { code: string; label: string }[] = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'hi-IN', label: 'हिन्दी Hindi' },
  { code: 'te-IN', label: 'తెలుగు Telugu' },
  { code: 'ta-IN', label: 'தமிழ் Tamil' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ Kannada' },
  { code: 'mr-IN', label: 'मराठी Marathi' },
  { code: 'bn-IN', label: 'বাংলা Bengali' },
];
const LANG_KEY = 'foundica.voice.lang';

function ctor(): RecCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow the microphone for this site in your browser settings.',
  'service-not-allowed': 'Microphone access is blocked. Allow the microphone for this site in your browser settings.',
  'audio-capture': 'No microphone was found.',
  network: 'Voice input needs an internet connection.',
  'language-not-supported': 'This language is not supported by your browser. Pick another one.',
};

/**
 * Dictation into a text value. `base` is the text before you started speaking; speech is appended to it,
 * and interim words appear live (like ChatGPT / Claude).
 */
export function useDictation(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [lang, setLangState] = useState('en-IN');
  const rec = useRef<Rec | null>(null);
  const base = useRef('');
  const finalText = useRef('');
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => {
    setSupported(!!ctor());
    try {
      const saved = localStorage.getItem(LANG_KEY);
      const nav = navigator.language || 'en-IN';
      setLangState(saved || (LANGS.some((l) => l.code === nav) ? nav : nav.startsWith('en') ? 'en-IN' : 'en-IN'));
    } catch {
      /* storage blocked */
    }
    return () => rec.current?.abort();
  }, []);

  const setLang = (l: string) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* blocked */
    }
  };

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  const start = useCallback(
    (current: string) => {
      const C = ctor();
      if (!C) return;
      setError('');
      rec.current?.abort();
      const r = new C();
      r.lang = lang;
      r.continuous = true;
      r.interimResults = true;
      base.current = current && !/\s$/.test(current) ? current + ' ' : current;
      finalText.current = '';
      r.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalText.current += res[0].transcript;
          else interim += res[0].transcript;
        }
        cb.current((base.current + finalText.current + interim).replace(/\s+/g, ' ').trimStart());
      };
      r.onerror = (e) => {
        if (e.error !== 'aborted' && e.error !== 'no-speech') setError(ERRORS[e.error] || 'Voice input stopped. Please try again.');
      };
      r.onend = () => {
        setListening(false);
        cb.current((base.current + finalText.current).replace(/\s+/g, ' ').trim());
      };
      rec.current = r;
      try {
        r.start();
        setListening(true);
      } catch {
        setError('Could not start voice input. Please try again.');
      }
    },
    [lang],
  );

  return { supported, listening, error, lang, setLang, start, stop, clearError: () => setError('') };
}

/** Mic button + language menu. Put it inside a text box, next to the send button. */
export function MicButton({ d, value, size = 38 }: { d: ReturnType<typeof useDictation>; value: string; size?: number }) {
  const [menu, setMenu] = useState(false);
  if (!d.supported) return null;
  const label = d.listening ? 'Stop voice input' : `Speak (${LANGS.find((l) => l.code === d.lang)?.label || d.lang})`;
  return (
    <span className="micwrap">
      <button
        type="button"
        className={`micbtn ${d.listening ? 'on' : ''}`}
        style={{ width: size, height: size }}
        aria-label={label}
        title={label}
        aria-pressed={d.listening}
        onClick={() => (d.listening ? d.stop() : d.start(value))}
      >
        {d.listening ? (
          <span className="bars" aria-hidden="true"><i /><i /><i /><i /></span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>
        )}
      </button>
      <button type="button" className="langbtn" aria-label="Voice language" aria-expanded={menu} title="Voice language" onClick={() => setMenu(!menu)}>
        {d.lang.slice(0, 2).toUpperCase()}
      </button>
      {menu ? (
        <span className="langmenu" role="menu">
          {LANGS.map((l) => (
            <button key={l.code} type="button" role="menuitemradio" aria-checked={d.lang === l.code} className={d.lang === l.code ? 'on' : ''} onClick={() => { d.setLang(l.code); setMenu(false); }}>
              {l.label}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}
