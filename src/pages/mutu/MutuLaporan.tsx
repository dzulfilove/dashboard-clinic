import React from 'react';
import PageHeader from '../../components/PageHeader.js';

export default function MutuLaporan() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Mutu"
        subtitle="Laporan bulanan siap cetak: capaian, status terhadap target, indikator tidak tercapai, dan daftar hari kosong."
      />
      <div className="rounded-2xl border border-[#E5EEFF] bg-white p-6">
        <p className="text-sm text-[#516070]">
          Kerangka halaman sudah terpasang. Isi halaman dibuat pada fase berikutnya.
        </p>
      </div>
    </div>
  );
}
