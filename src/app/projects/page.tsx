'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  const [fetching, setFetching] = useState(true)

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
      fetchProjects()
    }
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

  return (
    <div className="w-full">
      <main className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Halaman */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">Manajemen Proyek & RAB</h1>
          <p className="text-slate-400 text-sm">Pusat pendaftaran proyek baru dan pengelolaan rincian anggaran biaya (RAB).</p>
        </div>

        {/* Formulir Input Proyek Baru */}
        <section className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center gap-2">
            <span>+</span> Buat Proyek Baru
          </h2>
          
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition font-mono [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Tanggal Selesai</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition font-mono [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
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

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-sm transition shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Proyek'}
              </button>
            </div>
          </form>
        </section>

        {/* Daftar Proyek Aktif */}
        <section className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Daftar Proyek Aktif</h2>
          
          {fetching ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">Memuat daftar proyek...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 px-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 text-xl font-mono">
                📁
              </div>
              <h3 className="text-slate-200 font-semibold text-sm mb-1">Belum Ada Proyek</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Mulai buat proyek pertama Anda menggunakan formulir di atas untuk mengelola RAB dan pengeluaran secara terstruktur.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Nama Proyek</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Mulai</th>
                    <th className="py-3 px-4">Selesai</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {projects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition group">
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