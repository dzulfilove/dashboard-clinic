import React from 'react';
import PageHeader from '../../components/PageHeader.js';

export default function MutuTindakLanjut() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tindak Lanjut"
        subtitle="Rencana tindak lanjut dengan penanggung jawab dan tenggat, dievaluasi kembali pada periode berikutnya."
      />
      <div className="rounded-2xl border border-[#E5EEFF] bg-white p-6">
        <p className="text-sm text-[#516070]">
          Kerangka halaman sudah terpasang. Isi halaman dibuat pada fase berikutnya.
        </p>
      </div>
    </div>
  );
}
