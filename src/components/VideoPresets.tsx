import React from 'react';
import { SAMPLE_VIDEO_PRESETS } from '../data/languages';
import { VideoSample } from '../types/dubbing';
import { Film, PlayCircle, Sparkles } from 'lucide-react';

interface VideoPresetsProps {
  onSelectVideo: (sample: VideoSample) => void;
  isLoading: boolean;
  isAr: boolean;
}

export const VideoPresets: React.FC<VideoPresetsProps> = ({
  onSelectVideo,
  isLoading,
  isAr,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {isAr ? 'عَيّنات فيديو جاهزة للدبلجة الفورية' : 'Instant Preset Video Samples'}
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          {isAr ? 'اختر أي مقطع لتجربة دبلجة الفيديو مباشرة' : 'Click to test video dubbing instantly'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SAMPLE_VIDEO_PRESETS.map((video) => (
          <button
            key={video.id}
            type="button"
            disabled={isLoading}
            onClick={() => onSelectVideo(video)}
            className="group text-left rtl:text-right p-3 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col justify-between"
          >
            <div>
              {/* Thumbnail banner simulation */}
              <div
                className={`w-full h-20 rounded-lg bg-gradient-to-tr ${video.thumbnailColor} mb-2.5 flex items-center justify-center relative overflow-hidden group-hover:scale-[1.02] transition-transform`}
              >
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
                <PlayCircle className="w-8 h-8 text-white/90 drop-shadow-md z-10 group-hover:scale-110 transition-transform" />
                <span className="absolute bottom-1 right-2 text-[9px] font-mono bg-black/60 px-1.5 py-0.5 rounded text-white">
                  {video.durationSec}s
                </span>
                <span className="absolute top-1 left-2 text-[9px] font-bold uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded text-cyan-300">
                  {video.category}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-1">
                  {isAr ? video.titleAr : video.title}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                "{video.text}"
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-cyan-400 font-mono font-bold">
                {video.language.toUpperCase()} ➔ {video.defaultTarget.toUpperCase()}
              </span>
              <span className="flex items-center gap-1 group-hover:text-slate-100 transition-colors">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                {isAr ? 'دبلجة الفيديو' : 'Dub Video'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
