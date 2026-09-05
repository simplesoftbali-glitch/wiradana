'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase'; // Sesuaikan jalur relatif jika diperlukan
import { 
  LayoutDashboard, 
  FolderKanban, 
  Calculator, 
  LineChart, 
  MessageSquarePlus, 
  Inbox, 
  Menu, 
  X,
  LogOut,
  User
} from 'lucide-react';

interface SidebarProps {
  userEmail?: string | null;
}

export default function Sidebar({ userEmail: initialUserEmail }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail || null);
  const pathname = usePathname();
  const router = useRouter();

  // Ambil sesi secara mandiri di dalam sidebar jika props belum tersedia
  useEffect(() => {
    if (!initialUserEmail) {
      async function getUserSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
      }
      getUserSession();
    } else {
      setUserEmail(initialUserEmail);
    }
  }, [initialUserEmail]);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Proyek & RAB', href: '/projects', icon: FolderKanban },
    { name: 'Kalkulator/BVA', href: '/bva', icon: Calculator },
    { name: 'Laporan & Cash Flow', href: '/reports', icon: LineChart },
    { name: 'Kotak Masuk', href: '/inbox', icon: Inbox },
    { name: 'Feedback', href: '/feedback', icon: MessageSquarePlus },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      {/* Tombol Hamburger Menu untuk Mobile */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 border-b border-slate-800">
        <span className="font-bold text-lg tracking-wider text-emerald-400">WiraDana</span>
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay latar belakang saat sidebar mobile terbuka */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Konten Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:inset-auto border-r border-slate-800
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header Sidebar (Desktop) */}
        <div className="p-6 hidden md:flex items-center justify-between border-b border-slate-800">
          <h1 className="text-xl font-bold text-emerald-400 tracking-wider">WiraDana</h1>
        </div>

        {/* Profil Pengguna / User Email */}
        <div className="px-4 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Masuk sebagai</span>
              <p className="text-xs font-medium text-slate-200 truncate" title={userEmail || 'Pengguna'}>
                {userEmail || 'Memuat akun...'}
              </p>
            </div>
          </div>
        </div>

        {/* Daftar Menu Navigasi */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Tombol Logout & Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 text-red-400 hover:text-red-300 py-2.5 px-4 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <LogOut size={16} />
            <span>Keluar (Logout)</span>
          </button>
          <div className="text-[10px] text-slate-600 text-center font-mono">
            WiraDana Mobile v1.0
          </div>
        </div>
      </aside>
    </>
  );
}