// Prefetch only the top 5 most frequently accessed routes with idle delay
const routeLoaders: Array<() => Promise<unknown>> = [
  () => import('./pages/Dashboard.js'),
  () => import('./pages/pelayanan/RawatJalan.js'),
  () => import('./pages/pelayanan/IGD.js'),
  () => import('./pages/lab/InputPemeriksaan.js'),
  () => import('./pages/farmasi/InputKonsumsi.js')
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
    const schedule = (window as any).requestIdleCallback || ((cb: Function) => setTimeout(cb, 600));
    
    schedule(() => {
      loader()
        .catch(() => {})
        .finally(() => {
          setTimeout(loadNext, 600);
        });
    });
  };

  // Wait 2 seconds after initial load before starting sequential prefetch
  setTimeout(loadNext, 2000);
}
