'use client'

import './globals.css'
import { usePathname } from 'next/navigation'
import Sidebar from '../components/Sidebar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Daftar halaman publik yang tidak boleh menampilkan Sidebar
  const isAuthPage = pathname === '/login' || pathname === '/register'

  return (
    <html lang="id">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {isAuthPage ? (
          // Jika di halaman Login/Register, tampilkan konten secara penuh tanpa Sidebar
          <main className="w-full min-h-screen">
            {children}
          </main>
        ) : (
          // Jika di halaman aplikasi (Dashboard, RAB, Feedback, dll), tampilkan dengan Sidebar
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