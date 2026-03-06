'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  Utensils,
  ShoppingCart,
  Receipt,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChefHat,
  Store,
  UserCircle,
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  HAMIRCHI: 'Hamirchi',
  SOTUVCHI: 'Sotuvchi',
  DOKONCHI: "Do'konchi",
};

const roleColors: Record<string, string> = {
  ADMIN: 'from-purple-500 to-indigo-500',
  HAMIRCHI: 'from-amber-500 to-orange-500',
  SOTUVCHI: 'from-emerald-500 to-teal-500',
  DOKONCHI: 'from-blue-500 to-cyan-500',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shiftType, setShiftType] = useState<'DAY' | 'NIGHT'>('DAY');

  useEffect(() => {
    const hour = new Date().getHours();
    setShiftType(hour >= 6 && hour < 18 ? 'DAY' : 'NIGHT');
  }, []);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);
      
      // Redirect if user tries to access wrong dashboard
      const currentPath = pathname.split('/')[1];
      const rolePathMap: Record<string, string> = {
        ADMIN: 'admin',
        HAMIRCHI: 'hamirchi',
        SOTUVCHI: 'sotuvchi',
        DOKONCHI: 'dokonchi',
      };
      
      if (data.user.role !== 'ADMIN' && currentPath !== rolePathMap[data.user.role]) {
        router.push(`/${rolePathMap[data.user.role]}`);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const getNavItems = () => {
    if (!user) return [];

    const items = [];

    if (user.role === 'ADMIN') {
      items.push(
        { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/admin/employees', icon: Users, label: 'Xodimlar' },
        { href: '/admin/reports', icon: FileText, label: 'Hisobotlar' }
      );
    }

    if (user.role === 'HAMIRCHI') {
      items.push(
        { href: '/hamirchi', icon: ChefHat, label: 'Hamir ishlar' }
      );
    }

    if (user.role === 'SOTUVCHI') {
      items.push(
        { href: '/sotuvchi', icon: ShoppingCart, label: 'Sotuv' }
      );
    }

    if (user.role === 'DOKONCHI') {
      items.push(
        { href: '/dokonchi', icon: Receipt, label: 'Xarajatlar' }
      );
    }

    return items;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-amber-300 border-t-amber-600 rounded-full"
        />
      </div>
    );
  }

  if (!user) return null;

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-amber-200/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleColors[user.role]} flex items-center justify-center`}>
              <span className="text-white font-bold text-sm">VP</span>
            </div>
            <div>
              <h1 className="font-bold text-amber-900 text-sm">Volidam Patir</h1>
              <p className="text-xs text-amber-600">{roleLabels[user.role]}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-amber-100 text-amber-700"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="lg:hidden fixed inset-0 z-40 bg-white pt-20"
          >
            <div className="p-4 space-y-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                      : 'text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </a>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Chiqish</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-white/80 backdrop-blur-xl border-r border-amber-200/50 flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-amber-200/50">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${roleColors[user.role]} flex items-center justify-center shadow-lg`}>
              <span className="text-white font-bold text-xl">VP</span>
            </div>
            <div>
              <h1 className="font-bold text-amber-900 text-lg">Volidam Patir</h1>
              <p className="text-sm text-amber-600">{roleLabels[user.role]}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                pathname === item.href
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                  : 'text-amber-700 hover:bg-amber-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </a>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-amber-200/50 space-y-4">
          {/* Shift Indicator */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-amber-100/50">
            {shiftType === 'DAY' ? (
              <Sun className="w-5 h-5 text-amber-600" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-600" />
            )}
            <span className="text-sm font-medium text-amber-800">
              {shiftType === 'DAY' ? 'Kunduzgi smena' : 'Tungi smena'}
            </span>
          </div>

          {/* User */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50">
            <UserCircle className="w-10 h-10 text-amber-600" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-amber-900 truncate">{user.fullName}</p>
              <p className="text-xs text-amber-600">{user.username}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Chiqish</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
