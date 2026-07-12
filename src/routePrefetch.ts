const routeLoaders: Array<() => Promise<unknown>> = [
  () => import('./pages/Dashboard.js'),
  () => import('./pages/pelayanan/RawatJalan.js'),
  () => import('./pages/pelayanan/IGD.js'),
  () => import('./pages/pelayanan/RawatInap.js'),
  () => import('./pages/pelayanan/DashboardDokter.js'),
  () => import('./pages/lab/InputPemeriksaan.js'),
  () => import('./pages/farmasi/InputKonsumsi.js'),
  () => import('./pages/farmasi/MasterObat.js'),
  () => import('./pages/pelayanan/MasterPasien.js'),
  () => import('./pages/pelayanan/MasterDokter.js'),
  () => import('./pages/pelayanan/MasterTindakan.js'),
  () => import('./pages/pelayanan/MasterICD10.js'),
  () => import('./pages/pelayanan/MasterWilayah.js'),
  () => import('./pages/pelayanan/FollowUpVaksin.js'),
  () => import('./pages/demografi/DemografiKunjungan.js'),
  () => import('./pages/demografi/DemografiDiagnosa.js'),
  () => import('./pages/lab/MasterPemeriksaan.js'),
  () => import('./pages/lab/DashboardLab.js'),
  () => import('./pages/farmasi/Forecasting.js'),
  () => import('./pages/farmasi/AbcAnalysis.js'),
  () => import('./pages/admin/Users.js'),
  () => import('./pages/admin/ActivityLogs.js'),
  () => import('./pages/admin/DatabaseSettings.js'),
  () => import('./components/InteractiveGuide.js'),
  () => import('./pages/Login.js')
];

let started = false;

export function prefetchRoutes() {
  if (typeof window === 'undefined' || started) return;
  started = true;

  let index = 0;

  const loadNext = () => {
    if (index >= routeLoaders.length) return;
    const loader = routeLoaders[index++];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schedule = (window as any).requestIdleCallback || ((cb: Function) => setTimeout(cb, 300));
    
    schedule(() => {
      loader()
        .catch(() => {})
        .finally(() => {
          loadNext();
        });
    });
  };

  loadNext();
}
