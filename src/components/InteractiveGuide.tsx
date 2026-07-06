import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { 
  HelpCircle, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  Compass, 
  Play, 
  BookOpen, 
  Activity, 
  ArrowRight, 
  Sparkles, 
  Users, 
  Database, 
  HeartPulse, 
  ClipboardList, 
  TrendingUp, 
  AlertCircle,
  FileText,
  Lightbulb
} from 'lucide-react';

interface TourStep {
  title: string;
  desc: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface WorkflowNode {
  id: string;
  label: string;
  desc: string;
  path: string;
  actionLabel: string;
}

interface GuidedTask {
  id: string;
  title: string;
  desc: string;
  path: string;
}

interface FAQItem {
  q: string;
  a: string;
}

interface RoleMetadata {
  roleName: string;
  badgeColor: string;
  textColor: string;
  intro: string;
  workflow: WorkflowNode[];
  tasks: GuidedTask[];
  faqs: FAQItem[];
}

export default function InteractiveGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tour' | 'workflow' | 'tasks' | 'faq'>('tour');
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  
  // Interactive Onboarding Tour Overlay State
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Local storage state for tracking completed user guided tasks
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  // Show dynamic notification indicator if never opened before
  const [hasUnreadGuide, setHasUnreadGuide] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem('clinic_guide_dismissed');
    if (isDismissed) {
      setHasUnreadGuide(false);
    }
    
    // Load completed tasks
    if (user) {
      const stored = localStorage.getItem(`completed_tasks_${user.role}`);
      if (stored) {
        try {
          setCompletedTasks(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [user]);

  if (!user) return null;

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnreadGuide(false);
    localStorage.setItem('clinic_guide_dismissed', 'true');
  };

  const toggleTask = (taskId: string) => {
    const updated = { ...completedTasks, [taskId]: !completedTasks[taskId] };
    setCompletedTasks(updated);
    localStorage.setItem(`completed_tasks_${user.role}`, JSON.stringify(updated));
  };

  // Define role metadata for Perawat, Farmasi, Analis, and Admin
  const roleData: Record<string, RoleMetadata> = {
    perawat: {
      roleName: 'Perawat / Pelayanan Medis',
      badgeColor: 'bg-teal-50 text-teal-700',
      textColor: 'text-teal-700',
      intro: 'Tugas utama Anda meliputi pendaftaran pasien, pengelolaan triase IGD, mutasi rawat inap, serta penginputan master rekam medis pendukung.',
      workflow: [
        {
          id: 'pasien',
          label: 'Master Pasien',
          desc: 'Daftarkan data diri pasien secara lengkap (Nama, NIK, Tgl Lahir, Alamat) di database sebelum melakukan pendaftaran pelayanan.',
          path: '/pelayanan/master-pasien',
          actionLabel: 'Kelola Pasien'
        },
        {
          id: 'ralan',
          label: 'Rawat Jalan',
          desc: 'Daftarkan pasien ke poli tujuan, tentukan dokter DPJP pelaksana, dan input diagnosa ICD-10 setelah pemeriksaan selesai.',
          path: '/pelayanan/rawat-jalan',
          actionLabel: 'Buka Rawat Jalan'
        },
        {
          id: 'igd',
          label: 'Layanan IGD',
          desc: 'Lakukan pemeriksaan pasien darurat, tentukan kode warna triase (Merah, Kuning, Hijau, Hitam), dan input diagnosa cepat.',
          path: '/pelayanan/igd',
          actionLabel: 'Buka IGD'
        },
        {
          id: 'ranap',
          label: 'Rawat Inap',
          desc: 'Mutasi pasien yang membutuhkan perawatan berkelanjutan ke bangsal rawat inap dan kelola kamar/ketersediaan ranap.',
          path: '/pelayanan/rawat-inap',
          actionLabel: 'Buka Rawat Inap'
        }
      ],
      tasks: [
        {
          id: 'task_pasien_new',
          title: 'Registrasi Pasien Baru',
          desc: 'Buka menu "Master Pasien" dan daftarkan minimal 1 pasien baru dengan data alamat lengkap.',
          path: '/pelayanan/master-pasien'
        },
        {
          id: 'task_pendaftaran_ralan',
          title: 'Daftarkan Poli Rawat Jalan',
          desc: 'Input satu baris pendaftaran rawat jalan pada menu "Rawat Jalan", pilih poli & dokter spesialis.',
          path: '/pelayanan/rawat-jalan'
        },
        {
          id: 'task_triage_igd',
          title: 'Input Pemeriksaan Triase IGD',
          desc: 'Lakukan input triase darurat di menu IGD. Pilih pasien, lalu tandai warna triase sesuai keparahan.',
          path: '/pelayanan/igd'
        },
        {
          id: 'task_alokasi_ranap',
          title: 'Alokasi Bangsal Rawat Inap',
          desc: 'Mutasi pasien masuk rawat inap dan pilih kamar perawatan yang masih kosong.',
          path: '/pelayanan/rawat-inap'
        }
      ],
      faqs: [
        {
          q: 'Bagaimana cara menambahkan kode diagnosa penyakit ICD-10?',
          a: 'Anda bisa mencarinya langsung saat mendaftarkan pasien pelayanan atau menambahkannya secara permanen melalui menu "Master ICD-10" agar terdaftar di sistem.'
        },
        {
          q: 'Apa arti warna Triase di modul IGD?',
          a: 'Merah (gawat darurat mengancam nyawa), Kuning (gawat tidak darurat), Hijau (darurat tidak gawat/ringan), dan Hitam (meninggal sebelum tiba).'
        },
        {
          q: 'Bagaimana cara memulangkan pasien Rawat Inap?',
          a: 'Buka modul "Rawat Inap", pilih pasien yang bersangkutan, klik ikon koreksi/edit, lalu ganti status pemulangan serta isi tanggal keluar dan diagnosa akhir.'
        }
      ]
    },
    farmasi: {
      roleName: 'Apoteker / Farmasis',
      badgeColor: 'bg-emerald-50 text-emerald-700',
      textColor: 'text-emerald-700',
      intro: 'Tugas utama Anda berfokus pada manajemen persediaan obat, pencatatan pengeluaran resep, analisis efisiensi investasi (ABC), dan prediksi peramalan stok.',
      workflow: [
        {
          id: 'master_obat',
          label: 'Master Obat',
          desc: 'Daftarkan nama obat, harga beli/jual, kategori, tanggal kedaluwarsa, serta batas stok aman (safety stock) untuk pencegahan kelangkaan.',
          path: '/farmasi/master-obat',
          actionLabel: 'Master Obat & Alkes'
        },
        {
          id: 'input_konsumsi',
          label: 'Catat Konsumsi',
          desc: 'Input konsumsi harian obat yang diserahkan ke pasien rawat jalan, IGD, maupun rawat inap berdasarkan resep.',
          path: '/farmasi/input-konsumsi',
          actionLabel: 'Input Konsumsi'
        },
        {
          id: 'abc_analysis',
          label: 'Analisis ABC',
          desc: 'Kelompokkan obat berdasarkan nilai investasi kumulatif. Kelas A (prioritas tinggi), Kelas B (sedang), dan Kelas C (ekonomis).',
          path: '/farmasi/abc-analysis',
          actionLabel: 'Lihat Analisis ABC'
        },
        {
          id: 'forecasting',
          label: 'Prediksi Stok',
          desc: 'Gunakan kalkulator Moving Average untuk meramal volume konsumsi obat di masa depan guna pemesanan yang efisien.',
          path: '/farmasi/forecasting',
          actionLabel: 'Mulai Forecasting'
        }
      ],
      tasks: [
        {
          id: 'task_tambah_obat',
          title: 'Input Persediaan Obat Baru',
          desc: 'Tambahkan 1 item obat baru di "Master Obat" lengkap dengan tanggal kadaluwarsa & harga beli.',
          path: '/farmasi/master-obat'
        },
        {
          id: 'task_catat_resep',
          title: 'Catat Pengeluaran Resep',
          desc: 'Gunakan menu "Catat Pengeluaran" untuk menginput resep konsumsi yang diserahkan ke pasien.',
          path: '/farmasi/input-konsumsi'
        },
        {
          id: 'task_abc_run',
          title: 'Jalankan Klasifikasi ABC',
          desc: 'Buka tab "Analisis ABC" untuk melihat sebaran pareto anggaran obat Anda.',
          path: '/farmasi/abc-analysis'
        },
        {
          id: 'task_forecast_run',
          title: 'Lakukan Peramalan Moving Average',
          desc: 'Simulasikan ramalan stok obat di masa mendatang menggunakan menu "Prediksi Stok".',
          path: '/farmasi/forecasting'
        }
      ],
      faqs: [
        {
          q: 'Mengapa grafik Analisis ABC saya kosong?',
          a: 'Analisis ABC didasarkan pada perkalian harga beli obat dengan jumlah pemakaian yang dicatat di "Catat Pengeluaran Obat". Pastikan data konsumsi obat sudah terisi.'
        },
        {
          q: 'Bagaimana cara menentukan safety stock di sistem?',
          a: 'Anda bisa mengisinya pada isian "Stok Minimal" di menu Master Obat. Sistem akan otomatis memberikan alarm merah jika stok nyata berada di bawah angka tersebut.'
        }
      ]
    },
    analis: {
      roleName: 'Analis Laboratorium',
      badgeColor: 'bg-indigo-50 text-indigo-700',
      textColor: 'text-indigo-700',
      intro: 'Tugas utama Anda meliputi pengaturan jenis tes lab beserta rentang rujukan normalnya, memantau antrean permintaan tes dari poli, dan menginput hasil lab pasien.',
      workflow: [
        {
          id: 'master_pemeriksaan',
          label: 'Master Tes',
          desc: 'Tentukan katalog pemeriksaan lab yang tersedia di klinik beserta harga satuan dan batasan rentang nilai rujukan normal.',
          path: '/lab/master-pemeriksaan',
          actionLabel: 'Master Pemeriksaan'
        },
        {
          id: 'dashboard_lab',
          label: 'Antrean Lab',
          desc: 'Pantau secara real-time permintaan penunjang laboratorium medis dari unit dokter atau perawat klinis.',
          path: '/lab/dashboard',
          actionLabel: 'Dashboard Lab'
        },
        {
          id: 'input_lab',
          label: 'Input Hasil',
          desc: 'Masukkan data hasil uji spesimen pasien, sistem akan otomatis membandingkannya dengan nilai normal.',
          path: '/lab/input-pemeriksaan',
          actionLabel: 'Input Pemeriksaan'
        }
      ],
      tasks: [
        {
          id: 'task_buat_tes',
          title: 'Buat Item Tes Lab Baru',
          desc: 'Buka "Master Pemeriksaan Lab" dan tambahkan item tes baru beserta satuannya (misal: g/dL).',
          path: '/lab/master-pemeriksaan'
        },
        {
          id: 'task_pantau_antrean',
          title: 'Periksa Antrean Lab Masuk',
          desc: 'Buka halaman Dashboard Lab untuk memonitor pesanan tes dari pelayanan klinis.',
          path: '/lab/dashboard'
        },
        {
          id: 'task_input_hasil',
          title: 'Catat Hasil Lab Pasien',
          desc: 'Pilih salah satu nomor rekam lab di menu "Input Hasil Lab", masukkan angkanya, lalu simpan.',
          path: '/lab/input-pemeriksaan'
        }
      ],
      faqs: [
        {
          q: 'Bagaimana sistem menandai hasil lab yang abnormal?',
          a: 'Sistem membandingkan hasil input kuantitatif Anda dengan kolom "Nilai Rujukan" pada Master Pemeriksaan. Jika berada di luar batas, baris hasil akan ditandai dengan label perhatian khusus.'
        },
        {
          q: 'Apakah hasil pemeriksaan lab bisa dicetak langsung?',
          a: 'Ya, pada Dashboard Lab atau rekap hasil lab, Anda akan menemukan tombol "Cetak Hasil" yang menghasilkan format dokumen cetak resmi hasil laboratorium klinik.'
        }
      ]
    },
    admin: {
      roleName: 'System Administrator',
      badgeColor: 'bg-slate-100 text-slate-800',
      textColor: 'text-slate-800',
      intro: 'Anda memegang kendali penuh atas arsitektur sistem. Tanggung jawab Anda meliputi pengelolaan hak akses pengguna, pemeliharaan database, serta monitoring performa & statistik demografi.',
      workflow: [
        {
          id: 'users',
          label: 'Kelola Pengguna',
          desc: 'Tambahkan, sunting, atau nonaktifkan akun staf klinik. Atur peran (admin, perawat, analis, farmasi) sesuai tanggung jawab masing-masing.',
          path: '/admin/users',
          actionLabel: 'Kelola Pengguna'
        },
        {
          id: 'db',
          label: 'Database Core',
          desc: 'Pantau status server database riil, lakukan seeder data simulasi, atau bersihkan riwayat sandbox virtual.',
          path: '/admin/db-settings',
          actionLabel: 'Pengaturan Database'
        },
        {
          id: 'demografi_pasien',
          label: 'Demografi Pasien',
          desc: 'Pantau statistik sebaran profil pasien terdaftar berdasarkan jenis kelamin, kelompok usia, dan persebaran tempat tinggal wilayah.',
          path: '/demografi/pasien',
          actionLabel: 'Demografi Pasien'
        },
        {
          id: 'demografi_diagnosa',
          label: 'Analisis Penyakit',
          desc: 'Pantau statistik sebaran jenis penyakit terbanyak (ICD-10) di klinik guna kebutuhan laporan epidemiologi.',
          path: '/demografi/diagnosa',
          actionLabel: 'Demografi Diagnosa'
        }
      ],
      tasks: [
        {
          id: 'task_buat_staf',
          title: 'Buat Akun Staf Baru',
          desc: 'Buka menu "Kelola Pengguna", tambahkan minimal 1 pengguna baru dengan peran "perawat" atau "farmasi".',
          path: '/admin/users'
        },
        {
          id: 'task_db_check',
          title: 'Uji Konektivitas Database',
          desc: 'Masuk ke menu "Pengaturan Database", periksa status koneksi, dan coba lakukan reset/seed dummy data.',
          path: '/admin/db-settings'
        },
        {
          id: 'task_monitor_pasien',
          title: 'Analisis Demografi Pasien',
          desc: 'Buka modul "Demografi Pasien" dan amati kelompok usia dengan populasi tertinggi.',
          path: '/demografi/pasien'
        },
        {
          id: 'task_monitor_diagnosa',
          title: 'Analisis Demografi Penyakit',
          desc: 'Buka modul "Demografi Diagnosa" dan pilih diagnosa teratas untuk mengamati karakteristik gender penderitanya.',
          path: '/demografi/diagnosa'
        }
      ],
      faqs: [
        {
          q: 'Bagaimana cara kerja mode database Virtual (Sandboxed)?',
          a: 'Mode Virtual digunakan saat database MySQL eksternal tidak aktif atau belum dikonfigurasi. Sistem akan menyimpan data di Memory Browser yang aman. Anda bisa melakukan pembersihan di menu Pengaturan Database.'
        },
        {
          q: 'Bagaimana cara mengganti peran staf?',
          a: 'Anda cukup menuju ke menu "Kelola Pengguna", klik tombol sunting/edit pada nama staf terkait, ubah pilihan peran/role di dropdown, lalu klik Simpan.'
        }
      ]
    }
  };

  const currentMeta = roleData[user.role] || roleData.admin;

  // Tour steps definition
  const tourSteps: TourStep[] = [
    {
      title: `Selamat Datang, ${user.nama || 'Pengguna'}!`,
      desc: `Ini adalah Sistem Manajemen Klinik Puri Medika. Peran Anda saat ini adalah: ${currentMeta.roleName}. Mari kita ikuti tur singkat untuk memahami letak fitur-fitur utama.`,
      targetSelector: undefined
    },
    {
      title: 'Menu Navigasi Sidebar',
      desc: 'Di sisi kiri layar (atau tombol menu di ponsel), Anda dapat menemukan seluruh modul yang diizinkan sesuai dengan peran klinis Anda. Klik kategori menu untuk membuka sub-fitur di dalamnya.',
      targetSelector: 'nav'
    },
    {
      title: 'Pusat Demografi Kunjungan',
      desc: 'Pada menu "Demografi Kunjungan", kami telah menyediakan visualisasi sebaran pasien ("Demografi Pasien") dan analisis tren jenis penyakit terbanyak ("Demografi Diagnosa") secara komprehensif.',
      targetSelector: 'nav'
    },
    {
      title: 'Status Sinkronisasi Database',
      desc: 'Di sudut kiri bawah layar (di dalam sidebar), terdapat indikator status database. Hijau menandakan koneksi MySQL aktif, sedangkan Kuning menunjukkan Virtual Sandboxed Mode.',
      targetSelector: 'footer'
    },
    {
      title: 'Pusat Bantuan & Panduan Interaktif',
      desc: 'Kapan saja Anda merasa bingung, klik tombol tanda tanya (?) ini untuk membuka kembali peta alur kerja, checklist misi pengenalan, serta tanya jawab spesifik untuk peran Anda.',
      targetSelector: '#guide-floating-btn'
    }
  ];

  const handleStartTour = () => {
    setIsOpen(false);
    setIsTourActive(true);
    setTourStep(0);
  };

  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  // Update highlight saat step berubah
  useEffect(() => {
    if (!isTourActive) {
      setHighlightRect(null);
      return;
    }
    const step = tourSteps[tourStep];
    if (!step?.targetSelector) {
      setHighlightRect(null);
      return;
    }

    const el = document.querySelector(step.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const updateRect = () => {
      const targetEl = document.querySelector(step.targetSelector!);
      if (targetEl) {
        setHighlightRect(targetEl.getBoundingClientRect());
      } else {
        setHighlightRect(null);
      }
    };

    updateRect();
    const timeoutId = setTimeout(updateRect, 300);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { capture: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, { capture: true });
    };
  }, [isTourActive, tourStep]);

  const handleNextTour = () => {
    if (tourStep < tourSteps.length - 1) {
      setTourStep(tourStep + 1);
    } else {
      setIsTourActive(false);
    }
  };

  const handlePrevTour = () => {
    if (tourStep > 0) {
      setTourStep(tourStep - 1);
    }
  };

  const PADDING = 8;

  const SpotlightOverlay = () => {
    if (!isTourActive) return null;

    const step = tourSteps[tourStep];

    // Hitung posisi aman agar tooltip tidak terpotong/tenggelam di bawah viewport
    const tooltipHeight = 240; // perkiraan tinggi tooltip
    let topStyle: any;
    let leftStyle: any;
    let transformStyle: string | undefined;

    if (highlightRect) {
      const spaceBelow = window.innerHeight - highlightRect.bottom;
      const spaceAbove = highlightRect.top;

      if (spaceBelow >= tooltipHeight + PADDING + 12) {
        // Cukup ruang di bawah
        topStyle = highlightRect.bottom + PADDING + 12;
      } else if (spaceAbove >= tooltipHeight + PADDING + 12) {
        // Cukup ruang di atas
        topStyle = highlightRect.top - tooltipHeight - PADDING - 12;
      } else {
        // Ruang atas & bawah sempit, pasang di tempat yang paling optimal
        topStyle = Math.max(16, window.innerHeight - tooltipHeight - 16);
      }

      // Pengaman tambahan agar tidak melebihi batas viewport
      topStyle = Math.max(16, Math.min(topStyle, window.innerHeight - tooltipHeight - 16));

      leftStyle = Math.max(16, Math.min(
        highlightRect.left,
        window.innerWidth - 320
      ));
    } else {
      topStyle = '50%';
      leftStyle = '50%';
      transformStyle = 'translate(-50%, -50%)';
    }

    return createPortal(
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {highlightRect ? (
          // SVG overlay dengan lubang transparan di posisi elemen
          <svg
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={{ cursor: 'default' }}
            onClick={() => {}} // tangkap click di luar
          >
            <defs>
              <mask id="spotlight-mask">
                {/* Area putih = terlihat (gelap) */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Area hitam = transparan (lubang/spotlight) */}
                <rect
                  x={highlightRect.left - PADDING}
                  y={highlightRect.top - PADDING}
                  width={highlightRect.width + PADDING * 2}
                  height={highlightRect.height + PADDING * 2}
                  rx="12"
                  fill="black"
                />
              </mask>
            </defs>
            {/* Overlay gelap dengan lubang */}
            <rect
              x="0" y="0"
              width="100%" height="100%"
              fill="rgba(0,0,0,0.65)"
              mask="url(#spotlight-mask)"
            />
            {/* Border highlight di sekitar elemen */}
            <rect
              x={highlightRect.left - PADDING}
              y={highlightRect.top - PADDING}
              width={highlightRect.width + PADDING * 2}
              height={highlightRect.height + PADDING * 2}
              rx="12"
              fill="none"
              stroke="#0d9488"
              strokeWidth="2"
              strokeDasharray="6 3"
            />
          </svg>
        ) : (
          // Fallback: overlay gelap biasa tanpa lubang
          <div className="absolute inset-0 bg-black/60 pointer-events-auto" />
        )}

        {/* Tooltip */}
        <div
          className="absolute z-[9999] pointer-events-auto transition-all duration-200"
          style={{
            top: topStyle,
            left: leftStyle,
            transform: transformStyle,
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 w-[300px]">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
              Langkah {tourStep + 1} dari {tourSteps.length}
            </p>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              {step.title}
            </h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              {step.desc}
            </p>

            {/* Progress bar */}
            <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${((tourStep + 1) / tourSteps.length) * 100}%` }}
              />
            </div>

            {/* Navigasi */}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setTourStep(s => Math.max(0, s - 1))}
                disabled={tourStep === 0}
                className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30 font-medium"
              >
                ← Kembali
              </button>
              <button
                onClick={() => {
                  if (tourStep < tourSteps.length - 1) {
                    setTourStep(s => s + 1);
                  } else {
                    setIsTourActive(false);
                    setTourStep(0);
                  }
                }}
                className="bg-teal-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-teal-700 transition-colors"
              >
                {tourStep < tourSteps.length - 1 ? 'Lanjut →' : 'Selesai ✓'}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      {/* FLOATING ACTION FLOATER BUTTON */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-2">
        {/* Unread interactive hint bubble */}
        {hasUnreadGuide && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ willChange: 'transform, opacity' }}
            className="bg-teal-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-2xl shadow-md flex items-center space-x-1 max-w-[190px] mr-1"
          >
            <Lightbulb className="h-3.5 w-3.5 flex-shrink-0 animate-bounce" />
            <span>Butuh Panduan Peran? Klik di sini!</span>
          </motion.div>
        )}

        <button
          id="guide-floating-btn"
          onClick={handleOpen}
          className="relative h-12 w-12 rounded-full bg-slate-900 text-teal-400 hover:text-white flex items-center justify-center shadow-xl border border-slate-800 cursor-pointer hover:bg-slate-855 hover:scale-105 active:scale-95 transition-all group"
          title="Panduan Interaktif Peran"
          style={{ minHeight: '48px', minWidth: '48px' }}
        >
          <HelpCircle className="h-6 w-6 animate-pulse group-hover:rotate-12 transition-transform" />
          {hasUnreadGuide && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
            </span>
          )}
        </button>
      </div>

      <SpotlightOverlay />

      {/* DETAILED INTERACTIVE GUIDE DRAWER PANEL */}
      {createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ willChange: 'opacity' }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] pointer-events-auto"
            />

            {/* Slide-in Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ willChange: 'transform' }}
              className="fixed right-0 top-0 bottom-0 w-full md:max-w-md bg-white text-slate-800 shadow-2xl z-[10000] border-l border-slate-100/50 flex flex-col pointer-events-auto"
            >
              {/* Drawer Header with Role Information */}
              <div className="p-6 border-b border-slate-100/60 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Compass className="h-5 w-5 text-teal-600" />
                    <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Pusat Panduan</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                    style={{ minHeight: '36px', minWidth: '36px' }}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-medium uppercase border ${currentMeta.badgeColor}`}>
                      Role: {currentMeta.roleName}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                    Panduan Interaktif Staf
                  </h2>
                  <p className="text-xxs text-slate-500 leading-relaxed">
                    {currentMeta.intro}
                  </p>
                </div>

                {/* Sub Tab Buttons Selector */}
                <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-200/30 gap-1">
                  <button
                    onClick={() => setActiveTab('tour')}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'tour' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Mulai Tur
                  </button>
                  <button
                    onClick={() => setActiveTab('workflow')}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'workflow' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Peta Alur
                  </button>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'tasks' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Checklist
                  </button>
                  <button
                    onClick={() => setActiveTab('faq')}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'faq' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    FAQ
                  </button>
                </div>
              </div>

              {/* Drawer Body Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                <AnimatePresence mode="wait">
                  
                  {/* TAB 1: Start Tour & Onboarding */}
                  {activeTab === 'tour' && (
                    <motion.div
                      key="tab-tour"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      style={{ willChange: 'transform, opacity' }}
                      className="space-y-5 text-center py-4"
                    >
                      <div className="h-16 w-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto border border-teal-150">
                        <Compass className="h-8 w-8 text-teal-600 animate-spin-slow" />
                      </div>
                      
                      <div className="space-y-1.5 max-w-sm mx-auto">
                        <h3 className="text-sm font-bold text-slate-900">Mulai Tur Sistem Interaktif</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Sistem akan memandu Anda secara visual untuk menunjukkan letak modul pendaftaran, rekam medis, status sinkronisasi, dan pusat informasi demografi di layar.
                        </p>
                      </div>

                      <button
                        onClick={handleStartTour}
                        className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
                      >
                        <Play className="h-4.5 w-4.5 fill-current" />
                        <span>Mulai Tur Panduan Sekarang</span>
                      </button>

                      <div className="pt-4 border-t border-slate-100 flex items-start gap-2.5 text-left text-xxs leading-relaxed text-slate-500">
                        <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>
                          Tips: Setiap kali klinik menambahkan menu atau modul baru, kami menyarankan Anda mengikuti kembali tur interaktif ini untuk memastikan kelancaran operasional.
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: Workflows Interactive Node Diagram */}
                  {activeTab === 'workflow' && (
                    <motion.div
                      key="tab-workflow"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      style={{ willChange: 'transform, opacity' }}
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-teal-600" />
                          Alur Kerja Operasional Anda
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Klik pada setiap simpul (node) di bawah untuk mempelajari rincian tugas dan beralih ke fitur secara langsung.
                        </p>
                      </div>

                      {/* Flex Vertical Node Diagram */}
                      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-150">
                        {currentMeta.workflow.map((node, idx) => (
                          <div key={node.id} className="relative">
                            {/* Circle Node indicator */}
                            <button
                              onClick={() => setSelectedNode(node)}
                              className={`absolute -left-6 top-1.5 h-5.5 w-5.5 rounded-full flex items-center justify-center font-bold text-[10px] border-2 transition-all cursor-pointer ${
                                selectedNode?.id === node.id 
                                  ? 'bg-slate-900 border-slate-900 text-white scale-110' 
                                  : 'bg-white border-teal-500 text-teal-600 group-hover:bg-teal-50'
                              }`}
                            >
                              {idx + 1}
                            </button>

                            <div 
                              onClick={() => setSelectedNode(node)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                selectedNode?.id === node.id 
                                  ? 'bg-slate-50 border-slate-300 shadow-xs' 
                                  : 'bg-white border-slate-150 hover:bg-slate-50/50'
                              }`}
                            >
                              <h4 className="text-xxs font-semibold uppercase tracking-wider text-slate-900 flex items-center justify-between">
                                {node.label}
                                <ChevronRight className="h-3 w-3 text-slate-400" />
                              </h4>
                              <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 font-medium leading-relaxed">
                                {node.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Selected Node Drawer Details */}
                      <AnimatePresence mode="wait">
                        {selectedNode && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ willChange: 'height, opacity' }}
                            className="bg-teal-50/40 border border-teal-100 rounded-2xl p-4 space-y-3 overflow-hidden mt-2"
                          >
                            <h4 className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-teal-600" />
                              Rincian Modul: {selectedNode.label}
                            </h4>
                            <p className="text-xxs leading-relaxed text-slate-650 font-medium">
                              {selectedNode.desc}
                            </p>
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                navigate(selectedNode.path);
                              }}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <span>Buka Menu: {selectedNode.actionLabel}</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </motion.div>
                  )}

                  {/* TAB 3: Guided Tasks Checklist */}
                  {activeTab === 'tasks' && (
                    <motion.div
                      key="tab-tasks"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      style={{ willChange: 'transform, opacity' }}
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                          <ClipboardList className="h-4 w-4 text-teal-600" />
                          Misi Pengenalan Sistem
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Selesaikan daftar misi di bawah untuk melatih keahlian Anda dalam menggunakan sistem klinik kami.
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        {currentMeta.tasks.map((task) => {
                          const isDone = !!completedTasks[task.id];
                          return (
                            <div 
                              key={task.id}
                              className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                                isDone 
                                  ? 'bg-slate-50/60 border-slate-200 opacity-75' 
                                  : 'bg-white border-slate-150 hover:border-slate-250 shadow-xs'
                              }`}
                            >
                              {/* Checkbox */}
                              <button 
                                onClick={() => toggleTask(task.id)}
                                className="mt-0.5 cursor-pointer text-slate-400 hover:text-teal-600 transition-colors"
                                style={{ minHeight: '24px', minWidth: '24px' }}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="h-5 w-5 text-teal-600 fill-teal-50" />
                                ) : (
                                  <span className="inline-block h-5 w-5 rounded-full border-2 border-slate-300 hover:border-teal-500" />
                                )}
                              </button>

                              {/* Task details */}
                              <div className="flex-1 space-y-1">
                                <h4 className={`text-xs font-bold leading-tight ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                  {task.title}
                                </h4>
                                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                  {task.desc}
                                </p>
                                
                                {!isDone && (
                                  <button
                                    onClick={() => {
                                      setIsOpen(false);
                                      navigate(task.path);
                                    }}
                                    className="text-[9px] font-bold text-teal-650 hover:text-teal-700 mt-2 flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Buka Fitur</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Completion Progress Bar */}
                      {currentMeta.tasks.length > 0 && (
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 mt-2 space-y-2">
                          <div className="flex items-center justify-between text-xxs font-bold text-slate-500 uppercase tracking-wide">
                            <span>Selesai Belajar</span>
                            <span className="font-mono text-slate-900">
                              {Object.values(completedTasks).filter(Boolean).length} / {currentMeta.tasks.length} Misi
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-teal-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${(Object.values(completedTasks).filter(Boolean).length / currentMeta.tasks.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                    </motion.div>
                  )}

                  {/* TAB 4: Role Frequently Asked Questions */}
                  {activeTab === 'faq' && (
                    <motion.div
                      key="tab-faq"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      style={{ willChange: 'transform, opacity' }}
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4 text-teal-600" />
                          Tanya Jawab (FAQ) Peran
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Daftar solusi atas kendala operasional yang paling sering ditemui oleh staf {user.role}.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {currentMeta.faqs.map((faq, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2">
                            <h4 className="text-xs font-semibold text-slate-800 flex items-start gap-1.5 leading-snug">
                              <AlertCircle className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                              {faq.q}
                            </h4>
                            <p className="text-[10px] leading-relaxed text-slate-500 font-medium pl-5.5">
                              {faq.a}
                            </p>
                          </div>
                        ))}
                      </div>

                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Drawer Sticky Footer with Help Contact */}
              <div className="p-4 border-t border-slate-150 bg-slate-50 text-center flex justify-between items-center text-[10px] text-slate-400">
                <span className="font-mono">KPM-v2.6-Live</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <FileText className="h-3 w-3" />
                  Butuh Bantuan IT? Hubungi Administrator
                </span>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}
