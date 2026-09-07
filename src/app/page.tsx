'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase' // Diperbarui dari './lib/supabase' ke '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderKanban, Calculator, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react'

// Sisa kode komponen landing page / dashboard tetap sama...

interface Project {
  id: string
  name: string
  start_date: string
  end_date: string
}

export default function LandingOrDashboard() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Data ringkasan jika sudah login
  const [projectsCount, setProjectsCount] = useState(0)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [totalRabGlobal, setTotalRabGlobal] = useState(0)
  const [totalActualGlobal, setTotalActualGlobal] = useState(0)

  useEffect(() => {
    async function checkUserAndFetch() {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      if (session) {
        // Jika sudah login, ambil data dashboard
        const { data: projData } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })

        if (projData) {
          setProjectsCount(projData.length)
          setRecentProjects(projData.slice(0, 5))
        }

        const { data: rabData } = await supabase.from('rab_items').select('total_cost')
        const { data: expData } = await supabase.from('actual_expenses').select('amount')

        const rabSum = rabData?.reduce((acc: number, curr: { total_cost: number | null }) => acc + (curr.total_cost || 0), 0) || 0
        const expSum = expData?.reduce((acc: number, curr: { amount: number | null }) => acc + (curr.amount || 0), 0) || 0

        setTotalRabGlobal(rabSum)
        setTotalActualGlobal(expSum)
      }
      setLoading(false)
    }

    checkUserAndFetch()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono text-xs">
        Memuat WiraDana...
      </div>
    )
  }

  // JIKA PENGGUNA BELUM LOGIN: Tampilkan Landing Page Profesional
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
        {/* Navbar Landing Page */}
        <nav className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-900">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 w-3 h-3 rounded-full inline-block"></span>
            <span className="text-xl font-extrabold tracking-wider text-white">WiraDana</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 transition"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-lg shadow-emerald-950/50"
            >
              Daftar Gratis
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-medium">
            <Sparkles size={14} />
            <span>Aplikasi Kontrol Keuangan Proyek & RAB Berbasis Web</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Kontrol RAB & Keuangan Proyek Lewat Laptop, <span className="text-emerald-400">100% Gratis Tanpa Ribet.</span>
          </h1>

          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Sering pusing karena proyek konstruksi atau instalasi mendadak overbudget akibat pencatatan RAB dan pengeluaran manual yang berantakan? WiraDana hadir untuk mengamankan anggaran Anda secara real-time.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-8 py-3.5 rounded-xl text-sm transition shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2"
            >
              <span>Mulai Kelola Proyek Sekarang</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold px-6 py-3.5 rounded-xl text-sm transition"
            >
              Sudah punya akun? Masuk
            </Link>
          </div>

          <div className="text-[11px] text-slate-500 font-mono pt-2">
            💡 Dirancang optimal untuk kenyamanan layar Laptop / PC (Desktop-First).
          </div>
        </section>

        {/* Fitur Unggulan (Value Proposition) */}
        <section className="max-w-5xl mx-auto px-6 py-16 border-t border-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <FolderKanban size={20} />
              </div>
              <h2 className="text-base font-bold text-white">Manajemen RAB Terstruktur</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Buat daftar rincian anggaran biaya (RAB), volume, satuan, dan harga satuan secara rapi untuk setiap proyek Anda.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
                <Calculator size={20} />
              </div>
              <h2 className="text-base font-bold text-white">Budget vs Actual (BVA)</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Catat pengeluaran lapangan secara harian dan pantau selisih anggaran secara otomatis untuk mendeteksi potensi kerugian lebih awal.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
                <ShieldCheck size={20} />
              </div>
              <h2 className="text-base font-bold text-white">100% Gratis Untuk Komunitas</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Didedikasikan sepenuhnya sebagai bentuk kontribusi sosial bagi para pengelola proyek independen tanpa biaya langganan.
              </p>
            </div>
          </div>
        </section>

        {/* Footer Landing Page */}
        <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-slate-900 text-center text-xs text-slate-500">
          <p>© 2026 WiraDana. Dibangun dengan pendekatan #BuildInPublic untuk kemandirian pengelola proyek.</p>
        </footer>
      </div>
    )
  }

  // JIKA PENGGUNA SUDAH LOGIN: Tampilkan Dashboard Eksekutif Utama (Seperti yang kita buat sebelumnya)
  const globalVariance = totalRabGlobal - totalActualGlobal

  return (
    <div className="w-full">
      <main className="max-w-5xl mx-auto">
        <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span className="bg-emerald-500 w-3 h-3 rounded-full inline-block"></span>
              WiraDana Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">Ringkasan kesehatan finansial dan portofolio proyek secara real-time.</p>
          </div>
          <Link
            href="/projects"
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-950/50"
          >
            + Kelola / Buat Proyek
          </Link>
        </header>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-6 rounded-2xl shadow-xl">
              <span className="text-xs text-slate-400 block uppercase tracking-wider mb-2">Total Proyek Aktif</span>
              <span className="text-3xl font-extrabold text-white font-mono">{projectsCount}</span>
              <span className="text-[11px] text-slate-500 block mt-2">Portofolio dalam pengawasan</span>
            </div>
            
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-6 rounded-2xl shadow-xl">
              <span className="text-xs text-slate-400 block uppercase tracking-wider mb-2">Akumulasi RAB Global</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                Rp {totalRabGlobal.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] text-slate-500 block mt-2">Total rencana anggaran</span>
            </div>

            <div className={`bg-slate-900/80 backdrop-blur border p-6 rounded-2xl shadow-xl ${globalVariance >= 0 ? 'border-slate-800' : 'border-red-500/50 bg-red-950/10'}`}>
              <span className="text-xs text-slate-400 block uppercase tracking-wider mb-2">Status Anggaran Makro</span>
              <span className={`text-2xl font-extrabold font-mono ${globalVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Rp {Math.abs(globalVariance).toLocaleString('id-ID')}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase inline-block mt-2 ${globalVariance >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                {globalVariance >= 0 ? 'Keseluruhan Aman (Sisa)' : 'Defisit Global (Overbudget)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl shadow-xl">
              <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                <h2 className="text-base font-semibold text-slate-200">Proyek Terbaru</h2>
                <Link href="/projects" className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium">
                  Lihat Semua &rarr;
                </Link>
              </div>

              {recentProjects.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Belum ada proyek. Silakan buat melalui menu Proyek & RAB.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((p) => (
                    <Link 
                      key={p.id} 
                      href={`/projects/${p.id}`}
                      className="block bg-slate-950/50 hover:bg-slate-800/50 border border-slate-800/60 p-4 rounded-xl transition group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition">{p.name}</span>
                        <span className="text-xs text-slate-500 font-mono">&rarr;</span>
                      </div>
                      <div className="flex gap-4 text-[11px] text-slate-400 font-mono mt-1">
                        <span>Mulai: {p.start_date || '-'}</span>
                        <span>Selesai: {p.end_date || '-'}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
              <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-3">Pintasan Menu</h2>
              
              <div className="space-y-2.5">
                <Link href="/projects" className="block p-3 rounded-xl bg-slate-950/60 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-800/50 transition text-xs font-medium text-slate-200">
                  📂 <strong className="text-white ml-1">Proyek & RAB</strong>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Buat proyek baru & atur rincian RAB</span>
                </Link>
                <Link href="/bva" className="block p-3 rounded-xl bg-slate-950/60 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-800/50 transition text-xs font-medium text-slate-200">
                  📊 <strong className="text-white ml-1">Kalkulator / BVA</strong>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Analisis selisih anggaran riil</span>
                </Link>
                <Link href="/reports" className="block p-3 rounded-xl bg-slate-950/60 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-800/50 transition text-xs font-medium text-slate-200">
                  📈 <strong className="text-white ml-1">Laporan & Cash Flow</strong>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Rekapitulasi keuangan makro</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}