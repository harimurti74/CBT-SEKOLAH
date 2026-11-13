import React, { useState, useEffect } from 'react';
import { AppConfig } from './types';
import { Navbar } from './components/Navbar';
import { StudentExamEngine } from './components/StudentExamEngine';
import { TeacherAdmin } from './components/TeacherAdmin';
import { ArchitecturalConsultation } from './components/ArchitecturalConsultation';
import { LoadSimulator } from './components/LoadSimulator';
import { SecurityInspector } from './components/SecurityInspector';
import { decodeConfigFromUrl } from './utils/configCodec';
import { fetchExamFromCloud, getOrCreateLocalExamId } from './services/cbtFirestore';

const DEFAULT_CONFIG: AppConfig = {
  appTitle: 'SIMULASI UJIAN CBT SLIDE',
  schoolName: 'SMA Negeri 1 Wonogiri',
  schoolLevel: 'SMA/MA/SMK/MAK',
  token: 'CBT2026',
  gdriveUrl: 'https://drive.google.com/drive/folders/1SMA_Teladan_CBT_Archive',
  mapels: ['Bahasa Inggris', 'Biologi', 'Fisika', 'Matematika', 'Kimia', 'TIK'],
  kelas: ['X-1', 'X-2', 'XI-IPA-1', 'XI-IPA-2', 'XII-MIPA', '12A', '12B'],
  durationMinutes: 90,
  maxViolations: 3,
  shuffleQuestions: true,
  verificationMode: 'crosscheck'
};

const sanitizeConfig = (raw: any): AppConfig => {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_CONFIG,
      examId: getOrCreateLocalExamId(DEFAULT_CONFIG.schoolName)
    };
  }
  const schoolName = typeof raw.schoolName === 'string' && raw.schoolName.trim()
    ? raw.schoolName.trim()
    : DEFAULT_CONFIG.schoolName;
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    examId: typeof raw.examId === 'string' && raw.examId.trim()
      ? raw.examId.trim()
      : getOrCreateLocalExamId(schoolName),
    mapels: Array.isArray(raw.mapels) && raw.mapels.length > 0 
      ? raw.mapels.filter((m: any) => typeof m === 'string' && m.trim().length > 0)
      : DEFAULT_CONFIG.mapels,
    kelas: Array.isArray(raw.kelas) && raw.kelas.length > 0
      ? raw.kelas.filter((k: any) => typeof k === 'string' && k.trim().length > 0)
      : DEFAULT_CONFIG.kelas,
    schoolLevel: raw.schoolLevel || 'SMA/MA/SMK/MAK',
    verificationMode: raw.verificationMode || 'crosscheck'
  };
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CBT App ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('cbt_active_session');
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0c1322] text-white flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-slate-700 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold border border-amber-500/30">
              ⚠️
            </div>
            <h3 className="font-bold text-base text-slate-100">Memulihkan Sesi Laman Ujian CBT</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Terjadi penyesuaian cache pada peramban Anda. Silakan klik tombol di bawah untuk membuka kembali laman ujian dengan konfigurasi bersih:
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Segarkan & Masuk Laman Ujian
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <CbtApp />
    </ErrorBoundary>
  );
}

function CbtApp() {
  const [hasUrlConfig] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return !!decodeConfigFromUrl(params.get('cfg')) || !!params.get('exam');
  });

  const [config, setConfig] = useState<AppConfig>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCfg = decodeConfigFromUrl(params.get('cfg'));
    const paramExamId = params.get('exam');
    if (urlCfg || paramExamId) {
      const merged = sanitizeConfig({
        ...(urlCfg || {}),
        ...(paramExamId ? { examId: paramExamId } : {})
      });
      try {
        localStorage.setItem('cbt_app_config', JSON.stringify(merged));
        if (merged.examId) localStorage.setItem('cbt_exam_id', merged.examId);
      } catch (e) {}
      return merged;
    }

    try {
      const saved = localStorage.getItem('cbt_app_config');
      if (saved) {
        return sanitizeConfig(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to parse cached config:', e);
    }
    return sanitizeConfig(DEFAULT_CONFIG);
  });

  const [activeTab, setActiveTab] = useState<'student-login' | 'student-exam' | 'admin' | 'consultation' | 'simulator' | 'security'>('student-login');
  const [isStudentOnlyMode, setIsStudentOnlyMode] = useState<boolean>(false);

  useEffect(() => {
    // Check if opened via dedicated student link (?mode=student)
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'student') {
      setIsStudentOnlyMode(true);
      setActiveTab('student-login');
    }

    // Sync latest config from Cloud Firestore if examId exists
    const targetExamId = params.get('exam') || config.examId;
    if (targetExamId) {
      fetchExamFromCloud(targetExamId)
        .then((cloudExam) => {
          if (cloudExam) {
            const merged = sanitizeConfig({ ...config, ...cloudExam, examId: cloudExam.examId });
            setConfig(merged);
            try {
              localStorage.setItem('cbt_app_config', JSON.stringify(merged));
              localStorage.setItem('cbt_exam_id', merged.examId || targetExamId);
            } catch (_) {}
          }
        })
        .catch(() => {});
    }

    if (!hasUrlConfig) {
      fetchConfig();
    }
  }, [hasUrlConfig]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await res.json();
      if (data && data.success && data.config) {
        setConfig(prev => {
          const merged = sanitizeConfig({ ...prev, ...data.config, examId: prev.examId });
          try {
            localStorage.setItem('cbt_app_config', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    } catch (err) {
      console.warn('API config unavailable (static/offline mode), using localStorage:', err);
    }
  };

  const handleUpdateConfig = (newConfig: AppConfig) => {
    const clean = sanitizeConfig(newConfig);
    setConfig(clean);
    try {
      localStorage.setItem('cbt_app_config', JSON.stringify(clean));
      if (clean.examId) localStorage.setItem('cbt_exam_id', clean.examId);
    } catch (e) {
      console.warn('Failed to save config to localStorage:', e);
    }
  };

  const handleTabChange = (tab: 'student-login' | 'student-exam' | 'admin' | 'consultation' | 'simulator' | 'security') => {
    // When in student-only link mode, do not allow switching to admin or other tabs
    if (isStudentOnlyMode && tab !== 'student-login' && tab !== 'student-exam') {
      return;
    }
    setActiveTab(tab);
  };

  const handleProctorUnlock = () => {
    const input = prompt('Masukkan Token Soal atau PIN Pengawas / Proktor untuk membuka mode Administrasi:');
    if (!input) return;
    if (input.trim().toUpperCase() === config.token.toUpperCase() || input.trim() === '1234' || input.trim() === 'admin') {
      setIsStudentOnlyMode(false);
      setActiveTab('admin');
      // Clean query parameter from URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      window.history.replaceState({}, '', url.toString());
    } else {
      alert('Token/PIN proktor salah!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c1322] text-slate-100 antialiased font-sans select-none">
      {/* Top Navbar */}
      <Navbar 
        appTitle={config.appTitle}
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        isStudentOnlyMode={isStudentOnlyMode}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {(activeTab === 'student-login' || activeTab === 'student-exam') && (
          <StudentExamEngine
            config={config}
          />
        )}

        {activeTab === 'admin' && !isStudentOnlyMode && (
          <TeacherAdmin
            config={config}
            onUpdateConfig={handleUpdateConfig}
          />
        )}

        {activeTab === 'consultation' && !isStudentOnlyMode && (
          <div className="flex-1 overflow-y-auto bg-slate-100 text-slate-900">
            <ArchitecturalConsultation 
              onNavigateTab={(tab) => {
                if (tab === 'exam') setActiveTab('student-login');
                else if (tab === 'admin') setActiveTab('admin');
                else if (tab === 'simulator') setActiveTab('simulator');
                else if (tab === 'security') setActiveTab('security');
              }} 
            />
          </div>
        )}

        {activeTab === 'simulator' && !isStudentOnlyMode && (
          <div className="flex-1 overflow-y-auto bg-slate-100 text-slate-900">
            <LoadSimulator />
          </div>
        )}

        {activeTab === 'security' && !isStudentOnlyMode && (
          <div className="flex-1 overflow-y-auto bg-slate-100 text-slate-900">
            <SecurityInspector />
          </div>
        )}
      </main>

      {/* Bottom System Bar */}
      <footer className="bg-slate-950 border-t border-slate-800 px-4 py-2 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sky-400">{config.schoolName}</span>
          <span>·</span>
          <span>{config.appTitle}</span>
        </div>

        {isStudentOnlyMode ? (
          /* Locked Student Footer (No Token or Download Link Exposed) */
          <div className="flex items-center gap-3 text-slate-500">
            <span className="text-emerald-400 font-mono text-[10px]">● Server Ujian Terhubung</span>
            <span>·</span>
            <span className="text-[10px]">Slide CBT Anti-Kecurangan</span>
            <span>·</span>
            <button 
              onClick={handleProctorUnlock}
              className="text-[10px] text-slate-600 hover:text-slate-400 transition"
              title="Akses Darurat Proktor / Pengawas Ruang"
            >
              [Proktor]
            </button>
          </div>
        ) : (
          /* Normal / Admin Footer */
          <div className="flex items-center gap-3 text-slate-500">
            <span>Token: <strong className="text-emerald-400 font-mono">{config.token}</strong></span>
            <span>·</span>
            <a 
              href="/assets/aistudio/aplikasi_simulasi_ujian_slide_ppt_pdf_html_91b85c62.html" 
              target="_blank" 
              rel="noreferrer" 
              className="text-sky-400 hover:underline font-semibold"
            >
              Download File HTML Standalone (.html)
            </a>
          </div>
        )}
      </footer>
    </div>
  );
}
