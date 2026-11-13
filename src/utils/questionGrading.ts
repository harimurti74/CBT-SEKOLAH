export type NormalizedQuestionType = 'slide_image' | 'mcq' | 'tf' | 'checkbox' | 'matrix' | 'short';

export function normalizeQuestionType(rawType?: string): NormalizedQuestionType {
  const t = String(rawType || '').trim().toUpperCase();
  if (!t || t === 'PG' || t === 'PILIHAN GANDA' || t === 'SLIDE' || t === 'SLIDE_IMAGE' || t === 'MCQ') {
    return 'slide_image';
  }
  if (
    t === 'BS' ||
    t === 'SB' ||
    t === 'TF' ||
    t === 'BENAR SALAH' ||
    t === 'SALAH BENAR' ||
    t === 'BENAR/SALAH' ||
    t === 'SALAH/BENAR'
  ) {
    return 'tf';
  }
  if (
    t === 'MULTI' ||
    t === 'MC' ||
    t === 'CHECKBOX' ||
    t === 'KOMPLEKS' ||
    t === 'MULTI JAWABAN' ||
    t === 'PG KOMPLEKS' ||
    t === 'PGK'
  ) {
    return 'checkbox';
  }
  if (
    t === 'TT' ||
    t === 'TTS' ||
    t === 'TEPAT' ||
    t === 'PERNYATAAN' ||
    t === 'MATRIX' ||
    t === 'TEPAT/TIDAK TEPAT' ||
    t === 'TEPAT TIDAK TEPAT'
  ) {
    return 'matrix';
  }
  if (t === 'ISIAN' || t === 'SHORT' || t === 'URAIAN') {
    return 'short';
  }
  return 'slide_image';
}

export function getTypeTitle(type: NormalizedQuestionType): string {
  switch (type) {
    case 'tf':
      return 'Salah atau Benar';
    case 'checkbox':
      return 'Multi Jawaban';
    case 'matrix':
      return 'Pernyataan Tepat / Tidak Tepat';
    case 'short':
      return 'Isian Singkat';
    case 'mcq':
    case 'slide_image':
    default:
      return 'Pilihan Ganda';
  }
}

export function parseTfKey(raw: string | string[] | undefined): 'BENAR' | 'SALAH' {
  const str = (Array.isArray(raw) ? raw[0] : raw || '').toString().trim().toUpperCase();
  if (str === 'S' || str === 'SALAH' || str === 'F' || str === 'FALSE' || str === 'TIDAK') {
    return 'SALAH';
  }
  return 'BENAR';
}

export function parseMultiKeys(raw: string | string[] | undefined): string[] {
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map(x => String(x).trim().toUpperCase()).filter(Boolean))).sort();
  }
  const str = String(raw || '').trim().toUpperCase();
  if (!str) return [];
  if (/[,;|/\s]+/.test(str)) {
    return Array.from(new Set(str.split(/[,;|/\s]+/).map(s => s.trim()).filter(Boolean))).sort();
  }
  if (/^[A-E]{1,5}$/.test(str)) {
    return Array.from(new Set(str.split(''))).sort();
  }
  return [str];
}

export type MatrixChoice = 'TEPAT' | 'TIDAK TEPAT';

export function parseMatrixKeys(raw: string | string[] | undefined): MatrixChoice[] {
  const mapToken = (tok: string): MatrixChoice => {
    const clean = tok.trim().toUpperCase().replace(/\s+/g, '');
    if (
      clean === 'TT' ||
      clean === 'TIDAKTEPAT' ||
      clean === 'TIDAK' ||
      clean === 'TDK' ||
      clean === 'S' ||
      clean === 'SALAH' ||
      clean === '0' ||
      clean === 'F'
    ) {
      return 'TIDAK TEPAT';
    }
    return 'TEPAT';
  };

  if (Array.isArray(raw)) {
    const items = raw.map(x => mapToken(String(x))).slice(0, 5);
    return items.length > 0 ? items : ['TEPAT', 'TEPAT', 'TEPAT', 'TEPAT', 'TEPAT'];
  }

  const str = String(raw || '').trim().toUpperCase();
  if (!str) return ['TEPAT', 'TEPAT', 'TEPAT', 'TEPAT', 'TEPAT'];

  if (/[,;|/-]+/.test(str)) {
    const parts = str.split(/[,;|/-]+/).map(s => s.trim()).filter(Boolean).slice(0, 5);
    if (parts.length > 0) return parts.map(mapToken);
  }

  if (/^[BTST]{2,5}$/.test(str)) {
    return str.split('').slice(0, 5).map(mapToken);
  }

  return [mapToken(str)];
}

export function gradeQuestionAnswer(
  type: string,
  userAns: string | string[] | undefined,
  correctKey: string | string[] | undefined,
  maxPoints: number
): { scoreEarned: number; isCorrect: boolean } {
  const pts = Number(maxPoints) || 10;
  const norm = normalizeQuestionType(type);

  if (norm === 'tf') {
    const expected = parseTfKey(correctKey);
    const actual = userAns ? parseTfKey(userAns) : '';
    const isCorrect = !!userAns && actual === expected;
    return { scoreEarned: isCorrect ? pts : 0, isCorrect };
  }

  if (norm === 'checkbox') {
    const expected = parseMultiKeys(correctKey);
    const actual = Array.isArray(userAns) ? userAns.map(x => String(x).trim().toUpperCase()) : parseMultiKeys(userAns);
    if (expected.length === 0 || actual.length === 0) {
      return { scoreEarned: 0, isCorrect: false };
    }
    let matches = 0;
    actual.forEach(k => {
      if (expected.includes(k)) matches++;
      else matches--;
    });
    matches = Math.max(0, matches);
    const ratio = matches / expected.length;
    const scoreEarned = Math.round(pts * ratio);
    const isCorrect = ratio >= 0.99 && actual.length === expected.length;
    return { scoreEarned, isCorrect };
  }

  if (norm === 'matrix') {
    const expected = parseMatrixKeys(correctKey);
    const actual = Array.isArray(userAns) ? userAns : [];
    if (expected.length === 0 || actual.length === 0) {
      return { scoreEarned: 0, isCorrect: false };
    }
    let correctCount = 0;
    expected.forEach((expVal, idx) => {
      const uVal = String(actual[idx] || '').trim().toUpperCase();
      if (uVal && (uVal === expVal || (uVal === 'T' && expVal === 'TEPAT') || (uVal === 'TT' && expVal === 'TIDAK TEPAT'))) {
        correctCount++;
      }
    });
    const ratio = correctCount / expected.length;
    const scoreEarned = Math.round(pts * ratio);
    return { scoreEarned, isCorrect: correctCount === expected.length };
  }

  if (norm === 'short') {
    const u = String(userAns || '').trim().toLowerCase().replace(/[^\w\s]/gi, '');
    const k = String(Array.isArray(correctKey) ? correctKey[0] : correctKey || '').trim().toLowerCase().replace(/[^\w\s]/gi, '');
    if (!u || !k) return { scoreEarned: 0, isCorrect: false };
    if (u === k) return { scoreEarned: pts, isCorrect: true };
    if (u.includes(k) || k.includes(u)) return { scoreEarned: Math.round(pts * 0.9), isCorrect: true };
    return { scoreEarned: 0, isCorrect: false };
  }

  // MCQ / Slide Image
  const expected = String(Array.isArray(correctKey) ? correctKey[0] : correctKey || 'A').trim().toUpperCase();
  const actual = String(Array.isArray(userAns) ? userAns[0] : userAns || '').trim().toUpperCase();
  const isCorrect = !!actual && actual === expected;
  return { scoreEarned: isCorrect ? pts : 0, isCorrect };
}

export function formatScheduleId(isoStr?: string): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
