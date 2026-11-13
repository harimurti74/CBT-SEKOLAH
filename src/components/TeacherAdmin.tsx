import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { AppConfig, StudentSubmission, MasterStudent, SchoolLevel } from '../types';
import { encodeConfigForUrl } from '../utils/configCodec';
import { auth, googleProvider } from '../firebase';
import {
  clearCacheInCloud,
  CloudExamDoc,
  deleteImageFromCloud,
  fetchAllImagesFromCloud,
  fetchAllQuestionBanksFromCloud,
  fetchExamFromCloud,
  fetchMyExamsFromCloud,
  fetchRosterCountFromCloud,
  fetchSubmissionsFromCloud,
  getOrCreateLocalExamId,
  resetAllSubmissionsInCloud,
  resetStudentInCloud,
  saveQuestionBankToCloud,
  saveQuestionImagesToCloud,
  saveRosterToCloud,
  toFirestoreId,
  upsertExamToCloud
} from '../services/cbtFirestore';
import {
  formatScheduleId,
  getTypeTitle,
  normalizeQuestionType,
  parseMatrixKeys
} from '../utils/questionGrading';
import {
  Sliders,
  Upload,
  Key,
  FileSpreadsheet,
  RotateCcw,
  Search,
  Copy,
  Shuffle,
  Save,
  CheckCircle2,
  Users,
  Trash2,
  ArrowUpDown,
  Download,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  LogIn,
  Cloud,
  LogOut,
  CalendarClock,
  ShieldCheck,
  PlusCircle,
  FolderOpen
} from 'lucide-react';

interface Props {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

export const TeacherAdmin: React.FC<Props> = ({ config, onUpdateConfig }) => {
  // Form Inputs State
  const [appTitle, setAppTitle] = useState(config.appTitle);
  const [schoolName, setSchoolName] = useState(config.schoolName);
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>(config.schoolLevel || 'SMA/MA/SMK/MAK');
  const [verificationMode, setVerificationMode] = useState<'crosscheck' | 'manual'>(config.verificationMode || 'crosscheck');
  const [mapelsRaw, setMapelsRaw] = useState(config.mapels.join(', '));
  const [kelasRaw, setKelasRaw] = useState(config.kelas.join(', '));
  const [durationMinutes, setDurationMinutes] = useState(config.durationMinutes);
  const [maxViolations, setMaxViolations] = useState(config.maxViolations);
  const [activeToken, setActiveToken] = useState(config.token);
  const [shuffleQuestions, setShuffleQuestions] = useState(config.shuffleQuestions);

  // Schedule Settings State
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(Boolean(config.scheduleEnabled));
  const [scheduleStart, setScheduleStart] = useState<string>(config.scheduleStart || '');
  const [scheduleEnd, setScheduleEnd] = useState<string>(config.scheduleEnd || '');

  // Link Generator State
  const [linkMapel, setLinkMapel] = useState('all');
  const [linkKelas, setLinkKelas] = useState('all');
  const [generatedLink, setGeneratedLink] = useState('');

  // Table Filter & Indexing State
  const [activeClassFilter, setActiveClassFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('name_asc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [masterStudentsCount, setMasterStudentsCount] = useState<number>(0);
  const [questionsSummary, setQuestionsSummary] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Modals State
  const [showConfigKeysModal, setShowConfigKeysModal] = useState(false);
  const [showUploadExcelModal, setShowUploadExcelModal] = useState(false);
  const [showUploadQuestionsModal, setShowUploadQuestionsModal] = useState(false);
  const [showUploadImagesModal, setShowUploadImagesModal] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [studentToReset, setStudentToReset] = useState<StudentSubmission | null>(null);

  // Question Images State
  const [questionImagesCount, setQuestionImagesCount] = useState<number>(0);
  const [, setQuestionImagesList] = useState<any[]>([]);
  const [previewImagesToUpload, setPreviewImagesToUpload] = useState<any[]>([]);

  // Preview States for Uploads
  const [allParsedStudents, setAllParsedStudents] = useState<any[]>([]);
  const [previewStudents, setPreviewStudents] = useState<any[]>([]);
  const [allParsedQuestions, setAllParsedQuestions] = useState<any[]>([]);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');

  // Mandatory Cloud Auth & Saved Exams State
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [cloudUser, setCloudUser] = useState<User | null>(auth.currentUser);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [myCloudExams, setMyCloudExams] = useState<CloudExamDoc[]>([]);

  const examId = config.examId || getOrCreateLocalExamId(config.schoolName);

  useEffect(() => {
    setAppTitle(config.appTitle);
    setSchoolName(config.schoolName);
    setSchoolLevel(config.schoolLevel || 'SMA/MA/SMK/MAK');
    setVerificationMode(config.verificationMode || 'crosscheck');
    setMapelsRaw(config.mapels.join(', '));
    setKelasRaw(config.kelas.join(', '));
    setDurationMinutes(config.durationMinutes);
    setMaxViolations(config.maxViolations);
    setActiveToken(config.token);
    setShuffleQuestions(config.shuffleQuestions);
    setScheduleEnabled(Boolean(config.scheduleEnabled));
    setScheduleStart(config.scheduleStart || '');
    setScheduleEnd(config.scheduleEnd || '');
  }, [config]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3800);
  };

  const buildStudentLinkForConfig = useCallback((cfg: AppConfig, targetMapel = linkMapel, targetKelas = linkKelas) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.append('mode', 'student');
    params.append('exam', cfg.examId || examId);
    if (targetMapel !== 'all') params.append('mapel', targetMapel);
    if (targetKelas !== 'all') params.append('kelas', targetKelas);
    params.append('token', cfg.token || activeToken);
    const encodedCfg = encodeConfigForUrl(cfg);
    if (encodedCfg) params.append('cfg', encodedCfg);
    return `${baseUrl}?${params.toString()}`;
  }, [examId, linkMapel, linkKelas, activeToken]);

  const refreshSavedExamsList = useCallback(async () => {
    if (!auth.currentUser) {
      setMyCloudExams([]);
      return [];
    }
    try {
      const list = await fetchMyExamsFromCloud();
      setMyCloudExams(list);
      return list;
    } catch (_) {
      return [];
    }
  }, []);

  const syncLocalDataToCloud = async (activeCfg: AppConfig = config) => {
    if (!auth.currentUser) return;
    setIsCloudSyncing(true);
    const activeExamId = activeCfg.examId || getOrCreateLocalExamId(activeCfg.schoolName);
    try {
      await upsertExamToCloud(activeExamId, activeCfg);

      const syncedParts: string[] = [];
      try {
        const rawBank = localStorage.getItem('cbt_question_bank');
        if (rawBank) {
          const parsedBank = JSON.parse(rawBank);
          if (Array.isArray(parsedBank) && parsedBank.length > 0) {
            await saveQuestionBankToCloud(activeExamId, activeCfg, parsedBank);
            syncedParts.push(`${parsedBank.length} soal`);
          }
        }
      } catch (_) {}

      try {
        const rawImgs = localStorage.getItem('cbt_question_images');
        if (rawImgs) {
          const parsedImgs = JSON.parse(rawImgs);
          const imgValues = Object.values(parsedImgs || {}) as any[];
          if (imgValues.length > 0) {
            await saveQuestionImagesToCloud(activeExamId, activeCfg, imgValues);
            syncedParts.push(`${imgValues.length} gambar`);
          }
        }
      } catch (_) {}

      try {
        const rawMaster = localStorage.getItem('cbt_master_students');
        if (rawMaster) {
          const parsedMaster = JSON.parse(rawMaster);
          if (Array.isArray(parsedMaster) && parsedMaster.length > 0) {
            await saveRosterToCloud(activeExamId, activeCfg, parsedMaster);
            syncedParts.push(`${parsedMaster.length} siswa`);
          }
        }
      } catch (_) {}

      await refreshSavedExamsList();

      if (syncedParts.length > 0) {
        showToast(`Tersimpan ke Cloud: ${syncedParts.join(', ')} siap diakses kapan saja!`);
      } else {
        showToast('Pengaturan ujian berhasil disinkronkan ke Cloud Firestore.');
      }
    } catch (err) {
      console.error('Cloud sync error:', err);
      showToast('Gagal sinkronisasi ke Cloud Firestore. Periksa koneksi internet.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleCloudGoogleSignIn = async () => {
    setAuthError('');
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setCloudUser(cred.user);
      const savedExams = await refreshSavedExamsList();
      const currentCloud = await fetchExamFromCloud(examId);
      if (!currentCloud && savedExams.length === 0) {
        await syncLocalDataToCloud(config);
      } else if (currentCloud) {
        const merged: AppConfig = {
          ...config,
          ...currentCloud,
          examId: currentCloud.examId
        };
        onUpdateConfig(merged);
        setGeneratedLink(buildStudentLinkForConfig(merged));
      }
      await fetchMasterDataSummary(examId);
      await fetchSubmissions(examId);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setAuthError('Login Google dibatalkan atau popup terblokir peramban. Izinkan popup lalu coba lagi.');
    }
  };

  const handleCloudSignOut = async () => {
    try {
      await signOut(auth);
      setCloudUser(null);
      setMyCloudExams([]);
      showToast('Anda telah keluar dari akun Guru.');
    } catch (_) {}
  };

  const handleSelectCloudExam = async (selectedExamId: string) => {
    if (!selectedExamId) return;
    setIsCloudSyncing(true);
    try {
      const targetDoc = await fetchExamFromCloud(selectedExamId);
      if (targetDoc) {
        const loadedCfg: AppConfig = {
          examId: targetDoc.examId,
          appTitle: targetDoc.appTitle || 'SIMULASI UJIAN CBT SLIDE',
          schoolName: targetDoc.schoolName || config.schoolName,
          schoolLevel: targetDoc.schoolLevel || 'SMA/MA/SMK/MAK',
          token: targetDoc.token || 'CBT2026',
          gdriveUrl: '',
          mapels: targetDoc.mapels?.length ? targetDoc.mapels : config.mapels,
          kelas: targetDoc.kelas?.length ? targetDoc.kelas : config.kelas,
          durationMinutes: targetDoc.durationMinutes || 90,
          maxViolations: targetDoc.maxViolations ?? 3,
          shuffleQuestions: Boolean(targetDoc.shuffleQuestions),
          verificationMode: targetDoc.verificationMode === 'manual' ? 'manual' : 'crosscheck',
          scheduleEnabled: Boolean(targetDoc.scheduleEnabled),
          scheduleStart: targetDoc.scheduleStart || '',
          scheduleEnd: targetDoc.scheduleEnd || ''
        };
        onUpdateConfig(loadedCfg);
        localStorage.setItem('cbt_exam_id', targetDoc.examId);
        localStorage.setItem('cbt_app_config', JSON.stringify(loadedCfg));
        setGeneratedLink(buildStudentLinkForConfig(loadedCfg, 'all', 'all'));
        setLinkMapel('all');
        setLinkKelas('all');
        await fetchMasterDataSummary(targetDoc.examId);
        await fetchSubmissions(targetDoc.examId);
        showToast(`Data ujian "${loadedCfg.appTitle}" (${targetDoc.examId}) berhasil dimuat!`);
      }
    } catch (err) {
      showToast('Gagal memuat data ujian dari Cloud.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleCreateNewExam = async () => {
    const slug = toFirestoreId(schoolName || 'sekolah').slice(0, 20);
    const rand = Math.random().toString(36).slice(2, 8);
    const newId = `cbt_${slug}_${rand}`;
    const newCfg: AppConfig = {
      ...config,
      examId: newId,
      appTitle: appTitle.trim() || 'SIMULASI UJIAN CBT SLIDE',
      schoolName: schoolName.trim() || config.schoolName,
      scheduleEnabled: false,
      scheduleStart: '',
      scheduleEnd: ''
    };
    onUpdateConfig(newCfg);
    localStorage.setItem('cbt_exam_id', newId);
    localStorage.setItem('cbt_app_config', JSON.stringify(newCfg));
    localStorage.removeItem('cbt_question_bank');
    localStorage.removeItem('cbt_question_images');
    localStorage.removeItem('cbt_submissions');
    setQuestionsSummary([]);
    setQuestionImagesCount(0);
    setQuestionImagesList([]);
    setSubmissions([]);
    setGeneratedLink('');
    if (auth.currentUser) {
      await upsertExamToCloud(newId, newCfg);
      await refreshSavedExamsList();
    }
    showToast(`Sesi ujian baru dibuat dengan ID: ${newId}`);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCloudUser(user);
      setAuthReady(true);
      if (user) {
        try {
          const list = await refreshSavedExamsList();
          const cloudExam = await fetchExamFromCloud(examId);
          if (cloudExam) {
            const merged: AppConfig = {
              ...config,
              ...cloudExam,
              examId: cloudExam.examId
            };
            onUpdateConfig(merged);
            setGeneratedLink(prev => prev || buildStudentLinkForConfig(merged));
          } else if (list.length === 0) {
            await upsertExamToCloud(examId, config);
            await refreshSavedExamsList();
          }
        } catch (_) {}
        fetchMasterDataSummary(examId);
        fetchSubmissions(examId);
      }
    });
    return () => unsub();
  }, [examId]);

  const applySubmissionFiltersAndSort = (rawList: StudentSubmission[]) => {
    let list = [...rawList];
    if (activeClassFilter !== 'all') {
      list = list.filter(s => s.className === activeClassFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(s =>
        s.studentName.toLowerCase().includes(q) || s.noPeserta.toLowerCase().includes(q)
      );
    }
    if (sortOption === 'name_asc') list.sort((a, b) => a.studentName.localeCompare(b.studentName));
    else if (sortOption === 'name_desc') list.sort((a, b) => b.studentName.localeCompare(a.studentName));
    else if (sortOption === 'no_asc') list.sort((a, b) => String(a.noPeserta).localeCompare(String(b.noPeserta), undefined, { numeric: true }));
    else if (sortOption === 'no_desc') list.sort((a, b) => String(b.noPeserta).localeCompare(String(a.noPeserta), undefined, { numeric: true }));
    else if (sortOption === 'score_desc') list.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    else if (sortOption === 'score_asc') list.sort((a, b) => (a.percentage || 0) - (b.percentage || 0));
    return list;
  };

  const fetchSubmissions = async (targetExamId = examId) => {
    if (!auth.currentUser) return;
    let serverOk = false;
    try {
      const params = new URLSearchParams();
      if (activeClassFilter !== 'all') params.append('kelas', activeClassFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (sortOption) params.append('sort', sortOption);

      const res = await fetch(`/api/admin/submissions?${params.toString()}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.submissions) && data.submissions.length > 0) {
          setSubmissions(data.submissions);
          serverOk = true;
        }
      }
    } catch (_) {
      serverOk = false;
    }

    if (!serverOk && auth.currentUser) {
      try {
        const cloudSubs = await fetchSubmissionsFromCloud(targetExamId);
        try {
          localStorage.setItem('cbt_submissions', JSON.stringify(cloudSubs));
        } catch (_) {}
        setSubmissions(applySubmissionFiltersAndSort(cloudSubs));
        return;
      } catch (_) {}
    }

    if (!serverOk) {
      try {
        const raw = localStorage.getItem('cbt_submissions');
        if (raw) {
          const list: StudentSubmission[] = JSON.parse(raw);
          setSubmissions(applySubmissionFiltersAndSort(list));
        } else {
          setSubmissions([]);
        }
      } catch (_) {}
    }
  };

  const fetchMasterDataSummary = async (targetExamId = examId) => {
    if (!auth.currentUser) return;

    // 1. Master Students
    let masterResolved = false;
    try {
      const cloudCount = await fetchRosterCountFromCloud(targetExamId);
      setMasterStudentsCount(cloudCount);
      masterResolved = true;
    } catch (_) {}

    if (!masterResolved) {
      try {
        const resSt = await fetch('/api/admin/master-students');
        const ct = resSt.headers.get('content-type') || '';
        if (resSt.ok && ct.includes('application/json')) {
          const dataSt = await resSt.json();
          if (dataSt.success) {
            setMasterStudentsCount(typeof dataSt.total === 'number' ? dataSt.total : (dataSt.students?.length || 0));
            masterResolved = true;
          }
        }
      } catch (_) {}
    }

    if (!masterResolved) {
      const raw = localStorage.getItem('cbt_master_students');
      setMasterStudentsCount(raw ? JSON.parse(raw).length : 0);
    }

    // 2. Questions Summary
    let bankResolved = false;
    try {
      const cloudQuestions = await fetchAllQuestionBanksFromCloud(targetExamId);
      if (cloudQuestions.length > 0) {
        setQuestionsSummary(cloudQuestions);
        try {
          localStorage.setItem('cbt_question_bank', JSON.stringify(cloudQuestions));
        } catch (_) {}
        bankResolved = true;
      }
    } catch (_) {}

    if (!bankResolved) {
      try {
        const resQ = await fetch('/api/admin/questions-summary');
        const ct = resQ.headers.get('content-type') || '';
        if (resQ.ok && ct.includes('application/json')) {
          const dataQ = await resQ.json();
          if (dataQ.success) {
            setQuestionsSummary(Array.isArray(dataQ.questions) ? dataQ.questions : []);
            bankResolved = true;
          }
        }
      } catch (_) {}
    }

    if (!bankResolved) {
      const raw = localStorage.getItem('cbt_question_bank');
      setQuestionsSummary(raw ? JSON.parse(raw) : []);
    }

    // 3. Question Images
    let imgResolved = false;
    try {
      const cloudImgs = await fetchAllImagesFromCloud(targetExamId);
      setQuestionImagesCount(cloudImgs.length);
      setQuestionImagesList(cloudImgs);
      if (cloudImgs.length > 0) {
        try {
          const imgMap: Record<string, any> = {};
          cloudImgs.forEach((im: any) => {
            if (im.cleanName) imgMap[String(im.cleanName).toLowerCase()] = im;
          });
          localStorage.setItem('cbt_question_images', JSON.stringify(imgMap));
        } catch (_) {}
      }
      imgResolved = true;
    } catch (_) {}

    if (!imgResolved) {
      const raw = localStorage.getItem('cbt_question_images');
      if (raw) {
        const parsed = JSON.parse(raw);
        setQuestionImagesCount(Object.keys(parsed).length);
        setQuestionImagesList(Object.values(parsed));
      } else {
        setQuestionImagesCount(0);
        setQuestionImagesList([]);
      }
    }
  };

  useEffect(() => {
    if (!cloudUser) return;
    fetchSubmissions(examId);
    const timer = setInterval(() => fetchSubmissions(examId), 6000);
    return () => clearInterval(timer);
  }, [cloudUser, examId, activeClassFilter, sortOption, searchQuery]);

  // Save Identity Settings
  const handleSaveIdentity = async () => {
    const cleanTitle = appTitle.trim() || 'SIMULASI UJIAN CBT SLIDE';
    const cleanSchool = schoolName.trim() || 'SMA Negeri 1 Wonogiri';

    const updated: AppConfig = {
      ...config,
      examId,
      appTitle: cleanTitle,
      schoolName: cleanSchool,
      schoolLevel,
      verificationMode
    };

    onUpdateConfig(updated);
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(updated));
    } catch (_) {}

    if (auth.currentUser) {
      try {
        await upsertExamToCloud(examId, updated);
        await refreshSavedExamsList();
      } catch (_) {}
    }

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    showToast('Identitas Ujian & Nama Sekolah tersimpan ke Cloud!');
  };

  // Save Timing, Tolerance & Schedule Settings
  const handleSaveTimingAndSchedule = async () => {
    if (scheduleEnabled && (!scheduleStart || !scheduleEnd)) {
      showToast('Isi Tanggal & Jam Awal serta Jam Akhir pengerjaan terlebih dahulu.');
      return;
    }
    if (scheduleEnabled && scheduleStart && scheduleEnd) {
      const startMs = new Date(scheduleStart).getTime();
      const endMs = new Date(scheduleEnd).getTime();
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
        showToast('Waktu Akhir pengerjaan harus lebih lambat dari Waktu Mulai.');
        return;
      }
    }

    const updated: AppConfig = {
      ...config,
      examId,
      durationMinutes: Math.max(1, Number(durationMinutes) || 90),
      maxViolations: Math.max(0, Number(maxViolations) ?? 3),
      scheduleEnabled,
      scheduleStart: scheduleEnabled ? scheduleStart : '',
      scheduleEnd: scheduleEnabled ? scheduleEnd : ''
    };

    onUpdateConfig(updated);
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(updated));
    } catch (_) {}

    if (auth.currentUser) {
      try {
        await upsertExamToCloud(examId, updated);
        await refreshSavedExamsList();
      } catch (_) {}
    }

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    if (generatedLink) {
      setGeneratedLink(buildStudentLinkForConfig(updated));
    }

    showToast(
      scheduleEnabled
        ? 'Jadwal pengerjaan, durasi, dan toleransi berhasil disimpan!'
        : 'Durasi bebas waktu & toleransi pelanggaran berhasil disimpan!'
    );
  };

  // Save Dropdowns
  const handleSaveDropdowns = async () => {
    const mapels = mapelsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const kelas = kelasRaw.split(',').map(s => s.trim()).filter(Boolean);

    if (mapels.length === 0 || kelas.length === 0) {
      showToast('Daftar Mapel dan Kelas tidak boleh kosong!');
      return;
    }

    const updated: AppConfig = {
      ...config,
      examId,
      mapels,
      kelas
    };

    onUpdateConfig(updated);
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(updated));
    } catch (_) {}

    if (activeClassFilter !== 'all' && !kelas.includes(activeClassFilter)) setActiveClassFilter('all');
    if (linkMapel !== 'all' && !mapels.includes(linkMapel)) setLinkMapel('all');
    if (linkKelas !== 'all' && !kelas.includes(linkKelas)) setLinkKelas('all');

    if (auth.currentUser) {
      try {
        await upsertExamToCloud(examId, updated);
        await refreshSavedExamsList();
      } catch (_) {}
    }

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    showToast('Pilihan Mapel & Kelas Siswa berhasil diperbarui!');
  };

  // Generate Student Link
  const handleGenerateLink = async () => {
    const parsedMapels = mapelsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const parsedKelas = kelasRaw.split(',').map(s => s.trim()).filter(Boolean);

    const latestConfig: AppConfig = {
      ...config,
      examId,
      appTitle: appTitle.trim() || config.appTitle,
      schoolName: schoolName.trim() || config.schoolName,
      schoolLevel,
      verificationMode,
      mapels: parsedMapels.length > 0 ? parsedMapels : config.mapels,
      kelas: parsedKelas.length > 0 ? parsedKelas : config.kelas,
      gdriveUrl: '',
      durationMinutes,
      maxViolations,
      token: activeToken,
      shuffleQuestions,
      scheduleEnabled,
      scheduleStart: scheduleEnabled ? scheduleStart : '',
      scheduleEnd: scheduleEnabled ? scheduleEnd : ''
    };

    onUpdateConfig(latestConfig);
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(latestConfig));
    } catch (_) {}

    if (auth.currentUser) {
      try {
        await upsertExamToCloud(examId, latestConfig);
        await refreshSavedExamsList();
      } catch (_) {}
    }

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latestConfig)
    }).catch(() => {});

    const url = buildStudentLinkForConfig(latestConfig, linkMapel, linkKelas);
    setGeneratedLink(url);

    let desc = 'Link Khusus Siswa (Semua Mapel & Semua Kelas)';
    if (linkMapel !== 'all' && linkKelas !== 'all') desc = `Link Khusus Siswa - ${linkMapel} (${linkKelas})`;
    else if (linkMapel !== 'all') desc = `Link Khusus Siswa - Mapel ${linkMapel} (Semua Kelas)`;
    else if (linkKelas !== 'all') desc = `Link Khusus Siswa - Kelas ${linkKelas} (Semua Mapel)`;

    showToast(`${desc} berhasil dibuat & tersimpan ke Cloud!`);
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    showToast('Link ujian siswa berhasil disalin ke clipboard!');
  };

  const handleGenerateNewToken = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setActiveToken(res);

    const updated: AppConfig = {
      ...config,
      examId,
      token: res
    };

    onUpdateConfig(updated);
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(updated));
    } catch (_) {}

    if (auth.currentUser) {
      try {
        await upsertExamToCloud(examId, updated);
        await refreshSavedExamsList();
      } catch (_) {}
    }

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    if (generatedLink) {
      setGeneratedLink(buildStudentLinkForConfig(updated));
    }

    showToast(`TOKEN Soal Baru Dibuat: ${res}`);
  };

  const handleToggleShuffle = async () => {
    const nextVal = !shuffleQuestions;
    setShuffleQuestions(nextVal);

    const updated: AppConfig = {
      ...config,
      examId,
      shuffleQuestions: nextVal
    };

    onUpdateConfig(updated);
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(updated));
    } catch (_) {}

    if (auth.currentUser) {
      try {
        await upsertExamToCloud(examId, updated);
      } catch (_) {}
    }

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    showToast(`Pengacakan nomor soal: ${nextVal ? 'ON (Acak Aktif)' : 'OFF (Sesuai Urutan)'}`);
  };

  const confirmResetStudent = async (sub: StudentSubmission, resetType: 'login_only' | 'full_reset' = 'full_reset') => {
    try {
      const raw = localStorage.getItem('cbt_submissions');
      if (raw) {
        const subs: StudentSubmission[] = JSON.parse(raw);
        if (resetType === 'login_only') {
          const updatedSubs = subs.map(s =>
            s.id === sub.id || s.noPeserta === sub.noPeserta ? { ...s, status: 'Sedang Mengerjakan' as const } : s
          );
          localStorage.setItem('cbt_submissions', JSON.stringify(updatedSubs));
        } else {
          const filtered = subs.filter(s => s.id !== sub.id && s.noPeserta !== sub.noPeserta);
          localStorage.setItem('cbt_submissions', JSON.stringify(filtered));
        }
      }
    } catch (_) {}

    if (resetType === 'login_only') {
      setSubmissions(prev => prev.map(s =>
        s.id === sub.id || s.noPeserta === sub.noPeserta ? { ...s, status: 'Sedang Mengerjakan' as const } : s
      ));
    } else {
      setSubmissions(prev => prev.filter(s => s.id !== sub.id && s.noPeserta !== sub.noPeserta));
    }

    if (auth.currentUser) {
      try {
        await resetStudentInCloud(examId, sub.id, resetType);
      } catch (_) {}
    }

    try {
      const res = await fetch('/api/admin/reset-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: sub.id, noPeserta: sub.noPeserta, resetType })
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        showToast(data.message || 'Reset peserta berhasil!');
      } else {
        showToast(
          resetType === 'login_only'
            ? `Reset Login berhasil: ${sub.studentName} dapat melanjutkan ujian!`
            : `Reset Total berhasil: Seluruh data ${sub.studentName} dihapus.`
        );
      }
    } catch (_) {
      showToast(
        resetType === 'login_only'
          ? `Reset Login siswa ${sub.studentName} berhasil!`
          : `Sesi siswa ${sub.studentName} di-reset total.`
      );
    }

    setStudentToReset(null);
    fetchSubmissions(examId);
  };

  const confirmResetAll = async () => {
    try {
      localStorage.removeItem('cbt_submissions');
      localStorage.removeItem('cbt_active_session');
      sessionStorage.removeItem('cbt_active_session');
    } catch (_) {}

    setSubmissions([]);

    if (auth.currentUser) {
      try {
        await resetAllSubmissionsInCloud(examId);
      } catch (_) {}
    }

    try {
      await fetch('/api/admin/reset-all', { method: 'POST' });
    } catch (_) {}

    showToast('Seluruh sesi ujian peserta berhasil di-reset!');
    setShowResetAllModal(false);
    fetchSubmissions(examId);
  };

  const handleExportExcel = () => {
    if (submissions.length === 0) {
      showToast('Belum ada data nilai peserta untuk diekspor ke Excel!');
      return;
    }

    const excelRows = submissions.map((s, idx) => ({
      'No': idx + 1,
      'Nama Peserta': s.studentName,
      'No. Peserta': s.noPeserta,
      'Kelas': s.className,
      'Mata Pelajaran': s.subject,
      'Paket Soal': s.assignedPackage || 'Paket Standar',
      'Nilai Akhir (0-100)': s.percentage,
      'Poin Diperoleh': s.score,
      'Poin Maksimal': s.maxScore,
      'Status Ujian': s.status,
      'Pelanggaran (Pindah Tab)': s.violationsCount,
      'Waktu Mulai': s.startTime,
      'Waktu Selesai': s.submitTime,
      'Nama Sekolah': s.schoolName
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    worksheet['!cols'] = [
      { wch: 6 }, { wch: 26 }, { wch: 16 }, { wch: 12 }, { wch: 18 },
      { wch: 14 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
      { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 26 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekapitulasi Nilai CBT');

    const fileName = `Rekap_Nilai_CBT_${config.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast('File Excel (.xlsx) berhasil diunduh langsung!');
  };

  const handleExportCSV = () => {
    if (submissions.length === 0) {
      showToast('Belum ada data untuk diekspor!');
      return;
    }

    let csv = '\uFEFFNo,Nama Siswa,No Peserta,Sekolah,Kelas,Mapel,Paket,Status,Pelanggaran,Nilai,Waktu Selesai\n';
    submissions.forEach((s, idx) => {
      csv += `${idx + 1},"${s.studentName}","${s.noPeserta}","${s.schoolName}","${s.className}","${s.subject}","${s.assignedPackage || 'A'}","${s.status}",${s.violationsCount},${s.percentage},"${s.submitTime}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Nilai_${config.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File CSV berhasil diunduh!');
  };

  const handleClearCache = async (target: 'all' | 'questions') => {
    try {
      if (target === 'questions' || target === 'all') {
        localStorage.removeItem('cbt_question_bank');
        localStorage.removeItem('cbt_question_images');
        setQuestionsSummary([]);
        setQuestionImagesCount(0);
        setQuestionImagesList([]);
      }
      if (target === 'all') {
        localStorage.removeItem('cbt_master_students');
        localStorage.removeItem('cbt_submissions');
        setMasterStudentsCount(0);
        setSubmissions([]);
      }
      localStorage.removeItem('cbt_active_session');
      sessionStorage.clear();
    } catch (_) {}

    if (auth.currentUser) {
      try {
        await clearCacheInCloud(examId, config, target);
      } catch (_) {}
    }

    try {
      await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      });
    } catch (_) {}

    showToast(
      target === 'questions'
        ? 'Bank soal dan gambar berhasil dibersihkan!'
        : 'Semua cache data ujian berhasil dibersihkan total!'
    );

    setShowClearCacheModal(false);
    fetchMasterDataSummary(examId);
    fetchSubmissions(examId);
  };

  const handleLoadDemoData = async () => {
    try {
      const res = await fetch('/api/admin/load-demo-data', { method: 'POST' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          showToast(data.message);
          fetchMasterDataSummary(examId);
          fetchSubmissions(examId);
          return;
        }
      }
    } catch (_) {}

    const defaultSubject = (config.mapels?.[0] || 'TIK').toUpperCase();
    const demoBank = Array.from({ length: 5 }, (_, idx) => ({
      id: idx + 1,
      subject: defaultSubject,
      type: 'slide_image',
      typeTitle: 'Pilihan Ganda',
      questionCode: `${defaultSubject}_${idx + 1}`,
      slideFileName: `${defaultSubject}_${idx + 1}`,
      questionText: '',
      options: ['A', 'B', 'C', 'D', 'E'],
      maxPoints: 20,
      key: ['A', 'B', 'C', 'D', 'E'][idx % 5]
    }));

    const demoStudents: MasterStudent[] = [
      { no: 1, name: 'ADI', noPeserta: '2026001', className: config.kelas?.[0] || '12A', subject: defaultSubject },
      { no: 2, name: 'PAIMAN', noPeserta: '2026009', className: config.kelas?.[0] || '12A', subject: defaultSubject }
    ];

    try {
      localStorage.setItem('cbt_question_bank', JSON.stringify(demoBank));
      localStorage.setItem('cbt_master_students', JSON.stringify(demoStudents));
      setQuestionsSummary(demoBank);
      setMasterStudentsCount(demoStudents.length);
    } catch (_) {}

    if (auth.currentUser) {
      setIsCloudSyncing(true);
      try {
        await saveQuestionBankToCloud(examId, config, demoBank);
        await saveRosterToCloud(examId, config, demoStudents);
        await refreshSavedExamsList();
      } finally {
        setIsCloudSyncing(false);
      }
    }

    showToast(`Data demo (${demoBank.length} soal & ${demoStudents.length} siswa) berhasil dimuat!`);
    fetchMasterDataSummary(examId);
  };

  // Spreadsheet Helpers
  const parseSpreadsheetFile = async (file: File): Promise<any[]> => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) {
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
        if (rows && rows.length > 0) {
          return rows.map((r: any) => {
            const cleanObj: any = {};
            Object.keys(r).forEach(k => {
              cleanObj[k.trim()] = typeof r[k] === 'string' ? r[k].trim() : r[k];
            });
            return cleanObj;
          });
        }
      }
    } catch (_) {}

    try {
      const text = await file.text();
      return parseCSVText(text);
    } catch (_) {
      return [];
    }
  };

  const parseCSVText = (text: string) => {
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj: any = {};
      headers.forEach((h, hIdx) => {
        obj[h] = values[hIdx] !== undefined ? values[hIdx] : '';
      });
      rows.push(obj);
    }
    return rows;
  };

  const handleStudentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);

    try {
      const parsed = await parseSpreadsheetFile(file);
      if (parsed.length > 0) {
        setAllParsedStudents(parsed);
        setPreviewStudents(parsed);
        showToast(`Berhasil membaca ${parsed.length} data siswa dari file "${file.name}"`);
      } else {
        showToast('File tidak memiliki data atau format tidak terbaca');
      }
    } catch (_) {
      showToast('Gagal memproses file siswa');
    }
  };

  const handleConfirmSaveStudents = async () => {
    const studentsToSave = allParsedStudents.length > 0 ? allParsedStudents : previewStudents;
    if (studentsToSave.length === 0) return;

    const sanitized = studentsToSave.map((s: any, idx: number) => {
      const name = String(s.name || s.nama || s.Nama || s['Nama Siswa'] || s['NAMA'] || '').trim().toUpperCase();
      const noPeserta = String(s.noPeserta || s.no || s['No Peserta'] || s['No. Peserta'] || s['No '] || s['NIS'] || s['NO'] || idx + 1).trim();
      const className = String(s.className || s.kelas || s.Kelas || s['Kelas'] || s['KELAS'] || '12A').trim();
      const subject = String(s.subject || s.mapel || s.Mapel || s['Mapel'] || s['MAPEL'] || 'UMUM').trim().toUpperCase();
      return { no: idx + 1, name, noPeserta, className, subject };
    }).filter((s: any) => s.name && s.noPeserta);

    try {
      localStorage.setItem('cbt_master_students', JSON.stringify(sanitized));
      setMasterStudentsCount(sanitized.length);
    } catch (_) {}

    if (auth.currentUser) {
      setIsCloudSyncing(true);
      try {
        await saveRosterToCloud(examId, config, sanitized);
        await refreshSavedExamsList();
      } catch (err) {
        console.error('Cloud roster save error:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    }

    try {
      await fetch('/api/admin/upload-master-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: sanitized })
      });
    } catch (_) {}

    showToast(`Tersimpan ke Cloud Firestore: ${sanitized.length} data siswa!`);
    setShowUploadExcelModal(false);
    setPreviewStudents([]);
    setAllParsedStudents([]);
    fetchMasterDataSummary(examId);
  };

  const handleQuestionsFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);

    try {
      const parsed = await parseSpreadsheetFile(file);
      if (parsed.length > 0) {
        setAllParsedQuestions(parsed);
        setPreviewQuestions(parsed);
        showToast(`Berhasil membaca ${parsed.length} nomor soal dari file "${file.name}"`);
      } else {
        showToast('File soal tidak memiliki baris data');
      }
    } catch (_) {
      showToast('Gagal memproses file soal');
    }
  };

  const handleConfirmSaveQuestions = async () => {
    const questionsToSave = allParsedQuestions.length > 0 ? allParsedQuestions : previewQuestions;
    if (questionsToSave.length === 0) return;
    const cleanFileName = uploadFileName.replace(/\.[^/.]+$/, '').trim().toUpperCase();

    const newBank: any[] = questionsToSave.map((row: any, idx: number) => {
      const num = Number(row.NO || row.No || row.no || idx + 1);
      let subject = String(row.MAPEL || row.Mapel || (cleanFileName && cleanFileName !== 'SEMUA MAPEL' ? cleanFileName : 'TIK')).trim().toUpperCase();
      if (!subject || subject === 'SEMUA MAPEL') subject = 'TIK';

      const rawType = row.TIPE || row.Tipe || row.tipe || row.TYPE || row.type || 'PG';
      const normType = normalizeQuestionType(rawType);
      const typeTitle = getTypeTitle(normType);

      const baseCode = String(row.SOAL || row.Soal || `${subject}_${num}`).trim();
      const codeA = String(row.A || row['a'] || '').trim();
      const codeB = String(row.B || row['b'] || '').trim();
      const codeC = String(row.C || row['c'] || '').trim();
      const codeD = String(row.D || row['d'] || '').trim();

      const keyA = String(row['KUNCI A'] || row['kunci a'] || row['Kunci A'] || row['KUNCI'] || row['kunci'] || 'A').trim().toUpperCase();
      const keyB = String(row['KUNCI B'] || row['kunci b'] || row['Kunci B'] || keyA).trim().toUpperCase();
      const keyC = String(row['KUNCI C'] || row['kunci c'] || row['Kunci C'] || keyA).trim().toUpperCase();
      const keyD = String(row['KUNCI D'] || row['kunci d'] || row['Kunci D'] || row['kunci D'] || keyA).trim().toUpperCase();

      const variants: Record<string, any> = {};
      if (codeA) variants['A'] = { code: 'A', fileName: codeA, key: keyA };
      if (codeB) variants['B'] = { code: 'B', fileName: codeB, key: keyB };
      if (codeC) variants['C'] = { code: 'C', fileName: codeC, key: keyC };
      if (codeD) variants['D'] = { code: 'D', fileName: codeD, key: keyD };

      const customPrompt = String(row.TEKS_SOAL || row.PERTANYAAN || '').trim();
      const statementLabels =
        normType === 'matrix'
          ? ['A', 'B', 'C', 'D', 'E'].slice(0, Math.min(5, Math.max(1, parseMatrixKeys(keyA).length)))
          : undefined;

      return {
        id: num,
        subject,
        type: normType,
        typeTitle,
        questionCode: baseCode,
        slideFileName: codeA || baseCode,
        questionText: customPrompt,
        options: ['A', 'B', 'C', 'D', 'E'],
        statementLabels,
        maxPoints: 10,
        variants: Object.keys(variants).length > 0 ? variants : undefined,
        key: keyA
      };
    });

    let combinedBank = newBank;
    try {
      let existingBank: any[] = [];
      const raw = localStorage.getItem('cbt_question_bank');
      if (raw) existingBank = JSON.parse(raw);

      const targetSubjects = Array.from(new Set(newBank.map((q: any) => String(q.subject).toUpperCase())));
      const filtered = existingBank.filter((q: any) => !targetSubjects.includes(String(q.subject).toUpperCase()));
      combinedBank = [...filtered, ...newBank];
      localStorage.setItem('cbt_question_bank', JSON.stringify(combinedBank));
      setQuestionsSummary(combinedBank);
    } catch (_) {}

    if (auth.currentUser) {
      setIsCloudSyncing(true);
      try {
        await saveQuestionBankToCloud(examId, config, combinedBank);
        await refreshSavedExamsList();
      } catch (err) {
        console.error('Cloud question bank save error:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    }

    try {
      await fetch('/api/admin/upload-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questionsToSave,
          mapelFileName: cleanFileName
        })
      });
    } catch (_) {}

    showToast(`Tersimpan ke Cloud Firestore: ${newBank.length} soal (multi-tipe PG / BS / MULTI / TT)!`);
    setShowUploadQuestionsModal(false);
    setPreviewQuestions([]);
    setAllParsedQuestions([]);
    fetchMasterDataSummary(examId);
  };

  // Image Upload Handlers
  const handleImagesFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArr = Array.from(fileList);
    const loadedPreviews: any[] = [];
    let processed = 0;

    filesArr.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        const cleanName = file.name.replace(/\.[^/.]+$/, '').trim().toLowerCase();
        loadedPreviews.push({
          name: file.name,
          cleanName,
          type: file.type,
          sizeKb: Math.round(file.size / 1024),
          dataUrl
        });

        processed++;
        if (processed === filesArr.length) {
          setPreviewImagesToUpload(loadedPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleConfirmSaveImages = async () => {
    if (previewImagesToUpload.length === 0) return;

    try {
      let existingImages: Record<string, any> = {};
      const raw = localStorage.getItem('cbt_question_images');
      if (raw) existingImages = JSON.parse(raw);

      previewImagesToUpload.forEach(item => {
        existingImages[item.cleanName] = item;
      });
      localStorage.setItem('cbt_question_images', JSON.stringify(existingImages));
      setQuestionImagesCount(Object.keys(existingImages).length);
    } catch (_) {}

    if (auth.currentUser) {
      setIsCloudSyncing(true);
      try {
        await saveQuestionImagesToCloud(examId, config, previewImagesToUpload);
        await refreshSavedExamsList();
      } catch (err) {
        console.error('Cloud image save error:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    }

    try {
      await fetch('/api/admin/upload-question-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: previewImagesToUpload })
      });
    } catch (_) {}

    showToast(`Tersimpan ke Cloud Firestore: ${previewImagesToUpload.length} gambar soal!`);
    setShowUploadImagesModal(false);
    setPreviewImagesToUpload([]);
    fetchMasterDataSummary(examId);
  };

  // Keep helper unused-safe if ever invoked later
  void deleteImageFromCloud;

  // Download Templates
  const downloadStudentTemplate = () => {
    const content = `No ;Nama Siswa;No Peserta;Kelas;Mapel\n1;ADI;2026001;12A;INGGRIS\n2;SUTRISNO;2026002;12B;INGGRIS\n3;BORIS YELSIN;2026003;12C;INGGRIS\n4;SULAIMAN;2026004;12D;INGGRIS\n5;WASIS;2026005;12A;MATEMATIKA\n6;YUNUS;2026006;12B;MATEMATIKA\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_Data_SISWA_Standar.csv';
    a.click();
    showToast('Template Data Siswa berhasil diunduh!');
  };

  const downloadQuestionsTemplate = () => {
    const content = [
      'NO;MAPEL;TIPE;SOAL;A;B;C;D;KUNCI A;KUNCI B;KUNCI C;KUNCI D',
      '1;INGGRIS;PG;INGGRIS_1;INGGRIS_1A;INGGRIS_1B;INGGRIS_1C;INGGRIS_1D;A;C;B;E',
      '2;INGGRIS;BS;INGGRIS_2;INGGRIS_2A;INGGRIS_2B;;;BENAR;SALAH;;',
      '3;INGGRIS;MULTI;INGGRIS_3;INGGRIS_3A;INGGRIS_3B;;;A,C,E;B,D;;',
      '4;INGGRIS;TT;INGGRIS_4;INGGRIS_4A;INGGRIS_4B;;;T,TT,T,T,TT;TT,T,T,TT,T;;',
      '5;MATEMATIKA;PG;MTK_1;;;;;B;;;'
    ].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_Tipe_Soal_PG_BS_MULTI_TT.csv';
    a.click();
    showToast('Template Multi-Tipe Soal (PG, BS, MULTI, TT) berhasil diunduh!');
  };

  // ==========================================
  // MANDATORY TEACHER LOGIN GATE
  // ==========================================
  if (!authReady) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f4f8fc]">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm space-y-2 max-w-sm w-full">
          <RefreshCw className="w-6 h-6 text-sky-600 animate-spin mx-auto" />
          <div className="text-xs font-bold text-slate-700">Memeriksa sesi login Guru / Proktor...</div>
        </div>
      </div>
    );
  }

  if (!cloudUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#f0f7ff] via-[#f8fafc] to-[#eefbf5]">
        <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl space-y-5 text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-sky-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-indigo-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
              Akses Khusus Guru &amp; Proktor
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Login Akun Google Guru
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Setiap guru wajib masuk menggunakan akun Google agar bank soal, jadwal pengerjaan, gambar slide, link ujian, dan rekap nilai tersimpan aman di Cloud atas akun Anda.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-left text-[11px] text-sky-900 space-y-1">
            <div className="font-bold text-sky-950">Keuntungan Login Guru:</div>
            <div>&bull; Bisa menyusun &amp; menjadwalkan ujian hari ini untuk dikerjakan siswa besok.</div>
            <div>&bull; Bisa membuka kembali link dan hasil ujian dari komputer/browser mana saja.</div>
            <div>&bull; <strong>Siswa tidak perlu login Google</strong> saat mengerjakan ujian.</div>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={handleCloudGoogleSignIn}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk dengan Akun Google Guru</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f4f8fc] text-slate-900 space-y-5">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* TOAST FEEDBACK */}
        {toastMessage && (
          <div className="fixed top-4 right-4 bg-slate-900 text-white border border-slate-700 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 z-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* PORTAL HEADER BANNER (BRIGHT TKA STYLE) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
              PORTAL ADMINISTRASI GURU
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <span>Pengaturan &amp; Kelola Bank Soal CBT</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Atur identitas sekolah, jadwalkan waktu ujian, unggah tipe &amp; kunci soal (PG, BS, Multi, Tepat/Tidak Tepat), dan pantau nilai siswa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowUploadQuestionsModal(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>UPLOAD TIPE &amp; KUNCI SOAL</span>
            </button>

            <button
              onClick={() => setShowUploadImagesModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs whitespace-nowrap shrink-0"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>UPLOAD SOAL JPG/PNG ({questionImagesCount})</span>
            </button>

            <button
              onClick={() => setShowConfigKeysModal(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs whitespace-nowrap shrink-0"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Status Varian ({questionsSummary.length} Soal)</span>
            </button>

            <button
              onClick={() => setShowUploadExcelModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>UPLOAD EXCEL SISWA ({masterStudentsCount})</span>
            </button>

            <button
              onClick={() => setShowClearCacheModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>CLEAR CACHE UJIAN</span>
            </button>

            {questionsSummary.length === 0 && (
              <button
                onClick={handleLoadDemoData}
                className="bg-slate-100 hover:bg-slate-200 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Muat Data Demo</span>
              </button>
            )}
          </div>
        </div>

        {/* CLOUD ACCOUNT + SAVED EXAMS SWITCHER BAR (UNTUK AKSES DATA HARI BESOK / MULTI PERANGKAT) */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-emerald-950 flex items-center gap-2 flex-wrap">
                  <span>Akun Guru Aktif: {cloudUser.email}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg bg-white border border-emerald-200 text-emerald-800">
                    ID Ujian: {examId}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Soal, jadwal, gambar, dan link ujian otomatis tersimpan di Cloud. Buka menu ini lagi besok dari browser mana pun untuk melanjutkan atau mengambil link Anda.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleCreateNewExam}
                className="px-3 py-2 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Buat ID ujian baru yang terpisah dari ujian sebelumnya"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Buat Ujian Baru</span>
              </button>
              <button
                type="button"
                disabled={isCloudSyncing}
                onClick={() => syncLocalDataToCloud(config)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>{isCloudSyncing ? 'Menyinkronkan...' : 'Simpan & Sinkronkan Cloud'}</span>
              </button>
              <button
                type="button"
                onClick={handleCloudSignOut}
                className="px-3 py-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 font-semibold text-xs rounded-xl transition flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>

          {myCloudExams.length > 0 && (
            <div className="pt-2.5 border-t border-emerald-200/80 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5 shrink-0">
                <FolderOpen className="w-3.5 h-3.5 text-emerald-700" />
                <span>Daftar Ujian Tersimpan di Akun Anda ({myCloudExams.length}):</span>
              </span>
              <select
                value={examId}
                onChange={e => handleSelectCloudExam(e.target.value)}
                className="flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                {!myCloudExams.some(ex => ex.examId === examId) && (
                  <option value={examId}>{appTitle} - {schoolName} ({examId}) [Aktif]</option>
                )}
                {myCloudExams.map(ex => (
                  <option key={ex.examId} value={ex.examId}>
                    {ex.appTitle} — {ex.schoolName} | Token: {ex.token} {ex.scheduleEnabled && ex.scheduleStart ? `| Jadwal: ${formatScheduleId(ex.scheduleStart)}` : '| Waktu Bebas'} ({ex.examId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ROW 1: IDENTITAS UJIAN & LINK KHUSUS SISWA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* CARD 1 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sky-700 font-bold text-xs border-b border-slate-100 pb-2.5">
              <span>Identitas Ujian &amp; Pilihan Dropdown Siswa</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">
                Nama Sekolah (Diisi Sendiri oleh Admin Sekolah):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  placeholder="Contoh: SMA Negeri 1 Teladan"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0"
                >
                  Simpan
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Sekolah lain tidak bisa melihat data Anda karena setiap sekolah tersimpan privat.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">
                Nama Aplikasi / Jenis Ujian CBT (Manual):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={appTitle}
                  onChange={e => setAppTitle(e.target.value)}
                  placeholder="Contoh: ASESMEN SUMATIF GENAP 2026"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0"
                >
                  Simpan
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">
                Jenjang Sekolah (Menentukan Jumlah Opsi Jawaban Siswa):
              </label>
              <div className="flex gap-2">
                <select
                  value={schoolLevel}
                  onChange={e => setSchoolLevel(e.target.value as any)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500"
                >
                  <option value="SD/MI">SD / MI (3 Pilihan Jawaban: A, B, C)</option>
                  <option value="SMP/MTs">SMP / MTs (4 Pilihan Jawaban: A, B, C, D)</option>
                  <option value="SMA/MA/SMK/MAK">SMA / MA / SMK / MAK (5 Pilihan Jawaban: A, B, C, D, E)</option>
                  <option value="SLB">SLB (3 Pilihan Jawaban: A, B, C)</option>
                </select>
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0"
                >
                  Simpan
                </button>
              </div>
            </div>

            {/* Verification Mode */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="text-[11px] font-bold text-sky-800 flex items-center justify-between">
                <span>Mode Verifikasi Identitas Peserta Saat Login:</span>
                <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {verificationMode === 'crosscheck' ? 'Wajib Cocok Master' : 'Bebas / Umum'}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <label
                  onClick={() => setVerificationMode('crosscheck')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2 ${
                    verificationMode === 'crosscheck'
                      ? 'bg-sky-50 border-sky-500 text-slate-900 ring-1 ring-sky-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="verificationMode"
                    checked={verificationMode === 'crosscheck'}
                    onChange={() => setVerificationMode('crosscheck')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-sky-800">1. Kroscek Master Excel (Ketat)</div>
                    <div className="text-[10px] text-slate-600 leading-tight mt-0.5">
                      Nama &amp; No. Peserta wajib sama dengan Excel guru. Jika tidak cocok, tidak bisa lanjut ujian.
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setVerificationMode('manual')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2 ${
                    verificationMode === 'manual'
                      ? 'bg-indigo-50 border-indigo-500 text-slate-900 ring-1 ring-indigo-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="verificationMode"
                    checked={verificationMode === 'manual'}
                    onChange={() => setVerificationMode('manual')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-indigo-800">2. Peserta Umum (Input Manual)</div>
                    <div className="text-[10px] text-slate-600 leading-tight mt-0.5">
                      Identitas diinput mandiri oleh peserta. Asal TOKEN benar, peserta langsung masuk ujian.
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Mode Verifikasi</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-700">
                  Daftar Mata Pelajaran (Pisah koma):
                </label>
                <textarea
                  rows={2}
                  value={mapelsRaw}
                  onChange={e => setMapelsRaw(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">
                  Daftar Kelas (Pisah koma):
                </label>
                <textarea
                  rows={2}
                  value={kelasRaw}
                  onChange={e => setKelasRaw(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleSaveDropdowns}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-sky-600" />
                <span>Perbarui Pilihan Mapel &amp; Kelas Siswa</span>
              </button>
            </div>
          </div>

          {/* CARD 2: LINK KHUSUS SISWA & AKSES JADWAL */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-amber-700 font-bold text-xs">Link Khusus Siswa &amp; Bagikan Tautan</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                  Cocok untuk TKA / Ujian Bareng
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-700">
                  Generate Link Siswa (Pilihan Default Universal):
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={linkMapel}
                    onChange={e => setLinkMapel(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="all">Semua Mapel (Siswa Pilih)</option>
                    {config.mapels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={linkKelas}
                    onChange={e => setLinkKelas(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="all">Semua Kelas (Ujian Bareng)</option>
                    {config.kelas.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleGenerateLink}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition whitespace-nowrap"
                  >
                    Buat Link Ujian
                  </button>
                </div>

                <p className="text-[10px] text-slate-500">
                  Pilih <strong>Semua Mapel</strong> &amp; <strong>Semua Kelas</strong> agar siswa cukup menerima 1 link &amp; 1 token yang sama. Link bisa dibuat hari ini untuk dibagikan besok.
                </p>

                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink || "Klik 'Buat Link Ujian' untuk menghasilkan tautan siswa"}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none select-all"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      disabled={!generatedLink}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-600" />
                      <span>Salin Link Khusus Siswa</span>
                    </button>
                    {generatedLink && (
                      <a
                        href={generatedLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                      >
                        <span>Tes Laman Siswa</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-sky-900 space-y-1">
              <div className="font-bold text-sky-950">Tips Setting Hari Ini untuk Besok Pagi:</div>
              <div>
                Upload soal &amp; atur jadwal tanggal besok di bawah, lalu klik <strong>Buat Link Ujian</strong> dan salin link-nya. Besok pagi, cukup login kembali dengan akun Google Anda untuk memantau peserta &amp; mengambil link ini kapan saja.
              </div>
            </div>
          </div>

        </div>

        {/* ROW 2: DURASI, JADWAL PENGERJAAN, TOKEN & EXPORT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs border-b border-slate-100 pb-2.5">
              <CalendarClock className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan Durasi, Jadwal Pengerjaan, Token &amp; Anti-Kecurangan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-700">
                  Lama Ujian / Durasi Timer Siswa (Menit):
                </label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">
                  Toleransi Pindah TAB / Keluar App (Maksimal x):
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={maxViolations}
                  onChange={e => setMaxViolations(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-sky-500 mt-1"
                />
              </div>
            </div>

            {/* JADWAL WAKTU PENGERJAAN (CHECKBOX TOGGLE) */}
            <div className={`p-3.5 rounded-xl border space-y-3 transition ${
              scheduleEnabled
                ? 'bg-indigo-50/70 border-indigo-300'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={e => setScheduleEnabled(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-indigo-600 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Aktifkan Jadwal Waktu Pengerjaan (Hari, Tanggal &amp; Rentang Jam Tertentu)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {scheduleEnabled
                      ? `Siswa hanya dapat login & mengerjakan pada rentang waktu di bawah, dengan durasi ${durationMinutes} menit.`
                      : `Tidak dicentang = Waktu pengerjaan bebas kapan saja, durasi tetap ${durationMinutes} menit sesuai setingan di atas.`}
                  </div>
                </div>
              </label>

              {scheduleEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-indigo-900 block mb-1">
                      Mulai Dibuka (Hari, Tanggal &amp; Jam Awal):
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleStart}
                      onChange={e => setScheduleStart(e.target.value)}
                      className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    {scheduleStart && (
                      <div className="text-[10px] text-indigo-800 mt-1 font-medium">
                        {formatScheduleId(scheduleStart)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-indigo-900 block mb-1">
                      Batas Akhir Ditutup (Hari, Tanggal &amp; Jam Akhir):
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleEnd}
                      onChange={e => setScheduleEnd(e.target.value)}
                      className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    {scheduleEnd && (
                      <div className="text-[10px] text-indigo-800 mt-1 font-medium">
                        {formatScheduleId(scheduleEnd)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveTimingAndSchedule}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Durasi, Jadwal &amp; Toleransi</span>
                </button>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] text-emerald-800 font-semibold">TOKEN Soal Ujian Aktif:</div>
                <div className="text-2xl font-black font-mono tracking-widest text-emerald-700 mt-0.5">
                  {activeToken}
                </div>
                <div className="text-[10px] text-emerald-700">Siswa wajib menginputkan Token ini untuk memulai ujian.</div>
              </div>

              <button
                type="button"
                onClick={handleGenerateNewToken}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Generate TOKEN Baru</span>
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl gap-3">
              <div>
                <div className="text-xs font-bold text-slate-900">Acak Urutan Soal Ujian</div>
                <div className="text-[10px] text-slate-500">Jika diaktifkan, nomor urut slide soal tiap peserta akan teracak otomatis.</div>
              </div>

              <button
                type="button"
                onClick={handleToggleShuffle}
                className={`font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  shuffleQuestions
                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>{shuffleQuestions ? 'Acak Soal (ON)' : 'Acak Soal (OFF)'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs border-b border-slate-100 pb-2.5">
                <span>Reset Sesi &amp; Export Data</span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Unduh langsung rekap nilai peserta ke PC guru dalam format Excel (.xlsx) atau CSV, atau bersihkan sesi setelah ujian berakhir.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Nilai Langsung (Excel .xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export Nilai (CSV)</span>
              </button>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowClearCacheModal(true)}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Cache</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowResetAllModal(true)}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Sesi</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* CARD 5: DAFTAR PESERTA & KROSCEK SESI UJIAN SISWA */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-sky-700 font-bold text-xs sm:text-sm flex-wrap">
              <Users className="w-4 h-4 text-sky-600" />
              <span>Daftar Peserta &amp; Kroscek Sesi Ujian Siswa</span>
              <span className="bg-sky-50 text-sky-800 border border-sky-200 text-[10px] px-2.5 py-0.5 rounded-lg font-bold">
                {submissions.length} Peserta
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={sortOption}
                  onChange={e => setSortOption(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none"
                >
                  <option value="name_asc">Nama Siswa (A - Z)</option>
                  <option value="name_desc">Nama Siswa (Z - A)</option>
                  <option value="no_asc">No. Peserta (Kecil ke Besar)</option>
                  <option value="no_desc">No. Peserta (Besar ke Kecil)</option>
                  <option value="score_desc">Nilai Tertinggi</option>
                  <option value="score_asc">Nilai Terendah</option>
                </select>
              </div>

              <div className="relative w-48 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Nama / No. Peserta..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 shrink-0">Filter Kelas:</span>

            <button
              onClick={() => setActiveClassFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                activeClassFilter === 'all'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Semua Kelas
            </button>

            {config.kelas.map(k => (
              <button
                key={k}
                onClick={() => setActiveClassFilter(k)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                  activeClassFilter === k
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                  <th className="p-2.5">No</th>
                  <th className="p-2.5">Nama Peserta (Kapital)</th>
                  <th className="p-2.5">No. Absen / Peserta</th>
                  <th className="p-2.5">Mapel &amp; Kelas</th>
                  <th className="p-2.5">Kode Paket</th>
                  <th className="p-2.5">Status Ujian</th>
                  <th className="p-2.5">Pelanggaran</th>
                  <th className="p-2.5">Nilai Akhir</th>
                  <th className="p-2.5 text-center">Aksi (Reset Ujian)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                      Belum ada peserta yang login / mengerjakan pada filter ini.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub, idx) => (
                    <tr key={sub.id} className="hover:bg-sky-50/50 transition">
                      <td className="p-2.5 font-mono tabular-nums text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900 tracking-wide">{sub.studentName}</td>
                      <td className="p-2.5 font-mono tabular-nums text-sky-700 font-semibold">{sub.noPeserta}</td>
                      <td className="p-2.5">
                        <span className="text-slate-800 font-medium">{sub.subject}</span>
                        <span className="text-slate-300 mx-1">&middot;</span>
                        <span className="font-bold text-indigo-700">{sub.className}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-violet-50 text-violet-700 border border-violet-200">
                          {sub.assignedPackage || 'Paket Acak'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          sub.status === 'Selesai'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sub.status === 'Curang (Disubmit)'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono tabular-nums font-bold text-rose-700">
                        {sub.violationsCount > 0 ? `${sub.violationsCount}x` : '0x'}
                      </td>
                      <td className="p-2.5 font-mono tabular-nums font-black text-amber-700 text-sm">
                        {sub.percentage}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setStudentToReset(sub)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition active:scale-95"
                        >
                          <RotateCcw className="w-3 h-3 inline mr-1" />
                          <span>Reset Siswa</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* MODAL 1: UPLOAD DATA SISWA EXCEL/CSV */}
      {showUploadExcelModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-emerald-700 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Upload Data Master Siswa (Format CSV / Excel)</span>
              </h3>
              <button onClick={() => setShowUploadExcelModal(false)} className="text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
              <div>
                <div className="font-bold text-emerald-900">Gunakan Template Standar:</div>
                <div className="text-[11px] text-emerald-800">Format kolom: <code>No ;Nama Siswa;No Peserta;Kelas;Mapel</code></div>
              </div>
              <button
                onClick={downloadStudentTemplate}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template CSV</span>
              </button>
            </div>

            <div className="border-2 border-dashed border-emerald-300 bg-slate-50 rounded-xl p-5 text-center">
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleStudentFileSelect}
                className="w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-xs file:font-semibold cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-2">
                Mendukung berkas Excel (<code>.xlsx</code>, <code>.xls</code>) dan CSV (titik koma <code>;</code> atau koma <code>,</code>).
              </p>
            </div>

            {allParsedStudents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-700">Total Terdeteksi: {allParsedStudents.length} Data Siswa</span>
                  <span className="text-[11px] text-slate-500 font-normal">Seluruh {allParsedStudents.length} data siswa akan tersimpan</span>
                </div>
                <div className="max-h-52 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-[11px] text-slate-700">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-1.5">No</th>
                        <th className="p-1.5">Nama Siswa</th>
                        <th className="p-1.5">No Peserta</th>
                        <th className="p-1.5">Kelas</th>
                        <th className="p-1.5">Mapel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allParsedStudents.map((st, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-1.5 font-mono text-slate-500">{st['No '] || st.No || st.no || i + 1}</td>
                          <td className="p-1.5 font-bold text-slate-900">{st['Nama Siswa'] || st.name || st.Nama || st.nama}</td>
                          <td className="p-1.5 font-mono text-sky-700">{st['No Peserta'] || st.noPeserta}</td>
                          <td className="p-1.5">{st['Kelas'] || st.className || st.kelas}</td>
                          <td className="p-1.5">{st['Mapel'] || st.subject || st.mapel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button onClick={() => setShowUploadExcelModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl">
                Batal
              </button>
              <button
                onClick={handleConfirmSaveStudents}
                disabled={allParsedStudents.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Seluruh {allParsedStudents.length} Data Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD TIPE DAN KUNCI SOAL (PG, BS, MULTI, TT) */}
      {showUploadQuestionsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-sky-700 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload Tipe &amp; Kunci Soal (PG, Benar/Salah, Multi Jawaban, Tepat/Tidak Tepat)</span>
              </h3>
              <button onClick={() => setShowUploadQuestionsModal(false)} className="text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-sky-900">Format Kolom &amp; Panduan Kode Tipe Soal:</span>
                <button
                  onClick={downloadQuestionsTemplate}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Template Multi-Tipe</span>
                </button>
              </div>
              <div className="text-[11px] text-sky-900">
                Kolom Template: <code className="bg-white px-1.5 py-0.5 rounded border border-sky-200">NO;MAPEL;TIPE;SOAL;A;B;C;D;KUNCI A;KUNCI B;KUNCI C;KUNCI D</code>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-white p-2 rounded-lg border border-sky-200">
                  <div className="font-bold text-sky-800">1. Pilihan Ganda &rarr; Kode TIPE: <code>PG</code></div>
                  <div className="text-slate-600">Contoh kunci: <code>A</code>, <code>B</code>, <code>C</code>, <code>D</code>, atau <code>E</code> (kosong = otomatis PG).</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-200">
                  <div className="font-bold text-emerald-800">2. Salah atau Benar &rarr; Kode TIPE: <code>BS</code></div>
                  <div className="text-slate-600">Contoh kunci: <code>BENAR</code> atau <code>SALAH</code> (juga mendukung <code>B</code> / <code>S</code>).</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-indigo-200">
                  <div className="font-bold text-indigo-800">3. Multi Jawaban &rarr; Kode TIPE: <code>MULTI</code></div>
                  <div className="text-slate-600">Contoh kunci: <code>A,C,E</code> atau <code>B,D</code> (pisahkan tanda koma).</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-amber-200">
                  <div className="font-bold text-amber-800">4. Pernyataan Tepat/Tidak Tepat &rarr; Kode TIPE: <code>TT</code></div>
                  <div className="text-slate-600">Contoh kunci A–E (maks 5): <code>T,TT,T,T,TT</code> (T = Tepat, TT = Tidak Tepat).</div>
                </div>
              </div>
            </div>

            <div className="border-2 border-dashed border-sky-300 bg-slate-50 rounded-xl p-5 text-center">
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleQuestionsFileSelect}
                className="w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-sky-600 file:text-white file:text-xs file:font-semibold cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-2">
                Mendukung berkas Excel (<code>.xlsx</code>, <code>.xls</code>) atau CSV (<code>.csv</code>). Nama file gambar di tab &ldquo;UPLOAD SOAL JPG/PNG&rdquo; harus sama dengan nama di kolom <code>SOAL</code> atau varian <code>A/B/C/D</code>.
              </p>
            </div>

            {allParsedQuestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-sky-700">Total Terdeteksi: {allParsedQuestions.length} Nomor Soal &amp; Kunci</span>
                  <span className="text-[11px] text-slate-500 font-normal">Semua {allParsedQuestions.length} nomor soal siap disimpan</span>
                </div>
                <div className="max-h-52 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-[11px] text-slate-700">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-1.5">No</th>
                        <th className="p-1.5">Mapel</th>
                        <th className="p-1.5">Tipe</th>
                        <th className="p-1.5">Kode Soal</th>
                        <th className="p-1.5">Varian A</th>
                        <th className="p-1.5">Varian B</th>
                        <th className="p-1.5">Kunci A</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allParsedQuestions.map((q, i) => {
                        const nt = normalizeQuestionType(q.TIPE || q.Tipe || q.tipe || q.TYPE || 'PG');
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-1.5 font-mono text-slate-500">{q.NO || q.No || i + 1}</td>
                            <td className="p-1.5 font-bold text-amber-700">{q.MAPEL || q.Mapel || uploadFileName.replace(/\.[^/.]+$/, '')}</td>
                            <td className="p-1.5 font-bold text-indigo-700">{getTypeTitle(nt)}</td>
                            <td className="p-1.5 font-mono">{q.SOAL || q.Soal}</td>
                            <td className="p-1.5 text-violet-700">{q.A || q.a || '-'}</td>
                            <td className="p-1.5 text-violet-700">{q.B || q.b || '-'}</td>
                            <td className="p-1.5 font-bold font-mono text-emerald-700">
                              {q['KUNCI A'] || q['Kunci A'] || q.KUNCI || q.kunci || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button onClick={() => setShowUploadQuestionsModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl">
                Batal
              </button>
              <button
                onClick={handleConfirmSaveQuestions}
                disabled={allParsedQuestions.length === 0}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Seluruh {allParsedQuestions.length} Tipe &amp; Kunci Soal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: UPLOAD SOAL JPG / PNG / WEBP */}
      {showUploadImagesModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-indigo-800">
                    Upload Berkas Gambar Soal (JPG / PNG / WEBP)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Unggah gambar slide soal yang sesuai dengan nama kode di template kunci.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowUploadImagesModal(false)} className="text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-sky-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Syarat Penamaan Berkas Gambar Soal:</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Nama file gambar <strong>harus sama persis</strong> dengan nama soal di template <em>&ldquo;UPLOAD TIPE &amp; KUNCI SOAL&rdquo;</em> (tanpa mempedulikan huruf besar/kecil).
              </p>
              <div className="bg-white p-2.5 rounded-lg border border-sky-200 text-[11px] font-mono text-slate-700 space-y-1">
                <div>&bull; Soal Tunggal: Template <strong className="text-sky-700">INGGRIS_1</strong> &rarr; File: <strong className="text-emerald-700">INGGRIS_1.jpg</strong> / <strong className="text-emerald-700">.png</strong></div>
                <div>&bull; Soal Varian: Kolom A/B <strong className="text-violet-700">INGGRIS_1A</strong>, <strong className="text-violet-700">INGGRIS_1B</strong> &rarr; File: <strong className="text-emerald-700">INGGRIS_1A.jpg</strong>, <strong className="text-emerald-700">INGGRIS_1B.jpg</strong></div>
              </div>
            </div>

            <div className="border-2 border-dashed border-indigo-300 bg-slate-50 rounded-xl p-6 text-center space-y-2">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleImagesFileSelect}
                className="w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:text-white file:text-xs file:font-bold hover:file:bg-indigo-700 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Pilih atau seret sekaligus beberapa gambar soal (Bisa memilih hingga 100+ file gambar JPG/PNG serentak).
              </p>
            </div>

            {previewImagesToUpload.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-700">
                    Siap Disimpan ({previewImagesToUpload.length} Berkas Dipilih):
                  </span>
                  <button
                    onClick={() => setPreviewImagesToUpload([])}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    Batal Pilih
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50">
                  {previewImagesToUpload.map((img, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2">
                      <img src={img.dataUrl} alt={img.name} className="w-10 h-10 object-cover rounded bg-slate-100 shrink-0 border border-slate-200" />
                      <div className="overflow-hidden text-[11px]">
                        <div className="font-bold text-slate-900 truncate" title={img.name}>{img.name}</div>
                        <div className="text-[10px] font-mono text-emerald-700">&rarr; {img.cleanName}</div>
                        <div className="text-[9px] text-slate-500">{img.sizeKb} KB</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowUploadImagesModal(false);
                  setPreviewImagesToUpload([]);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Tutup
              </button>
              <button
                onClick={handleConfirmSaveImages}
                disabled={previewImagesToUpload.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan {previewImagesToUpload.length} Gambar Soal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: STATUS KUNCI & VARIAN SOAL */}
      {showConfigKeysModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-violet-700 flex items-center gap-2">
                <Key className="w-4 h-4" />
                <span>Status Bank Soal &amp; Varian Kode A/B/C/D</span>
              </h3>
              <button onClick={() => setShowConfigKeysModal(false)} className="text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-violet-900">Proteksi Anti-Contek Varian Bersebelahan:</div>
              <p className="text-[11px] text-violet-800 leading-relaxed">
                Saat siswa login, sistem memilih varian kode soal (Paket A/B/C/D) sesuai nomor peserta dan menyembunyikan kunci jawaban dari tampilan browser siswa.
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 sticky top-0">
                  <tr>
                    <th className="p-2">No</th>
                    <th className="p-2">Mapel</th>
                    <th className="p-2">Tipe</th>
                    <th className="p-2">Kode Soal</th>
                    <th className="p-2">Tipe Varian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {questionsSummary.map((q, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-mono text-slate-500">{q.id}</td>
                      <td className="p-2 font-bold text-slate-900">{q.subject}</td>
                      <td className="p-2 text-indigo-700 font-semibold">{q.typeTitle || getTypeTitle(normalizeQuestionType(q.type))}</td>
                      <td className="p-2 font-mono text-sky-700">{q.questionCode}</td>
                      <td className="p-2">
                        {q.hasVariants || q.variants ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                            Varian: {(q.variantCodes || Object.keys(q.variants || {})).join(', ')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            Tunggal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setShowConfigKeysModal(false)} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CLEAR CACHE */}
      {showClearCacheModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-amber-700 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Pembersihan Cache &amp; Persiapan Ujian Baru</span>
              </h3>
              <button onClick={() => setShowClearCacheModal(false)} className="text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Fitur ini memastikan <strong>soal lama tidak terpanggil kembali</strong> ketika Anda ingin mengganti soal baru. Pilih level pembersihan:
            </p>

            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-900">
                    1. Bersihkan Bank Soal &amp; Gambar Saja
                  </span>
                  <span className="text-[10px] bg-white text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-mono">
                    Ganti Soal Baru
                  </span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Mengosongkan bank soal &amp; gambar aktif di Cloud dan browser. Data Master Siswa tetap aman.
                </p>
                <button
                  type="button"
                  onClick={() => handleClearCache('questions')}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Bersihkan Bank Soal Saja</span>
                </button>
              </div>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-900">
                    2. Bersihkan Total (Reset Ujian Baru)
                  </span>
                  <span className="text-[10px] bg-white text-rose-700 border border-rose-300 px-2 py-0.5 rounded font-mono">
                    Reset Total
                  </span>
                </div>
                <p className="text-[11px] text-rose-800">
                  Menghapus total bank soal, gambar, master siswa, dan riwayat nilai ujian ini.
                </p>
                <button
                  type="button"
                  onClick={() => handleClearCache('all')}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Total Semua Data</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowClearCacheModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: RESET ALL */}
      {showResetAllModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-rose-700 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Konfirmasi Reset Seluruh Sesi Ujian</span>
              </h3>
              <button onClick={() => setShowResetAllModal(false)} className="text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Apakah Anda yakin ingin <strong>me-reset seluruh sesi ujian siswa ({submissions.length} siswa)</strong>?
            </p>
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-[11px] text-rose-800 space-y-1">
              <p>&bull; Seluruh data pengerjaan dan nilai peserta akan dikosongkan.</p>
              <p>&bull; Siswa dapat melakukan login ulang untuk mengerjakan ujian.</p>
              <p>&bull; Bank soal dan data master siswa tidak terhapus.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowResetAllModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmResetAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Reset Seluruh Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: RESET PER SISWA (LOGIN ONLY vs FULL RESET) */}
      {studentToReset && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-amber-700 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Reset Ujian Siswa</span>
              </h3>
              <button onClick={() => setStudentToReset(null)} className="text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <div className="text-xs text-slate-700 space-y-3">
              <p>Pilih tipe tindakan reset untuk peserta:</p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-sky-700 text-sm">{studentToReset.studentName}</div>
                <div className="text-[11px] text-slate-600">
                  No. Peserta: <strong className="text-slate-900">{studentToReset.noPeserta}</strong> | Kelas: <strong className="text-slate-900">{studentToReset.className}</strong>
                </div>
                <div className="text-[11px] text-slate-600">
                  Mapel: <strong className="text-slate-900">{studentToReset.subject}</strong> | Status: <strong className="text-amber-700">{studentToReset.status}</strong>
                </div>
              </div>

              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-sky-900 flex items-center gap-1.5">
                    <LogIn className="w-3.5 h-3.5 text-sky-600" />
                    <span>1. Reset Login Saja (Lanjutkan Ujian)</span>
                  </span>
                  <span className="text-[10px] bg-white text-sky-700 border border-sky-200 px-2 py-0.5 rounded font-mono">
                    Data Aman
                  </span>
                </div>
                <p className="text-[11px] text-sky-800">
                  Siswa dapat login kembali dengan jawaban sebelumnya tetap tersimpan. Cocok jika siswa tidak sengaja keluar browser.
                </p>
                <button
                  type="button"
                  onClick={() => confirmResetStudent(studentToReset, 'login_only')}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Reset Login Saja (Data Tetap Tersimpan)</span>
                </button>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>2. Reset Total (Hapus Semua Data)</span>
                  </span>
                  <span className="text-[10px] bg-white text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-mono">
                    Ulang Dari Awal
                  </span>
                </div>
                <p className="text-[11px] text-rose-800">
                  Seluruh data jawaban dihapus total. Siswa login ulang dan mengerjakan dari awal.
                </p>
                <button
                  type="button"
                  onClick={() => confirmResetStudent(studentToReset, 'full_reset')}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Total (Hapus Semua Data)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStudentToReset(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
