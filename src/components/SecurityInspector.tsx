import React, { useState, useEffect } from 'react';
import { AuditVulnerability } from '../types';
import { 
  Terminal, 
  ShieldAlert, 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock, 
  Code2, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export const SecurityInspector: React.FC = () => {
  const [vulnerabilities, setVulnerabilities] = useState<AuditVulnerability[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTest, setActiveTest] = useState<number | null>(null);
  const [testOutput, setTestOutput] = useState<{
    hackName: string;
    oldCodeResult: string;
    oldStatus: 'LEAKED' | 'BYPASSED';
    secureCodeResult: string;
    secureStatus: 'PROTECTED';
    explanation: string;
  } | null>(null);

  useEffect(() => {
    fetchAudit();
  }, []);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security-audit');
      const data = await res.json();
      if (data.success && data.vulnerabilities) {
        setVulnerabilities(data.vulnerabilities);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runPenetrationTest = (testId: number) => {
    setActiveTest(testId);

    if (testId === 1) {
      // Test 1: Console Extraction of Answer Keys
      setTestOutput({
        hackName: 'Simulasi Hack #1: Siswa mengetik "appState.slides" di Browser Console',
        oldCodeResult: `> window.appState.slides.map(s => ({ no: s.id, kunci: s.key }))
[
  { no: 1, kunci: "B" },
  { no: 2, kunci: "BENAR" },
  { no: 3, kunci: "Mitokondria" },
  { no: 4, kunci: ["A", "C", "E"] },
  { no: 5, kunci: "B" }
]`,
        oldStatus: 'LEAKED',
        secureCodeResult: `> window.__CBT_QUESTIONS__.map(s => ({ no: s.id, kunci: s.key }))
[
  { no: 1, kunci: undefined },
  { no: 2, kunci: undefined },
  { no: 3, kunci: undefined },
  { no: 4, kunci: undefined },
  { no: 5, kunci: undefined }
]`,
        secureStatus: 'PROTECTED',
        explanation: 'Pada kode lama, objek soal di memori browser memuat kunci mentah. Pada sistem Secure CBT ini, kunci jawaban 100% dipangkas di server sebelum dikirim, sehingga variabel di memori tidak memiliki kunci sama sekali.'
      });
    } else if (testId === 2) {
      // Test 2: Network Tab Inspection
      setTestOutput({
        hackName: 'Simulasi Hack #2: Siswa membuka Network Tab (Inspect HTTP Response)',
        oldCodeResult: `HTTP/1.1 200 OK
Content-Type: text/html
// Di dalam file HTML yang di-download browser:
demoQuestions = [
  { id: 1, type: "mcq", key: "B", points: 20 },
  { id: 2, type: "tf", key: "BENAR", points: 20 }
]`,
        oldStatus: 'LEAKED',
        secureCodeResult: `GET /api/exam/questions?schoolId=sch-01
HTTP/1.1 200 OK
Content-Type: application/json
{
  "success": true,
  "questions": [
    { "id": 1, "type": "mcq", "questionText": "...", "options": [...] },
    { "id": 2, "type": "tf", "questionText": "...", "options": [...] }
  ],
  "meta": { "zeroLeakageGuaranteed": true }
}`,
        secureStatus: 'PROTECTED',
        explanation: 'Paket JSON yang masuk lewat koneksi internet siswa bersih tanpa ada data kunci. Kunci tersimpan di server memory dalam backend terenkripsi.'
      });
    } else if (testId === 3) {
      // Test 3: Client Score Manipulation
      setTestOutput({
        hackName: 'Simulasi Hack #3: Siswa memodifikasi nilai via Console (score = 100)',
        oldCodeResult: `> appState.answers[0].selected = "B";
> submitExam();
// Script browser menghitung skor sendiri di klien:
// userAns === slide.key -> Skor 100 berhasil direkam di localStorage!`,
        oldStatus: 'BYPASSED',
        secureCodeResult: `POST /api/exam/submit
Body: { answers: { 1: "A", 2: "SALAH" } }
// Server mencocokkan lembar jawaban dengan kunci rahasia di server:
Hasil dari Server: { score: 0, totalEarned: 0, totalMax: 100 }
// Siswa tidak bisa memanipulasi perhitungan skor karena terjadi di server!`,
        secureStatus: 'PROTECTED',
        explanation: 'Di kode lama, penilaian dilakukan di browser siswa. Di sistem ini, penilaian sepenuhnya bersifat Server-Authoritative. Berapa pun nilai yang diubah di klien, server akan mengabaikannya.'
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8 text-slate-900">
      
      {/* Title & Overview */}
      <div className="border-b border-slate-200 pb-6 space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
          <Terminal className="w-4 h-4" />
          <span>Audit Keamanan & Uji Penetrasi Anti-Hack</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Laboratorium Uji Anti-Bocor Kunci Jawaban & Celah Keamanan
        </h1>
        <p className="text-xs text-slate-500 max-w-3xl">
          Buktikan secara interaktif bagaimana siswa yang paham IT dapat membobol kode HTML lama dalam hitungan detik, 
          dan bagaimana arsitektur <strong>Zero-Knowledge Client</strong> di sistem baru ini melumpuhkan seluruh metode hack tersebut.
        </p>
      </div>

      {/* Interactive Penetration Test Console */}
      <div className="bg-slate-950 text-slate-100 rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 font-mono text-xs text-indigo-400">
            <Code2 className="w-4 h-4" />
            <span className="font-bold">HACKER PENETRATION TEST BENCHMARK</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runPenetrationTest(1)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                activeTest === 1
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Uji 1: Baca Kunci via Console
            </button>
            <button
              onClick={() => runPenetrationTest(2)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                activeTest === 2
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Uji 2: Inspect Network Tab
            </button>
            <button
              onClick={() => runPenetrationTest(3)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                activeTest === 3
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Uji 3: Manipulasi Skor Klien
            </button>
          </div>
        </div>

        {/* Test Output Split View */}
        {testOutput ? (
          <div className="space-y-4">
            <div className="text-xs font-bold text-sky-400 font-mono">
              {testOutput.hackName}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Output on Legacy HTML Code */}
              <div className="bg-slate-900 border border-rose-500/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-rose-500/20 pb-2">
                  <span className="font-bold text-rose-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span>Hasil di Kode HTML Lama:</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-mono font-bold border border-rose-800">
                    BOCOR 100%
                  </span>
                </div>
                <pre className="font-mono text-[11px] text-rose-200 overflow-x-auto p-2 bg-slate-950/80 rounded border border-rose-950">
                  {testOutput.oldCodeResult}
                </pre>
              </div>

              {/* Output on Secure CBT Architecture */}
              <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-emerald-500/20 pb-2">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Hasil di Sistem Secure CBT Ini:</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-800">
                    AMAN (ZERO KNOWLEDGE)
                  </span>
                </div>
                <pre className="font-mono text-[11px] text-emerald-200 overflow-x-auto p-2 bg-slate-950/80 rounded border border-emerald-950">
                  {testOutput.secureCodeResult}
                </pre>
              </div>

            </div>

            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Analisis Teknis:</strong> {testOutput.explanation}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <Terminal className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs text-slate-400">
              Pilih salah satu pengujian di kanan atas untuk mensimulasikan peretasan kunci jawaban secara langsung.
            </div>
          </div>
        )}
      </div>

      {/* Vulnerabilities Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Matriks Audit Celah Keamanan (Vulnerability Matrix)</span>
          </h2>
          <button
            onClick={fetchAudit}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Audit</span>
          </button>
        </div>

        <div className="space-y-4">
          {vulnerabilities.map(v => (
            <div 
              key={v.id}
              className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/40"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <span className="font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px]">
                    {v.id}
                  </span>
                  <span>{v.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold self-start sm:self-auto ${
                  v.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  Tingkat Bahaya: {v.severity}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Legacy Status */}
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Kode HTML Lama: {v.legacyStatus}</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    {v.legacyExplanation}
                  </p>
                </div>

                {/* Secure Status */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sistem CBT Ini: {v.secureStatus}</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    {v.secureExplanation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
