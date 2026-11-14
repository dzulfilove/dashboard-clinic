import React from 'react';
import PageHeader from '../../components/PageHeader.js';

export default function MutuInput() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Input Indikator Mutu"
        subtitle="Pencatatan harian indikator mutu per unit: grid tanggal 1-31, simpan otomatis per sel, dan validasi empat gerbang."
      />
      <div className="rounded-2xl border border-[#E5EEFF] bg-white p-6">
        <p className="text-sm text-[#516070]">
          Kerangka halaman sudah terpasang. Isi halaman dibuat pada fase berikutnya.
        </p>
      </div>
    </div>
  );
}
