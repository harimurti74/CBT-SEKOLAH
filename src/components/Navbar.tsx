import React from 'react';
import { FileText, GraduationCap, Shield, Activity, Lock } from 'lucide-react';

interface NavbarProps {
  appTitle: string;
  activeTab: 'student-login' | 'student-exam' | 'admin' | 'consultation' | 'simulator' | 'security';
  setActiveTab: (tab: 'student-login' | 'student-exam' | 'admin' | 'consultation' | 'simulator' | 'security') => void;
  isStudentOnlyMode?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ appTitle, activeTab, setActiveTab, isStudentOnlyMode }) => {
  const isStudentMode = activeTab === 'student-login' || activeTab === 'student-exam';

  return (
    <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-slate-900 z-30 shadow-xs shrink-0 gap-3">
      {/* Brand & Subtitle */}
      <div
        onClick={() => {
          if (!isStudentOnlyMode) setActiveTab('student-login');
        }}
        className={`flex items-center gap-3 min-w-0 ${isStudentOnlyMode ? 'cursor-default' : 'cursor-pointer group'}`}
      >
        <div className="bg-gradient-to-br from-sky-500 to-indigo-600 text-white p-2 rounded-xl font-bold flex items-center justify-center w-9 h-9 shadow-sm shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-xs sm:text-sm md:text-base leading-tight tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors uppercase truncate">
            {appTitle || 'SIMULASI UJIAN CBT SLIDE'}
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
            Portal Tes Berbasis Komputer (TKA) · Interaktif &amp; Anti-Kecurangan
          </p>
        </div>
      </div>

      {/* Mode Indicator & Navigation Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {isStudentOnlyMode ? (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-emerald-700 text-xs font-bold whitespace-nowrap shrink-0">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Laman Khusus Siswa</span>
          </div>
        ) : (
          <>
            <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-medium whitespace-nowrap shrink-0">
              <span>Mode:</span>
              <span className="text-sky-700 font-bold">
                {isStudentMode ? 'Laman Siswa' : activeTab === 'admin' ? 'Administrasi Guru' : 'Uji Beban'}
              </span>
            </span>

            <button
              onClick={() => setActiveTab('student-login')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                isStudentMode
                  ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Laman Siswa</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Administrasi Guru</span>
            </button>

            <div className="hidden md:flex items-center pl-2 border-l border-slate-200 shrink-0">
              <button
                onClick={() => setActiveTab('simulator')}
                className={`p-1.5 rounded-xl text-xs transition border ${
                  activeTab === 'simulator'
                    ? 'bg-sky-50 text-sky-700 border-sky-300'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent'
                }`}
                title="Uji Beban 1.650 Siswa"
              >
                <Activity className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
