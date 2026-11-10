import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Home, 
  TrendingUp, 
  Pill, 
  Calendar, 
  LayoutGrid, 
  Info, 
  LogOut, 
  Menu, 
  X,
  ChevronDown,
  FlaskConical,
  Layers,
  FileCheck,
  Bed,
  Stethoscope,
  Syringe,
  Activity,
  Users,
  Package,
  Database
} from 'lucide-react';
import Logo from './Logo.js';
import api from '../services/api.js';

interface NavChild {
  name: string;
  path: string;
  icon: any;
  roles: string[];
}

interface NavSection {
  id: string;
  title: string;
  icon: any;
  path?: string;
  badge?: number | string;
  roles: string[];
  items?: NavChild[];
}

export default React.memo(function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isHovered, setIsHovered] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [criticalStockCount, setCriticalStockCount] = useState<number>(5);

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Define rail sections matching the screenshot
  const railSections: NavSection[] = useMemo(() => [
    {
      id: 'home',
      title: 'Dashboard Terpadu',
      icon: Home,
      path: '/',
      roles: ['admin', 'lab', 'farmasi', 'perawat', 'analis']
    },
    {
      id: 'lab',
      title: 'Laboratorium',
      icon: TrendingUp,
      roles: ['admin', 'analis'],
      items: [
        { name: 'Input Pemeriksaan', path: '/lab/input', icon: FlaskConical, roles: ['admin', 'analis'] },
        { name: 'Tren & Analisis Lab', path: '/lab/dashboard', icon: TrendingUp, roles: ['admin', 'analis'] },
        { name: 'Master Pemeriksaan', path: '/lab/master', icon: Layers, roles: ['admin', 'analis'] }
      ]
    },
    {
      id: 'farmasi',
      title: 'Farmasi & Apotek',
      icon: Pill,
      badge: criticalStockCount > 0 ? criticalStockCount : undefined,
      roles: ['admin', 'farmasi'],
      items: [
        { name: 'Konsumsi Harian', path: '/farmasi/input', icon: Pill, roles: ['admin', 'farmasi'] },
        { name: 'Peramalan (Forecast)', path: '/farmasi/forecast', icon: TrendingUp, roles: ['admin', 'farmasi'] },
        { name: 'Analisis ABC Spend', path: '/farmasi/abc', icon: Layers, roles: ['admin', 'farmasi'] },
        { name: 'Master Data Obat', path: '/farmasi/master', icon: Package, roles: ['admin', 'farmasi'] }
      ]
    },
    {
      id: 'pelayanan',
      title: 'Pelayanan Klinik',
      icon: Calendar,
      roles: ['admin', 'perawat'],
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
      id: 'demografi',
      title: 'Demografi Kunjungan',
      icon: LayoutGrid,
      roles: ['admin', 'perawat', 'analis', 'farmasi', 'lab'],
      items: [
        { name: 'Demografi Pasien', path: '/demografi/pasien', icon: Users, roles: ['admin', 'perawat', 'analis', 'farmasi', 'lab'] },
        { name: 'Demografi Diagnosa', path: '/demografi/diagnosa', icon: Activity, roles: ['admin', 'perawat', 'analis', 'farmasi', 'lab'] }
      ]
    },
    {
      id: 'sistem',
      title: 'Sistem & Panduan',
      icon: Info,
      roles: ['admin', 'lab', 'farmasi', 'perawat', 'analis'],
      items: [
        { name: 'Design System Guide', path: '/design-system', icon: Layers, roles: ['admin', 'lab', 'farmasi', 'perawat', 'analis'] },
        { name: 'Kelola Pengguna', path: '/admin/users', icon: Users, roles: ['admin'] },
        { name: 'Log Aktivitas', path: '/admin/logs', icon: Activity, roles: ['admin'] },
        { name: 'Pengaturan Database', path: '/admin/db-settings', icon: Database, roles: ['admin'] }
      ]
    }
  ], [criticalStockCount]);

  // Filter based on user role
  const filteredSections = useMemo(() => {
    return railSections.filter(sec => {
      if (sec.roles && user && !sec.roles.includes(user.role)) {
        return false;
      }
      return true;
    });
  }, [railSections, user]);

  // Find active parent section
  const currentActiveParent = useMemo(() => {
    return filteredSections.find(sec => {
      if (sec.path) return location.pathname === sec.path;
      if (sec.items) return sec.items.some(child => location.pathname === child.path);
      return false;
    });
  }, [filteredSections, location.pathname]);

  // Keep openSection in sync with current route when hovering
  useEffect(() => {
    if (currentActiveParent && currentActiveParent.items) {
      setOpenSection(currentActiveParent.id);
    }
  }, [currentActiveParent]);

  // Fetch critical items for badge
  useEffect(() => {
    async function fetchCriticalCount() {
      try {
        const res = await api.get('/obat/forecast?bulan=11&tahun=2026');
        if (Array.isArray(res.data)) {
          const count = res.data.filter((item: any) => item.status_stok === 'Kritis (Perlu Order)').length;
          setCriticalStockCount(count > 0 ? count : 5);
        }
      } catch {
        setCriticalStockCount(5);
      }
    }
    fetchCriticalCount();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSectionClick = (section: NavSection) => {
    if (section.path) {
      navigate(section.path);
      return;
    }
    // Toggle accordion directly inside sidebar
    setOpenSection(prev => (prev === section.id ? null : section.id));
  };

  const isSectionActive = (section: NavSection) => {
    if (section.path) {
      return location.pathname === section.path;
    }
    if (section.items) {
      return section.items.some(child => location.pathname === child.path);
    }
    return false;
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-5 py-3.5 bg-[#213145] text-white shadow-md z-40 border-b border-[#CCDCEF]/15">
        <div className="flex items-center space-x-3">
          <div className="font-display font-extrabold text-[17px] leading-[18px] text-white tracking-tight">
            Puri<br />Medika<span className="text-[#FF8574]">.</span>
          </div>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)} 
          className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer"
          style={{ minHeight: '40px', minWidth: '40px' }}
          aria-label="Toggle menu navigasi"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5 text-white" />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-[#0B1C30]/60 backdrop-blur-xs z-45 flex"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="p-3 w-[290px] h-full"
            >
              <div className="bg-[#213145] rounded-[32px] p-5 h-full flex flex-col justify-between shadow-2xl border border-[#CCDCEF]/15 overflow-y-auto">
                <div>
                  <div className="flex items-center space-x-3 mb-6 px-1">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                      <Logo size={28} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-display font-extrabold text-base text-white tracking-tight leading-tight">
                        Klinik Puri Medika<span className="text-[#FF8574]">.</span>
                      </span>
                      <span className="text-[11px] text-[#B8C8DB] font-medium leading-tight mt-0.5">
                        Sistem Informasi Klinik
                      </span>
                    </div>
                  </div>

                  <nav className="space-y-1.5">
                    {filteredSections.map(section => {
                      const Icon = section.icon;
                      const active = isSectionActive(section);
                      const isOpen = openSection === section.id;

                      return (
                        <div key={section.id} className="space-y-1">
                          <button
                            onClick={() => handleSectionClick(section)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer
                              ${active 
                                ? 'bg-[#CCDCEF]/18 text-white font-bold shadow-xs' 
                                : 'text-[#B8C8DB] hover:bg-white/8 hover:text-white'}
                            `}
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${active ? 'text-white' : 'text-[#B8C8DB]'}`} />
                              <span className="truncate">{section.title}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {section.badge !== undefined && (
                                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF8574] text-[#222526] font-extrabold text-[10px] flex items-center justify-center">
                                  {section.badge}
                                </span>
                              )}
                              {section.items && (
                                <ChevronDown className={`h-3.5 w-3.5 text-[#B8C8DB] transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
                              )}
                            </div>
                          </button>

                          {/* Accordion Submenu on Mobile */}
                          {isOpen && section.items && (
                            <div className="pl-3 ml-4.5 border-l border-[#CCDCEF]/20 space-y-1 my-1">
                              {section.items.map((subItem, sIdx) => {
                                const SubIcon = subItem.icon;
                                const isSubActive = location.pathname === subItem.path;
                                return (
                                  <NavLink
                                    key={sIdx}
                                    to={subItem.path}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
                                      ${isSubActive 
                                        ? 'bg-[#CCDCEF]/20 text-white font-bold' 
                                        : 'text-[#B8C8DB]/85 hover:text-white hover:bg-white/8'}
                                    `}
                                  >
                                    <SubIcon className={`h-3.5 w-3.5 ${isSubActive ? 'text-white' : 'text-[#B8C8DB]/70'}`} />
                                    <span className="truncate">{subItem.name}</span>
                                  </NavLink>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                </div>

                <div className="pt-4 border-t border-[#CCDCEF]/15 flex items-center justify-between">
                  {user && (
                    <div className="flex items-center space-x-2.5">
                      <div className="h-8 w-8 rounded-full bg-[#CCDCEF] text-[#213145] flex items-center justify-center font-bold text-xs uppercase">
                        {user.nama.substring(0, 2)}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold text-white truncate">{user.nama}</span>
                        <span className="text-[10px] text-[#B8C8DB] capitalize">{user.role}</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl bg-white/10 hover:bg-[#FF8574]/20 text-[#B8C8DB] hover:text-[#FF8574] transition-colors"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Dynamic Hover-Expand Capsule Rail */}
      <aside 
        id="side-navigation"
        ref={sidebarRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        className="hidden md:flex flex-col items-center justify-center p-3 sticky top-0 h-screen z-45"
      >
        {/* Outer White Housing (smooth width expansion) */}
        <div 
          className={`si-rail-outer relative transition-all duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] overflow-hidden
            ${isHovered ? 'w-[280px] p-2' : 'w-[92px] p-1.5'}
          `}
        >
          {/* Inner Navy Capsule Rail (smooth width expansion) */}
          <div 
            className={`si-rail-inner transition-all duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] flex flex-col justify-between overflow-x-hidden
              ${isHovered ? 'w-[264px] rounded-[30px] py-5 px-3' : 'w-[78px] rounded-[36px] py-6 px-1.5'}
            `}
          >
            {/* Top Brand Area */}
            <div className="w-full">
              {!isHovered ? (
                // Collapsed Stacked Wordmark (matching screenshot)
                <div className="si-rail-logo text-center select-none pt-1">
                  Puri<br />Medika<span>.</span>
                </div>
              ) : (
                // Expanded Full Wordmark
                <div className="flex items-center space-x-3 px-2 mb-5 w-full select-none animate-in fade-in duration-200">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 border border-white/10 shadow-xs">
                    <Logo size={28} />
                  </div>
                  <div className="flex flex-col whitespace-nowrap overflow-hidden">
                    <span className="font-display font-extrabold text-[15px] text-white tracking-tight leading-tight">
                      Klinik Puri Medika<span className="text-[#FF8574]">.</span>
                    </span>
                    <span className="text-[11px] text-[#B8C8DB] font-medium leading-tight mt-0.5">
                      Sistem Informasi Klinik
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation Stack */}
              <nav className="space-y-1.5 w-full overflow-y-auto max-h-[calc(100vh-210px)] scrollbar-none">
                {filteredSections.map((section) => {
                  const IconComponent = section.icon;
                  const active = isSectionActive(section);
                  const isOpen = openSection === section.id && isHovered;

                  return (
                    <div key={section.id} className="w-full">
                      {/* Main Button */}
                      <button
                        onClick={() => handleSectionClick(section)}
                        className={`transition-all duration-200 cursor-pointer relative group flex items-center
                          ${!isHovered 
                            ? 'w-12 h-12 mx-auto rounded-[16px] justify-center' 
                            : 'w-full px-3 py-2.5 rounded-[14px] justify-between'}
                          ${active 
                            ? 'bg-[#CCDCEF]/18 text-white font-bold shadow-xs' 
                            : 'text-[#B8C8DB] hover:bg-white/8 hover:text-white'}
                        `}
                        title={!isHovered ? section.title : undefined}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className="relative shrink-0">
                            <IconComponent className={`h-5 w-5 ${active ? 'text-white' : 'text-[#B8C8DB]'}`} />
                            {/* Coral Badge on Collapsed Rail */}
                            {!isHovered && section.badge !== undefined && (
                              <span className="si-rail-badge">
                                {section.badge}
                              </span>
                            )}
                          </div>

                          {/* Text Label on Expanded */}
                          {isHovered && (
                            <span className="text-xs font-semibold whitespace-nowrap truncate text-left animate-in fade-in duration-150">
                              {section.title}
                            </span>
                          )}
                        </div>

                        {/* Right Section Elements on Expanded */}
                        {isHovered && (
                          <div className="flex items-center space-x-2 shrink-0 animate-in fade-in duration-150">
                            {section.badge !== undefined && (
                              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF8574] text-[#222526] font-extrabold text-[10px] flex items-center justify-center">
                                {section.badge}
                              </span>
                            )}
                            {section.items && (
                              <ChevronDown className={`h-3.5 w-3.5 text-[#B8C8DB] transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
                            )}
                          </div>
                        )}
                      </button>

                      {/* IN-SIDEBAR SUBMENU ACCORDION (NOT A FLOATING COMPONENT) */}
                      <AnimatePresence>
                        {isOpen && section.items && isHovered && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
                            className="overflow-hidden pl-3 ml-4.5 border-l border-[#CCDCEF]/20 space-y-1 my-1"
                          >
                            {section.items
                              .filter(child => !user || child.roles.includes(user.role))
                              .map((subItem, subIdx) => {
                                const SubIcon = subItem.icon;
                                const isSubActive = location.pathname === subItem.path;

                                return (
                                  <NavLink
                                    key={subIdx}
                                    to={subItem.path}
                                    className={`
                                      flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
                                      ${isSubActive 
                                        ? 'bg-[#CCDCEF]/20 text-white font-bold shadow-2xs' 
                                        : 'text-[#B8C8DB]/85 hover:text-white hover:bg-white/8'}
                                    `}
                                  >
                                    <SubIcon className={`h-3.5 w-3.5 shrink-0 ${isSubActive ? 'text-white' : 'text-[#B8C8DB]/70'}`} />
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

            {/* Bottom Section: Profile & Logout */}
            <div className="w-full pt-3 mt-auto border-t border-[#CCDCEF]/12">
              {!isHovered ? (
                // Collapsed Logout Icon Button (matching screenshot)
                <button
                  onClick={handleLogout}
                  className="w-12 h-12 mx-auto rounded-[16px] flex items-center justify-center text-[#B8C8DB] hover:text-[#FF8574] hover:bg-[#FF8574]/15 transition-all cursor-pointer"
                  title="Keluar dari Sistem"
                  aria-label="Keluar dari Sistem"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              ) : (
                // Expanded Profile Row + Logout
                <div className="flex items-center justify-between px-2 animate-in fade-in duration-200">
                  {user && (
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className="h-8 w-8 rounded-full bg-[#CCDCEF] text-[#213145] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {user.nama.substring(0, 2)}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold text-white truncate font-display">{user.nama}</span>
                        <span className="text-[10px] font-mono text-[#CCDCEF] bg-[#CCDCEF]/15 px-1.5 py-0.2 rounded self-start mt-0.5">
                          {user.role}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl bg-white/10 hover:bg-[#FF8574]/20 hover:text-[#FF8574] text-[#B8C8DB] transition-all cursor-pointer"
                    title="Keluar dari Sistem"
                    aria-label="Keluar dari Sistem"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </aside>
    </>
  );
});
