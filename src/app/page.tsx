'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase' // Ubah dari './lib/supabase' menjadi '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  start_date: string
  end_date: string
}

export default function DashboardHome() {
  const router = useRouter()
  const [projectsCount, setProjectsCount] = useState(0)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [totalRabGlobal, setTotalRabGlobal] = useState(0)
  const [totalActualGlobal, setTotalActualGlobal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // 1. Ambil jumlah total proyek
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projData) {
        setProjectsCount(projData.length)
        setRecentProjects(projData.slice(0, 5))
      }

      // 2. Hitung total RAB dan Aktual global dengan tipe eksplisit
      const { data: rabData } = await supabase.from('rab_items').select('total_cost')
      const { data: expData } = await supabase.from('actual_expenses').select('amount')

      const rabSum = rabData?.reduce((acc: number, curr: { total_cost: number | null }) => acc + (curr.total_cost || 0), 0) || 0
      const expSum = expData?.reduce((acc: number, curr: { amount: number | null }) => acc + (curr.amount || 0), 0) || 0

      setTotalRabGlobal(rabSum)
      setTotalActualGlobal(expSum)
      setLoading(false)
    }

    fetchDashboardData()
  }, [router])

  const globalVariance = totalRabGlobal - totalActualGlobal

  return (
    <div className="w-full">
      <main className="max-w-5xl mx-auto">
        
        {/* Header Dashboard */}
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

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-mono text-xs">Memuat ringkasan dashboard...</div>
        ) : (
          <div className="space-y-8">
            
            {/* Kartu Statistik Utama (KPI Cards) */}
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

            {/* Bagian Proyek Terbaru & Pintasan Cepat */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Daftar Proyek Terbaru (2 Kolom) */}
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

              {/* Panel Pintasan Cepat (1 Kolom) */}
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
        )}
      </main>
    </div>
  )
}