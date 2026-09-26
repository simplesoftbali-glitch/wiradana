'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Plus, Receipt } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

interface Project {
  id: string
  name: string
}

interface RabItem {
  id: string
  name: string
  category: string | null
  unit: string | null
  quantity: number
  unit_price: number
}

interface InvoiceLine {
  code: string
  name: string
  description: string
  unit: string
  quantity: number
  unitPrice: number
  discountPercent: number
}

interface InvoiceSummary {
  id: string
  invoice_number: string
  invoice_date: string
  recipient_name: string
  items: unknown
  discount_amount: number
  tax_rate: number
  other_fees: number
}

interface CompanyProfile {
  company_name: string | null
  tagline: string | null
  address: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
}

function todayLocal() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)
}

function parseLines(value: unknown): InvoiceLine[] {
  if (!Array.isArray(value)) return []
  const lines: InvoiceLine[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const line = item as Record<string, unknown>
    if (typeof line.name !== 'string'
      || typeof line.quantity !== 'number'
      || typeof line.unitPrice !== 'number'
      || typeof line.discountPercent !== 'number') continue
    lines.push({
      code: typeof line.code === 'string' ? line.code : '',
      name: line.name,
      description: typeof line.description === 'string' ? line.description : '',
      unit: typeof line.unit === 'string' ? line.unit : 'unit',
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPercent: line.discountPercent,
    })
  }
  return lines
}

function invoiceTotal(invoice: InvoiceSummary) {
  const subtotal = parseLines(invoice.items).reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  )
  const lineDiscount = parseLines(invoice.items).reduce(
    (sum, line) => sum + line.quantity * line.unitPrice * line.discountPercent / 100,
    0
  )
  const taxBase = Math.max(0, subtotal - lineDiscount - Number(invoice.discount_amount || 0))
  return taxBase + taxBase * Number(invoice.tax_rate || 0) / 100 + Number(invoice.other_fees || 0)
}

export default function ProjectInvoicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [rabItems, setRabItems] = useState<RabItem[]>([])
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(todayLocal())
  const [recipientName, setRecipientName] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Transfer')
  const [poNumber, setPoNumber] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [taxRate, setTaxRate] = useState('0')
  const [otherFees, setOtherFees] = useState('0')
  const [preparedBy, setPreparedBy] = useState('')
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({})
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [discounts, setDiscounts] = useState<Record<string, string>>({})

  const loadPage = useCallback(async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      setError(`Gagal memeriksa sesi: ${sessionError.message}`)
      setLoading(false)
      return
    }
    if (!session) {
      router.push('/login')
      return
    }

    setUserId(session.user.id)
    setUserEmail(session.user.email || '')
    setPreparedBy(session.user.email?.split('@')[0] || '')

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('user_id', session.user.id)
      .single()

    if (projectError || !projectData) {
      setError(`Gagal memuat proyek: ${projectError?.message || 'Proyek tidak ditemukan.'}`)
      setLoading(false)
      return
    }
    setProject(projectData)

    const [rabResult, invoiceResult, profileResult] = await Promise.all([
      supabase.from('rab_items').select('*').eq('project_id', projectId),
      supabase.from('invoices').select('*').eq('project_id', projectId).eq('user_id', session.user.id).order('invoice_date', { ascending: false }),
      supabase.from('company_profiles').select('*').eq('user_id', session.user.id).maybeSingle(),
    ])

    if (rabResult.error) {
      setError(`Gagal memuat item RAB: ${rabResult.error.message}`)
    } else {
      const items = (rabResult.data || []) as RabItem[]
      setRabItems(items)
      setSelectedItems(Object.fromEntries(items.map((item) => [item.id, true])))
      setQuantities(Object.fromEntries(items.map((item) => [item.id, String(item.quantity || 0)])))
      setDiscounts(Object.fromEntries(items.map((item) => [item.id, '0'])))
    }

    if (invoiceResult.error) {
      setError(`Gagal memuat daftar invoice: ${invoiceResult.error.message}`)
    } else {
      setInvoices((invoiceResult.data || []) as InvoiceSummary[])
    }

    if (profileResult.error) {
      setError(`Gagal memuat pengaturan perusahaan: ${profileResult.error.message}`)
    } else {
      setProfile(profileResult.data as CompanyProfile | null)
    }

    const date = todayLocal()
    const [year, month] = date.split('-')
    const prefix = `SI.${year}.${month}.`
    const { data: monthlyInvoices, error: numberError } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('user_id', session.user.id)
      .gte('invoice_date', `${year}-${month}-01`)
      .lt('invoice_date', month === '12' ? `${Number(year) + 1}-01-01` : `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`)

    if (numberError) {
      setError(`Gagal menyiapkan nomor invoice: ${numberError.message}`)
    } else {
      const nextNumber = (monthlyInvoices || []).filter((row) => row.invoice_number.startsWith(prefix)).length + 1
      setInvoiceNumber(`${prefix}${String(nextNumber).padStart(5, '0')}`)
    }
    setLoading(false)
  }, [projectId, router])

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      await Promise.resolve()
      if (!cancelled) await loadPage()
    }
    void start()
    return () => {
      cancelled = true
    }
  }, [loadPage])

  const draftSubtotal = useMemo(() => rabItems.reduce((sum, item) => {
    if (!selectedItems[item.id]) return sum
    const quantity = Number(quantities[item.id] || 0)
    const discount = Number(discounts[item.id] || 0)
    return sum + quantity * Number(item.unit_price || 0) * (1 - discount / 100)
  }, 0), [rabItems, selectedItems, quantities, discounts])

  async function handleCreateInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const selectedLines = rabItems.filter((item) => selectedItems[item.id]).map((item, index) => {
      const quantity = Number(quantities[item.id])
      const discountPercent = Number(discounts[item.id])
      return {
        code: String(index + 1).padStart(3, '0'),
        name: item.name,
        description: item.category || '',
        unit: item.unit || 'unit',
        quantity,
        unitPrice: Number(item.unit_price || 0),
        discountPercent,
      }
    })

    if (!recipientName.trim()) {
      setError('Nama klien/perusahaan tujuan wajib diisi.')
      return
    }
    if (!selectedLines.length || selectedLines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0)) {
      setError('Pilih setidaknya satu item dengan kuantitas lebih dari nol.')
      return
    }
    if (selectedLines.some((line) => !Number.isFinite(line.discountPercent) || line.discountPercent < 0 || line.discountPercent > 100)) {
      setError('Diskon item harus berada di antara 0 dan 100 persen.')
      return
    }

    const globalDiscount = Number(discountAmount)
    const tax = Number(taxRate)
    const fee = Number(otherFees)
    if (![globalDiscount, tax, fee].every((value) => Number.isFinite(value) && value >= 0)) {
      setError('Diskon, PPN, dan biaya lain-lain harus berupa angka nol atau lebih.')
      return
    }
    if (!invoiceNumber.trim() || !invoiceDate) {
      setError('Nomor dan tanggal invoice wajib diisi.')
      return
    }

    setSaving(true)
    const { data, error: insertError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        project_id: projectId,
        project_name: project?.name || '',
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        recipient_name: recipientName.trim(),
        recipient_address: recipientAddress.trim(),
        payment_terms: paymentTerms.trim() || 'Transfer',
        po_number: poNumber.trim(),
        currency: 'IDR',
        items: selectedLines,
        discount_amount: globalDiscount,
        tax_rate: tax,
        other_fees: fee,
        prepared_by: preparedBy.trim(),
        company_details: {
          companyName: profile?.company_name || '',
          tagline: profile?.tagline || '',
          address: profile?.address || '',
          phone: profile?.phone || '',
          email: profile?.email || '',
          logoUrl: profile?.logo_url || '',
        },
        payment_details: {
          bankName: profile?.bank_name || '',
          accountNumber: profile?.bank_account_number || '',
          accountHolder: profile?.bank_account_holder || '',
        },
      })
      .select('id')
      .single()

    setSaving(false)
    if (insertError || !data) {
      setError(`Gagal menyimpan invoice: ${insertError?.message || 'Data invoice tidak dikembalikan.'}`)
      return
    }

    router.push(`/invoices/${data.id}`)
  }

  if (loading) {
    return <div className="p-10 text-sm text-slate-600">Memuat invoice...</div>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Proyek
        </Link>
        <button
          type="button"
          onClick={() => {
            setError('')
            setShowForm((visible) => !visible)
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#714B67] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#5a3b52]"
        >
          <Plus className="h-4 w-4" /> Buat Invoice
        </button>
      </div>

      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-slate-900">Invoice Proyek</h1>
        <p className="mt-1 text-sm text-slate-600">{project?.name}</p>
      </div>

      {error && (
        <div role="alert" className="print:hidden rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreateInvoice} className="print:hidden space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Data Invoice Baru</h2>
            <p className="mt-1 text-sm text-slate-500">
              Informasi kop dan rekening diambil dari <Link href="/settings/company" className="font-semibold text-[#714B67] underline">Pengaturan Kop</Link> dan disimpan sebagai snapshot invoice.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="text-xs font-semibold text-slate-700">
              Nomor Invoice
              <input required value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Tanggal
              <input required type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Syarat Pembayaran
              <input value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} placeholder="C.O.D / Transfer" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Kepada
              <input required value={recipientName} onChange={(event) => setRecipientName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              PO No
              <input value={poNumber} onChange={(event) => setPoNumber(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Disiapkan Oleh
              <input value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} placeholder={userEmail} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-semibold text-slate-700 md:col-span-3">
              Alamat Klien
              <textarea rows={2} value={recipientAddress} onChange={(event) => setRecipientAddress(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Item Tagihan dari RAB</h3>
              <p className="text-xs text-slate-500">Pilih item/kuantitas yang ditagihkan pada invoice ini.</p>
            </div>
            {rabItems.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Proyek belum memiliki item RAB untuk ditagihkan.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="w-10 px-3 py-2.5">Pilih</th>
                      <th className="px-3 py-2.5">Item</th>
                      <th className="px-3 py-2.5 text-right">Kuantitas</th>
                      <th className="px-3 py-2.5 text-right">Harga</th>
                      <th className="px-3 py-2.5 text-right">Diskon %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rabItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2.5">
                          <input type="checkbox" checked={Boolean(selectedItems[item.id])} onChange={(event) => setSelectedItems((current) => ({ ...current, [item.id]: event.target.checked }))} aria-label={`Pilih ${item.name}`} />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-slate-900">{item.name}</span>
                          <span className="ml-2 text-xs text-slate-500">{item.category || ''}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input type="number" min="0.01" step="any" value={quantities[item.id] ?? ''} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))} className="w-24 rounded border border-slate-300 px-2 py-1 text-right" aria-label={`Kuantitas ${item.name}`} />
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">{formatRupiah(Number(item.unit_price || 0))}</td>
                        <td className="px-3 py-2.5 text-right">
                          <input type="number" min="0" max="100" step="any" value={discounts[item.id] ?? '0'} onChange={(event) => setDiscounts((current) => ({ ...current, [item.id]: event.target.value }))} className="w-20 rounded border border-slate-300 px-2 py-1 text-right" aria-label={`Diskon ${item.name}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="text-xs font-semibold text-slate-700">
              Diskon Invoice (Rp)
              <input type="number" min="0" step="any" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              PPN (%)
              <input type="number" min="0" step="any" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Biaya Lain-lain (Rp)
              <input type="number" min="0" step="any" value={otherFees} onChange={(event) => setOtherFees(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600">Subtotal setelah diskon per item: <strong className="font-mono text-slate-900">Rp {formatRupiah(draftSubtotal)}</strong></p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Batal</button>
              <button type="submit" disabled={saving || rabItems.length === 0} className="rounded-lg bg-[#714B67] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan & Buka Invoice'}
              </button>
            </div>
          </div>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Riwayat Invoice</h2>
        {invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <Receipt className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-800">Belum ada invoice untuk proyek ini.</p>
            <p className="mt-1 text-xs text-slate-500">Invoice baru akan tersimpan di sini dan dapat dicetak kembali.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nomor</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Kepada</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{invoice.invoice_number}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(`${invoice.invoice_date}T00:00:00`).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-slate-800">{invoice.recipient_name}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">Rp {formatRupiah(invoiceTotal(invoice))}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/invoices/${invoice.id}`} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        <FileText className="h-3.5 w-3.5" /> Buka / Cetak
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
