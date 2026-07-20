export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <div className="three-body">
        <div className="three-body__dot"></div>
        <div className="three-body__dot"></div>
        <div className="three-body__dot"></div>
      </div>
      <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat data...</p>
    </div>
  );
}
