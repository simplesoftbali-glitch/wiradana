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
  User,
  Settings
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
    { name: 'Pengaturan Kop', href: '/settings/company', icon: Settings }, // Menu Pengaturan Kop Surat
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Gagal keluar dari akun:', error.message);
      return;
    }

    router.push('/');
  }

  return (
    <>
      {/* Tombol Hamburger Menu untuk Mobile (Ditambahkan kelas no-print) */}
      <div className="no-print md:hidden flex items-center justify-between bg-white text-slate-900 px-4 py-3 border-b border-slate-200">
        <span className="font-bold text-lg tracking-wider text-[#714B67]">WiraDana</span>
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay latar belakang saat sidebar mobile terbuka */}
      {isOpen && (
        <div 
          className="no-print fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Konten Sidebar (Ditambahkan kelas no-print) */}
      <aside className={`
        no-print fixed inset-y-0 left-0 z-50 w-72 overflow-x-hidden bg-white text-slate-600 flex flex-col transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:inset-auto md:h-16 md:w-full md:flex-row md:items-center md:px-6 md:shadow-sm border-b border-slate-200 md:border-r-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header Sidebar (Desktop) */}
        <div className="p-5 md:p-0 hidden md:flex md:order-1 items-center justify-between border-b border-slate-200 md:border-b-0 md:shrink-0">
          <h1 className="text-xl font-bold text-[#714B67] tracking-wider">WiraDana</h1>
        </div>

        {/* Profil Pengguna / User Email */}
        <div className="px-4 py-3 md:order-3 md:ml-3 md:px-0 md:py-0 border-b border-slate-200 bg-slate-50 md:border-b-0 md:border-l md:bg-white md:shrink-0">
          <div className="flex items-center gap-3 px-2 md:pl-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-[#714B67] shrink-0">
              <User size={16} />
            </div>
            <div className="min-w-0 max-w-[140px] overflow-hidden">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Masuk sebagai</span>
              <p className="max-w-[140px] truncate text-[11px] font-medium text-slate-500" title={userEmail || 'Pengguna'}>
                {userEmail || 'Memuat akun...'}
              </p>
            </div>
          </div>
        </div>

        {/* Daftar Menu Navigasi */}
        <nav className="flex-1 min-w-0 px-4 py-3 md:order-2 md:px-4 md:py-0 space-y-1 overflow-y-auto md:flex md:items-center md:justify-center md:gap-1 lg:gap-2 md:space-y-0 md:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap text-xs font-medium transition-colors ${
                  isActive 
                    ? 'bg-purple-100 text-[#714B67] shadow-sm'
                    : 'hover:bg-slate-100 hover:text-slate-900 text-slate-500'
                }`}
              >
                <Icon size={16} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Tombol Logout & Footer */}
        <div className="p-4 md:order-4 md:p-0 md:ml-3 border-t border-slate-200 space-y-3 md:border-t-0 md:shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer md:w-auto"
            title="Keluar"
          >
            <LogOut size={16} />
            <span className="md:hidden">Keluar (Logout)</span>
          </button>
          <div className="hidden text-[10px] text-slate-400 text-center font-mono">
            WiraDana Mobile v1.0
          </div>
        </div>
      </aside>
    </>
  );
}