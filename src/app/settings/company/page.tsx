'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CompanySettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [companyName, setCompanyName] = useState('')
  const [tagline, setTagline] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [footerNote, setFooterNote] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountHolder, setBankAccountHolder] = useState('')

  useEffect(() => {
    async function fetchProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (data) {
        setCompanyName(data.company_name || '')
        setTagline(data.tagline || '')
        setAddress(data.address || '')
        setPhone(data.phone || '')
        setEmail(data.email || '')
        setFooterNote(data.footer_note || '')
        setLogoUrl(data.logo_url || '')
        setBankName(data.bank_name || '')
        setBankAccountNumber(data.bank_account_number || '')
        setBankAccountHolder(data.bank_account_holder || '')
      }
      setLoading(false)
    }

    fetchProfile()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setSaving(false)
      setMessage('Sesi berakhir. Silakan masuk kembali.')
      return
    }

    const { data: existing } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    let error
    if (existing) {
      const res = await supabase
        .from('company_profiles')
        .update({
          company_name: companyName,
          tagline,
          address,
          phone,
          email,
          footer_note: footerNote,
          logo_url: logoUrl,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_holder: bankAccountHolder,
          updated_at: new Date()
        })
        .eq('user_id', session.user.id)
      error = res.error
    } else {
      const res = await supabase
        .from('company_profiles')
        .insert({
          user_id: session.user.id,
          company_name: companyName,
          tagline,
          address,
          phone,
          email,
          footer_note: footerNote,
          logo_url: logoUrl,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_holder: bankAccountHolder
        })
      error = res.error
    }

    setSaving(false)
    if (error) {
      setMessage(`Gagal menyimpan pengaturan: ${error.message}`)
    } else {
      setMessage('Profil kop surat berhasil disimpan!')
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 p-12 flex items-center justify-center font-mono text-sm">Memuat pengaturan...</div>
  }

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 transition">
          &larr; Kembali ke Dashboard
        </Link>

        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-extrabold text-white">Pengaturan Kop Surat & Perusahaan</h1>
          <p className="text-slate-400 text-sm">Informasi kop, logo, dan rekening ini akan dicetak pada invoice serta dokumen penawaran RAB.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-xs font-medium ${message.includes('berhasil') ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-400' : 'bg-red-950/50 border border-red-800 text-red-400'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Nama Usaha / Perusahaan</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Contoh: BARDI Smart Home Bali / CV. Wira Utama"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Bidang / Tagline Usaha</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Contoh: Kontraktor & Distributor Resmi Smart Home"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Alamat Kantor / Domisili</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. Contoh Alamat No. 123, Denpasar, Bali"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Email Resmi</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@domain.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Catatan Kaki Dokumen (Syarat & Ketentuan Singkat)</label>
            <textarea
              rows={2}
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              placeholder="Contoh: Harga penawaran berlaku selama 14 hari sejak tanggal diterbitkan."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-mono"
            />
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Informasi Invoice</h2>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">URL Logo Kop Surat</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://domain.com/logo.png"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              />
              {logoUrl && (
                <Image src={logoUrl} alt="Pratinjau logo perusahaan" width={192} height={56} unoptimized className="mt-3 h-14 max-w-48 object-contain" />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Nama Bank</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Contoh: Bank Mandiri"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Nama Pemilik Rekening</label>
                <input
                  type="text"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs uppercase px-6 py-3 rounded-xl transition cursor-pointer shadow-lg shadow-emerald-900/30"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan Kop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}