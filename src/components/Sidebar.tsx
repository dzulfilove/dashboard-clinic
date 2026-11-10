import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo.js';
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
  Bed,
  Stethoscope,
  Syringe
} from 'lucide-react';
import api from '../services/api.js';
import { DbStatus } from '../types.js';

const menuItems = [
  {
    title: 'Dashboard Terpadu',
    path: '/',
    icon: Home,
    roles: ['admin', 'lab', 'farmasi', 'perawat', 'analis']
  },
  {
    title: 'Design System Guide',
    path: '/design-system',
    icon: Layers,
    roles: ['admin', 'lab', 'farmasi', 'perawat', 'analis']
  },
  {
    isGroup: true,
    title: 'Laboratorium',
    icon: FlaskConical,
    items: [
      { name: 'Input Pemeriksaan', path: '/lab/input', icon: FlaskConical, roles: ['admin', 'analis'] },
      { name: 'Tren & Analisis Lab', path: '/lab/dashboard', icon: TrendingUp, roles: ['admin', 'analis'] },
      { name: 'Master Pemeriksaan', path: '/lab/master', icon: Layers, roles: ['admin', 'analis'] }
    ]
  },
  {
    isGroup: true,
    title: 'Pelayanan Klinik',
    icon: Activity,
    items: [
      { name: 'Dashboard Dokter', path: '/pelayanan/dashboard-dokter', icon: Stethoscope, roles: ['admin', 'perawat'] },
      { name: 'Rawat Jalan', path: '/pelayanan/rawat-jalan', icon: FileCheck, roles: ['admin', 'perawat'] },
      { name: 'IGD', path: '/pelayanan/igd', icon: Activity, roles: ['admin', 'perawat'] },
      { name: 'Rawat Inap', path: '/pelayanan/rawat-inap', icon: Bed, roles: ['admin', 'perawat'] },
      { name: 'Follow Up Vaksin', path: '/pelayanan/followup-vaksin', icon: Syringe, roles: ['admin', 'perawat'] },
      { name: 'Master Data Tindakan', path: '/pelayanan/master-tindakan', icon: Layers, roles: ['admin', 'perawat'] },
      { name: 'Master Data ICD-10', path: '/pelayanan/master-icd10', icon: Layers, roles: ['admin', 'perawat'] },
      { name: 'Master Data Dokter', path: '/pelayanan/master-dokter', icon: Layers, roles: ['admin', 'perawat'] },
      { name: 'Master Data Pasien', path: '/pelayanan/master-pasien', icon: Users, roles: ['admin', 'perawat'] },
      { name: 'Master Wilayah', path: '/pelayanan/master-wilayah', icon: Layers, roles: ['admin', 'perawat'] }
    ]
  },
  {
    isGroup: true,
    title: 'Demografi Kunjungan',
    icon: PieChart,
    items: [
      { name: 'Demografi Pasien', path: '/demografi/pasien', icon: Users, roles: ['admin', 'perawat', 'analis', 'farmasi', 'lab'] },
      { name: 'Demografi Diagnosa', path: '/demografi/diagnosa', icon: Activity, roles: ['admin', 'perawat', 'analis', 'farmasi', 'lab'] }
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
      { name: 'Log Aktivitas', path: '/admin/logs', icon: Activity, roles: ['admin'] },
      { name: 'Pengaturan Database', path: '/admin/db-settings', icon: Database, roles: ['admin'] }
    ]
  }
];

export default React.memo(function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [, setDbStatus] = useState<DbStatus | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const filteredMenu = useMemo(() => {
    return menuItems.map(item => {
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
  }, [user]);

  useEffect(() => {
    async function fetchDbStatus() {
      try {
        const res = await api.get('/db/status');
        setDbStatus(res.data);
      } catch (err: any) {
        if (err?.message !== 'Network Error') {
          console.warn('Failed to load DB status silently:', err?.message || err);
        }
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
  }, [location.pathname, filteredMenu]);

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
      {/* Mobile Header with Slate & Ice Navy */}
      <header id="mobile-header" className="md:hidden flex items-center justify-between px-5 py-3.5 bg-[#213145] text-white shadow-md z-40 border-b border-[#CCDCEF]/15">
        <div className="flex items-center space-x-3">
          <div className="bg-[#CCDCEF]/15 p-1.5 rounded-xl flex items-center justify-center border border-[#CCDCEF]/20">
            <Logo size={32} />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-bold text-sm tracking-tight text-white font-display leading-tight">
              Klinik Puri Medika<span className="text-[#FF8574]">.</span>
            </span>
            <span className="text-[11px] text-[#B8C8DB] font-medium leading-tight">Sistem Informasi &amp; Pelayanan</span>
          </div>
        </div>
        <button 
          id="mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)} 
          className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer"
          style={{ minHeight: '40px', minWidth: '40px' }}
          aria-label="Toggle menu navigasi"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar background overlay for mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ willChange: 'opacity' }}
            className="md:hidden fixed inset-0 bg-[#0B1C30]/60 backdrop-blur-xs z-30 pointer-events-auto" 
            onClick={() => setMobileOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container - Slate & Ice Structure (Navy Rail / Expanded) */}
      <aside 
        id="side-navigation"
        className={`fixed md:sticky top-0 left-0 h-screen bg-[#213145] text-[#B8C8DB] flex flex-col justify-between z-45 transition-[width] duration-200 ease-out will-change-width border-r border-[#CCDCEF]/15 shadow-2xl
          ${collapsed ? 'w-20' : 'w-72'} 
          ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ willChange: 'width' }}
      >
        {/* Upper Brand Section */}
        <div>
          <div className="flex items-center justify-between px-5 py-5 border-b border-[#CCDCEF]/12">
            <div className="flex items-center space-x-3 overflow-hidden">
              {collapsed ? (
                <div className="h-11 w-11 flex-shrink-0 bg-white/10 p-1.5 rounded-xl flex items-center justify-center border border-white/15 shadow-sm">
                  <Logo size={32} />
                </div>
              ) : (
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="h-11 w-11 flex-shrink-0 bg-white/10 p-1.5 rounded-xl flex items-center justify-center border border-white/15 shadow-sm">
                    <Logo size={32} />
                  </div>
                  <div className="flex flex-col justify-center whitespace-nowrap overflow-hidden">
                    <span className="font-extrabold text-base text-white tracking-tight leading-none font-display">
                      Klinik Puri Medika<span className="text-[#FF8574]">.</span>
                    </span>
                    <span className="text-[11px] text-[#B8C8DB] mt-1 font-medium tracking-normal">
                      Sistem Informasi &amp; Pelayanan
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Collapse Trigger (Desktop) */}
            <button 
              id="sidebar-collapse-btn"
              onClick={() => setCollapsed(!collapsed)} 
              className="hidden md:flex items-center justify-center p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#B8C8DB] hover:text-white transition-all cursor-pointer border border-white/10"
              style={{ minHeight: '32px', minWidth: '32px' }}
              aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            >
              <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {/* Navigational Links */}
          <nav className="px-3.5 py-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-165px)] scrollbar-none">
            {filteredMenu.map((item, idx) => {
              if (!item.isGroup) {
                // Direct Link (e.g., Dashboard, Design System Guide)
                const IconComponent = item.icon || Home;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={idx}
                    to={item.path || '/'}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 overflow-hidden
                      ${isActive 
                        ? 'bg-[#CCDCEF]/18 text-white font-bold shadow-xs' 
                        : 'text-[#B8C8DB] hover:bg-white/8 hover:text-white'}
                      ${collapsed ? 'justify-center font-normal px-2' : ''}
                    `}
                    style={{ minHeight: '42px' }}
                  >
                    {/* Active Coral indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#FF8574] rounded-r-full" />
                    )}
                    <IconComponent className={`h-4.5 w-4.5 flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-white' : 'text-[#B8C8DB]'}`} />
                    <span className={`truncate ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'} transition-[opacity,width] duration-150`}>
                      {item.title}
                    </span>
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
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer group
                      ${isChildActive 
                        ? 'bg-[#CCDCEF]/12 text-white font-bold' 
                        : 'text-[#B8C8DB] hover:bg-white/8 hover:text-white'}
                      ${collapsed ? 'justify-center font-normal px-2' : ''}
                    `}
                    style={{ minHeight: '42px' }}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <SectionIcon className={`h-4.5 w-4.5 flex-shrink-0 transition-colors duration-200 ${isChildActive ? 'text-[#FF8574]' : 'text-[#B8C8DB] group-hover:text-white'}`} />
                      <span className={`truncate ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'} transition-[opacity,width] duration-150`}>
                        {item.title}
                      </span>
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 text-[#B8C8DB] transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : 'group-hover:text-white'} ${collapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'} transition-[opacity,width] duration-150`} />
                  </button>

                  <div className="overflow-hidden">
                    {isOpen && !collapsed && (
                      <div className="pl-3 space-y-1 ml-4 border-l border-[#CCDCEF]/15">
                        {item.items && item.items.map((subItem: any, subIdx: number) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = location.pathname === subItem.path;
                          return (
                            <NavLink
                              key={subIdx}
                              to={subItem.path}
                              onClick={() => setMobileOpen(false)}
                              className={`
                                relative flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 overflow-hidden
                                ${isSubActive 
                                  ? 'bg-[#CCDCEF]/20 text-white font-bold shadow-xs' 
                                  : 'text-[#B8C8DB]/85 hover:bg-white/8 hover:text-white'}
                              `}
                              style={{ minHeight: '36px' }}
                            >
                              {isSubActive && (
                                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#FF8574] rounded-r-full" />
                              )}
                              <SubIcon className={`h-3.5 w-3.5 flex-shrink-0 transition-colors duration-200 ${isSubActive ? 'text-white' : 'text-[#B8C8DB]/70'}`} />
                              <span className="truncate">
                                {subItem.name}
                              </span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Lower User/Logout Section */}
        <div className="p-3.5 bg-[#18253A] border-t border-[#CCDCEF]/12">
          <div className="flex items-center justify-between gap-2">
            {user && (
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="h-9 w-9 rounded-full bg-[#CCDCEF] text-[#213145] flex items-center justify-center font-bold uppercase flex-shrink-0 text-xs shadow-xs">
                  {user.nama.substring(0, 2)}
                </div>
                <div className={`flex flex-col truncate ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'} transition-[opacity,width] duration-150`}>
                  <span className="text-xs font-bold text-white truncate font-display">{user.nama}</span>
                  <span className="text-[10px] font-mono bg-[#CCDCEF]/15 text-[#CCDCEF] px-2 py-0.5 rounded self-start mt-0.5 font-medium border border-[#CCDCEF]/20">
                    {user.role}
                  </span>
                </div>
              </div>
            )}

            <button
              id="sidebar-logout-btn"
              onClick={handleLogout}
              className={`p-2 rounded-xl bg-white/10 hover:bg-[#FF8574]/20 hover:text-[#FF8574] text-[#B8C8DB] transition-colors duration-150 flex items-center justify-center cursor-pointer border border-white/10
                ${collapsed ? 'w-full' : ''}
              `}
              title="Keluar dari Sistem"
              style={{ minHeight: '38px', minWidth: '38px' }}
              aria-label="Keluar dari Sistem"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
});
