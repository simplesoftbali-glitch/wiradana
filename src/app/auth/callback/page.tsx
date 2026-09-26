'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function completeAuth() {
      const params = new URLSearchParams(window.location.search)
      const authError = params.get('error_description') || params.get('error')
      if (authError) {
        setError(authError)
        return
      }

      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!data.session) {
          throw new Error('Sesi tidak ditemukan. Tautan mungkin sudah kedaluwarsa atau telah digunakan.')
        }
        if (!active) return
        router.replace('/projects')
        router.refresh()
      } catch (callbackError) {
        if (active) {
          setError(callbackError instanceof Error ? callbackError.message : 'Verifikasi email gagal.')
        }
      }
    }

    void completeAuth()
    return () => {
      active = false
    }
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-lg font-bold text-slate-900">Verifikasi tidak berhasil</h1>
            <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>
            <Link href="/login" className="mt-6 inline-flex rounded-lg bg-[#714B67] px-4 py-2.5 text-sm font-bold text-white">
              Kembali ke halaman masuk
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-slate-900">Memverifikasi akun</h1>
            <p className="mt-2 text-sm text-slate-600">Mohon tunggu, Anda akan diarahkan ke aplikasi.</p>
          </>
        )}
      </div>
    </main>
  )
}
