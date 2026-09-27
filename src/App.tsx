/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AudioVisualizer } from './components/AudioVisualizer';
import { VoiceSelector } from './components/VoiceSelector';
import { PipelineSteps } from './components/PipelineSteps';
import { DualAudioPlayer } from './components/DualAudioPlayer';
import { VideoDubbingPlayer } from './components/VideoDubbingPlayer';
import { PresetSamples } from './components/PresetSamples';
import { VideoPresets } from './components/VideoPresets';
import { PythonDubbingRunner } from './components/PythonDubbingRunner';
import { LongVideoChunkingPanel } from './components/LongVideoChunkingPanel';
import { CodeExportModal } from './components/CodeExportModal';
import { SUPPORTED_LANGUAGES } from './data/languages';
import { StepState, PipelineStats, AudioSample, VideoSample, StudioMode, SubtitleSegment } from './types/dubbing';
import { blobToBase64, base64ToBlob, formatTime, generateTestBeepTone, extractAudioFromVideo } from './utils/audioUtils';
import {
  Mic,
  Square,
  Upload,
  ArrowRightLeft,
  Sparkles,
  Volume2,
  AlertCircle,
  Play,
  RotateCcw,
  Zap,
  Film,
  Link,
  Radio,
  FileVideo,
  FileAudio,
  CheckCircle2,
  Code2,
  Scissors,
  Layers,
} from 'lucide-react';

export default function App() {
  // Locale / UI Language
  const [uiLang, setUiLang] = useState<'ar' | 'en'>('ar');
  const isAr = uiLang === 'ar';

  // Studio Mode: 'python' | 'video' | 'audio'
  const [studioMode, setStudioMode] = useState<StudioMode>('video');
  const [videoSubMode, setVideoSubMode] = useState<'long_video' | 'standard'>('long_video');

  // Language selectors
  const [sourceLang, setSourceLang] = useState<string>('ar');
  const [targetLang, setTargetLang] = useState<string>('en');

  // Voice Persona and Tone
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [voiceStyle, setVoiceStyle] = useState<string>(
    'Clear, natural dubbing voice with nuanced human cadence and warmth'
  );

  // Video Inputs
  const [videoInputType, setVideoInputType] = useState<'url' | 'upload'>('url');
  const [videoUrlInput, setVideoUrlInput] = useState<string>(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  );
  const [activeVideoSrc, setActiveVideoSrc] = useState<string | null>(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  );
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);

  // Audio Inputs
  const [audioInputMode, setAudioInputMode] = useState<'mic' | 'upload'>('mic');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [autoDubOnStop, setAutoDubOnStop] = useState<boolean>(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null);
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);

  // Media Source Blobs / URLs
  const [originalAudioBlob, setOriginalAudioBlob] = useState<Blob | null>(null);
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);

  // Pipeline state
  const [stepState, setStepState] = useState<StepState>({
    stt: 'idle',
    translate: 'idle',
    tts: 'idle',
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSynthesizingOnly, setIsSynthesizingOnly] = useState<boolean>(false);
  const [originalTranscript, setOriginalTranscript] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [stats, setStats] = useState<PipelineStats | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Code inspection modal
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (originalAudioUrl) URL.revokeObjectURL(originalAudioUrl);
      if (dubbedAudioUrl) URL.revokeObjectURL(dubbedAudioUrl);
    };
  }, [originalAudioUrl, dubbedAudioUrl]);

  // Swap source and target languages
  const handleSwapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  // Video File Upload
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setDubbedAudioUrl(null); // Reset previous dubbing for the new video
    setUploadedVideoFile(file);
    const url = URL.createObjectURL(file);
    setActiveVideoSrc(url);
    setSuccessToast(
      isAr
        ? `تم تحميل فيديو (${file.name}) محلياً بنجاح! يمكنك تشغيله الآن بالصوت والصورة قبل بدء الدبلجة.`
        : `Video (${file.name}) loaded for immediate local preview with sound before dubbing.`
    );
  };

  // Video Dubbing Execution (FastAPI process-video equivalent)
  const executeVideoDubbing = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessToast(null);
    setStepState({ stt: 'processing', translate: 'idle', tts: 'idle' });

    const sourceLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang);
    const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);

    try {
      let bodyPayload: any = {
        targetLanguage: targetLangObj?.name || 'English',
        target_language: targetLang,
        sourceLanguage: sourceLangObj?.name || 'Auto-detect',
        voiceName: selectedVoice,
        voiceStyle: voiceStyle,
      };

      if (uploadedVideoFile) {
        // Optimize payload: extract pure audio waveform in-memory via Web Audio API
        // This avoids uploading large video frames and completely prevents the 250k input token limit!
        const audioBlob = await extractAudioFromVideo(uploadedVideoFile);
        if (audioBlob) {
          const audioBase64 = await blobToBase64(audioBlob);
          bodyPayload.audioBase64 = audioBase64;
          bodyPayload.mimeType = 'audio/wav';
        } else {
          // If container cannot be decoded directly, send sliced video chunk (< 3MB)
          const slice = uploadedVideoFile.size > 3 * 1024 * 1024 ? uploadedVideoFile.slice(0, 3 * 1024 * 1024) : uploadedVideoFile;
          const base64 = await blobToBase64(slice);
          bodyPayload.videoBase64 = base64;
          bodyPayload.mimeType = uploadedVideoFile.type || 'video/mp4';
        }
      } else {
        bodyPayload.videoUrl = videoUrlInput;
      }

      const res = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        throw new Error(data.detail || data.error || 'Video dubbing failed');
      }

      setStepState({ stt: 'completed', translate: 'completed', tts: 'completed' });
      setOriginalTranscript(data.originalTranscript || '');
      setTranslatedText(data.translatedText || '');
      setSubtitles(data.subtitles || []);
      setStats(data.stats);

      if (data.dubbedAudioBase64) {
        const audioBlob = base64ToBlob(data.dubbedAudioBase64, data.dubbedMimeType || 'audio/wav');
        const url = URL.createObjectURL(audioBlob);
        setDubbedAudioUrl(url);
        setSuccessToast(
          isAr
            ? 'تمت دبلجة الفيديو بنجاح! يمكنك الآن تشغيل الفيديو والاستماع للمسار الصوتي المدبلج مباشرة داخل التطبيق.'
            : 'Video dubbed successfully! You can now play the video with the dubbed audio track inside the app.'
        );
      }
    } catch (err: any) {
      console.error('Video dubbing error:', err);
      setStepState({ stt: 'error', translate: 'error', tts: 'error' });
      setErrorMessage(
        err.message ||
          (isAr
            ? 'حدث خطأ أثناء معالجة دبلجة الفيديو. يرجى التأكد من الرابط أو الملف والمحاولة مجدداً.'
            : 'Error occurred during video dubbing. Please verify input and try again.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Video preset selection
  const handleSelectVideoPreset = (preset: VideoSample) => {
    setErrorMessage(null);
    setSourceLang(preset.language);
    setTargetLang(preset.defaultTarget);
    setVideoUrlInput(preset.videoUrl);
    setActiveVideoSrc(preset.videoUrl);
    setUploadedVideoFile(null);
    setVideoInputType('url');

    // Run dubbing on this video
    setTimeout(() => {
      executeVideoDubbingWithPreset(preset);
    }, 50);
  };

  const executeVideoDubbingWithPreset = async (preset: VideoSample) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setStepState({ stt: 'processing', translate: 'idle', tts: 'idle' });

    try {
      const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === preset.defaultTarget);
      const res = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: preset.videoUrl,
          targetLanguage: targetLangObj?.name || 'English',
          target_language: preset.defaultTarget,
          sourceLanguage: preset.languageName,
          voiceName: selectedVoice,
          voiceStyle: voiceStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Video preset dubbing failed');

      setStepState({ stt: 'completed', translate: 'completed', tts: 'completed' });
      setOriginalTranscript(data.originalTranscript || preset.text);
      setTranslatedText(data.translatedText || '');
      setSubtitles(data.subtitles || []);
      setStats(data.stats);

      if (data.dubbedAudioBase64) {
        const audioBlob = base64ToBlob(data.dubbedAudioBase64, data.dubbedMimeType || 'audio/wav');
        const url = URL.createObjectURL(audioBlob);
        setDubbedAudioUrl(url);
      }
    } catch (err: any) {
      console.error('Preset video dubbing error:', err);
      setStepState({ stt: 'error', translate: 'error', tts: 'error' });
      setErrorMessage(err.message || 'Error dubbing sample video');
    } finally {
      setIsProcessing(false);
    }
  };

  // Start Mic Recording
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      setActiveMediaStream(stream);
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setOriginalAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setOriginalAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
        setActiveMediaStream(null);

        if (autoDubOnStop && audioBlob.size > 1000) {
          executeAudioDubbing(audioBlob, mimeType);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 0.1);
      }, 100);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage(
        isAr
          ? 'تعذر الوصول إلى الميكروفون. يرجى التأكد من منح الإذن أو تجربة العينات الجاهزة.'
          : 'Unable to access microphone. Please check permissions or use preset samples.'
      );
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  // Audio Dubbing Execution
  const executeAudioDubbing = async (blobToDub: Blob, mimeType: string = 'audio/webm') => {
    setIsProcessing(true);
    setErrorMessage(null);
    setStepState({ stt: 'processing', translate: 'idle', tts: 'idle' });

    const sourceLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang);
    const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);

    try {
      const audioBase64 = await blobToBase64(blobToDub);
      const res = await fetch('/api/dubbing/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          sourceLanguage: sourceLangObj?.name || 'Arabic',
          targetLanguage: targetLangObj?.name || 'English',
          voiceName: selectedVoice,
          voiceStyle: voiceStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Dubbing processing failed');

      setStepState({ stt: 'completed', translate: 'completed', tts: 'completed' });
      setOriginalTranscript(data.originalTranscript || '');
      setTranslatedText(data.translatedText || '');
      setStats(data.stats);

      if (data.dubbedAudioBase64) {
        const audioBlob = base64ToBlob(data.dubbedAudioBase64, data.dubbedMimeType || 'audio/wav');
        const url = URL.createObjectURL(audioBlob);
        setDubbedAudioUrl(url);
      }
    } catch (err: any) {
      console.error('Pipeline error:', err);
      setStepState({ stt: 'error', translate: 'error', tts: 'error' });
      setErrorMessage(err.message || 'Error occurred during dubbing.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-synthesize audio if user edits translated text
  const handleRegenerateVoice = async () => {
    if (!translatedText.trim()) return;
    setIsSynthesizingOnly(true);
    setErrorMessage(null);
    setStepState((prev) => ({ ...prev, tts: 'processing' }));

    try {
      const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);
      const res = await fetch('/api/dubbing/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: translatedText,
          voiceName: selectedVoice,
          style: voiceStyle,
          targetLanguage: targetLangObj?.name || 'English',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voice synthesis failed');

      setStepState((prev) => ({ ...prev, tts: 'completed' }));
      if (data.audioBase64) {
        const audioBlob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
        const url = URL.createObjectURL(audioBlob);
        setDubbedAudioUrl(url);
      }
    } catch (err: any) {
      console.error('Voice regeneration error:', err);
      setErrorMessage(err.message || 'Failed to re-synthesize speech');
    } finally {
      setIsSynthesizingOnly(false);
    }
  };

  const currentSourceLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang);
  const currentTargetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-['Cairo',sans-serif]"
    >
      {/* Top Header */}
      <Navbar
        currentLang={uiLang}
        onToggleLang={() => setUiLang(isAr ? 'en' : 'ar')}
        onOpenCodeModal={() => setIsCodeModalOpen(true)}
        isProcessing={isProcessing}
        studioMode={studioMode}
        onToggleStudioMode={setStudioMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Header */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-cyan-950/40 border border-slate-800 p-6 sm:p-7 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-2.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {studioMode === 'python'
                    ? isAr
                      ? 'محاكي دالة بايثون: تحويل الصوت ➔ ترجمة فورية ➔ توليد output_dubbed_audio.mp3'
                      : 'Python Dubbing Runner: STT ➔ Translate ➔ Generate output_dubbed_audio.mp3'
                    : studioMode === 'video'
                    ? isAr
                      ? 'دبلجة الفيديو الذكية: استخراج الصوت ➔ الترجمة ➔ دمج الصوت المدبلج مع الصورة'
                      : 'Video Dubbing Engine: Extract Audio ➔ Translate ➔ Lip-sync Dubbing'
                    : isAr
                    ? 'دبلجة الصوت الفورية: تعرّف صوتي (STT) ➔ ترجمة ➔ توليد صوت طبيعي (TTS)'
                    : 'Real-time Speech Dubbing: STT ➔ Dubbing Localization ➔ Natural Voice'}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                {studioMode === 'python' ? (
                  isAr ? (
                    <>
                      تشغيل دالة بايثون{' '}
                      <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent font-mono">
                        process_realtime_dubbing()
                      </span>
                    </>
                  ) : (
                    <>
                      Interactive Python Runner for{' '}
                      <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent font-mono">
                        process_realtime_dubbing()
                      </span>
                    </>
                  )
                ) : studioMode === 'video' ? (
                  isAr ? (
                    <>
                      استوديو دبلجة الفيديو الذكي{' '}
                      <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                        باستبدال المسار الصوتي والترجمة
                      </span>
                    </>
                  ) : (
                    <>
                      Automated Video Dubbing{' '}
                      <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                        & Audio Track Replacement
                      </span>
                    </>
                  )
                ) : isAr ? (
                  <>
                    دبلجة وترجمة صوتية فورية{' '}
                    <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                      عبر الميكروفون والملفات
                    </span>
                  </>
                ) : (
                  <>
                    Real-Time AI Voice Dubbing{' '}
                    <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                      with Natural Tone
                    </span>
                  </>
                )}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                {studioMode === 'python'
                  ? isAr
                    ? 'تنفيذ دالة process_realtime_dubbing(audio_content, target_language_code) الأصلية مع شاشة طرفية تطبع النصوص وتولد ملف output_dubbed_audio.mp3 مباشرة.'
                    : 'Direct execution of def process_realtime_dubbing(audio_content, target_language_code) -> bytes with live terminal output and audio file output.'
                  : studioMode === 'video'
                  ? isAr
                    ? 'تطبيق متكامل لـ FastAPI + MoviePy + yt-dlp: ضع رابط فيديو أو ارفع مقطعاً ليقوم الذكاء الاصطناعي باستخراج الصوت، ترجمته، وتوليد مسار صوتي مدبلج متزامن بالكامل.'
                    : 'Full implementation of your FastAPI Video Dubbing API: provide a video link or file, transcribe speech, translate with timestamps, and preview the synchronized dubbed video track.'
                  : isAr
                    ? 'تحدث بصوتك مباشرة أو ارفع ملف صوتي ليتم التعرف على لغتك ودبلجتها إلى أكثر من 14 لغة فوراً.'
                    : 'Speak via live microphone or upload an audio file for real-time translation and voice dubbing.'}
              </p>
            </div>

            {/* Quick Action Button to Open Code */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCodeModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-300 shadow-md transition-all active:scale-95"
              >
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? 'عرض الأكواد المصدرية' : 'View Source Code'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Error Notice Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{isAr ? 'تنبيه النظام:' : 'System Alert:'}</p>
              <p className="text-xs text-rose-200/90 mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-white px-2 py-1 rounded bg-rose-950/40"
            >
              {isAr ? 'إغلاق' : 'Dismiss'}
            </button>
          </div>
        )}

        {/* Success Notice Banner */}
        {successToast && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-start gap-3 text-emerald-300 text-sm animate-in fade-in shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-200">{isAr ? 'إشعار المعالجة:' : 'Process Notification:'}</p>
              <p className="text-xs text-emerald-100/90 mt-0.5">{successToast}</p>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-xs text-emerald-400 hover:text-white px-2 py-1 rounded bg-emerald-950/60"
            >
              {isAr ? 'إغلاق' : 'Dismiss'}
            </button>
          </div>
        )}

        {/* Video Mode Sub-switcher (Long Video Chunking vs Standard Video) */}
        {studioMode === 'video' && (
          <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
            <button
              type="button"
              onClick={() => setVideoSubMode('long_video')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                videoSubMode === 'long_video'
                  ? 'bg-gradient-to-r from-indigo-500 via-cyan-500 to-teal-400 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>
                {isAr
                  ? 'تقطيع ودبلجة الفيديوهات الطويلة (3-4 ساعات) - process_long_video_dubbing'
                  : 'Long Video Chunking Engine (3-4 Hours MoviePy)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setVideoSubMode('standard')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                videoSubMode === 'standard'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>
                {isAr
                  ? 'دبلجة الفيديو القياسية (FastAPI + yt-dlp)'
                  : 'Standard Video Dubbing (FastAPI + yt-dlp)'}
              </span>
            </button>
          </div>
        )}

        {/* Dynamic Studio Mode View: Python Runner or Long Video Chunking or Video/Audio Workspace */}
        {studioMode === 'python' ? (
          <PythonDubbingRunner isAr={isAr} />
        ) : studioMode === 'video' && videoSubMode === 'long_video' ? (
          <LongVideoChunkingPanel isAr={isAr} onOpenCodeModal={() => setIsCodeModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Inputs, Video Configuration, Voice Character) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Language Pair Selector */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {isAr ? 'إعدادات زوج اللغات (Language Configuration)' : 'Language Configuration'}
                </span>
                <span className="text-[11px] font-mono text-cyan-400">
                  {sourceLang.toUpperCase()} ➔ {targetLang.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center">
                {/* Source Language */}
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-xs text-slate-400">
                    {isAr ? 'لغة الفيديو/الصوت الأصلي:' : 'Source Spoken Language:'}
                  </label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={`src-${lang.code}`} value={lang.code}>
                        {lang.flag} {lang.nativeName} ({lang.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Button */}
                <div className="sm:col-span-1 flex justify-center py-1 sm:py-0">
                  <button
                    type="button"
                    onClick={handleSwapLanguages}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shadow-sm"
                    title="Swap languages"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>

                {/* Target Language */}
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-xs text-slate-400">
                    {isAr ? 'لغة الدبلجة المستهدفة:' : 'Target Dubbed Language:'}
                  </label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={`tgt-${lang.code}`} value={lang.code}>
                        {lang.flag} {lang.nativeName} ({lang.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* MODE 1: VIDEO DUBBING INPUTS */}
            {studioMode === 'video' && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setVideoInputType('url')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        videoInputType === 'url'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Link className="w-3.5 h-3.5" />
                      <span>{isAr ? 'رابط فيديو (URL)' : 'Video URL'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVideoInputType('upload')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        videoInputType === 'upload'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isAr ? 'رفع فيديو MP4' : 'Upload Video'}</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                    yt-dlp & MoviePy Engine
                  </span>
                </div>

                {/* Option A: Video URL */}
                {videoInputType === 'url' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">
                        {isAr ? 'رابط الفيديو (YouTube أو رابط MP4 مباشر):' : 'Video URL (YouTube or Direct MP4/WebM):'}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={videoUrlInput}
                          onChange={(e) => {
                            setVideoUrlInput(e.target.value);
                            setActiveVideoSrc(e.target.value);
                          }}
                          placeholder="https://..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={executeVideoDubbing}
                      disabled={isProcessing || !videoUrlInput.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isProcessing
                          ? isAr
                            ? 'جاري استخراج ودبلجة الفيديو...'
                            : 'Processing Video Dubbing...'
                          : isAr
                          ? 'بدء دبلجة الفيديو (Process Video)'
                          : 'Process Video Dubbing'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Option B: Upload Video File */}
                {videoInputType === 'upload' && (
                  <div className="space-y-3">
                    <label className="border-2 border-dashed border-slate-700 hover:border-cyan-400/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all text-center group">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/mkv"
                        onChange={handleVideoFileUpload}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 group-hover:bg-cyan-500/20 text-indigo-400 group-hover:text-cyan-300 flex items-center justify-center mb-2 transition-colors">
                        <FileVideo className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-slate-200">
                        {uploadedVideoFile
                          ? uploadedVideoFile.name
                          : isAr
                          ? 'اختر أو اسحب ملف فيديو (MP4, WebM, MOV)'
                          : 'Click or drop a video file (MP4, WebM, MOV)'}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        {uploadedVideoFile
                          ? `${(uploadedVideoFile.size / (1024 * 1024)).toFixed(2)} MB`
                          : isAr
                          ? 'الحد الأقصى الموصى به: 25 ميجابايت'
                          : 'Recommended max: 25MB'}
                      </span>
                    </label>

                    {uploadedVideoFile && (
                      <button
                        type="button"
                        onClick={executeVideoDubbing}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isAr ? 'دبلجة الفيديو المرفوع' : 'Dub Uploaded Video'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: LIVE SPEECH / AUDIO DUBBING INPUTS */}
            {studioMode === 'audio' && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAudioInputMode('mic')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        audioInputMode === 'mic'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{isAr ? 'الميكروفون الحي' : 'Live Mic'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAudioInputMode('upload')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        audioInputMode === 'upload'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isAr ? 'رفع ملف صوت' : 'Upload Audio'}</span>
                    </button>
                  </div>

                  {audioInputMode === 'mic' && (
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoDubOnStop}
                        onChange={(e) => setAutoDubOnStop(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">
                        {isAr ? 'دبلجة تلقائية عند التوقف' : 'Auto-Dub'}
                      </span>
                    </label>
                  )}
                </div>

                {audioInputMode === 'mic' ? (
                  <div className="space-y-4">
                    <AudioVisualizer
                      isRecording={isRecording}
                      audioStream={activeMediaStream}
                      height={96}
                    />

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                        <span>{isAr ? 'المدة:' : 'Duration:'}</span>
                        <strong className="text-white">{formatTime(recordDuration)}</strong>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {!isRecording ? (
                          <button
                            type="button"
                            onClick={startRecording}
                            disabled={isProcessing}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
                          >
                            <Mic className="w-4 h-4" />
                            <span>{isAr ? 'بدء التسجيل الصوتي' : 'Start Recording'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all animate-pulse"
                          >
                            <Square className="w-4 h-4 fill-current" />
                            <span>{isAr ? 'إيقاف والدبلجة' : 'Stop & Dub'}</span>
                          </button>
                        )}

                        {originalAudioBlob && !isRecording && (
                          <button
                            type="button"
                            onClick={() => executeAudioDubbing(originalAudioBlob)}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 text-slate-950 font-bold text-xs active:scale-95 transition-all disabled:opacity-50"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>{isAr ? 'إعادة الدبلجة' : 'Re-Dub'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="border-2 border-dashed border-slate-700 hover:border-cyan-400/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all text-center group">
                      <input
                        type="file"
                        accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setUploadedAudioFile(f);
                          setOriginalAudioBlob(f);
                          setOriginalAudioUrl(URL.createObjectURL(f));
                        }}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 group-hover:bg-cyan-500/20 text-indigo-400 group-hover:text-cyan-300 flex items-center justify-center mb-2 transition-colors">
                        <FileAudio className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-slate-200">
                        {uploadedAudioFile ? uploadedAudioFile.name : isAr ? 'اختر ملف صوتي' : 'Select Audio File'}
                      </span>
                    </label>

                    {originalAudioBlob && (
                      <button
                        type="button"
                        onClick={() => executeAudioDubbing(originalAudioBlob, uploadedAudioFile?.type || 'audio/wav')}
                        disabled={isProcessing}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isAr ? 'دبلجة الملف الصوتي' : 'Dub Uploaded Audio'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Voice Character Persona Selector */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <VoiceSelector
                selectedVoice={selectedVoice}
                onSelectVoice={setSelectedVoice}
                voiceStyle={voiceStyle}
                onChangeVoiceStyle={setVoiceStyle}
                isAr={isAr}
              />
            </div>

            {/* Preset Samples (Video or Audio based on mode) */}
            {studioMode === 'video' ? (
              <VideoPresets
                onSelectVideo={handleSelectVideoPreset}
                isLoading={isProcessing}
                isAr={isAr}
              />
            ) : (
              <PresetSamples
                onSelectSample={(sample) => {
                  setErrorMessage(null);
                  setSourceLang(sample.language);
                  setTargetLang(sample.defaultTarget);
                  setIsProcessing(true);
                  setStepState({ stt: 'completed', translate: 'processing', tts: 'idle' });
                  setOriginalTranscript(sample.text);

                  // Execute preset dubbing
                  generateTestBeepTone(sample.text).then((blob) => {
                    setOriginalAudioBlob(blob);
                    setOriginalAudioUrl(URL.createObjectURL(blob));
                    executeAudioDubbing(blob, 'audio/wav');
                  });
                }}
                isLoading={isProcessing}
                isAr={isAr}
              />
            )}
          </div>

          {/* Right Column (Video Player Studio / Audio Player / Transcripts / Pipeline) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Visual Pipeline Steps */}
            <PipelineSteps
              stepState={stepState}
              stats={stats}
              originalTranscript={originalTranscript}
              translatedText={translatedText}
              onEditTranslatedText={setTranslatedText}
              sourceLang={currentSourceLangObj?.name || sourceLang}
              targetLang={currentTargetLangObj?.name || targetLang}
              isAr={isAr}
              onRegenerateVoice={handleRegenerateVoice}
              isSynthesizingOnly={isSynthesizingOnly}
            />

            {/* Display Video Dubbing Player in Video Mode */}
            {studioMode === 'video' && activeVideoSrc && (
              <VideoDubbingPlayer
                videoSrc={activeVideoSrc}
                videoFileName={uploadedVideoFile?.name || (videoInputType === 'url' ? videoUrlInput : null)}
                videoUrl={videoInputType === 'url' ? videoUrlInput : null}
                isProcessing={isProcessing}
                onStartProcessing={executeVideoDubbing}
                dubbedAudioSrc={dubbedAudioUrl}
                originalTranscript={originalTranscript}
                translatedText={translatedText}
                subtitles={subtitles}
                isAr={isAr}
                voiceName={selectedVoice}
                targetLangName={currentTargetLangObj?.name || targetLang}
              />
            )}

            {/* Display Dual Audio Player in Audio Mode */}
            {studioMode === 'audio' && (originalAudioUrl || dubbedAudioUrl) && (
              <DualAudioPlayer
                originalAudioUrl={originalAudioUrl}
                dubbedAudioUrl={dubbedAudioUrl}
                originalTranscript={originalTranscript}
                translatedText={translatedText}
                isAr={isAr}
                voiceName={selectedVoice}
                targetLangName={currentTargetLangObj?.name || targetLang}
              />
            )}

            {/* Empty State Help Card (shown only when no video or audio is currently loaded) */}
            {((studioMode === 'video' && !activeVideoSrc) ||
              (studioMode === 'audio' && !originalAudioUrl && !dubbedAudioUrl)) &&
              !isProcessing && (
              <div className="p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center">
                  <Film className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="font-semibold text-slate-200 text-sm">
                  {isAr ? 'جاهز لمعالجة دبلجة الفيديو والصوت' : 'Ready to Process Video & Speech Dubbing'}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {isAr
                    ? 'اختر إحدى عينات الفيديو الجاهزة بالأعلى أو ضع رابط فيديو، واضغط "بدء دبلجة الفيديو" لتشغيل خط أنابيب FastAPI و Google Cloud في ثوانٍ!'
                    : 'Select any sample video above or provide a video URL, then click "Process Video" to run the complete FastAPI dubbing pipeline!'}
                </p>
              </div>
            )}
          </div>
        </div>
        )}
      </main>

      {/* Code Inspection Modal */}
      <CodeExportModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        sourceLang={sourceLang}
        targetLang={targetLang}
        voiceName={selectedVoice}
        isAr={isAr}
      />
    </div>
  );
}
