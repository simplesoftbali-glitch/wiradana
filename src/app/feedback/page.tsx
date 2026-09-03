'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'

interface FeedbackItem {
  id: string
  subject: string
  message: string
  category: string
  admin_reply: string | null
  status: string
  created_at: string
}

export default function FeedbackPage() {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('Saran')
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  async function fetchFeedbacks() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    setUserEmail(session.user.email || null)

    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) {
      setFeedbacks(data || [])
    }
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [router])

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault()
    if (!subject || !message) return alert('Subjek dan Pesan wajib diisi!')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('feedbacks').insert([
      {
        user_id: session.user.id,
        user_email: session.user.email,
        subject: subject,
        message: message,
        category: category,
        status: 'Pending'
      }
    ])
    setLoading(false)

    if (error) {
      alert('Gagal mengirim feedback: ' + error.message)
    } else {
      setSubject('')
      setMessage('')
      setCategory('Saran')
      alert('Feedback berhasil dikirim! Terima kasih atas masukan Anda.')
      fetchFeedbacks()
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigasi */}
      <Sidebar userEmail={userEmail} />

      {/* Konten Utama */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">Pusat Bantuan & Masukan (Feedback)</h1>
            <p className="text-slate-400 text-sm">
              Punya saran pengembangan, menemukan kendala (bug), atau ingin meminta fitur baru untuk WiraDana? Sampaikan di sini!
            </p>
          </div>

          {/* Form Kirim Feedback */}
          <form onSubmit={handleSubmitFeedback} className="bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl mb-10 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-emerald-400 flex items-center gap-2">
              <span>+</span> Kirim Pesan / Saran Baru
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Subjek / Judul</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Contoh: Tambah fitur cetak PDF laporan bulanan"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="Saran">Saran</option>
                  <option value="Bug">Laporan Bug</option>
                  <option value="Fitur Baru">Permintaan Fitur</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Pesan Detail</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Jelaskan saran atau kendala Anda secara detail..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                required
              ></textarea>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-sm transition shadow-lg cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Mengirim...' : 'Kirim Feedback'}
              </button>
            </div>
          </form>

          {/* Riwayat Feedback Pengguna */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl shadow-xl">
            <h2 className="text-base font-semibold text-slate-200 mb-6 border-b border-slate-800 pb-3">
              Riwayat Masukan & Tanggapan Anda
            </h2>

            {feedbacks.length === 0 ? (
              <div className="text-center py-12 px-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <p className="text-slate-500 text-xs">Belum ada riwayat feedback yang Anda kirimkan.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((item) => (
                  <div key={item.id} className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-xl space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                            {item.category}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">{item.subject}</h3>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${item.status === 'Selesai' ? 'bg-sky-950 text-sky-400 border border-sky-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                      {item.message}
                    </p>

                    {/* Bagian Tanggapan Admin / Developer */}
                    {item.admin_reply && (
                      <div className="mt-3 bg-emerald-950/20 border border-emerald-500/30 p-3.5 rounded-lg">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                          💬 Tanggapan Pengembang (WiraDana):
                        </span>
                        <p className="text-xs text-slate-200">{item.admin_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}