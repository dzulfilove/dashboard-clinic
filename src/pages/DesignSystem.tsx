import React, { useState } from 'react';
import PageHeader from '../components/PageHeader.js';
import { 
  Layers, 
  Copy, 
  Check, 
  Sparkles, 
  Search, 
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
  XCircle
} from 'lucide-react';

const tokens = [
  { name: 'Primary (Ice)', hex: '#CCDCEF', desc: 'Tombol secondary, focus ring, dashed border', role: 'var(--si-ice)' },
  { name: 'Secondary (Charcoal)', hex: '#222526', desc: 'Teks di atas coral, tooltip, dark accents', role: 'var(--si-charcoal)' },
  { name: 'Support / Accent (Coral)', hex: '#FF8574', desc: 'Aksen tunggal: tab aktif, CTA, seri kunci', role: 'var(--si-coral)' },
  { name: 'Navy (Structure)', hex: '#213145', desc: 'Sidebar, hero banner, primary action button', role: 'var(--si-navy)' },
  { name: 'Slate (Muted)', hex: '#516070', desc: 'Seri grafik sekunder, icon subtle, muted text', role: 'var(--si-slate)' },
  { name: 'Surface', hex: '#F8F9FF', desc: 'Area halaman / latar belakang konten aplikasi', role: 'var(--si-surface)' }
];

export default function DesignSystem() {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'TOKENS' | 'COMPONENTS' | 'RULES'>('TOKENS');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6 font-sans pb-16 text-[#0B1C30]">
      <PageHeader
        title="Design System & Brand Guidelines"
        subtitle="Slate & Ice v2.0: Navy (#213145) untuk struktur, Ice Blue (#CCDCEF) sebagai basis primer, Charcoal (#222526) untuk teks sekunder, dan Warm Coral (#FF8574) sebagai aksen tunggal."
      />

      {/* Tabs */}
      <div className="flex border-b border-[#E5EEFF] gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('TOKENS')}
          className={`pb-3 transition-colors relative ${activeTab === 'TOKENS' ? 'text-[#213145] font-bold' : 'text-[#74777C] hover:text-[#0B1C30]'}`}
        >
          <span>Color Tokens</span>
          {activeTab === 'TOKENS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF8574]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('COMPONENTS')}
          className={`pb-3 transition-colors relative ${activeTab === 'COMPONENTS' ? 'text-[#213145] font-bold' : 'text-[#74777C] hover:text-[#0B1C30]'}`}
        >
          <span>Komponen UI</span>
          {activeTab === 'COMPONENTS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF8574]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('RULES')}
          className={`pb-3 transition-colors relative ${activeTab === 'RULES' ? 'text-[#213145] font-bold' : 'text-[#74777C] hover:text-[#0B1C30]'}`}
        >
          <span>Prinsip &amp; Rasio Kontras</span>
          {activeTab === 'RULES' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF8574]" />
          )}
        </button>
      </div>

      {/* Tab 1: Tokens */}
      {activeTab === 'TOKENS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tokens.map((token, idx) => (
              <div 
                key={idx}
                className="si-card bg-white rounded-2xl p-5 shadow-[0_6px_24px_rgba(33,49,69,0.06)] flex flex-col justify-between gap-4"
              >
                <div>
                  <div 
                    className="h-20 rounded-xl mb-4 border border-black/5 flex items-end justify-end p-2.5 font-mono text-xs font-bold shadow-2xs"
                    style={{ 
                      backgroundColor: token.hex,
                      color: token.hex === '#CCDCEF' || token.hex === '#F8F9FF' || token.hex === '#FF8574' ? '#222526' : '#FFFFFF'
                    }}
                  >
                    <span>{token.hex}</span>
                  </div>
                  <h3 className="font-bold text-base text-[#0B1C30] font-display">{token.name}</h3>
                  <code className="text-xs text-[#516070] font-mono mt-0.5 block">{token.role}</code>
                  <p className="text-xs text-[#74777C] mt-2">{token.desc}</p>
                </div>

                <button
                  onClick={() => copyToClipboard(token.hex, `hex-${idx}`)}
                  className="w-full si-btn si-btn--soft text-xs font-semibold flex items-center justify-center gap-1.5"
                  style={{ background: '#EFF4FF', color: '#213145' }}
                >
                  {copied === `hex-${idx}` ? <Check className="h-3.5 w-3.5 text-[#10B981]" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied === `hex-${idx}` ? 'Tersalin' : 'Salin Hex'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Components */}
      {activeTab === 'COMPONENTS' && (
        <div className="space-y-6">
          {/* Buttons Specimen */}
          <div className="si-card bg-white rounded-2xl p-6 shadow-[0_6px_24px_rgba(33,49,69,0.06)] space-y-4">
            <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase">
              TOMBOL (BUTTONS)
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button className="si-btn si-btn--primary" style={{ background: '#213145', color: '#ffffff' }}>
                Primary Action (Navy)
              </button>
              <button className="si-btn si-btn--secondary" style={{ background: '#CCDCEF', color: '#213145' }}>
                Secondary (Ice)
              </button>
              <button className="si-btn si-btn--accent" style={{ background: '#FF8574', color: '#222526', fontWeight: 700 }}>
                Accent CTA (Coral)
              </button>
              <button className="si-btn si-btn--soft" style={{ background: '#E5EEFF', color: '#213145' }}>
                Soft (Ice-Soft)
              </button>
              <button className="si-btn si-btn--outline" style={{ background: '#ffffff', color: '#0B1C30', border: '1px solid #D3E4FE' }}>
                Outline
              </button>
              <button className="si-btn si-btn--ghost" style={{ background: 'transparent', color: '#213145' }}>
                Ghost
              </button>
            </div>
          </div>

          {/* Tags & Badges */}
          <div className="si-card bg-white rounded-2xl p-6 shadow-[0_6px_24px_rgba(33,49,69,0.06)] space-y-4">
            <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase">
              TAG STATUS
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="si-tag bg-[#213145] text-white">Navy Tag</span>
              <span className="si-tag bg-[#E5EEFF] text-[#213145]">Ice Tag</span>
              <span className="si-tag bg-[#FFE9E5] text-[#A13E32]">Coral Alert</span>
              <span className="si-tag bg-[#ECFDF5] text-[#047857]">Success</span>
              <span className="si-tag bg-[#FFFBEB] text-[#92400E]">Warning</span>
              <span className="si-tag bg-[#FEF2F2] text-[#B91C1C]">Danger</span>
            </div>
          </div>

          {/* Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="si-alert bg-white rounded-xl p-4 shadow-sm flex items-start gap-3 border border-[#E5EEFF]">
              <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
                <CheckCircle className="h-4.5 w-4.5" />
              </div>
              <div>
                <h5 className="font-bold text-xs text-[#0B1C30]">Operasional Normal</h5>
                <p className="text-xs text-[#516070] mt-0.5">Seluruh parameter klinis dan stok berada dalam kondisi aman.</p>
              </div>
            </div>

            <div className="si-alert bg-white rounded-xl p-4 shadow-sm flex items-start gap-3 border border-[#E5EEFF]">
              <div className="w-8 h-8 rounded-lg bg-[#FFE9E5] text-[#A13E32] flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <div>
                <h5 className="font-bold text-xs text-[#A13E32]">Perlu Restok</h5>
                <p className="text-xs text-[#516070] mt-0.5">Terdapat obat dengan stok di bawah tingkat Reorder Point.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Rules */}
      {activeTab === 'RULES' && (
        <div className="si-card bg-white rounded-2xl p-6 shadow-[0_6px_24px_rgba(33,49,69,0.06)] space-y-4">
          <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase">
            PRINSIP SLATE &amp; ICE
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#ECFDF5] text-[#047857] space-y-1">
              <span className="font-bold block text-sm">Prinsip Warna &amp; Hirarki</span>
              <p>1. Navy (#213145) membangun struktur struktural: sidebar, banner hero, header panel.</p>
              <p>2. Ice (#CCDCEF) menjaga tampilan tetap ringan dan bersih pada tombol secondary dan selection.</p>
              <p>3. Coral (#FF8574) langka (maks. 3%) untuk aksen kunci: active tab, ROP alert, satu CTA.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#EFF4FF] text-[#213145] space-y-1">
              <span className="font-bold block text-sm">Aksesibilitas &amp; Kontras</span>
              <p>1. Teks di atas Coral SELALU memakai Charcoal (#222526) dengan rasio kontras 6.5:1 (AA), jangan teks putih.</p>
              <p>2. Kartu putih di atas surface #F8F9FF tanpa border keras.</p>
              <p>3. Minimal ukuran font 12px di seluruh komponen.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
