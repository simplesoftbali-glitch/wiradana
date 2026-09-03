'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

interface SidebarProps {
  userEmail?: string | null
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { name: '📁 Daftar Proyek', href: '/' },
    { name: '📥 Kotak Masuk', href: '/inbox' },       // <-- Tambahan menu Inbox
    { name: '💬 Bantuan & Feedback', href: '/feedback' },
  ]

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-6 shrink-hidden min-h-screen">
      <div>
        {/* Logo / Header Sidebar */}
        <div className="mb-8">
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="bg-emerald-500 w-2.5 h-2.5 rounded-full inline-block"></span>
            WiraDana
          </h1>
          <p className="text-slate-500 text-[11px] mt-1">Manajemen Proyek & RAB</p>
        </div>

        {/* Menu Navigasi */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bagian Bawah: Info User & Tombol Keluar */}
      <div className="pt-6 border-t border-slate-800 space-y-3">
        {userEmail && (
          <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider mb-0.5">Akun Aktif</span>
            <span className="text-xs text-slate-300 font-mono truncate block">{userEmail}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full bg-red-950/30 hover:bg-red-950/60 text-red-400 border border-red-900/40 text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
        >
          Keluar Aplikasi
        </button>
      </div>
    </aside>
  )
}