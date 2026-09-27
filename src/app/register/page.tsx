'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phone,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        alert('Gagal Mendaftar: ' + error.message)
      } else if (data.session) {
        alert('Pendaftaran berhasil! Selamat datang di WiraDana.')
        router.push('/')
        router.refresh()
      } else if (data.user) {
        alert('Pendaftaran berhasil! Silakan masuk dengan akun Anda.')
        router.push('/login')
      } else {
        alert('Pendaftaran gagal: Supabase tidak mengembalikan data akun.')
      }
    } catch (error) {
      alert(`Gagal Mendaftar: ${error instanceof Error ? error.message : 'Terjadi kesalahan.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center gap-2">
            <span className="bg-[#714B67] w-3 h-3 rounded-full inline-block"></span>
            WiraDana
          </h1>
          <p className="text-slate-500 text-xs mt-1">Buat akun baru untuk isolasi data proyek Anda</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="contoh: I Ketut Agus Putra"
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#714B67] focus:ring-2 focus:ring-[#714B67]/15 transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">No. HP / WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="contoh: 085792834783"
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#714B67] focus:ring-2 focus:ring-[#714B67]/15 transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#714B67] focus:ring-2 focus:ring-[#714B67]/15 transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#714B67] focus:ring-2 focus:ring-[#714B67]/15 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#714B67] hover:bg-[#5e3d56] active:bg-[#503449] text-white font-bold py-2.5 rounded-lg text-sm transition shadow-sm cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'Memproses...' : 'Daftar Akun'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-[#714B67] hover:underline font-semibold">
            Masuk di sini
          </Link>
        </p>
      </div>
    </main>
  )
}