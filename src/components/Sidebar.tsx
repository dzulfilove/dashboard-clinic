import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  FlaskConical, 
  Pill, 
  TrendingUp, 
  PieChart, 
  Users, 
  Database, 
  LogOut, 
  ChevronRight, 
  Activity, 
  Menu, 
  X,
  FileCheck,
  Package,
  Layers,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api.js';
import { DbStatus } from '../types.js';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function fetchDbStatus() {
      try {
        const res = await api.get('/db/status');
        setDbStatus(res.data);
      } catch (err) {
        console.error('Failed to load DB status', err);
      }
    }
    fetchDbStatus();
    const interval = setInterval(fetchDbStatus, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      title: 'Utama',
      items: [
        { name: 'Dashboard Terpadu', path: '/', icon: Home, roles: ['admin', 'lab', 'farmasi'] }
      ]
    },
    {
      title: 'Laboratorium',
      items: [
        { name: 'Input Pemeriksaan', path: '/lab/input', icon: FlaskConical, roles: ['admin', 'lab'] },
        { name: 'Tren & Analisis Lab', path: '/lab/dashboard', icon: TrendingUp, roles: ['admin', 'lab'] }
      ]
    },
    {
      title: 'Farmasi & Apotek',
      items: [
        { name: 'Master Data Obat', path: '/farmasi/master', icon: Package, roles: ['admin', 'farmasi'] },
        { name: 'Konsumsi Bulanan', path: '/farmasi/input', icon: Pill, roles: ['admin', 'farmasi'] },
        { name: 'Peramalan (Forecast)', path: '/farmasi/forecast', icon: TrendingUp, roles: ['admin', 'farmasi'] },
        { name: 'Analisis ABC Spend', path: '/farmasi/abc', icon: Layers, roles: ['admin', 'farmasi'] }
      ]
    },
    {
      title: 'Sistem',
      items: [
        { name: 'Kelola Pengguna', path: '/admin/users', icon: Users, roles: ['admin'] },
        { name: 'Pengaturan Database', path: '/admin/db-settings', icon: Database, roles: ['admin'] }
      ]
    }
  ];

  const filteredMenu = menuItems.map(section => {
    const items = section.items.filter(item => user && item.roles.includes(user.role));
    return { ...section, items };
  }).filter(section => section.items.length > 0);

  return (
    <>
      {/* Mobile Header with Glass Look */}
      <header id="mobile-header" className="md:hidden flex items-center justify-between px-6 py-4 bg-teal-850/95 backdrop-blur-md text-white shadow-lg border-b border-teal-700/30 z-40">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 stroke-[2.5] text-teal-300" />
          <span className="font-extrabold tracking-tight text-lg font-display">Puri Medika</span>
        </div>
        <button 
          id="mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)} 
          className="p-2 rounded-lg bg-teal-900 border border-teal-700 hover:bg-teal-950 focus:outline-none transition-all"
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar background overlay for mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-30 pointer-events-auto" 
            onClick={() => setMobileOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside 
        id="side-navigation"
        className={`fixed md:sticky top-0 left-0 h-full bg-slate-950/92 backdrop-blur-xl text-slate-200 flex flex-col justify-between border-r border-slate-800/40 z-45 transition-all duration-300
          ${collapsed ? 'w-20' : 'w-72'} 
          ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Upper Brand Section */}
        <div>
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-900 bg-slate-950/40 backdrop-blur-md">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="flex-shrink-0 p-2 bg-teal-600 rounded-lg text-white shadow-md shadow-teal-700/20">
                <Activity className="h-6 w-6" />
              </div>
              {!collapsed && (
                <div className="flex flex-col whitespace-nowrap">
                  <span className="font-bold tracking-tight text-teal-400 text-base font-display">Puri Medika</span>
                  <span className="text-xxs text-slate-500 font-mono font-semibold tracking-wider">BANDAR LAMPUNG</span>
                </div>
              )}
            </div>
            
            {/* Collapse Trigger (Desktop) */}
            <button 
              id="sidebar-collapse-btn"
              onClick={() => setCollapsed(!collapsed)} 
              className="hidden md:flex items-center justify-center p-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-850 transition-all cursor-pointer"
              style={{ minHeight: '32px', minWidth: '32px' }}
            >
              <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {/* Database Synchronization Indicator */}
          {!collapsed && (
            <div className="p-4 mx-4 my-3 bg-white/5 shadow-[0_2px_12px_rgba(0,0,0,0.15)] rounded-xl border border-white/5">
              <div className="flex items-center space-x-2">
                <div className={`h-2.5 w-2.5 rounded-full ${
                  dbStatus?.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' :
                  dbStatus?.status === 'VIRTUAL' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                }`} />
                <span className="text-xs font-bold text-slate-300">
                  {dbStatus?.status === 'ONLINE' ? 'Database VPS Aktif' :
                   dbStatus?.status === 'VIRTUAL' ? 'Database Virtual (Lokal)' : 'Database Offline'}
                </span>
              </div>
              <p className="text-xxs text-slate-500 mt-1 truncate">
                {dbStatus?.status === 'ONLINE' ? `Host: ${dbStatus.host}` : 'Menggunakan repositori memori simulasi'}
              </p>
            </div>
          )}

          {/* Navigational Links */}
          <nav className="px-4 py-3 space-y-6 overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-none">
            {filteredMenu.map((section, idx) => (
              <div key={idx} className="space-y-1">
                {!collapsed && (
                  <h3 id={`section-title-${idx}`} className="px-3 text-xxs font-bold uppercase tracking-widest text-slate-500">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1 mt-1.5">
                  {section.items.map((item, itemIdx) => {
                    const IconComponent = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <NavLink
                        key={itemIdx}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`
                          relative flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                          ${isActive 
                            ? 'bg-teal-700/80 text-white shadow-lg shadow-teal-900/10' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}
                          ${collapsed ? 'justify-center' : ''}
                        `}
                        style={{ minHeight: '44px' }}
                      >
                        <IconComponent className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-white scale-105' : 'text-slate-450'}`} />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                        {isActive && !collapsed && (
                          <motion.div 
                            layoutId="activeIndicator"
                            className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full" 
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Lower User/Logout Section */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/40 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            {!collapsed && user && (
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="h-10 w-10 rounded-full bg-slate-900 border border-teal-500/30 flex items-center justify-center font-bold text-teal-400 uppercase flex-shrink-0">
                  {user.nama.substring(0, 2)}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-bold text-slate-200 truncate">{user.nama}</span>
                  <span className="text-xxs font-mono uppercase bg-teal-950/60 text-teal-350 border border-teal-900/40 px-2 py-0.5 rounded self-start mt-0.5 tracking-wider font-extrabold">
                    {user.role}
                  </span>
                </div>
              </div>
            )}

            <button
              id="sidebar-logout-btn"
              onClick={handleLogout}
              className={`p-2.5 rounded-xl bg-slate-900/60 border border-slate-900 hover:bg-rose-500/10 hover:border-rose-550/30 hover:text-rose-400 text-slate-400 transition-all flex items-center justify-center cursor-pointer
                ${collapsed ? 'w-full' : ''}
              `}
              title="Keluar dari Sistem"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
