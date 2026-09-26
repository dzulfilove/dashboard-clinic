import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Paperclip, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Trash2, 
  Plus, 
  HelpCircle,
  X,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import api from '../services/api.js';
import Swal from 'sweetalert2';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface ProposalItem {
  id: string;
  title: string;
  description: string;
  category: 'Bug' | 'Usulan Fitur';
  status: 'Diterima' | 'Diproses' | 'Disetujui' | 'Selesai';
  author: string;
  date: string;
  summary?: string;
}

export default function UsulanBug() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('usulan_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'welcome',
        sender: 'ai',
        text: `Halo ${user?.nama || 'Petugas'}! Selamat datang di Pusat Usulan & Bug. Anda bisa menceritakan kendala teknis (bug) atau usulan pengembangan fitur baru di sini. Saya akan membantu merangkum dan mengelompokkannya secara otomatis.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'RIWAYAT' | 'KELOLA'>('RIWAYAT');
  const [proposals, setProposals] = useState<ProposalItem[]>(() => {
    const saved = localStorage.getItem('usulan_proposals_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'prop-1',
        title: 'Notifikasi email stok kritis terlambat',
        description: 'Pemberitahuan stok obat di bawah ROP kadang tidak terkirim real-time ke email koordinator farmasi.',
        category: 'Bug',
        status: 'Diproses',
        author: 'Apoteker Utama',
        date: '2026-09-25',
        summary: 'Keterlambatan pengiriman notifikasi email peringatan stok kritis.'
      },
      {
        id: 'prop-2',
        title: 'Ekspor PDF Rekap Analisis ABC',
        description: 'Dibutuhkan tombol unduh PDF resmi untuk laporan rekapitulasi investasi obat kelas A, B, dan C.',
        category: 'Usulan Fitur',
        status: 'Disetujui',
        author: 'Apoteker Utama',
        date: '2026-09-24',
        summary: 'Fitur cetak laporan PDF untuk modul analisis ABC.'
      },
      {
        id: 'prop-3',
        title: 'Sederhanakan antarmuka pencarian pasien ralan',
        description: 'Pencarian di modul Rawat Jalan perlu mendukung autocomplete cepat berbasis NIK dan No Rekam Medis secara instan.',
        category: 'Usulan Fitur',
        status: 'Selesai',
        author: 'Suster Ratih',
        date: '2026-09-22',
        summary: 'Pembaruan UI pencarian pasien rawat jalan yang lebih intuitif.'
      }
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('usulan_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('usulan_proposals_list', JSON.stringify(proposals));
  }, [proposals]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsgText = inputMessage;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');

    // Simulate AI summary & categorization
    setTimeout(() => {
      const isBug = /bug|error|gagal|salah|lambat|rusak|macet|crash|hilang/i.test(userMsgText);
      const category = isBug ? 'Bug' : 'Usulan Fitur';
      
      let summaryText = userMsgText.length > 50 ? userMsgText.substring(0, 47) + '...' : userMsgText;
      if (isBug) {
        summaryText = `Laporan bug: ${summaryText}`;
      } else {
        summaryText = `Usulan: ${summaryText}`;
      }

      const aiReply: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: 'ai',
        text: `Terima kasih atas laporan Anda! Saya telah mencatat laporan ini sebagai **${category}** dengan rangkuman: "${summaryText}". Laporan ini telah ditambahkan ke daftar riwayat Anda di sebelah kanan.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiReply]);

      const newProposal: ProposalItem = {
        id: `prop-${Date.now()}`,
        title: userMsgText.split('.')[0].substring(0, 60),
        description: userMsgText,
        category: category,
        status: 'Diterima',
        author: user?.nama || 'Petugas Klinik',
        date: new Date().toISOString().split('T')[0],
        summary: summaryText
      };

      setProposals(prev => [newProposal, ...prev]);

      api.post('/logs', {
        action_type: 'CREATE',
        module_name: 'Usulan & Bug',
        description: `Mengirimkan ${category} baru: ${newProposal.title}`
      }).catch(err => console.warn('Silently ignored log error:', err));

    }, 1000);
  };

  const handleDeleteProposal = (id: string) => {
    Swal.fire({
      title: 'Hapus Catatan?',
      text: 'Catatan usulan atau laporan bug ini akan dihapus dari riwayat lokal Anda.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        setProposals(prev => prev.filter(p => p.id !== id));
        Swal.fire('Terhapus!', 'Catatan telah dihapus.', 'success');
      }
    });
  };

  const handleClearChat = () => {
    Swal.fire({
      title: 'Bersihkan Obrolan?',
      text: 'Semua riwayat percakapan chat ini akan dihapus permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Bersihkan!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        setMessages([
          {
            id: 'welcome',
            sender: 'ai',
            text: `Halo ${user?.nama || 'Petugas'}! Selamat datang kembali di Pusat Usulan & Bug. Tulis kendala teknis atau usulan baru Anda di bawah.`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        Swal.fire('Dibersihkan!', 'Riwayat chat telah dibersihkan.', 'success');
      }
    });
  };

  return (
    <div className="space-y-6 font-sans pb-12 text-slate-700">
      {/* Welcome banner style header matching Dashboard exactly */}
      <div 
        id="welcome-banner" 
        className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-800"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Usulan & Bug</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: Chat Window (7/12 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[580px] rounded-3xl overflow-hidden glass-card p-0">
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">AI Asisten Rangkuman</span>
            </div>
            <button 
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Bersihkan Percakapan"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Message Scrollport */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-none bg-slate-50/30">
            {messages.map((msg) => {
              const isAi = msg.sender === 'ai';
              return (
                <div 
                  key={msg.id}
                  className={`flex ${isAi ? 'justify-start' : 'justify-end'} anim-fade-up`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      isAi 
                        ? 'bg-white text-slate-800 border border-slate-200/80 font-medium' 
                        : 'bg-indigo-600 text-white font-semibold'
                    }`}
                    style={isAi ? { boxShadow: '0 4px 12px rgba(0,0,0,0.02)' } : {}}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className={`block text-[10px] text-right mt-1.5 font-mono ${isAi ? 'text-slate-400' : 'text-indigo-200'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Form Input */}
          <form 
            onSubmit={handleSendMessage}
            className="p-4 bg-white border-t border-slate-100 flex items-center space-x-3"
          >
            <button 
              type="button"
              className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
              title="Lampirkan File/Tangkapan Layar"
              style={{ minHeight: '40px', minWidth: '40px' }}
              onClick={() => {
                Swal.fire({
                  title: 'Lampirkan Berkas',
                  text: 'Pilih tangkapan layar atau file laporan kendala Anda untuk diunggah.',
                  input: 'file',
                  inputAttributes: {
                    'accept': 'image/*',
                    'aria-label': 'Upload tangkapan layar'
                  },
                  showCancelButton: true,
                  confirmButtonText: 'Pilih',
                  confirmButtonColor: '#4f46e5'
                }).then((fileResult) => {
                  if (fileResult.value) {
                    Swal.fire('Terpilih', `Berkas ${fileResult.value.name} siap dilampirkan.`, 'success');
                  }
                });
              }}
            >
              <Paperclip className="h-4.5 w-4.5" />
            </button>

            <input 
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Tulis pesan atau usulan baru..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs font-semibold text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all"
            />

            {/* CIRCULAR SEND BUTTON WITH SEND ICON */}
            <button 
              type="submit"
              className="h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Kirim Pesan"
              style={{ minHeight: '40px', minWidth: '40px' }}
            >
              <Send className="h-4.5 w-4.5 text-white" />
            </button>
          </form>
        </div>

        {/* RIGHT PANEL: Tracking Logs & Summary Tabs (5/12 cols) */}
        <div className="lg:col-span-5 flex flex-col h-[580px] rounded-3xl overflow-hidden glass-card p-0">
          {/* Segmented Tab Controllers */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-2">
            <button
              onClick={() => setActiveTab('RIWAYAT')}
              className={`flex-1 py-2 text-xs font-bold tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'RIWAYAT' 
                  ? 'bg-indigo-600 text-white shadow-xs font-bold' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Riwayat Saya</span>
            </button>
            <button
              onClick={() => setActiveTab('KELOLA')}
              className={`flex-1 py-2 text-xs font-bold tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'KELOLA' 
                  ? 'bg-indigo-600 text-white shadow-xs font-bold' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Semua Usulan ({proposals.length})</span>
            </button>
          </div>

          {/* Proposals / Logs Scroll View */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-none bg-slate-50/30">
            <AnimatePresence mode="popLayout">
              {proposals.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <MessageSquare className="h-10 w-10 text-slate-300 mb-3 animate-bounce" />
                  <p className="font-bold text-xs">Belum Ada Usulan</p>
                  <p className="text-xs text-slate-400 mt-1 font-normal leading-relaxed">
                    Kirim pesan keluhan atau saran fitur Anda melalui ruang obrolan untuk membuat catatan pertama.
                  </p>
                </div>
              ) : (
                proposals
                  .filter(p => activeTab === 'KELOLA' || p.author === (user?.nama || 'Petugas Klinik'))
                  .map((item) => {
                    const isBug = item.category === 'Bug';
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:translate-y-[-1px] transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            {/* Unboxed inline metadata categories with dot separators strictly adhering to frontend_design guidelines */}
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              <span className={isBug ? 'text-rose-600' : 'text-teal-600'}>{item.category}</span>
                              <span aria-hidden="true">•</span>
                              <span className="text-slate-400">{item.date}</span>
                            </div>

                            {/* Status Tag */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                              item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              item.status === 'Disetujui' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              item.status === 'Diproses' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {item.status}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-1">{item.title}</h4>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">
                            {item.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100/80 flex items-center justify-between">
                          <div className="text-[10px] text-slate-400 font-medium">
                            Oleh: <span className="font-bold text-slate-600">{item.author}</span>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteProposal(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Usulan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
