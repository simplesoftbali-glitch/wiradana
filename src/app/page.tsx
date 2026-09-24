'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Calculator,
  FolderKanban,
  Receipt,
  TrendingUp,
  ShieldCheck,
  Upload,
  Plus,
  X,
} from 'lucide-react'
import BvaChart from '../components/BvaChart'

interface Project {
  id: string
  name: string
  description?: string
  start_date: string
  end_date: string
  status: string
}

interface ChartItem {
  name: string
  RAB: number
  Aktual: number
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
  const [chartData, setChartData] = useState<ChartItem[]>([])
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectStartDate, setProjectStartDate] = useState('')
  const [projectEndDate, setProjectEndDate] = useState('')
  const [projectStatus, setProjectStatus] = useState('Scheduled')
  const [savingProject, setSavingProject] = useState(false)

  // JSON-LD Structured Data untuk GEO & Google Indexing
  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'WiraDana',
    operatingSystem: 'Web-based (Desktop First)',
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IDR',
    },
    description: 'Aplikasi manajemen keuangan proyek, estimasi RAB, dan analisis Budget Variance Analysis (BVA) kontraktor.',
    url: 'https://wiradana-one.vercel.app',
  }

  function getEffectiveStatus(proj: { status: string; end_date?: string }) {
    if (proj.status === 'Closed' || proj.status === 'On Hold') {
      return proj.status
    }

    if (proj.end_date) {
      const today = new Date().toISOString().split('T')[0]
      if (proj.end_date < today) {
        return 'Overdue'
      }
    }

    return proj.status || 'Scheduled'
  }

  function renderStatusBadge(rawStatus: string, endDate: string) {
    const effectiveStatus = getEffectiveStatus({ status: rawStatus, end_date: endDate })

    switch (effectiveStatus) {
      case 'Scheduled':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-sky-950 text-sky-400 border border-sky-800">Scheduled</span>
      case 'On Track':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-950 text-emerald-400 border border-emerald-800">On Track</span>
      case 'On Hold':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-950 text-amber-400 border border-amber-800">On Hold</span>
      case 'Overdue':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-950 text-red-400 border border-red-800 animate-pulse">Overdue</span>
      case 'Closed':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-900 text-slate-400 border border-slate-700">Closed</span>
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-900 text-slate-400 border border-slate-700">{effectiveStatus}</span>
    }
  }

  useEffect(() => {
    async function checkUserAndFetch() {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      if (session) {
        // Ambil Data Proyek
        const { data: projData } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })

        if (projData) {
          setProjectsCount(projData.length)
          setRecentProjects(projData.slice(0, 5))

          // Ambil Data RAB dan Pengeluaran untuk Grafik BVA
          const { data: rabData } = await supabase.from('rab_items').select('project_id, total_cost')
          const { data: expData } = await supabase.from('actual_expenses').select('project_id, amount')

          // Hitung Global Total
          const rabSum = rabData?.reduce((acc: number, curr: { total_cost: number | null }) => acc + (curr.total_cost || 0), 0) || 0
          const expSum = expData?.reduce((acc: number, curr: { amount: number | null }) => acc + (curr.amount || 0), 0) || 0

          setTotalRabGlobal(rabSum)
          setTotalActualGlobal(expSum)

          // Susun Data Per Proyek untuk Grafik
          const formattedChartData: ChartItem[] = projData.slice(0, 6).map((proj) => {
            const projRab = rabData
              ?.filter((r) => r.project_id === proj.id)
              .reduce((acc, curr) => acc + (curr.total_cost || 0), 0) || 0

            const projExp = expData
              ?.filter((e) => e.project_id === proj.id)
              .reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0

            return {
              name: proj.name.length > 12 ? proj.name.substring(0, 12) + '...' : proj.name,
              RAB: projRab,
              Aktual: projExp,
            }
          })

          setChartData(formattedChartData)
        }
      }
      setLoading(false)
    }

    checkUserAndFetch()
  }, [])

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    if (!projectName.trim()) return alert('Nama proyek wajib diisi!')

    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (!currentSession) {
      router.push('/login')
      return
    }

    setSavingProject(true)
    const { error } = await supabase.from('projects').insert([{
      name: projectName.trim(),
      description: projectDescription,
      start_date: projectStartDate || null,
      end_date: projectEndDate || null,
      status: projectStatus,
      user_id: currentSession.user.id,
    }])
    setSavingProject(false)

    if (error) {
      alert('Gagal menyimpan: ' + error.message)
      return
    }

    setProjectName('')
    setProjectDescription('')
    setProjectStartDate('')
    setProjectEndDate('')
    setProjectStatus('Scheduled')
    setIsProjectModalOpen(false)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono text-xs">
        Memuat WiraDana...
      </div>
    )
  }

  // JIKA PENGGUNA BELUM LOGIN: Landing Page
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-[#714B67] selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />

        <nav className="border-b border-slate-200 bg-white/95">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#714B67] text-sm font-bold text-white">W</span>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">WiraDana</span>
            </Link>
            <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
              <a href="#fitur" className="transition hover:text-[#714B67]">Fitur</a>
              <a href="#solusi" className="transition hover:text-[#714B67]">Solusi</a>
              <a href="#tentang" className="transition hover:text-[#714B67]">Tentang</a>
            </div>
            <Link href="/login" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#714B67] hover:text-[#714B67]">
              Masuk ke Akun
            </Link>
          </div>
        </nav>

        <section id="solusi" className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:pb-28 md:pt-28">
          <div className="max-w-4xl">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-[#714B67]">Enterprise Light Mode untuk proyek yang lebih terkendali</p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-6xl">
              Kontrol Keuangan Proyek & Estimasi RAB <span className="text-[#714B67]">Lebih Presisi</span>
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              Aplikasi web desktop-first gratis untuk memantau Budget vs Actual (BVA), arus kas, dan pengeluaran proyek konstruksi/teknis secara real-time.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#714B67] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#714B67]/20 transition hover:bg-[#5a3b52]">
                Mulai Sekarang (Gratis) <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:border-[#714B67] hover:text-[#714B67]">
                Buka Demo Proyek
              </Link>
            </div>
          </div>
          <div className="mt-16 grid gap-4 border-t border-slate-200 pt-8 sm:grid-cols-3">
            {[
              ['Real-time', 'Pantau biaya tanpa menunggu rekap manual'],
              ['Desktop-first', 'Ruang kerja rapi untuk tim teknis'],
              ['100% Gratis', 'Dibangun untuk komunitas lokal'],
            ].map(([title, description]) => (
              <div key={title}>
                <p className="text-sm font-bold text-[#714B67]">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="fitur" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#714B67]">Fitur inti</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Semua yang dibutuhkan untuk mengelola proyek dengan percaya diri.</h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                [Calculator, 'Budget vs Actual Tracking', 'Pencatatan transaksi aktual harian memotong alokasi RAB secara otomatis untuk mencegah overbudget.'],
                [Upload, 'Impor RAB dari CSV/Excel', 'Template dan parser CSV bawaan membantu mengunggah rencana anggaran biaya secara instan.'],
                [Receipt, 'Penyimpanan Bukti Nota', 'Upload foto kuitansi atau nota transaksi lapangan terintegrasi dengan Supabase Storage.'],
                [TrendingUp, 'Dashboard Finansial & Cash Flow', 'Visualisasi Total RAB, Total Pengeluaran, Sisa Anggaran, dan Proyeksi Profit dalam satu layar.'],
                [FolderKanban, 'Full Modal Data Entry', 'Pengisian data proyek, RAB, dan pengeluaran yang rapi melalui pop-up modal dialog.'],
                [ShieldCheck, 'Kontrol yang Transparan', 'Data proyek tersusun aman dan mudah ditinjau oleh pemilik usaha maupun tim lapangan.'],
              ].map(([Icon, title, description]) => (
                <article key={title as string} className="rounded-xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-0.5 hover:border-[#714B67]/40 hover:shadow-lg">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#714B67]/10 text-[#714B67]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-slate-900">{title as string}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description as string}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="tentang" className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 rounded-2xl border border-[#714B67]/20 bg-[#714B67]/5 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#714B67]">Donationware & komunitas</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Dibangun gratis untuk membantu rekan teknis dan kontraktor lokal.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">WiraDana 100% Gratis dan Community-Driven. Jika aplikasi ini membantu pekerjaan Anda, dukung operasional server melalui QRIS atau bagikan feedback untuk pengembangan berikutnya.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Link href="/donate" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#714B67] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5a3b52]">
                Dukung Operasional Server (QRIS)
              </Link>
              <Link href="/feedback" className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-[#714B67] hover:text-[#714B67]">
                Pusat Bantuan (Feedback)
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 WiraDana v1.0.0. Untuk proyek yang lebih tertata.</p>
            <div className="flex gap-5">
              <Link href="/feedback" className="transition hover:text-[#714B67]">Feedback</Link>
              <Link href="/login" className="transition hover:text-[#714B67]">Masuk</Link>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // JIKA PENGGUNA SUDAH LOGIN: Dashboard Utama (Lengkap dengan Grafik BVA)
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
          <button
            type="button"
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#714B67] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#5a3b52]"
          >
            <Plus className="h-4 w-4" /> Buat Proyek Baru
          </button>
        </header>

        <div className="space-y-8">
          {/* Kartu Finansial Makro */}
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

          {/* Seksi Visualisasi Grafik Analisis BVA */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-400" />
                <span>Analisis Komparasi BVA (RAB vs Realisasi Field)</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">Top 6 Proyek</span>
            </div>
            
            <BvaChart data={chartData} />
          </div>

          {/* Tabel Proyek Terbaru & Pintasan Menu */}
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
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition">{p.name}</span>
                        <div>{renderStatusBadge(p.status, p.end_date)}</div>
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
                  <FolderKanban className="inline-block w-4 h-4 mr-1" /> <strong className="text-white ml-1">Proyek & RAB</strong>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Buat proyek baru & atur rincian RAB</span>
                </Link>
                <Link href="/bva" className="block p-3 rounded-xl bg-slate-950/60 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-800/50 transition text-xs font-medium text-slate-200">
                  <TrendingUp className="inline-block w-4 h-4 mr-1" /> <strong className="text-white ml-1">Kalkulator / BVA</strong>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Analisis selisih anggaran riil</span>
                </Link>
                <Link href="/reports" className="block p-3 rounded-xl bg-slate-950/60 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-800/50 transition text-xs font-medium text-slate-200">
                  <AlertCircle className="inline-block w-4 h-4 mr-1" /> <strong className="text-white ml-1">Laporan & Cash Flow</strong>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Rekapitulasi keuangan makro</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="dashboard-new-project-title" className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
              <div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 id="dashboard-new-project-title" className="text-lg font-bold">Buat Proyek Baru</h2>
                  <p className="mt-1 text-xs text-slate-500">Lengkapi informasi dasar proyek untuk mulai mengelola RAB.</p>
                </div>
                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Tutup dialog">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Nama Proyek</label>
                    <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Contoh: Instalasi Smart Home" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Deskripsi</label>
                    <input type="text" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Deskripsi singkat proyek" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Tanggal Mulai</label>
                    <input type="date" value={projectStartDate} onChange={(e) => setProjectStartDate(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Tanggal Selesai</label>
                    <input type="date" value={projectEndDate} onChange={(e) => setProjectEndDate(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Status Awal</label>
                    <select value={projectStatus} onChange={(e) => setProjectStatus(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900">
                      <option value="Scheduled">Scheduled (Terjadwal)</option>
                      <option value="On Track">On Track (Berjalan Normal)</option>
                      <option value="On Hold">On Hold (Ditunda)</option>
                      <option value="Closed">Closed (Selesai)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <button type="button" onClick={() => setIsProjectModalOpen(false)} className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">Batal</button>
                  <button type="submit" disabled={savingProject} className="rounded-lg bg-[#714B67] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#5a3b52] disabled:opacity-50">{savingProject ? 'Menyimpan...' : 'Simpan Proyek'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}