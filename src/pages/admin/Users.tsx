import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../../store/authStore.js';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Key, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  X,
  Mail,
  UserCheck,
  Shield,
  Save
} from 'lucide-react';
import api from '../../services/api.js';
import { User } from '../../types.js';

export default function UsersManagement() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states and toggles
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // User input states
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'perawat' | 'analis' | 'farmasi' | 'lab'>('analis');

  // Reset password states
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const loadUsersStore = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal mendownload data akun dari server.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersStore();
  }, []);

  const handleOpenAddForm = () => {
    setEditId(null);
    setNama('');
    setEmail('');
    setPassword('');
    setRole('analis');
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleOpenEditForm = (u: User) => {
    setEditId(u.id);
    setNama(u.nama);
    setEmail(u.email);
    setPassword(''); // don't fill password on edit
    setRole(u.role);
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleOpenResetForm = (u: User) => {
    setResetUserId(u.id);
    setNewPassword('');
    setIsResetOpen(true);
    setFeedback(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !email || (!editId && !password)) {
      setFeedback({ type: 'error', msg: 'Harap lengkapi semua isian formulir.' });
      return;
    }

    try {
      if (editId) {
        await api.put(`/admin/users/${editId}`, { nama, email, role });
        setFeedback({ type: 'success', msg: `Profil petugas ${nama} berhasil disimpan.` });
      } else {
        await api.post('/admin/users', { nama, email, password, role });
        setFeedback({ type: 'success', msg: `Petugas baru ${nama} berhasil didaftarkan.` });
      }
      setIsFormOpen(false);
      loadUsersStore();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal memproses pendaftaran: ' + (err.response?.data?.message || err.message) });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !resetUserId) return;

    try {
      await api.post('/admin/reset-password', {
        userId: resetUserId,
        newPassword
      });
      setIsResetOpen(false);
      const targetUser = users.find(u => u.id === resetUserId);
      setFeedback({ type: 'success', msg: `Kata sandi akun ${targetUser?.nama} berhasil diatur ulang.` });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal menyetel sandi baru.' });
    }
  };

  const handleDeleteUser = async (id: number, namaUser: string) => {
    if (id === currentUser?.id) {
      setFeedback({ type: 'error', msg: 'Anda tidak dapat menghapus akun Anda sendiri.' });
      return;
    }

    Swal.fire({
      title: 'Hapus Akun?',
      text: `Apakah Anda yakin ingin menghapus permanen akses akun ${namaUser}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/admin/users/${id}`);
          setFeedback({ type: 'success', msg: `Akses akun ${namaUser} berhasil dihapus.` });
          loadUsersStore();
        } catch (err: any) {
          console.error(err);
          setFeedback({ type: 'error', msg: 'Gagal menghapus user.' });
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header controls layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            <span>Manajemen Akun Hak Akses Petugas</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Pengelolaan sirkulasi akun pelaksana laboratorium, apoteker farmasi, serta kredensial administrator.
          </p>
        </div>

        <button
          id="add-user-btn"
          onClick={handleOpenAddForm}
          className="flex items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-5 rounded-xl shadow-md transition-colors cursor-pointer"
          style={{ minHeight: '44px' }}
        >
          <Plus className="h-5 w-5" />
          <span>Daftarkan Petugas</span>
        </button>
      </div>

      {feedback && (
        <div id="users-feedback-alert" className={`p-4 rounded-xl flex items-center space-x-2 text-sm font-semibold ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Dynamic inline register form drawer */}
      {isFormOpen && (
        <div className="bg-white text-slate-800 rounded-2xl p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
              <Shield className="h-4.5 w-4.5 text-teal-600" />
              <span>{editId ? `Ubah Detail Akses Petugas` : 'Daftarkan Petugas Baru'}</span>
            </h2>
            <button 
              id="close-user-form-btn"
              onClick={() => setIsFormOpen(false)} 
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
              style={{ minHeight: '32px', minWidth: '32px' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label htmlFor="fullname" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Nama Lengkap</label>
              <input
                id="fullname"
                type="text"
                required
                placeholder="ex: Dr. Made Wardina"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-sans"
              />
            </div>

            <div>
              <label htmlFor="useremail" className="block text-xs font-bold text-slate-700 uppercase tracking-wide leading-relaxed">Email Login</label>
              <input
                id="useremail"
                type="email"
                required
                placeholder="clinician@puri.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-50 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono"
              />
            </div>

            {/* Password input displays on register only */}
            {!editId && (
              <div>
                <label htmlFor="userpass" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Kata Sandi Awal</label>
                <input
                  id="userpass"
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-sans"
                />
              </div>
            )}

            <div>
              <label htmlFor="userrole" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Hak Akses Modul (Role)</label>
              <select
                id="userrole"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer font-sans"
                style={{ minHeight: '44px' }}
              >
                <option value="analis">Analis Lab (Akses Laboratorium)</option>
                <option value="lab">Analis Lab (Akses Laboratorium - Lab)</option>
                <option value="perawat">Perawat (Akses Pelayanan Klinik)</option>
                <option value="farmasi">Petugas Farmasi (Akses Farmasi)</option>
                <option value="admin">Sistem Admin (Semua Akses / Full Access)</option>
              </select>
            </div>

            <div className="md:col-span-4 flex justify-end space-x-3 pt-3">
              <button
                id="cancel-user-btn"
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white text-slate-700 hover:bg-slate-50 transition-all text-sm font-bold cursor-pointer shadow-sm"
                style={{ minHeight: '44px' }}
              >
                Batalkan
              </button>
              <button
                id="submit-user-btn"
                type="submit"
                className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm cursor-pointer shadow-sm"
                style={{ minHeight: '44px' }}
              >
                <Save className="h-4.5 w-4.5" />
                <span>Simpan Akun</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password reset drawer block */}
      {isResetOpen && (
        <div className="bg-white rounded-2xl p-6 shadow-md max-w-md space-y-4">
          <div className="flex items-center justify-between pb-3 mb-4">
            <h3 className="text-sm font-bold text-amber-600 flex items-center space-x-2">
              <Key className="h-4.5 w-4.5" />
              <span>Atur Ulang Sandi Keamanan</span>
            </h3>
            <button 
              id="close-reset-dialog"
              onClick={() => setIsResetOpen(false)} 
              className="text-slate-400 hover:text-slate-700 transition-colors"
              style={{ minHeight: '32px', minWidth: '32px' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="new-dialog-pass" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Password Baru</label>
              <input
                id="new-dialog-pass"
                type="password"
                required
                placeholder="Masukkan password baru"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-sans"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                id="cancel-reset-password-btn"
                type="button"
                onClick={() => setIsResetOpen(false)}
                className="px-4 py-2 bg-white text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                style={{ minHeight: '36px' }}
              >
                Batal
              </button>
              <button
                id="submit-reset-password-btn"
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                style={{ minHeight: '36px' }}
              >
                Simpan Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts display catalog */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr className="text-slate-700 text-xs font-bold uppercase tracking-wider">
                <th scope="col" className="px-6 py-4">Nama Petugas</th>
                <th scope="col" className="px-6 py-4">Kredensial</th>
                <th scope="col" className="px-6 py-4">Fakultas / Role</th>
                <th scope="col" className="px-6 py-4">Terdaftar</th>
                <th scope="col" className="px-6 py-4 text-right">Aksi Administrasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 text-xs font-normal">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500 font-medium">
                    <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto mb-2" />
                    <span>Sinkronisasi database personil...</span>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 bg-slate-100 flex items-center justify-center font-bold text-teal-700 rounded-full uppercase flex-shrink-0">
                          {u.nama.substring(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 text-xs">{u.nama}</h4>
                          {u.id === currentUser?.id && (
                            <span className="text-xxs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded font-bold font-mono">AKUN ANDA SIKAS</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-700">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 text-xxs font-bold uppercase tracking-wider rounded-lg ${
                        u.role === 'admin' ? 'bg-teal-50 text-teal-700' :
                        u.role === 'perawat' ? 'bg-sky-50 text-sky-700' :
                        u.role === 'analis' || u.role === 'lab' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {u.role === 'admin' ? <Shield className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                        <span>
                          {u.role === 'admin' ? 'Sistem Admin' :
                           u.role === 'perawat' ? 'Perawat (Pelayanan Klinik)' :
                           u.role === 'analis' || u.role === 'lab' ? 'Analis Lab' :
                           u.role === 'farmasi' ? 'Petugas Farmasi' : u.role}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-700">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          id={`user-edit-${u.id}`}
                          onClick={() => handleOpenEditForm(u)}
                          className="p-1 px-2 bg-white text-slate-700 hover:text-teal-600 hover:bg-slate-50 rounded-lg text-xxs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Edit"
                          style={{ minHeight: '32px' }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          id={`user-pass-reset-${u.id}`}
                          onClick={() => handleOpenResetForm(u)}
                          className="p-1 px-2 bg-white text-amber-700 hover:bg-amber-50 rounded-lg text-xxs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Reset Password"
                          style={{ minHeight: '32px' }}
                        >
                          <Key className="h-3.5 w-3.5" />
                          <span>Password</span>
                        </button>
                        <button
                          id={`user-delete-${u.id}`}
                          onClick={() => handleDeleteUser(u.id, u.nama)}
                          disabled={u.id === currentUser?.id}
                          className="p-1 px-2 bg-white text-rose-700 hover:bg-rose-50 rounded-lg text-xxs font-bold flex items-center space-x-1 disabled:opacity-40 cursor-pointer transition-colors"
                          title="Hapus Akun"
                          style={{ minHeight: '32px' }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
