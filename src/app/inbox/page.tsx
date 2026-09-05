'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
// HAPUS baris import Sidebar ini karena sudah ditangani oleh layout.tsx:
// import Sidebar from '../../components/Sidebar'

interface BroadcastItem {
  id: string
  title: string
  message: string
  type: string
  created_at: string
}

export default function InboxPage() {
  const router = useRouter()
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchBroadcasts() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    setUserEmail(session.user.email || null)

    // Ambil data pengumuman broadcast dari Supabase
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) {
      setBroadcasts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBroadcasts()
  }, [router])

  return (
    /* Hapus kelas 'flex min-h-screen' dari kontainer utama ini agar tidak bentrok dengan layout.tsx */
    <div className="w-full">
      {/* 
        HAPUS baris pemanggilan Sidebar di sini:
        <Sidebar userEmail={userEmail} /> 
      */}

      {/* Konten Utama Halaman Inbox */}
      <main className="max-w-4xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">Kotak Masuk & Pengumuman</h1>
          <p className="text-slate-400 text-sm">
            Informasi terbaru, catatan pembaruan (changelog), dan pengumuman penting seputar aplikasi WiraDana.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">Memuat pesan...</div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-16 px-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 text-xl font-mono">
              📥
            </div>
            <h3 className="text-slate-200 font-semibold text-sm mb-1">Belum Ada Pesan Masuk</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              Saat ini belum ada pengumuman atau pembaruan fitur yang dikirimkan oleh pengembang.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {broadcasts.map((item) => (
              <div key={item.id} className="bg-slate-900/80 backdrop-blur border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-sky-950 text-sky-400 border border-sky-800 uppercase">
                      {item.type || 'Info'}
                    </span>
                    <h2 className="text-base font-bold text-white">{item.title}</h2>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  {item.message}
                </p>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}