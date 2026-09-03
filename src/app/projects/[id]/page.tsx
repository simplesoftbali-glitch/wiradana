'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'

interface Project {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
}

interface RabItem {
  id: string
  name: string
  unit: string
  quantity: number
  unit_price: number
  total_cost: number
  category: string
}

interface ActualExpense {
  id: string
  date: string
  name: string
  category: string
  amount: number
}

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.id
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [rabItems, setRabItems] = useState<RabItem[]>([])
  const [actualExpenses, setActualExpenses] = useState<ActualExpense[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingExpense, setLoadingExpense] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Form State untuk RAB Item baru
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [category, setCategory] = useState('')

  // Form State untuk Biaya Aktual baru
  const [expName, setExpName] = useState('')
  const [expCategory, setExpCategory] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0])

  async function fetchProjectData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    setUserEmail(session.user.email || null)

    // Ambil Data Proyek dengan pengamanan RLS
    const { data: projData, error: projError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projError || !projData) {
      alert('Proyek tidak ditemukan atau Anda tidak memiliki hak akses.')
      router.push('/')
      return
    }
    setProject(projData)

    // Ambil Data RAB
    const { data: rabData } = await supabase
      .from('rab_items')
      .select('*')
      .eq('project_id', projectId)
    setRabItems(rabData || [])

    // Ambil Data Biaya Aktual
    const { data: expData } = await supabase
      .from('actual_expenses')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
    setActualExpenses(expData || [])
  }

  useEffect(() => {
    fetchProjectData()
  }, [projectId, router])

  async function handleAddRab(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !quantity || !unitPrice) return alert('Nama, Volume, dan Harga Satuan wajib diisi!')

    setLoading(true)
    const { error } = await supabase.from('rab_items').insert([
      {
        project_id: projectId,
        name: name,
        unit: unit,
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unitPrice),
        category: category
      }
    ])
    setLoading(false)

    if (error) {
      alert('Gagal menyimpan RAB: ' + error.message)
    } else {
      setName('')
      setUnit('')
      setQuantity('')
      setUnitPrice('')
      setCategory('')
      fetchProjectData()
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!expName || !expAmount) return alert('Keterangan dan Jumlah Biaya wajib diisi!')

    setLoadingExpense(true)
    const { error } = await supabase.from('actual_expenses').insert([
      {
        project_id: projectId,
        name: expName,
        category: expCategory,
        amount: parseFloat(expAmount),
        date: expDate
      }
    ])
    setLoadingExpense(false)

    if (error) {
      alert('Gagal menyimpan pengeluaran: ' + error.message)
    } else {
      setExpName('')
      setExpCategory('')
      setExpAmount('')
      fetchProjectData()
    }
  }

  async function handleDeleteRab(itemId: string) {
    if (!confirm('Yakin ingin menghapus item RAB ini?')) return
    await supabase.from('rab_items').delete().eq('id', itemId)
    fetchProjectData()
  }

  async function handleDeleteExpense(expId: string) {
    if (!confirm('Yakin ingin menghapus catatan pengeluaran ini?')) return
    await supabase.from('actual_expenses').delete().eq('id', expId)
    fetchProjectData()
  }

  const grandTotalRab = rabItems.reduce((acc, item) => acc + (item.total_cost || 0), 0)
  const grandTotalActual = actualExpenses.reduce((acc, item) => acc + (item.amount || 0), 0)
  const budgetVariance = grandTotalRab - grandTotalActual

  if (!project) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 p-12 flex items-center justify-center font-mono text-sm">Memuat data proyek...</div>
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigasi Kiri */}
      <Sidebar userEmail={userEmail} />

      {/* Konten Utama Kanan */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 transition">
              &larr; Kembali ke Daftar Proyek
            </Link>
            <button
              onClick={() => window.print()}
              className="no-print bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              🖨️ Cetak / Ekspor PDF
            </button>
          </div>

          {/* Header Proyek */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl mb-8 shadow-xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{project.name}</h1>
            <p className="text-slate-400 text-sm mb-4">{project.description || 'Tidak ada deskripsi'}</p>
            <div className="flex flex-wrap gap-6 text-xs text-slate-300 pt-3 border-t border-slate-800">
              <span>Tanggal Mulai: <strong className="text-white font-medium font-mono">{project.start_date || '-'}</strong></span>
              <span>Tanggal Selesai: <strong className="text-white font-medium font-mono">{project.end_date || '-'}</strong></span>
            </div>
          </div>

          {/* Kartu Analisis Ringkasan Finansial (BVA) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <span className="text-xs text-slate-400 block uppercase tracking-wider mb-1">Total Estimasi RAB (Rencana)</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                Rp {grandTotalRab.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <span className="text-xs text-slate-400 block uppercase tracking-wider mb-1">Total Realisasi Aktual</span>
              <span className="text-xl font-extrabold text-sky-400 font-mono">
                Rp {grandTotalActual.toLocaleString('id-ID')}
              </span>
            </div>
            <div className={`bg-slate-900/80 border p-5 rounded-2xl shadow-xl ${budgetVariance >= 0 ? 'border-emerald-500/30' : 'border-red-500/50 bg-red-950/10'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Status Anggaran</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${budgetVariance >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800 animate-pulse'}`}>
                  {budgetVariance >= 0 ? 'Aman / Sisa' : 'Overbudget!'}
                </span>
              </div>
              <span className={`text-xl font-extrabold font-mono ${budgetVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Rp {Math.abs(budgetVariance).toLocaleString('id-ID')} {budgetVariance < 0 ? 'Defisit' : 'Sisa'}
              </span>
            </div>
          </div>

          {/* Form Tambah Item RAB */}
          <form onSubmit={handleAddRab} className="no-print bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl mb-8 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center gap-2">
              <span>+</span> Tambah Item RAB (Rencana)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Nama Item / Pekerjaan</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kabel NYM 3x2.5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Kategori</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Contoh: Material"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Satuan (Unit)</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Contoh: Rol / Pcs"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Volume (Qty)</label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Harga Satuan (Rp)</label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="150000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-sm transition shadow-lg cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Tambah ke RAB'}
              </button>
            </div>
          </form>

          {/* Tabel Rincian RAB */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl shadow-xl mb-8">
            <div className="mb-6 border-b border-slate-800 pb-4">
              <h2 className="text-lg font-semibold text-slate-200">Rincian Anggaran Biaya (RAB - Rencana)</h2>
            </div>

            {rabItems.length === 0 ? (
              <div className="text-center py-12 px-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 text-base font-mono">
                  📋
                </div>
                <h3 className="text-slate-200 font-semibold text-sm mb-1">Belum Ada Item RAB</h3>
                <p className="text-slate-500 text-xs max-w-xs mx-auto">
                  Tambahkan rincian rencana pekerjaan, volume, dan harga satuan melalui form di atas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Item Pekerjaan</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-right">Volume</th>
                      <th className="py-3 px-4 text-right">Harga Satuan</th>
                      <th className="py-3 px-4 text-right">Total Biaya</th>
                      <th className="no-print py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {rabItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4 font-medium text-slate-100">
                          {item.name} <span className="text-xs text-slate-500 block font-normal">({item.unit || 'unit'})</span>
                        </td>
                        <td className="py-4 px-4 text-slate-300 text-sm">{item.category || '-'}</td>
                        <td className="py-4 px-4 text-slate-300 font-mono text-right">{item.quantity}</td>
                        <td className="py-4 px-4 text-slate-300 font-mono text-sm text-right">
                          Rp {Number(item.unit_price).toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-4 text-emerald-400 font-mono font-semibold text-sm text-right">
                          Rp {Number(item.total_cost).toLocaleString('id-ID')}
                        </td>
                        <td className="no-print py-4 px-4 text-center">
                          <button
                            onClick={() => handleDeleteRab(item.id)}
                            className="text-red-400 hover:text-red-300 text-xs bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 px-3 py-1.5 rounded-md transition cursor-pointer"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Form Tambah Biaya Aktual */}
          <form onSubmit={handleAddExpense} className="no-print bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl mb-8 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-sky-400 flex items-center gap-2">
              <span>+</span> Catat Pengeluaran Lapangan (Aktual)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Tanggal</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition font-mono [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Keterangan / Nama Belanja</label>
                <input
                  type="text"
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  placeholder="Contoh: Bayar tukang minggu ke-1 / Beli semen"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Kategori</label>
                <input
                  type="text"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  placeholder="Contoh: Upah / Material"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Jumlah Biaya Aktual (Rp)</label>
                <input
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="350000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition font-mono"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loadingExpense}
                className="bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-sm transition shadow-lg cursor-pointer disabled:opacity-50"
              >
                {loadingExpense ? 'Menyimpan...' : 'Simpan Pengeluaran'}
              </button>
            </div>
          </form>

          {/* Tabel Realisasi Biaya Aktual */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl shadow-xl">
            <div className="mb-6 border-b border-slate-800 pb-4">
              <h2 className="text-lg font-semibold text-slate-200">Realisasi Pengeluaran (Aktual Lapangan)</h2>
            </div>

            {actualExpenses.length === 0 ? (
              <div className="text-center py-12 px-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 text-base font-mono">
                  💸
                </div>
                <h3 className="text-slate-200 font-semibold text-sm mb-1">Belum Ada Catatan Pengeluaran</h3>
                <p className="text-slate-500 text-xs max-w-xs mx-auto">
                  Catat setiap transaksi belanja atau upah harian di lapangan untuk memantau selisih anggaran secara real-time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Keterangan</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-right">Biaya Aktual</th>
                      <th className="no-print py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {actualExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4 text-slate-300 text-sm font-mono">{exp.date}</td>
                        <td className="py-4 px-4 font-medium text-slate-100">{exp.name}</td>
                        <td className="py-4 px-4 text-slate-300 text-sm">{exp.category || '-'}</td>
                        <td className="py-4 px-4 text-sky-400 font-mono font-semibold text-sm text-right">
                          Rp {Number(exp.amount).toLocaleString('id-ID')}
                        </td>
                        <td className="no-print py-4 px-4 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-red-400 hover:text-red-300 text-xs bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 px-3 py-1.5 rounded-md transition cursor-pointer"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}