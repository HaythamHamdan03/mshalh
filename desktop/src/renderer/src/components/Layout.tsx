import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Plus, Users, Factory, Settings,
  LogOut, Menu, X
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useLangStore } from '../stores/langStore';
import toast from 'react-hot-toast';

interface NavItem {
  labelAr: string;
  labelUr?: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  // Branch
  { labelAr: 'لوحة الفرع',    path: '/branch',            icon: <LayoutDashboard size={20} />, roles: ['BRANCH'] },
  { labelAr: 'طلب جديد',      path: '/branch/new-order',  icon: <Plus size={20} />,            roles: ['BRANCH'] },
  { labelAr: 'العملاء',        path: '/branch/customers',  icon: <Users size={20} />,           roles: ['BRANCH'] },
  // Factory
  { labelAr: 'لوحة المصنع',   labelUr: 'فیکٹری ڈیش بورڈ', path: '/factory',           icon: <Factory size={20} />,         roles: ['FACTORY', 'ADMIN'] },
  { labelAr: 'طلب جديد',      labelUr: 'نیا آرڈر',         path: '/factory/new-order', icon: <Plus size={20} />,            roles: ['FACTORY'] },
  // Admin
  { labelAr: 'إدارة النظام',   path: '/admin',             icon: <Settings size={20} />,        roles: ['ADMIN'] },
];

const UR = {
  role:    'فیکٹری نگران',
  logout:  'لاگ آؤٹ',
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { factoryLang } = useLangStore();

  const isUrdu = user?.role === 'FACTORY' && factoryLang === 'ur';

  const handleLogout = async () => {
    await queryClient.cancelQueries();
    logout();
    queryClient.clear();
    navigate('/login');
    toast.success(isUrdu ? 'لاگ آؤٹ کامیاب' : 'تم تسجيل الخروج بنجاح');
  };

  const visibleItems = NAV_ITEMS.filter(item => user?.role && item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-brown-dark transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
        style={{ flexShrink: 0 }}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-gold/20 flex-shrink-0 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="شعار"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.style.display = 'none';
                    t.parentElement!.textContent = '👘';
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-gold text-sm font-bold leading-tight truncate">المشالح العربية</p>
                <p className="text-white/40 text-xs truncate">الخاصة</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors ml-auto"
          >
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>

        {/* User info */}
        {!collapsed && user && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.name}</p>
                <p className="text-white/40 text-xs truncate">
                  {user.role === 'ADMIN' ? 'مدير النظام' :
                   user.role === 'FACTORY' ? (isUrdu ? UR.role : 'مشرف المصنع') :
                   user.branch?.name || 'موظف فرع'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const label = isUrdu && item.labelUr ? item.labelUr : item.labelAr;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gold text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-error/20 hover:text-error transition-all duration-150 ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? (isUrdu ? UR.logout : 'تسجيل الخروج') : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>{isUrdu ? UR.logout : 'تسجيل الخروج'}</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted">
              {new Date().toLocaleDateString('ar-SA', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'BRANCH' && user.branch && (
              <span className="bg-gold/10 text-gold-dark px-3 py-1 rounded-lg text-sm font-semibold border border-gold/20">
                {user.branch.name}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
