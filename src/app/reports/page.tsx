'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ReportsPage() {
  const router = useRouter()
  const [totalRabAll, setTotalRabAll] = useState(0)
  const [totalExpAll, setTotalExpAll] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReportData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: rab } = await supabase.from('rab_items').select('total_cost')
      const { data: exp } = await supabase.from('actual_expenses').select('amount')

      const rabSum = rab?.reduce((acc, curr) => acc + (curr.total_cost || 0), 0) || 0
      const expSum = exp?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0

      setTotalRabAll(rabSum)
      setTotalExpAll(expSum)
      setLoading(false)
    }

    fetchReportData()
  }, [router])

  return (
    <div className="w-full">
      <main className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">Laporan & Cash Flow Global</h1>
            <p className="text-slate-400 text-sm">Rekapitulasi keuangan makro seluruh portofolio proyek Anda.</p>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            🖨️ Cetak Laporan
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">Memuat laporan...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <span className="text-xs text-slate-400 block uppercase tracking-wider mb-2">Akumulasi Seluruh RAB</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                Rp {totalRabAll.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <span className="text-xs text-slate-400 block uppercase tracking-wider mb-2">Total Pengeluaran Global</span>
              <span className="text-2xl font-extrabold text-sky-400 font-mono">
                Rp {totalExpAll.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <span className="text-xs text-slate-400 block uppercase tracking-wider mb-2">Arus Kas Bersih (Net Cash)</span>
              <span className={`text-2xl font-extrabold font-mono ${totalRabAll - totalExpAll >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Rp {(totalRabAll - totalExpAll).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        )}

        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl text-center py-12">
          <h3 className="text-slate-200 font-semibold text-sm mb-1">Fitur Grafik Arus Kas Lanjutan</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            Laporan bulanan dan grafik tren pengeluaran mendetail akan terus disempurnakan sesuai masukan pada menu feedback.
          </p>
        </div>
      </main>
    </div>
  )
}