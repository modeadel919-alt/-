import React from 'react';
import { SAMPLE_AUDIO_PRESETS } from '../data/languages';
import { AudioSample } from '../types/dubbing';
import { PlayCircle, Sparkles, Volume2 } from 'lucide-react';

interface PresetSamplesProps {
  onSelectSample: (sample: AudioSample) => void;
  isLoading: boolean;
  isAr: boolean;
}

export const PresetSamples: React.FC<PresetSamplesProps> = ({
  onSelectSample,
  isLoading,
  isAr,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {isAr ? 'عَيّنات صوتية جاهزة للتجربة الفورية' : 'Instant Preset Audio Samples'}
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          {isAr ? 'اضغط لتجربة الدبلجة بضغطة زر' : 'Click to test dubbing instantly'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {SAMPLE_AUDIO_PRESETS.map((sample) => (
          <button
            key={sample.id}
            type="button"
            disabled={isLoading}
            onClick={() => onSelectSample(sample)}
            className="group text-left rtl:text-right p-3 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {isAr ? sample.titleAr : sample.title}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {sample.language.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                "{sample.text}"
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-cyan-400 font-mono">
                ➔ {sample.defaultTarget.toUpperCase()}
              </span>
              <span className="flex items-center gap-1 group-hover:text-slate-200 transition-colors">
                <PlayCircle className="w-3 h-3 text-cyan-400" />
                {isAr ? 'دبلجة الآن' : 'Test Dub'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
