import React, { useState } from 'react';
import { 
  Layers, 
  Copy, 
  Check, 
  Sliders, 
  Info, 
  Sparkles, 
  RefreshCw, 
  Eye, 
  Code, 
  Palette, 
  Search, 
  Bell, 
  Home, 
  Users, 
  Activity, 
  TrendingUp,
  FileText,
  HelpCircle,
  FolderMinus
} from 'lucide-react';
import { motion } from 'motion/react';

const swatches = [
  { hex: '#05161A', name: 'Darkest Navy', desc: 'Headings, High Contrast Text, Active Icons', role: 'text-brand-darkest' },
  { hex: '#072E33', name: 'Dark Teal', desc: 'Subheadings, Paragraphs, Hover states', role: 'text-brand-dark' },
  { hex: '#0C7075', name: 'Teal Accent', desc: 'Primary Accents, Solid Highlights, Dark Shadows', role: 'text-brand-primary' },
  { hex: '#0F969C', name: 'Bright Teal', desc: 'Main Gradients, Active Buttons, Focal points', role: 'text-brand-secondary' },
  { hex: '#6DA5C0', name: 'Soft Light Blue', desc: 'Fluid Swirls, Subtle Ambient Glow behind Glass', role: 'text-brand-muted' },
  { hex: '#294D61', name: 'Slate Blue', desc: 'Secondary Text, Non-glass Borders, Idle Icons', role: 'text-brand-slate' }
];

export default function DesignSystem() {
  // Playground glass states
  const [opacity, setOpacity] = useState(0.55);
  const [blur, setBlur] = useState(16);
  const [saturate, setSaturate] = useState(150);
  const [borderColor, setBorderColor] = useState(0.8);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'PREVIEW' | 'CSS' | 'GUIDELINES'>('PREVIEW');
  const [searchQuery, setSearchQuery] = useState('');

  const glassStyle = {
    background: `rgba(255, 255, 255, ${opacity})`,
    backdropFilter: `blur(${blur}px) saturate(${saturate}%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(${saturate}%)`,
    border: `1px solid rgba(255, 255, 255, ${borderColor})`,
    boxShadow: '0 8px 32px 0 rgba(7, 46, 51, 0.06)'
  };

  const cssString = `/* Bright Liquid Glassmorphism Utility */
.bright-glass-component {
  background: rgba(255, 255, 255, ${opacity});
  backdrop-filter: blur(${blur}px) saturate(${saturate}%);
  -webkit-backdrop-filter: blur(${blur}px) saturate(${saturate}%);
  border: 1px solid rgba(255, 255, 255, ${borderColor});
  box-shadow: 0 8px 32px 0 rgba(7, 46, 51, 0.06);
  border-radius: 24px;
}`;

  const handleCopyCss = () => {
    navigator.clipboard.writeText(cssString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetPlayground = () => {
    setOpacity(0.55);
    setBlur(16);
    setSaturate(150);
    setBorderColor(0.8);
  };

  return (
    <div className="relative min-h-screen text-[#072E33] font-sans pb-16 overflow-hidden">
      {/* Dynamic Smooth Moving Blob CSS Background strictly for the Liquid theme */}
      <style>{`
        @keyframes liquidSwirl1 {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(40px, -60px) scale(1.2) rotate(120deg); }
          66% { transform: translate(-30px, 30px) scale(0.85) rotate(240deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(360deg); }
        }
        @keyframes liquidSwirl2 {
          0% { transform: translate(0px, 0px) scale(1) rotate(360deg); }
          50% { transform: translate(-50px, 50px) scale(1.1) rotate(180deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
        }
        .liquid-blob-1 {
          animation: liquidSwirl1 22s infinite ease-in-out;
        }
        .liquid-blob-2 {
          animation: liquidSwirl2 26s infinite ease-in-out;
        }
      `}</style>

      {/* Floating Blobs (Light, soft fluid meshes in the back) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[5%] left-[15%] w-[45rem] h-[45rem] bg-[#6DA5C0]/40 rounded-full blur-[110px] liquid-blob-1 transform-gpu" />
        <div className="absolute bottom-[10%] right-[10%] w-[48rem] h-[48rem] bg-[#0F969C]/35 rounded-full blur-[130px] liquid-blob-2 transform-gpu" />
        <div className="absolute top-[40%] right-[25%] w-[35rem] h-[35rem] bg-white rounded-full blur-[90px] transform-gpu" />
      </div>

      <div className="relative z-10 space-y-8">
        
        {/* Main Dashboard Guide Header */}
        <div 
          style={glassStyle}
          className="rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all duration-300"
        >
          <div>
            <div className="flex items-center gap-2 mb-2 text-[#0C7075]">
              <Sparkles className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-xs font-black uppercase tracking-widest font-mono">UI/UX Design System</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#05161A] tracking-tight leading-none">
              Design System Guide
            </h1>
            <p className="text-sm font-semibold text-[#072E33]/90 mt-2 max-w-2xl leading-relaxed">
              Liquid Glassmorphism applied to a modern dashboard layout. A perfect blend of clean aesthetics, organic animations, and clear typography.
            </p>
          </div>

          {/* Search Box / Quick Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative rounded-2xl shadow-sm flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4.5 w-4.5 text-[#294D61]" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search components..."
                className="pl-10 pr-4 py-2.5 w-full bg-white/40 border border-white/60 focus:border-[#0F969C]/70 focus:outline-none focus:ring-4 focus:ring-[#0F969C]/10 text-xs font-semibold rounded-2xl text-[#05161A] placeholder-[#294D61]/70 transition-all"
              />
            </div>
            <button className="flex items-center justify-center h-10 w-10 rounded-2xl bg-white/40 border border-white/60 hover:bg-white/60 text-[#05161A] transition-all relative">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-[#0F969C] rounded-full border border-white animate-pulse" />
            </button>
            <div className="h-10 px-4 flex items-center justify-center gap-2 rounded-2xl bg-[#05161A] text-white text-xs font-black tracking-wider">
              <span>UI</span>
            </div>
          </div>
        </div>

        {/* 1. Color Palette Swatches Section (As requested by the prompt & reference image) */}
        <div style={glassStyle} className="rounded-3xl p-6 md:p-8 transition-all duration-300">
          <div className="flex items-center gap-2.5 mb-2">
            <Palette className="h-5 w-5 text-[#0C7075]" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#05161A]">
              Color Palette Guide
            </h2>
          </div>
          <p className="text-xs text-[#294D61] font-semibold mb-6">
            The extracted colors used for the liquid background and component highlights.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {swatches.map((color, idx) => (
              <div 
                key={idx}
                className="bg-white/50 backdrop-blur-md border border-white/70 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:translate-y-[-2px] transition-transform duration-200"
              >
                <div 
                  className="w-full h-16 rounded-xl shadow-inner border border-black/10 mb-3"
                  style={{ backgroundColor: color.hex }}
                />
                <div>
                  <span className="block font-mono text-xs font-black text-[#05161A] tracking-wider mb-0.5">
                    {color.hex}
                  </span>
                  <span className="block text-xs font-bold text-[#072E33] leading-tight">
                    {color.name}
                  </span>
                  <p className="text-[10px] text-[#294D61]/90 leading-tight mt-1">
                    {color.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Full block showing #294D61 to match the layout guide exactly */}
          <div className="mt-4 bg-white/40 border border-white/60 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#294D61] rounded-xl border border-black/10 flex-shrink-0" />
              <div>
                <span className="font-mono text-xs font-black text-[#05161A] tracking-wider">#294D61</span>
                <span className="block text-xs font-bold text-[#072E33] leading-none mt-1">Slate / Secondary Color</span>
              </div>
            </div>
            <p className="text-xs text-[#294D61] font-medium max-w-xl">
              Secondary color used for borders, divider lines, and text colors that require soft visibility to highlight the rich glass overlays.
            </p>
          </div>
        </div>

        {/* 2. Interactive Playground & Dashboard Preview Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Glass Control Panel (Sliders and Export) */}
          <div style={glassStyle} className="rounded-3xl p-6 space-y-6 lg:col-span-1 transition-all duration-300">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#05161A] flex items-center gap-2">
                <Sliders className="h-4.5 w-4.5 text-[#0C7075]" />
                <span>Adjust Parameters</span>
              </h3>
              <p className="text-[11px] text-[#294D61] font-medium mt-1">
                Tweak live variables to fine-tune the Bright Glassmorphism recipe dynamically.
              </p>
            </div>

            {/* Slider 1: Opacity */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#072E33]">
                <span>Glass Opacity (Fill)</span>
                <span className="font-mono text-xs text-[#05161A]">{(opacity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.95"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/40 border border-white/60 rounded-lg appearance-none cursor-pointer accent-[#0F969C]"
              />
            </div>

            {/* Slider 2: Blur */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#072E33]">
                <span>Blur Strength (Frosted)</span>
                <span className="font-mono text-xs text-[#05161A]">{blur}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="40"
                step="2"
                value={blur}
                onChange={(e) => setBlur(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/40 border border-white/60 rounded-lg appearance-none cursor-pointer accent-[#0F969C]"
              />
            </div>

            {/* Slider 3: Saturate */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#072E33]">
                <span>Color Saturation Boost</span>
                <span className="font-mono text-xs text-[#05161A]">{saturate}%</span>
              </div>
              <input
                type="range"
                min="100"
                max="300"
                step="10"
                value={saturate}
                onChange={(e) => setSaturate(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/40 border border-white/60 rounded-lg appearance-none cursor-pointer accent-[#0F969C]"
              />
            </div>

            {/* Slider 4: Border Opacity */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#072E33]">
                <span>Specular Border Highlights</span>
                <span className="font-mono text-xs text-[#05161A]">{(borderColor * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.95"
                step="0.05"
                value={borderColor}
                onChange={(e) => setBorderColor(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/40 border border-white/60 rounded-lg appearance-none cursor-pointer accent-[#0F969C]"
              />
            </div>

            {/* Actions: Copy & Reset */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={resetPlayground}
                className="flex-1 py-2.5 px-4 rounded-xl border border-white/60 bg-white/30 text-xs font-bold text-[#05161A] hover:bg-white/50 transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reset Defaults</span>
              </button>

              <button
                onClick={handleCopyCss}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#05161A] text-white text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="h-4 w-4 text-teal-300" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied CSS!' : 'Copy CSS Class'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Full Interactive Dashboard Live Demo Component */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tab Toggles */}
            <div className="flex items-center gap-2 p-1 bg-white/30 backdrop-blur-md border border-white/50 rounded-2xl max-w-sm">
              <button
                onClick={() => setActiveTab('PREVIEW')}
                className={`flex-1 py-1.5 text-xs font-black tracking-wider rounded-xl transition-all ${activeTab === 'PREVIEW' ? 'bg-[#05161A] text-white' : 'text-[#072E33] hover:bg-white/30'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('CSS')}
                className={`flex-1 py-1.5 text-xs font-black tracking-wider rounded-xl transition-all ${activeTab === 'CSS' ? 'bg-[#05161A] text-white' : 'text-[#072E33] hover:bg-white/30'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Code className="h-3.5 w-3.5" />
                  <span>CSS Output</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('GUIDELINES')}
                className={`flex-1 py-1.5 text-xs font-black tracking-wider rounded-xl transition-all ${activeTab === 'GUIDELINES' ? 'bg-[#05161A] text-white' : 'text-[#072E33] hover:bg-white/30'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  <span>Rules</span>
                </span>
              </button>
            </div>

            {/* TAB CONTENT 1: PREVIEW DASHBOARD */}
            {activeTab === 'PREVIEW' && (
              <div className="space-y-6">
                
                {/* Simulated Mini Dashboard Viewport using the custom glass style */}
                <div style={glassStyle} className="rounded-3xl p-6 transition-all duration-300">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#05161A] mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 bg-[#0F969C] rounded-full animate-ping" />
                    <span>Interactive Layout Preview</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Stat Card 1 */}
                    <div className="bg-white/40 border border-white/60 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                      <div className="text-xs font-black text-[#294D61] uppercase tracking-wider">User Account</div>
                      <div className="text-xl font-black text-[#05161A] mt-2">Dzulfivector</div>
                      <p className="text-[10px] text-[#072E33]/80 mt-1 font-semibold leading-relaxed">
                        Currently editing the Design System UI.
                      </p>
                    </div>

                    {/* Stat Card 2 */}
                    <div className="bg-white/40 border border-white/60 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                      <div className="text-xs font-black text-[#294D61] uppercase tracking-wider">Glass Opacity</div>
                      <div className="text-xl font-black text-[#0C7075] mt-2">{(opacity * 100).toFixed(0)}%</div>
                      <div className="w-full bg-[#05161A]/10 h-1.5 rounded-full mt-2">
                        <div className="bg-[#0F969C] h-1.5 rounded-full" style={{ width: `${opacity * 100}%` }} />
                      </div>
                    </div>

                    {/* Stat Card 3 */}
                    <div className="bg-white/40 border border-white/60 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                      <div className="text-xs font-black text-[#294D61] uppercase tracking-wider">Design Score</div>
                      <div className="text-xl font-black text-[#0F969C] mt-2">98.5%</div>
                      <p className="text-[10px] text-teal-800 font-bold mt-1">Excellent Liquid Ratio</p>
                    </div>

                  </div>

                  {/* Simulated Inner Feed Area */}
                  <div className="mt-4 p-4 bg-white/20 border border-white/40 rounded-2xl">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/30 text-xs font-bold text-[#05161A]">
                      <span>Real-time CSS Application</span>
                      <span className="font-mono bg-white/40 px-2 py-0.5 rounded text-[#0C7075]">active</span>
                    </div>
                    <p className="text-xs text-[#072E33]/90 font-medium leading-relaxed">
                      As you push sliders in the parameter panel, this dashboard container's background opacity, frosted blur, and border intensity adapt instantly in your browser viewport!
                    </p>
                  </div>
                </div>

                {/* Sub UI Component Demo */}
                <div style={glassStyle} className="rounded-3xl p-5 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#05161A]">
                        Spec Sheet & Compliance
                      </h4>
                      <p className="text-[11px] text-[#294D61] mt-0.5">
                        High fidelity glassmorphism works optimally on colored fluid organic layers.
                      </p>
                    </div>
                    <button className="px-4 py-2.5 bg-[#0F969C] text-white rounded-xl text-xs font-black hover:bg-[#0C7075] transition-all cursor-pointer">
                      Activate Guide
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT 2: CSS OUTPUT */}
            {activeTab === 'CSS' && (
              <div style={glassStyle} className="rounded-3xl p-6 transition-all duration-300">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#05161A]">Generated CSS Code</span>
                  <button
                    onClick={handleCopyCss}
                    className="text-xs font-bold text-[#0F969C] hover:text-[#0C7075] flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-950/90 text-[#6DA5C0] rounded-2xl text-xs font-mono overflow-x-auto leading-relaxed border border-white/20 shadow-inner">
                  {cssString}
                </pre>
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-400/30 rounded-2xl flex items-start gap-2.5 text-xs text-slate-800 leading-relaxed font-semibold">
                  <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-950 block mb-1">Developer Notice</span>
                    Ensure the parent layout possesses some colorful moving background blobs (e.g. circles with CSS keyframe translation and filters) to render the translucent glass refracted effects properly!
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: RULES & CONSTITUTION */}
            {activeTab === 'GUIDELINES' && (
              <div style={glassStyle} className="rounded-3xl p-6 space-y-4 transition-all duration-300 text-xs text-[#072E33] leading-relaxed">
                <div>
                  <h4 className="font-black text-sm text-[#05161A] tracking-tight">Bright Liquid Glassmorphism Constitution</h4>
                  <p className="text-[#294D61] text-xs font-medium mt-0.5">Essential architectural layout instructions</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-[#0F969C]/20 text-[#0F969C] font-black flex items-center justify-center flex-shrink-0 text-xs">1</div>
                    <p className="font-medium">
                      <strong>Backdrop Saturation:</strong> Always saturate above 130% to enrich colors showing through the frosted glass pane.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-[#0F969C]/20 text-[#0F969C] font-black flex items-center justify-center flex-shrink-0 text-xs">2</div>
                    <p className="font-medium">
                      <strong>High Specular Highlight:</strong> Define solid transparent borders (`rgba(255, 255, 255, 0.8)`) primarily at the top and left to simulate standard light reflection angles.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-[#0F969C]/20 text-[#0F969C] font-black flex items-center justify-center flex-shrink-0 text-xs">3</div>
                    <p className="font-medium">
                      <strong>Shadow Depth:</strong> Utilize highly diffuse outer shadows with small offsets (`rgba(7, 46, 51, 0.06)`) to ensure panels appear light and float elegantly.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
