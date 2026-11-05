import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { AppConfig, StudentSubmission, MasterStudent } from '../types';
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
  FolderSync
} from 'lucide-react';

interface Props {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

export const TeacherAdmin: React.FC<Props> = ({ config, onUpdateConfig }) => {
  // Form Inputs State (Matching Screenshots)
  const [appTitle, setAppTitle] = useState(config.appTitle);
  const [schoolName, setSchoolName] = useState(config.schoolName);
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
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);

  // Preview States for Uploads
  const [previewStudents, setPreviewStudents] = useState<any[]>([]);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');

  useEffect(() => {
    setAppTitle(config.appTitle);
    setSchoolName(config.schoolName);
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
    try {
      const params = new URLSearchParams();
      if (activeClassFilter !== 'all') params.append('kelas', activeClassFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (sortOption) params.append('sort', sortOption);

      const res = await fetch(`/api/admin/submissions?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.submissions) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMasterDataSummary = async () => {
    try {
      const resSt = await fetch('/api/admin/master-students');
      const dataSt = await resSt.json();
      if (dataSt.success) setMasterStudentsCount(dataSt.total);

      const resQ = await fetch('/api/admin/questions-summary');
      const dataQ = await resQ.json();
      if (dataQ.success) setQuestionsSummary(dataQ.questions);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchMasterDataSummary();
    const timer = setInterval(fetchSubmissions, 5000);
    return () => clearInterval(timer);
  }, [activeClassFilter, sortOption, searchQuery]);

  // Save Identity Settings
  const handleSaveIdentity = async () => {
    const updated: AppConfig = {
      ...config,
      appTitle: appTitle.trim() || 'SIMULASI UJIAN CBT SLIDE',
      schoolName: schoolName.trim() || 'SMA Negeri 1 Teladan'
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        onUpdateConfig(data.config);
        showToast('Identitas Ujian & Nama Sekolah berhasil disimpan!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Dropdowns
  const handleSaveDropdowns = async () => {
    const mapels = mapelsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const kelas = kelasRaw.split(',').map(s => s.trim()).filter(Boolean);

    const updated: AppConfig = {
      ...config,
      mapels,
      kelas
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        onUpdateConfig(data.config);
        showToast('Pilihan Mapel & Kelas Siswa berhasil diperbarui!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGdriveUrl = async () => {
    const updated: AppConfig = {
      ...config,
      gdriveUrl: gdriveUrl.trim()
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        onUpdateConfig(data.config);
        showToast('Link Google Drive Penyimpanan Data berhasil disimpan!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // POIN 1: Generate Link dengan opsi default "Semua Mapel" & "Semua Kelas"
  const handleGenerateLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();

    if (linkMapel !== 'all') params.append('mapel', linkMapel);
    if (linkKelas !== 'all') params.append('kelas', linkKelas);
    params.append('token', activeToken);

    const url = `${baseUrl}?${params.toString()}`;
    setGeneratedLink(url);

    let desc = 'Link Universal (Semua Mapel & Semua Kelas)';
    if (linkMapel !== 'all' && linkKelas !== 'all') desc = `Link khusus ${linkMapel} (${linkKelas})`;
    else if (linkMapel !== 'all') desc = `Link khusus Mapel ${linkMapel} (Semua Kelas)`;
    else if (linkKelas !== 'all') desc = `Link khusus Kelas ${linkKelas} (Semua Mapel)`;

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

    try {
      const postRes = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await postRes.json();
      if (data.success) {
        onUpdateConfig(data.config);
        showToast(`TOKEN Soal Baru Dibuat: ${res}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleShuffle = async () => {
    const nextVal = !shuffleQuestions;
    setShuffleQuestions(nextVal);

    const updated: AppConfig = {
      ...config,
      shuffleQuestions: nextVal
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        onUpdateConfig(data.config);
        showToast(`Pengacakan nomor soal: ${nextVal ? 'ON (Acak Aktif)' : 'OFF (Sesuai Urutan)'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetStudent = async (sub: StudentSubmission) => {
    if (!confirm(`RESET UJIAN SISWA:\nReset sesi peserta ${sub.studentName} (No: ${sub.noPeserta})? Siswa akan dapat login kembali dari awal.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: sub.id, noPeserta: sub.noPeserta })
      });
      const data = await res.json();
      if (data.success) {
        fetchSubmissions();
        showToast(`Siswa ${sub.studentName} berhasil di-reset!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetAll = async () => {
    if (!confirm('PERINGATAN:\nReset seluruh sesi ujian semua siswa? Data sesi saat ini akan dikosongkan.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchSubmissions();
        showToast('Seluruh sesi peserta berhasil di-reset!');
      }
    } catch (err) {
      console.error(err);
    }
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
    try {
      const res = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      });
      const data = await res.json();
      if (data.success) {
        // Also wipe client browser cache & storages
        try {
          localStorage.removeItem('cbt_admin_state');
          localStorage.removeItem('cbt_active_session');
          sessionStorage.clear();
        } catch (e) {}

        showToast(data.message);
        setShowClearCacheModal(false);
        fetchMasterDataSummary();
        fetchSubmissions();
      }
    } catch (err) {
      showToast('Gagal membersihkan cache sistem');
    }
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

  // Helper: Parse Delimited CSV Text (Auto-detect semicolon ';' or comma ',')
  const parseCSVText = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
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

  // POIN 2.a: Upload Excel/CSV Siswa Handler
  const handleStudentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = parseCSVText(text);
        if (parsed.length > 0) {
          setPreviewStudents(parsed.slice(0, 8)); // preview first 8
        } else {
          showToast('File tidak memiliki data atau format tidak terbaca');
        }
      } catch (err) {
        showToast('Gagal memproses file');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmSaveStudents = async () => {
    if (previewStudents.length === 0) return;
    try {
      const res = await fetch('/api/admin/upload-master-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: previewStudents })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setShowUploadExcelModal(false);
        setPreviewStudents([]);
        fetchMasterDataSummary();
      }
    } catch (err) {
      showToast('Gagal menyimpan ke server');
    }
  };

  // POIN 2.b, 2.c, 2.d: Upload Soal & Kunci Jawaban Handler
  const handleQuestionsFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);

    // Extract subject name from file if named like "INGGRIS.csv" or "MATEMATIKA.xlsx"
    const cleanFileName = file.name.replace(/\.[^/.]+$/, '').trim().toUpperCase();

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = parseCSVText(text);
        if (parsed.length > 0) {
          setPreviewQuestions(parsed.slice(0, 8));
        } else {
          showToast('File soal tidak memiliki baris data');
        }
      } catch (err) {
        showToast('Gagal memproses file soal');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmSaveQuestions = async () => {
    if (previewQuestions.length === 0) return;
    const cleanFileName = uploadFileName.replace(/\.[^/.]+$/, '').trim().toUpperCase();

    try {
      const res = await fetch('/api/admin/upload-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: previewQuestions,
          mapelFileName: cleanFileName
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setShowUploadQuestionsModal(false);
        setPreviewQuestions([]);
        fetchMasterDataSummary();
      }
    } catch (err) {
      showToast('Gagal mengunggah bank soal');
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

          {/* Quick Action Buttons Group */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowUploadQuestionsModal(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>UPLOAD SOAL & KUNCI</span>
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
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={!generatedLink}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-600 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Salin Link Siswa ke Clipboard</span>
                </button>
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
                  onClick={handleResetAll}
                  className="flex-1 py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1"
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
                          onClick={() => handleResetStudent(sub)}
                          className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-[10px] font-semibold transition"
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
                accept=".csv,.txt"
                onChange={handleStudentFileSelect}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-xs file:font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-2">
                Mendukung delimiter titik koma (<code>;</code>) khas Excel Indonesia maupun koma (<code>,</code>).
              </p>
            </div>

            {previewStudents.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-sky-400">Pratinjau Data yang Terbaca:</div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-800 rounded-lg">
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
                      {previewStudents.map((st, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="p-1.5">{st['No '] || st.No || i + 1}</td>
                          <td className="p-1.5 font-bold text-white">{st['Nama Siswa'] || st.name}</td>
                          <td className="p-1.5 font-mono text-sky-400">{st['No Peserta'] || st.noPeserta}</td>
                          <td className="p-1.5">{st['Kelas'] || st.className}</td>
                          <td className="p-1.5">{st['Mapel'] || st.subject}</td>
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
                disabled={previewStudents.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Master Data Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD SOAL & KUNCI VARIAN A/B/C/D (POIN 2.b, 2.c, 2.d) */}
      {showUploadQuestionsModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-sky-400 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload Bank Soal & Kunci Jawaban (Paket Varian A/B/C/D)</span>
              </h3>
              <button onClick={() => setShowUploadQuestionsModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-sky-950/40 border border-sky-800/80 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300">Format Template Soal Sesuai File Anda:</span>
                <button
                  onClick={downloadQuestionsTemplate}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Template Soal & Kunci</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                • Kolom: <code>NO;MAPEL;SOAL;A;B;C;D;KUNCI A;KUNCI B;KUNCI C;kunci D</code><br />
                • <strong>Tipe Ganda (Varian A/B/C/D):</strong> Jika kolom A, B, C, D diisi nama slide (misal <code>INGGRIS_1A</code>), sistem akan mengacak paket ke tiap siswa dan menguncinya.<br />
                • <strong>Tipe Tunggal:</strong> Jika kolom A, B, C, D kosong, soal berlaku sama untuk seluruh siswa.
              </p>
            </div>

            <div className="border-2 border-dashed border-sky-500/40 bg-slate-950/60 rounded-xl p-5 text-center">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleQuestionsFileSelect}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-sky-600 file:text-white file:text-xs file:font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-2">
                Nama file bisa spesifik per mapel (misal: <code>INGGRIS.csv</code>) atau gabungan (<code>Semua Mapel.csv</code>).
              </p>
            </div>

            {previewQuestions.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-sky-400">Pratinjau {previewQuestions.length} Soal Pertama:</div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-1.5">No</th>
                        <th className="p-1.5">Mapel</th>
                        <th className="p-1.5">Kode Soal</th>
                        <th className="p-1.5">Varian A</th>
                        <th className="p-1.5">Varian B</th>
                        <th className="p-1.5">Kunci A</th>
                        <th className="p-1.5">Kunci B</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {previewQuestions.map((q, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="p-1.5">{q.NO || q.No || i + 1}</td>
                          <td className="p-1.5 font-bold text-amber-300">{q.MAPEL || q.Mapel}</td>
                          <td className="p-1.5 font-mono">{q.SOAL || q.Soal}</td>
                          <td className="p-1.5 text-purple-300">{q.A || '-'}</td>
                          <td className="p-1.5 text-purple-300">{q.B || '-'}</td>
                          <td className="p-1.5 font-bold text-emerald-400">{q['KUNCI A'] || '-'}</td>
                          <td className="p-1.5 font-bold text-emerald-400">{q['KUNCI B'] || '-'}</td>
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
                disabled={previewQuestions.length === 0}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Bank Soal & Varian Kunci</span>
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

    </div>
  );
};
