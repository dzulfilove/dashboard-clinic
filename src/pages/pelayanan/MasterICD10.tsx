import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';

interface ICD10 {
  id: number;
  kode_icd: string;
  deskripsi: string;
}

export default function MasterICD10() {
  const [data, setData] = useState<ICD10[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ICD10 | null>(null);
  const [formData, setFormData] = useState({ kode_icd: '', deskripsi: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pelayanan/icd10');
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/pelayanan/icd10/${editingItem.id}`, formData);
      } else {
        await api.post('/pelayanan/icd10', formData);
      }
      setIsModalOpen(false);
      setFormData({ kode_icd: '', deskripsi: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Master Data ICD-10</h2>
        <button 
          onClick={() => { setEditingItem(null); setFormData({ kode_icd: '', deskripsi: '' }); setIsModalOpen(true); }}
          className="bg-teal-600 text-white p-2 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Tambah ICD-10
        </button>
      </div>

      <table className="w-full bg-white rounded-xl shadow-sm border border-slate-100">
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold">
          <tr>
            <th className="p-4 text-left">Kode</th>
            <th className="p-4 text-left">Deskripsi</th>
            <th className="p-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item) => (
            <tr key={item.id}>
              <td className="p-4 text-sm font-mono">{item.kode_icd}</td>
              <td className="p-4 text-sm">{item.deskripsi}</td>
              <td className="p-4 text-right">
                <button onClick={() => { setEditingItem(item); setFormData({ kode_icd: item.kode_icd, deskripsi: item.deskripsi }); setIsModalOpen(true); }} className="text-teal-600 hover:text-teal-700 mr-2"><Edit2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl w-full max-w-sm">
            <h3 className="font-bold text-lg mb-4">{editingItem ? 'Edit ICD-10' : 'Tambah ICD-10'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Kode ICD-10" value={formData.kode_icd} onChange={e => setFormData({...formData, kode_icd: e.target.value})} className="w-full p-2 border rounded-lg" required />
              <input type="text" placeholder="Deskripsi" value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} className="w-full p-2 border rounded-lg" required />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500">Batal</button>
              <button type="submit" className="bg-teal-600 text-white p-2 rounded-lg">Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
