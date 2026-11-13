import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AppConfig,
  ClientQuestion,
  ScoreBreakdownItem,
  StudentSubmission
} from '../types';
import {
  createOrResumeStudentSubmissionInCloud,
  fetchExamFromCloud,
  fetchQuestionImagesForStudent,
  fetchRosterStudentForCrosscheck,
  fetchSubjectBankForStudent,
  getOrCreateLocalExamId,
  submitStudentExamToCloud,
  toFirestoreId
} from '../services/cbtFirestore';
import {
  formatScheduleId,
  getTypeTitle,
  gradeQuestionAnswer,
  normalizeQuestionType
} from '../utils/questionGrading';
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
  CloudCheck,
  GraduationCap,
  ArrowRight,
  PanelRightClose,
  PanelRightOpen,
  CalendarClock
} from 'lucide-react';

interface Props {
  config: AppConfig;
  onExamComplete?: () => void;
}

const stripAutoSoalText = (text?: string): string => {
  const clean = String(text || '').trim();
  if (!clean) return '';
  if (/^Soal\s*#\d+(\s*-\s*.*)?$/i.test(clean)) return '';
  return clean;
};

export const StudentExamEngine: React.FC<Props> = ({ config }) => {
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

  // Sync URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramMapel = params.get('mapel');
    const paramKelas = params.get('kelas');
    const paramToken = params.get('token');

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
  const [gradingBank, setGradingBank] = useState<any[]>([]);
  const [activeExamId, setActiveExamId] = useState<string>('');
  const [activeSubmissionId, setActiveSubmissionId] = useState<string>('');
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
    storageDestination: string;
  } | null>(null);

  // Sync browser fullscreenchange event
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const exitFullscreenSafely = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Validate Schedule Window
  const checkScheduleWindow = (
    enabled?: boolean,
    startStr?: string,
    endStr?: string,
    durationMins?: number
  ): { ok: boolean; message?: string; cappedSeconds?: number } => {
    const baseSeconds = (Number(durationMins) || 90) * 60;
    if (!enabled) {
      return { ok: true, cappedSeconds: baseSeconds };
    }
    const nowMs = Date.now();
    const startMs = startStr ? new Date(startStr).getTime() : NaN;
    const endMs = endStr ? new Date(endStr).getTime() : NaN;

    if (!Number.isNaN(startMs) && nowMs < startMs) {
      return {
        ok: false,
        message: `Ujian belum dibuka! Jadwal mulai pengerjaan: ${formatScheduleId(startStr)}.`
      };
    }
    if (!Number.isNaN(endMs) && nowMs > endMs) {
      return {
        ok: false,
        message: `Waktu pengerjaan ujian telah berakhir pada ${formatScheduleId(endStr)}.`
      };
    }

    if (!Number.isNaN(endMs)) {
      const secsUntilEnd = Math.max(60, Math.floor((endMs - nowMs) / 1000));
      return { ok: true, cappedSeconds: Math.min(baseSeconds, secsUntilEnd) };
    }
    return { ok: true, cappedSeconds: baseSeconds };
  };

  // Handle Student Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanName = studentName.trim().toUpperCase();
    const cleanNo = noPeserta.trim();
    const cleanToken = inputToken.trim().toUpperCase();
    const cleanSubj = selectedMapel.trim();

    if (!cleanName || !cleanNo || !cleanToken) {
      setLoginError('Lengkapi Nama Lengkap, No. Peserta, dan TOKEN Ujian terlebih dahulu.');
      return;
    }

    // Request fullscreen synchronously inside user gesture on submit
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    setLoginLoading(true);

    try {
      // 1. Attempt Server API
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
      } catch (_) {
        serverAvailable = false;
      }

      if (serverAvailable && data) {
        if (!data.success) {
          exitFullscreenSafely();
          setLoginError(data.message || 'Login gagal, periksa TOKEN dari pengawas.');
          setLoginLoading(false);
          return;
        }

        // Also validate client config schedule in case server config lagged
        const localSched = checkScheduleWindow(
          config.scheduleEnabled,
          config.scheduleStart,
          config.scheduleEnd,
          config.durationMinutes
        );
        if (!localSched.ok) {
          exitFullscreenSafely();
          setLoginError(localSched.message || 'Di luar jadwal ujian.');
          setLoginLoading(false);
          return;
        }

        if (data.assignedPackage) {
          setAssignedPackage(data.assignedPackage);
        }

        try {
          const qRes = await fetch(
            `/api/exam/questions?subject=${encodeURIComponent(cleanSubj)}&noPeserta=${encodeURIComponent(cleanNo)}`
          );
          const qData = await qRes.json();

          if (qData.success && qData.questions && qData.questions.length > 0) {
            const cleanServerQuestions: ClientQuestion[] = qData.questions.map((q: any) => {
              const norm = normalizeQuestionType(q.type);
              return {
                ...q,
                type: norm,
                typeTitle: q.typeTitle || getTypeTitle(norm),
                questionText: stripAutoSoalText(q.questionText),
                statementLabels: Array.isArray(q.statementLabels) ? q.statementLabels : undefined
              };
            });

            setQuestions(cleanServerQuestions);
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
            setCurrentIndex(0);
            setTimeRemaining(localSched.cappedSeconds || config.durationMinutes * 60);
            setIsSubmitted(false);
            setFinalResult(null);
            setLoginLoading(false);
            return;
          } else {
            exitFullscreenSafely();
            setLoginError(`Bank soal untuk mata pelajaran "${cleanSubj}" belum diunggah oleh guru di menu Administrasi Guru.`);
            setLoginLoading(false);
            return;
          }
        } catch (_) {
          // Fall through to Cloud/Local engine
        }
      }

      // 2. CLOUD FIRESTORE + CLIENT CBT ENGINE
      const urlParams = new URLSearchParams(window.location.search);
      const targetExamId = urlParams.get('exam') || config.examId || getOrCreateLocalExamId(config.schoolName);
      setActiveExamId(targetExamId);

      let cloudExam = null;
      try {
        cloudExam = await fetchExamFromCloud(targetExamId);
      } catch (_) {
        cloudExam = null;
      }

      const effectiveToken = (cloudExam?.token || config.token || 'CBT2026').trim().toUpperCase();
      const effectiveVerificationMode = cloudExam?.verificationMode || config.verificationMode || 'crosscheck';
      const effectiveDuration = cloudExam?.durationMinutes || config.durationMinutes || 90;
      const effectiveSchoolName = cloudExam?.schoolName || config.schoolName;
      const effectiveShuffle = cloudExam?.shuffleQuestions ?? config.shuffleQuestions;
      const effectiveSchedEnabled = cloudExam?.scheduleEnabled ?? config.scheduleEnabled;
      const effectiveSchedStart = cloudExam?.scheduleStart ?? config.scheduleStart;
      const effectiveSchedEnd = cloudExam?.scheduleEnd ?? config.scheduleEnd;

      // Verify Schedule
      const schedCheck = checkScheduleWindow(
        effectiveSchedEnabled,
        effectiveSchedStart,
        effectiveSchedEnd,
        effectiveDuration
      );
      if (!schedCheck.ok) {
        exitFullscreenSafely();
        setLoginError(schedCheck.message || 'Ujian berada di luar jadwal yang ditentukan.');
        setLoginLoading(false);
        return;
      }

      // Verify Token
      if (cleanToken !== effectiveToken) {
        exitFullscreenSafely();
        setLoginError(`TOKEN Ujian Salah! Masukkan Token resmi dari guru pengawas (Contoh: ${effectiveToken})`);
        setLoginLoading(false);
        return;
      }

      // Cross-check with Master Student Roster
      const isCrosscheckMode = effectiveVerificationMode !== 'manual';
      let masterStudents: any[] = [];
      try {
        const rawMaster = localStorage.getItem('cbt_master_students');
        if (rawMaster) masterStudents = JSON.parse(rawMaster);
      } catch (_) {}

      if (isCrosscheckMode) {
        if (cloudExam && cloudExam.rosterCount > 0) {
          const cloudStudent = await fetchRosterStudentForCrosscheck(targetExamId, cleanNo);
          const nameMatches = cloudStudent && (
            String(cloudStudent.name).toUpperCase().includes(cleanName) ||
            cleanName.includes(String(cloudStudent.name).toUpperCase())
          );
          if (!nameMatches) {
            exitFullscreenSafely();
            setLoginError(`DATA SISWA TIDAK COCOK DI MASTER EXCEL!\nNama "${cleanName}" dengan No. Peserta "${cleanNo}" tidak terdaftar. Silakan kroscek dengan pengawas atau ubah mode ke 'Peserta Umum / Manual' di administrasi guru.`);
            setLoginLoading(false);
            return;
          }
        } else if (masterStudents.length > 0) {
          const match = masterStudents.find((s: any) =>
            String(s.noPeserta).trim().toLowerCase() === cleanNo.toLowerCase() &&
            (String(s.name).toUpperCase().includes(cleanName) || cleanName.includes(String(s.name).toUpperCase()))
          );
          if (!match) {
            exitFullscreenSafely();
            setLoginError(`DATA SISWA TIDAK COCOK DI MASTER EXCEL!\nNama "${cleanName}" dengan No. Peserta "${cleanNo}" tidak terdaftar. Silakan kroscek dengan pengawas atau ubah mode ke 'Peserta Umum / Manual' di administrasi guru.`);
            setLoginLoading(false);
            return;
          }
        }
      }

      // Load Question Bank
      let matchedQuestions: any[] = [];
      try {
        matchedQuestions = await fetchSubjectBankForStudent(targetExamId, cleanSubj);
      } catch (_) {
        matchedQuestions = [];
      }

      let localBank: any[] = [];
      try {
        const rawBank = localStorage.getItem('cbt_question_bank');
        if (rawBank) localBank = JSON.parse(rawBank);
      } catch (_) {}

      const targetSubj = cleanSubj.toUpperCase();
      if (matchedQuestions.length === 0 && localBank.length > 0) {
        matchedQuestions = localBank.filter((q: any) =>
          String(q.subject || '').trim().toUpperCase() === targetSubj ||
          String(q.subject || '').trim().toUpperCase() === 'SEMUA MAPEL' ||
          String(q.subject || '').trim().toUpperCase() === 'UMUM'
        );
      }

      if (matchedQuestions.length === 0) {
        exitFullscreenSafely();
        const availableSubjects = Array.from(new Set(localBank.map((q: any) => q.subject))).filter(Boolean);
        if (availableSubjects.length > 0) {
          setLoginError(`Bank soal untuk mata pelajaran "${cleanSubj}" belum diunggah oleh guru di menu Administrasi Guru.\n(Mapel yang sudah memiliki bank soal: ${availableSubjects.join(', ')})`);
        } else {
          setLoginError(`Bank soal untuk mata pelajaran "${cleanSubj}" belum diunggah oleh guru. Silakan buka menu "Administrasi Guru" dan unggah soal terlebih dahulu.`);
        }
        setLoginLoading(false);
        return;
      }

      const variantLetters = ['A', 'B', 'C', 'D'];
      const chosenPkgCode = variantLetters[
        Array.from(cleanNo).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 4
      ];

      let imageRepo: Record<string, any> = {};
      try {
        const rawImgs = localStorage.getItem('cbt_question_images');
        if (rawImgs) imageRepo = JSON.parse(rawImgs);
      } catch (_) {}

      const candidateImageKeys: string[] = [];
      matchedQuestions.forEach((q: any, idx: number) => {
        const baseCode = q.questionCode || `${targetSubj}_${idx + 1}`;
        const variantFile = q.variants?.[chosenPkgCode]?.fileName;
        const activeFileName = variantFile || q.slideFileName || baseCode;
        candidateImageKeys.push(
          activeFileName.toLowerCase().trim(),
          baseCode.toLowerCase().trim(),
          activeFileName.replace(/\.[^/.]+$/, '').toLowerCase().trim()
        );
      });

      try {
        const cloudImages = await fetchQuestionImagesForStudent(targetExamId, candidateImageKeys);
        imageRepo = { ...imageRepo, ...cloudImages };
      } catch (_) {}

      let initialAnswers: Record<number, string | string[]> = {};
      let initialViolations = 0;
      let isResumingSession = false;

      if (cloudExam?.ownerUid) {
        try {
          const subRes = await createOrResumeStudentSubmissionInCloud({
            examId: targetExamId,
            ownerUid: cloudExam.ownerUid,
            token: effectiveToken,
            schoolName: effectiveSchoolName,
            studentName: cleanName,
            noPeserta: cleanNo,
            className: selectedKelas,
            subject: cleanSubj,
            assignedPackage: `Paket ${chosenPkgCode}`
          });

          if (subRes.blocked) {
            exitFullscreenSafely();
            setLoginError(subRes.message || 'Anda sudah menyelesaikan ujian ini.');
            setLoginLoading(false);
            return;
          }

          setActiveSubmissionId(subRes.submissionId);
          if (subRes.isResuming) {
            isResumingSession = true;
            initialAnswers = subRes.savedAnswers || {};
            initialViolations = subRes.violationsCount || 0;
          }
        } catch (err) {
          console.warn('Cloud submission session fallback to local:', err);
        }
      }

      setGradingBank(matchedQuestions);

      // Zero-Knowledge Sanitization (No key, no file sequence leak, no "Soal #X - MAPEL")
      const sanitizedQuestions: ClientQuestion[] = matchedQuestions.map((q: any, idx: number) => {
        const baseCode = q.questionCode || `${targetSubj}_${idx + 1}`;
        const activeVariant = q.variants?.[chosenPkgCode] ? chosenPkgCode : 'A';
        const activeFileName = q.variants?.[activeVariant]?.fileName || q.slideFileName || baseCode;
        const normType = normalizeQuestionType(q.type);

        const lookupKeys = [
          activeFileName.toLowerCase().trim(),
          toFirestoreId(activeFileName),
          baseCode.toLowerCase().trim(),
          toFirestoreId(baseCode),
          activeFileName.replace(/\.[^/.]+$/, '').toLowerCase().trim()
        ];
        let matchedImageUrl: string | undefined = q.imageUrl;
        if (!matchedImageUrl) {
          for (const k of lookupKeys) {
            if (imageRepo[k]?.dataUrl) {
              matchedImageUrl = imageRepo[k].dataUrl;
              break;
            }
          }
        }

        const stmtLabels: string[] | undefined =
          normType === 'matrix'
            ? (Array.isArray(q.statementLabels) && q.statementLabels.length > 0
                ? q.statementLabels.slice(0, 5)
                : ['A', 'B', 'C', 'D', 'E'])
            : undefined;

        return {
          id: q.id || idx + 1,
          subject: q.subject || targetSubj,
          type: normType,
          typeTitle: q.typeTitle || getTypeTitle(normType),
          questionCode: baseCode,
          assignedVariantCode: activeVariant,
          slideFileName: activeFileName,
          imageUrl: matchedImageUrl,
          questionText: stripAutoSoalText(q.questionText),
          options: q.options || ['A', 'B', 'C', 'D', 'E'],
          statementLabels: stmtLabels,
          statementTexts: Array.isArray(q.statementTexts) ? q.statementTexts : undefined,
          maxPoints: q.maxPoints || 10,
          passage: q.passage
        };
      });

      const finalQuestions = effectiveShuffle && !isResumingSession
        ? [...sanitizedQuestions].sort(() => Math.random() - 0.5)
        : sanitizedQuestions;

      setQuestions(finalQuestions);
      setCurrentIndex(0);
      setAssignedPackage(`Paket ${chosenPkgCode}`);
      setAnswers(initialAnswers);
      setViolationsCount(initialViolations);
      setIsLoggedIn(true);
      setTimeRemaining(schedCheck.cappedSeconds || effectiveDuration * 60);
      setIsSubmitted(false);
      setFinalResult(null);

    } catch (err: any) {
      console.error('Login process error:', err);
      exitFullscreenSafely();
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

  // Submit Exam
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

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.success) {
          setFinalResult({
            score: data.score,
            totalEarned: data.totalEarned,
            totalMax: data.totalMax,
            breakdown: data.breakdown,
            storageDestination: 'Rekap hasil ujian langsung tersedia di menu Administrasi Guru (Unduh Excel .xlsx).'
          });
          setIsSubmitted(true);
          submitted = true;
        }
      }
    } catch (err) {
      console.warn('Server submit unavailable, evaluating via Cloud/Client engine:', err);
    }

    if (!submitted) {
      let totalEarned = 0;
      let totalMax = 0;
      const breakdown: ScoreBreakdownItem[] = [];

      let evalBank: any[] = gradingBank;
      if (!evalBank || evalBank.length === 0) {
        try {
          const raw = localStorage.getItem('cbt_question_bank');
          if (raw) evalBank = JSON.parse(raw);
        } catch (_) {}
      }

      questions.forEach((q) => {
        const maxPts = q.maxPoints || 10;
        totalMax += maxPts;

        const bankItem = evalBank.find((b: any) => b.id === q.id && b.subject === q.subject)
          || evalBank.find((b: any) => b.id === q.id);
        const variantKey = bankItem?.variants?.[q.assignedVariantCode || 'A']?.key;
        const correctKey = String(variantKey || bankItem?.key || 'A');
        const studentAns = answers[q.id];

        const { scoreEarned, isCorrect } = gradeQuestionAnswer(q.type, studentAns, correctKey, maxPts);
        totalEarned += scoreEarned;

        breakdown.push({
          questionId: q.id,
          userAnswer: studentAns || '',
          correctAnswer: correctKey,
          scoreEarned,
          maxPoints: maxPts,
          isCorrect,
          variantCode: q.assignedVariantCode
        });
      });

      const percentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
      const nowStr = new Date().toLocaleTimeString('id-ID');
      const finalStatus = isForced ? 'Curang (Disubmit)' : 'Selesai';

      if (activeExamId && activeSubmissionId) {
        try {
          await submitStudentExamToCloud({
            examId: activeExamId,
            submissionId: activeSubmissionId,
            answers,
            violationsCount,
            submitTime: nowStr,
            score: totalEarned,
            maxScore: totalMax,
            percentage,
            status: finalStatus,
            syncedToGdrive: false
          });
        } catch (err) {
          console.warn('Cloud submission update warning:', err);
        }
      }

      const submissionRecord: StudentSubmission = {
        id: activeSubmissionId || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        studentName: studentName.toUpperCase(),
        noPeserta,
        className: selectedKelas,
        subject: selectedMapel,
        schoolName: config.schoolName,
        assignedPackage,
        answers,
        violationsCount,
        startTime: nowStr,
        submitTime: nowStr,
        score: totalEarned,
        maxScore: totalMax,
        percentage,
        status: finalStatus,
        syncedToGdrive: false
      };

      try {
        let existingSubs: StudentSubmission[] = [];
        const raw = localStorage.getItem('cbt_submissions');
        if (raw) existingSubs = JSON.parse(raw);
        const filtered = existingSubs.filter(s => s.id !== submissionRecord.id);
        filtered.unshift(submissionRecord);
        localStorage.setItem('cbt_submissions', JSON.stringify(filtered));
      } catch (_) {}

      setFinalResult({
        score: percentage,
        totalEarned,
        totalMax,
        breakdown,
        storageDestination: activeExamId
          ? 'Tersimpan otomatis ke Cloud Database Ujian dan siap diunduh guru ke Excel (.xlsx).'
          : 'Tersimpan ke rekap hasil ujian dan siap diunduh guru ke Excel (.xlsx).'
      });
      setIsSubmitted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const currentQ = questions[currentIndex];
  const currentNormType = normalizeQuestionType(currentQ?.type);
  const [answerMode, setAnswerMode] = useState<'mcq' | 'short'>('mcq');

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

  useEffect(() => {
    if (currentNormType === 'short') {
      setAnswerMode('short');
    } else {
      setAnswerMode('mcq');
    }
  }, [currentQ?.id, currentNormType]);

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
    setAnswers(prev => {
      const current = Array.isArray(prev[currentQ.id]) ? (prev[currentQ.id] as string[]) : [];
      const updated = current.includes(opt)
        ? current.filter(x => x !== opt)
        : [...current, opt].sort();
      return {
        ...prev,
        [currentQ.id]: updated
      };
    });
  }, [currentQ]);

  const handleSelectMatrixStatement = useCallback(
    (stmtIdx: number, val: 'TEPAT' | 'TIDAK TEPAT', totalCount: number) => {
      if (!currentQ) return;
      setAnswers(prev => {
        const existing = Array.isArray(prev[currentQ.id]) ? [...(prev[currentQ.id] as string[])] : [];
        while (existing.length < totalCount) existing.push('');
        existing[stmtIdx] = existing[stmtIdx] === val ? '' : val;
        return {
          ...prev,
          [currentQ.id]: existing
        };
      });
    },
    [currentQ]
  );

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

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!isLoggedIn || isSubmitted || !currentQ) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const key = e.key.toUpperCase();
      const numMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };

      if ((currentNormType === 'slide_image' || currentNormType === 'mcq') && answerMode === 'mcq') {
        if (availableOptions.includes(key)) {
          e.preventDefault();
          handleSelectMCQ(key);
          return;
        }
        if (numMap[key] && availableOptions.includes(numMap[key])) {
          e.preventDefault();
          handleSelectMCQ(numMap[key]);
          return;
        }
      }

      if (currentNormType === 'checkbox') {
        if (availableOptions.includes(key)) {
          e.preventDefault();
          handleToggleCheckbox(key);
          return;
        }
        if (numMap[key] && availableOptions.includes(numMap[key])) {
          e.preventDefault();
          handleToggleCheckbox(numMap[key]);
          return;
        }
      }

      if (currentNormType === 'tf') {
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

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleDoubt();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isLoggedIn,
    isSubmitted,
    currentQ,
    currentNormType,
    answerMode,
    currentIndex,
    questions.length,
    availableOptions,
    handleSelectMCQ,
    handleSelectTF,
    handleToggleCheckbox,
    toggleDoubt
  ]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isQuestionAnswered = (val: string | string[] | undefined): boolean => {
    if (!val) return false;
    if (Array.isArray(val)) return val.some(v => String(v || '').trim() !== '');
    return String(val).trim() !== '';
  };

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter(isQuestionAnswered).length;
  }, [answers]);

  // ==========================================
  // VIEW 1: LOGIN SCREEN (BRIGHT YOUTHFUL TKA)
  // ==========================================
  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#f0f7ff] via-[#f8fafc] to-[#eefbf5]">
        <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl shadow-sky-900/5 space-y-5 text-slate-900 relative">

          {/* Header Icon & Title */}
          <div className="text-center space-y-2 border-b border-slate-100 pb-5">
            <div className="w-13 h-13 bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-sky-500/20 mb-2">
              <GraduationCap className="w-7 h-7" />
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 uppercase tracking-tight">
              {config.appTitle || 'SIMULASI UJIAN CBT SLIDE'}
            </h2>

            <p className="text-xs text-slate-500">
              Masukkan data diri Anda dengan benar sebelum memulai ujian.
            </p>

            <div className="pt-1 flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-xl border border-sky-200">
                {config.schoolName || 'SMA Negeri 1 Teladan'}
              </span>
            </div>
          </div>

          {/* Schedule Banner */}
          {config.scheduleEnabled && (config.scheduleStart || config.scheduleEnd) ? (
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] flex items-start gap-2.5">
              <CalendarClock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-indigo-950">Jadwal Pengerjaan Aktif ({config.durationMinutes} Menit)</div>
                {config.scheduleStart && (
                  <div className="text-indigo-800">Mulai: <strong>{formatScheduleId(config.scheduleStart)}</strong></div>
                )}
                {config.scheduleEnd && (
                  <div className="text-indigo-800">Batas Akhir: <strong>{formatScheduleId(config.scheduleEnd)}</strong></div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Waktu Pengerjaan: Fleksibel</span>
              </span>
              <span className="font-bold font-mono text-emerald-700">{config.durationMinutes} Menit</span>
            </div>
          )}

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="whitespace-pre-line font-medium">{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold text-slate-700">
            <div>
              <label className="block mb-1.5 text-slate-700">
                Nama Lengkap (Huruf Kapital):
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={e => setStudentName(e.target.value.toUpperCase())}
                placeholder="CONTOH: BUDI SANTOSO"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 uppercase tracking-wider focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-slate-700">
                No. Peserta / Nomor Absen:
              </label>
              <input
                type="text"
                required
                value={noPeserta}
                onChange={e => setNoPeserta(e.target.value)}
                placeholder="Contoh: 20261099 atau Absen 12"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5 text-slate-700">
                  Pilih Mapel:
                </label>
                <select
                  value={selectedMapel}
                  onChange={e => setSelectedMapel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  {safeMapels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1.5 text-slate-700">
                  Pilih Kelas:
                </label>
                <select
                  value={selectedKelas}
                  onChange={e => setSelectedKelas(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  {safeKelas.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-slate-700">
                TOKEN Ujian dari Guru:
              </label>
              <input
                type="text"
                required
                value={inputToken}
                onChange={e => setInputToken(e.target.value.toUpperCase())}
                placeholder="MASUKKAN TOKEN SOAL..."
                className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-black tracking-widest text-emerald-700 uppercase focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold rounded-xl transition shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 text-xs"
              >
                {loginLoading ? (
                  <span>Menghubungi Server CBT...</span>
                ) : (
                  <>
                    <span>MASUK &amp; MULAI UJIAN (LAYAR PENUH)</span>
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
  // VIEW 2: POST-SUBMISSION RESULTS (WITH FULLSCREEN EXIT ICON)
  // ==========================================
  if (isSubmitted && finalResult) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#f0f7ff] via-[#f8fafc] to-[#eefbf5]">
        <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-xl space-y-6 text-slate-900">
          <div className="text-center space-y-2 border-b border-slate-100 pb-6">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
              Ujian Selesai &amp; Jawaban Tersimpan
            </h2>
            <p className="text-xs text-slate-600">
              Peserta: <strong className="text-slate-900">{studentName}</strong> ({noPeserta}) &middot; Kelas <strong className="text-sky-700">{selectedKelas}</strong> &middot; {selectedMapel}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200">
              <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Nilai Akhir (Skala 100)</div>
              <div className="text-4xl font-black text-sky-700 font-mono tabular-nums mt-1">{finalResult.score}</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Poin Diperoleh</div>
              <div className="text-4xl font-black text-emerald-700 font-mono tabular-nums mt-1">{finalResult.totalEarned} / {finalResult.totalMax}</div>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Pelanggaran</div>
              <div className="text-4xl font-black text-rose-700 font-mono tabular-nums mt-1">{violationsCount}x</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
            <CloudCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-emerald-950">Jawaban &amp; Nilai Tersimpan Aman di Database Sekolah:</div>
              <div className="text-[11px] text-emerald-800">{finalResult.storageDestination}</div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0"
              title="Masuk atau Keluar dari Mode Layar Penuh"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-sky-600" />
                  <span>Keluar Layar Penuh</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-sky-600" />
                  <span>Layar Penuh</span>
                </>
              )}
            </button>

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

                try {
                  localStorage.removeItem('cbt_active_session');
                  sessionStorage.removeItem('cbt_active_session');
                } catch (_) {}

                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5 whitespace-nowrap shrink-0"
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
  // VIEW 3: ACTIVE EXAM INTERFACE (BRIGHT YOUTHFUL TKA)
  // ==========================================
  const matrixLabels = currentQ?.statementLabels && currentQ.statementLabels.length > 0
    ? currentQ.statementLabels
    : ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="flex-1 flex flex-col p-2.5 sm:p-3 gap-2.5 bg-[#f4f8fc] text-slate-900 select-none overflow-hidden">

      {/* PROMINENT TOP BAR */}
      <header className="bg-white border border-slate-200 rounded-2xl p-3 px-4 sm:px-6 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">

        {/* Student Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-wide uppercase">
                {studentName}
              </span>
              <span className="bg-sky-50 text-sky-700 border border-sky-200 font-mono text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-lg">
                No: {noPeserta}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 flex items-center gap-2 mt-0.5">
              <span className="text-sky-700 font-bold">{selectedMapel}</span>
              <span className="text-slate-300">&middot;</span>
              <span className="text-indigo-700 font-bold">Kelas {selectedKelas}</span>
              <span className="hidden md:inline text-slate-300">&middot;</span>
              <span className="hidden md:inline text-slate-500">{config.schoolName}</span>
            </div>
          </div>
        </div>

        {/* Remaining Time & Violations */}
        <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
          <div className="bg-amber-50 border border-amber-300 px-3.5 sm:px-5 py-1.5 rounded-xl flex items-center gap-2.5 shadow-xs">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700 leading-none">
                Sisa Waktu
              </div>
              <div className="font-mono tabular-nums text-base sm:text-xl md:text-2xl font-black text-amber-900 tracking-wider leading-tight">
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-2 text-center">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <div className="text-left">
              <div className="text-[9px] uppercase font-bold text-rose-700 leading-none">Langgar</div>
              <div className="font-mono tabular-nums text-xs sm:text-sm font-bold text-rose-800 leading-tight">
                {violationsCount}/{config.maxViolations}
              </div>
            </div>
          </div>
        </div>

      </header>

      {/* BODY VIEW CONTAINER */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden gap-3">

        {/* MAIN VIEWPORT */}
        <main className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden relative shadow-sm">

          {/* Top Question Toolbar */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-4 py-2 flex items-center justify-between text-xs gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-sky-600 text-white px-3 py-1 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xs">
                <span>Soal No.</span>
                <strong className="text-sm sm:text-base font-mono tabular-nums">{currentIndex + 1}</strong>
                <span className="font-normal text-sky-100">/ {questions.length}</span>
              </span>

              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono">
                {assignedPackage}
              </span>

              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-bold hidden md:inline">
                {currentQ?.typeTitle || getTypeTitle(currentNormType)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(prev => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isSidebarOpen
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                }`}
                title={isSidebarOpen ? 'Sembunyikan panel nomor soal agar soal lebih lebar' : 'Buka panel nomor soal'}
              >
                {isSidebarOpen ? (
                  <>
                    <PanelRightClose className="w-3.5 h-3.5 text-sky-600" />
                    <span className="hidden sm:inline">Tutup Panel</span>
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="w-3.5 h-3.5 text-white" />
                    <span>Peta Soal ({questions.length})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsFullWidthSlide(prev => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition hidden sm:flex items-center gap-1 whitespace-nowrap shrink-0 ${
                  isFullWidthSlide
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="Pilih mode lebar soal untuk tampilan teks maksimal"
              >
                <span>{isFullWidthSlide ? 'Lebar Normal' : 'Lebar Penuh'}</span>
              </button>

              {currentQ?.passage && (
                <button
                  onClick={() => setShowPassage(prev => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition border whitespace-nowrap shrink-0 ${
                    showPassage
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{showPassage ? 'Tutup Wacana' : 'Wacana'}</span>
                </button>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5">
                <button
                  onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.15))}
                  className="px-2 py-1 text-slate-700 hover:bg-slate-100 rounded-lg"
                  title="Perkecil Tampilan"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 font-mono tabular-nums text-[11px] text-slate-800 font-bold">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.15))}
                  className="px-2 py-1 text-slate-700 hover:bg-slate-100 rounded-lg"
                  title="Perbesar Tampilan"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1.0)}
                  className="px-1.5 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                  title="Reset 100%"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold rounded-xl flex items-center gap-1 whitespace-nowrap shrink-0"
                title={isFullscreen ? 'Keluar dari Mode Layar Penuh' : 'Aktifkan Mode Layar Penuh'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5 text-sky-600" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
                )}
                <span className="hidden md:inline text-[11px]">
                  {isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
                </span>
              </button>
            </div>
          </div>

          {/* Center Canvas Area */}
          <div className="flex-1 flex overflow-hidden relative bg-[#eef4fb]">

            {showPassage && currentQ?.passage && (
              <div className="w-full md:w-5/12 bg-amber-50 text-slate-900 border-r border-amber-200 p-4 overflow-y-auto select-text shadow-md z-10 space-y-3 font-serif text-xs leading-relaxed">
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

            {/* Viewport Scroll Container */}
            <div className="flex-1 relative overflow-auto p-3 sm:p-5 flex items-start justify-center custom-scrollbar">
              <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  width: zoomLevel > 1 ? `${Math.round(zoomLevel * 100)}%` : '100%',
                  maxWidth: isFullWidthSlide ? '100%' : '960px'
                }}
                className="transition-transform duration-150 relative shadow-md rounded-2xl bg-white text-slate-900 border border-slate-200 my-1"
              >
                {/* Dynamic Forensic Watermark */}
                <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-around items-center opacity-10 rotate-[-15deg] select-none text-center">
                  <div className="font-mono text-xs md:text-sm font-bold text-slate-900 uppercase tracking-widest">
                    {studentName} &middot; {noPeserta} &middot; {config.schoolName}
                  </div>
                  <div className="font-mono text-xs md:text-sm font-bold text-slate-900 uppercase tracking-widest">
                    CBT RESMI {new Date().toLocaleDateString('id-ID')} &middot; {selectedKelas}
                  </div>
                </div>

                {/* Rendered Slide Content */}
                <div className="w-full min-h-[420px] p-5 sm:p-7 flex flex-col justify-between bg-white text-slate-900 rounded-2xl">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                        <span>{config.schoolName}</span>
                        <span className="text-slate-300">&middot;</span>
                        <span className="text-sky-700 font-bold">{currentQ?.subject || selectedMapel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                          Soal #{currentIndex + 1} dari {questions.length}
                        </span>
                      </div>
                    </div>

                    {/* Attached Question Image */}
                    {currentQ?.imageUrl ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 relative shadow-xs flex flex-col items-center justify-center p-2 sm:p-3">
                        <img
                          src={currentQ.imageUrl}
                          alt={`Soal #${currentIndex + 1}`}
                          className="w-full max-w-full h-auto object-contain rounded-lg transition-transform"
                        />
                        <div className="w-full text-center text-[10px] text-slate-500 pt-1.5 border-t border-slate-200 mt-2 flex items-center justify-between px-2 flex-wrap gap-2">
                          <span className="font-bold text-slate-700">Slide Soal #{currentIndex + 1}</span>
                          <span className="text-slate-400">Teks panjang otomatis dapat di-scroll ke bawah secara penuh</span>
                        </div>
                      </div>
                    ) : (
                      !currentQ?.questionText && (
                        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6 text-center text-xs text-amber-800">
                          Gambar slide soal belum ditemukan atau sedang dimuat. Hubungi pengawas jika slide tidak muncul.
                        </div>
                      )
                    )}

                    {/* Optional Long Scrollable Passage */}
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

                    {/* Custom Question Text Only If Teacher Provided Real Question Prompt (Never "Soal #X - MAPEL") */}
                    {currentQ?.questionText && stripAutoSoalText(currentQ.questionText) !== '' && (
                      <div className="space-y-2 pt-1">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                          {currentQ.questionText}
                        </h3>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-3 mt-6 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-600">{config.appTitle}</span>
                    <span>Peserta: <strong className="text-slate-800">{studentName}</strong> ({noPeserta})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM ANSWER INPUT DOCK & NAVIGATION */}
          <div className="bg-white border-t border-slate-200 p-3 sm:px-5 flex flex-col gap-3 shrink-0 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left: Question Number + Type + Answer Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className="bg-sky-50 text-sky-800 border border-sky-200 font-mono text-xs font-black px-2.5 py-1 rounded-lg">
                    Soal #{currentIndex + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {currentNormType === 'matrix'
                      ? 'Tepat / Tidak Tepat:'
                      : currentNormType === 'checkbox'
                      ? 'Multi Jawaban:'
                      : currentNormType === 'tf'
                      ? 'Benar / Salah:'
                      : 'Pilihan Jawaban:'}
                  </span>

                  {(currentNormType === 'slide_image' || currentNormType === 'mcq' || currentNormType === 'short') && (
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setAnswerMode('mcq')}
                        className={`px-2 py-1 rounded-md font-semibold transition ${
                          answerMode === 'mcq'
                            ? 'bg-white text-sky-700 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Opsi
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswerMode('short')}
                        className={`px-2 py-1 rounded-md font-semibold transition ${
                          answerMode === 'short'
                            ? 'bg-white text-sky-700 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Isian
                      </button>
                    </div>
                  )}
                </div>

                {/* TYPE 1: PILIHAN GANDA (PG) */}
                {(currentNormType === 'slide_image' || currentNormType === 'mcq') && answerMode === 'mcq' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {availableOptions.map((opt, idx) => {
                      const isSelected = answers[currentQ?.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectMCQ(opt)}
                          className={`relative min-w-[44px] h-10 px-3 rounded-xl font-black text-sm transition-all border flex items-center justify-center gap-1 active:scale-95 ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-200 shadow-sm'
                              : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-sky-50 hover:border-sky-400'
                          }`}
                          title={`Pilih jawaban ${opt} (Tekan ${opt} atau ${idx + 1} di keyboard)`}
                        >
                          <span>{opt}</span>
                          <span className={`text-[9px] font-mono hidden sm:inline ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                            [{idx + 1}]
                          </span>
                        </button>
                      );
                    })}

                    {answers[currentQ?.id] && (
                      <button
                        type="button"
                        onClick={() => handleSelectMCQ('')}
                        className="h-10 px-2.5 text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                )}

                {/* TYPE 2: ISIAN SINGKAT */}
                {((currentNormType === 'slide_image' || currentNormType === 'mcq' || currentNormType === 'short') && answerMode === 'short') && (
                  <div className="flex items-center gap-2 w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="Ketik jawaban singkat di sini..."
                      value={(answers[currentQ?.id] as string) || ''}
                      onChange={e => handleInputShort(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono"
                    />
                    {answers[currentQ?.id] && (
                      <button
                        type="button"
                        onClick={() => handleInputShort('')}
                        className="text-xs font-semibold text-slate-500 hover:text-rose-600 whitespace-nowrap"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                )}

                {/* TYPE 3: SALAH ATAU BENAR (BS) */}
                {currentNormType === 'tf' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSelectTF('BENAR')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 active:scale-95 ${
                        answers[currentQ.id] === 'BENAR'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>BENAR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTF('SALAH')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 active:scale-95 ${
                        answers[currentQ.id] === 'SALAH'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-200'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-rose-50 hover:border-rose-300'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      <span>SALAH</span>
                    </button>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">Shortcut: B / S</span>
                  </div>
                )}

                {/* TYPE 4: MULTI JAWABAN (MULTI) */}
                {currentNormType === 'checkbox' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {availableOptions.map(opt => {
                        const arr = Array.isArray(answers[currentQ.id]) ? (answers[currentQ.id] as string[]) : [];
                        const isChecked = arr.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleToggleCheckbox(opt)}
                            className={`min-w-[42px] h-10 px-3 rounded-xl text-xs font-black transition border flex items-center justify-center gap-1.5 ${
                              isChecked
                                ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200 shadow-sm'
                                : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-indigo-50 hover:border-indigo-300'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg">
                      Bisa pilih lebih dari 1 jawaban
                    </span>
                  </div>
                )}

                {/* TYPE 5: PERNYATAAN TEPAT / TIDAK TEPAT (TT - MAX 5 STATEMENTS A-E) */}
                {currentNormType === 'matrix' && (
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {matrixLabels.map((label, sIdx) => {
                      const arr = Array.isArray(answers[currentQ.id]) ? (answers[currentQ.id] as string[]) : [];
                      const selectedVal = arr[sIdx] || '';
                      return (
                        <div
                          key={label}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5"
                        >
                          <div className="text-[11px] font-extrabold text-slate-800 text-center">
                            Pernyataan {label}
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => handleSelectMatrixStatement(sIdx, 'TEPAT', matrixLabels.length)}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition ${
                                selectedVal === 'TEPAT'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50'
                              }`}
                            >
                              TEPAT
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectMatrixStatement(sIdx, 'TIDAK TEPAT', matrixLabels.length)}
                              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition leading-tight ${
                                selectedVal === 'TIDAK TEPAT'
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50'
                              }`}
                            >
                              TDK TEPAT
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <button
                  onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <button
                  onClick={toggleDoubt}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition whitespace-nowrap shrink-0 ${
                    doubtMap[currentQ?.id]
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <span>Ragu-Ragu</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-xs whitespace-nowrap shrink-0"
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowFinishConfirm(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Jawaban</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR (COLLAPSIBLE QUESTION MAP) */}
        {isSidebarOpen && (
          <aside className="w-full lg:w-72 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-4 shrink-0 shadow-sm">
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 truncate">{studentName}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                      {selectedKelas}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(false)}
                      className="text-slate-400 hover:text-slate-800 p-0.5 rounded hover:bg-slate-200 transition"
                      title="Tutup panel soal agar layar soal lebih lebar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600">
                  No: <strong className="text-slate-900">{noPeserta}</strong> &middot; {selectedMapel}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200">
                  <div className="bg-white border border-amber-200 p-2 rounded-lg text-center">
                    <div className="text-[10px] text-amber-700 font-semibold flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Sisa:</span>
                    </div>
                    <div className="font-mono tabular-nums font-bold text-xs text-amber-900 mt-0.5">
                      {formatTime(timeRemaining)}
                    </div>
                  </div>

                  <div className="bg-white border border-rose-200 p-2 rounded-lg text-center">
                    <div className="text-[10px] text-rose-700 font-semibold flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-600" />
                      <span>Langgar:</span>
                    </div>
                    <div className="font-mono tabular-nums font-bold text-xs text-rose-800 mt-0.5">
                      {violationsCount} / {config.maxViolations}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200">
                  <span className="font-bold text-slate-800">Peta Soal Ujian</span>
                  <span className="text-[11px] font-mono tabular-nums font-semibold text-slate-600">
                    {answeredCount} / {questions.length} Terjawab
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                  {questions.map((q, idx) => {
                    const isCurrent = idx === currentIndex;
                    const hasAnswer = isQuestionAnswered(answers[q.id]);
                    const isDoubt = doubtMap[q.id];

                    let bgClass = 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200';
                    if (isDoubt) bgClass = 'bg-amber-500 text-white font-bold border-amber-500';
                    else if (hasAnswer) bgClass = 'bg-emerald-600 text-white font-bold border-emerald-600';

                    if (isCurrent) bgClass += ' ring-2 ring-sky-500 ring-offset-2 ring-offset-white font-black';

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

            <div className="space-y-3 pt-2 border-t border-slate-200 text-[11px]">
              <button
                onClick={() => setShowFinishConfirm(true)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesai &amp; Kirim Ujian</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {showFinishConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl text-slate-900">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
              <Send className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900">Kirim Lembar Jawaban Sekarang?</h3>
              <p className="text-xs text-slate-600">
                Jawaban Anda akan dikoreksi otomatis untuk {config.schoolName}.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 text-[10px]">Terjawab:</span>
                <div className="font-bold text-emerald-700 text-sm font-mono tabular-nums">{answeredCount} Soal</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Belum Diisi:</span>
                <div className="font-bold text-slate-700 text-sm font-mono tabular-nums">{questions.length - answeredCount} Soal</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300"
              >
                Periksa Kembali
              </button>
              <button
                onClick={() => submitExamToServer(false)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow"
              >
                Ya, Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANTI-CHEATING WARNING MODAL */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-rose-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl text-slate-900">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-rose-700 uppercase tracking-wide">Peringatan Anti-Kecurangan!</h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                {warningMessage}
              </p>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-rose-800">
                Jumlah Pelanggaran: <span className="font-mono text-base text-rose-700">{violationsCount}</span> / {config.maxViolations}
              </div>
              <p className="text-[10px] text-rose-700">
                Jika mencapai batas toleransi ({config.maxViolations}x), ujian Anda akan disubmit otomatis.
              </p>
            </div>

            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow"
            >
              Saya Mengerti &amp; Kembali Ujian
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
