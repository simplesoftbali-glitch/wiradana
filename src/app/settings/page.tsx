'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Database, Download, FileJson, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { fetchAllRows } from '../../lib/supabasePagination'

type BackupRow = Record<string, unknown>

interface BackupData {
  projects: BackupRow[]
  rab_items: BackupRow[]
  bva_transactions: BackupRow[]
  invoices: BackupRow[]
  profiles: BackupRow[]
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
    const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : ''
    const code = 'code' in error && typeof error.code === 'string' ? ` (${error.code})` : ''
    return [error.message + code, details, hint].filter(Boolean).join(' — ')
  }
  return 'Terjadi kesalahan yang tidak diketahui.'
}

export default function BackupSettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUserId(session.user.id)
      setLoading(false)
    }

    checkSession()
  }, [router])

  async function handleExportJSON() {
    if (!userId) {
      setMessage({ text: 'Sesi berakhir. Silakan masuk kembali.', isError: true })
      return
    }

    setExporting(true)
    setMessage(null)
    try {
      const projects = await fetchAllRows((from, to) => supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .range(from, to))

      const projectIds = (projects || []).map((project) => project.id)
      const fetchProjectRows = async (table: 'rab_items' | 'actual_expenses') => {
        const rows: BackupRow[] = []
        for (let index = 0; index < projectIds.length; index += 100) {
          const projectIdBatch = projectIds.slice(index, index + 100)
          rows.push(...await fetchAllRows((from, to) => supabase
            .from(table)
            .select('*')
            .in('project_id', projectIdBatch)
            .range(from, to)))
        }
        return rows
      }
      const [rabItems, transactions, invoices, profiles] = await Promise.all([
        fetchProjectRows('rab_items'),
        fetchProjectRows('actual_expenses'),
        fetchAllRows((from, to) => supabase
          .from('invoices')
          .select('*')
          .eq('user_id', userId)
          .range(from, to)),
        fetchAllRows((from, to) => supabase
          .from('company_profiles')
          .select('*')
          .eq('user_id', userId)
          .range(from, to)),
      ])

      const data: BackupData = {
        projects: projects || [],
        rab_items: rabItems,
        bva_transactions: transactions,
        invoices,
        profiles,
      }

      downloadJSON(
        { version: '1.1.0', exported_at: new Date().toISOString(), data },
        `WiraDana_Backup_${new Date().toISOString().slice(0, 10)}.json`
      )
      setMessage({ text: 'Backup berhasil diunduh.', isError: false })
    } catch (error) {
      setMessage({ text: `Gagal mengekspor backup: ${getErrorMessage(error)}`, isError: true })
    } finally {
      setExporting(false)
    }
  }

  async function handleRestoreJSON(file: File) {
    if (!userId) {
      setMessage({ text: 'Sesi berakhir. Silakan masuk kembali.', isError: true })
      return
    }
    if (!file.name.toLowerCase().endsWith('.json')) {
      setMessage({ text: 'Pilih berkas backup dengan format JSON.', isError: true })
      return
    }

    setRestoring(true)
    setMessage(null)
    let restoreStep = 'membaca berkas'
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
        throw new Error('Format backup tidak valid: properti data tidak ditemukan.')
      }

      const rawData = (parsed as { data: unknown }).data
      if (!rawData || typeof rawData !== 'object' || !('projects' in rawData) || !Array.isArray(rawData.projects)) {
        throw new Error('Format backup tidak valid: data.projects harus berupa array.')
      }

      const source = rawData as Record<string, unknown>
      const getRows = (key: keyof BackupData, legacyKey?: string): BackupRow[] => {
        const rows = source[key] ?? (legacyKey ? source[legacyKey] : undefined)
        if (rows === undefined) return []
        if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
          throw new Error(`Format backup tidak valid: data.${key} harus berupa array objek.`)
        }
        return rows as BackupRow[]
      }

      const withUserId = (rows: BackupRow[], force = false) => rows.map((row) => (
        force || 'user_id' in row ? { ...row, user_id: userId } : row
      ))
      const projects = withUserId(getRows('projects'), true)
      const rabItems = withUserId(getRows('rab_items'))
      const transactions = withUserId(getRows('bva_transactions', 'actual_expenses'))
      const invoices = withUserId(getRows('invoices'), true)
      const profiles = withUserId(getRows('profiles', 'company_profiles'), true)

      if (projects.length) {
        restoreStep = 'menyimpan proyek'
        const { error } = await supabase.from('projects').upsert(projects)
        if (error) throw error
      }
      if (rabItems.length) {
        restoreStep = 'menyimpan item RAB'
        const { error } = await supabase.from('rab_items').upsert(rabItems)
        if (error) throw error
      }
      if (transactions.length) {
        restoreStep = 'menyimpan transaksi pengeluaran'
        const { error } = await supabase.from('actual_expenses').upsert(transactions)
        if (error) throw error
      }
      if (invoices.length) {
        restoreStep = 'menyimpan invoice'
        const { error } = await supabase.from('invoices').upsert(invoices)
        if (error) throw error
      }
      if (profiles.length) {
        restoreStep = 'menyimpan profil perusahaan'
        const { error } = await supabase.from('company_profiles').upsert(profiles)
        if (error) throw error
      }

      setMessage({ text: 'Data berhasil dipulihkan!', isError: false })
      window.alert('Data berhasil dipulihkan!')
      window.location.reload()
    } catch (error) {
      setMessage({ text: `Gagal memulihkan data (${restoreStep}): ${getErrorMessage(error)}`, isError: true })
    } finally {
      setRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleFile(file?: File) {
    if (file) void handleRestoreJSON(file)
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">Memuat pengaturan...</div>
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Backup & Pemulihan Data</h1>
        <p className="mt-1 text-sm text-slate-500">Simpan salinan data proyek Anda atau pulihkan dari berkas backup WiraDana.</p>
      </header>

      {message && (
        <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${message.isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {message.text}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-purple-50 p-3 text-[#714B67]"><Database className="h-5 w-5" /></div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">Ekspor Backup Lengkap</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Unduh proyek, RAB, transaksi aktual, invoice, dan profil perusahaan dalam satu berkas JSON.
            </p>
            <button
              type="button"
              onClick={handleExportJSON}
              disabled={exporting}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#714B67] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5f3d56] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Menyiapkan backup...' : 'Unduh Backup JSON'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-sky-50 p-3 text-sky-700"><FileJson className="h-5 w-5" /></div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">Pulihkan dari Backup</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Data dalam berkas akan digabungkan ke akun aktif. Data yang cocok berdasarkan ID akan diperbarui.
            </p>
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                handleFile(event.dataTransfer.files[0])
              }}
              className={`mt-5 rounded-lg border border-dashed p-8 text-center transition ${dragging ? 'border-[#714B67] bg-purple-50' : 'border-slate-300 bg-slate-50'}`}
            >
              <Upload className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">Seret berkas backup JSON ke sini</p>
              <p className="mt-1 text-xs text-slate-500">atau pilih berkas dari perangkat Anda</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring}
                className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60"
              >
                {restoring ? 'Memulihkan data...' : 'Pilih Berkas JSON'}
              </button>
            </div>
            <p className="mt-3 text-xs text-amber-700">Pemulihan tidak menghapus data yang sudah ada. Pastikan berkas backup berasal dari sumber tepercaya.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
