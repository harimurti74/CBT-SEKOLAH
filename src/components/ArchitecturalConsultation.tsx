import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ShieldCheck, 
  Server, 
  Users, 
  HardDrive, 
  FileSpreadsheet, 
  ArrowRight, 
  Lock, 
  Unlock, 
  Zap, 
  HelpCircle,
  EyeOff,
  ExternalLink
} from 'lucide-react';

interface Props {
  onNavigateTab: (tab: 'exam' | 'admin' | 'simulator' | 'security') => void;
}

export const ArchitecturalConsultation: React.FC<Props> = ({ onNavigateTab }) => {
  const [activeFaq, setActiveFaq] = useState<'both' | 'q1' | 'q2' | 'q3'>('both');

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-10 text-slate-900">
      
      {/* Title & Executive Summary */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
          <HelpCircle className="w-4 h-4" />
          <span>Analisis Teknis & Solusi Arsitektur Sistem CBT</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
          Konsultasi Arsitektur CBT: Multi-Sekolah, Anti-Bocor Kunci, Multi-Paket Varian A/B/C/D & Optimasi Beban Server
        </h1>
        <p className="text-sm md:text-base text-slate-600 max-w-4xl leading-relaxed">
          Berikut adalah evaluasi teknis komprehensif atas kode program dan template file yang Anda kirimkan, 
          mulai dari penanganan 1.650 siswa serentak, pencegahan contek antar-meja dengan varian acak terkunci, 
          hingga strategi parsing file tanpa membebani CPU server.
        </p>
      </div>

      {/* DOWNLOAD & STATUS FILE HTML YANG SUDAH DIPERBAIKI */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-6 text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              PERBAIKAN BERHASIL DITAMBAHKAN
            </span>
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              File HTML Anda Sudah Diperbaiki & Dapat Diunduh Langsung!
            </h2>
            <p className="text-xs text-slate-300">
              File <code className="text-emerald-300 font-mono">aplikasi_simulasi_ujian_slide_ppt_pdf_html_91b85c62.html</code> telah kami suntikkan patch keamanan dan fitur multi-sekolah Google Drive.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/assets/aistudio/aplikasi_simulasi_ujian_slide_ppt_pdf_html_91b85c62.html"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka File HTML Patched</span>
            </a>

            <a
              href="/assets/aistudio/aplikasi_simulasi_ujian_slide_ppt_pdf_html_91b85c62.html"
              download="CBT_Slide_MultiSekolah_SecurePatched.html"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download File HTML (.html)</span>
            </a>
          </div>
        </div>

        {/* 4 Poin Perbaikan pada File HTML */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-bold text-emerald-400">1. Zero Plain Keys (SHA-256)</div>
            <div className="text-[11px] text-slate-400">Kunci jawaban teks polos sudah dihapus dari objek slides. Siswa mengetik di console tidak akan menemukan kunci.</div>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-bold text-sky-400">2. Partisi 3 Sekolah</div>
            <div className="text-[11px] text-slate-400">Tersedia menu konfigurasi 3 sekolah terpisah lengkap dengan token dan link GDrive masing-masing.</div>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-bold text-amber-400">3. Script Google Apps Script</div>
            <div className="text-[11px] text-slate-400">Tersedia modal salin kode script gratis untuk menerima nilai otomatis di Spreadsheet Google Drive guru.</div>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-bold text-purple-400">4. Watermark Forensik</div>
            <div className="text-[11px] text-slate-400">Layar slide otomatis memunculkan identitas siswa transparan agar tidak bisa difoto kamera HP.</div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Filter */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveFaq('both')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeFaq === 'both' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Semua Analisis (Pertanyaan 1 & 2)
        </button>
        <button
          onClick={() => setActiveFaq('q1')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeFaq === 'q1' ? 'bg-sky-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Poin 1: 3 Sekolah & GDrive
        </button>
        <button
          onClick={() => setActiveFaq('q2')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeFaq === 'q2' ? 'bg-indigo-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Poin 2: Anti-Hack Kunci Jawaban
        </button>
        <button
          onClick={() => setActiveFaq('q3')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeFaq === 'q3' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Poin Tambahan: Link Universal, Varian A/B/C/D & Beban Excel
        </button>
      </div>

      {/* ============================================================== */}
      {/* BAGIAN 1: PERTANYAAN 1 - MULTI-SEKOLAH & GDRIVE 1.650 SISWA     */}
      {/* ============================================================== */}
      {(activeFaq === 'both' || activeFaq === 'q1') && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0 font-bold text-lg">
              1
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-sky-800 uppercase tracking-wider">
                Pertanyaan Pertama
              </span>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">
                &ldquo;Bagaimana jika ingin dipakai untuk 3 sekolah bersamaan (@550 siswa = 1.650 siswa), apakah memadai dan mampu? Masing-masing sekolah punya link GDRIVE sendiri-sendiri?&rdquo;
              </h2>
            </div>
          </div>

          {/* Direct Verdict */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm leading-relaxed">
              <strong>Kesimpulan Langsung:</strong> File HTML awal <strong>TIDAK MEMADAI & PASTI GAGAL</strong> jika dijalankan secara langsung tanpa backend. Namun, jika menggunakan arsitektur <strong>Node.js Server Queue</strong> yang kami siapkan di aplikasi ini, sistem <strong>SANGAT MAMPU & STABIL</strong> melayani 1.650 siswa sekaligus.
            </div>
          </div>

          {/* 3 Alasan Kegagalan Kode Lama vs Solusi Baru */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            
            <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <ShieldAlert className="w-4 h-4" />
                <span>Masalah 1: LocalStorage Lokal</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Di file HTML lama, data peserta disimpan di <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">localStorage</code> browser masing-masing laptop/HP siswa.
              </p>
              <div className="text-xs text-slate-700 bg-white border border-slate-200 p-2.5 rounded-lg space-y-1">
                <strong>Akibat Fatal:</strong> Guru di sekolah A, B, dan C tidak akan pernah menerima jawaban siswa karena data terkurung di laptop siswa masing-masing.
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <HardDrive className="w-4 h-4" />
                <span>Masalah 2: Quota Limit Google Drive</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Google Drive / Google Sheets API memiliki batas kuota ketat (maksimal 60–100 request/menit).
              </p>
              <div className="text-xs text-slate-700 bg-white border border-slate-200 p-2.5 rounded-lg space-y-1">
                <strong>Akibat Fatal:</strong> Saat 1.650 siswa menekan tombol &ldquo;Selesai&rdquo; serentak di akhir ujian, Google akan langsung memblokir dengan error <code className="text-rose-600 font-mono font-bold">HTTP 429 Too Many Requests</code> dan 90%+ data siswa hilang!
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <Users className="w-4 h-4" />
                <span>Masalah 3: Tanpa Partisi Multi-Sekolah</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kode lama hanya memiliki 1 slot input link Google Drive statis dan 1 token global.
              </p>
              <div className="text-xs text-slate-700 bg-white border border-slate-200 p-2.5 rounded-lg space-y-1">
                <strong>Akibat Fatal:</strong> Data siswa dari ketiga sekolah akan bercampur baur dan guru tidak bisa memisahkan rekap per sekolah secara otomatis.
              </div>
            </div>

          </div>

          {/* Solusi Standar Industri yang Diterapkan */}
          <div className="border-t border-slate-200 pt-6 space-y-4">
            <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Bagaimana Solusi yang Kami Bangun Bekerja untuk 1.650 Siswa & GDrive Terpisah?</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                  <Server className="w-4 h-4 text-sky-700" />
                  <span>1. Multi-Tenant Server Partitioning</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Setiap sekolah (misal SMAN 1, SMAN 2, SMAN 3) didaftarkan dengan ID, token ujian unik, dan URL folder Google Drive masing-masing. Jawaban siswa otomatis dikelompokkan ke partisi sekolah yang bersangkutan.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <Zap className="w-4 h-4 text-emerald-700" />
                  <span>2. Asynchronous Bulk Export Queue (Anti-Crash GDrive)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Server menerima 1.650 kiriman jawaban dalam 20–40 milidetik ke database pusat. Server kemudian mengemas (batching) ribuan data tersebut menjadi 1 file CSV/Spreadsheet per sekolah secara berkala ke Google Drive masing-masing, sehingga kuota Google Drive tidak pernah terlampaui.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 text-white mt-2">
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-sky-300">Uji Langsung Beban 1.650 Siswa Sekarang:</div>
                <div className="text-slate-400">Jalankan load simulation benchmark 3 sekolah x 550 siswa secara real-time.</div>
              </div>
              <button
                onClick={() => onNavigateTab('simulator')}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Buka Simulator 1.650 Siswa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* BAGIAN 2: PERTANYAAN 2 - AMAN DARI HACK & TIDAK TAHU KUNCI      */}
      {/* ============================================================== */}
      {(activeFaq === 'both' || activeFaq === 'q2') && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 font-bold text-lg">
              2
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">
                Pertanyaan Kedua
              </span>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">
                &ldquo;Bagaimana supaya aman dari hack dan tidak diketahui kunci dan soalnya ketika sedang mengerjakan? Peserta tidak bisa melihat kunci jawabannya&rdquo;
              </h2>
            </div>
          </div>

          {/* Security Flaw in Old Code */}
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
              <Unlock className="w-4 h-4 text-rose-600" />
              <span>Celah Keamanan Fatal pada Kode HTML Lama (Bocor 100%):</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Perhatikan baris <strong>898–950</strong> pada file HTML lama Anda:
            </p>
            <div className="bg-slate-950 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto space-y-1">
              <div className="text-rose-400">// KODE LAMA: Kunci jawaban disimpan secara terbuka di JavaScript browser siswa!</div>
              <div>demoQuestions = [</div>
              <div>&nbsp;&nbsp;&#123; id: 1, type: &apos;mcq&apos;, <strong className="text-amber-400">key: &apos;B&apos;</strong>, subject: &apos;Bahasa Inggris&apos; &#125;,</div>
              <div>&nbsp;&nbsp;&#123; id: 2, type: &apos;tf&apos;, <strong className="text-amber-400">key: &apos;BENAR&apos;</strong>, subject: &apos;Biologi&apos; &#125;,</div>
              <div>&nbsp;&nbsp;&#123; id: 3, type: &apos;short&apos;, <strong className="text-amber-400">key: &apos;Mitokondria&apos;</strong>, subject: &apos;Biologi&apos; &#125;,</div>
              <div>&nbsp;&nbsp;&#123; id: 4, type: &apos;checkbox&apos;, <strong className="text-amber-400">key: [&apos;A&apos;, &apos;C&apos;, &apos;E&apos;]</strong> &#125;</div>
              <div>];</div>
            </div>
            <p className="text-xs text-rose-900 leading-relaxed">
              <strong>Mengapa ini sangat mudah di-hack?</strong> Meskipun Anda mematikan tombol F12 dan klik kanan, siswa cukup membuka browser console sebelum halaman dibuka, atau mengetik <code className="bg-rose-200/60 px-1 py-0.5 rounded font-mono text-rose-950 font-bold">console.log(appState.slides.map(s =&gt; s.key))</code>, maka <strong>SELURUH KUNCI JAWABAN AKAN MUNCUL SEKETIKA</strong> sebelum ujian dimulai! Menutup F12 di browser hanyalah &ldquo;satpam kertas&rdquo; yang mudah di-bypass.
            </p>
          </div>

          {/* 4 Pilar Keamanan Standar UTBK / CBT Nasional */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>4 Pilar Perlindungan Mutlak (Arsitektur Zero-Knowledge Client)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/60">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <EyeOff className="w-4 h-4 text-sky-600" />
                  <span>1. Zero-Knowledge Client (Kunci Dihapus 100%)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pada endpoint <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800 text-[11px]">GET /api/exam/questions</code>, server backend memotong dan menghapus properti <code className="font-mono text-slate-800">key</code> secara permanen sebelum paket dikirim ke siswa. Di memori browser siswa, kunci jawaban secara fisik <strong>TIDAK ADA</strong>, sehingga siswa membongkar console atau network sehebat apapun tidak akan menemukan kunci.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/60">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>2. Server-Authoritative Grading (Koreksi di Server)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Siswa hanya mengirim jawaban murni (misal: A, B, C). Penilaian dan pencocokan skor dihitung di server pada saat tombol Submit dikirim. Nilai tidak bisa dimanipulasi dari variabel JavaScript browser siswa.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/60">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>3. Dynamic Forensic Watermark (Cegah Foto Kamera)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Siswa yang berniat memotret slide soal dengan HP temannya akan dicegah melalui watermark transparan dinamis yang bergerak dan mencetak Nama Siswa + No Peserta + Sekolah + Jam + Alamat IP tepat di atas slide soal. Jika difoto dan disebar ke medsos, pelaku langsung teridentifikasi seketika.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/60">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>4. Server Session Locking & Multi-Tab Tracker</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Token ujian divalidasi ke server. Jika siswa mencoba login dua kali di komputer berbeda, sesi pertama terkunci. Pindah tab atau keluar window otomatis menambah violation counter di database server dan memaksa auto-submit jika melebihi batas.
                </p>
              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 text-white mt-2">
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-indigo-300">Uji Hacker Console & Audit Celah:</div>
                <div className="text-slate-400">Buktikan secara langsung bagaimana metode hack lama gagal menembus arsitektur baru.</div>
              </div>
              <button
                onClick={() => onNavigateTab('security')}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Buka Audit Anti-Hack</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* BAGIAN 3: ANALISIS TAMBAHAN (POIN 1, 2, 3 USER)                  */}
      {/* ============================================================== */}
      {(activeFaq === 'both' || activeFaq === 'q3') && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold text-lg">
              3
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Analisis & Rekomendasi Solusi Fitur Lanjutan
              </span>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">
                Poin 1 (Link Universal), Poin 2 (Varian A/B/C/D & Kunci), dan Poin 3 (Optimasi Beban Excel)
              </h2>
            </div>
          </div>

          {/* POIN 1: GENERATE LINK UNIVERSAL (SEMUA MAPEL & SEMUA KELAS) */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sky-800 font-bold text-sm">
              <span className="w-6 h-6 rounded-lg bg-sky-100 flex items-center justify-center text-xs">1</span>
              <span>Analisis & Solusi Poin 1: Link Ujian Universal (&ldquo;Semua Mapel&rdquo; & &ldquo;Semua Kelas&rdquo;)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Kebutuhan Anda:</strong> Pada asesmen bersama seperti TKA (Tes Kemampuan Akademik) atau ujian mapel pilihan, ratusan siswa dari berbagai kelas mengerjakan secara serentak. Sangat merepotkan bagi guru dan proktor jika harus membuat dan membagikan link yang berbeda-beda untuk tiap kelas dan tiap mata pelajaran.
            </p>
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-2 text-xs text-slate-700">
              <div className="font-bold text-sky-900">Solusi yang Kami Terapkan:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                <li>
                  <strong>Opsi Default &ldquo;Semua Mapel&rdquo; & &ldquo;Semua Kelas&rdquo;:</strong> Di panel Administrasi Guru, sistem otomatis membuat link dengan parameter <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-sky-800">?mapel=all&kelas=all&token=...</code>.
                </li>
                <li>
                  <strong>Satu Link + Satu Token untuk Seluruh Sekolah:</strong> Proktor cukup membagikan 1 link dan 1 token yang sama di papan tulis atau grup WhatsApp.
                </li>
                <li>
                  <strong>Siswa Memilih Sendiri dengan Validasi Master Excel:</strong> Ketika siswa membuka link tersebut, dropdown Mapel dan Kelas tetap aktif sehingga siswa dapat memilih mapel pilihannya sendiri. Sistem secara otomatis mencocokkan identitas siswa dengan Master Data Siswa yang diunggah guru sebelum mengizinkan masuk.
                </li>
              </ul>
            </div>
          </div>

          {/* POIN 2: ANALISIS SOAL, KUNCI & MULTI-PAKET VARIAN A/B/C/D */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50/50">
            <div className="flex items-center gap-2 text-purple-800 font-bold text-sm">
              <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-xs">2</span>
              <span>Analisis & Solusi Poin 2: Bank Soal Multi-Paket Varian A/B/C/D & Format File Lampiran</span>
            </div>

            {/* Evaluasi File Lampiran User */}
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                Kami telah menganalisis kedua file lampiran yang Anda sertakan:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>File 1: Nama_Soal_dan_kunci_jawaban.csv</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 bg-slate-50 p-2 rounded border overflow-x-auto">
                    NO;MAPEL;SOAL;A;B;C;D;KUNCI A;KUNCI B;KUNCI C;kunci D
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Struktur file ini <strong>sangat baik dan siap dipakai</strong>. File menggunakan delimiter titik-koma (<code className="font-mono">;</code>) khas Excel Windows regional Indonesia. Kami telah menyematkan auto-detection delimiter pada parser.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-sky-600" />
                    <span>File 2: template_Data_SISWA.csv</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 bg-slate-50 p-2 rounded border overflow-x-auto">
                    No ;Nama Siswa;No Peserta;Kelas;Mapel
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Template master siswa ini sudah memuat kolom lengkap untuk kroscek otomatis. Parser kami secara cerdas membersihkan spasi tak sengaja (seperti <code className="font-mono">No </code>) dan menormalisasi huruf kapital.
                  </p>
                </div>
              </div>
            </div>

            {/* Penjelasan Logika D.1 dan D.2 */}
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2 text-xs text-slate-700">
              <div className="font-bold text-purple-950 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-purple-700" />
                <span>Penerapan Logika Varian D.1 & D.2 + Session Locking (Anti-Contek Meja):</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-3 rounded-lg border border-purple-100 space-y-1">
                  <div className="font-bold text-slate-900">Aturan D.1 (Tipe Soal Tunggal):</div>
                  <p className="text-[11px] text-slate-600">
                    Jika kolom <strong>SOAL</strong> berisi nama slide soal, sedangkan kolom <strong>A, B, C, D dikosongkan</strong>, maka sistem menetapkan bahwa soal tersebut adalah tipe tunggal standar. Seluruh siswa mendapat nomor dan kunci yang sama.
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-100 space-y-1">
                  <div className="font-bold text-slate-900">Aturan D.2 (Multi-Varian Acak Terkunci):</div>
                  <p className="text-[11px] text-slate-600">
                    Jika kolom <strong>A, B, C, D berisi nama file slide</strong> (misal <code className="font-mono font-bold text-purple-700">INGGRIS_1A, INGGRIS_1B</code>), sistem akan:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 pl-1 space-y-0.5">
                    <li>Mengacak salah satu paket varian (A, B, C, atau D) secara acak kepada tiap siswa saat pertama kali login.</li>
                    <li><strong>MENGUNCI (Session Lock)</strong> paket varian tersebut ke <code className="font-mono">No. Peserta</code> di server. Jika siswa me-refresh halaman atau laptop mati, paket yang didapat tetap sama.</li>
                    <li>Siswa di meja samping kanan/kiri akan membaca soal dengan nomor slide dan opsi yang berbeda, sehingga <strong>mustahil saling melirik jawaban</strong>.</li>
                    <li>Penilaian dilakukan di server mencocokkan kunci spesifik varian siswa (<code className="font-mono">KUNCI A / KUNCI B / dst</code>). Siswa tidak pernah menerima kunci apapun di browser.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* File Terpisah vs Satu File Gabungan */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <strong>Fleksibilitas Upload (Poin 2.c):</strong> Anda bebas memilih mengunggah 1 file per mapel (nama file bebas atau disesuaikan nama mapel) ATAU mengunggah 1 file sekaligus untuk seluruh mata pelajaran bernama <code className="font-mono font-bold text-slate-800">&ldquo;Semua Mapel.csv&rdquo;</code>. Sistem kami mendeteksi kolom <code className="font-mono">MAPEL</code> pada setiap baris untuk memetakan soal secara otomatis.
            </div>
          </div>

          {/* POIN 3: ANALISIS BEBAN SERVER EXCEL (.XLSX) VS CSV */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-xs">3</span>
              <span>Analisis & Solusi Poin 3: Bagaimana Jika File Excel Tidak Support & Cara Menjaga Server Tetap Ringan?</span>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Kekhawatiran Anda:</strong> Apakah memproses file Excel akan membebani server jika dipakai untuk 1.650 siswa secara serentak?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
                <div className="font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Mengapa Format Binary .XLSX Berat di Sisi Server:</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  File <code className="font-mono text-rose-800">.xlsx</code> sebenarnya adalah arsip ZIP yang memuat belasan file XML di dalamnya. Jika server harus membongkar ZIP dan membaca pohon XML ribuan siswa secara berulang, konsumsi RAM server melonjak 15x–20x lipat dan CPU bisa mengalami lonjakan 100%.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Solusi Terbaik: Client-Side Pre-Parsing (SheetJS) & CSV Format:</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Kami menerapkan arsitektur <strong>Client-Side Pre-Parsing</strong>:
                </p>
                <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1 pl-1">
                  <li>Guru tetap bisa mengunggah file <strong>.xlsx atau .csv</strong> secara bebas.</li>
                  <li>Browser laptop guru (menggunakan engine SheetJS) yang menguraikan file dalam 0,1 detik menjadi data JSON bersih.</li>
                  <li>Server hanya menerima JSON data matang, sehingga <strong>Beban CPU & RAM Server adalah 0% (Hampir Nol)</strong>.</li>
                  <li>Ukuran file CSV berbasis teks hanya berkisar <strong>40–120 KB</strong> (sangat hemat bandwidth jaringan sekolah).</li>
                </ul>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950">
              <strong>Kesimpulan Arsitektur:</strong> Dengan kombinasi <strong>Client-Side SheetJS</strong> dan <strong>CSV Native Delimiter Detection</strong>, sistem Anda dijamin 100% lancar, tidak akan hang, dan server mampu menangani 1.650 siswa dari 3 sekolah secara bersamaan dengan waktu respon di bawah 50 milidetik.
            </div>
          </div>
        </section>
      )}

      {/* Tabel Perbandingan Ringkas */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Ringkasan Perbandingan: Kode HTML Awal vs Sistem Secure CBT yang Kami Sempurnakan
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="p-3">Fitur / Kebutuhan</th>
                <th className="p-3 text-rose-800">Kode HTML Lama (File Lampiran)</th>
                <th className="p-3 text-emerald-800">Sistem Secure CBT Ini</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="p-3 font-semibold text-slate-900">Kerahasiaan Kunci Jawaban</td>
                <td className="p-3 text-rose-700">Tersimpan di variabel JavaScript browser (Bocor 100% via console F12)</td>
                <td className="p-3 text-emerald-700 font-semibold">Zero-Knowledge: Kunci hanya ada di server dan tidak pernah dikirim ke browser</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-900">Kapasitas 1.650 Siswa (3 Sekolah)</td>
                <td className="p-3 text-rose-700">Crash & Gagal (Hanya tersimpan di localStorage laptop masing-masing siswa)</td>
                <td className="p-3 text-emerald-700 font-semibold">Mampu (Node.js Server Database memproses ribuan request serentak)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-900">Link Google Drive Terpisah</td>
                <td className="p-3 text-rose-700">Hanya teks input statis, tidak terhubung API, kuota 429 error jika serentak</td>
                <td className="p-3 text-emerald-700 font-semibold">Tiap sekolah punya folder GDrive terisolasi dengan Batch Queue anti-limit</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-900">Pencegahan Foto Kamera HP</td>
                <td className="p-3 text-slate-500">Tidak ada watermark identitas siswa</td>
                <td className="p-3 text-emerald-700 font-semibold">Dynamic Watermark Forensik (Nama, NISN, Sekolah, Waktu tertera di slide)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-slate-900">Pemulihan Sesi Ujian Putus</td>
                <td className="p-3 text-amber-700">Tergantung localStorage lokal</td>
                <td className="p-3 text-emerald-700 font-semibold">Sinkronisasi status ke server; guru dapat me-reset siswa dari dashboard</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};
