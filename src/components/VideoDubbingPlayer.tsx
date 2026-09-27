import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sliders,
  Download,
  FileText,
  Maximize2,
  Subtitles,
  Sparkles,
  Layers,
  Radio,
  Tv,
  CheckCircle2,
  ExternalLink,
  Minimize2,
  X,
  FileVideo,
  Link,
  Clock,
  Info,
} from 'lucide-react';
import { SubtitleSegment } from '../types/dubbing';
import { formatTime, createSRT } from '../utils/audioUtils';

interface VideoDubbingPlayerProps {
  videoSrc: string | null;
  videoFileName?: string | null;
  videoUrl?: string | null;
  isProcessing?: boolean;
  onStartProcessing?: () => void;
  dubbedAudioSrc: string | null;
  originalTranscript: string;
  translatedText: string;
  subtitles?: SubtitleSegment[];
  isAr: boolean;
  voiceName: string;
  targetLangName: string;
}

export const VideoDubbingPlayer: React.FC<VideoDubbingPlayerProps> = ({
  videoSrc,
  videoFileName,
  videoUrl,
  isProcessing = false,
  onStartProcessing,
  dubbedAudioSrc,
  originalTranscript,
  translatedText,
  subtitles = [],
  isAr,
  voiceName,
  targetLangName,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // Audio track mode: 'dubbed' | 'original' | 'mix'
  const [audioMode, setAudioMode] = useState<'dubbed' | 'original' | 'mix'>('dubbed');
  const [bgVolume, setBgVolume] = useState<number>(0.15); // background original volume in mix mode
  const [dubbedVolume, setDubbedVolume] = useState<number>(1.0);

  // Subtitle display toggle
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');

  // Theater modal mode
  const [isTheaterOpen, setIsTheaterOpen] = useState<boolean>(false);
  const [useNativeControls, setUseNativeControls] = useState<boolean>(true); // default to native controls for maximum browser compatibility

  // When dubbed audio becomes available, automatically switch to dubbed audio mode
  useEffect(() => {
    if (dubbedAudioSrc) {
      setAudioMode('dubbed');
    }
  }, [dubbedAudioSrc]);

  // Update synchronized subtitle when time changes
  useEffect(() => {
    if (!subtitles || subtitles.length === 0) {
      setCurrentSubtitle(translatedText);
      return;
    }
    const match = subtitles.find(
      (s) => currentTime >= s.startSec && currentTime <= s.endSec
    );
    if (match) {
      setCurrentSubtitle(match.text);
    } else if (currentTime < 10) {
      setCurrentSubtitle(translatedText);
    }
  }, [currentTime, subtitles, translatedText]);

  // Sync playback rates
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Adjust volumes based on audioMode and whether dubbed audio is present
  useEffect(() => {
    if (!videoRef.current) return;

    if (!dubbedAudioSrc) {
      // Prior to dubbing: enable full original video audio!
      videoRef.current.volume = 1.0;
      videoRef.current.muted = false;
      return;
    }

    // After dubbing: respect selected audioMode
    if (audioMode === 'dubbed') {
      videoRef.current.volume = 0; // mute original to hear dubbed voice clearly
      if (audioRef.current) {
        audioRef.current.volume = dubbedVolume;
        audioRef.current.muted = false;
      }
    } else if (audioMode === 'original') {
      videoRef.current.volume = 1.0;
      videoRef.current.muted = false;
      if (audioRef.current) audioRef.current.volume = 0; // mute dubbed
    } else if (audioMode === 'mix') {
      videoRef.current.volume = bgVolume;
      videoRef.current.muted = false;
      if (audioRef.current) {
        audioRef.current.volume = dubbedVolume;
        audioRef.current.muted = false;
      }
    }
  }, [audioMode, bgVolume, dubbedVolume, dubbedAudioSrc]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        if (dubbedAudioSrc && audioRef.current) {
          audioRef.current.currentTime = videoRef.current!.currentTime;
          audioRef.current.play().catch(() => {});
        }
      }).catch((err) => {
        console.warn('Video play prevented or failed:', err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);

      // Keep dubbed audio closely in sync (drift threshold 0.15s)
      if (dubbedAudioSrc && audioRef.current && isPlaying) {
        if (Math.abs(audioRef.current.currentTime - t) > 0.15) {
          audioRef.current.currentTime = t;
        }
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handlePictureInPicture = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('Picture in picture not supported or failed:', e);
    }
  };

  const downloadDubbedAudio = () => {
    if (!dubbedAudioSrc) return;
    const a = document.createElement('a');
    a.href = dubbedAudioSrc;
    a.download = `dubbed_track_${voiceName.toLowerCase()}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadSRT = () => {
    const srt = createSRT(originalTranscript, translatedText, duration || 15);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video_subtitles_${Date.now()}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!videoSrc) return null;

  const displaySourceLabel = videoFileName || videoUrl || videoSrc;
  const isLocalFile = Boolean(videoFileName);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-4 sm:p-5">
      {/* Hidden audio element for synthesized dubbed track */}
      {dubbedAudioSrc && (
        <audio
          ref={audioRef}
          src={dubbedAudioSrc}
          onEnded={() => {
            if (videoRef.current && videoRef.current.ended) setIsPlaying(false);
          }}
        />
      )}

      {/* Header bar matching the user request: "معاينة وتشغيل الفيديو داخل التطبيق" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                dubbedAudioSrc
                  ? 'bg-emerald-400 animate-pulse'
                  : isProcessing
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-cyan-400'
              }`}
            ></span>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>{isAr ? 'معاينة وتشغيل الفيديو داخل التطبيق:' : 'In-App Video Preview & Playback:'}</span>
              {dubbedAudioSrc ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  ✓ {isAr ? 'تمت الدبلجة' : 'Dubbed'} ({voiceName} ➔ {targetLangName})
                </span>
              ) : isProcessing ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                  ⚡ {isAr ? 'جاري المعالجة والدبلجة...' : 'Processing Dubbing...'}
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {isAr ? 'معاينة فورية للفيديو الأصلي (قبل الدبلجة)' : 'Original Video Preview (Ready)'}
                </span>
              )}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400">
            {dubbedAudioSrc
              ? isAr
                ? 'تم دمج المسار الصوتي المدبلج الجديد مع الفيديو! يمكنك التبديل بين الصوت المدبلج والأصلي.'
                : 'Playback synchronized dubbed video track or switch to original audio.'
              : isAr
              ? 'يتم عرض الفيديو الأصلي مباشرة هنا فور رفعه أو إدخال رابطه للمعاينة بالصوت والصورة قبل بدء الدبلجة.'
              : 'Original video is loaded immediately upon upload/URL selection for local preview.'}
          </p>
        </div>

        {/* Audio Track Selector Modes (visible after dubbing) */}
        {dubbedAudioSrc && (
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setAudioMode('dubbed')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                audioMode === 'dubbed'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isAr ? 'صوت مدبلج' : 'Dubbed'}
            </button>

            <button
              type="button"
              onClick={() => setAudioMode('mix')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                audioMode === 'mix'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dubbed voice + 15% original background atmosphere"
            >
              {isAr ? 'دبلجة سينمائية (Mix)' : 'Studio Mix'}
            </button>

            <button
              type="button"
              onClick={() => setAudioMode('original')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                audioMode === 'original'
                  ? 'bg-slate-800 text-slate-100 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isAr ? 'الأصلي' : 'Original'}
            </button>
          </div>
        )}
      </div>

      {/* EXPLICIT ORIGINAL SOURCE BANNER (Displayed immediately upon upload/selection) */}
      <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
            {isLocalFile ? <FileVideo className="w-4 h-4" /> : <Link className="w-4 h-4" />}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                {isLocalFile
                  ? isAr
                    ? 'ملف الفيديو الأصلي المرفوع:'
                    : 'Uploaded Source Video File:'
                  : isAr
                  ? 'رابط الفيديو المباشر:'
                  : 'Source Video URL:'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800/50">
                {dubbedAudioSrc
                  ? isAr ? 'جاهز للعرض المدبلج' : 'Dubbed Ready'
                  : isProcessing
                  ? isAr ? 'قيد المعالجة' : 'Processing'
                  : isAr ? 'معاينة فورية جاهزة' : 'Preview Ready'}
              </span>
            </div>
            <p className="text-xs font-mono text-cyan-200/90 truncate mt-0.5">
              {displaySourceLabel}
            </p>
          </div>
        </div>

        {/* Quick action to start dubbing directly from player if not yet dubbed */}
        {!dubbedAudioSrc && onStartProcessing && (
          <button
            type="button"
            onClick={onStartProcessing}
            disabled={isProcessing}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {isProcessing
                ? isAr ? 'جاري المعالجة...' : 'Processing...'
                : isAr ? 'بدء المعالجة والدبلجة' : 'Start Dubbing'}
            </span>
          </button>
        )}
      </div>

      {/* Prominent Dubbed Callout Banner (Shown after dubbing succeeds) */}
      {dubbedAudioSrc && !isPlaying && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 to-cyan-950/60 border border-emerald-500/40 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isAr
                ? 'تمت دبلجة الفيديو بنجاح! اضغط زر التشغيل للمشاهدة مع الصوت المدبلج المتزامن:'
                : 'Video dubbed successfully! Click Play to watch with synchronized audio:'}
            </span>
          </div>
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isAr ? 'تشغيل الفيديو الآن' : 'Play Video Now'}</span>
          </button>
        </div>
      )}

      {/* Video Container matching requested UI: <div class="video-container"><video id="videoPlayer" controls> */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800 group shadow-inner"
      >
        <video
          id="videoPlayer"
          ref={videoRef}
          src={videoSrc}
          controls={useNativeControls}
          playsInline
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration || 15);
          }}
          onEnded={() => setIsPlaying(false)}
          onClick={useNativeControls ? undefined : togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        >
          {isAr ? 'متصفحك لا يدعم عرض الفيديو' : 'Your browser does not support the video tag.'}
        </video>

        {/* Dynamic Dubbing Subtitle Overlay */}
        {!useNativeControls && showSubtitles && currentSubtitle && (
          <div className="absolute bottom-12 left-4 right-4 flex justify-center pointer-events-none transition-all">
            <div className="bg-black/85 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-center max-w-2xl shadow-2xl">
              <p className="text-white text-sm sm:text-base font-semibold drop-shadow leading-relaxed font-['Cairo',sans-serif]">
                {currentSubtitle}
              </p>
            </div>
          </div>
        )}

        {/* Big Center Play Overlay (when custom controls and paused) */}
        {!useNativeControls && !isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all">
              <Play className="w-7 h-7 fill-current ml-1" />
            </div>
          </div>
        )}

        {/* Audio Mode Badge on Top Right */}
        {dubbedAudioSrc && !useNativeControls && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur border border-slate-700 text-[11px] font-mono text-cyan-300">
            <Layers className="w-3 h-3 text-emerald-400" />
            <span>
              {audioMode === 'dubbed'
                ? 'DUBBED 100%'
                : audioMode === 'mix'
                ? 'MIX (DUB + BG)'
                : 'ORIGINAL'}
            </span>
          </div>
        )}
      </div>

      {/* Custom Scrubber & Timeline (only when custom controls is active) */}
      {!useNativeControls && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span className="text-[11px] text-slate-400">
              {formatTime(duration)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
          />
        </div>
      )}

      {/* Auxiliary Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {/* Custom Play/Pause (if using custom controls) */}
          {!useNativeControls && (
            <button
              type="button"
              onClick={togglePlay}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 flex items-center justify-center shadow-md active:scale-95 transition-all"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
          )}

          {/* Reset */}
          <button
            type="button"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
                setCurrentTime(0);
              }
              if (audioRef.current) audioRef.current.currentTime = 0;
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Subtitles Toggle (if dubbed) */}
          {dubbedAudioSrc && (
            <button
              type="button"
              onClick={() => setShowSubtitles(!showSubtitles)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showSubtitles
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Toggle Subtitles"
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span>{isAr ? 'الترجمة' : 'Subtitles'}</span>
            </button>
          )}

          {/* Toggle Native Controls */}
          <button
            type="button"
            onClick={() => setUseNativeControls(!useNativeControls)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              useNativeControls
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle HTML5 Native Controls"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isAr ? 'أزرار المتصفح (Controls)' : 'Native Controls'}</span>
          </button>

          {/* Playback Speed */}
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5 text-xs font-mono">
            {[0.8, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                className={`px-2 py-1 rounded text-[11px] transition-all ${
                  playbackRate === rate
                    ? 'bg-slate-800 text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Actions, Theater Mode & Downloads */}
        <div className="flex items-center gap-2">
          {/* Theater View Button */}
          <button
            type="button"
            onClick={() => setIsTheaterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 transition-colors"
            title="Open Theater View Modal"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{isAr ? 'مسرح المشاهدة' : 'Theater View'}</span>
          </button>

          {/* Picture in Picture */}
          <button
            type="button"
            onClick={handlePictureInPicture}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Picture-in-Picture"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={handleFullscreen}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* SRT download (when available) */}
          {dubbedAudioSrc && (
            <button
              type="button"
              onClick={downloadSRT}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Download Subtitles (.SRT)"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>.SRT</span>
            </button>
          )}

          {dubbedAudioSrc && (
            <button
              type="button"
              onClick={downloadDubbedAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 shadow-md transition-all active:scale-95"
              title="Download Dubbed Audio Track (WAV)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحميل الصوت' : 'Download Track'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Theater Lightbox Modal */}
      {isTheaterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  {isAr ? 'مشغّل الفيديو ومسرح الدبلجة المكبر' : 'Theater Dubbing Studio'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTheaterOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player within Modal */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <video
                src={videoSrc}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold">
                  {dubbedAudioSrc
                    ? `${isAr ? 'الصوت المستهدف:' : 'Target Audio:'} ${targetLangName} (${voiceName})`
                    : isAr ? 'معاينة الفيديو الأصلي' : 'Original Video Preview'}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400 truncate max-w-xs">
                  {displaySourceLabel}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {dubbedAudioSrc && (
                  <button
                    type="button"
                    onClick={downloadDubbedAudio}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تحميل الصوت المدبلج' : 'Download Audio'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsTheaterOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
