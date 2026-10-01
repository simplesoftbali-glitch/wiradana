'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { exportToExcel } from '../../lib/exportUtils'
import { hasUnitMismatch } from '../../lib/unitMismatch'
import { fetchAllRows } from '../../lib/supabasePagination'
import BvaChart from '../../components/BvaChart'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Download, FileSpreadsheet, Printer } from 'lucide-react'

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
  mismatchCount: number
}

interface CategoryChartItem {
  name: string
  RAB: number
  Aktual: number
}

export default function BvaAnalysisPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [projectSummaries, setProjectSummaries] = useState<ProjectBvaSummary[]>([])
  const [categoryChartData, setCategoryChartData] = useState<CategoryChartItem[]>([])

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
      const [rabResult, actualResult] = await Promise.all([
        supabase.from('rab_items').select('project_id, category, unit, total_cost'),
        supabase.from('actual_expenses').select('project_id, category, unit, amount'),
      ])
      const dataError = rabResult.error ?? actualResult.error
      if (dataError) {
        console.error('Gagal memuat item BVA:', dataError)
        setLoadError(`Gagal memuat data BVA: ${dataError.message}`)
        setLoading(false)
        return
      }
      const rabItems = rabResult.data ?? []
      const actualItems = actualResult.data ?? []

      let sumRabGlobal = 0
      let sumActualGlobal = 0
      const categoryTotals = new Map<string, CategoryChartItem>()
      const getCategoryTotals = (category: string | null) => {
        const name = category?.trim() || 'Tanpa kategori'
        let totals = categoryTotals.get(name)
        if (!totals) {
          totals = { name, RAB: 0, Aktual: 0 }
          categoryTotals.set(name, totals)
        }
        return totals
      }

      rabItems?.forEach((item) => {
        getCategoryTotals(item.category).RAB += Number(item.total_cost || 0)
      })
      actualItems?.forEach((item) => {
        getCategoryTotals(item.category).Aktual += Number(item.amount || 0)
      })
      setCategoryChartData(Array.from(categoryTotals.values()))

      // 3. Petakan per proyek
      const summaries: ProjectBvaSummary[] = projects.map((p) => {
        const projectRabs = rabItems?.filter((r) => r.project_id === p.id) || []
        const projectActuals = actualItems?.filter((a) => a.project_id === p.id) || []

        const totalRab = projectRabs.reduce((acc, curr) => acc + (curr.total_cost || 0), 0)
        const totalActual = projectActuals.reduce((acc, curr) => acc + (curr.amount || 0), 0)
        const variance = totalRab - totalActual
        const percentage = totalRab > 0 ? (totalActual / totalRab) * 100 : 0
        const mismatchCount = projectActuals.filter((expense) => hasUnitMismatch(expense, projectRabs)).length

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
          mismatchCount,
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

  function formatCurrency(value: number) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
  }

  function handleExportExcel() {
    try {
      exportToExcel('rekap-bva', [
        {
          sheetName: 'Rekap BVA',
          data: projectSummaries.map((item) => ({
            'Nama Proyek': item.name,
            'Tanggal Mulai': item.startDate,
            'Tanggal Selesai': item.endDate,
            Status: item.status,
            RAB: formatCurrency(item.totalRab),
            Aktual: formatCurrency(item.totalActual),
            'Selisih (Varians)': formatCurrency(item.variance),
            'Mismatch Satuan': item.mismatchCount,
          })),
        },
      ])
    } catch (error) {
      alert(`Gagal mengekspor rekap BVA: ${error instanceof Error ? error.message : 'Terjadi kesalahan.'}`)
    }
  }

  async function handleExportBvaCSV() {
    try {
      const projectIds = projectSummaries.map((project) => project.id)
      const rabItems: { project_id: string; category: string | null; unit: string | null; total_cost: number | null }[] = []
      const actualItems: { project_id: string; category: string | null; unit: string | null; amount: number | null }[] = []

      for (let index = 0; index < projectIds.length; index += 100) {
        const projectIdBatch = projectIds.slice(index, index + 100)
        const [rabBatch, actualBatch] = await Promise.all([
          fetchAllRows((from, to) => supabase
            .from('rab_items')
            .select('project_id, category, unit, total_cost')
            .in('project_id', projectIdBatch)
            .range(from, to)),
          fetchAllRows((from, to) => supabase
            .from('actual_expenses')
            .select('project_id, category, unit, amount')
            .in('project_id', projectIdBatch)
            .range(from, to)),
        ])
        rabItems.push(...rabBatch)
        actualItems.push(...actualBatch)
      }

      const csvRows = [
        ['Nama Proyek', 'Kategori', 'Total RAB', 'Total Pengeluaran', 'Selisih', 'Status', 'Mismatch Satuan'],
      ]

      projectSummaries.forEach((project) => {
        const projectRabs = rabItems.filter((item) => item.project_id === project.id)
        const projectExpenses = actualItems.filter((item) => item.project_id === project.id)
        const categories = new Set([
          ...projectRabs.map((item) => item.category?.trim() || 'Tanpa kategori'),
          ...projectExpenses.map((item) => item.category?.trim() || 'Tanpa kategori'),
        ])
        if (categories.size === 0) categories.add('-')

        categories.forEach((category) => {
          const categoryRabs = projectRabs.filter((item) => (item.category?.trim() || 'Tanpa kategori') === category)
          const categoryExpenses = projectExpenses.filter((item) => (item.category?.trim() || 'Tanpa kategori') === category)
          const totalRab = categoryRabs
            .reduce((total, item) => total + Number(item.total_cost || 0), 0)
          const totalExpense = categoryExpenses
            .reduce((total, item) => total + Number(item.amount || 0), 0)
          const variance = totalRab - totalExpense
          csvRows.push([
            project.name,
            category,
            String(totalRab),
            String(totalExpense),
            String(variance),
            variance >= 0 ? 'Surplus / Sisa' : 'Defisit',
            String(categoryExpenses.filter((item) => hasUnitMismatch(item, projectRabs)).length),
          ])
        })
      })

      const escapeCsvCell = (value: string) => `"${value.replace(/"/g, '""')}"`
      const csv = `\uFEFF${csvRows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `WiraDana_Rekap_BVA_${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(`Gagal mengekspor rekap BVA: ${error instanceof Error ? error.message : 'Terjadi kesalahan.'}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-12 flex items-center justify-center font-mono text-sm">
        Memuat analisis BVA...
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigasi Kembali */}
        <div className="flex justify-between items-center">
          <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 transition">
            &larr; Kembali ke Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-2" /> Cetak Laporan BVA
          </button>
          <button
            onClick={handleExportExcel}
            className="no-print bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Ekspor Rekap BVA (Excel)
          </button>
          <button
            onClick={handleExportBvaCSV}
            className="no-print flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Ekspor CSV
          </button>
        </div>

        {/* Header Halaman */}
        <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Analisis Budget vs. Actual (BVA)</h1>
        <p className="text-slate-600 text-sm">Evaluasi selisih anggaran rencana dan realisasi pengeluaran riil lintas portofolio proyek.</p>
        </div>
        {loadError && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </p>
        )}

        {/* Kartu Ringkasan Makro Global */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block uppercase tracking-wider mb-1">Total Akumulasi RAB</span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono">
              Rp {globalRab.toLocaleString('id-ID')}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">Seluruh Rencana Anggaran</span>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block uppercase tracking-wider mb-1">Total Realisasi Aktual</span>
            <span className="text-xl font-extrabold text-emerald-700 font-mono">
              Rp {globalActual.toLocaleString('id-ID')}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">Penyerapan: {globalPercentage.toFixed(1)}% dari RAB</span>
          </div>

          <div className={`bg-white border p-5 rounded-xl shadow-sm ${globalVariance >= 0 ? 'border-emerald-200' : 'border-rose-300 bg-rose-50'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Varians Global</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${globalVariance >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                {globalVariance >= 0 ? 'Surplus / Sisa' : 'Defisit!'}
              </span>
            </div>
            <span className={`text-xl font-extrabold font-mono ${globalVariance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              Rp {Math.abs(globalVariance).toLocaleString('id-ID')} {globalVariance < 0 ? 'Defisit' : 'Sisa'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Perbandingan Anggaran per Kategori</h2>
            <p className="mt-1 text-xs text-slate-500">Kategori bawaan dan kustom dihimpun otomatis dari item RAB dan pengeluaran aktual.</p>
          </div>
          <BvaChart data={categoryChartData} />
        </div>

        {/* Tabel Analisis Per Proyek */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <div className="mb-6 border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Perbandingan Anggaran Per Proyek</h2>
          </div>

          {projectSummaries.length === 0 ? (
            <div className="text-center py-12 px-6 border border-dashed border-slate-300 rounded-xl bg-slate-50">
              <h3 className="text-slate-800 font-semibold text-sm mb-1">Belum Ada Proyek</h3>
              <p className="text-slate-500 text-xs">Tambahkan proyek terlebih dahulu untuk melihat analisis BVA.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Nama Proyek</th>
                    <th className="py-3 px-4 text-right">Total RAB</th>
                    <th className="py-3 px-4 text-right">Realisasi Aktual</th>
                    <th className="py-3 px-4 text-center">Peringatan Satuan</th>
                    <th className="py-3 px-4 text-center">Penyerapan</th>
                    <th className="py-3 px-4 text-right">Selisih (Varians)</th>
                    <th className="no-print py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectSummaries.map((item) => {
                    const isOver = item.variance < 0
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-4 font-medium text-slate-900">
                          {item.name}
                          <span className="text-xs text-slate-500 block font-normal font-mono">
                            {item.startDate} s.d. {item.endDate}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-emerald-700 font-mono text-sm text-right">
                          Rp {item.totalRab.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-4 text-emerald-700 font-mono text-sm text-right">
                          Rp {item.totalActual.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {item.mismatchCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800" title={`${item.mismatchCount} transaksi memiliki satuan yang tidak cocok`}>
                              <AlertTriangle className="h-3.5 w-3.5" /> {item.mismatchCount} Mismatch Satuan
                            </span>
                          ) : <span className="text-xs text-slate-400">-</span>}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full ${item.percentage > 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(item.percentage, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-mono text-slate-600 w-10 text-right">
                              {item.percentage.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className={`py-4 px-4 font-mono font-semibold text-sm text-right ${isOver ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {isOver ? '-' : '+'} Rp {Math.abs(item.variance).toLocaleString('id-ID')}
                        </td>
                        <td className="no-print py-4 px-4 text-center">
                          <Link
                            href={`/projects/${item.id}`}
                            className="text-emerald-700 hover:text-emerald-800 text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-md transition"
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