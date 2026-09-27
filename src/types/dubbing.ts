export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  bcp47: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  accent: string;
  description: string;
  descriptionAr: string;
  tone: string;
  color: string;
  avatar: string;
}

export interface PipelineStats {
  sttDurationMs: number;
  translateDurationMs: number;
  ttsDurationMs: number;
  totalDurationMs: number;
}

export interface DubbingResult {
  originalTranscript: string;
  translatedText: string;
  dubbedAudioBase64: string;
  dubbedMimeType: string;
  voice: string;
  sourceLanguage: string;
  targetLanguage: string;
  stats?: PipelineStats;
}

export interface AudioSample {
  id: string;
  title: string;
  titleAr: string;
  language: string;
  languageName: string;
  defaultTarget: string;
  text: string;
  durationSec: number;
  category: 'News' | 'Tech' | 'Travel' | 'Story';
}

export interface VideoSample {
  id: string;
  title: string;
  titleAr: string;
  videoUrl: string;
  language: string;
  languageName: string;
  defaultTarget: string;
  text: string;
  durationSec: number;
  category: 'Tech' | 'Documentary' | 'Education' | 'Commercial';
  thumbnailColor: string;
}

export interface SubtitleSegment {
  startSec: number;
  endSec: number;
  text: string;
  originalText?: string;
}

export interface VideoChunkInfo {
  index: number;
  startSec: number;
  endSec: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  transcript?: string;
  translatedText?: string;
  durationSec: number;
}

export type StudioMode = 'python' | 'video' | 'audio';

export type PipelineStepStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface StepState {
  stt: PipelineStepStatus;
  translate: PipelineStepStatus;
  tts: PipelineStepStatus;
  videoMux?: PipelineStepStatus;
}

