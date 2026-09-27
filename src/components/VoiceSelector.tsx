import React, { useState } from 'react';
import { GEMINI_VOICES } from '../data/languages';
import { VoiceOption } from '../types/dubbing';
import { Volume2, Check, Sparkles, Sliders } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoice: string;
  onSelectVoice: (voiceId: string) => void;
  voiceStyle: string;
  onChangeVoiceStyle: (style: string) => void;
  isAr: boolean;
}

const VOICE_STYLES = [
  { id: 'natural', label: 'طبيعي ومريح (Natural & Expressive)', prompt: 'Clear, natural dubbing voice with nuanced human cadence and warmth' },
  { id: 'broadcast', label: 'مذيع إخباري (News Anchor)', prompt: 'Crisp, authoritative, formal broadcast tone with measured pauses' },
  { id: 'dramatic', label: 'درامي سينمائي (Cinematic & Dramatic)', prompt: 'Deep, evocative, dramatic tone suitable for cinematic voiceover' },
  { id: 'podcast', label: 'بودكاست حماسي (Energetic Podcast)', prompt: 'Upbeat, friendly, highly energetic conversational delivery' },
  { id: 'calm', label: 'سرد هادئ (Calm Storyteller)', prompt: 'Gentle, soothing, articulate storytelling voice with gentle pacing' },
];

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onSelectVoice,
  voiceStyle,
  onChangeVoiceStyle,
  isAr,
}) => {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const previewVoiceAudition = (voice: VoiceOption) => {
    // Audition sample voice preview using browser synthesis with pitch/rate variance
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        isAr
          ? `مرحباً، أنا صوت ${voice.name}. أستطيع دبلجة كلامك بنبرة طبيعية ومميزة.`
          : `Hello, this is the voice of ${voice.name}. Ready for real-time dubbing.`
      );
      utterance.lang = isAr ? 'ar-SA' : 'en-US';
      if (voice.gender === 'Female') {
        utterance.pitch = 1.15;
      } else {
        utterance.pitch = 0.85;
      }
      utterance.rate = 1.0;

      setPlayingVoice(voice.id);
      utterance.onend = () => setPlayingVoice(null);
      utterance.onerror = () => setPlayingVoice(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          {isAr ? 'شخصية الصوت المستهدف (Voice Character)' : 'Target Voice Character'}
        </label>
        <span className="text-[11px] font-mono text-slate-400">
          5 Gemini TTS Personas
        </span>
      </div>

      {/* Voice Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {GEMINI_VOICES.map((v) => {
          const isSelected = selectedVoice === v.id;
          const isAuditioning = playingVoice === v.id;

          return (
            <div
              key={v.id}
              onClick={() => onSelectVoice(v.id)}
              className={`relative cursor-pointer group flex flex-col justify-between p-3 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'bg-indigo-950/40 border-cyan-400/80 shadow-md shadow-cyan-500/10 scale-[1.02]'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl" role="img" aria-label={v.name}>
                    {v.avatar}
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-slate-100 flex items-center gap-1">
                  {v.name}
                  <span className="text-[10px] font-normal text-slate-400">
                    ({v.gender === 'Female' ? 'F' : 'M'})
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                  {v.accent}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 line-clamp-1">
                  {v.tone.split(',')[0]}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    previewVoiceAudition(v);
                  }}
                  className={`p-1 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors ${
                    isAuditioning ? 'text-cyan-400 animate-pulse' : ''
                  }`}
                  title="Audition Voice"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Voice Delivery Style Selector */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          {isAr ? 'أسلوب ونبرة الدبلجة:' : 'Dubbing Delivery Style:'}
        </label>
        <select
          value={voiceStyle}
          onChange={(e) => onChangeVoiceStyle(e.target.value)}
          className="w-full text-xs bg-slate-900 border border-slate-700/80 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
        >
          {VOICE_STYLES.map((style) => (
            <option key={style.id} value={style.prompt}>
              {style.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
