import React from 'react';
import { RefreshCw } from 'lucide-react';

interface AnalyticLoaderProps {
  message?: string;
}

export default function AnalyticLoader({ message = 'Membuat visualisasi analitik...' }: AnalyticLoaderProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center min-h-[320px] transition-all duration-300">
      <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mb-3" />
      <span className="text-slate-600 font-medium text-sm tracking-wide animate-pulse">{message}</span>
    </div>
  );
}
