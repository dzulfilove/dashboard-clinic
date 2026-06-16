import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';

// Layout & guards
import Sidebar from './components/Sidebar.js';
import ProtectedRoute from './components/ProtectedRoute.js';

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
import DatabaseSettings from './pages/admin/DatabaseSettings.js';
import RawatJalan from './pages/pelayanan/RawatJalan.js';
import MasterTindakan from './pages/pelayanan/MasterTindakan.js';
import MasterPasien from './pages/pelayanan/MasterPasien.js';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Read cached login sessions on load
    initialize();
  }, [initialize]);

  return (
    <Router>
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
                <div className="absolute top-[10%] right-[-10%] w-[45rem] h-[45rem] bg-teal-300/10 rounded-full blur-[130px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35rem] h-[35rem] bg-indigo-300/10 rounded-full blur-[120px] pointer-events-none" />
                
                {/* Sidebar Navigation */}
                <Sidebar />

                {/* Core Main Viewport Stage */}
                <main id="main-viewport" className="relative z-10 flex-1 px-4 py-8 md:p-8 overflow-y-auto max-h-screen">
                  <div className="max-w-7xl mx-auto">
                    <Routes>
                      {/* Integrated Shared Dashboard (Home) */}
                      <Route path="/" element={<Dashboard />} />

                      {/* LABORATORY MODUL ROUTES */}
                      <Route 
                        path="/pelayanan/rawat-jalan" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'perawat', 'analis']}>
                            <RawatJalan />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pelayanan/master-tindakan" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <MasterTindakan />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pelayanan/master-pasien" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <MasterPasien />
                          </ProtectedRoute>
                        } 
                      />

                      {/* LABORATORY MODUL ROUTES */}
                      <Route 
                        path="/lab/input" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'lab', 'perawat', 'analis']}>
                            <InputPemeriksaan />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/lab/master" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'lab', 'perawat', 'analis']}>
                            <MasterPemeriksaan />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/lab/dashboard" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'lab', 'perawat', 'analis']}>
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
    </Router>
  );
}
