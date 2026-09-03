'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      alert('Gagal Masuk: ' + error.message)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <span className="bg-emerald-500 w-3 h-3 rounded-full inline-block"></span>
            WiraDana
          </h1>
          <p className="text-slate-400 text-xs mt-1">Masuk ke akun kontrol keuangan proyek Anda</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition shadow-lg cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Belum punya akun?{' '}
          <Link href="/register" className="text-emerald-400 hover:underline font-semibold">
            Daftar di sini
          </Link>
        </p>
      </div>
    </main>
  )
}