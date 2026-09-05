'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
// HAPUS baris ini agar tidak mengimpor Sidebar secara manual di halaman utama:
// import Sidebar from '../components/Sidebar'

interface Project {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
}

export default function Home() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()

  async function checkUserAndFetchProjects() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
      return
    }

    setUserEmail(session.user.email || null)

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Gagal memuat data:', error.message)
    } else {
      setProjects(data || [])
    }
  }

  useEffect(() => {
    checkUserAndFetchProjects()
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
      checkUserAndFetchProjects()
    }
  }

  async function handleDeleteProject(projectId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Yakin ingin menghapus proyek ini beserta seluruh data RAB di dalamnya?')) return

    const { error } = await supabase.from('projects').delete().eq('id', projectId)

    if (error) {
      alert('Gagal menghapus proyek: ' + error.message)
    } else {
      checkUserAndFetchProjects()
    }
  }

  return (
    /* Hapus tag flex min-h-screen di sini karena sudah ditangani oleh layout.tsx */
    <div className="w-full">
      {/* 
        HAPUS baris pemanggilan Sidebar di sini:
        <Sidebar userEmail={userEmail} /> 
      */}

      {/* Konten Utama Dashboard */}
      <div className="max-w-4xl mx-auto">
        
        {/* Header Dashboard */}
        <header className="mb-8 border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="bg-emerald-500 w-3 h-3 rounded-full inline-block"></span>
            WiraDana Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Sistem Manajemen Proyek dan Estimasi RAB Terintegrasi</p>
        </header>

        {/* Grid Layout: Form & Daftar Proyek */}
        <div className="grid grid-cols-1 gap-8">
          
          {/* Formulir Input Proyek */}
          <section className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center gap-2">
              <span>+</span> Buat Proyek Baru
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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
                <div>
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
            
            {projects.length === 0 ? (
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
                      <th className="py-3 px-4">Deskripsi</th>
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
                        </td>
                        <td className="py-4 px-4 text-slate-300 text-sm">{p.description || '-'}</td>
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

        </div>
      </div>
    </div>
  )
}