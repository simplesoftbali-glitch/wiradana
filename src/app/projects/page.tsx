'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderOpen, Plus, Search, Sparkles, X } from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  status: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('Scheduled')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)

  // Fungsi helper untuk mengevaluasi status efektif (deteksi otomatis Overdue)
  function getEffectiveStatus(project: { status: string; end_date?: string }) {
    if (project.status === 'Closed' || project.status === 'On Hold') {
      return project.status
    }

    if (project.end_date) {
      const today = new Date().toISOString().split('T')[0]
      if (project.end_date < today) {
        return 'Overdue'
      }
    }

    return project.status
  }

  // Komponen / Helper untuk Badge Status
  function renderStatusBadge(rawStatus: string, endDate: string) {
    const effectiveStatus = getEffectiveStatus({ status: rawStatus, end_date: endDate })

    switch (effectiveStatus) {
      case 'Scheduled':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-sky-950 text-sky-400 border border-sky-800">Scheduled</span>
      case 'On Track':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">On Track</span>
      case 'On Hold':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-amber-950 text-amber-400 border border-amber-800">On Hold</span>
      case 'Overdue':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-red-950 text-red-400 border border-red-800 animate-pulse">Overdue</span>
      case 'Closed':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-slate-900 text-slate-400 border border-slate-700">Closed</span>
      default:
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-slate-900 text-slate-400 border border-slate-700">{effectiveStatus}</span>
    }
  }

  async function fetchProjects() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) {
      setProjects(data || [])
    }
    setFetching(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return alert('Nama proyek wajib diisi!')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('projects').insert([
      {
        name: name,
        description: description,
        start_date: startDate || null,
        end_date: endDate || null,
        status: status,
        user_id: session.user.id
      }
    ])

    setLoading(false)

    if (error) {
      alert('Gagal menyimpan: ' + error.message)
    } else {
      setName('')
      setDescription('')
      setStartDate('')
      setEndDate('')
      setStatus('Scheduled')
      setIsProjectModalOpen(false)
      fetchProjects()
    }
  }

  async function handleCreateSampleProject() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    setIsGeneratingDemo(true)
    const today = new Date()
    const startDate = today.toISOString().split('T')[0]
    const endDateValue = new Date(today)
    endDateValue.setDate(endDateValue.getDate() + 14)
    const endDate = endDateValue.toISOString().split('T')[0]

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([{
        name: 'Instalasi Smart Office & Panel Listrik (Proyek Demo)',
        description: 'Proyek sampel otomatis untuk mempelajari fitur kalkulasi BVA, RAB, dan Pengeluaran Lapangan WiraDana.',
        status: 'In Progress',
        start_date: startDate,
        end_date: endDate,
        user_id: session.user.id
      }])
      .select('id')
      .single()

    if (projectError || !project) {
      setIsGeneratingDemo(false)
      alert('Gagal membuat proyek demo: ' + (projectError?.message || 'ID proyek tidak ditemukan.'))
      return
    }

    const projectId = project.id
    const { error: rabError } = await supabase.from('rab_items').insert([
      {
        project_id: projectId,
        name: 'Kabel NYM 3x2.5mm & Conduit',
        category: 'Material',
        quantity: 10,
        unit: 'Roll',
        unit_price: 1250000
      },
      {
        project_id: projectId,
        name: 'Panel Utama & MCB Schneider 3 Phase',
        category: 'Peralatan',
        quantity: 1,
        unit: 'Set',
        unit_price: 8000000
      },
      {
        project_id: projectId,
        name: 'Jasa Instalasi & Pengujian Sistem',
        category: 'Jasa/Upah',
        quantity: 1,
        unit: 'LS',
        unit_price: 6500000
      }
    ])

    if (rabError) {
      const { error: cleanupError } = await supabase.from('projects').delete().eq('id', projectId)
      setIsGeneratingDemo(false)
      alert(`Gagal membuat data RAB demo: ${rabError.message}${cleanupError ? ` Proyek demo juga gagal dibersihkan: ${cleanupError.message}` : ''}`)
      return
    }

    const { error: expenseError } = await supabase.from('actual_expenses').insert([
      {
        project_id: projectId,
        name: 'Pembelian Kabel NYM & Accessories',
        amount: 8200000,
        date: startDate,
        category: 'Material'
      },
      {
        project_id: projectId,
        name: 'Pembayaran DP Jasa Teknisi Listrik',
        amount: 3000000,
        date: startDate,
        category: 'Jasa/Upah'
      }
    ])

    setIsGeneratingDemo(false)

    if (expenseError) {
      const { error: cleanupError } = await supabase.from('projects').delete().eq('id', projectId)
      alert(`Gagal membuat transaksi demo: ${expenseError.message}${cleanupError ? ` Proyek demo juga gagal dibersihkan: ${cleanupError.message}` : ''}`)
      return
    }

    alert('Proyek Demo Berhasil Dibuat!')
    router.push(`/projects/${projectId}`)
  }

  async function handleDeleteProject(projectId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Yakin ingin menghapus proyek ini beserta seluruh data RAB di dalamnya?')) return

    const { error } = await supabase.from('projects').delete().eq('id', projectId)

    if (error) {
      alert('Gagal menghapus proyek: ' + error.message)
    } else {
      fetchProjects()
    }
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = !normalizedSearchQuery ||
      project.name.toLowerCase().includes(normalizedSearchQuery) ||
      (project.description || '').toLowerCase().includes(normalizedSearchQuery)
    const matchesStatus = statusFilter === 'All' ||
      getEffectiveStatus(project) === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="w-full">
      <main className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">Manajemen Proyek & RAB</h1>
            <p className="text-slate-400 text-sm">Pusat pendaftaran proyek baru dan pengelolaan rincian anggaran biaya (RAB).</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#714B67] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#5a3b52]"
            >
              <Plus className="h-4 w-4" /> Buat Proyek Baru
            </button>
            <button
              type="button"
              onClick={handleCreateSampleProject}
              disabled={isGeneratingDemo}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#714B67] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#714B67]" />
              {isGeneratingDemo ? 'Memuat...' : 'Muat Proyek Demo'}
            </button>
          </div>
        </div>

        {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="new-project-title" className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
              <div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 id="new-project-title" className="text-lg font-bold">Buat Proyek Baru</h2>
                  <p className="mt-1 text-xs text-slate-500">Lengkapi informasi dasar proyek untuk mulai mengelola RAB.</p>
                </div>
                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Tutup dialog">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Nama Proyek</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Instalasi Smart Home"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Deskripsi</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Proyek otomatisasi perangkat Bali"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Tanggal Mulai</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Tanggal Selesai</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Status Awal Proyek</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="Scheduled">Scheduled (Terjadwal)</option>
                  <option value="On Track">On Track (Berjalan Normal)</option>
                  <option value="On Hold">On Hold (Ditunda)</option>
                  <option value="Closed">Closed (Selesai)</option>
                </select>
              </div>
            </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <button type="button" onClick={() => setIsProjectModalOpen(false)} className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">Batal</button>
                  <button type="submit" disabled={loading} className="flex items-center justify-center rounded-lg bg-[#714B67] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5a3b52] disabled:opacity-50">
                    {loading ? 'Menyimpan...' : 'Simpan Proyek'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Daftar Proyek Aktif */}
        <section className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Daftar Proyek Aktif</h2>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-6">
            <div>
              <label htmlFor="project-search" className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
                Cari Proyek
              </label>
              <input
                id="project-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan nama atau deskripsi..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <div className="md:min-w-48">
              <label htmlFor="project-status-filter" className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
                Filter Status
              </label>
              <select
                id="project-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="All">Semua Status</option>
                <option value="Scheduled">Scheduled</option>
                <option value="On Track">On Track</option>
                <option value="On Hold">On Hold</option>
                <option value="Overdue">Overdue</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
          
          {fetching ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">Memuat daftar proyek...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 px-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 text-xl font-mono">
                <FolderOpen className="w-5 h-5" />
              </div>
              <h3 className="text-slate-200 font-semibold text-sm mb-1">Belum Ada Proyek</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Mulai buat proyek pertama Anda menggunakan formulir di atas untuk mengelola RAB dan pengeluaran secara terstruktur.
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-16 px-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 text-xl font-mono">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-slate-200 font-semibold text-sm mb-1">Proyek Tidak Ditemukan</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Tidak ada proyek yang sesuai dengan pencarian atau filter status yang dipilih.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4 w-10"><input type="checkbox" aria-label="Pilih semua proyek" className="accent-[#714B67]" /></th>
                    <th className="py-3 px-4">Nama Proyek</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Mulai</th>
                    <th className="py-3 px-4">Selesai</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition group">
                      <td className="py-4 px-4"><input type="checkbox" aria-label={`Pilih ${p.name}`} className="accent-[#714B67]" /></td>
                      <td className="py-4 px-4 font-medium">
                        <Link href={`/projects/${p.id}`} className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5">
                          {p.name}
                          <span className="text-xs opacity-0 group-hover:opacity-100 transition">&rarr;</span>
                        </Link>
                        <span className="text-xs text-slate-400 font-normal block mt-0.5">{p.description || 'Tidak ada deskripsi'}</span>
                      </td>
                      <td className="py-4 px-4">
                        {renderStatusBadge(p.status, p.end_date)}
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-sm font-mono">{p.start_date || '-'}</td>
                      <td className="py-4 px-4 text-slate-400 text-sm font-mono">{p.end_date || '-'}</td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={(e) => handleDeleteProject(p.id, e)}
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
        </section>

      </main>
    </div>
  )
}