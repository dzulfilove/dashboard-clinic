import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="pb-4 border-b border-[#E5EEFF]">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1C30] tracking-tight font-display leading-tight">
        {title}
      </h1>
      <p className="text-xs sm:text-sm text-[#516070] font-medium mt-1 leading-relaxed max-w-3xl">
        {subtitle}
      </p>
    </header>
  );
}
