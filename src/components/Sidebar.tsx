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
  ChevronDown,
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
  const [openSection, setOpenSection] = useState<string | null>(null);

  const menuItems = [
    {
      title: 'Dashboard Terpadu',
      path: '/',
      icon: Home,
      roles: ['admin', 'lab', 'farmasi', 'perawat', 'analis']
    },
    {
      isGroup: true,
      title: 'Laboratorium',
      icon: FlaskConical,
      items: [
        { name: 'Input Pemeriksaan', path: '/lab/input', icon: FlaskConical, roles: ['admin', 'lab', 'perawat', 'analis'] },
        { name: 'Tren & Analisis Lab', path: '/lab/dashboard', icon: TrendingUp, roles: ['admin', 'lab', 'perawat', 'analis'] },
        { name: 'Master Pemeriksaan', path: '/lab/master', icon: Layers, roles: ['admin', 'lab', 'perawat', 'analis'] }
      ]
    },
    {
      isGroup: true,
      title: 'Pelayanan Klinik',
      icon: Activity,
      items: [
        { name: 'Rawat Jalan', path: '/pelayanan/rawat-jalan', icon: FileCheck, roles: ['admin', 'perawat', 'analis'] },
        { name: 'Master Data Tindakan', path: '/pelayanan/master-tindakan', icon: Layers, roles: ['admin'] },
        { name: 'Master Data Pasien', path: '/pelayanan/master-pasien', icon: Users, roles: ['admin'] },
        { name: 'IGD', path: '#', icon: Activity, roles: ['admin', 'perawat', 'analis'], disabled: true },
        { name: 'Rawat Inap', path: '#', icon: Layers, roles: ['admin', 'perawat', 'analis'], disabled: true }
      ]
    },
    {
      isGroup: true,
      title: 'Farmasi & Apotek',
      icon: Pill,
      items: [
        { name: 'Konsumsi Harian', path: '/farmasi/input', icon: Pill, roles: ['admin', 'farmasi'] },
        { name: 'Peramalan (Forecast)', path: '/farmasi/forecast', icon: TrendingUp, roles: ['admin', 'farmasi'] },
        { name: 'Analisis ABC Spend', path: '/farmasi/abc', icon: Layers, roles: ['admin', 'farmasi'] },
        { name: 'Master Data Obat', path: '/farmasi/master', icon: Package, roles: ['admin', 'farmasi'] },

      ]
    },
    {
      isGroup: true,
      title: 'Sistem',
      icon: Database,
      items: [
        { name: 'Kelola Pengguna', path: '/admin/users', icon: Users, roles: ['admin'] },
        { name: 'Pengaturan Database', path: '/admin/db-settings', icon: Database, roles: ['admin'] }
      ]
    }
  ];

  const filteredMenu = menuItems.map(item => {
    if (item.isGroup && item.items) {
      const items = item.items.filter(child => user && child.roles.includes(user.role));
      return { ...item, items };
    }
    return item;
  }).filter(item => {
    if (item.isGroup && item.items) {
      return item.items.length > 0;
    }
    return user && item.roles && item.roles.includes(user.role);
  });

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
  }, []);

  useEffect(() => {
    const activeSection = filteredMenu.find(item => 
      item.isGroup && item.items && item.items.some(child => location.pathname === child.path)
    );
    if (activeSection) {
      setOpenSection(activeSection.title);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSection = (title: string) => {
    if (collapsed) {
      setCollapsed(false);
      setOpenSection(title);
      return;
    }
    setOpenSection(prev => (prev === title ? null : title));
  };

  return (
    <>
      {/* Mobile Header with Glass Look */}
      <header id="mobile-header" className="md:hidden flex items-center justify-between px-6 py-3 bg-slate-950/95 backdrop-blur-md text-white shadow-lg border-b border-slate-900 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-0.5 rounded-xl flex items-center justify-center shadow-md h-11 w-11 overflow-hidden flex-shrink-0">
            <img 
              src="https://res.cloudinary.com/diipdl14x/image/upload/v1779718724/ChatGPT_Image_May_25_2026_09_17_41_PM_u7zjgg.png" 
              alt="Logo Klinik Puri Medika" 
              className="h-full w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-semibold text-[10px] text-teal-400 tracking-wider uppercase font-display leading-none">Klinik</span>
            <span className="font-bold text-sm text-white font-display leading-tight mt-0.5">Puri Medika</span>
          </div>
        </div>
        <button 
          id="mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)} 
          className="p-2 rounded-lg bg-slate-900 border border-slate-850 hover:bg-slate-800 focus:outline-none transition-all"
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
        className={`fixed md:sticky top-0 left-0 h-screen bg-slate-950/92 backdrop-blur-xl text-slate-200 flex flex-col justify-between border-r border-slate-800/40 z-45 transition-all duration-300
          ${collapsed ? 'w-20' : 'w-72'} 
          ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Upper Brand Section */}
        <div>
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-900 bg-slate-950/40 backdrop-blur-md">
            <div className="flex items-center space-x-3 overflow-hidden">
              {collapsed ? (
                <div className="h-11 w-11 flex-shrink-0 bg-white p-0.5 rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                  <img 
                    src="https://res.cloudinary.com/diipdl14x/image/upload/v1779718724/ChatGPT_Image_May_25_2026_09_17_41_PM_u7zjgg.png" 
                    alt="Logo" 
                    className="h-full w-auto object-contain" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="h-12 w-12 flex-shrink-0 bg-white p-0.5 rounded-xl flex items-center justify-center shadow-md overflow-hidden">
                    <img 
                      src="https://res.cloudinary.com/diipdl14x/image/upload/v1779718724/ChatGPT_Image_May_25_2026_09_17_41_PM_u7zjgg.png" 
                      alt="Logo Klinik Puri Medika" 
                      className="h-full w-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col justify-center whitespace-nowrap overflow-hidden">
                    <span className="font-semibold text-[10px] text-teal-400 tracking-wider uppercase font-display leading-none">Klinik</span>
                    <span className="font-bold text-sm text-white font-display leading-tight mt-1">Puri Medika</span>
                  </div>
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

          {/* Navigational Links */}
          <nav className="px-4 py-3 space-y-2 overflow-y-auto max-h-[calc(100vh-160px)] scrollbar-none">
            {filteredMenu.map((item, idx) => {
              if (!item.isGroup) {
                // Direct Link (e.g., Dashboard)
                const IconComponent = item.icon || Home;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={idx}
                    to={item.path || '/'}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      relative flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 mt-1
                      ${isActive 
                        ? 'bg-teal-700/85 text-white shadow-md shadow-teal-950/20 border border-teal-500/10' 
                        : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'}
                      ${collapsed ? 'justify-center font-normal' : ''}
                    `}
                    style={{ minHeight: '44px' }}
                  >
                    <IconComponent className={`h-4.5 w-4.5 flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-white scale-105' : 'text-slate-400'}`} />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </NavLink>
                );
              }

              // Group (Accordion section)
              const SectionIcon = item.icon || Home;
              const isOpen = openSection === item.title;
              const isChildActive = item.items && item.items.some((child: any) => location.pathname === child.path);

              return (
                <div key={idx} className="space-y-1">
                  {/* Parent Section Menu Button */}
                  <button
                    onClick={() => toggleSection(item.title)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer
                      ${isChildActive 
                        ? 'bg-white/5 text-teal-400 border border-teal-500/10' 
                        : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'}
                      ${collapsed ? 'justify-center font-normal' : ''}
                    `}
                    style={{ minHeight: '44px' }}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <SectionIcon className={`h-4.5 w-4.5 flex-shrink-0 transition-colors duration-200 ${isChildActive ? 'text-teal-400' : 'text-slate-400'}`} />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </div>
                    {!collapsed && (
                      <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-teal-400' : ''}`} />
                    )}
                  </button>

                  {/* Submenu container */}
                  <AnimatePresence initial={false}>
                    {isOpen && !collapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden pl-4 space-y-1 border-l border-slate-900 ml-5"
                      >
                        {item.items && item.items.map((subItem: any, subIdx: number) => {
                          const SubIcon = subItem.icon;
                          if (subItem.disabled) {
                            return (
                              <div
                                key={subIdx}
                                className="relative flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-500/80 cursor-not-allowed mt-1 bg-slate-900/10 hover:bg-slate-900/20 transition-all font-display"
                                style={{ minHeight: '38px' }}
                              >
                                <div className="flex items-center space-x-3">
                                  <SubIcon className="h-4 w-4 flex-shrink-0 text-slate-650" />
                                  <span className="truncate">{subItem.name}</span>
                                </div>
                                <span className="text-[8px] leading-none bg-slate-900 text-teal-400/80 border border-teal-500/10 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">Segera</span>
                              </div>
                            );
                          }
                          const isSubActive = location.pathname === subItem.path;
                          return (
                            <NavLink
                              key={subIdx}
                              to={subItem.path}
                              onClick={() => setMobileOpen(false)}
                              className={`
                                relative flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 mt-1
                                ${isSubActive 
                                  ? 'bg-teal-700/85 text-white shadow-md shadow-teal-950/20' 
                                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                              `}
                              style={{ minHeight: '38px' }}
                            >
                              <SubIcon className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${isSubActive ? 'text-white' : 'text-slate-500'}`} />
                              <span className="truncate">{subItem.name}</span>
                            </NavLink>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Lower User/Logout Section */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/40 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            {!collapsed && user && (
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="h-9 w-9 rounded-full bg-slate-900 border border-teal-500/30 flex items-center justify-center font-semibold text-teal-400 uppercase flex-shrink-0 text-xs">
                  {user.nama.substring(0, 2)}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold text-slate-200 truncate">{user.nama}</span>
                  <span className="text-xxs font-mono uppercase bg-teal-950/60 text-teal-350 border border-teal-900/40 px-2 py-0.5 rounded self-start mt-0.5 tracking-wider font-medium">
                    {user.role}
                  </span>
                </div>
              </div>
            )}

            <button
              id="sidebar-logout-btn"
              onClick={handleLogout}
              className={`p-2 rounded-xl bg-slate-900/60 border border-slate-900 hover:bg-rose-500/10 hover:border-rose-550/30 hover:text-rose-400 text-slate-400 transition-all flex items-center justify-center cursor-pointer
                ${collapsed ? 'w-full' : ''}
              `}
              title="Keluar dari Sistem"
              style={{ minHeight: '40px', minWidth: '40px' }}
            >
              <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
