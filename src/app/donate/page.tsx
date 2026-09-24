'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, Heart } from 'lucide-react'

const nmid = 'ID1026601511748'

export default function DonatePage() {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  async function copyNmid() {
    try {
      await navigator.clipboard.writeText(nmid)
      setCopyError(false)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyError(true)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#714B67]"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Halaman Utama
        </Link>

        <div className="mt-8 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid-cols-[minmax(0,1fr)_360px]">
          <section className="p-6 md:p-10">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[#714B67]">
              <Heart className="h-4 w-4" />
              Dukung WiraDana
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Bantu operasional dan pengembangan WiraDana
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
              WiraDana dikembangkan gratis untuk membantu rekan teknis dan kontraktor lokal. Dukungan Anda membantu menjaga server tetap berjalan dan fitur terus berkembang.
            </p>

            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">NMID QRIS</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <code className="flex-1 break-all text-lg font-bold tracking-wide text-slate-900">{nmid}</code>
                <button
                  type="button"
                  onClick={copyNmid}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#714B67] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#5a3b52]"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Tersalin' : 'Salin NMID'}
                </button>
              </div>
              {copyError && (
                <p role="alert" className="mt-2 text-xs text-rose-700">
                  NMID belum tersalin. Silakan salin secara manual.
                </p>
              )}
            </div>
          </section>

          <aside className="flex flex-col items-center justify-center border-t border-slate-200 bg-[#714B67]/5 p-6 md:border-l md:border-t-0">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <img
                src="/qris.jpeg"
                alt="QRIS I KADEK EDY WARSITO, SE, SOFTWARE"
                className="h-auto w-full max-w-[300px] rounded-lg"
              />
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              Scan QRIS menggunakan aplikasi pembayaran pilihan Anda.
            </p>
          </aside>
        </div>
      </div>
    </main>
  )
}
