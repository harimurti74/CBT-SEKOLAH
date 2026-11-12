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
    <header className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-white z-30 shadow-md shrink-0">
      {/* Brand & Subtitle matching the screenshot */}
      <div 
        onClick={() => {
          if (!isStudentOnlyMode) setActiveTab('student-login');
        }}
        className={`flex items-center gap-3 ${isStudentOnlyMode ? 'cursor-default' : 'cursor-pointer group'}`}
      >
        <div className="bg-sky-500 text-slate-950 p-2 rounded-lg font-bold text-lg flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 shadow-inner">
          <FileText className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <h1 className="font-extrabold text-xs sm:text-base leading-tight tracking-wide text-sky-400 group-hover:text-sky-300 transition-colors uppercase">
            {appTitle || 'SIMULASI UJIAN CBT SLIDE'}
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
            Sistem Ujian Slide Interaktif & Multi-Tipe Soal + Anti-Cheating
          </p>
        </div>
      </div>

      {/* Mode Indicator & Navigation Buttons */}
      <div className="flex items-center gap-2">
        {isStudentOnlyMode ? (
          /* Dedicated Locked Student Mode View (No Admin access possible for students) */
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-600/50 px-3 py-1.5 rounded-lg text-emerald-300 text-xs font-semibold shadow-inner">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Laman Ujian Khusus Siswa</span>
          </div>
        ) : (
          /* Admin / Proktor Navigation */
          <>
            {/* Mode Label */}
            <span className="hidden lg:inline-block text-[11px] px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-slate-300 font-mono">
              Mode:{' '}
              <span className="text-emerald-400 font-semibold">
                {isStudentMode ? 'Laman Siswa' : activeTab === 'admin' ? 'Administrasi Guru' : 'Uji Beban'}
              </span>
            </span>

            {/* Laman Siswa Button */}
            <button
              onClick={() => setActiveTab('student-login')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow ${
                isStudentMode
                  ? 'bg-sky-600 text-white ring-2 ring-sky-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Laman Siswa</span>
            </button>

            {/* Administrasi Guru Button */}
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Administrasi Guru</span>
            </button>

            {/* Middle Icon Only: Uji Beban 1.650 Siswa (Circled BookOpen & Terminal icons removed per user request) */}
            <div className="hidden md:flex items-center pl-2 border-l border-slate-800">
              <button
                onClick={() => setActiveTab('simulator')}
                className={`p-1.5 rounded-lg text-xs transition border ${
                  activeTab === 'simulator'
                    ? 'bg-slate-800 text-sky-400 border-sky-500'
                    : 'text-slate-400 hover:text-white border-transparent'
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
