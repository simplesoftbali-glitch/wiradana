'use client'

import './globals.css'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setLoading(false)
    }
    checkSession()

    // Mendengarkan perubahan status auth (login/logout) secara real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Tentukan apakah halaman ini adalah halaman publik (Landing Page '/', '/login', '/register')
  const isPublicPage = (pathname === '/' && !session) || pathname === '/login' || pathname === '/register'

  if (loading) {
    return (
      <html lang="id">
        <head>
          {/* Meta Tag Verifikasi Google Search Console */}
          <meta name="google-site-verification" content="MXq4efoBwfqcwlpgnXluIP2ECiDDHi7_8avXuGGRLpE" />
          <title>WiraDana - Aplikasi Estimasi RAB & Manajemen Keuangan Proyek Kontraktor</title>
          <meta name="description" content="Aplikasi manajemen proyek desktop-first untuk estimasi RAB, pencatatan pengeluaran harian, dan analisis Budget Variance Analysis (BVA) kontraktor." />
        </head>
        <body className="bg-slate-950 text-slate-100 antialiased">
          <div className="min-h-screen flex items-center justify-center font-mono text-xs text-slate-500">
            Memuat WiraDana...
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="id">
      <head>
        <title>WiraDana - Aplikasi Estimasi RAB & Manajemen Keuangan Proyek Kontraktor</title>
        <meta name="description" content="Solusi manajemen proyek desktop-first untuk menghitung estimasi RAB, mencatat pengeluaran harian lapangan, dan analisis Budget Variance Analysis (BVA) secara akurat." />
        <meta name="keywords" content="aplikasi RAB kontraktor, manajemen keuangan proyek, estimasi biaya bangunan, aplikasi konstruksi indonesia, budget variance analysis proyek, WiraDana" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://wiradana-one.vercel.app" />

        {/* Open Graph Meta Tags (Untuk Tampilan Media Sosial & AI Search Engine) */}
        <meta property="og:title" content="WiraDana - Aplikasi Estimasi RAB & Keuangan Proyek Kontraktor" />
        <meta property="og:description" content="Kelola RAB, catat realisasi pengeluaran proyek, dan cetak penawaran klien dengan profesional." />
        <meta property="og:url" content="https://wiradana-one.vercel.app" />
        <meta property="og:site_name" content="WiraDana" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="id_ID" />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased">
        {isPublicPage ? (
          // Jika di halaman publik (Belum login / Landing page / Login / Register): Tampilkan penuh tanpa Sidebar
          <main className="w-full min-h-screen">
            {children}
          </main>
        ) : (
          // Jika sudah login dan berada di dalam aplikasi (Dashboard, Proyek, RAB, dll): Tampilkan dengan Sidebar
          <div className="min-h-screen flex flex-col md:flex-row w-full">
            <Sidebar />
            <main className="flex-1 p-4 md:p-12 overflow-x-hidden w-full">
              {children}
            </main>
          </div>
        )}
      </body>
    </html>
  )
}