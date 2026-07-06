import { useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { useAuthStore } from './store/authStore.js';

// Layout & guards
import Sidebar from './components/Sidebar.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import PageTransition from './components/PageTransition.js';
const InteractiveGuide = lazy(() => import('./components/InteractiveGuide.js'));

// Pages
const Login = lazy(() => import('./pages/Login.js'));
const Dashboard = lazy(() => import('./pages/Dashboard.js'));
const InputPemeriksaan = lazy(() => import('./pages/lab/InputPemeriksaan.js'));
const MasterPemeriksaan = lazy(() => import('./pages/lab/MasterPemeriksaan.js'));
const DashboardLab = lazy(() => import('./pages/lab/DashboardLab.js'));
const MasterObat = lazy(() => import('./pages/farmasi/MasterObat.js'));
const InputKonsumsi = lazy(() => import('./pages/farmasi/InputKonsumsi.js'));
const Forecasting = lazy(() => import('./pages/farmasi/Forecasting.js'));
const AbcAnalysis = lazy(() => import('./pages/farmasi/AbcAnalysis.js'));
const UsersManagement = lazy(() => import('./pages/admin/Users.js'));
const ActivityLogs = lazy(() => import('./pages/admin/ActivityLogs.js'));
const DatabaseSettings = lazy(() => import('./pages/admin/DatabaseSettings.js'));
const RawatJalan = lazy(() => import('./pages/pelayanan/RawatJalan.js'));
const IGD = lazy(() => import('./pages/pelayanan/IGD.js'));
const MasterTindakan = lazy(() => import('./pages/pelayanan/MasterTindakan.js'));
const MasterPasien = lazy(() => import('./pages/pelayanan/MasterPasien.js'));
const MasterICD10 = lazy(() => import('./pages/pelayanan/MasterICD10.js'));
const RawatInap = lazy(() => import('./pages/pelayanan/RawatInap.js'));
const MasterDokter = lazy(() => import('./pages/pelayanan/MasterDokter.js'));
const MasterWilayah = lazy(() => import('./pages/pelayanan/MasterWilayah.js'));
const DemografiKunjungan = lazy(() => import('./pages/demografi/DemografiKunjungan.js'));
const DemografiDiagnosa = lazy(() => import('./pages/demografi/DemografiDiagnosa.js'));
const DashboardDokter = lazy(() => import('./pages/pelayanan/DashboardDokter.js'));
const FollowUpVaksin = lazy(() => import('./pages/pelayanan/FollowUpVaksin.js'));

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Read cached login sessions on load
    initialize();
  }, [initialize]);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />

          {/* Bound Protected Core Application Layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="relative min-h-screen bg-slate-50/50 flex flex-col md:flex-row font-sans overflow-hidden">
                  {/* Glowing ambient background spots for glass backdrop blur effect */}
                  <div className="absolute top-[10%] right-[-10%] w-[45rem] h-[45rem] bg-teal-300/10 rounded-full blur-[130px] pointer-events-none" />
                  <div className="absolute bottom-[-10%] left-[20%] w-[35rem] h-[35rem] bg-teal-300/10 rounded-full blur-[120px] pointer-events-none" />
                  
                  {/* Sidebar Navigation */}
                  <Sidebar />

                  {/* Interactive Guide Widget */}
                  <InteractiveGuide />

                  {/* Core Main Viewport Stage */}
                  <main id="main-viewport" className="relative z-10 flex-1 px-4 py-8 md:p-8 overflow-y-scroll max-h-screen">
                    <div className="max-w-7xl mx-auto">
                      <AnimatePresence mode="wait">
                        <Suspense fallback={
                          <div className="flex items-center justify-center min-h-[50vh]">
                            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        }>
                          <Routes location={location} key={location.pathname}>
                            {/* Integrated Shared Dashboard (Home) */}
                            <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />

                          {/* LABORATORY MODUL ROUTES */}
                          <Route 
                            path="/pelayanan/rawat-jalan" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                                <PageTransition><RawatJalan /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/pelayanan/igd" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                                <PageTransition><IGD /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/pelayanan/rawat-inap" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                                <PageTransition><RawatInap /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/pelayanan/master-tindakan" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                                <PageTransition><MasterTindakan /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/pelayanan/master-pasien" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                                <PageTransition><MasterPasien /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/pelayanan/master-icd10" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                                <PageTransition><MasterICD10 /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/pelayanan/master-dokter" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                                <PageTransition><MasterDokter /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/pelayanan/master-wilayah" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                                <PageTransition><MasterWilayah /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/pelayanan/dashboard-dokter" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                                <PageTransition><DashboardDokter /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/pelayanan/followup-vaksin" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                                <PageTransition><FollowUpVaksin /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />

                          {/* DEMOGRAPHIC MODULE ROUTES */}
                          <Route 
                            path="/demografi/pasien" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat', 'analis', 'farmasi', 'lab']}>
                                <PageTransition><DemografiKunjungan /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/demografi/diagnosa" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'perawat', 'analis', 'farmasi', 'lab']}>
                                <PageTransition><DemografiDiagnosa /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />

                          {/* LABORATORY MODUL ROUTES */}
                          <Route 
                            path="/lab/input" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'analis']}>
                                <PageTransition><InputPemeriksaan /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/lab/master" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'analis']}>
                                <PageTransition><MasterPemeriksaan /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/lab/dashboard" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'analis']}>
                                <PageTransition><DashboardLab /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />

                          {/* PHARMACY MODUL ROUTES */}
                          <Route 
                            path="/farmasi/master" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'farmasi']}>
                                <PageTransition><MasterObat /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/farmasi/input" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'farmasi']}>
                                <PageTransition><InputKonsumsi /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/farmasi/forecast" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'farmasi']}>
                                <PageTransition><Forecasting /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/farmasi/abc" 
                            element={
                              <ProtectedRoute allowedRoles={['admin', 'farmasi']}>
                                <PageTransition><AbcAnalysis /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />

                          {/* SYSTEM ADMINISTRATION ROUTES */}
                          <Route 
                            path="/admin/users" 
                            element={
                              <ProtectedRoute allowedRoles={['admin']}>
                                <PageTransition><UsersManagement /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/admin/logs" 
                            element={
                              <ProtectedRoute allowedRoles={['admin']}>
                                <PageTransition><ActivityLogs /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />
                          <Route 
                            path="/admin/db-settings" 
                            element={
                              <ProtectedRoute allowedRoles={['admin']}>
                                <PageTransition><DatabaseSettings /></PageTransition>
                              </ProtectedRoute>
                            } 
                          />

                          {/* Wildcard Fallback redirection */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </Suspense>
                    </AnimatePresence>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  </AnimatePresence>
  );
}
