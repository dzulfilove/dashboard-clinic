import React, { useState, useEffect } from 'react';
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
  const [role, setRole] = useState<'admin' | 'lab' | 'farmasi'>('lab');

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
    setRole('lab');
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

    if (!window.confirm(`Apakah Anda yakin ingin menghapus permanen akses akun ${namaUser}?`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${id}`);
      setFeedback({ type: 'success', msg: `Akses akun ${namaUser} berhasil dihapus.` });
      loadUsersStore();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal menghapus user.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-teal-600" />
            <span>Manajemen Akun Hak Akses Petugas</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
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
        <div id="users-feedback-alert" className={`p-4 rounded-xl border flex items-center space-x-2 text-sm font-semibold ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-800' : 'bg-rose-50 border-rose-150 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Dynamic inline register form drawer */}
      {isFormOpen && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-extrabold text-teal-400">
              {editId ? `Ubah Detail Akses` : 'Daftarkan Petugas Baru'}
            </h2>
            <button 
              id="close-user-form-btn"
              onClick={() => setIsFormOpen(false)} 
              className="text-slate-400 hover:text-slate-200 p-1 rounded-md"
              style={{ minHeight: '32px', minWidth: '32px' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label htmlFor="fullname" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Nama Lengkap</label>
              <input
                id="fullname"
                type="text"
                required
                placeholder="ex: Dr. Made Wardina"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-teal-500/35"
              />
            </div>

            <div>
              <label htmlFor="useremail" className="block text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Email Login</label>
              <input
                id="useremail"
                type="email"
                required
                placeholder="clinician@puri.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-teal-500/35 font-mono"
              />
            </div>

            {/* Password input displays on register only */}
            {!editId && (
              <div>
                <label htmlFor="userpass" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Kata Sandi Awal</label>
                <input
                  id="userpass"
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-teal-500/35"
                />
              </div>
            )}

            <div>
              <label htmlFor="userrole" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Hak Akses Modul (Role)</label>
              <select
                id="userrole"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-teal-500/35 cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                <option value="lab">Petugas Lab (Modul Laboratorium)</option>
                <option value="farmasi">Apoteker (Modul Farmasi)</option>
                <option value="admin">Sistem Admin (Semua Modul)</option>
              </select>
            </div>

            <div className="md:col-span-4 flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                id="cancel-user-btn"
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-bold cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                Batalkan
              </button>
              <button
                id="submit-user-btn"
                type="submit"
                className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-550 text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-sm cursor-pointer"
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-amber-500 flex items-center space-x-2">
              <Key className="h-4.5 w-4.5" />
              <span>Atur Ulang Sandi Keamanan</span>
            </h3>
            <button 
              id="close-reset-dialog"
              onClick={() => setIsResetOpen(false)} 
              className="text-slate-400 hover:text-white"
              style={{ minHeight: '32px', minWidth: '32px' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="new-dialog-pass" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Password Baru</label>
              <input
                id="new-dialog-pass"
                type="password"
                required
                placeholder="Masukkan password baru"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                id="cancel-reset-password-btn"
                type="button"
                onClick={() => setIsResetOpen(false)}
                className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-800"
                style={{ minHeight: '36px' }}
              >
                Batal
              </button>
              <button
                id="submit-reset-password-btn"
                type="submit"
                className="bg-amber-600 hover:bg-amber-550 text-white text-xs font-bold px-4 py-2 rounded-xl"
                style={{ minHeight: '36px' }}
              >
                Simpan Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts display catalog */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Nama Petugas</th>
                <th scope="col" className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Kredensial</th>
                <th scope="col" className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Fakultas / Role</th>
                <th scope="col" className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Terdaftar</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-extrabold uppercase tracking-widest text-slate-500">Aksi Administrasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                    <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto mb-2" />
                    <span>Sinkronisasi database personil...</span>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 bg-slate-100 border border-teal-500 flex items-center justify-center font-bold text-teal-700 rounded-full uppercase flex-shrink-0">
                          {u.nama.substring(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{u.nama}</h4>
                          {u.id === currentUser?.id && (
                            <span className="text-xxs bg-teal-50 text-teal-700 border border-teal-100 px-1.5 py-0.5 rounded font-bold font-mono">AKUN ANDA SIKAS</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 text-xxs font-extrabold border uppercase tracking-wider rounded-lg ${
                        u.role === 'admin' ? 'bg-indigo-50 border-indigo-150 text-indigo-700' :
                        u.role === 'lab' ? 'bg-emerald-50 border-emerald-150 text-emerald-700' :
                        'bg-amber-50 border-amber-150 text-amber-700'
                      }`}>
                        {u.role === 'admin' ? <Shield className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                        <span>{u.role}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-550">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          id={`user-edit-${u.id}`}
                          onClick={() => handleOpenEditForm(u)}
                          className="p-1 px-2 border border-slate-200 bg-white text-slate-600 hover:text-teal-600 hover:bg-slate-50 rounded-lg text-xxs font-extrabold flex items-center space-x-1"
                          title="Edit"
                          style={{ minHeight: '32px' }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          id={`user-pass-reset-${u.id}`}
                          onClick={() => handleOpenResetForm(u)}
                          className="p-1 px-2 border border-amber-200 bg-white text-amber-600 hover:bg-amber-50 rounded-lg text-xxs font-extrabold flex items-center space-x-1"
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
                          className="p-1 px-2 border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 rounded-lg text-xxs font-extrabold flex items-center space-x-1 disabled:opacity-40"
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
