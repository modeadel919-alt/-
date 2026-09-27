import React from 'react';
import { Languages, Code2, Sparkles, AudioWaveform, Globe, Film, Mic } from 'lucide-react';
import { StudioMode } from '../types/dubbing';

interface NavbarProps {
  currentLang: 'ar' | 'en';
  onToggleLang: () => void;
  onOpenCodeModal: () => void;
  isProcessing: boolean;
  studioMode: StudioMode;
  onToggleStudioMode: (mode: StudioMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onToggleLang,
  onOpenCodeModal,
  isProcessing,
  studioMode,
  onToggleStudioMode,
}) => {
  const isAr = currentLang === 'ar';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0b0f17]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 shrink-0">
            <div className="w-full h-full bg-[#0b0f17] rounded-[11px] flex items-center justify-center">
              <AudioWaveform className="w-5 h-5 text-cyan-400" />
            </div>
            {isProcessing && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                DubAI
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 rounded-full hidden sm:inline">
                Video & Speech AI
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden md:block">
              {isAr ? 'استوديو دبلجة الفيديو والصوت الفوري' : 'Real-Time Video & Speech Dubbing Studio'}
            </p>
          </div>
        </div>

        {/* Studio Mode Switcher */}
        <div className="flex items-center p-1 bg-slate-950/90 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onToggleStudioMode('python')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              studioMode === 'python'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="font-mono">{isAr ? 'دالة بايثون' : 'Python Dubbing'}</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleStudioMode('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              studioMode === 'video'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>{isAr ? 'دبلجة الفيديو' : 'Video Dubbing'}</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleStudioMode('audio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              studioMode === 'audio'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isAr ? 'الصوت والمايك' : 'Live Speech'}</span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* View Python Code Modal Button */}
          <button
            onClick={onOpenCodeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all duration-150 active:scale-95 shadow-sm"
            title="Inspect FastAPI & Python Dubbing Code"
          >
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline font-mono">FastAPI Code</span>
            <span className="sm:hidden font-mono">API</span>
          </button>

          {/* Bilingual Language Switcher */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 transition-all active:scale-95"
            title="Toggle Interface Language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isAr ? 'EN' : 'عربي'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

