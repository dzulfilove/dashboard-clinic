import React, { useState, useEffect, useMemo } from 'react';
import { SearchableSelect } from '../../components/SearchableSelect.js';
import { AsyncPasienSelect } from '../../components/AsyncPasienSelect.js';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, Edit3, ClipboardList, TrendingUp, FileText, Clock, CheckCircle, AlertCircle, Search, X, Syringe, Send, MessageSquare, Bell, BellRing, Check, UserPlus, Loader2, Filter, CalendarDays, CalendarPlus, Stethoscope, Settings, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import api from '../../services/api.js';
import { Pasien, FollowUpVaksin as FollowUpType } from '../../types.js';

const formatTanggalIndo = (tanggalStr: string | null | undefined) => {
  if (!tanggalStr) return '-';
  try {
    const rawDate = tanggalStr.includes('T') ? tanggalStr.split('T')[0] : tanggalStr;
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      
      const d = new Date(year + '/' + parts[1] + '/' + parts[2]);
      const dayName = !isNaN(d.getTime()) ? days[d.getDay()] : '';
      
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${dayName ? dayName + ', ' : ''}${day} ${months[monthIndex]} ${year}`;
      }
    }
    const d = new Date(tanggalStr);
    if (!isNaN(d.getTime())) {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch (e) {
    console.warn('Gagal memformat tanggal:', e);
  }
  return tanggalStr;
};

const getStatusBadgeStyle = (status?: string) => {
  const normalized = String(status || 'scheduled').toLowerCase();
  switch (normalized) {
    case 'completed':
    case 'selesai':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'notified':
    case 'notifikasi terkirim':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'cancelled':
    case 'batal':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'scheduled':
    case 'terjadwal':
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};

const INDONESIAN_STATUSES = [
  { value: 'Scheduled', label: 'Terjadwal' },
  { value: 'Notified', label: 'Notifikasi Terkirim' },
  { value: 'Completed', label: 'Selesai' },
  { value: 'Cancelled', label: 'Batal' }
];

const PAKET_VAKSIN_LIST = [
  'Paket Kanker Serviks (HPV) - Cervarix',
  'Paket Kanker Serviks (HPV) - Gardasil 9',
  'Paket Imunisasi Dasar Lengkap (Bayi)',
  'Vaksinasi Covid-19 Booster',
  'Vaksinasi Influenza Annual',
  'Vaksinasi Hepatitis B Dewasa',
  'Vaksinasi Meningitis Umroh/Haji'
];

const UNIT_KUNJUNGAN_LIST = [
  'Poli Vaksinasi & Imunisasi',
  'Poli KIA (Kesehatan Ibu dan Anak)',
  'Poli Anak',
  'Poli Umum',
  'Poli Penyakit Dalam',
  'Poli Bedah',
  'Poli Jantung & Pembuluh Darah',
  'Poli Gigi',
  'Layanan Homecare',
  'Unit MCU & Vaksinasi Mandiri'
];

export default function FollowUpVaksinPage() {
  const [data, setData] = useState<FollowUpType[]>([]);
  const [pasienList, setPasienList] = useState<Pasien[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [activeTab, setActiveTab] = useState<'list' | 'stats' | 'patients'>('list');
  const [statsDateStart, setStatsDateStart] = useState('');
  const [statsDateEnd, setStatsDateEnd] = useState('');
  const [statsPaketVaksin, setStatsPaketVaksin] = useState('Semua');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<string | null>(null);
  
  const [paketVaksinList, setPaketVaksinList] = useState<string[]>(() => {
    const saved = localStorage.getItem('paket_vaksin_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return PAKET_VAKSIN_LIST;
  });

  const [selectedPaket, setSelectedPaket] = useState('Semua');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Quick Add Patient States
  const [isCreatingPasien, setIsCreatingPasien] = useState(false);
  const [newPasienData, setNewPasienData] = useState({
    no_rm: '',
    nama: '',
    tanggal_lahir: '',
    jenis_kelamin: 'L' as 'L' | 'P',
    alamat: '',
    no_telp: ''
  });
  const [pasienSubmitting, setPasienSubmitting] = useState(false);

  // States to handle missing phone numbers dynamically
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [inputPhoneVal, setInputPhoneVal] = useState('');

  // Helper to calculate age from birthdate
  const calculateAge = (birthdateStr: string) => {
    if (!birthdateStr) return '';
    const birth = new Date(birthdateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return String(age);
  };

  // Handler to save new patient
  const handleSaveNewPasien = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasienData.no_rm.trim() || !newPasienData.nama.trim()) {
      Swal.fire('Peringatan', 'Nomor RM dan Nama Lengkap wajib diisi!', 'warning');
      return;
    }

    setPasienSubmitting(true);
    try {
      await api.post('/pasien', newPasienData);
      
      // 1. Show Toast Success
      Swal.fire({
        icon: 'success',
        title: 'Pasien Berhasil Didaftarkan',
        text: `Pasien ${newPasienData.nama} [${newPasienData.no_rm}] telah terdaftar di rekam medis.`,
        timer: 2000,
        showConfirmButton: false
      });

      // 2. Refetch patient list
      const resPasien = await api.get('/pasien');
      const patientsData = Array.isArray(resPasien.data) ? resPasien.data : (resPasien.data?.data || []);
      setPasienList(patientsData);

      // 3. Auto select this new patient
      setFormData(prev => ({
        ...prev,
        pasien_no_rm: newPasienData.no_rm,
        pasien_nama: newPasienData.nama,
        usia: calculateAge(newPasienData.tanggal_lahir)
      }));
      setShowPhoneInput(false);
      setInputPhoneVal(newPasienData.no_telp || '');

      // 4. Reset & close new patient form
      setNewPasienData({
        no_rm: '',
        nama: '',
        tanggal_lahir: '',
        jenis_kelamin: 'L',
        alamat: '',
        no_telp: ''
      });
      setIsCreatingPasien(false);
    } catch (err: any) {
      console.error('Error saving new patient:', err);
      const errMsg = err.response?.data?.message || 'Nomor Rekam Medis (RM) sudah terdaftar atau format salah.';
      Swal.fire('Gagal Mendaftarkan Pasien', errMsg, 'error');
    } finally {
      setPasienSubmitting(false);
    }
  };
  
  // Form States
  const [selectedPasienOption, setSelectedPasienOption] = useState<any>(null);
  const [formData, setFormData] = useState({
    no_order: '',
    unit_kunjungan: 'Poli Vaksinasi & Imunisasi',
    pasien_no_rm: '',
    pasien_nama: '',
    usia: '',
    kunjungan_terakhir: '',
    tanggal_rencana: '',
    rencana_kunjungan_ke: '1',
    diagnosa_keluhan: '',
    status_rencana: 'Scheduled',
    catatan_hasil: '',
    paket_vaksin: 'Paket Kanker Serviks (HPV) - Cervarix',
    rencana_tindakan: '',
    jumlah_pemeriksaan: ''
  });

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [resFollowup, resPasien] = await Promise.all([
        api.get('/followup-vaksin'),
        api.get('/pasien')
      ]);
      const followupData = Array.isArray(resFollowup.data) ? resFollowup.data : [];
      const patientsData = Array.isArray(resPasien.data) ? resPasien.data : (resPasien.data?.data || []);
      setData(followupData);
      setPasienList(patientsData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      Swal.fire('Error', 'Gagal memuat data dari server: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Autofill jumlah_pemeriksaan from previous visit
  useEffect(() => {
    console.log('Autofill check:', {
      no_rm: formData.pasien_no_rm,
      kunjungan: formData.rencana_kunjungan_ke,
      dataCount: data.length
    });
    if (formData.pasien_no_rm && Number(formData.rencana_kunjungan_ke) > 1) {
      const prevVisit = Number(formData.rencana_kunjungan_ke) - 1;
      const prevRecord = data.find(item => item.pasien_no_rm === formData.pasien_no_rm && Number(item.rencana_kunjungan_ke) === prevVisit);
      
      console.log('Prev record:', prevRecord);

      if (prevRecord && prevRecord.jumlah_pemeriksaan && (!formData.jumlah_pemeriksaan || formData.jumlah_pemeriksaan === '')) {
        console.log('Autofilling with:', prevRecord.jumlah_pemeriksaan);
        setFormData(prev => ({ ...prev, jumlah_pemeriksaan: String(prevRecord.jumlah_pemeriksaan) }));
      }
    }
  }, [formData.pasien_no_rm, formData.rencana_kunjungan_ke, data]);

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        String(item.pasien_nama || '').toLowerCase().includes(search.toLowerCase()) ||
        String(item.pasien_no_rm || '').toLowerCase().includes(search.toLowerCase()) ||
        String(item.no_order || '').toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'Semua' || item.status_rencana === statusFilter;
      const matchesPaket = selectedPaket === 'Semua' || item.paket_vaksin === selectedPaket;
      
      return matchesSearch && matchesStatus && matchesPaket;
    });
  }, [data, search, statusFilter, selectedPaket]);

  // Statistics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let total = data.length;
    let scheduled = data.filter(i => i.status_rencana === 'Scheduled').length;
    let completed = data.filter(i => i.status_rencana === 'Completed').length;
    let notified = data.filter(i => i.status_rencana === 'Notified').length;
    
    // Check pending notifications for today or overdue
    let pendingNotifications = data.filter(i => {
      if (i.status_rencana !== 'Scheduled' || !i.tanggal_rencana) return false;
      const planDate = i.tanggal_rencana.split('T')[0];
      return planDate <= todayStr;
    });

    return {
      total,
      scheduled,
      completed,
      notified,
      pendingCount: pendingNotifications.length,
      pendingList: pendingNotifications
    };
  }, [data]);

  // Handle Patient Dropdown Change
  const handlePasienChange = (no_rm: string) => {
    const p = pasienList.find(item => item.no_rm === no_rm);
    if (p) {
      // Calculate age from birthdate
      let calculatedAge = '';
      if (p.tanggal_lahir) {
        const birth = new Date(p.tanggal_lahir);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        calculatedAge = String(age);
      }
      setFormData(prev => ({
        ...prev,
        pasien_no_rm: p.no_rm,
        pasien_nama: p.nama,
        usia: calculatedAge
      }));

      // Check if patient has a phone number
      if (!p.no_telp || p.no_telp.trim() === '') {
        setShowPhoneInput(true);
        setInputPhoneVal('');
      } else {
        setShowPhoneInput(false);
        setInputPhoneVal(p.no_telp);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        pasien_no_rm: '',
        pasien_nama: '',
        usia: ''
      }));
      setShowPhoneInput(false);
      setInputPhoneVal('');
    }
  };

  // Handle Edit click
  const handleEditClick = (item: FollowUpType) => {
    setIsEditing(true);
    setEditingId(item.id || null);
    setIsCreatingPasien(false);
    
    // Format dates to YYYY-MM-DD for inputs
    const formatInputDate = (dStr?: string) => {
      if (!dStr) return '';
      return dStr.split('T')[0];
    };

    setSelectedPasienOption({
      value: item.pasien_no_rm,
      label: `[${item.pasien_no_rm}] ${item.pasien_nama}`,
      pasien: { no_rm: item.pasien_no_rm, nama: item.pasien_nama }
    });
    setFormData({
      no_order: item.no_order || '',
      unit_kunjungan: item.unit_kunjungan || 'Poli Vaksinasi & Imunisasi',
      pasien_no_rm: item.pasien_no_rm || '',
      pasien_nama: item.pasien_nama || '',
      usia: item.usia ? String(item.usia) : '',
      kunjungan_terakhir: formatInputDate(item.kunjungan_terakhir),
      tanggal_rencana: formatInputDate(item.tanggal_rencana),
      rencana_kunjungan_ke: item.rencana_kunjungan_ke ? String(item.rencana_kunjungan_ke) : '1',
      diagnosa_keluhan: item.diagnosa_keluhan || '',
      status_rencana: item.status_rencana || 'Scheduled',
      catatan_hasil: item.catatan_hasil || '',
      paket_vaksin: item.paket_vaksin || 'Paket Kanker Serviks (HPV) - Cervarix',
      rencana_tindakan: item.rencana_tindakan || '',
      jumlah_pemeriksaan: item.jumlah_pemeriksaan ? String(item.jumlah_pemeriksaan) : ''
    });

    // Check if the edited patient has a phone number
    const p = pasienList.find(pt => pt.no_rm === item.pasien_no_rm);
    if (p) {
      if (!p.no_telp || p.no_telp.trim() === '') {
        setShowPhoneInput(true);
        setInputPhoneVal('');
      } else {
        setShowPhoneInput(false);
        setInputPhoneVal(p.no_telp);
      }
    } else {
      setShowPhoneInput(false);
      setInputPhoneVal('');
    }

    setShowModal(true);
  };


  // Open Add Modal
  const openAddModal = () => {

    setIsEditing(false);
    setEditingId(null);
    setIsCreatingPasien(false);
    setShowPhoneInput(false);
    setInputPhoneVal('');
    setFormData({
      no_order: `ORD-FLW-${Math.floor(1000 + Math.random() * 9000)}`,
      unit_kunjungan: 'Poli Vaksinasi & Imunisasi',
      pasien_no_rm: '',
      pasien_nama: '',
      usia: '',
      kunjungan_terakhir: '',
      tanggal_rencana: new Date().toISOString().split('T')[0],
      rencana_kunjungan_ke: '1',
      diagnosa_keluhan: '',
      status_rencana: 'Scheduled',
      catatan_hasil: '',
      paket_vaksin: 'Paket Kanker Serviks (HPV) - Cervarix',
      rencana_tindakan: '',
      jumlah_pemeriksaan: ''
    });
    setShowModal(true);
  };

  // Add new vaccine package dynamically
  const handleAddNewPaket = async () => {
    const { value: newPaket } = await Swal.fire({
      title: 'Tambah Paket Vaksin Baru',
      input: 'text',
      inputLabel: 'Nama Paket Vaksin / Imunisasi',
      inputPlaceholder: 'Contoh: Vaksinasi Pneumokokus (PCV)',
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      inputValidator: (value) => {
        if (!value) {
          return 'Nama paket tidak boleh kosong!';
        }
        if (paketVaksinList.some(p => p.toLowerCase() === value.trim().toLowerCase())) {
          return 'Paket vaksin sudah ada dalam daftar!';
        }
        return null;
      }
    });

    if (newPaket) {
      const trimmed = newPaket.trim();
      const updatedList = [...paketVaksinList, trimmed];
      setPaketVaksinList(updatedList);
      localStorage.setItem('paket_vaksin_list', JSON.stringify(updatedList));
      setFormData(prev => ({ ...prev, paket_vaksin: trimmed }));
      Swal.fire({
        title: 'Berhasil',
        text: `Paket "${trimmed}" berhasil ditambahkan ke pilihan.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  // Save / Update handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pasien_no_rm || !formData.pasien_nama) {
      Swal.fire('Peringatan', 'Silakan pilih pasien terlebih dahulu', 'warning');
      return;
    }
    if (!formData.tanggal_rencana) {
      Swal.fire('Peringatan', 'Silakan tentukan tanggal rencana kunjungan', 'warning');
      return;
    }

    try {
      // If patient's phone number was missing and is now provided, update it in the database
      if (showPhoneInput && inputPhoneVal && inputPhoneVal.trim() !== '') {
        await api.put(`/pasien/${formData.pasien_no_rm}/no_telp`, { no_telp: inputPhoneVal.trim() });
      }

      // Prepare data for submission
      const submissionData = { 
        ...formData, 
        jumlah_pemeriksaan: (formData.jumlah_pemeriksaan !== '' && formData.jumlah_pemeriksaan !== null && formData.jumlah_pemeriksaan !== undefined) ? Number(formData.jumlah_pemeriksaan) : null 
      };
      if (Number(submissionData.rencana_kunjungan_ke) <= 1 || !submissionData.kunjungan_terakhir) {
        submissionData.kunjungan_terakhir = null as any;
      }

      if (isEditing && editingId) {
        await api.put(`/followup-vaksin/${editingId}`, submissionData);
        Swal.fire('Sukses', 'Data rencana tindak lanjut berhasil diperbarui.', 'success');
      } else {
        await api.post('/followup-vaksin', submissionData);
        Swal.fire('Sukses', 'Rencana tindak lanjut pasien baru berhasil ditambahkan.', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.', 'error');
    }
  };

  // Delete handler
  const handleDelete = async (id: number, nama: string) => {
    const confirm = await Swal.fire({
      title: 'Hapus Rencana?',
      text: `Apakah Anda yakin ingin menghapus rencana kunjungan untuk ${nama}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      try {
        await api.delete(`/followup-vaksin/${id}`);
        Swal.fire('Terhapus', 'Rencana kunjungan berhasil dihapus.', 'success');
        loadData();
      } catch (err: any) {
        Swal.fire('Gagal', err.message || 'Kesalahan sistem saat menghapus.', 'error');
      }
    }
  };

  // Send single notification via WAHA WhatsApp Gateway
  const handleSendNotification = async (item: FollowUpType) => {
    const patient = pasienList.find(p => p.no_rm === item.pasien_no_rm);
    let noTelp = patient?.no_telp || '';

    // Generate beautiful default template
    const defaultMsg = `Halo Kak *${item.pasien_nama}*,\n\n` +
                       `Ini adalah pengingat otomatis dari *Puri Medika*.\n` +
                       `Jadwal kunjungan vaksinasi Kakak berikutnya adalah:\n\n` +
                       `📌 *Paket Vaksin*: ${item.paket_vaksin || '-'}\n` +
                       `📌 *Rencana Tindakan*: ${item.rencana_tindakan || item.diagnosa_keluhan || '-'}\n` +
                       `📅 *Hari/Tanggal*: ${formatTanggalIndo(item.tanggal_rencana)}\n` +
                       `🏥 *Unit Pelayanan*: ${item.unit_kunjungan || 'Poli Vaksinasi'}\n` +
                       `🔢 *Kunjungan Ke*: ${item.rencana_kunjungan_ke}\n\n` +
                       `Mohon konfirmasi kehadiran Kakak dengan membalas pesan ini. Terima kasih dan sehat selalu! ❤️`;

    const { value: formValues } = await Swal.fire({
      title: 'Kirim Pengingat WhatsApp',
      html: `
        <div class="text-left text-xs text-slate-600 space-y-4 p-1">
          <p class="leading-relaxed">Sistem akan mengirimkan pesan pengingat otomatis melalui gateway WhatsApp dengan simulasi pengetikan (typing indicator) demi keamanan akun.</p>
          
          <div>
            <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
              Nomor WhatsApp Pasien <span class="text-rose-500">*</span>
            </label>
            <input 
              id="swal-wa-phone" 
              type="text" 
              placeholder="Contoh: 08123456789 atau 628123456789" 
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-400 font-medium" 
              value="${noTelp}"
            />
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
              Isi Pesan WhatsApp
            </label>
            <textarea 
              id="swal-wa-message" 
              rows="9" 
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-400 font-medium leading-relaxed font-mono"
            >${defaultMsg}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Kirim Sekarang',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0ea5e9', // Sky-500
      cancelButtonColor: '#64748b', // Slate-500
      preConfirm: () => {
        const phoneInput = document.getElementById('swal-wa-phone') as HTMLInputElement;
        const msgInput = document.getElementById('swal-wa-message') as HTMLTextAreaElement;
        
        if (!phoneInput.value.trim()) {
          Swal.showValidationMessage('Nomor WhatsApp wajib diisi!');
          return false;
        }
        if (!msgInput.value.trim()) {
          Swal.showValidationMessage('Isi pesan tidak boleh kosong!');
          return false;
        }
        return {
          phone: phoneInput.value.trim(),
          message: msgInput.value.trim()
        };
      }
    });

    if (formValues) {
      try {
        Swal.fire({
          title: 'Mengirim WhatsApp...',
          html: `Menghubungi WAHA Gateway...<br/><span class="text-xs text-slate-500">Memicu pengetikan (typing indicator)...</span>`,
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // If the phone number changed or was missing, save it to patient details in DB
        if (formValues.phone !== noTelp) {
          await api.put(`/pasien/${item.pasien_no_rm}/no_telp`, { no_telp: formValues.phone });
        }

        // Call the new WAHA proxy API endpoint
        await api.post('/followup-vaksin/send-whatsapp', {
          id: item.id,
          no_telp: formValues.phone,
          message: formValues.message
        });

        Swal.fire({
          icon: 'success',
          title: 'Pesan Berhasil Terkirim!',
          html: `Pesan pengingat WhatsApp berhasil dikirim ke pasien <b>${item.pasien_nama}</b> via WAHA gateway dengan aman.`,
          timer: 3000,
          showConfirmButton: true
        });

        loadData();
      } catch (err: any) {
        console.error('Error sending WAHA notification:', err);
        const errMsg = err.response?.data?.message || err.message || 'Terjadi kesalahan gateway.';
        Swal.fire('Gagal Mengirim', errMsg, 'error');
      }
    }
  };

  // Create next follow-up plan instantly
  const handleCreateNextPlan = async (item: FollowUpType) => {
    // Default next date is 30 days from the current planned date (or today, whichever is later)
    const prevPlannedDate = item.tanggal_rencana ? new Date(item.tanggal_rencana) : new Date();
    const nextPlannedDate = new Date(prevPlannedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const defaultNextDateStr = nextPlannedDate.toISOString().split('T')[0];

    const { value: nextDate } = await Swal.fire({
      title: 'Buat Rencana Berikutnya',
      html: `
        <div class="text-left text-xs text-slate-600 space-y-3 p-1">
          <p class="leading-relaxed">Sistem akan menyalin detail data pasien dan paket vaksinasi, lalu membuat jadwal tindak lanjut kunjungan berikutnya:</p>
          
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 font-medium">
            <div class="flex justify-between border-b border-slate-100 pb-1.5">
              <span class="text-slate-400">Nama Pasien:</span>
              <span class="text-slate-800 font-bold">${item.pasien_nama}</span>
            </div>
            <div class="flex justify-between border-b border-slate-100 pb-1.5">
              <span class="text-slate-400">No RM (Rekam Medis):</span>
              <span class="text-slate-800 font-mono font-bold">${item.pasien_no_rm}</span>
            </div>
            <div class="flex justify-between border-b border-slate-100 pb-1.5">
              <span class="text-slate-400">Paket Vaksin:</span>
              <span class="text-slate-800 font-bold text-sky-700">${item.paket_vaksin}</span>
            </div>
            <div class="flex justify-between border-b border-slate-100 pb-1.5">
              <span class="text-slate-400">Kunjungan Sebelumnya:</span>
              <span class="text-slate-800">Kunjungan Ke-${item.rencana_kunjungan_ke} (${formatTanggalIndo(item.tanggal_rencana)})</span>
            </div>
            <div class="flex justify-between text-emerald-600 font-bold">
              <span>Rencana Berikutnya:</span>
              <span>Kunjungan Ke-${Number(item.rencana_kunjungan_ke) + 1}</span>
            </div>
          </div>

          <div class="pt-2">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Tanggal Rencana Kunjungan Berikutnya <span class="text-rose-500">*</span>
            </label>
            <input 
              id="swal-next-date" 
              type="date" 
              class="w-full px-3.5 py-2.5 bg-amber-50/20 border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-400 font-semibold" 
              value="${defaultNextDateStr}"
            />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Buat Rencana Kunjungan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#059669', // Emerald-600
      cancelButtonColor: '#64748b', // Slate-500
      preConfirm: () => {
        const input = document.getElementById('swal-next-date') as HTMLInputElement;
        if (!input.value) {
          Swal.showValidationMessage('Tanggal rencana kunjungan wajib diisi!');
          return false;
        }
        return input.value;
      }
    });

    if (nextDate) {
      try {
        Swal.fire({
          title: 'Memproses Jadwal...',
          text: 'Harap tunggu...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Auto-generate order number for next visit
        const newOrderNo = `ORD-FLW-${Math.floor(1000 + Math.random() * 9000)}`;
        
        const nextPlan = {
          no_order: newOrderNo,
          unit_kunjungan: item.unit_kunjungan || 'Poli Vaksinasi & Imunisasi',
          pasien_no_rm: item.pasien_no_rm,
          pasien_nama: item.pasien_nama,
          usia: item.usia,
          paket_vaksin: item.paket_vaksin,
          rencana_kunjungan_ke: String(Number(item.rencana_kunjungan_ke) + 1),
          kunjungan_terakhir: item.tanggal_rencana ? item.tanggal_rencana.split('T')[0] : '',
          tanggal_rencana: nextDate,
          diagnosa_keluhan: item.diagnosa_keluhan || '',
          status_rencana: 'Scheduled',
          catatan_hasil: '',
          rencana_tindakan: item.rencana_tindakan || '',
          jumlah_pemeriksaan: item.jumlah_pemeriksaan !== undefined && item.jumlah_pemeriksaan !== null ? Number(item.jumlah_pemeriksaan) : null
        };

        await api.post('/followup-vaksin', nextPlan);
        
        Swal.fire({
          icon: 'success',
          title: 'Rencana Berikutnya Berhasil Dibuat!',
          html: `Jadwal <b>Kunjungan Ke-${nextPlan.rencana_kunjungan_ke}</b> telah berhasil didaftarkan untuk pasien <b>${item.pasien_nama}</b> pada <b>${formatTanggalIndo(nextDate)}</b>.`,
          timer: 3000,
          showConfirmButton: false
        });

        loadData();
      } catch (err: any) {
        console.error('Error creating next plan:', err);
        Swal.fire('Gagal', err.response?.data?.message || err.message || 'Terjadi kesalahan saat menyimpan data.', 'error');
      }
    }
  };

  // Send Broadcast Notifications via WAHA WhatsApp Gateway
  const handleSendBroadcast = async () => {
    const list = stats.pendingList;
    if (list.length === 0) {
      Swal.fire('Informasi', 'Tidak ada rencana kunjungan yang perlu dikirimi notifikasi hari ini.', 'info');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Broadcast Notifikasi Massal?',
      html: `Kirim pesan WhatsApp pengingat otomatis ke <b>${list.length} pasien</b> yang dijadwalkan hari ini atau sudah overdue secara sekuensial?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Kirim Semua!',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#10b981'
    });

    if (confirm.isConfirmed) {
      Swal.fire({
        title: 'Memproses Broadcast...',
        html: `Memulai pengiriman sekuensial... <br/><span class="text-xs text-slate-500 font-bold block mt-2" id="broadcast-status">0/${list.length} terkirim</span>`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      let successCount = 0;
      let failCount = 0;

      try {
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const patient = pasienList.find(p => p.no_rm === item.pasien_no_rm);
          const noTelp = patient?.no_telp || '';

          if (!noTelp) {
            failCount++;
            continue;
          }

          // Update status in loading modal dynamically
          const statusEl = document.getElementById('broadcast-status');
          if (statusEl) {
            statusEl.innerHTML = `Mengirim ke ${item.pasien_nama} (${i + 1}/${list.length})...`;
          }

          const defaultMsg = `Halo Kak *${item.pasien_nama}*,\n\n` +
                             `Ini adalah pengingat otomatis dari *Puri Medika*.\n` +
                             `Jadwal kunjungan vaksinasi Kakak berikutnya adalah:\n\n` +
                             `📌 *Paket Vaksin*: ${item.paket_vaksin || '-'}\n` +
                             `📌 *Rencana Tindakan*: ${item.rencana_tindakan || item.diagnosa_keluhan || '-'}\n` +
                             `📅 *Hari/Tanggal*: ${formatTanggalIndo(item.tanggal_rencana)}\n` +
                             `🏥 *Unit Pelayanan*: ${item.unit_kunjungan || 'Poli Vaksinasi'}\n` +
                             `🔢 *Kunjungan Ke*: ${item.rencana_kunjungan_ke}\n\n` +
                             `Mohon konfirmasi kehadiran Kakak dengan membalas pesan ini. Terima kasih dan sehat selalu! ❤️`;

          try {
            await api.post('/followup-vaksin/send-whatsapp', {
              id: item.id,
              no_telp: noTelp,
              message: defaultMsg
            });
            successCount++;
          } catch (err: any) {
            console.error(`Gagal mengirim ke ${item.pasien_nama}:`, err);
            failCount++;
          }
        }

        Swal.fire('Broadcast Selesai', `Berhasil mengirimkan pengingat ke ${successCount} pasien vaksinasi secara aman via WhatsApp Gateway. (Gagal/tanpa no telp: ${failCount} pasien)`, 'success');
        loadData();
      } catch (err: any) {
        Swal.fire('Sebagian Gagal', 'Beberapa pengingat gagal dikirim: ' + err.message, 'error');
        loadData();
      }
    }
  };

  // Statistics computations based on statsFilteredData
  const chartData = useMemo(() => {
    // Filter data specifically for statistics
    const statsFilteredData = data.filter(item => {
      const matchesPaket = statsPaketVaksin === 'Semua' || item.paket_vaksin === statsPaketVaksin;
      
      let matchesDateRange = true;
      if (item.tanggal_rencana) {
        const itemDate = item.tanggal_rencana.includes('T') ? item.tanggal_rencana.split('T')[0] : item.tanggal_rencana;
        if (statsDateStart && itemDate < statsDateStart) matchesDateRange = false;
        if (statsDateEnd && itemDate > statsDateEnd) matchesDateRange = false;
      } else if (statsDateStart || statsDateEnd) {
        matchesDateRange = false;
      }
      
      return matchesPaket && matchesDateRange;
    });

    const patientMap: Record<string, number> = {};
    const packageMap: Record<string, number> = {};
    const rawDateMap: Record<string, number> = {};

    statsFilteredData.forEach(item => {
      const patientName = item.pasien_nama || 'Unknown';
      patientMap[patientName] = (patientMap[patientName] || 0) + 1;

      const pkg = item.paket_vaksin || 'Tanpa Paket';
      packageMap[pkg] = (packageMap[pkg] || 0) + 1;
      
      if (item.tanggal_rencana) {
        const rawDate = item.tanggal_rencana.includes('T') ? item.tanggal_rencana.split('T')[0] : item.tanggal_rencana;
        rawDateMap[rawDate] = (rawDateMap[rawDate] || 0) + 1;
      }
    });

    const visitsPerPatient = Object.entries(patientMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    const visitsPerDate = Object.entries(rawDateMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date: formatTanggalIndo(date), count }));
    const visitsPerPackage = Object.entries(packageMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    return { visitsPerPatient, visitsPerDate, visitsPerPackage, totalFiltered: statsFilteredData.length };
  }, [data, statsPaketVaksin, statsDateStart, statsDateEnd]);

  const COLORS = ['#0f766e', '#0369a1', '#b45309', '#be123c', '#4338ca', '#6d28d9', '#be185d', '#047857'];

  // List of unique patients based on data
  const patientsWithVisits = useMemo(() => {
    const map = new Map<string, { no_rm: string, nama: string, usia: number, total: number, lastVisit: string }>();
    data.forEach(item => {
      if (!item.pasien_no_rm) return;
      if (!map.has(item.pasien_no_rm)) {
        map.set(item.pasien_no_rm, {
          no_rm: item.pasien_no_rm,
          nama: item.pasien_nama || '-',
          usia: Number(item.usia) || 0,
          total: 0,
          lastVisit: item.kunjungan_terakhir || item.tanggal_rencana || ''
        });
      }
      const existing = map.get(item.pasien_no_rm)!;
      existing.total += 1;
      const compareDate = item.kunjungan_terakhir || item.tanggal_rencana || '';
      if (compareDate && compareDate > existing.lastVisit) {
        existing.lastVisit = compareDate;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
  }, [data]);

  // Selected patient history
  const historyData = useMemo(() => {
    if (!selectedPatientForHistory) return [];
    return data.filter(d => d.pasien_no_rm === selectedPatientForHistory).sort((a, b) => {
       const dateA = a.tanggal_rencana || '';
       const dateB = b.tanggal_rencana || '';
       return dateB.localeCompare(dateA);
    });
  }, [data, selectedPatientForHistory]);

  return (
    <div className="space-y-6" id="follow-up-vaksin-main-container">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-100/70 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Syringe className="h-5 w-5 text-teal-600" />
            <span>Follow Up Pasien Vaksinasi</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Manajemen penjadwalan, pemantauan berkala, dan sistem pengingat otomatis untuk pasien penerima vaksinasi.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {stats.pendingCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSendBroadcast}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-2xl shadow-sm transition-all text-xs relative cursor-pointer"
            >
              <BellRing className="h-4 w-4 animate-bounce" />
              <span>Broadcast Hari Ini ({stats.pendingCount})</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 active:scale-98 transition text-white font-medium py-2 px-4 text-xs rounded-2xl shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Rencana Follow Up</span>
          </motion.button>
        </div>
      </div>

      {/* Broadcast Alert Warning Banner */}
      {stats.pendingCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/70 backdrop-blur-md border border-amber-200/60 rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex gap-3">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-700 self-start md:self-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wide">Ada Jadwal Kunjungan Vaksin Saat Ini!</h4>
              <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                Terdapat <strong>{stats.pendingCount} rencana kunjungan</strong> yang memasuki masa pelaksanaan (hari ini atau telah lewat) dan belum dihubungi. Silakan klik tombol <strong>Broadcast Hari Ini</strong> di atas untuk mengirim notifikasi pengingat WhatsApp secara kolektif.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl p-5 rounded-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-4 relative overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01]">
          <div className="p-3 bg-white/20 text-white rounded-xl group-hover:scale-105 transition-transform">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-white/80 font-medium">Total Rencana</span>
            <h3 className="text-2xl font-bold text-white mt-0.5">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl p-5 rounded-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-4 relative overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01]">
          <div className="p-3 bg-white/20 text-white rounded-xl group-hover:scale-105 transition-transform">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-white/80 font-medium">Terjadwal (Scheduled)</span>
            <h3 className="text-2xl font-bold text-white mt-0.5">{stats.scheduled}</h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl p-5 rounded-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-4 relative overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01]">
          <div className="p-3 bg-white/20 text-white rounded-xl group-hover:scale-105 transition-transform">
            <Send className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-white/80 font-medium">Notifikasi Terkirim</span>
            <h3 className="text-2xl font-bold text-white mt-0.5">{stats.notified}</h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl p-5 rounded-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-4 relative overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01]">
          <div className="p-3 bg-white/20 text-white rounded-xl group-hover:scale-105 transition-transform">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-white/80 font-medium">Selesai (Completed)</span>
            <h3 className="text-2xl font-bold text-white mt-0.5">{stats.completed}</h3>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-1 bg-slate-100/80 p-1.5 rounded-xl w-full max-w-lg mb-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'list' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          Daftar Rencana Kunjungan
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'stats' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          Statistik
        </button>
        <button
          onClick={() => setActiveTab('patients')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'patients' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          Daftar Pasien
        </button>
      </div>

      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Stats Filter Area */}
          <div className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Mulai Tanggal</label>
                <input 
                  type="date" 
                  value={statsDateStart}
                  onChange={e => setStatsDateStart(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Sampai Tanggal</label>
                <input 
                  type="date" 
                  value={statsDateEnd}
                  onChange={e => setStatsDateEnd(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
            
            <div className="flex flex-col w-full md:w-64">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Filter Paket Vaksin</label>
              <SearchableSelect
                value={statsPaketVaksin}
                onChange={(e: any) => setStatsPaketVaksin(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none transition-all cursor-pointer font-medium"
              >
                <option value="Semua">Semua Paket Vaksin</option>
                {paketVaksinList.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </SearchableSelect>
            </div>
          </div>
          <div className="p-12 text-center text-slate-400 text-xs">Statistik ditampilkan di sini (Chart)</div>
        </div>
      )}

      {/* List Tab */}
      {activeTab === 'list' && (
        <div className="bg-white/70 backdrop-blur-md border border-slate-100/80 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100/80 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4">Tgl Rencana</th>
                    <th className="p-4">Pasien</th>
                    <th className="p-4">Paket Vaksin</th>
                    <th className="p-4">Kunj. Ke</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-700 divide-y divide-slate-50/50">
                  {data.filter(d => (statusFilter === 'Semua' || d.status_rencana === statusFilter) && (selectedPaket === 'Semua' || d.paket_vaksin === selectedPaket)).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4 font-medium">{formatTanggalIndo(item.tanggal_rencana)}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{item.pasien_nama}</div>
                        <div className="text-[10px] text-slate-500">{item.pasien_no_rm}</div>
                      </td>
                      <td className="p-4 text-slate-600">{item.paket_vaksin}</td>
                      <td className="p-4 font-medium">{item.rencana_kunjungan_ke}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getStatusBadgeStyle(item.status_rencana)}`}>
                          {item.status_rencana}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleEditClick(item)} className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg shadow-sm border border-slate-200 transition-all active:scale-95"><Edit3 className="w-3.5 h-3.5"/></button>
                          <button type="button" onClick={() => handleDelete(item.id!, item.pasien_nama!)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg shadow-sm border border-rose-100 transition-all active:scale-95"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">Belum ada data rencana follow up</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === 'patients' && (
        <div className="bg-white/70 backdrop-blur-md border border-slate-100/80 rounded-2xl shadow-sm p-8 text-center text-slate-500 text-xs">
          Modul Daftar Pasien (Tersedia di versi berikutnya)
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => setShowModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                    {isEditing ? <Edit3 className="w-5 h-5"/> : <CalendarPlus className="w-5 h-5"/>}
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                    {isEditing ? 'Edit Rencana Follow Up' : 'Tambah Rencana Follow Up'}
                  </h2>
                </div>
                <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5"/>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <form id="followup-form" onSubmit={handleSave} className="space-y-6">
                  
                  {/* SECTION A */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-semibold uppercase text-teal-600 tracking-wide">
                        I. Identitas & Info Order
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">No Order (Opsional)</label>
                      <input 
                        type="text" 
                        value={formData.no_order}
                        onChange={e => setFormData({...formData, no_order: e.target.value})}
                        className="block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all"
                        placeholder="Automatis jika kosong"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider mb-1.5">Unit Kunjungan</label>
                      <SearchableSelect 
                        value={formData.unit_kunjungan}
                        onChange={(e: any) => setFormData({...formData, unit_kunjungan: e.target.value})}
                        className="block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all cursor-pointer font-medium"
                      >
                        {UNIT_KUNJUNGAN_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                      </SearchableSelect>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Pilih Pasien Terdaftar
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCreatingPasien(true)}
                          className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" /> Tambah Pasien Baru
                        </button>
                      </div>
                      <AsyncPasienSelect
                        required={!isCreatingPasien}
                        value={selectedPasienOption}
                        onChange={(option: any) => {
                          setSelectedPasienOption(option);
                          if (option) {
                            if (option.__isNew__) {
                              // If they create new in dropdown
                              setFormData(prev => ({
                                ...prev,
                                pasien_no_rm: option.value,
                                pasien_nama: option.label,
                                usia: ''
                              }));
                            } else {
                              // Existing
                              setFormData(prev => ({
                                ...prev,
                                pasien_no_rm: option.value,
                                pasien_nama: option.pasien?.nama || '',
                                usia: calculateAge(option.pasien?.tanggal_lahir || '')
                              }));
                            }
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              pasien_no_rm: '',
                              pasien_nama: '',
                              usia: ''
                            }));
                          }
                        }}
                        className="block w-full text-xs"
                      />
                    </div>

                      {/* Selected Pasien Nama Indicator */}
                      {!isCreatingPasien && formData.pasien_no_rm && (
                        <div className="sm:col-span-2 bg-teal-50/30 border border-teal-100/50 rounded-2xl p-4 flex justify-between items-center text-xs shadow-xs">
                          <div>
                            <span className="font-bold text-teal-800 block uppercase tracking-wide text-[10px]">Identitas Terpilih:</span>
                            <span className="text-slate-800 font-bold block text-sm mt-1">{formData.pasien_nama}</span>
                            {pasienList.find(pt => pt.no_rm === formData.pasien_no_rm)?.no_telp && (
                              <span className="text-teal-700 block text-xs mt-1 font-semibold bg-teal-100/30 px-2.5 py-0.5 rounded-lg w-fit border border-teal-100/50">
                                No. Telp: {pasienList.find(pt => pt.no_rm === formData.pasien_no_rm)?.no_telp}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-teal-800 block uppercase tracking-wide text-[10px]">Estimasi Usia:</span>
                            <span className="text-slate-800 font-extrabold block text-sm mt-1">{formData.usia || '-'} Tahun</span>
                          </div>
                        </div>
                      )}

                      {/* Conditional Phone Number Input */}
                      {!isCreatingPasien && formData.pasien_no_rm && showPhoneInput && (
                        <div className="sm:col-span-2 bg-amber-50/30 border border-amber-200/60 rounded-2xl p-4 space-y-2 shadow-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                              No. Telepon Pasien Belum Terdaftar. Silakan Isi:
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Masukkan nomor telepon baru..."
                              value={inputPhoneVal}
                              onChange={(e) => setInputPhoneVal(e.target.value)}
                              className="mt-1.5 block w-full px-3 py-2 bg-white border border-amber-200 rounded-2xl text-xs placeholder-slate-400 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-400 focus:outline-none transition-all font-semibold font-mono"
                            />
                            <p className="text-[9px] text-amber-700 mt-1 font-medium leading-relaxed">
                              Nomor telepon ini akan disimpan langsung ke master rekam medis pasien saat rencana kunjungan disimpan.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION B: VACCINE PROGRAM & SCHEDULE */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-semibold uppercase text-teal-600 tracking-wide">
                        II. Program Vaksinasi & Penjadwalan
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Paket Vaksin */}
                      <div>
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                            Paket Vaksin / Imunisasi
                          </label>
                          <button
                            type="button"
                            onClick={handleAddNewPaket}
                            className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" /> Tambah Paket
                          </button>
                        </div>
                        <SearchableSelect
                          value={formData.paket_vaksin}
                          onChange={(e) => setFormData({ ...formData, paket_vaksin: e.target.value })}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all cursor-pointer font-medium"
                        >
                          {paketVaksinList.map((paket) => (
                            <option key={paket} value={paket}>{paket}</option>
                          ))}
                        </SearchableSelect>
                      </div>

                      {/* Rencana Kunjungan Ke */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Rencana Kunjungan Ke
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="10"
                          value={formData.rencana_kunjungan_ke}
                          onChange={(e) => setFormData({ ...formData, rencana_kunjungan_ke: e.target.value })}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all font-bold"
                        />
                      </div>
                      

                      {/* Rencana Jumlah Pemeriksaan */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Rencana Jml Pemeriksaan
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={formData.jumlah_pemeriksaan}
                          onChange={(e) => setFormData({ ...formData, jumlah_pemeriksaan: e.target.value })}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all font-bold"
                          placeholder="(opsional)"
                        />
                      </div>

                      {/* Kunjungan Terakhir */}
                      {Number(formData.rencana_kunjungan_ke) > 1 && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                            Tanggal Kunjungan Terakhir
                            <span className="ml-1 text-[9px] text-amber-700 font-bold bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 normal-case inline-flex items-center gap-0.5">
                              (Kunjungan ke-{Number(formData.rencana_kunjungan_ke) - 1})
                            </span>
                          </label>
                          <input
                            type="date"
                            value={formData.kunjungan_terakhir}
                            onChange={(e) => setFormData({ ...formData, kunjungan_terakhir: e.target.value })}
                            className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all font-bold"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                            {formatTanggalIndo(formData.kunjungan_terakhir)}
                          </span>
                        </div>
                      )}

                      {/* Tanggal Rencana (Target) */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Tanggal Rencana Kunjungan
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.tanggal_rencana}
                          onChange={(e) => setFormData({ ...formData, tanggal_rencana: e.target.value })}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all font-bold"
                        />
                        <span className="text-[10px] text-teal-600 font-semibold mt-1 block">
                          {formatTanggalIndo(formData.tanggal_rencana)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION C: CLINICAL & STATUS MONITORING */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-semibold uppercase text-teal-600 tracking-wide">
                        III. Diagnosa & Status Pemantauan
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Diagnosa / Keluhan */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Diagnosa / Keluhan
                        </label>
                        <textarea
                          placeholder="Masukkan deskripsi keluhan, indikasi vaksinasi, atau riwayat alergi jika ada..."
                          value={formData.diagnosa_keluhan}
                          onChange={(e) => setFormData({ ...formData, diagnosa_keluhan: e.target.value })}
                          rows={2}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs placeholder-slate-405 focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all"
                        />
                      </div>

                      {/* Status Rencana */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Status Rencana
                        </label>
                        <SearchableSelect
                          value={formData.status_rencana}
                          onChange={(e) => setFormData({ ...formData, status_rencana: e.target.value })}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all font-bold text-slate-750 cursor-pointer"
                        >
                          {INDONESIAN_STATUSES.map((st) => (
                            <option key={st.value} value={st.value}>{st.label}</option>
                          ))}
                        </SearchableSelect>
                      </div>

                      {/* Catatan / Hasil */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Catatan / Hasil Pemantauan
                        </label>
                        <textarea
                          placeholder="Catatan hasil skrining, kondisi pasien setelah vaksinasi, atau logs notifikasi WhatsApp..."
                          value={formData.catatan_hasil}
                          onChange={(e) => setFormData({ ...formData, catatan_hasil: e.target.value })}
                          rows={2}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs placeholder-slate-405 focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Buttons */}
                  <div className="flex items-center justify-end space-x-2.5 border-t border-slate-100 pt-5 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white rounded-2xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>{isEditing ? 'Simpan Koreksi' : 'Tambahkan Jadwal'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {showHistoryModal && typeof document !== 'undefined' && createPortal(
        <>
        <AnimatePresence>
          {showHistoryModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-900/40" onClick={() => setShowHistoryModal(false)} />
              <motion.div className="bg-white rounded-3xl p-6 relative z-10 w-full max-w-2xl">
                <h3>Riwayat</h3>
                <button onClick={() => setShowHistoryModal(false)}>Tutup</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}