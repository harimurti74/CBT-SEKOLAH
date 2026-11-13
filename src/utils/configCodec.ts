import { AppConfig } from '../types';

export function encodeConfigForUrl(cfg: AppConfig): string {
  try {
    const compact = {
      eid: cfg.examId || '',
      t: cfg.appTitle,
      s: cfg.schoolName,
      l: cfg.schoolLevel || 'SMA/MA/SMK/MAK',
      v: cfg.verificationMode || 'crosscheck',
      m: cfg.mapels,
      k: cfg.kelas,
      d: cfg.durationMinutes,
      x: cfg.maxViolations,
      q: cfg.shuffleQuestions,
      tk: cfg.token,
      se: Boolean(cfg.scheduleEnabled),
      ss: cfg.scheduleStart || '',
      snd: cfg.scheduleEnd || ''
    };
    const json = JSON.stringify(compact);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return '';
  }
}

export function decodeConfigFromUrl(encoded: string | null): Partial<AppConfig> | null {
  try {
    if (!encoded) return null;
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const c = JSON.parse(json);
    if (!c || typeof c !== 'object') return null;

    const result: Partial<AppConfig> = {};
    if (typeof c.eid === 'string' && c.eid.trim()) result.examId = c.eid.trim();
    if (typeof c.t === 'string' && c.t.trim()) result.appTitle = c.t;
    if (typeof c.s === 'string' && c.s.trim()) result.schoolName = c.s;
    if (c.l) result.schoolLevel = c.l;
    if (c.v) result.verificationMode = c.v === 'manual' ? 'manual' : 'crosscheck';
    if (Array.isArray(c.m) && c.m.length > 0) result.mapels = c.m;
    if (Array.isArray(c.k) && c.k.length > 0) result.kelas = c.k;
    if (typeof c.d === 'number' && c.d > 0) result.durationMinutes = c.d;
    if (typeof c.x === 'number' && c.x >= 0) result.maxViolations = c.x;
    if (typeof c.q === 'boolean') result.shuffleQuestions = c.q;
    if (typeof c.tk === 'string' && c.tk.trim()) result.token = c.tk;
    if (typeof c.g === 'string') result.gdriveUrl = c.g;
    if (typeof c.se === 'boolean') result.scheduleEnabled = c.se;
    if (typeof c.ss === 'string') result.scheduleStart = c.ss;
    if (typeof c.snd === 'string') result.scheduleEnd = c.snd;
    return result;
  } catch (e) {
    return null;
  }
}
