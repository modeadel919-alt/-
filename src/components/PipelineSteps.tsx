import React from 'react';
import { StepState, PipelineStats } from '../types/dubbing';
import { Mic, Globe2, Volume2, CheckCircle2, Clock, Sparkles, Edit3, ArrowRight, Activity } from 'lucide-react';

interface PipelineStepsProps {
  stepState: StepState;
  stats?: PipelineStats;
  originalTranscript: string;
  translatedText: string;
  onEditTranslatedText: (text: string) => void;
  sourceLang: string;
  targetLang: string;
  isAr: boolean;
  onRegenerateVoice?: () => void;
  isSynthesizingOnly?: boolean;
}

export const PipelineSteps: React.FC<PipelineStepsProps> = ({
  stepState,
  stats,
  originalTranscript,
  translatedText,
  onEditTranslatedText,
  sourceLang,
  targetLang,
  isAr,
  onRegenerateVoice,
  isSynthesizingOnly = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Visual Progress Bar Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {isAr ? 'مراحل خط أنابيب الدبلجة الفورية (Real-time Pipeline)' : 'Real-Time Dubbing Pipeline'}
            </h3>
          </div>
          {stats && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <Clock className="w-3 h-3" />
              <span>{isAr ? 'الوقت الإجمالي:' : 'Total Latency:'} {(stats.totalDurationMs / 1000).toFixed(2)}s</span>
            </div>
          )}
        </div>

        {/* Pipeline Nodes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1 Node */}
          <div
            className={`p-3 rounded-lg border transition-all ${
              stepState.stt === 'processing'
                ? 'bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-sm'
                : stepState.stt === 'completed'
                ? 'bg-slate-900 border-cyan-500/30 text-slate-200'
                : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Mic className={`w-3.5 h-3.5 ${stepState.stt === 'processing' ? 'text-cyan-400 animate-spin' : 'text-cyan-400'}`} />
                {isAr ? '1. التعرف الصوتي (STT)' : '1. Speech-to-Text'}
              </span>
              {stepState.stt === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {stats?.sttDurationMs && (
                <span className="text-[10px] font-mono text-slate-400">
                  {stats.sttDurationMs}ms
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Google Speech / Gemini Transcribe
            </p>
          </div>

          {/* Step 2 Node */}
          <div
            className={`p-3 rounded-lg border transition-all ${
              stepState.translate === 'processing'
                ? 'bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-sm'
                : stepState.translate === 'completed'
                ? 'bg-slate-900 border-indigo-500/30 text-slate-200'
                : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Globe2 className={`w-3.5 h-3.5 ${stepState.translate === 'processing' ? 'text-indigo-400 animate-spin' : 'text-indigo-400'}`} />
                {isAr ? '2. الترجمة والمواءمة' : '2. Dubbing Translation'}
              </span>
              {stepState.translate === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {stats?.translateDurationMs && (
                <span className="text-[10px] font-mono text-slate-400">
                  {stats.translateDurationMs}ms
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Google Translate API / Gemini Flash
            </p>
          </div>

          {/* Step 3 Node */}
          <div
            className={`p-3 rounded-lg border transition-all ${
              stepState.tts === 'processing'
                ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-sm'
                : stepState.tts === 'completed'
                ? 'bg-slate-900 border-emerald-500/30 text-slate-200'
                : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Volume2 className={`w-3.5 h-3.5 ${stepState.tts === 'processing' ? 'text-emerald-400 animate-spin' : 'text-emerald-400'}`} />
                {isAr ? '3. توليد الصوت المدبلج (TTS)' : '3. Voice Synthesis'}
              </span>
              {stepState.tts === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {stats?.ttsDurationMs && (
                <span className="text-[10px] font-mono text-slate-400">
                  {stats.ttsDurationMs}ms
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Google Cloud TTS / Flash Lite TTS
            </p>
          </div>
        </div>
      </div>

      {/* Content Side-by-Side: Transcribed vs Translated */}
      {(originalTranscript || translatedText) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original Transcribed Text Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  {isAr ? 'النص الأصلي المُستخرَج (Transcript)' : 'Original Transcribed Speech'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                  {sourceLang}
                </span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-sm leading-relaxed text-slate-200 min-h-[90px] font-['Cairo',sans-serif]">
                {originalTranscript || (
                  <span className="text-slate-500 italic">
                    {isAr ? 'جاري انتظار الكلام...' : 'Awaiting speech input...'}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{originalTranscript ? `${originalTranscript.trim().split(/\s+/).length} ${isAr ? 'كلمات' : 'words'}` : ''}</span>
              <span className="text-slate-400">Step 1: STT Result</span>
            </div>
          </div>

          {/* Translated Dubbed Text Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  {isAr ? 'النص المترجم للدبلجة (Dubbed Translation)' : 'Target Dubbed Translation'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                  {targetLang}
                </span>
              </div>
              <div className="relative">
                <textarea
                  value={translatedText}
                  onChange={(e) => onEditTranslatedText(e.target.value)}
                  placeholder={isAr ? 'النص المترجم سيظهر هنا...' : 'Translated dialogue will appear here...'}
                  className="w-full p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-sm leading-relaxed text-slate-100 min-h-[90px] resize-y focus:outline-none focus:border-indigo-400 transition-colors font-['Cairo',sans-serif]"
                />
                <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-slate-400 pointer-events-none bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                  <Edit3 className="w-2.5 h-2.5" />
                  {isAr ? 'قابل للتعديل' : 'Editable'}
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {translatedText ? `${translatedText.trim().split(/\s+/).length} ${isAr ? 'كلمات' : 'words'}` : ''}
              </span>
              {onRegenerateVoice && translatedText && (
                <button
                  type="button"
                  onClick={onRegenerateVoice}
                  disabled={isSynthesizingOnly}
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  {isAr ? 'إعادة توليد الصوت' : 'Re-synthesize Audio'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
