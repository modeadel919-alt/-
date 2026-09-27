import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Download, FileText, Volume2, Sparkles, Check, Share2 } from 'lucide-react';
import { formatTime, createSRT } from '../utils/audioUtils';

interface DualAudioPlayerProps {
  originalAudioUrl: string | null;
  dubbedAudioUrl: string | null;
  originalTranscript: string;
  translatedText: string;
  isAr: boolean;
  voiceName: string;
  targetLangName: string;
}

export const DualAudioPlayer: React.FC<DualAudioPlayerProps> = ({
  originalAudioUrl,
  dubbedAudioUrl,
  originalTranscript,
  translatedText,
  isAr,
  voiceName,
  targetLangName,
}) => {
  const [activeTrack, setActiveTrack] = useState<'dubbed' | 'original'>('dubbed');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [copied, setCopied] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Pick the current source according to activeTrack
  const currentSrc = activeTrack === 'dubbed' ? dubbedAudioUrl : originalAudioUrl;

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.pause();
    }
  }, [activeTrack, dubbedAudioUrl, originalAudioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn('Playback error:', err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const downloadDubbedAudio = () => {
    if (!dubbedAudioUrl) return;
    const a = document.createElement('a');
    a.href = dubbedAudioUrl;
    a.download = `dubbed_audio_${voiceName.toLowerCase()}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadSubtitles = () => {
    const srtContent = createSRT(originalTranscript, translatedText, duration || 4);
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles_${Date.now()}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(`${translatedText}\n\n(Original: ${originalTranscript})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!dubbedAudioUrl && !originalAudioUrl) return null;

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-indigo-500/20 rounded-2xl p-5 shadow-xl shadow-indigo-950/20">
      <audio
        ref={audioRef}
        src={currentSrc || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Header with track switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            {isAr ? 'مشغّل الصوت المقارن (A/B Audio Comparison)' : 'A/B Comparative Audio Studio'}
          </span>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAr
              ? `صوت مدبلج بالذكاء الاصطناعي: ${voiceName} (${targetLangName})`
              : `AI Synthesized Dubbing: ${voiceName} (${targetLangName})`}
          </p>
        </div>

        {/* A/B Switcher Pills */}
        <div className="flex items-center p-1 bg-slate-950/90 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTrack('dubbed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTrack === 'dubbed'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAr ? 'الصوت المدبلج (Dubbed)' : 'Dubbed Audio'}
          </button>
          {originalAudioUrl && (
            <button
              type="button"
              onClick={() => setActiveTrack('original')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTrack === 'original'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isAr ? 'الصوت الأصلي (Original)' : 'Original Voice'}
            </button>
          )}
        </div>
      </div>

      {/* Main Playback Bar */}
      <div className="pt-4 space-y-4">
        {/* Scrubber & Timers */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span className="text-[11px] font-semibold text-slate-300 uppercase">
              {activeTrack === 'dubbed' ? `Dubbed (${voiceName})` : 'Original Recording'}
            </span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Playback Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Restart */}
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  setCurrentTime(0);
                }
              }}
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-950/80 rounded-lg border border-slate-800 p-0.5 text-xs font-mono">
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

          {/* Action Downloads */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyTranscript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
              title="Copy Text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ النص' : 'Copy Text')}</span>
            </button>

            <button
              type="button"
              onClick={downloadSubtitles}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
              title="Download SRT Subtitle"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>.SRT</span>
            </button>

            {dubbedAudioUrl && (
              <button
                type="button"
                onClick={downloadDubbedAudio}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 font-medium transition-all active:scale-95"
                title="Download Dubbed Audio WAV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تحميل الصوت (WAV)' : 'Download WAV'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
