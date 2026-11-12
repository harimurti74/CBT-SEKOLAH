import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { AppConfig, StudentSubmission, MasterStudent, SchoolLevel } from '../types';
import { 
  Sliders, 
  Upload, 
  Key, 
  FileSpreadsheet, 
  Code, 
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
  Layers, 
  Check, 
  FileCheck,
  AlertCircle,
  Sparkles,
  RefreshCw,
  FolderSync,
  Image as ImageIcon,
  LogIn
} from 'lucide-react';

interface Props {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

export const TeacherAdmin: React.FC<Props> = ({ config, onUpdateConfig }) => {
  // Form Inputs State (Matching Screenshots)
  const [appTitle, setAppTitle] = useState(config.appTitle);
  const [schoolName, setSchoolName] = useState(config.schoolName);
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>(config.schoolLevel || 'SMA/MA/SMK/MAK');
  const [verificationMode, setVerificationMode] = useState<'crosscheck' | 'manual'>(config.verificationMode || 'crosscheck');
  const [mapelsRaw, setMapelsRaw] = useState(config.mapels.join(', '));
  const [kelasRaw, setKelasRaw] = useState(config.kelas.join(', '));
  const [gdriveUrl, setGdriveUrl] = useState(config.gdriveUrl);
  const [durationMinutes, setDurationMinutes] = useState(config.durationMinutes);
  const [maxViolations, setMaxViolations] = useState(config.maxViolations);
  const [activeToken, setActiveToken] = useState(config.token);
  const [shuffleQuestions, setShuffleQuestions] = useState(config.shuffleQuestions);

  // Link Generator State (Poin 1: Default to 'all' for universal link)
  const [linkMapel, setLinkMapel] = useState('all');
  const [linkKelas, setLinkKelas] = useState('all');
  const [generatedLink, setGeneratedLink] = useState('');

  // Table Filter & Indexing State (Requirements 1 & 5)
  const [activeClassFilter, setActiveClassFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('name_asc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [masterStudentsCount, setMasterStudentsCount] = useState<number>(0);
  const [questionsSummary, setQuestionsSummary] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Modals State
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);
  const [showConfigKeysModal, setShowConfigKeysModal] = useState(false);
  const [showUploadExcelModal, setShowUploadExcelModal] = useState(false);
  const [showUploadQuestionsModal, setShowUploadQuestionsModal] = useState(false);
  const [showUploadImagesModal, setShowUploadImagesModal] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [studentToReset, setStudentToReset] = useState<StudentSubmission | null>(null);

  // Question Images State (JPG / PNG / PDF)
  const [questionImagesCount, setQuestionImagesCount] = useState<number>(0);
  const [questionImagesList, setQuestionImagesList] = useState<any[]>([]);
  const [previewImagesToUpload, setPreviewImagesToUpload] = useState<any[]>([]);

  // Preview States for Uploads
  const [allParsedStudents, setAllParsedStudents] = useState<any[]>([]);
  const [previewStudents, setPreviewStudents] = useState<any[]>([]);
  const [allParsedQuestions, setAllParsedQuestions] = useState<any[]>([]);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');

  useEffect(() => {
    setAppTitle(config.appTitle);
    setSchoolName(config.schoolName);
    setSchoolLevel(config.schoolLevel || 'SMA/MA/SMK/MAK');
    setVerificationMode(config.verificationMode || 'crosscheck');
    setMapelsRaw(config.mapels.join(', '));
    setKelasRaw(config.kelas.join(', '));
    setGdriveUrl(config.gdriveUrl);
    setDurationMinutes(config.durationMinutes);
    setMaxViolations(config.maxViolations);
    setActiveToken(config.token);
    setShuffleQuestions(config.shuffleQuestions);
  }, [config]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchSubmissions = async () => {
    let serverOk = false;
    try {
      const params = new URLSearchParams();
      if (activeClassFilter !== 'all') params.append('kelas', activeClassFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (sortOption) params.append('sort', sortOption);

      const res = await fetch(`/api/admin/submissions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.submissions)) {
          setSubmissions(data.submissions);
          serverOk = true;
        }
      }
    } catch (_) {
      serverOk = false;
    }

    // Fallback to localStorage submissions if server is offline or empty
    if (!serverOk) {
      try {
        const raw = localStorage.getItem('cbt_submissions');
        if (raw) {
          let list: StudentSubmission[] = JSON.parse(raw);
          if (activeClassFilter !== 'all') {
            list = list.filter(s => s.className === activeClassFilter);
          }
          if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter(s => 
              s.studentName.toLowerCase().includes(q) || s.noPeserta.toLowerCase().includes(q)
            );
          }
          setSubmissions(list);
        }
      } catch (_) {}
    }
  };

  const fetchMasterDataSummary = async () => {
    // 1. Master Students
    try {
      const resSt = await fetch('/api/admin/master-students');
      if (resSt.ok) {
        const dataSt = await resSt.json();
        if (dataSt.success) {
          setMasterStudentsCount(typeof dataSt.total === 'number' ? dataSt.total : (dataSt.students?.length || 0));
        }
      } else {
        const raw = localStorage.getItem('cbt_master_students');
        setMasterStudentsCount(raw ? JSON.parse(raw).length : 0);
      }
    } catch (_) {
      const raw = localStorage.getItem('cbt_master_students');
      setMasterStudentsCount(raw ? JSON.parse(raw).length : 0);
    }

    // 2. Questions Summary
    try {
      const resQ = await fetch('/api/admin/questions-summary');
      if (resQ.ok) {
        const dataQ = await resQ.json();
        if (dataQ.success) {
          setQuestionsSummary(Array.isArray(dataQ.questions) ? dataQ.questions : []);
        }
      } else {
        const raw = localStorage.getItem('cbt_question_bank');
        setQuestionsSummary(raw ? JSON.parse(raw) : []);
      }
    } catch (_) {
      const raw = localStorage.getItem('cbt_question_bank');
      setQuestionsSummary(raw ? JSON.parse(raw) : []);
    }

    // 3. Question Images
    try {
      const resImg = await fetch('/api/admin/question-images');
      if (resImg.ok) {
        const dataImg = await resImg.json();
        if (dataImg.success) {
          setQuestionImagesCount(dataImg.totalCount || 0);
          setQuestionImagesList(dataImg.images || []);
        }
      } else {
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
    } catch (_) {
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
    fetchSubmissions();
    fetchMasterDataSummary();
    const timer = setInterval(fetchSubmissions, 5000);
    return () => clearInterval(timer);
  }, [activeClassFilter, sortOption, searchQuery]);

  // Save Identity Settings (Nama Sekolah & Nama Aplikasi / Jenis Ujian)
  const handleSaveIdentity = async () => {
    const cleanTitle = appTitle.trim() || 'SIMULASI UJIAN CBT SLIDE';
    const cleanSchool = schoolName.trim() || 'SMA Negeri 1 Wonogiri';

    const updated: AppConfig = {
      ...config,
      appTitle: cleanTitle,
      schoolName: cleanSchool,
      schoolLevel,
      verificationMode
    };

    // 1. Instantly update parent state so UI changes immediately in all views
    onUpdateConfig(updated);

    // 2. Persist to localStorage for client-side persistence (Vercel static / offline)
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(updated));
    } catch (e) {
      console.warn('localStorage error:', e);
    }

    // 3. Sync with backend API
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data && data.success && data.config) {
        onUpdateConfig(data.config);
        try {
          localStorage.setItem('cbt_app_config', JSON.stringify(data.config));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Server offline/static, running with local storage:', err);
    }

    showToast('Identitas Ujian & Nama Sekolah berhasil disimpan!');
  };

  // Save Dropdowns (Daftar Mapel & Daftar Kelas)
  const handleSaveDropdowns = async () => {
    const mapels = mapelsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const kelas = kelasRaw.split(',').map(s => s.trim()).filter(Boolean);

    if (mapels.length === 0 || kelas.length === 0) {
      showToast('Daftar Mapel dan Kelas tidak boleh kosong!');
      return;
    }

    const updated: AppConfig = {
      ...config,
      mapels,
      kelas
    };

    // 1. Instantly update parent state
    onUpdateConfig(updated);

    // 2. Persist to localStorage
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(updated));
    } catch (e) {
      console.warn('localStorage error:', e);
    }

    // 3. Sync local filter tabs & dropdown choices
    if (activeClassFilter !== 'all' && !kelas.includes(activeClassFilter)) {
      setActiveClassFilter('all');
    }
    if (linkMapel !== 'all' && !mapels.includes(linkMapel)) {
      setLinkMapel('all');
    }
    if (linkKelas !== 'all' && !kelas.includes(linkKelas)) {
      setLinkKelas('all');
    }

    // 4. Sync with backend API
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data && data.success && data.config) {
        onUpdateConfig(data.config);
        try {
          localStorage.setItem('cbt_app_config', JSON.stringify(data.config));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Server offline/static, running with local storage:', err);
    }

    showToast('Pilihan Mapel & Kelas Siswa berhasil diperbarui!');
  };

  const handleSaveGdriveUrl = async () => {
    const updated: AppConfig = {
      ...config,
      gdriveUrl: gdriveUrl.trim()
    };

    onUpdateConfig(updated);
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(updated));
    } catch (e) {}

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data && data.success && data.config) {
        onUpdateConfig(data.config);
        try {
          localStorage.setItem('cbt_app_config', JSON.stringify(data.config));
        } catch (e) {}
      }
    } catch (err) {
      console.warn(err);
    }

    showToast('Link Google Drive Penyimpanan Data berhasil disimpan!');
  };

  // Generate Link Khusus Siswa (Terkunci ke Laman Siswa saja: mode=student)
  const handleGenerateLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();

    // Dedicated student mode (locks the interface for students)
    params.append('mode', 'student');

    if (linkMapel !== 'all') params.append('mapel', linkMapel);
    if (linkKelas !== 'all') params.append('kelas', linkKelas);
    params.append('token', activeToken);

    const url = `${baseUrl}?${params.toString()}`;
    setGeneratedLink(url);

    let desc = 'Link Khusus Siswa (Semua Mapel & Semua Kelas)';
    if (linkMapel !== 'all' && linkKelas !== 'all') desc = `Link Khusus Siswa - ${linkMapel} (${linkKelas})`;
    else if (linkMapel !== 'all') desc = `Link Khusus Siswa - Mapel ${linkMapel} (Semua Kelas)`;
    else if (linkKelas !== 'all') desc = `Link Khusus Siswa - Kelas ${linkKelas} (Semua Mapel)`;

    showToast(`${desc} berhasil dibuat!`);
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
      token: res
    };

    onUpdateConfig(updated);
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(updated));
    } catch (e) {}

    try {
      const postRes = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await postRes.json();
      if (data && data.success && data.config) {
        onUpdateConfig(data.config);
        try {
          localStorage.setItem('cbt_app_config', JSON.stringify(data.config));
        } catch (e) {}
      }
    } catch (err) {
      console.warn(err);
    }

    showToast(`TOKEN Soal Baru Dibuat: ${res}`);
  };

  const handleToggleShuffle = async () => {
    const nextVal = !shuffleQuestions;
    setShuffleQuestions(nextVal);

    const updated: AppConfig = {
      ...config,
      shuffleQuestions: nextVal
    };

    onUpdateConfig(updated);
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(updated));
    } catch (e) {}

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data && data.success && data.config) {
        onUpdateConfig(data.config);
        try {
          localStorage.setItem('cbt_app_config', JSON.stringify(data.config));
        } catch (e) {}
      }
    } catch (err) {
      console.warn(err);
    }

    showToast(`Pengacakan nomor soal: ${nextVal ? 'ON (Acak Aktif)' : 'OFF (Sesuai Urutan)'}`);
  };

  const confirmResetStudent = async (sub: StudentSubmission, resetType: 'login_only' | 'full_reset' = 'full_reset') => {
    // 1. Update client-side state & localStorage immediately
    try {
      const raw = localStorage.getItem('cbt_submissions');
      if (raw) {
        const subs: StudentSubmission[] = JSON.parse(raw);
        if (resetType === 'login_only') {
          // Keep submission data, just update status so student can log back in
          const updatedSubs = subs.map(s => {
            if (s.id === sub.id || s.noPeserta === sub.noPeserta) {
              return { ...s, status: 'Sedang Mengerjakan' as const };
            }
            return s;
          });
          localStorage.setItem('cbt_submissions', JSON.stringify(updatedSubs));
        } else {
          // Full reset: completely remove submission
          const filtered = subs.filter(s => s.id !== sub.id && s.noPeserta !== sub.noPeserta);
          localStorage.setItem('cbt_submissions', JSON.stringify(filtered));
        }
      }
    } catch (_) {}

    if (resetType === 'login_only') {
      setSubmissions(prev => prev.map(s => {
        if (s.id === sub.id || s.noPeserta === sub.noPeserta) {
          return { ...s, status: 'Sedang Mengerjakan' as const };
        }
        return s;
      }));
    } else {
      setSubmissions(prev => prev.filter(s => s.id !== sub.id && s.noPeserta !== sub.noPeserta));
    }

    // 2. Clear or update status on server
    try {
      const res = await fetch('/api/admin/reset-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: sub.id, noPeserta: sub.noPeserta, resetType })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || (resetType === 'login_only' 
          ? `Reset Login berhasil: ${sub.studentName} dapat melanjutkan ujian!` 
          : `Reset Total berhasil: Seluruh data ${sub.studentName} dihapus.`));
      } else {
        showToast(resetType === 'login_only'
          ? `Reset Login siswa ${sub.studentName} disimpan lokal.`
          : `Sesi siswa ${sub.studentName} di-reset secara lokal.`);
      }
    } catch (err) {
      showToast(resetType === 'login_only'
        ? `Reset Login siswa ${sub.studentName} disimpan lokal.`
        : `Sesi siswa ${sub.studentName} di-reset secara lokal.`);
    }

    setStudentToReset(null);
    fetchSubmissions();
  };

  const confirmResetAll = async () => {
    // 1. Immediately wipe client-side submissions
    try {
      localStorage.removeItem('cbt_submissions');
      localStorage.removeItem('cbt_active_session');
      sessionStorage.removeItem('cbt_active_session');
    } catch (_) {}

    setSubmissions([]);

    // 2. Request backend reset
    try {
      const res = await fetch('/api/admin/reset-all', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Seluruh sesi siswa berhasil di-reset!');
      } else {
        showToast('Seluruh sesi siswa berhasil di-reset (lokal)!');
      }
    } catch (err) {
      showToast('Seluruh sesi peserta berhasil di-reset!');
    }

    setShowResetAllModal(false);
    fetchSubmissions();
  };

  // ==========================================
  // REQUEST 1: DIRECT EXCEL EXPORT (.XLSX)
  // ==========================================
  const handleExportExcel = () => {
    if (submissions.length === 0) {
      alert('Belum ada data nilai peserta untuk diekspor ke Excel!');
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
      { wch: 6 },
      { wch: 26 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
      { wch: 26 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekapitulasi Nilai CBT');

    const fileName = `Rekap_Nilai_CBT_${config.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast('File Excel (.xlsx) berhasil diunduh langsung!');
  };

  const handleExportCSV = () => {
    if (submissions.length === 0) {
      alert('Belum ada data untuk diekspor!');
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

  // ==========================================
  // REQUEST 2: CLEAR CACHE (Clean slate for new exam)
  // ==========================================
  const handleClearCache = async (target: 'all' | 'questions') => {
    // 1. Immediately purge client browser cache & storages
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
    } catch (e) {
      console.warn('Clear cache localStorage error:', e);
    }

    // 2. Request server cache clearance
    try {
      const res = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Cache ujian berhasil dibersihkan total!');
      } else {
        showToast(target === 'questions' 
          ? 'Bank soal dan gambar di-reset secara lokal!' 
          : 'Semua cache data ujian dibersihkan total!');
      }
    } catch (err) {
      showToast(target === 'questions' 
        ? 'Bank soal dan gambar berhasil dibersihkan!' 
        : 'Semua cache data ujian berhasil dibersihkan!');
    }

    setShowClearCacheModal(false);
    fetchMasterDataSummary();
    fetchSubmissions();
  };

  // Demo Data Loader (Optional testing)
  const handleLoadDemoData = async () => {
    try {
      const res = await fetch('/api/admin/load-demo-data', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        fetchMasterDataSummary();
        fetchSubmissions();
      }
    } catch (err) {
      showToast('Gagal memuat data demo');
    }
  };

  // Helper: Read Spreadsheet (supports .xlsx, .xls, .csv, and custom delimiters)
  const parseSpreadsheetFile = async (file: File): Promise<any[]> => {
    // 1. Try XLSX / SheetJS array buffer reader (handles binary xlsx/xls and standard CSVs)
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) {
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
        if (rows && rows.length > 0) {
          // Normalize object keys: trim whitespace
          const cleanedRows = rows.map((r: any) => {
            const cleanObj: any = {};
            Object.keys(r).forEach(k => {
              cleanObj[k.trim()] = typeof r[k] === 'string' ? r[k].trim() : r[k];
            });
            return cleanObj;
          });
          return cleanedRows;
        }
      }
    } catch (err) {
      console.warn('XLSX parser warning, attempting text parser fallback:', err);
    }

    // 2. Fallback to raw text parser for custom delimited CSVs (semicolon or comma)
    try {
      const text = await file.text();
      return parseCSVText(text);
    } catch (err) {
      console.error('File text parse error:', err);
      return [];
    }
  };

  // Helper: Parse Delimited CSV Text (Auto-detect semicolon ';' or comma ',')
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

  // POIN 2.a: Upload Excel/CSV Siswa Handler (Mendukung .xlsx, .xls, .csv tanpa batas 8 siswa)
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
    } catch (err) {
      showToast('Gagal memproses file siswa');
    }
  };

  const handleConfirmSaveStudents = async () => {
    const studentsToSave = allParsedStudents.length > 0 ? allParsedStudents : previewStudents;
    if (studentsToSave.length === 0) return;

    // Sanitize and normalize student objects
    const sanitized = studentsToSave.map((s: any, idx: number) => {
      const name = String(s.name || s.nama || s.Nama || s['Nama Siswa'] || s['NAMA'] || '').trim().toUpperCase();
      const noPeserta = String(s.noPeserta || s.no || s['No Peserta'] || s['No. Peserta'] || s['No '] || s['NIS'] || s['NO'] || idx + 1).trim();
      const className = String(s.className || s.kelas || s.Kelas || s['Kelas'] || s['KELAS'] || '12A').trim();
      const subject = String(s.subject || s.mapel || s.Mapel || s['Mapel'] || s['MAPEL'] || 'UMUM').trim().toUpperCase();
      return { no: idx + 1, name, noPeserta, className, subject };
    }).filter((s: any) => s.name && s.noPeserta);

    // Save to localStorage immediately (supports GitHub Pages & Vercel static)
    try {
      localStorage.setItem('cbt_master_students', JSON.stringify(sanitized));
      setMasterStudentsCount(sanitized.length);
    } catch (e) {}

    try {
      const res = await fetch('/api/admin/upload-master-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: sanitized })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast(data.message || `Berhasil menyimpan ${sanitized.length} data siswa!`);
      } else {
        showToast(`Tersimpan: ${sanitized.length} data siswa`);
      }
    } catch (err) {
      showToast(`Tersimpan di browser: ${sanitized.length} data siswa`);
    }

    setShowUploadExcelModal(false);
    setPreviewStudents([]);
    setAllParsedStudents([]);
    fetchMasterDataSummary();
  };

  // POIN 2.b, 2.c, 2.d: Upload Soal & Kunci Jawaban Handler (.xlsx, .xls, .csv)
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
    } catch (err) {
      showToast('Gagal memproses file soal');
    }
  };

  const handleConfirmSaveQuestions = async () => {
    const questionsToSave = allParsedQuestions.length > 0 ? allParsedQuestions : previewQuestions;
    if (questionsToSave.length === 0) return;
    const cleanFileName = uploadFileName.replace(/\.[^/.]+$/, '').trim().toUpperCase();

    // Map questions to client question bank format
    const newBank: any[] = questionsToSave.map((row: any, idx: number) => {
      const num = Number(row.NO || row.No || row.no || idx + 1);
      let subject = String(row.MAPEL || row.Mapel || (cleanFileName && cleanFileName !== 'SEMUA MAPEL' ? cleanFileName : 'TIK')).trim().toUpperCase();
      if (!subject || subject === 'SEMUA MAPEL') subject = 'TIK';

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

      return {
        id: num,
        subject,
        type: 'slide_image',
        typeTitle: 'Slide Interaktif CBT',
        questionCode: baseCode,
        slideFileName: codeA || baseCode,
        questionText: `Soal #${num} - ${subject}`,
        options: ['A', 'B', 'C', 'D', 'E'],
        maxPoints: 10,
        variants: Object.keys(variants).length > 0 ? variants : undefined,
        key: keyA
      };
    });

    // Save to localStorage (merge or replace for updated subjects)
    try {
      let existingBank: any[] = [];
      const raw = localStorage.getItem('cbt_question_bank');
      if (raw) existingBank = JSON.parse(raw);

      const targetSubjects = Array.from(new Set(newBank.map((q: any) => String(q.subject).toUpperCase())));
      const filtered = existingBank.filter((q: any) => !targetSubjects.includes(String(q.subject).toUpperCase()));
      const combined = [...filtered, ...newBank];
      localStorage.setItem('cbt_question_bank', JSON.stringify(combined));
      setQuestionsSummary(combined);
    } catch (e) {}

    try {
      const res = await fetch('/api/admin/upload-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questionsToSave,
          mapelFileName: cleanFileName
        })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast(data.message || `Berhasil mengunggah ${newBank.length} soal!`);
      } else {
        showToast(`Tersimpan ${newBank.length} soal di bank lokal.`);
      }
    } catch (err) {
      showToast(`Tersimpan ${newBank.length} soal di browser`);
    }

    setShowUploadQuestionsModal(false);
    setPreviewQuestions([]);
    setAllParsedQuestions([]);
    fetchMasterDataSummary();
  };

  // ==========================================
  // REQUEST USER: UPLOAD SOAL JPG / PNG / PDF
  // Requirement: Nama file gambar harus sama dengan nama soal di template UPLOAD TIPE DAN KUNCI SOAL
  // ==========================================
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

    // Save to localStorage
    try {
      let existingImages: Record<string, any> = {};
      const raw = localStorage.getItem('cbt_question_images');
      if (raw) existingImages = JSON.parse(raw);

      previewImagesToUpload.forEach(item => {
        existingImages[item.cleanName] = item;
      });
      localStorage.setItem('cbt_question_images', JSON.stringify(existingImages));
      setQuestionImagesCount(Object.keys(existingImages).length);
    } catch (e) {}

    try {
      const res = await fetch('/api/admin/upload-question-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: previewImagesToUpload })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast(data.message || `Berhasil mengunggah ${previewImagesToUpload.length} gambar soal!`);
      } else {
        showToast(`Tersimpan lokal: ${previewImagesToUpload.length} gambar soal`);
      }
    } catch (err) {
      showToast(`Tersimpan di browser: ${previewImagesToUpload.length} gambar`);
    }

    setShowUploadImagesModal(false);
    setPreviewImagesToUpload([]);
    fetchMasterDataSummary();
  };

  const handleDeleteImage = async (cleanName: string) => {
    try {
      const res = await fetch(`/api/admin/question-image/${encodeURIComponent(cleanName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Gambar ${cleanName} dihapus`);
        fetchMasterDataSummary();
      }
    } catch (err) {
      showToast('Gagal menghapus gambar');
    }
  };

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
    const content = `NO;MAPEL;SOAL;A;B;C;D;KUNCI A;KUNCI B;KUNCI C;kunci D\n1;INGGRIS;INGGRIS_1;INGGRIS_1A;INGGRIS_1B;INGGRIS_1C;INGGRIS_1D;A;C;B;E\n2;INGGRIS;INGGRIS_2;INGGRIS_2A;INGGRIS_2B;INGGRIS_2C;INGGRIS_2D;B;D;C;A\n3;INGGRIS;INGGRIS_3;INGGRIS_3A;INGGRIS_3B;INGGRIS_3C;INGGRIS_3D;C;E;D;B\n4;INGGRIS;INGGRIS_4;;;;;B;;;\n5;MATEMATIKA;MTK_1;MTK_1A;MTK_1B;;;C;A;;\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_Nama_Soal_dan_Kunci_Varian_ABCD.csv';
    a.click();
    showToast('Template Soal & Kunci Varian A/B/C/D berhasil diunduh!');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0c1322] text-slate-100 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* TOAST FEEDBACK */}
        {toastMessage && (
          <div className="fixed top-4 right-4 bg-slate-900 text-white border border-slate-700 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 z-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* HEADER BANNER MATCHING USER SCREENSHOT */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-700/60 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              PORTAL ADMINISTRASI GURU
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>Pengaturan & Kelola Bank Soal CBT</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Atur judul ujian, upload data siswa (excel), unggah slide soal varian A/B/C/D, dan kelola anti-kecurangan.
            </p>
          </div>

          {/* Quick Action Buttons Group (Updated according to user request) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* TAB 1: UPLOAD TIPE DAN KUNCI SOAL (Renamed per user request) */}
            <button
              onClick={() => setShowUploadQuestionsModal(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
              title="Unggah template spreadsheet/CSV berisi tipe soal, daftar slide dan kunci jawaban"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>UPLOAD TIPE DAN KUNCI SOAL</span>
            </button>

            {/* TAB 2: UPLOAD SOAL JPG/PNG (New tab per user request) */}
            <button
              onClick={() => setShowUploadImagesModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
              title="Unggah berkas slide gambar soal (JPG, PNG, WebP) dengan nama yang sama seperti template kunci"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>UPLOAD SOAL JPG/PNG ({questionImagesCount})</span>
            </button>

            <button
              onClick={() => setShowConfigKeysModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Status Varian ({questionsSummary.length} Soal)</span>
            </button>

            <button
              onClick={() => setShowUploadExcelModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>UPLOAD EXCEL SISWA ({masterStudentsCount})</span>
            </button>

            <button
              onClick={() => setShowClearCacheModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
              title="Bersihkan cache bank soal dan sesi agar ujian baru benar-benar bersih"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>CLEAR CACHE UJIAN</span>
            </button>

            <button
              onClick={() => setShowAppsScriptModal(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
            >
              <Code className="w-3.5 h-3.5" />
              <span>KODE SCRIPT GDRIVE</span>
            </button>

            {questionsSummary.length === 0 && (
              <button
                onClick={handleLoadDemoData}
                className="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-600/50 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
                title="Muat contoh bank soal dan data simulasi untuk uji coba cepat"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>+ Muat Data Demo</span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 1: CARD IDENTITAS UJIAN & CARD LINK UNIK GURU */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* CARD 1: Identitas Ujian & Pilihan Dropdown Siswa */}
          <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs border-b border-slate-700/60 pb-2.5">
              <span>Identitas Ujian & Pilihan Dropdown Siswa</span>
            </div>

            {/* Nama Sekolah (Manual Input) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Nama Sekolah (Diisi Sendiri oleh Admin Sekolah):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  placeholder="Contoh: SMA Negeri 1 Teladan"
                  className="flex-1 bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Simpan
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Sekolah lain tidak bisa melihat data Anda karena nama sekolah ini berdiri sendiri secara privat.
              </p>
            </div>

            {/* Nama Aplikasi / Jenis Ujian CBT */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Nama Aplikasi / Jenis Ujian CBT (Manual):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={appTitle}
                  onChange={e => setAppTitle(e.target.value)}
                  placeholder="Contoh: ASESMEN SUMATIF GENAP 2026"
                  className="flex-1 bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Simpan
                </button>
              </div>
            </div>

            {/* Jenjang Sekolah (SD/MI, SMP/MTs, SMA/MA/SMK/MAK, SLB) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Jenjang Sekolah (Menentukan Jumlah Opsi Jawaban Siswa):
              </label>
              <div className="flex gap-2">
                <select
                  value={schoolLevel}
                  onChange={e => setSchoolLevel(e.target.value as any)}
                  className="flex-1 bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="SD/MI">SD / MI (3 Pilihan Jawaban: A, B, C)</option>
                  <option value="SMP/MTs">SMP / MTs (4 Pilihan Jawaban: A, B, C, D)</option>
                  <option value="SMA/MA/SMK/MAK">SMA / MA / SMK / MAK (5 Pilihan Jawaban: A, B, C, D, E)</option>
                  <option value="SLB">SLB (3 Pilihan Jawaban: A, B, C)</option>
                </select>
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Simpan
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Otomatis menyesuaikan tombol jawaban siswa: SD (A-C), SMP (A-D), SMA (A-E), SLB (A-C).
              </p>
            </div>

            {/* Mode Verifikasi Identitas Peserta (Requirement 6) */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-700/60">
              <label className="text-[11px] font-bold text-sky-300 flex items-center justify-between">
                <span>Mode Verifikasi Identitas Peserta Saat Login:</span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {verificationMode === 'crosscheck' ? 'Wajib Cocok Master' : 'Bebas / Umum'}
                </span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <label 
                  onClick={() => setVerificationMode('crosscheck')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2 ${
                    verificationMode === 'crosscheck'
                      ? 'bg-sky-950/50 border-sky-500 text-white shadow-sm ring-1 ring-sky-500/50'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
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
                    <div className="text-xs font-bold text-sky-300">1. Kroscek Master Excel (Ketat)</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      Nama dan No. Peserta yang diinput siswa <strong>wajib sama persis</strong> dengan data yang diupload guru di Master Excel. Jika tidak cocok, tidak bisa lanjut test.
                    </div>
                  </div>
                </label>

                <label 
                  onClick={() => setVerificationMode('manual')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2 ${
                    verificationMode === 'manual'
                      ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
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
                    <div className="text-xs font-bold text-indigo-300">2. Peserta Umum (Input Manual)</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      Identitas diinput sendiri secara mandiri oleh peserta tanpa validasi ke file Excel. Asal memasukkan TOKEN soal yang benar, peserta langsung bisa ikut ujian.
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Mode Verifikasi</span>
                </button>
              </div>
            </div>

            {/* Daftar Mapel & Kelas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  Daftar Mata Pelajaran (Pisah koma):
                </label>
                <textarea
                  rows={2}
                  value={mapelsRaw}
                  onChange={e => setMapelsRaw(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  Daftar Kelas (Pisah koma):
                </label>
                <textarea
                  rows={2}
                  value={kelasRaw}
                  onChange={e => setKelasRaw(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleSaveDropdowns}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-sky-400" />
                <span>Perbarui Pilihan Mapel & Kelas Siswa</span>
              </button>
            </div>
          </div>

          {/* CARD 2: Link Unik Guru & Integration (Poin 1: Default Semua Mapel & Semua Kelas) */}
          <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs border-b border-slate-700/60 pb-2.5">
              <span>Link Unik Guru & Integration</span>
            </div>

            {/* Link Google Drive */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Link Google Drive Penyimpanan Data:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gdriveUrl}
                  onChange={e => setGdriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="flex-1 bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSaveGdriveUrl}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-600"
                >
                  Simpan
                </button>
              </div>
            </div>

            {/* POIN 1: Generator Link Siswa dengan Opsi "Semua Mapel" & "Semua Kelas" */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300">
                  Generate Link Siswa (Pilihan Default Universal):
                </label>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                  Cocok untuk TKA / Ujian Bareng
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={linkMapel}
                  onChange={e => setLinkMapel(e.target.value)}
                  className="bg-[#0a0f1d] border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none"
                >
                  <option value="all">★ Semua Mapel (Siswa Pilih Sendiri)</option>
                  {config.mapels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select
                  value={linkKelas}
                  onChange={e => setLinkKelas(e.target.value)}
                  className="bg-[#0a0f1d] border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none"
                >
                  <option value="all">★ Semua Kelas (Ujian Bareng)</option>
                  {config.kelas.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleGenerateLink}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Buat Link Ujian
                </button>
              </div>

              <p className="text-[10px] text-slate-400">
                Pilih <strong>Semua Mapel</strong> & <strong>Semua Kelas</strong> untuk ujian serentak, siswa cukup diberi 1 link dan 1 token yang sama, lalu memilih mapelnya sendiri saat login.
              </p>

              <div className="space-y-1.5 pt-1">
                <input
                  type="text"
                  readOnly
                  value={generatedLink || "Klik 'Buat Link Ujian' untuk menghasilkan tautan"}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none select-all"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={!generatedLink}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-600 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Salin Link Khusus Siswa</span>
                  </button>
                  {generatedLink && (
                    <a
                      href={generatedLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 shadow"
                      title="Buka link di tab baru untuk menguji tampilan siswa yang terkunci"
                    >
                      <span>Tes Laman Siswa ↗</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ROW 2: PENGATURAN DURASI & TOKEN + RESET & EXPORT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div className="md:col-span-2 bg-[#131b2e] border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs border-b border-slate-700/60 pb-2.5">
              <span>Pengaturan Durasi, Token & Fitur Anti-Kecurangan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  Lama Ujian (Menit):
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  Toleransi Pindah TAB / Keluar App (Maksimal x):
                </label>
                <input
                  type="number"
                  value={maxViolations}
                  onChange={e => setMaxViolations(Number(e.target.value))}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">TOKEN Soal Ujian Aktif:</div>
                <div className="text-2xl font-black font-mono tracking-widest text-emerald-400 mt-0.5">
                  {activeToken}
                </div>
                <div className="text-[10px] text-slate-500">Siswa wajib menginputkan Token ini untuk memulai ujian.</div>
              </div>

              <button
                type="button"
                onClick={handleGenerateNewToken}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Generate TOKEN Baru</span>
              </button>
            </div>

            <div className="flex items-center justify-between bg-[#0a0f1d] border border-slate-800 p-3 rounded-xl">
              <div>
                <div className="text-xs font-bold text-white">Acak Urutan Soal Ujian</div>
                <div className="text-[10px] text-slate-400">Jika diaktifkan, nomor urut slide soal tiap peserta akan teracak otomatis.</div>
              </div>

              <button
                type="button"
                onClick={handleToggleShuffle}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>{shuffleQuestions ? 'Acak Soal (ON)' : 'Acak Soal (OFF)'}</span>
              </button>
            </div>
          </div>

          <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs border-b border-slate-700/60 pb-2.5">
                <span>Reset Sesi & Export Data</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Kelola rekapitulasi nilai peserta dan lakukan pembersihan sesi jika ujian telah berakhir.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Direct Excel .xlsx Export (Request 1) */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                title="Unduh langsung file Excel (.xlsx) dengan tabel, kolom rapi & formula"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Nilai Langsung (Excel .xlsx)</span>
              </button>

              {/* Standard CSV Export */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                title="Unduh file teks CSV standar dengan BOM UTF-8"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export Nilai (CSV)</span>
              </button>

              {/* Actions row: Clear Cache & Reset All */}
              <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowClearCacheModal(true)}
                  className="flex-1 py-2 bg-amber-600/90 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1"
                  title="Bersihkan cache bank soal & sesi untuk ujian baru"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Cache</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowResetAllModal(true)}
                  className="flex-1 py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1 active:scale-95"
                  title="Reset seluruh sesi peserta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Sesi</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* CARD 5: DAFTAR PESERTA & KROSCEK SESI UJIAN SISWA */}
        <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs sm:text-sm">
              <Users className="w-4 h-4 text-sky-400" />
              <span>Daftar Peserta & Kroscek Sesi Ujian Siswa</span>
              <span className="bg-sky-950 text-sky-300 border border-sky-800 text-[10px] px-2.5 py-0.5 rounded-full font-semibold ml-2">
                {submissions.length} Peserta Selesai / Sedang Mengerjakan
              </span>
            </div>

            {/* Sorter / Indexer & Live Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#0a0f1d] border border-slate-700 rounded-lg px-2 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortOption}
                  onChange={e => setSortOption(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 font-semibold focus:outline-none"
                >
                  <option value="name_asc" className="bg-slate-900">Nama Siswa (A - Z)</option>
                  <option value="name_desc" className="bg-slate-900">Nama Siswa (Z - A)</option>
                  <option value="no_asc" className="bg-slate-900">No. Peserta (Kecil ke Besar)</option>
                  <option value="no_desc" className="bg-slate-900">No. Peserta (Besar ke Kecil)</option>
                  <option value="score_desc" className="bg-slate-900">Nilai Tertinggi</option>
                  <option value="score_asc" className="bg-slate-900">Nilai Terendah</option>
                </select>
              </div>

              <div className="relative w-48 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Nama / No. Peserta..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Filter Kelas Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 shrink-0">Filter Kelas:</span>
            
            <button
              onClick={() => setActiveClassFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition shrink-0 ${
                activeClassFilter === 'all'
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              Semua Kelas
            </button>

            {config.kelas.map(k => (
              <button
                key={k}
                onClick={() => setActiveClassFilter(k)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition shrink-0 ${
                  activeClassFilter === k
                    ? 'bg-sky-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Submissions Table with Assigned Package Column */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700/80 bg-[#0a0f1d] text-slate-400 font-semibold">
                  <th className="p-2.5">No</th>
                  <th className="p-2.5">Nama Peserta (Kapital)</th>
                  <th className="p-2.5">No. Absen / Peserta</th>
                  <th className="p-2.5">Mapel & Kelas</th>
                  <th className="p-2.5">Kode Paket</th>
                  <th className="p-2.5">Status Ujian</th>
                  <th className="p-2.5">Pelanggaran</th>
                  <th className="p-2.5">Nilai Akhir</th>
                  <th className="p-2.5 text-center">Aksi (Reset Ujian)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 italic">
                      Belum ada peserta yang login / mengerjakan pada filter ini.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub, idx) => (
                    <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-white tracking-wide">{sub.studentName}</td>
                      <td className="p-2.5 font-mono text-sky-400">{sub.noPeserta}</td>
                      <td className="p-2.5">
                        <span className="text-slate-300">{sub.subject}</span>
                        <span className="text-slate-500 mx-1">·</span>
                        <span className="font-semibold text-indigo-400">{sub.className}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                          {sub.assignedPackage || 'Paket Acak'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.status === 'Selesai'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : sub.status === 'Curang (Disubmit)'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-rose-400">
                        {sub.violationsCount > 0 ? `${sub.violationsCount}x` : '0x'}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-amber-300 text-sm">
                        {sub.percentage}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setStudentToReset(sub)}
                          className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-[10px] font-semibold transition active:scale-95"
                          title="Reset ujian peserta ini"
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

      {/* MODAL 1: UPLOAD DATA SISWA EXCEL/CSV (POIN 2.a) */}
      {showUploadExcelModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Upload Data Master Siswa (Format CSV / Excel)</span>
              </h3>
              <button onClick={() => setShowUploadExcelModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-xs">
              <div>
                <div className="font-bold text-emerald-300">Gunakan Template Standar:</div>
                <div className="text-[11px] text-slate-300">Format kolom: <code>No ;Nama Siswa;No Peserta;Kelas;Mapel</code></div>
              </div>
              <button
                onClick={downloadStudentTemplate}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template CSV</span>
              </button>
            </div>

            <div className="border-2 border-dashed border-emerald-500/40 bg-slate-950/60 rounded-xl p-5 text-center">
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleStudentFileSelect}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-xs file:font-semibold cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-2">
                Mendukung berkas Excel (<code>.xlsx</code>, <code>.xls</code>) dan CSV (titik koma <code>;</code> atau koma <code>,</code>).
              </p>
            </div>

            {allParsedStudents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400">Total Terdeteksi: {allParsedStudents.length} Data Siswa</span>
                  <span className="text-[11px] text-slate-400 font-normal">Seluruh {allParsedStudents.length} data siswa akan tersimpan</span>
                </div>
                <div className="max-h-52 overflow-y-auto custom-scrollbar border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-1.5">No</th>
                        <th className="p-1.5">Nama Siswa</th>
                        <th className="p-1.5">No Peserta</th>
                        <th className="p-1.5">Kelas</th>
                        <th className="p-1.5">Mapel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {allParsedStudents.map((st, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="p-1.5 font-mono text-slate-500">{st['No '] || st.No || st.no || i + 1}</td>
                          <td className="p-1.5 font-bold text-white">{st['Nama Siswa'] || st.name || st.Nama || st.nama}</td>
                          <td className="p-1.5 font-mono text-sky-400">{st['No Peserta'] || st.noPeserta}</td>
                          <td className="p-1.5">{st['Kelas'] || st.className || st.kelas}</td>
                          <td className="p-1.5">{st['Mapel'] || st.subject || st.mapel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setShowUploadExcelModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">
                Batal
              </button>
              <button
                onClick={handleConfirmSaveStudents}
                disabled={allParsedStudents.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Seluruh {allParsedStudents.length} Data Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD TIPE DAN KUNCI SOAL (POIN 2.b, 2.c, 2.d) */}
      {showUploadQuestionsModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-sky-400 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload Tipe dan Kunci Soal (Excel / CSV Varian A/B/C/D)</span>
              </h3>
              <button onClick={() => setShowUploadQuestionsModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-sky-950/40 border border-sky-800/80 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300">Format Template Sesuai File Anda:</span>
                <button
                  onClick={downloadQuestionsTemplate}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Template Tipe & Kunci</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                • Kolom: <code>NO;MAPEL;SOAL;A;B;C;D;KUNCI A;KUNCI B;KUNCI C;kunci D</code><br />
                • <strong>Penting:</strong> Nama file gambar di tab &ldquo;UPLOAD SOAL JPG/PNG&rdquo; harus sama dengan nama yang tertera di kolom <code>SOAL</code> atau varian <code>A / B / C / D</code>.
              </p>
            </div>

            <div className="border-2 border-dashed border-sky-500/40 bg-slate-950/60 rounded-xl p-5 text-center">
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleQuestionsFileSelect}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-sky-600 file:text-white file:text-xs file:font-semibold cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-2">
                Mendukung berkas Excel (<code>.xlsx</code>, <code>.xls</code>) atau CSV (<code>.csv</code>) per mapel (misal: <code>INGGRIS.xlsx</code>) maupun gabungan (<code>Semua Mapel.xlsx</code>).
              </p>
            </div>

            {allParsedQuestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-sky-400">Total Terdeteksi: {allParsedQuestions.length} Nomor Soal & Kunci</span>
                  <span className="text-[11px] text-slate-400 font-normal">Semua {allParsedQuestions.length} nomor soal siap disimpan</span>
                </div>
                <div className="max-h-52 overflow-y-auto custom-scrollbar border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-1.5">No</th>
                        <th className="p-1.5">Mapel</th>
                        <th className="p-1.5">Kode Soal</th>
                        <th className="p-1.5">Varian A</th>
                        <th className="p-1.5">Varian B</th>
                        <th className="p-1.5">Varian C</th>
                        <th className="p-1.5">Varian D</th>
                        <th className="p-1.5">Kunci</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {allParsedQuestions.map((q, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="p-1.5 font-mono text-slate-500">{q.NO || q.No || i + 1}</td>
                          <td className="p-1.5 font-bold text-amber-300">{q.MAPEL || q.Mapel || uploadFileName.replace(/\.[^/.]+$/, '')}</td>
                          <td className="p-1.5 font-mono">{q.SOAL || q.Soal}</td>
                          <td className="p-1.5 text-purple-300">{q.A || q.a || '-'}</td>
                          <td className="p-1.5 text-purple-300">{q.B || q.b || '-'}</td>
                          <td className="p-1.5 text-purple-300">{q.C || q.c || '-'}</td>
                          <td className="p-1.5 text-purple-300">{q.D || q.d || '-'}</td>
                          <td className="p-1.5 font-bold text-emerald-400">
                            {q['KUNCI A'] || q['Kunci A'] || q.KUNCI || q.kunci || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setShowUploadQuestionsModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">
                Batal
              </button>
              <button
                onClick={handleConfirmSaveQuestions}
                disabled={allParsedQuestions.length === 0}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Seluruh {allParsedQuestions.length} Tipe & Kunci Soal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BARU (REQUEST USER): UPLOAD SOAL JPG / PNG / PDF */}
      {showUploadImagesModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-600/70 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-blue-400">
                    Upload Berkas Gambar Soal (JPG / PNG / WEBP)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Unggah gambar slide soal yang sesuai dengan nama kode di template kunci.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowUploadImagesModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Petunjuk Nama File Wajib Sama */}
            <div className="p-3.5 bg-blue-950/40 border border-blue-800/80 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-blue-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Syarat Penamaan Berkas Gambar Soal:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Nama file gambar <strong>harus sama persis</strong> dengan nama soal yang diisi pada template <em>&ldquo;UPLOAD TIPE DAN KUNCI SOAL&rdquo;</em> (tanpa mempedulikan huruf besar/kecil).
              </p>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                <div>• Contoh Soal Tunggal: Jika di template bernama <strong className="text-sky-300">INGGRIS_1</strong> &rarr; Nama file gambar: <strong className="text-emerald-400">INGGRIS_1.jpg</strong> atau <strong className="text-emerald-400">INGGRIS_1.png</strong></div>
                <div>• Contoh Soal Varian: Jika di template kolom A/B bernama <strong className="text-purple-300">INGGRIS_1A</strong>, <strong className="text-purple-300">INGGRIS_1B</strong> &rarr; Berkas gambar: <strong className="text-emerald-400">INGGRIS_1A.jpg</strong>, <strong className="text-emerald-400">INGGRIS_1B.jpg</strong></div>
              </div>
            </div>

            {/* Area File Input Dropzone (Multiple Files) */}
            <div className="border-2 border-dashed border-blue-500/50 bg-slate-950/60 rounded-xl p-6 text-center space-y-2">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleImagesFileSelect}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-bold hover:file:bg-blue-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Pilih atau seret sekaligus beberapa gambar soal (Bisa memilih hingga 100+ file gambar JPG/PNG serentak).
              </p>
            </div>

            {/* Preview Selected Images Before Save */}
            {previewImagesToUpload.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400">
                    Siap Disimpan ({previewImagesToUpload.length} Berkas Dipilih):
                  </span>
                  <button 
                    onClick={() => setPreviewImagesToUpload([])}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Batal Pilih
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-800 rounded-xl p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950">
                  {previewImagesToUpload.map((img, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-2">
                      <img src={img.dataUrl} alt={img.name} className="w-10 h-10 object-cover rounded bg-slate-950 shrink-0 border border-slate-700" />
                      <div className="overflow-hidden text-[11px]">
                        <div className="font-bold text-white truncate" title={img.name}>{img.name}</div>
                        <div className="text-[10px] font-mono text-emerald-400">&rarr; {img.cleanName}</div>
                        <div className="text-[9px] text-slate-500">{img.sizeKb} KB</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daftar Gambar yang Sudah Ada di Server dihilangkan sesuai permintaan user pada gambar lampiran */}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button 
                onClick={() => {
                  setShowUploadImagesModal(false);
                  setPreviewImagesToUpload([]);
                }} 
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
              >
                Tutup
              </button>
              <button
                onClick={handleConfirmSaveImages}
                disabled={previewImagesToUpload.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan {previewImagesToUpload.length} Gambar Soal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: STATUS KUNCI & VARIAN SOAL */}
      {showConfigKeysModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-purple-400 flex items-center gap-2">
                <Key className="w-4 h-4" />
                <span>Status Bank Soal & Varian Kode A/B/C/D Terkunci</span>
              </h3>
              <button onClick={() => setShowConfigKeysModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-purple-950/40 border border-purple-800 rounded-xl text-xs space-y-1">
              <div className="font-bold text-purple-300">Proteksi Anti-Contek Varian Bersebelahan:</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Saat siswa login, server mengundi salah satu varian kode soal (Paket A, B, C, atau D) secara acak dan menguncinya di sesi siswa. Siswa tidak mendapatkan kunci jawaban di browser; evaluasi dilakukan di server saat submit.
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-2">No</th>
                    <th className="p-2">Mapel</th>
                    <th className="p-2">Kode Soal</th>
                    <th className="p-2">Tipe Varian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {questionsSummary.map((q, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-2 font-mono text-slate-500">{q.id}</td>
                      <td className="p-2 font-bold text-white">{q.subject}</td>
                      <td className="p-2 font-mono text-sky-400">{q.questionCode}</td>
                      <td className="p-2">
                        {q.hasVariants ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                            Varian: {q.variantCodes.join(', ')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
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
              <button onClick={() => setShowConfigKeysModal(false)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: KODE GOOGLE APPS SCRIPT */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                <Code className="w-4 h-4" />
                <span>Kode Google Apps Script untuk Google Drive</span>
              </h3>
              <button onClick={() => setShowAppsScriptModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Salin kode berikut ke Google Spreadsheet Anda (menu <strong>Extensions &gt; Apps Script</strong>), lalu Deploy sebagai Web App:
            </p>

            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-300 overflow-x-auto select-all leading-relaxed">
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Waktu", "Nama", "No Peserta", "Kelas", "Mapel", "Paket", "Nilai", "Pelanggaran", "Status"]);
  }
  var d = JSON.parse(e.postData.contents);
  sheet.appendRow([new Date(), d.studentName, d.noPeserta, d.className, d.subject, d.assignedPackage || "-", d.score, d.violationsCount, d.status]);
  return ContentService.createTextOutput(JSON.stringify({ status: "success" }));
}`}
            </pre>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`function doPost(e) {\n  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();\n  if (sheet.getLastRow() === 0) {\n    sheet.appendRow(["Waktu", "Nama", "No Peserta", "Kelas", "Mapel", "Paket", "Nilai", "Pelanggaran", "Status"]);\n  }\n  var d = JSON.parse(e.postData.contents);\n  sheet.appendRow([new Date(), d.studentName, d.noPeserta, d.className, d.subject, d.assignedPackage || "-", d.score, d.violationsCount, d.status]);\n  return ContentService.createTextOutput(JSON.stringify({ status: "success" }));\n}`);
                  showToast('Kode Apps Script disalin ke clipboard!');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow"
              >
                Salin Kode
              </button>
              <button onClick={() => setShowAppsScriptModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CLEAR CACHE & BERSIHKAN SOAL BARU (REQUEST 2) */}
      {showClearCacheModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-600/60 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Pembersihan Cache & Persiapan Ujian Baru</span>
              </h3>
              <button onClick={() => setShowClearCacheModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Fitur ini memastikan <strong>soal lama tidak terpanggil kembali</strong> ketika Anda ingin membuat ujian baru. Silakan pilih level pembersihan yang diinginkan:
            </p>

            <div className="space-y-3">
              {/* Option 1: Bersihkan Bank Soal & Cache Sesi Varian */}
              <div className="p-3.5 bg-slate-950/80 border border-amber-700/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-300">
                    1. Bersihkan Bank Soal & Cache Sesi (Rekomendasi)
                  </span>
                  <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-mono">
                    Ganti Soal Baru
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Mengosongkan bank soal aktif di memori server dan me-reset kunci acak sesi siswa. Master siswa tetap tersimpan.
                </p>
                <button
                  type="button"
                  onClick={() => handleClearCache('questions')}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Bersihkan Bank Soal Saja</span>
                </button>
              </div>

              {/* Option 2: Bersihkan Total Semua Data */}
              <div className="p-3.5 bg-slate-950/80 border border-rose-800/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-300">
                    2. Bersihkan Total (Reset Pabrik / Ujian Baru Total)
                  </span>
                  <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-mono">
                    Reset Total
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Menghapus total bank soal, master data siswa, dan riwayat nilai. Sistem menjadi 100% bersih seperti baru di-install.
                </p>
                <button
                  type="button"
                  onClick={() => handleClearCache('all')}
                  className="w-full py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Total Semua Data</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearCacheModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: KONFIRMASI RESET SELURUH SESI UJIAN */}
      {showResetAllModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-600/70 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Konfirmasi Reset Seluruh Sesi Ujian</span>
              </h3>
              <button onClick={() => setShowResetAllModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin <strong>me-reset seluruh sesi ujian siswa ({submissions.length} siswa)</strong>?
            </p>
            <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-xl text-[11px] text-rose-300 space-y-1">
              <p>• Seluruh data pengerjaan dan nilai peserta akan dikosongkan.</p>
              <p>• Siswa dapat melakukan login ulang untuk mengerjakan ujian.</p>
              <p>• Data bank soal dan data master siswa tidak akan terhapus.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetAllModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmResetAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Reset Seluruh Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: KONFIRMASI RESET SATU SISWA */}
      {studentToReset && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-600/70 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Reset Ujian Siswa</span>
              </h3>
              <button onClick={() => setStudentToReset(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="text-xs text-slate-300 space-y-3">
              <p>Pilih tipe tindakan reset untuk peserta:</p>
              
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-slate-200">
                <div className="font-bold text-sky-400 text-sm">{studentToReset.studentName}</div>
                <div className="text-[11px] text-slate-400">
                  No. Peserta: <strong className="text-slate-200">{studentToReset.noPeserta}</strong> | Kelas: <strong className="text-slate-200">{studentToReset.className}</strong>
                </div>
                <div className="text-[11px] text-slate-400">
                  Mapel: <strong className="text-slate-200">{studentToReset.subject}</strong> | Status: <strong className="text-amber-400">{studentToReset.status}</strong>
                </div>
              </div>

              {/* Opsi 1: Reset Login Saja (Lanjutkan Ujian) */}
              <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-sky-300 flex items-center gap-1.5">
                    <LogIn className="w-3.5 h-3.5 text-sky-400" />
                    <span>1. Reset Login Saja (Lanjutkan Ujian)</span>
                  </span>
                  <span className="text-[10px] bg-sky-900/60 text-sky-300 px-2 py-0.5 rounded font-mono">
                    Data Aman
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Siswa dapat login kembali, <strong>data jawaban tetap tersimpan</strong>, sisa waktu dan status ujian tidak hilang. Cocok jika siswa tidak sengaja keluar browser atau mati lampu.
                </p>
                <button
                  type="button"
                  onClick={() => confirmResetStudent(studentToReset, 'login_only')}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Reset Login Saja (Data Tetap Tersimpan)</span>
                </button>
              </div>

              {/* Opsi 2: Reset Total (Hapus Semua & Ulang dari Awal) */}
              <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-300 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>2. Reset Total (Hapus Semua Data)</span>
                  </span>
                  <span className="text-[10px] bg-rose-900/60 text-rose-300 px-2 py-0.5 rounded font-mono">
                    Ulang Dari Awal
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  <strong>Semua data jawaban hilang total</strong>. Siswa login ulang dan mengerjakan seluruh soal dari nomor 1 dari awal.
                </p>
                <button
                  type="button"
                  onClick={() => confirmResetStudent(studentToReset, 'full_reset')}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Total (Hapus Semua Data)</span>
                </button>
              </div>

            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStudentToReset(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
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
