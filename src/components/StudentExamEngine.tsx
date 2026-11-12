import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AppConfig, 
  ClientQuestion, 
  ScoreBreakdownItem,
  StudentSubmission
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
  ArrowRight,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';

interface Props {
  config: AppConfig;
  onExamComplete?: () => void;
}

export const StudentExamEngine: React.FC<Props> = ({ config }) => {
  // Safe Fallback for Mapels and Kelas
  const safeMapels = useMemo(() => {
    return Array.isArray(config?.mapels) && config.mapels.length > 0 
      ? config.mapels 
      : ['Bahasa Inggris', 'Biologi', 'Fisika', 'Matematika', 'Kimia', 'TIK'];
  }, [config?.mapels]);

  const safeKelas = useMemo(() => {
    return Array.isArray(config?.kelas) && config.kelas.length > 0 
      ? config.kelas 
      : ['X-1', 'X-2', 'XI-IPA-1', 'XI-IPA-2', 'XII-MIPA', '12A', '12B'];
  }, [config?.kelas]);

  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [noPeserta, setNoPeserta] = useState('');
  const [selectedMapel, setSelectedMapel] = useState(safeMapels[0] || 'Bahasa Inggris');
  const [selectedKelas, setSelectedKelas] = useState(safeKelas[0] || 'X-1');
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
    if (paramMapel && paramMapel !== 'all' && paramMapel !== 'ALL' && safeMapels.includes(paramMapel)) {
      setSelectedMapel(paramMapel);
    }
    if (paramKelas && paramKelas !== 'all' && paramKelas !== 'ALL' && safeKelas.includes(paramKelas)) {
      setSelectedKelas(paramKelas);
    }
    if (paramToken) {
      setInputToken(paramToken.toUpperCase());
    }
  }, [config, safeMapels, safeKelas]);

  // Keep state synced with config updates: if current selection is invalid, reset to first valid option
  useEffect(() => {
    if (safeMapels.length > 0 && (!selectedMapel || !safeMapels.includes(selectedMapel))) {
      setSelectedMapel(safeMapels[0]);
    }
    if (safeKelas.length > 0 && (!selectedKelas || !safeKelas.includes(selectedKelas))) {
      setSelectedKelas(safeKelas[0]);
    }
  }, [safeMapels, safeKelas, selectedMapel, selectedKelas]);

  // Exam State
  const [assignedPackage, setAssignedPackage] = useState<string>('Paket A');
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [doubtMap, setDoubtMap] = useState<Record<number, boolean>>({});
  const [showPassage, setShowPassage] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullWidthSlide, setIsFullWidthSlide] = useState(false);
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

  // Handle Student Login (Hybrid: Server API with Client-Side Fallback for GitHub Pages & Vercel)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const cleanName = studentName.trim().toUpperCase();
    const cleanNo = noPeserta.trim();
    const cleanToken = inputToken.trim().toUpperCase();
    const cleanSubj = selectedMapel.trim();

    try {
      // 1. Attempt connection to Server API
      let serverAvailable = false;
      let data: any = null;

      try {
        const res = await fetch('/api/exam/verify-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: cleanToken,
            studentName: cleanName,
            noPeserta: cleanNo,
            className: selectedKelas,
            subject: cleanSubj
          })
        });

        // If server responded with JSON (including 401, 403, 200)
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await res.json();
          serverAvailable = true;
        } else if (res.ok) {
          try {
            data = await res.json();
            serverAvailable = true;
          } catch (_) {
            serverAvailable = false;
          }
        }
      } catch (networkErr) {
        // Network failure or static host without backend
        serverAvailable = false;
      }

      // If Server is ONLINE and processed request:
      if (serverAvailable && data) {
        if (!data.success) {
          setLoginError(data.message || 'Login gagal, periksa TOKEN dari pengawas.');
          setLoginLoading(false);
          return;
        }

        if (data.assignedPackage) {
          setAssignedPackage(data.assignedPackage);
        }

        // Fetch Questions from server
        try {
          const qRes = await fetch(
            `/api/exam/questions?subject=${encodeURIComponent(cleanSubj)}&noPeserta=${encodeURIComponent(cleanNo)}`
          );
          const qData = await qRes.json();

          if (qData.success && qData.questions && qData.questions.length > 0) {
            setQuestions(qData.questions);
            if (qData.meta?.assignedPackage) {
              setAssignedPackage(qData.meta.assignedPackage);
            }
            if (data.isResuming && data.savedAnswers) {
              setAnswers(data.savedAnswers);
              setViolationsCount(data.violationsCount || 0);
            } else {
              setAnswers({});
              setViolationsCount(0);
            }

            setIsLoggedIn(true);
            setTimeRemaining(config.durationMinutes * 60);
            setIsSubmitted(false);
            setFinalResult(null);
            setLoginLoading(false);
            return;
          } else {
            setLoginError(`Bank soal untuk mata pelajaran "${cleanSubj}" belum diunggah oleh guru di menu Administrasi Guru.`);
            setLoginLoading(false);
            return;
          }
        } catch (_) {
          // If questions fetch fails, fall through to client storage
        }
      }

      // ==========================================
      // 2. CLIENT-SIDE CBT ENGINE FALLBACK
      // (Used when deployed on GitHub Pages, Vercel static, or offline)
      // ==========================================
      console.log('Mengaktifkan Client Engine Fallback (Offline / GitHub Pages / Vercel Static)...');

      // A. Verify TOKEN
      const validToken = (config.token || 'CBT2026').trim().toUpperCase();
      if (cleanToken !== validToken) {
        setLoginError(`TOKEN Ujian Salah! Masukkan Token resmi dari guru pengawas (Contoh: ${validToken})`);
        setLoginLoading(false);
        return;
      }

      // B. Cross-check with Master Student Excel if mode is 'crosscheck' (Requirement 6)
      const isCrosscheckMode = config.verificationMode !== 'manual';
      let masterStudents: any[] = [];
      try {
        const rawMaster = localStorage.getItem('cbt_master_students');
        if (rawMaster) masterStudents = JSON.parse(rawMaster);
      } catch (_) {}

      if (isCrosscheckMode && masterStudents.length > 0) {
        const match = masterStudents.find((s: any) =>
          String(s.noPeserta).trim().toLowerCase() === cleanNo.toLowerCase() &&
          (String(s.name).toUpperCase().includes(cleanName) || cleanName.includes(String(s.name).toUpperCase()))
        );

        if (!match) {
          setLoginError(`DATA SISWA TIDAK COCOK DI MASTER EXCEL!\nNama "${cleanName}" dengan No. Peserta "${cleanNo}" tidak terdaftar. Silakan kroscek dengan pengawas atau ubah mode ke 'Peserta Umum / Manual' di administrasi guru.`);
          setLoginLoading(false);
          return;
        }
      }

      // C. Load Question Bank from localStorage
      let localBank: any[] = [];
      try {
        const rawBank = localStorage.getItem('cbt_question_bank');
        if (rawBank) localBank = JSON.parse(rawBank);
      } catch (_) {}

      // Load Question Images repository
      let imageRepo: Record<string, any> = {};
      try {
        const rawImgs = localStorage.getItem('cbt_question_images');
        if (rawImgs) imageRepo = JSON.parse(rawImgs);
      } catch (_) {}

      // Filter questions matching selected mapel
      const targetSubj = cleanSubj.toUpperCase();
      let matchedQuestions = localBank.filter((q: any) => 
        String(q.subject || '').trim().toUpperCase() === targetSubj ||
        String(q.subject || '').trim().toUpperCase() === 'SEMUA MAPEL' ||
        String(q.subject || '').trim().toUpperCase() === 'UMUM'
      );

      // If no questions found for this subject
      if (matchedQuestions.length === 0) {
        const availableSubjects = Array.from(new Set(localBank.map((q: any) => q.subject))).filter(Boolean);
        if (availableSubjects.length > 0) {
          setLoginError(`Bank soal untuk mata pelajaran "${cleanSubj}" belum diunggah oleh guru di menu Administrasi Guru.\n(Mapel yang sudah memiliki bank soal: ${availableSubjects.join(', ')})`);
        } else {
          setLoginError(`Bank soal untuk mata pelajaran "${cleanSubj}" belum diunggah oleh guru. Silakan buka menu "Administrasi Guru" dan unggah file soal di tab "UPLOAD TIPE DAN KUNCI SOAL".`);
        }
        setLoginLoading(false);
        return;
      }

      // Secure Zero-Knowledge Sanitization for Client Engine
      const sanitizedQuestions: ClientQuestion[] = matchedQuestions.map((q: any, idx: number) => {
        const baseCode = q.questionCode || `${targetSubj}_${idx + 1}`;
        const activeFileName = q.slideFileName || baseCode;
        
        // Lookup matched image from repository
        const lookupKeys = [
          activeFileName.toLowerCase().trim(),
          baseCode.toLowerCase().trim(),
          activeFileName.replace(/\.[^/.]+$/, '').toLowerCase().trim()
        ];
        let matchedImageUrl: string | undefined = undefined;
        for (const k of lookupKeys) {
          if (imageRepo[k]?.dataUrl) {
            matchedImageUrl = imageRepo[k].dataUrl;
            break;
          }
        }

        return {
          id: q.id || idx + 1,
          subject: q.subject || targetSubj,
          type: q.type || 'mcq',
          typeTitle: q.typeTitle || 'Pilihan Ganda',
          questionCode: baseCode,
          assignedVariantCode: 'A',
          slideFileName: activeFileName,
          imageUrl: matchedImageUrl,
          questionText: `Soal #${idx + 1} - ${cleanSubj}`,
          options: q.options || ['A', 'B', 'C', 'D', 'E'],
          maxPoints: q.maxPoints || 10,
          passage: q.passage
          // 'key' is removed for security!
        };
      });

      setQuestions(sanitizedQuestions);
      setAssignedPackage('Paket A');
      setIsLoggedIn(true);
      setTimeRemaining(config.durationMinutes * 60);
      setViolationsCount(0);
      setIsSubmitted(false);
      setFinalResult(null);

    } catch (err: any) {
      console.error('Login process error:', err);
      setLoginError(`Gagal memproses login: ${err?.message || 'Periksa data diri dan TOKEN'}`);
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

  // Submit Exam (Hybrid: Server-Side Grading with Local Client Fallback)
  const submitExamToServer = async (isForced = false) => {
    setShowFinishConfirm(false);
    setShowWarningModal(false);

    let submitted = false;

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

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setFinalResult({
            score: data.score,
            totalEarned: data.totalEarned,
            totalMax: data.totalMax,
            breakdown: data.breakdown,
            gdriveDestination: data.gdriveDestination
          });
          setIsSubmitted(true);
          submitted = true;
        }
      }
    } catch (err) {
      console.warn('Server submit unavailable, falling back to client evaluation:', err);
    }

    // Client-side grading fallback (for GitHub Pages / Vercel static)
    if (!submitted) {
      let totalEarned = 0;
      let totalMax = 0;
      const breakdown: ScoreBreakdownItem[] = [];

      let localBank: any[] = [];
      try {
        const raw = localStorage.getItem('cbt_question_bank');
        if (raw) localBank = JSON.parse(raw);
      } catch (_) {}

      questions.forEach((q) => {
        const maxPts = q.maxPoints || 10;
        totalMax += maxPts;

        const bankItem = localBank.find((b: any) => b.id === q.id && b.subject === q.subject);
        const correctKey = bankItem?.key || bankItem?.variants?.[q.assignedVariantCode || 'A']?.key || 'A';
        const studentAns = answers[q.id];

        let isCorrect = false;
        if (studentAns && String(studentAns).trim().toUpperCase() === correctKey.trim().toUpperCase()) {
          isCorrect = true;
          totalEarned += maxPts;
        }

        breakdown.push({
          questionId: q.id,
          userAnswer: studentAns || '',
          correctAnswer: correctKey,
          scoreEarned: isCorrect ? maxPts : 0,
          maxPoints: maxPts,
          isCorrect,
          variantCode: q.assignedVariantCode
        });
      });

      const percentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
      const nowStr = new Date().toLocaleTimeString('id-ID');

      const submissionRecord: StudentSubmission = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        studentName: studentName.toUpperCase(),
        noPeserta,
        className: selectedKelas,
        subject: selectedMapel,
        schoolName: config.schoolName,
        assignedPackage,
        answers,
        violationsCount,
        startTime: new Date().toLocaleTimeString('id-ID'),
        submitTime: nowStr,
        score: totalEarned,
        maxScore: totalMax,
        percentage,
        status: isForced ? 'Curang (Disubmit)' : 'Selesai',
        syncedToGdrive: false
      };

      try {
        let existingSubs: StudentSubmission[] = [];
        const raw = localStorage.getItem('cbt_submissions');
        if (raw) existingSubs = JSON.parse(raw);
        existingSubs.unshift(submissionRecord);
        localStorage.setItem('cbt_submissions', JSON.stringify(existingSubs));
      } catch (_) {}

      setFinalResult({
        score: percentage,
        totalEarned,
        totalMax,
        breakdown,
        gdriveDestination: config.gdriveUrl || 'Folder Google Drive Sekolah'
      });
      setIsSubmitted(true);
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

  // Answer mode: 'mcq' or 'short' (supports isian singkat & pilihan ganda)
  const [answerMode, setAnswerMode] = useState<'mcq' | 'short'>('mcq');

  // Dynamic available options based on Jenjang Sekolah
  // SD/MI -> 3 opsi: A, B, C
  // SLB -> 3 opsi: A, B, C
  // SMP/MTs -> 4 opsi: A, B, C, D
  // SMA/MA/SMK/MAK -> 5 opsi: A, B, C, D, E
  const availableOptions = useMemo(() => {
    const level = config.schoolLevel || 'SMA/MA/SMK/MAK';
    if (level === 'SD/MI' || level === 'SLB') {
      return ['A', 'B', 'C'];
    }
    if (level === 'SMP/MTs') {
      return ['A', 'B', 'C', 'D'];
    }
    return ['A', 'B', 'C', 'D', 'E'];
  }, [config.schoolLevel]);

  // Sync answerMode when question changes
  useEffect(() => {
    if (currentQ?.type === 'short') {
      setAnswerMode('short');
    } else {
      setAnswerMode('mcq');
    }
  }, [currentQ?.id, currentQ?.type]);

  const handleSelectMCQ = useCallback((opt: string) => {
    if (!currentQ) return;
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: prev[currentQ.id] === opt ? '' : opt
    }));
  }, [currentQ]);

  const handleSelectTF = useCallback((val: 'BENAR' | 'SALAH') => {
    if (!currentQ) return;
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: prev[currentQ.id] === val ? '' : val
    }));
  }, [currentQ]);

  const handleToggleCheckbox = useCallback((opt: string) => {
    if (!currentQ) return;
    const current = Array.isArray(answers[currentQ.id]) ? (answers[currentQ.id] as string[]) : [];
    const updated = current.includes(opt)
      ? current.filter(x => x !== opt)
      : [...current, opt].sort();

    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: updated
    }));
  }, [currentQ, answers]);

  const handleInputShort = useCallback((val: string) => {
    if (!currentQ) return;
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: val
    }));
  }, [currentQ]);

  const toggleDoubt = useCallback(() => {
    if (!currentQ) return;
    setDoubtMap(prev => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id]
    }));
  }, [currentQ]);

  // Global Keyboard Shortcuts: A, B, C, D, E, 1, 2, 3, 4, 5, Arrows, Space
  useEffect(() => {
    if (!isLoggedIn || isSubmitted || !currentQ) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a text input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const key = e.key.toUpperCase();

      // Options hotkeys: A, B, C, D, E
      if (availableOptions.includes(key)) {
        e.preventDefault();
        handleSelectMCQ(key);
        return;
      }

      // Numbers 1, 2, 3, 4, 5
      const numMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
      if (numMap[key] && availableOptions.includes(numMap[key])) {
        e.preventDefault();
        handleSelectMCQ(numMap[key]);
        return;
      }

      // True/False hotkeys
      if (currentQ.type === 'tf') {
        if (key === 'B') {
          e.preventDefault();
          handleSelectTF('BENAR');
          return;
        }
        if (key === 'S') {
          e.preventDefault();
          handleSelectTF('SALAH');
          return;
        }
      }

      // Navigation: Next (ArrowRight or Enter)
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
        return;
      }

      // Navigation: Previous (ArrowLeft)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
        return;
      }

      // Toggle Ragu-Ragu: Space
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleDoubt();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoggedIn, isSubmitted, currentQ, currentIndex, questions.length, availableOptions, handleSelectMCQ, handleSelectTF, toggleDoubt]);

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
                  {safeMapels.map(m => (
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
                  {safeKelas.map(k => (
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
                setFinalResult(null);
                setAnswers({});
                setDoubtMap({});
                setQuestions([]);
                setCurrentIndex(0);
                setInputToken('');
                setLoginError('');
                setViolationsCount(0);
                setTimeRemaining(config.durationMinutes * 60);

                // Clear any stored active session
                try {
                  localStorage.removeItem('cbt_active_session');
                  sessionStorage.removeItem('cbt_active_session');
                } catch (_) {}

                // Scroll to top to ensure clean view
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembali ke Laman Login Siswa</span>
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
    <div className="flex-1 flex flex-col p-3 gap-3 bg-[#0c1322] text-slate-100 select-none overflow-hidden">
      
      {/* PROMINENT TOP BAR: NAMA, NO PESERTA, KELAS, MAPEL & SISA WAKTU (BESAR & JELAS) */}
      <header className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 px-4 sm:px-6 shadow-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Identitas Peserta: Font Lebih Besar & Mudah Terlihat */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center font-black text-lg shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base md:text-lg font-black text-white tracking-wide uppercase">
                {studentName}
              </span>
              <span className="bg-sky-950 text-sky-300 border border-sky-700/70 font-mono text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-lg shadow-inner">
                No: {noPeserta}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="text-sky-300">{selectedMapel}</span>
              <span>·</span>
              <span className="text-indigo-300">Kelas {selectedKelas}</span>
              <span className="hidden md:inline">·</span>
              <span className="hidden md:inline text-slate-400">{config.schoolName}</span>
            </div>
          </div>
        </div>

        {/* Indikator Sisa Waktu & Pelanggaran: Font Besar & Kontras Tinggi */}
        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          {/* Sisa Waktu Besar */}
          <div className="bg-slate-950 border border-amber-600/50 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl flex items-center gap-2 sm:gap-3 shadow-lg ring-1 ring-amber-500/30">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400/80 leading-none">
                Sisa Waktu
              </div>
              <div className="font-mono text-base sm:text-xl md:text-2xl font-black text-amber-300 tracking-wider leading-tight">
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>

          {/* Status Pelanggaran */}
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 sm:py-2 rounded-xl flex items-center gap-2 text-center">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="text-left">
              <div className="text-[9px] uppercase font-bold text-slate-400 leading-none">Langgar</div>
              <div className="font-mono text-xs sm:text-sm font-bold text-rose-400 leading-tight">
                {violationsCount}/{config.maxViolations}
              </div>
            </div>
          </div>
        </div>

      </header>

      {/* BODY VIEW CONTAINER */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden gap-3">
        
        {/* MAIN VIEWPORT */}
        <main className="flex-1 flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative shadow-lg">
          
          {/* Top Question Toolbar */}
          <div className="bg-slate-950 border-b border-slate-800 px-3 sm:px-4 py-2.5 flex items-center justify-between text-xs gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* NOMOR SOAL ATAS (SINKRON DENGAN NOMOR SOAL BAWAH & PETA SOAL) */}
              <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 px-3 py-1 rounded-lg font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm">
                <span>Soal No.</span>
                <strong className="text-white text-sm sm:text-base font-mono">{currentIndex + 1}</strong>
                <span className="font-normal text-slate-400">/ {questions.length}</span>
              </span>
              
              <span className="bg-purple-950/80 text-purple-300 border border-purple-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                {assignedPackage} (Terkunci)
              </span>
              
              <span className="text-slate-300 font-semibold text-[11px] hidden md:inline">
                Tipe: <strong className="text-white">{currentQ?.typeTitle || 'Slide Interaktif'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* TOGGLE PANEL PETA SOAL (REQUEST USER: SEMBUNYIKAN / TAMPILKAN AGAR SOAL MAKSIMAL) */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border flex items-center gap-1.5 shadow ${
                  isSidebarOpen
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-400/40 animate-pulse'
                }`}
                title={isSidebarOpen ? 'Sembunyikan panel nomor soal di sebelah kanan agar soal lebih lebar' : 'Buka panel nomor soal'}
              >
                {isSidebarOpen ? (
                  <>
                    <PanelRightClose className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Tutup Panel Kanan</span>
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="w-3.5 h-3.5 text-white" />
                    <span>Buka Peta Soal ({questions.length})</span>
                  </>
                )}
              </button>

              {/* Mode Lebar Soal: Lebar Penuh vs Standar */}
              <button
                type="button"
                onClick={() => setIsFullWidthSlide(prev => !prev)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold border transition hidden sm:flex items-center gap-1 ${
                  isFullWidthSlide 
                    ? 'bg-sky-600 text-white border-sky-400' 
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Pilih mode lebar soal untuk tampilan teks maksimal"
              >
                <span>{isFullWidthSlide ? 'Lebar Normal' : 'Lebar Penuh'}</span>
              </button>

              {currentQ?.passage && (
                <button
                  onClick={() => setShowPassage(prev => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition border ${
                    showPassage
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{showPassage ? 'Tutup Wacana' : 'Wacana'}</span>
                </button>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.15))}
                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
                  title="Perkecil Tampilan"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 font-mono text-[11px] text-slate-300 font-bold">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.15))}
                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
                  title="Perbesar Tampilan"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1.0)}
                  className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                  title="Reset 100%"
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

          {/* Center Canvas Area (Slide Viewport with Dynamic Watermark & Unconstrained Vertical Scrolling) */}
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

            {/* Viewport Scroll Container: Gunakan items-start agar teks panjang tidak terpotong saat di-zoom */}
            <div className="flex-1 relative overflow-auto p-3 sm:p-5 flex items-start justify-center custom-scrollbar">
              <div 
                style={{ 
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  width: zoomLevel > 1 ? `${Math.round(zoomLevel * 100)}%` : '100%',
                  maxWidth: isFullWidthSlide ? '100%' : '960px'
                }}
                className="transition-transform duration-150 relative shadow-2xl rounded-2xl bg-white text-slate-900 border border-slate-200 my-2"
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

                {/* Rendered Slide Content: Bebas tinggi (natural height) agar teks Bahasa Indonesia/Inggris panjang dapat di-scroll penuh */}
                <div className="w-full min-h-[460px] p-5 sm:p-8 flex flex-col justify-between bg-white text-slate-900">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                        <span>{config.schoolName}</span>
                        <span>·</span>
                        <span className="text-sky-700 font-bold">{currentQ?.subject || selectedMapel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentQ?.imageUrl && (
                          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            Berkas Gambar Slide Aktif
                          </span>
                        )}
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
                          Soal #{currentIndex + 1} dari {questions.length}
                        </span>
                      </div>
                    </div>

                    {/* DISPLAY ATTACHED QUESTION IMAGE (JPG/PNG/WEBP): Bebas scroll ke bawah tanpa terpotong */}
                    {currentQ?.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-300 bg-slate-50 relative group shadow-sm flex flex-col items-center justify-center p-2 sm:p-3">
                        <img 
                          src={currentQ.imageUrl} 
                          alt={`Soal #${currentIndex + 1}`}
                          className="w-full max-w-full h-auto object-contain rounded-lg transition-transform"
                        />
                        <div className="w-full text-center text-[10px] text-slate-500 pt-1.5 border-t border-slate-200 mt-2 flex items-center justify-between px-2 flex-wrap gap-2">
                          <span className="font-bold text-slate-700">Slide Gambar Soal #{currentIndex + 1}</span>
                          <span className="text-slate-400">Teks panjang otomatis dapat di-scroll ke bawah secara penuh</span>
                        </div>
                      </div>
                    )}

                    {/* LONG SCROLLABLE PASSAGE / TEXT KHUSUS SOAL BAHASA (INDONESIA / INGGRIS) */}
                    {currentQ?.passage && (
                      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-slate-800 text-xs sm:text-sm leading-relaxed max-h-64 overflow-y-auto custom-scrollbar font-serif shadow-inner">
                        <div className="text-[11px] font-bold font-sans text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                          <span>Teks Bacaan / Wacana Soal (Bisa Di-Scroll):</span>
                        </div>
                        <div 
                          dangerouslySetInnerHTML={{ __html: currentQ.passage }}
                          className="space-y-1.5 text-slate-800"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {currentQ?.questionText || `Soal #${currentIndex + 1} - ${currentQ?.subject || selectedMapel}`}
                      </h3>
                    </div>

                  </div>

                  <div className="border-t border-slate-200 pt-3 mt-6 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{config.appTitle}</span>
                    <span>Peserta: <strong className="text-slate-600">{studentName}</strong> ({noPeserta})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Answer Input Controls & Navigation Outside Question Viewport (Lingkaran Merah) */}
          <div className="bg-slate-950 border-t border-slate-800 p-3 sm:px-5 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0 shadow-2xl">
            
            {/* Sisi Kiri: Pilihan Jawaban / Mode Uraian Singkat dengan Indikator Nomor Soal Terpadu */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-2">
                {/* NOMOR SOAL BAWAH (SINKRON 100% DENGAN NOMOR SOAL DI ATAS) */}
                <span className="bg-sky-950 text-sky-300 border border-sky-700 font-mono text-xs font-black px-2.5 py-1 rounded-lg shadow-inner">
                  Soal #{currentIndex + 1}
                </span>
                <span className="text-xs font-bold text-slate-400">Pilihan Jawaban:</span>
              
              {/* Toggle Mode: Pilihan Ganda (A-E) vs Isian Singkat */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAnswerMode('mcq')}
                  className={`px-2 py-1 rounded font-medium transition ${
                    answerMode === 'mcq'
                      ? 'bg-sky-500/20 text-sky-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Pilihan Ganda (A/B/C/D/E)"
                >
                  Opsi
                </button>
                <button
                  type="button"
                  onClick={() => setAnswerMode('short')}
                  className={`px-2 py-1 rounded font-medium transition ${
                    answerMode === 'short'
                      ? 'bg-sky-500/20 text-sky-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Isian Singkat / Uraian"
                >
                  Isian
                </button>
              </div>
            </div>

            {/* Jika mode MCQ atau tipe soal slide/mcq/umum */}
            {answerMode === 'mcq' && currentQ?.type !== 'tf' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {availableOptions.map((opt, idx) => {
                  const isSelected = answers[currentQ?.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectMCQ(opt)}
                      className={`relative min-w-[42px] h-10 px-3 rounded-xl font-black text-sm transition-all border flex items-center justify-center gap-1 active:scale-95 shadow-sm ${
                        isSelected
                          ? 'bg-gradient-to-b from-sky-400 to-sky-600 text-slate-950 border-sky-300 ring-2 ring-sky-400/50 shadow-sky-500/30'
                          : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800 hover:border-slate-500 hover:text-white'
                      }`}
                      title={`Pilih jawaban ${opt} (Tekan ${opt} atau ${idx + 1} di keyboard)`}
                    >
                      <span>{opt}</span>
                      <span className={`text-[9px] font-mono opacity-60 hidden sm:inline ${isSelected ? 'text-slate-950' : 'text-slate-400'}`}>
                        [{idx + 1}]
                      </span>
                    </button>
                  );
                })}

                {/* Tombol Kosongkan / Reset Jawaban */}
                {answers[currentQ?.id] && (
                  <button
                    type="button"
                    onClick={() => handleSelectMCQ('')}
                    className="h-10 px-2 text-[11px] text-slate-400 hover:text-rose-400 transition ml-1"
                    title="Kosongkan jawaban untuk nomor ini"
                  >
                    Hapus
                  </button>
                )}
              </div>
            )}

            {/* Mode Isian Singkat / Uraian Singkat */}
            {answerMode === 'short' && (
              <div className="flex items-center gap-2 w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Ketik uraian/jawaban singkat di sini..."
                  value={(answers[currentQ?.id] as string) || ''}
                  onChange={e => handleInputShort(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono shadow-inner"
                />
                {answers[currentQ?.id] && (
                  <button
                    type="button"
                    onClick={() => handleInputShort('')}
                    className="text-xs text-slate-400 hover:text-rose-400 whitespace-nowrap"
                  >
                    Hapus
                  </button>
                )}
              </div>
            )}

            {/* Tipe Soal Benar / Salah (True / False) */}
            {currentQ?.type === 'tf' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectTF('BENAR')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 active:scale-95 ${
                    answers[currentQ.id] === 'BENAR'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow ring-2 ring-emerald-400/50 font-black'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>BENAR</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTF('SALAH')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 active:scale-95 ${
                    answers[currentQ.id] === 'SALAH'
                      ? 'bg-rose-500 text-white border-rose-400 shadow ring-2 ring-rose-400/50 font-black'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>SALAH</span>
                </button>
              </div>
            )}

            {/* Tipe Soal Checkbox (Multi-select) */}
            {currentQ?.type === 'checkbox' && (
              <div className="flex items-center gap-1.5">
                {availableOptions.map(opt => {
                  const arr = Array.isArray(answers[currentQ.id]) ? (answers[currentQ.id] as string[]) : [];
                  const isChecked = arr.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleToggleCheckbox(opt)}
                      className={`min-w-[38px] h-9 px-2 rounded-xl text-xs font-bold transition border flex items-center justify-center ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50'
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

      {/* RIGHT SIDEBAR (COLLAPSIBLE / DAPAT DITUTUP AGAR TAMPILAN SOAL LEBAR) */}
      {isSidebarOpen && (
        <aside className="w-full lg:w-72 bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-between gap-4 shrink-0 shadow-lg">
          <div className="space-y-4">
            
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white truncate">{studentName}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-sky-400 bg-sky-950 border border-sky-800 px-1.5 py-0.5 rounded">
                    {selectedKelas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="text-slate-500 hover:text-white p-0.5 rounded hover:bg-slate-800 transition"
                    title="Tutup panel soal agar layar soal lebih lebar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
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

                  if (isCurrent) bgClass += ' ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900 font-black';

                  return (
                    <button
                      key={q.id || idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 rounded-xl text-xs font-bold border transition flex items-center justify-center ${bgClass}`}
                      title={`Pindah ke Soal No. ${idx + 1}`}
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
      )}

      </div>

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
