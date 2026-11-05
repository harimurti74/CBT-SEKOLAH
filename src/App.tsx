import React, { useState, useEffect } from 'react';
import { AppConfig } from './types';
import { Navbar } from './components/Navbar';
import { StudentExamEngine } from './components/StudentExamEngine';
import { TeacherAdmin } from './components/TeacherAdmin';
import { ArchitecturalConsultation } from './components/ArchitecturalConsultation';
import { LoadSimulator } from './components/LoadSimulator';
import { SecurityInspector } from './components/SecurityInspector';

const DEFAULT_CONFIG: AppConfig = {
  appTitle: 'SIMULASI UJIAN CBT SLIDE',
  schoolName: 'SMA Negeri 1 Teladan',
  token: 'CBT2026',
  gdriveUrl: 'https://drive.google.com/drive/folders/1SMA_Teladan_CBT_Archive',
  mapels: ['Bahasa Inggris', 'Biologi', 'Fisika', 'Matematika', 'Kimia'],
  kelas: ['X-1', 'X-2', 'XI-IPA-1', 'XI-IPA-2', 'XII-MIPA'],
  durationMinutes: 90,
  maxViolations: 3,
  shuffleQuestions: true
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'student-login' | 'student-exam' | 'admin' | 'consultation' | 'simulator' | 'security'>('student-login');
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const handleUpdateConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c1322] text-slate-100 antialiased font-sans select-none">
      {/* Top Navbar matching screenshot */}
      <Navbar 
        appTitle={config.appTitle}
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {(activeTab === 'student-login' || activeTab === 'student-exam') && (
          <StudentExamEngine
            config={config}
          />
        )}

        {activeTab === 'admin' && (
          <TeacherAdmin
            config={config}
            onUpdateConfig={handleUpdateConfig}
          />
        )}

        {activeTab === 'consultation' && (
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

        {activeTab === 'simulator' && (
          <div className="flex-1 overflow-y-auto bg-slate-100 text-slate-900">
            <LoadSimulator />
          </div>
        )}

        {activeTab === 'security' && (
          <div className="flex-1 overflow-y-auto bg-slate-100 text-slate-900">
            <SecurityInspector />
          </div>
        )}
      </main>

      {/* Clean Bottom System Bar */}
      <footer className="bg-slate-950 border-t border-slate-800 px-4 py-2 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sky-400">{config.schoolName}</span>
          <span>·</span>
          <span>{config.appTitle}</span>
        </div>
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
      </footer>
    </div>
  );
}
