'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ProjectBvaSummary {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  totalRab: number
  totalActual: number
  variance: number
  percentage: number
}

export default function BvaAnalysisPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [projectSummaries, setProjectSummaries] = useState<ProjectBvaSummary[]>([])

  // Global Macro Totals
  const [globalRab, setGlobalRab] = useState(0)
  const [globalActual, setGlobalActual] = useState(0)

  useEffect(() => {
    async function fetchBvaData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // 1. Ambil seluruh proyek milik user
      const { data: projects, error: projError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projError || !projects) {
        setLoading(false)
        return
      }

      // 2. Ambil seluruh data RAB dan Actual Expenses secara global untuk kalkulasi cepat
      const { data: rabItems } = await supabase.from('rab_items').select('project_id, total_cost')
      const { data: actualItems } = await supabase.from('actual_expenses').select('project_id, amount')

      let sumRabGlobal = 0
      let sumActualGlobal = 0

      // 3. Petakan per proyek
      const summaries: ProjectBvaSummary[] = projects.map((p) => {
        const projectRabs = rabItems?.filter((r) => r.project_id === p.id) || []
        const projectActuals = actualItems?.filter((a) => a.project_id === p.id) || []

        const totalRab = projectRabs.reduce((acc, curr) => acc + (curr.total_cost || 0), 0)
        const totalActual = projectActuals.reduce((acc, curr) => acc + (curr.amount || 0), 0)
        const variance = totalRab - totalActual
        const percentage = totalRab > 0 ? (totalActual / totalRab) * 100 : 0

        sumRabGlobal += totalRab
        sumActualGlobal += totalActual

        return {
          id: p.id,
          name: p.name,
          startDate: p.start_date || '-',
          endDate: p.end_date || '-',
          status: p.status || 'Scheduled',
          totalRab,
          totalActual,
          variance,
          percentage,
        }
      })

      setProjectSummaries(summaries)
      setGlobalRab(sumRabGlobal)
      setGlobalActual(sumActualGlobal)
      setLoading(false)
    }

    fetchBvaData()
  }, [router])

  const globalVariance = globalRab - globalActual
  const globalPercentage = globalRab > 0 ? (globalActual / globalRab) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-12 flex items-center justify-center font-mono text-sm">
        Memuat analisis BVA...
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigasi Kembali */}
        <div className="flex justify-between items-center">
          <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 transition">
            &larr; Kembali ke Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="no-print bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
          >
            🖨️ Cetak Laporan BVA
          </button>
        </div>

        {/* Header Halaman */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">Analisis Budget vs. Actual (BVA)</h1>
          <p className="text-slate-400 text-sm">Evaluasi selisih anggaran rencana dan realisasi pengeluaran riil lintas portofolio proyek.</p>
        </div>

        {/* Kartu Ringkasan Makro Global */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <span className="text-xs text-slate-400 block uppercase tracking-wider mb-1">Total Akumulasi RAB</span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono">
              Rp {globalRab.toLocaleString('id-ID')}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">Seluruh Rencana Anggaran</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <span className="text-xs text-slate-400 block uppercase tracking-wider mb-1">Total Realisasi Aktual</span>
            <span className="text-xl font-extrabold text-sky-400 font-mono">
              Rp {globalActual.toLocaleString('id-ID')}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">Penyerapan: {globalPercentage.toFixed(1)}% dari RAB</span>
          </div>

          <div className={`bg-slate-900/80 border p-5 rounded-2xl shadow-xl ${globalVariance >= 0 ? 'border-emerald-500/30' : 'border-red-500/50 bg-red-950/10'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Varians Global</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${globalVariance >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800 animate-pulse'}`}>
                {globalVariance >= 0 ? 'Surplus / Sisa' : 'Defisit!'}
              </span>
            </div>
            <span className={`text-xl font-extrabold font-mono ${globalVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              Rp {Math.abs(globalVariance).toLocaleString('id-ID')} {globalVariance < 0 ? 'Defisit' : 'Sisa'}
            </span>
          </div>
        </div>

        {/* Tabel Analisis Per Proyek */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl shadow-xl">
          <div className="mb-6 border-b border-slate-800 pb-4">
            <h2 className="text-lg font-semibold text-slate-200">Perbandingan Anggaran Per Proyek</h2>
          </div>

          {projectSummaries.length === 0 ? (
            <div className="text-center py-12 px-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <h3 className="text-slate-200 font-semibold text-sm mb-1">Belum Ada Proyek</h3>
              <p className="text-slate-500 text-xs">Tambahkan proyek terlebih dahulu untuk melihat analisis BVA.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Nama Proyek</th>
                    <th className="py-3 px-4 text-right">Total RAB</th>
                    <th className="py-3 px-4 text-right">Realisasi Aktual</th>
                    <th className="py-3 px-4 text-center">Penyerapan</th>
                    <th className="py-3 px-4 text-right">Selisih (Varians)</th>
                    <th className="no-print py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {projectSummaries.map((item) => {
                    const isOver = item.variance < 0
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4 font-medium text-slate-100">
                          {item.name}
                          <span className="text-xs text-slate-500 block font-normal font-mono">
                            {item.startDate} s.d. {item.endDate}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-emerald-400 font-mono text-sm text-right">
                          Rp {item.totalRab.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-4 text-sky-400 font-mono text-sm text-right">
                          Rp {item.totalActual.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                              <div
                                className={`h-full rounded-full ${item.percentage > 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(item.percentage, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-mono text-slate-300 w-10 text-right">
                              {item.percentage.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className={`py-4 px-4 font-mono font-semibold text-sm text-right ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                          {isOver ? '-' : '+'} Rp {Math.abs(item.variance).toLocaleString('id-ID')}
                        </td>
                        <td className="no-print py-4 px-4 text-center">
                          <Link
                            href={`/projects/${item.id}`}
                            className="text-emerald-400 hover:text-emerald-300 text-xs bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-900/40 px-3 py-1.5 rounded-md transition"
                          >
                            Detail &rarr;
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}