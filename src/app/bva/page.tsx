'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProjectSummary {
  id: string
  name: string
  totalRab: number
  totalActual: number
}

// PASTIKAN MENGGUNAKAN 'export default function'
export default function BvaPage() {
  const router = useRouter()
  const [summaries, setSummaries] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBvaData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: projects } = await supabase.from('projects').select('id, name')
      if (!projects) {
        setLoading(false)
        return
      }

      const results: ProjectSummary[] = []
      for (const p of projects) {
        const { data: rab } = await supabase.from('rab_items').select('total_cost').eq('project_id', p.id)
        const { data: exp } = await supabase.from('actual_expenses').select('amount').eq('project_id', p.id)

        const totalRab = rab?.reduce((acc, curr) => acc + (curr.total_cost || 0), 0) || 0
        const totalActual = exp?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0

        results.push({ id: p.id, name: p.name, totalRab, totalActual })
      }

      setSummaries(results)
      setLoading(false)
    }

    fetchBvaData()
  }, [router])

  return (
    <div className="w-full">
      <main className="max-w-5xl mx-auto">
        <div className="mb-8 border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">Kalkulator & Analisis BVA</h1>
          <p className="text-slate-400 text-sm">
            Budget vs Actual (BVA): Memantau selisih anggaran rencana dengan realisasi pengeluaran di lapangan secara global.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">Menghitung data analisis...</div>
        ) : summaries.length === 0 ? (
          <div className="text-center py-16 px-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            <h3 className="text-slate-200 font-semibold text-sm mb-1">Belum Ada Data Proyek</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4">Buat proyek terlebih dahulu untuk melihat kalkulasi BVA.</p>
            <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold underline">Ke Dashboard &rarr;</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {summaries.map((s) => {
              const variance = s.totalRab - s.totalActual
              const isSafe = variance >= 0
              return (
                <div key={s.id} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white mb-1">{s.name}</h2>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase ${isSafe ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                      {isSafe ? 'Anggaran Aman' : 'Defisit / Overbudget'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-6 text-right font-mono text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">RAB (Rencana)</span>
                      <span className="text-emerald-400 font-bold">Rp {s.totalRab.toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Aktual Lapangan</span>
                      <span className="text-sky-400 font-bold">Rp {s.totalActual.toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Selisih (Sisa/Defisit)</span>
                      <span className={`font-bold ${isSafe ? 'text-emerald-400' : 'text-red-400'}`}>
                        Rp {Math.abs(variance).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}