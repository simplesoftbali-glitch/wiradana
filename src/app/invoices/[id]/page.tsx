'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

interface InvoiceLine {
  code: string
  name: string
  description: string
  unit: string
  quantity: number
  unitPrice: number
  discountPercent: number
}

interface CompanyDetails {
  companyName: string
  tagline: string
  address: string
  phone: string
  email: string
  logoUrl: string
}

interface PaymentDetails {
  bankName: string
  accountNumber: string
  accountHolder: string
}

interface Invoice {
  id: string
  project_id: string
  invoice_number: string
  invoice_date: string
  recipient_name: string
  recipient_address: string
  payment_terms: string
  po_number: string
  currency: string
  project_name: string
  items: unknown
  discount_amount: number
  tax_rate: number
  other_fees: number
  prepared_by: string
  company_details: unknown
  payment_details: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseLines(value: unknown): InvoiceLine[] {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    if (!isRecord(item)
      || typeof item.name !== 'string'
      || typeof item.quantity !== 'number'
      || typeof item.unitPrice !== 'number'
      || typeof item.discountPercent !== 'number') {
      throw new Error(`Rincian item invoice ke-${index + 1} tidak valid.`)
    }
    return {
      code: typeof item.code === 'string' ? item.code : String(index + 1).padStart(3, '0'),
      name: item.name,
      description: typeof item.description === 'string' ? item.description : '',
      unit: typeof item.unit === 'string' ? item.unit : 'unit',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
    }
  })
}

function parseCompanyDetails(value: unknown): CompanyDetails {
  const details = isRecord(value) ? value : {}
  return {
    companyName: typeof details.companyName === 'string' ? details.companyName : '',
    tagline: typeof details.tagline === 'string' ? details.tagline : '',
    address: typeof details.address === 'string' ? details.address : '',
    phone: typeof details.phone === 'string' ? details.phone : '',
    email: typeof details.email === 'string' ? details.email : '',
    logoUrl: typeof details.logoUrl === 'string' ? details.logoUrl : '',
  }
}

function parsePaymentDetails(value: unknown): PaymentDetails {
  const details = isRecord(value) ? value : {}
  return {
    bankName: typeof details.bankName === 'string' ? details.bankName : '',
    accountNumber: typeof details.accountNumber === 'string' ? details.accountNumber : '',
    accountHolder: typeof details.accountHolder === 'string' ? details.accountHolder : '',
  }
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function terbilang(value: number): string {
  const number = Math.floor(Math.abs(value))
  const belowTwenty = [
    'nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
    'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas',
    'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas',
  ]

  function say(input: number): string {
    if (input < 20) return belowTwenty[input]
    if (input < 100) return `${say(Math.floor(input / 10))} puluh${input % 10 ? ` ${say(input % 10)}` : ''}`
    if (input < 200) return `seratus${input % 100 ? ` ${say(input % 100)}` : ''}`
    if (input < 1000) return `${say(Math.floor(input / 100))} ratus${input % 100 ? ` ${say(input % 100)}` : ''}`
    if (input < 2000) return `seribu${input % 1000 ? ` ${say(input % 1000)}` : ''}`

    const scales = [
      { value: 1_000_000_000_000, name: 'triliun' },
      { value: 1_000_000_000, name: 'miliar' },
      { value: 1_000_000, name: 'juta' },
      { value: 1000, name: 'ribu' },
    ]
    const scale = scales.find((item) => input >= item.value)
    if (!scale) return belowTwenty[0]
    const whole = Math.floor(input / scale.value)
    const remainder = input % scale.value
    const prefix = scale.value === 1000 && whole === 1 ? 'seribu' : `${say(whole)} ${scale.name}`
    return `${prefix}${remainder ? ` ${say(remainder)}` : ''}`
  }

  return `${say(number)} rupiah`
}

export default function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: invoiceId } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [company, setCompany] = useState<CompanyDetails | null>(null)
  const [payment, setPayment] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.classList.add('invoice-print-mode')
    return () => document.body.classList.remove('invoice-print-mode')
  }, [])

  useEffect(() => {
    async function loadInvoice() {
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

      const { data, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', session.user.id)
        .single()

      if (invoiceError || !data) {
        setError(`Gagal memuat invoice: ${invoiceError?.message || 'Invoice tidak ditemukan.'}`)
        setLoading(false)
        return
      }

      try {
        const invoiceData = data as Invoice
        const parsedLines = parseLines(invoiceData.items)
        setLines(parsedLines)
        setCompany(parseCompanyDetails(invoiceData.company_details))
        setPayment(parsePaymentDetails(invoiceData.payment_details))
        setInvoice(invoiceData)
      } catch (parseError) {
        setError(parseError instanceof Error ? parseError.message : 'Rincian invoice tidak valid.')
      } finally {
        setLoading(false)
      }
    }

    loadInvoice()
  }, [invoiceId, router])

  if (loading) {
    return <div className="p-10 text-sm text-slate-600">Memuat invoice...</div>
  }

  if (error || !invoice || !company || !payment) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error || 'Data invoice tidak lengkap.'}
        <div className="print:hidden mt-4">
          <Link href="/" className="font-semibold underline">Kembali</Link>
        </div>
      </div>
    )
  }

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const lineDiscount = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice * line.discountPercent / 100,
    0
  )
  const discount = lineDiscount + Number(invoice.discount_amount || 0)
  const taxBase = Math.max(0, subtotal - discount)
  const tax = taxBase * Number(invoice.tax_rate || 0) / 100
  const otherFees = Number(invoice.other_fees || 0)
  const total = taxBase + tax + otherFees

  return (
    <div className="mx-auto max-w-5xl">
      <div className="print:hidden mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/projects/${invoice.project_id}/invoices`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Invoice
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#714B67] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#5a3b52]"
        >
          <Printer className="h-4 w-4" /> Cetak Invoice
        </button>
      </div>

      <article className="invoice-sheet bg-white p-8 text-slate-900 shadow-sm print:shadow-none">
        <div className="grid grid-cols-1 gap-6 border-b-2 border-slate-900 pb-5 md:grid-cols-[1.2fr_0.8fr]">
          <div className="flex items-start gap-4">
            {company.logoUrl ? (
              <Image src={company.logoUrl} alt={`Logo ${company.companyName}`} width={112} height={80} unoptimized className="max-h-20 max-w-28 object-contain" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-slate-300 text-[10px] font-bold tracking-widest text-slate-500">LOGO</div>
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold uppercase tracking-wide">
                {company.companyName || 'Nama Perusahaan Belum Diatur'}
              </h2>
              {company.tagline && <p className="mt-1 text-xs font-semibold text-slate-700">{company.tagline}</p>}
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-700">
                {company.address || 'Alamat belum diatur'}
              </p>
              <p className="mt-1 text-xs text-slate-700">
                {[company.phone && `Telp. ${company.phone}`, company.email].filter(Boolean).join(' | ') || 'Kontak belum diatur'}
              </p>
            </div>
          </div>
          <div className="md:text-right">
            <h1 className="text-4xl font-black tracking-wide text-slate-900">Invoice</h1>
            <div className="mt-3 text-left text-sm md:ml-auto md:max-w-xs">
              <p className="font-bold">Kepada:</p>
              <p className="mt-1 font-semibold">{invoice.recipient_name}</p>
              {invoice.recipient_address && <p className="mt-1 whitespace-pre-line text-xs text-slate-700">{invoice.recipient_address}</p>}
            </div>
          </div>
        </div>

        <div className="my-5 grid grid-cols-2 gap-x-6 gap-y-3 border-b border-slate-300 pb-5 text-xs md:grid-cols-3">
          <div><span className="font-semibold text-slate-600">Tanggal:</span><p className="mt-1 font-semibold">{formatDate(invoice.invoice_date)}</p></div>
          <div><span className="font-semibold text-slate-600">Nomor:</span><p className="mt-1 font-semibold">{invoice.invoice_number}</p></div>
          <div><span className="font-semibold text-slate-600">Syarat Pembayaran:</span><p className="mt-1 font-semibold">{invoice.payment_terms || '-'}</p></div>
          <div><span className="font-semibold text-slate-600">PO No / Proyek:</span><p className="mt-1 font-semibold">{invoice.po_number || '-'} / {invoice.project_name || '-'}</p></div>
          <div><span className="font-semibold text-slate-600">Mata Uang:</span><p className="mt-1 font-semibold">Indonesian Rupiah ({invoice.currency || 'IDR'})</p></div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-y-2 border-slate-900 bg-slate-100 text-left text-slate-900">
                <th className="px-2 py-2.5">Kode</th>
                <th className="px-2 py-2.5">Nama Barang / Deskripsi Pekerjaan</th>
                <th className="px-2 py-2.5 text-right">Kts</th>
                <th className="px-2 py-2.5 text-right">@Harga</th>
                <th className="px-2 py-2.5 text-right">Diskon</th>
                <th className="px-2 py-2.5 text-right">Total Harga</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const gross = line.quantity * line.unitPrice
                const lineDiscountAmount = gross * line.discountPercent / 100
                return (
                  <tr key={`${line.code}-${index}`} className="break-inside-avoid border-b border-slate-300 align-top">
                    <td className="px-2 py-3 font-mono">{line.code}</td>
                    <td className="px-2 py-3">
                      <span className="font-semibold">{line.name}</span>
                      <span className="mt-1 block text-[10px] text-slate-600">
                        {[line.description, line.unit].filter(Boolean).join(' · ')}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right font-mono">{line.quantity} {line.unit}</td>
                    <td className="px-2 py-3 text-right font-mono">{formatRupiah(line.unitPrice)}</td>
                    <td className="px-2 py-3 text-right font-mono">
                      {line.discountPercent ? `${line.discountPercent}% (${formatRupiah(lineDiscountAmount)})` : '-'}
                    </td>
                    <td className="px-2 py-3 text-right font-mono font-semibold">{formatRupiah(gross - lineDiscountAmount)}</td>
                  </tr>
                )
              })}
              {lines.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-8 text-center text-slate-600">Tidak ada item pada invoice ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5 text-xs">
            <div>
              <p className="font-bold">Terbilang:</p>
              <p className="mt-1 rounded-md border border-slate-300 px-3 py-2 font-semibold italic capitalize">
                {terbilang(Math.round(total))}
              </p>
            </div>
            <div>
              <p className="font-bold">Keterangan / Pembayaran:</p>
              <div className="mt-1 space-y-1 text-slate-700">
                <p>Bank: <span className="font-semibold text-slate-900">{payment.bankName || '-'}</span></p>
                <p>Nomor Rekening: <span className="font-semibold text-slate-900">{payment.accountNumber || '-'}</span></p>
                <p>Atas Nama: <span className="font-semibold text-slate-900">{payment.accountHolder || '-'}</span></p>
              </div>
            </div>
            <div className="pt-2">
              <p className="font-bold">Disiapkan Oleh</p>
              <div className="mt-12 min-h-8 border-b border-slate-700" />
              <p className="mt-2 font-semibold">{invoice.prepared_by || ' '}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-200 py-2">
              <span>Sub Total</span><span className="font-mono">Rp {formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-200 py-2">
              <span>Diskon</span><span className="font-mono">Rp {formatRupiah(discount)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-200 py-2">
              <span>PPN ({Number(invoice.tax_rate || 0)}%)</span><span className="font-mono">Rp {formatRupiah(tax)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-200 py-2">
              <span>Biaya Lain-lain</span><span className="font-mono">Rp {formatRupiah(otherFees)}</span>
            </div>
            <div className="invoice-total mt-2 flex justify-between gap-4 rounded-md bg-[#714B67] px-3 py-3 text-base font-extrabold text-white print:border print:border-slate-900 print:bg-white print:text-slate-900">
              <span>Total</span><span className="font-mono">Rp {formatRupiah(total)}</span>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
