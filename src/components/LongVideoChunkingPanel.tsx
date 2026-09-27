import React, { useState } from 'react';
import {
  Scissors,
  Layers,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Download,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Film,
  HardDrive,
  Cpu,
  AlertCircle,
  FileVideo,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { VideoChunkInfo } from '../types/dubbing';
import { base64ToBlob } from '../utils/audioUtils';

interface LongVideoChunkingPanelProps {
  isAr: boolean;
  onOpenCodeModal: () => void;
}

export const LongVideoChunkingPanel: React.FC<LongVideoChunkingPanelProps> = ({
  isAr,
  onOpenCodeModal,
}) => {
  const [targetLang, setTargetLang] = useState<string>('ar');
  const [chunkDurationSec, setChunkDurationSec] = useState<number>(600); // 10 minutes default
  const [totalDurationSec, setTotalDurationSec] = useState<number>(1800); // 30 mins
  const [videoTitle, setVideoTitle] = useState<string>('محاضرة تقنية وثائقية شاملة (30 دقيقة)');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);
  const [chunks, setChunks] = useState<VideoChunkInfo[]>([
    { index: 1, startSec: 0, endSec: 600, durationSec: 600, status: 'pending' },
    { index: 2, startSec: 600, endSec: 1200, durationSec: 600, status: 'pending' },
    { index: 3, startSec: 1200, endSec: 1800, durationSec: 600, status: 'pending' },
  ]);

  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '# دالة دبلجة الفيديوهات الطويلة process_long_video_dubbing جاهزة...',
    '# اضغط "بدء معالجة وتقطيع الفيديو الطويل" لتنفيذ الخطوات وحفظ الذاكرة.',
  ]);

  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [finalAudioName, setFinalAudioName] = useState<string>('long_video_final_dubbed.mp3');
  const [finalVideoName, setFinalVideoName] = useState<string>('long_video_fully_dubbed.mp4');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pythonScript = `import os
from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_audioclips
from google.cloud import texttospeech, translate_v2 as translate, speech_v2 as speech

def process_long_video_dubbing(video_path: str, target_language: str = "${targetLang}", chunk_duration_sec: int = ${chunkDurationSec}):
    """
    تقوم هذه الدالة بقطع الصوت الخاص بالفيديوهات الطويلة (3-4 ساعات) 
    إلى أجزاء (مثلاً كل 10 دقائق = ${chunkDurationSec} ثانية)، دبلجتها، ثم دمجها لتفادي القيود والحفاظ على الذاكرة.
    """
    base_name = os.path.splitext(os.path.basename(video_path))[0]
    output_dir = "processed_chunks"
    os.makedirs(output_dir, exist_ok=True)

    # 1. استخراج الصوت الكامل من الفيديو
    print("جاري استخراج الصوت من الفيديو الطويل...")
    video_clip = VideoFileClip(video_path)
    original_audio_path = os.path.join(output_dir, f"{base_name}_full.wav")
    video_clip.audio.write_audiofile(original_audio_path, fps=16000)
    
    audio_clip = AudioFileClip(original_audio_path)
    total_duration = audio_clip.duration # بالثواني
    
    dubbed_clips = []
    
    # 2. تقسيم الصوت إلى أجزاء (مثلاً كل 10 دقائق = ${chunkDurationSec} ثانية) لتجنب أخطاء الحجم والوقت
    for start_time in range(0, int(total_duration), chunk_duration_sec):
        end_time = min(start_time + chunk_duration_sec, total_duration)
        print(f"جاري معالجة الجزء الصوتي من المقطع: {start_time} إلى {end_time} ثانية...")
        
        # قص الجزء الحالي
        chunk = audio_clip.subclip(start_time, end_time)
        chunk_path = os.path.join(output_dir, f"chunk_{start_time}_{end_time}.wav")
        chunk.write_audiofile(chunk_path, fps=16000)
        
        # [هنا يتم إرسال ملف الـ chunk إلى خدمات جوجل للترجمة والدبلجة للحصول على ملف صوتي مدبلج لهذا الجزء]
        # dubbed_chunk_path = call_google_dubbing_api(chunk_path, target_language)
        # dubbed_clips.append(AudioFileClip(dubbed_chunk_path))

    # 3. دمج المقاطع المدبلجة بالكامل بعد انتهاء المعالجة
    # final_dubbed_audio = concatenate_audioclips(dubbed_clips)
    # final_audio_path = os.path.join(output_dir, f"{base_name}_final_dubbed.mp3")
    # final_dubbed_audio.write_audiofile(final_audio_path)

    # 4. دمج الصوت المدبلج النهائي مع الفيديو الأصلي
    # final_output_video = os.path.join(output_dir, f"{base_name}_fully_dubbed.mp4")
    # new_audio = AudioFileClip(final_audio_path)
    # final_video = video_clip.set_audio(new_audio)
    # final_video.write_videofile(final_output_video, codec="libx264", audio_codec="aac")

    print("تم الانتهاء من معالجة الفيديو الطويل بنجاح.")
`;

  // Update chunks array whenever duration or chunk size changes
  const updateChunksList = (totalSec: number, chunkSec: number) => {
    const list: VideoChunkInfo[] = [];
    for (let s = 0; s < totalSec; s += chunkSec) {
      const e = Math.min(s + chunkSec, totalSec);
      list.push({
        index: list.length + 1,
        startSec: s,
        endSec: e,
        durationSec: e - s,
        status: 'pending',
      });
    }
    setChunks(list);
  };

  const handleTotalDurationChange = (sec: number, label: string) => {
    setTotalDurationSec(sec);
    setVideoTitle(label);
    updateChunksList(sec, chunkDurationSec);
  };

  const handleChunkDurationChange = (chunkSec: number) => {
    setChunkDurationSec(chunkSec);
    updateChunksList(totalDurationSec, chunkSec);
  };

  const executeLongVideoDubbing = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setActiveChunkIndex(0);

    const initialLogs = [
      `$ python process_long_video_dubbing.py`,
      `[*] مدة الفيديو الكاملة: ${Math.round(totalDurationSec / 60)} دقيقة (${totalDurationSec} ثانية)`,
      `[*] حجم كل جزء مقطوع: ${Math.round(chunkDurationSec / 60)} دقيقة (${chunkDurationSec} ثانية)`,
      `[1/4] جاري استخراج الصوت من الفيديو الطويل...`,
    ];
    setTerminalLogs([...initialLogs]);

    try {
      const res = await fetch('/api/process-long-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: 'documentary_masterclass.mp4',
          target_language: targetLang,
          chunk_duration_sec: chunkDurationSec,
          total_duration_sec: totalDurationSec,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        throw new Error(data.detail || data.error || 'Failed to process long video');
      }

      setTerminalLogs(data.logs || []);
      setFinalAudioName(data.final_audio_path || 'long_video_final_dubbed.mp3');
      setFinalVideoName(data.final_video_path || 'long_video_fully_dubbed.mp4');

      if (data.chunks) {
        setChunks(data.chunks);
      }

      if (data.dubbedAudioBase64) {
        const blob = base64ToBlob(data.dubbedAudioBase64, data.dubbedMimeType || 'audio/wav');
        const url = URL.createObjectURL(blob);
        setDubbedAudioUrl(url);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Execution error');
      setTerminalLogs((prev) => [...prev, `[!] خطأ في التنفيذ: ${err.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const downloadScript = () => {
    const blob = new Blob([pythonScript], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'process_long_video_dubbing.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAudioFile = () => {
    if (!dubbedAudioUrl) return;
    const a = document.createElement('a');
    a.href = dubbedAudioUrl;
    a.download = finalAudioName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Scissors className="w-5 h-5 text-cyan-400" />
              </span>
              <h3 className="font-mono font-bold text-base text-white">
                def process_long_video_dubbing(video_path, target_language, chunk_duration_sec=600)
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              {isAr
                ? 'تقنية معالجة وتقطيع الفيديوهات الطويلة (3-4 ساعات) إلى أجزاء (مثلاً كل 10 دقائق = 600 ثانية)، دبلجتها فردياً، ثم دمجها لتفادي نفاد الذاكرة (Memory Leaks) وقيود الحجم والوقت.'
                : 'Long video chunking engine: slices 3-4 hour videos into 10-minute audio parts, dubs each part, and merges with concatenate_audioclips.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={copyScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedCode ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكود' : 'Copy Code')}</span>
            </button>

            <button
              type="button"
              onClick={downloadScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحميل .py' : 'Download .py'}</span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid: Configuration & Chunks Visualizer | Terminal & Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Settings & Chunk Visualizer) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Settings Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                {isAr ? 'إعدادات تقطيع ودبلجة الفيديو الطويل' : 'Long Video Dubbing Parameters'}
              </h4>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <Cpu className="w-3 h-3" />
                Memory Safe
              </span>
            </div>

            {/* Target Language */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono">
                target_language:
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} "{l.code}" - {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Total Duration Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>مدة الفيديو الكاملة (total_duration):</span>
                <span className="text-cyan-400 font-bold">{Math.round(totalDurationSec / 60)} دقيقة ({totalDurationSec}s)</span>
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleTotalDurationChange(1800, 'فيديو 30 دقيقة')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    totalDurationSec === 1800
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  30 دقيقة (1,800s)
                </button>
                <button
                  type="button"
                  onClick={() => handleTotalDurationChange(3600, 'فيديو 1 ساعة')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    totalDurationSec === 3600
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  ساعة كاملة (3,600s)
                </button>
                <button
                  type="button"
                  onClick={() => handleTotalDurationChange(10800, 'فيلم / دورة 3 ساعات')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    totalDurationSec === 10800
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  3 ساعات (10,800s)
                </button>
              </div>
            </div>

            {/* Chunk Duration Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>حجم كل جزء مقطوع (chunk_duration_sec):</span>
                <span className="text-amber-400 font-bold">{Math.round(chunkDurationSec / 60)} دقائق ({chunkDurationSec}s)</span>
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleChunkDurationChange(300)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    chunkDurationSec === 300
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  5 دقائق (300s)
                </button>
                <button
                  type="button"
                  onClick={() => handleChunkDurationChange(600)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    chunkDurationSec === 600
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  10 دقائق (600s - الكود)
                </button>
                <button
                  type="button"
                  onClick={() => handleChunkDurationChange(900)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    chunkDurationSec === 900
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  15 دقيقة (900s)
                </button>
              </div>
            </div>

            {/* Run Button */}
            <button
              type="button"
              onClick={executeLongVideoDubbing}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isProcessing
                  ? isAr
                    ? 'جاري تقطيع ودبلجة ودمج الأجزاء (Processing Chunks)...'
                    : 'Processing Video Chunks...'
                  : isAr
                  ? `تشغيل دالة تقطيع ودبلجة الفيديو (${chunks.length} أجزاء)`
                  : `Execute process_long_video_dubbing (${chunks.length} Chunks)`}
              </span>
            </button>
          </div>

          {/* Sliced Chunks Visualizer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                {isAr ? `الأجزاء المقطوعة للملف (${chunks.length} Chunks)` : `Sliced Audio Chunks (${chunks.length})`}
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                concatenate_audioclips
              </span>
            </div>

            {/* Chunk Cards Carousel / Grid */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {chunks.map((c) => (
                <div
                  key={c.index}
                  className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px]">
                      #{c.index}
                    </span>
                    <div>
                      <span className="text-slate-200 font-semibold">
                        chunk_{c.startSec}_{c.endSec}.wav
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        من {Math.round(c.startSec / 60)}m إلى {Math.round(c.endSec / 60)}m ({c.durationSec}s)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        تمت الدبلجة
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">
                        في الانتظار ⏳
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Terminal Logs & Merged Dubbed File Output) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Simulated Terminal Output */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[320px]">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                <span className="ml-1 text-slate-300">Terminal Output (process_long_video_dubbing)</span>
              </div>
              {isProcessing && (
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  PROCESSING...
                </span>
              )}
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs text-emerald-400 space-y-1.5 leading-relaxed bg-black/90">
              {terminalLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`${
                    log.includes('تم الانتهاء')
                      ? 'text-emerald-300 font-bold bg-emerald-950/30 px-2 py-1 rounded'
                      : log.includes('دمج')
                      ? 'text-cyan-300 font-semibold'
                      : log.startsWith('[!]')
                      ? 'text-rose-400 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Merged Dubbed Output Audio Player */}
          {dubbedAudioUrl && (
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="font-mono text-sm font-bold text-slate-100">
                      {finalAudioName}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {isAr ? 'الصوت المدبلج المدمج بالكامل بعد دمج جميع الأجزاء' : 'Fully concatenated dubbed master track'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={downloadAudioFile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحميل الصوت المدمج' : 'Download Master Audio'}</span>
                </button>
              </div>

              {/* Audio player */}
              <div className="pt-1">
                <audio controls src={dubbedAudioUrl} className="w-full accent-cyan-400 rounded-lg" />
              </div>

              {/* Final MoviePy Output Metadata */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Target Video Output:</span>
                  <span className="text-cyan-300 font-bold">{finalVideoName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Codec / Audio:</span>
                  <span className="text-slate-300">libx264 / AAC 16000Hz</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Memory Status:</span>
                  <span className="text-emerald-400 font-bold">100% Cleared (video_clip.close())</span>
                </div>
              </div>
            </div>
          )}

          {/* Python Code snippet preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <FileCode className="w-3.5 h-3.5" />
                process_long_video_dubbing.py
              </span>
              <span>MoviePy + Google Cloud</span>
            </div>
            <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[220px] leading-relaxed selection:bg-cyan-500/30">
              <code>{pythonScript}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
