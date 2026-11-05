import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AppConfig, 
  ClientQuestion, 
  ScoreBreakdownItem 
} from '../types';
import { 
  BookOpen, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  ShieldAlert, 
  Check, 
  X, 
  Maximize2, 
  Minimize2, 
  Lock,
  CloudCheck,
  GraduationCap,
  ArrowRight
} from 'lucide-react';

interface Props {
  config: AppConfig;
  onExamComplete?: () => void;
}

export const StudentExamEngine: React.FC<Props> = ({ config }) => {
  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [noPeserta, setNoPeserta] = useState('');
  const [selectedMapel, setSelectedMapel] = useState(config.mapels[0] || 'Bahasa Inggris');
  const [selectedKelas, setSelectedKelas] = useState(config.kelas[0] || 'X-1');
  const [inputToken, setInputToken] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Check URL Parameters for Unique Link Auto-Fill (Requirement 6 & Poin 1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramMapel = params.get('mapel');
    const paramKelas = params.get('kelas');
    const paramToken = params.get('token');

    // If 'all' or empty, let student freely pick from dropdown
    if (paramMapel && paramMapel !== 'all' && paramMapel !== 'ALL' && config.mapels.includes(paramMapel)) {
      setSelectedMapel(paramMapel);
    }
    if (paramKelas && paramKelas !== 'all' && paramKelas !== 'ALL' && config.kelas.includes(paramKelas)) {
      setSelectedKelas(paramKelas);
    }
    if (paramToken) {
      setInputToken(paramToken.toUpperCase());
    }
  }, [config]);

  // Keep state synced with config updates
  useEffect(() => {
    if (!selectedMapel && config.mapels.length > 0) setSelectedMapel(config.mapels[0]);
    if (!selectedKelas && config.kelas.length > 0) setSelectedKelas(config.kelas[0]);
  }, [config, selectedMapel, selectedKelas]);

  // Exam State
  const [assignedPackage, setAssignedPackage] = useState<string>('Paket A');
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [doubtMap, setDoubtMap] = useState<Record<number, boolean>>({});
  const [showPassage, setShowPassage] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [timeRemaining, setTimeRemaining] = useState(config.durationMinutes * 60);
  const [violationsCount, setViolationsCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Submission Result State
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalResult, setFinalResult] = useState<{
    score: number;
    totalEarned: number;
    totalMax: number;
    breakdown: ScoreBreakdownItem[];
    gdriveDestination: string;
  } | null>(null);

  // Handle Student Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/exam/verify-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inputToken,
          studentName: studentName.trim().toUpperCase(),
          noPeserta: noPeserta.trim(),
          className: selectedKelas,
          subject: selectedMapel
        })
      });

      const data = await res.json();
      if (!data.success) {
        setLoginError(data.message || 'Login gagal, periksa TOKEN dari pengawas.');
        setLoginLoading(false);
        return;
      }

      if (data.assignedPackage) {
        setAssignedPackage(data.assignedPackage);
      }

      // Fetch Questions with noPeserta for locked variant (WITHOUT KEYS - ZERO KNOWLEDGE ARCHITECTURE)
      const qRes = await fetch(
        `/api/exam/questions?subject=${encodeURIComponent(selectedMapel)}&noPeserta=${encodeURIComponent(noPeserta.trim())}`
      );
      const qData = await qRes.json();

      if (qData.success && qData.questions) {
        if (qData.questions.length === 0) {
          setLoginError(`Bank soal untuk mata pelajaran "${selectedMapel}" belum diunggah oleh guru. Silakan hubungi proktor.`);
          setLoginLoading(false);
          return;
        }
        setQuestions(qData.questions);
        if (qData.meta?.assignedPackage) {
          setAssignedPackage(qData.meta.assignedPackage);
        }
        setIsLoggedIn(true);
        setTimeRemaining(config.durationMinutes * 60);
        setViolationsCount(0);
        setIsSubmitted(false);
        setFinalResult(null);
      } else {
        setLoginError(qData.message || 'Gagal memuat bank soal dari server');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Koneksi ke server CBT terputus');
    } finally {
      setLoginLoading(false);
    }
  };

  // Anti-Cheating Violation Trigger
  const triggerViolation = useCallback((reason: string) => {
    if (!isLoggedIn || isSubmitted) return;

    setViolationsCount(prev => {
      const nextVal = prev + 1;
      setWarningMessage(reason);
      setShowWarningModal(true);

      if (nextVal >= config.maxViolations) {
        setTimeout(() => {
          submitExamToServer(true);
        }, 1500);
      }
      return nextVal;
    });
  }, [isLoggedIn, isSubmitted, config.maxViolations]);

  // Window Focus / Tab-Switch Detection
  useEffect(() => {
    if (!isLoggedIn || isSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('Anda terdeteksi berpindah TAB atau meminimalkan browser!');
      }
    };

    const handleBlur = () => {
      triggerViolation('Jendela ujian kehilangan fokus (membuka aplikasi lain)!');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isLoggedIn, isSubmitted, triggerViolation]);

  // Timer Countdown
  useEffect(() => {
    if (!isLoggedIn || isSubmitted) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          submitExamToServer(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn, isSubmitted]);

  // Submit Exam (Server-Side Grading)
  const submitExamToServer = async (isForced = false) => {
    setShowFinishConfirm(false);
    setShowWarningModal(false);

    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          noPeserta,
          className: selectedKelas,
          subject: selectedMapel,
          answers,
          violationsCount,
          isForcedCheating: isForced
        })
      });

      const data = await res.json();
      if (data.success) {
        setFinalResult({
          score: data.score,
          totalEarned: data.totalEarned,
          totalMax: data.totalMax,
          breakdown: data.breakdown,
          gdriveDestination: data.gdriveDestination
        });
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Gagal mengirim jawaban ke server. Harap panggil pengawas.');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentQ = questions[currentIndex];

  const handleSelectMCQ = (opt: string) => {
    if (!currentQ) return;
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: prev[currentQ.id] === opt ? '' : opt
    }));
  };

  const handleSelectTF = (val: 'BENAR' | 'SALAH') => {
    if (!currentQ) return;
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: prev[currentQ.id] === val ? '' : val
    }));
  };

  const handleToggleCheckbox = (opt: string) => {
    if (!currentQ) return;
    const current = Array.isArray(answers[currentQ.id]) ? (answers[currentQ.id] as string[]) : [];
    const updated = current.includes(opt)
      ? current.filter(x => x !== opt)
      : [...current, opt].sort();

    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: updated
    }));
  };

  const handleInputShort = (val: string) => {
    if (!currentQ) return;
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: val
    }));
  };

  const toggleDoubt = () => {
    if (!currentQ) return;
    setDoubtMap(prev => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id]
    }));
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter(val => {
      if (!val) return false;
      if (Array.isArray(val)) return val.length > 0;
      return String(val).trim() !== '';
    }).length;
  }, [answers]);

  // ==========================================
  // VIEW 1: LOGIN SCREEN (EXACTLY LIKE IMAGE_A29D47C0.PNG)
  // ==========================================
  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-[#0c1322]">
        <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 text-white relative">
          
          {/* Header Icon & Manual Title */}
          <div className="text-center space-y-1.5 border-b border-slate-700/60 pb-5">
            <div className="w-12 h-12 bg-sky-500/20 text-sky-400 rounded-2xl flex items-center justify-center mx-auto text-xl mb-3 border border-sky-400/30 shadow-inner">
              <GraduationCap className="w-6 h-6" />
            </div>
            
            {/* Manual Assessment / Exam Title (Requirement 3) */}
            <h2 className="text-base sm:text-lg font-bold text-slate-100 uppercase tracking-wide">
              {config.appTitle || 'SIMULASI UJIAN CBT SLIDE'}
            </h2>
            
            <p className="text-xs text-slate-400">
              Masukan data diri Anda dengan benar sebelum memulai ujian.
            </p>

            {/* School Single Display (Requirement 2 & 4: Only 1 school shown, completely private from other schools) */}
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-sky-400 font-mono bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-800/80">
                {config.schoolName || 'SMA Negeri 1 Teladan'}
              </span>
            </div>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold text-slate-300">
            {/* Nama Lengkap (Huruf Kapital) */}
            <div>
              <label className="block mb-1.5 text-slate-300">
                Nama Lengkap (Huruf Kapital):
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={e => setStudentName(e.target.value.toUpperCase())}
                placeholder="CONTOH: BUDI SANTOSO"
                className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider focus:outline-none focus:border-sky-500 placeholder:text-slate-600"
              />
            </div>

            {/* No. Peserta / Nomor Absen */}
            <div>
              <label className="block mb-1.5 text-slate-300">
                No. Peserta / Nomor Absen:
              </label>
              <input
                type="text"
                required
                value={noPeserta}
                onChange={e => setNoPeserta(e.target.value)}
                placeholder="Contoh: 20261099 atau Absen 12"
                className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500 placeholder:text-slate-600"
              />
            </div>

            {/* Grid 2 cols: Pilih Mapel & Pilih Kelas (Requirement 5) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5 text-slate-300">
                  Pilih Mapel:
                </label>
                <select
                  value={selectedMapel}
                  onChange={e => setSelectedMapel(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                >
                  {config.mapels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1.5 text-slate-300">
                  Pilih Kelas:
                </label>
                <select
                  value={selectedKelas}
                  onChange={e => setSelectedKelas(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                >
                  {config.kelas.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* TOKEN Ujian dari Guru */}
            <div>
              <label className="block mb-1.5 text-slate-300">
                TOKEN Ujian dari Guru:
              </label>
              <input
                type="text"
                required
                value={inputToken}
                onChange={e => setInputToken(e.target.value.toUpperCase())}
                placeholder="MASUKKAN TOKEN SOAL..."
                className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-black tracking-widest text-emerald-400 uppercase focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition shadow flex items-center justify-center gap-2 text-xs"
              >
                {loginLoading ? (
                  <span>Menghubungi Server CBT...</span>
                ) : (
                  <>
                    <span>MASUK & MULAI UJIAN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: POST-SUBMISSION RESULTS
  // ==========================================
  if (isSubmitted && finalResult) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 text-white">
          <div className="text-center space-y-2 border-b border-slate-700/60 pb-6">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold border border-emerald-400/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-100">
              Ujian Selesai & Jawaban Tersimpan di Server
            </h2>
            <p className="text-xs text-slate-400">
              Peserta: <strong className="text-white">{studentName}</strong> ({noPeserta}) · {selectedKelas}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nilai Akhir (Skala 100)</div>
              <div className="text-4xl font-extrabold text-amber-300 font-mono mt-1">{finalResult.score}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Poin Diperoleh</div>
              <div className="text-4xl font-extrabold text-emerald-400 font-mono mt-1">{finalResult.totalEarned} / {finalResult.totalMax}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pelanggaran</div>
              <div className="text-4xl font-extrabold text-rose-400 font-mono mt-1">{violationsCount}x</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-start gap-3">
            <CloudCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-white">Tersimpan ke Folder Google Drive Sekolah:</div>
              <div className="font-mono text-[11px] text-emerald-300 break-all">{finalResult.gdriveDestination}</div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setIsSubmitted(false);
                setAnswers({});
                setDoubtMap({});
              }}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition shadow"
            >
              Kembali ke Laman Login Siswa
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: ACTIVE EXAM INTERFACE (CBT SLIDE VIEW)
  // ==========================================
  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 gap-3 bg-[#0c1322] text-slate-100 select-none">
      
      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative shadow-lg">
        
        {/* Top Question Toolbar */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-3 py-1 rounded-lg font-bold">
              Soal No. {currentIndex + 1} <span className="font-normal text-slate-400">/ {questions.length}</span>
            </span>
            <span className="bg-purple-950/80 text-purple-300 border border-purple-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
              {assignedPackage} (Terkunci)
            </span>
            {currentQ?.assignedVariantCode && (
              <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded text-[10px] font-mono">
                Slide: {currentQ.slideFileName || currentQ.questionCode}
              </span>
            )}
            <span className="text-slate-300 font-semibold text-[11px] hidden sm:inline">
              Tipe: <strong className="text-white">{currentQ?.typeTitle || 'Pilihan Ganda'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentQ?.passage && (
              <button
                onClick={() => setShowPassage(prev => !prev)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                  showPassage
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{showPassage ? 'Tutup Wacana' : 'Buka Teks Wacana'}</span>
              </button>
            )}

            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.15))}
                className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
                title="Perkecil"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[11px] text-slate-300">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.15))}
                className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
                title="Perbesar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1.0)}
                className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                title="Reset Ukuran"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg"
              title="Layar Penuh"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Center Canvas Area (Slide Viewport with Dynamic Watermark) */}
        <div className="flex-1 flex overflow-hidden relative bg-slate-950">
          
          {showPassage && currentQ?.passage && (
            <div className="w-full md:w-5/12 bg-amber-50 text-slate-900 border-r border-amber-300 p-4 overflow-y-auto select-text shadow-xl z-10 space-y-3 font-serif text-xs leading-relaxed">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <span className="font-bold text-amber-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                  <span>Wacana Bacaan Soal</span>
                </span>
                <button
                  onClick={() => setShowPassage(false)}
                  className="text-amber-800 hover:text-amber-950 text-xs font-semibold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div 
                dangerouslySetInnerHTML={{ __html: currentQ.passage }}
                className="space-y-2 text-slate-800"
              />
            </div>
          )}

          <div className="flex-1 relative overflow-auto p-4 flex items-center justify-center">
            <div 
              style={{ transform: `scale(${zoomLevel})` }}
              className="transition-transform duration-150 origin-center max-w-full max-h-full relative shadow-2xl rounded-xl overflow-hidden bg-white text-slate-900 border border-slate-200"
            >
              {/* Dynamic Forensic Watermark to Prevent Mobile Camera Leaks */}
              <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-around items-center opacity-12 rotate-[-15deg] select-none text-center">
                <div className="font-mono text-xs md:text-sm font-bold text-slate-900 uppercase tracking-widest">
                  {studentName} · {noPeserta} · {config.schoolName}
                </div>
                <div className="font-mono text-xs md:text-sm font-bold text-slate-900 uppercase tracking-widest">
                  CBT RESMI {new Date().toLocaleDateString('id-ID')} · {selectedKelas} · DILARANG MEMOTRET
                </div>
              </div>

              {/* Rendered Slide Content */}
              <div className="w-[820px] min-h-[460px] p-8 flex flex-col justify-between bg-white text-slate-900">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                      <span>{config.schoolName}</span>
                      <span>·</span>
                      <span className="text-sky-700 font-bold">{currentQ?.subject}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      Slide Soal #{currentIndex + 1}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {currentQ?.questionText}
                    </h3>
                  </div>

                  {currentQ?.options && currentQ.options.length > 0 && currentQ.type !== 'tf' && (
                    <div className="space-y-2 pt-2">
                      {currentQ.options.map((opt, oIdx) => {
                        const optLetter = String.fromCharCode(65 + oIdx);
                        return (
                          <div 
                            key={oIdx}
                            className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 flex items-start gap-2.5"
                          >
                            <span className="font-bold text-slate-900 bg-white border border-slate-300 w-5 h-5 rounded flex items-center justify-center shrink-0">
                              {optLetter}
                            </span>
                            <span className="font-medium pt-0.5">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{config.appTitle}</span>
                  <span>Peserta: {studentName} ({noPeserta})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Answer Input Controls & Navigation */}
        <div className="bg-slate-950 border-t border-slate-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-400 hidden sm:inline">Pilihan Jawaban:</span>

            {currentQ?.type === 'mcq' && (
              <div className="flex items-center gap-1.5">
                {['A', 'B', 'C', 'D', 'E'].map(opt => {
                  const isSelected = answers[currentQ.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectMCQ(opt)}
                      className={`w-9 h-9 rounded-xl font-bold text-xs transition border ${
                        isSelected
                          ? 'bg-sky-500 text-slate-950 border-sky-400 shadow font-black'
                          : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQ?.type === 'tf' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectTF('BENAR')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                    answers[currentQ.id] === 'BENAR'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow font-black'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>BENAR</span>
                </button>
                <button
                  onClick={() => handleSelectTF('SALAH')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                    answers[currentQ.id] === 'SALAH'
                      ? 'bg-rose-500 text-white border-rose-400 shadow font-black'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>SALAH</span>
                </button>
              </div>
            )}

            {currentQ?.type === 'short' && (
              <div className="flex items-center gap-2 flex-1 sm:w-64">
                <input
                  type="text"
                  placeholder="Ketik jawaban singkat di sini..."
                  value={(answers[currentQ.id] as string) || ''}
                  onChange={e => handleInputShort(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            {currentQ?.type === 'checkbox' && (
              <div className="flex items-center gap-1.5">
                {['A', 'B', 'C', 'D', 'E'].map(opt => {
                  const arr = Array.isArray(answers[currentQ.id]) ? (answers[currentQ.id] as string[]) : [];
                  const isChecked = arr.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => handleToggleCheckbox(opt)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <button
              onClick={toggleDoubt}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                doubtMap[currentQ?.id]
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-900 text-amber-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <span>Ragu-Ragu</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1 shadow"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowFinishConfirm(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Jawaban</span>
              </button>
            )}
          </div>

        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-full lg:w-72 bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-between gap-4 shrink-0 shadow-lg">
        <div className="space-y-4">
          
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white truncate">{studentName}</span>
              <span className="font-mono text-[10px] text-sky-400 bg-sky-950 border border-sky-800 px-1.5 py-0.5 rounded">
                {selectedKelas}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              No: <strong className="text-slate-300">{noPeserta}</strong> · {selectedMapel}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Sisa:</span>
                </div>
                <div className="font-mono font-bold text-xs text-amber-400 mt-0.5">
                  {formatTime(timeRemaining)}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  <span>Langgar:</span>
                </div>
                <div className="font-mono font-bold text-xs text-rose-400 mt-0.5">
                  {violationsCount} / {config.maxViolations}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <span className="font-bold text-slate-300">Peta Soal Ujian</span>
              <span className="text-[11px] font-mono text-slate-400">
                {answeredCount} / {questions.length} Terjawab
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const hasAnswer = answers[q.id] !== undefined && answers[q.id] !== '' && (!Array.isArray(answers[q.id]) || (answers[q.id] as string[]).length > 0);
                const isDoubt = doubtMap[q.id];

                let bgClass = 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700';
                if (isDoubt) bgClass = 'bg-amber-500 text-slate-950 font-bold border-amber-400';
                else if (hasAnswer) bgClass = 'bg-emerald-600 text-white font-bold border-emerald-500';

                if (isCurrent) bgClass += ' ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900';

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl text-xs font-bold border transition flex items-center justify-center ${bgClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        <div className="space-y-3 pt-2 border-t border-slate-800 text-[11px]">
          <button
            onClick={() => setShowFinishConfirm(true)}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Selesai & Kirim Ujian</span>
          </button>
        </div>
      </aside>

      {/* CONFIRMATION MODAL */}
      {showFinishConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl text-white">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-xl">
              <Send className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Kirim Lembar Jawaban Sekarang?</h3>
              <p className="text-xs text-slate-400">
                Jawaban Anda akan dikoreksi di server {config.schoolName} dan nilainya dihitung otomatis.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px]">Terjawab:</span>
                <div className="font-bold text-emerald-400 text-sm">{answeredCount} Soal</div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">Belum Diisi:</span>
                <div className="font-bold text-slate-300 text-sm">{questions.length - answeredCount} Soal</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
              >
                Periksa Kembali
              </button>
              <button
                onClick={() => submitExamToServer(false)}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow"
              >
                Ya, Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANTI-CHEATING WARNING MODAL */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-rose-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl text-white">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-rose-400 uppercase tracking-wide">Peringatan Anti-Kecurangan!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {warningMessage}
              </p>
            </div>

            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs space-y-1">
              <div className="font-bold text-rose-300">
                Jumlah Pelanggaran: <span className="font-mono text-base text-rose-400">{violationsCount}</span> / {config.maxViolations}
              </div>
              <p className="text-[10px] text-slate-400">
                Jika mencapai batas toleransi ({config.maxViolations}x), ujian Anda akan di-submit paksa oleh server.
              </p>
            </div>

            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow"
            >
              Saya Mengerti & Kembali Ujian
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
