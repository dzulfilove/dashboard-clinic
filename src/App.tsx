import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';

import Loader from './components/Loader.js';

// Layout & guards
import Sidebar from './components/Sidebar.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import { prefetchRoutes } from './routePrefetch.js';

import InteractiveGuide from './components/InteractiveGuide.js';

// Pages
import Login from './pages/Login.js';
import Dashboard from './pages/Dashboard.js';
import InputPemeriksaan from './pages/lab/InputPemeriksaan.js';
import MasterPemeriksaan from './pages/lab/MasterPemeriksaan.js';
import DashboardLab from './pages/lab/DashboardLab.js';
import MasterObat from './pages/farmasi/MasterObat.js';
import InputKonsumsi from './pages/farmasi/InputKonsumsi.js';
import Forecasting from './pages/farmasi/Forecasting.js';
import AbcAnalysis from './pages/farmasi/AbcAnalysis.js';
import UsersManagement from './pages/admin/Users.js';
import ActivityLogs from './pages/admin/ActivityLogs.js';
import DatabaseSettings from './pages/admin/DatabaseSettings.js';
import RawatJalan from './pages/pelayanan/RawatJalan.js';
import IGD from './pages/pelayanan/IGD.js';
import MasterTindakan from './pages/pelayanan/MasterTindakan.js';
import MasterPasien from './pages/pelayanan/MasterPasien.js';
import MasterICD10 from './pages/pelayanan/MasterICD10.js';
import RawatInap from './pages/pelayanan/RawatInap.js';
import MasterDokter from './pages/pelayanan/MasterDokter.js';
import MasterWilayah from './pages/pelayanan/MasterWilayah.js';
import DemografiKunjungan from './pages/demografi/DemografiKunjungan.js';
import DemografiDiagnosa from './pages/demografi/DemografiDiagnosa.js';
import DashboardDokter from './pages/pelayanan/DashboardDokter.js';
import FollowUpVaksin from './pages/pelayanan/FollowUpVaksin.js';

export default function App() {
  useEffect(() => {
    const timer = setTimeout(() => {
      prefetchRoutes();
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  
  return (
    <>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Bound Protected Core Application Layout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="relative min-h-screen bg-slate-50/50 flex flex-col md:flex-row font-sans overflow-hidden">
                {/* Glowing ambient background spots for glass backdrop blur effect */}
                <div className="absolute top-[10%] right-[-10%] w-[45rem] h-[45rem] bg-teal-300/10 rounded-full blur-[60px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35rem] h-[35rem] bg-teal-300/10 rounded-full blur-[60px] pointer-events-none" />
                
                {/* Sidebar Navigation */}
                <Sidebar />

                {/* Interactive Guide Widget */}
                <InteractiveGuide />

                {/* Core Main Viewport Stage */}
                <main id="main-viewport" className="relative z-10 flex-1 px-4 py-8 md:p-8 overflow-y-scroll max-h-screen">
                  <div className="max-w-7xl mx-auto h-full">
                    <Routes location={location} key={location.pathname}>
                      {/* Integrated Shared Dashboard (Home) */}
                      <Route path="/" element={<Dashboard />} />

                      {/* LABORATORY MODUL ROUTES */}
                      <Route 
                        path="/pelayanan/rawat-jalan" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                            <RawatJalan />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pelayanan/igd" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                            <IGD />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pelayanan/rawat-inap" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                            <RawatInap />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pelayanan/master-tindakan" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                            <MasterTindakan />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pelayanan/master-pasien" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                            <MasterPasien />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pelayanan/master-icd10" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                            <MasterICD10 />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pelayanan/master-dokter" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                            <MasterDokter />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pelayanan/master-wilayah" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                            <MasterWilayah />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pelayanan/dashboard-dokter" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                            <DashboardDokter />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pelayanan/followup-vaksin" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat']}>
                            <FollowUpVaksin />
                          </ProtectedRoute>
                        } 
                      />

                      {/* DEMOGRAPHIC MODULE ROUTES */}
                      <Route 
                        path="/demografi/pasien" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat', 'analis', 'farmasi', 'lab']}>
                            <DemografiKunjungan />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/demografi/diagnosa" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat', 'analis', 'farmasi', 'lab']}>
                            <DemografiDiagnosa />
                          </ProtectedRoute>
                        } 
                      />

                      {/* LABORATORY MODUL ROUTES */}
                      <Route 
                        path="/lab/input" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'analis']}>
                            <InputPemeriksaan />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/lab/master" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'analis']}>
                            <MasterPemeriksaan />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/lab/dashboard" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'analis']}>
                            <DashboardLab />
                          </ProtectedRoute>
                        } 
                      />

                      {/* PHARMACY MODUL ROUTES */}
                      <Route 
                        path="/farmasi/master" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'farmasi']}>
                            <MasterObat />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/farmasi/input" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'farmasi']}>
                            <InputKonsumsi />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/farmasi/forecast" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'farmasi']}>
                            <Forecasting />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/farmasi/abc" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'farmasi']}>
                            <AbcAnalysis />
                          </ProtectedRoute>
                        } 
                      />

                      {/* SYSTEM ADMINISTRATION ROUTES */}
                      <Route 
                        path="/admin/users" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <UsersManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/admin/logs" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <ActivityLogs />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/admin/db-settings" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <DatabaseSettings />
                          </ProtectedRoute>
                        } 
                      />

                      {/* Wildcard Fallback redirection */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
