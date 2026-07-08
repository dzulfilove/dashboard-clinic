import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  ClipboardList, 
  TrendingUp, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  X, 
  Syringe, 
  Send, 
  MessageSquare, 
  Bell, 
  BellRing,
  Check, 
  UserPlus, 
  Loader2,
  Filter,
  CalendarDays,
  CalendarPlus,
  Stethoscope
, Settings } from 'lucide-react';
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
        <div className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01] hover:shadow-md">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-105 transition-transform">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Rencana</span>
            <h3 className="text-2xl font-bold text-slate-850 mt-0.5">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01] hover:shadow-md">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl group-hover:scale-105 transition-transform">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Terjadwal (Scheduled)</span>
            <h3 className="text-2xl font-bold text-slate-850 mt-0.5">{stats.scheduled}</h3>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01] hover:shadow-md">
          <div className="p-3 bg-sky-50 text-sky-700 rounded-xl group-hover:scale-105 transition-transform">
            <Send className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Notifikasi Terkirim</span>
            <h3 className="text-2xl font-bold text-slate-850 mt-0.5">{stats.notified}</h3>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01] hover:shadow-md">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-105 transition-transform">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Selesai (Completed)</span>
            <h3 className="text-2xl font-bold text-slate-850 mt-0.5">{stats.completed}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
        <div className="relative w-full xl:w-72 shrink-0">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pasien, no RM, order..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200/80 rounded-2xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-400 transition-all font-medium"
          />
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 flex-1 justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100/70 rounded-2xl p-1 text-xs overflow-x-auto">
            <span className="text-slate-500 px-2 font-bold shrink-0 flex items-center gap-1">
              <Filter className="h-3 w-3 text-teal-600" /> Status:
            </span>
            {['Semua', 'Scheduled', 'Notified', 'Completed', 'Cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer text-[11px] tracking-wide ${
                  statusFilter === status
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {status === 'Semua' ? 'Semua' : 
                 status === 'Scheduled' ? 'Terjadwal' : 
                 status === 'Notified' ? 'Notifikasi' : 
                 status === 'Completed' ? 'Selesai' : 'Batal'}
              </button>
            ))}
          </div>

          {/* Vaccine Package Filter */}
          <select
            value={selectedPaket}
            onChange={(e) => setSelectedPaket(e.target.value)}
            className="border border-slate-200/85 rounded-2xl px-4 py-2.5 text-xs bg-slate-50/50 focus:outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-400 sm:w-56 font-medium cursor-pointer transition-all"
          >
            <option value="Semua">Semua Paket Vaksin</option>
            {paketVaksinList.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table / Grid View */}
      <div className="bg-white/70 backdrop-blur-md border border-slate-100/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-2" />
            <p className="text-xs font-mono">Memuat daftar rencana tindak lanjut...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <AlertCircle className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-800">Tidak ada data rencana kunjungan ditemukan</p>
            <p className="text-[11px] text-slate-400 mt-1">Coba ubah filter atau tambahkan rencana tindak lanjut baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100/70 text-[10.5px] text-slate-500 font-semibold tracking-wider uppercase">
                  <th className="px-6 py-4.5">No. Order / Unit</th>
                  <th className="px-6 py-4.5">Pasien</th>
                  <th className="px-6 py-4.5">Paket Vaksin</th>
                  <th className="px-6 py-4.5">Kunjungan Terakhir</th>
                  <th className="px-6 py-4.5">Tanggal Rencana</th>
                  <th className="px-6 py-4.5">Status</th>
                  <th className="px-6 py-4.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-all">
                    {/* No Order / Unit */}
                    <td className="px-6 py-4.5">
                      <div className="font-mono text-[11.5px] font-semibold text-slate-500">{item.no_order || '-'}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.unit_kunjungan}</div>
                    </td>

                    {/* Pasien */}
                    <td className="px-6 py-4.5">
                      <div className="font-semibold text-slate-800 uppercase tracking-wide">{item.pasien_nama}</div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-medium text-slate-600">RM: #{item.pasien_no_rm}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-500">{item.usia} Tahun</span>
                      </div>
                    </td>

                    {/* Paket Vaksin */}
                    <td className="px-6 py-4.5">
                      <div className="font-medium text-slate-700 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-100">
                          Vaksin
                        </span>
                        <span className="font-semibold">{item.paket_vaksin}</span>
                      </div>
                      <div className="text-[9.5px] mt-1 border px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-sky-50/50 border-sky-100 text-sky-800">
                        <Syringe className="h-2.5 w-2.5 text-sky-600" />
                        <span className="font-bold">Kunjungan Ke-{item.rencana_kunjungan_ke}</span>
                      </div>
                    </td>


                    {/* Kunjungan Terakhir */}
                    <td className="px-6 py-4.5 text-slate-500 font-medium">
                      <div className="text-[11px]">{formatTanggalIndo(item.kunjungan_terakhir)}</div>
                      {item.rencana_kunjungan_ke && Number(item.rencana_kunjungan_ke) > 1 && (
                        <div className="text-[9px] text-amber-700 font-black mt-1 bg-amber-50/50 border border-amber-200/60 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-amber-500"></span>
                          Kunjungan Rencana ke-{Number(item.rencana_kunjungan_ke) - 1}
                        </div>
                      )}
                    </td>

                    {/* Tanggal Rencana */}
                    <td className="px-6 py-4.5">
                      <div className="font-semibold text-slate-800 text-[11px]">
                        {formatTanggalIndo(item.tanggal_rencana)}
                      </div>
                      {item.diagnosa_keluhan && (
                        <div className="text-[10px] text-slate-400 mt-1 italic max-w-xs truncate" title={item.diagnosa_keluhan}>
                          "{item.diagnosa_keluhan}"
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadgeStyle(item.status_rencana)}`}>
                        {item.status_rencana === 'Scheduled' && 'Terjadwal'}
                        {item.status_rencana === 'Notified' && 'Notifikasi Terkirim'}
                        {item.status_rencana === 'Completed' && 'Selesai'}
                        {item.status_rencana === 'Cancelled' && 'Batal'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.status_rencana === 'Scheduled' && (
                          <button
                            onClick={() => handleSendNotification(item)}
                            title="Kirim Notifikasi Pengingat WA"
                            className="p-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-600 rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleCreateNextPlan(item)}
                          title="Buat Rencana Kunjungan Berikutnya (Instan)"
                          className="p-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-100 text-teal-600 rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={() => handleEditClick(item)}
                          title="Ubah Detail"
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(item.id!, item.pasien_nama!)}
                          title="Hapus Rencana"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Slideover / Popup Form */}
      {createPortal(
        <>
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-10 pb-10 px-4 z-[9999] overflow-y-auto">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-white border border-slate-100 shadow-xl w-full max-w-3xl overflow-hidden rounded-2xl flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-teal-400">
                      {isEditing ? 'Formulir Koreksi Rencana Follow Up' : 'Formulir Rencana Follow Up Baru'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {isEditing ? 'Ubah rincian jadwal pemantauan vaksinasi berkala pasien' : 'Input rencana pemantauan, jadwal, dan notifikasi pengingat vaksinasi'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body / Form */}
                <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-650">
                  
                  {/* SECTION A: DEMOGRAPHY */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-semibold uppercase text-teal-600 tracking-wide">
                        I. Identitas Pasien & Asal Pelayanan
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Order Number */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                          No. Order / Transaksi
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.no_order}
                          onChange={(e) => setFormData({ ...formData, no_order: e.target.value })}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs placeholder-slate-405 focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white font-mono transition-all"
                        />
                      </div>

                      {/* Unit Kunjungan (Poli Asal) */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                          Poli / Unit Asal Pasien
                        </label>
                        <select
                          value={formData.unit_kunjungan}
                          onChange={(e) => setFormData({ ...formData, unit_kunjungan: e.target.value })}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:border-teal-400 focus:bg-white focus:outline-none transition-all cursor-pointer"
                        >
                          {UNIT_KUNJUNGAN_LIST.map((unit) => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>

                      {/* Pasien Selector */}
                      {isCreatingPasien ? (
                        <div className="sm:col-span-2 bg-teal-50/30 border border-teal-100/65 rounded-2xl p-5 space-y-4">
                          <div className="flex justify-between items-center border-b border-teal-100/50 pb-2">
                            <h5 className="text-xs font-bold text-teal-850 uppercase tracking-wide flex items-center gap-1.5">
                              <UserPlus className="h-4 w-4 text-teal-600" />
                              Pendaftaran Pasien Baru Instan
                            </h5>
                            <button
                              type="button"
                              onClick={() => setIsCreatingPasien(false)}
                              className="text-xs text-slate-500 hover:text-slate-700 font-bold transition-all cursor-pointer"
                            >
                              Batal & Pilih Dropdown
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* No RM */}
                            <div>
                              <div className="flex justify-between items-center">
                                <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider flex items-center gap-1">
                                  No. Rekam Medis (No RM) <span className="text-rose-500 font-extrabold">*</span>
                                </label>
                                <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5 tracking-wider">
                                  Wajib Sistem Trustmedis
                                </span>
                              </div>
                              <input
                                type="text"
                                required
                                placeholder="Masukkan No RM dari Trustmedis..."
                                value={newPasienData.no_rm}
                                onChange={(e) => setNewPasienData({ ...newPasienData, no_rm: e.target.value })}
                                className="mt-1.5 block w-full px-3 py-2 bg-amber-50/25 border border-amber-200 rounded-2xl text-xs placeholder-slate-400 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-400 focus:outline-none transition-all font-mono font-bold text-slate-800"
                              />
                              <p className="text-[9px] text-amber-700 mt-1 font-medium leading-relaxed">
                                Pastikan No. RM persis dengan yang terdaftar di aplikasi <strong>Trustmedis</strong> untuk sinkronisasi data rekam medis.
                              </p>
                            </div>

                            {/* Nama Lengkap */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider">
                                Nama Lengkap Pasien
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Contoh: Ny. Della Trisyanasari"
                                value={newPasienData.nama}
                                onChange={(e) => setNewPasienData({ ...newPasienData, nama: e.target.value })}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-teal-200 rounded-2xl text-xs placeholder-slate-400 focus:ring-4 focus:ring-teal-500/5 focus:border-teal-450 focus:outline-none transition-all"
                              />
                            </div>

                            {/* Tanggal Lahir */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider">
                                Tanggal Lahir
                              </label>
                              <input
                                type="date"
                                required
                                value={newPasienData.tanggal_lahir}
                                onChange={(e) => setNewPasienData({ ...newPasienData, tanggal_lahir: e.target.value })}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-teal-200 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:border-teal-450 focus:outline-none transition-all"
                              />
                            </div>

                            {/* Jenis Kelamin */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider">
                                Jenis Kelamin
                              </label>
                              <select
                                value={newPasienData.jenis_kelamin}
                                onChange={(e) => setNewPasienData({ ...newPasienData, jenis_kelamin: e.target.value as 'L' | 'P' })}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-teal-200 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:border-teal-450 focus:outline-none transition-all cursor-pointer"
                              >
                                <option value="L">Laki-laki</option>
                                <option value="P">Perempuan</option>
                              </select>
                            </div>

                            {/* Alamat */}
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider">
                                Alamat Tinggal Pasien (Opsional)
                              </label>
                              <textarea
                                placeholder="Alamat lengkap pasien..."
                                rows={2}
                                value={newPasienData.alamat}
                                onChange={(e) => setNewPasienData({ ...newPasienData, alamat: e.target.value })}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-teal-200 rounded-2xl text-xs placeholder-slate-400 focus:ring-4 focus:ring-teal-500/5 focus:border-teal-450 focus:outline-none transition-all"
                              />
                            </div>

                            {/* No. Telepon */}
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider">
                                No. Telepon (Opsional)
                              </label>
                              <input
                                type="text"
                                placeholder="Contoh: 08123456789"
                                value={newPasienData.no_telp}
                                onChange={(e) => setNewPasienData({ ...newPasienData, no_telp: e.target.value })}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-teal-200 rounded-2xl text-xs placeholder-slate-400 focus:ring-4 focus:ring-teal-500/5 focus:border-teal-450 focus:outline-none transition-all"
                              />
                            </div>
                          </div>

                          {/* Register Inline Action */}
                          <div className="flex justify-end gap-2 pt-2 border-t border-teal-100/35">
                            <button
                              type="button"
                              onClick={handleSaveNewPasien}
                              disabled={pasienSubmitting}
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold rounded-2xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              {pasienSubmitting ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Mendaftarkan...
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  Daftarkan & Pilih Pasien
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="sm:col-span-2">
                          <div className="flex justify-between items-center">
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
                          <select
                            required={!isCreatingPasien}
                            value={formData.pasien_no_rm}
                            onChange={(e) => handlePasienChange(e.target.value)}
                            className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all cursor-pointer font-medium"
                          >
                            <option value="">-- Cari / Pilih Pasien dari Master Rekam Medis --</option>
                            {pasienList.map((p) => (
                              <option key={p.no_rm} value={p.no_rm}>
                                [{p.no_rm}] {p.nama}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

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
                        <select
                          value={formData.paket_vaksin}
                          onChange={(e) => setFormData({ ...formData, paket_vaksin: e.target.value })}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all cursor-pointer font-medium"
                        >
                          {paketVaksinList.map((paket) => (
                            <option key={paket} value={paket}>{paket}</option>
                          ))}
                        </select>
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
                        <select
                          value={formData.status_rencana}
                          onChange={(e) => setFormData({ ...formData, status_rencana: e.target.value })}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all font-bold text-slate-750 cursor-pointer"
                        >
                          {INDONESIAN_STATUSES.map((st) => (
                            <option key={st.value} value={st.value}>{st.label}</option>
                          ))}
                        </select>
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
