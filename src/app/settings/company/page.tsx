'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CompanySettingsPage() {
  const router = useRouter()
  const logoInputRef = useRef<HTMLInputElement>(null)
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
  const [logoFile, setLogoFile] = useState<File | null>(null)
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

    if (logoFile && (!['image/png', 'image/jpeg', 'image/webp'].includes(logoFile.type) || logoFile.size > 2 * 1024 * 1024)) {
      setSaving(false)
      setMessage('Logo harus berupa PNG, JPG, atau WebP dengan ukuran maksimal 2 MB.')
      return
    }

    let savedLogoUrl = logoUrl
    let uploadedLogoPath: string | null = null
    if (logoFile) {
      const extensionByType: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
      }
      uploadedLogoPath = `${session.user.id}/${Date.now()}.${extensionByType[logoFile.type]}`
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(uploadedLogoPath, logoFile, {
          cacheControl: '3600',
          contentType: logoFile.type,
          upsert: false,
        })

      if (uploadError) {
        setSaving(false)
        setMessage(`Gagal mengunggah logo: ${uploadError.message}`)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(uploadedLogoPath)
      savedLogoUrl = publicUrlData.publicUrl
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
          logo_url: savedLogoUrl,
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
          logo_url: savedLogoUrl,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_holder: bankAccountHolder
        })
      error = res.error
    }

    setSaving(false)
    if (error) {
      let cleanupMessage = ''
      if (uploadedLogoPath) {
        const { error: cleanupError } = await supabase.storage
          .from('company-logos')
          .remove([uploadedLogoPath])
        if (cleanupError) cleanupMessage = ` Gagal membersihkan unggahan logo: ${cleanupError.message}`
      }
      setMessage(`Gagal menyimpan pengaturan: ${error.message}${cleanupMessage}`)
    } else {
      setLogoUrl(savedLogoUrl)
      setLogoFile(null)
      if (logoInputRef.current) logoInputRef.current.value = ''
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
              <label htmlFor="company-logo" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Upload Logo Kop Surat (PNG, JPG, WebP; maks. 2 MB)</label>
              <input
                ref={logoInputRef}
                id="company-logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
              />
              {logoFile && <p className="mt-1 text-xs text-slate-500">Terpilih: {logoFile.name}. Simpan pengaturan untuk mengunggah logo.</p>}
              {logoUrl && (
                <Image src={logoUrl} alt="Logo perusahaan saat ini" width={192} height={64} unoptimized className="mt-3 max-h-16 max-w-48 object-contain" />
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