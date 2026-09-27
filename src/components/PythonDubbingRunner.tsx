import React, { useState, useRef } from 'react';
import {
  Terminal,
  Play,
  RotateCcw,
  Download,
  Copy,
  Check,
  FileCode,
  Mic,
  Square,
  Upload,
  Sparkles,
  Volume2,
  FileAudio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { blobToBase64, base64ToBlob, formatTime, generateTestBeepTone } from '../utils/audioUtils';

interface PythonDubbingRunnerProps {
  isAr: boolean;
}

export const PythonDubbingRunner: React.FC<PythonDubbingRunnerProps> = ({ isAr }) => {
  const [targetLangCode, setTargetLangCode] = useState<string>('en');
  const [sourceLangCode, setSourceLangCode] = useState<string>('ar-EG');
  const [voiceName, setVoiceName] = useState<string>('Kore');

  // Input states
  const [inputSource, setInputSource] = useState<'sample' | 'mic' | 'upload'>('sample');
  const [selectedSampleText, setSelectedSampleText] = useState<string>(
    'أهلاً بكم في نظام الدبلجة الفورية الذكي. نقوم بتحويل الصوت وترجمته إلى أي لغة في ثوانٍ معدودة.'
  );

  // Recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '$ python -i process_realtime_dubbing.py',
    '# نظام الدبلجة الفورية جاهز للتنفيذ...',
    '# اضغط "تشغيل الدالة الآن (Execute Function)" لتمرير audio_content وتوليد output_dubbed_audio.mp3',
  ]);
  const [originalTranscript, setOriginalTranscript] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const pythonScript = `import os
from google.cloud import speech_v2 as speech
from google.cloud import translate_v2 as translate
from google.cloud import texttospeech

def process_realtime_dubbing(audio_content: bytes, target_language_code: str = "${targetLangCode}") -> bytes:
    """
    تقوم هذه الدالة بتحويل الصوت القادم، ترجمته إلى اللغة المستهدفة،
    ثم توليد صوت جديد باللغة المطلوبة.
    """
    
    # 1. خدمة تحويل الصوت إلى نص (Google Speech-to-Text)
    speech_client = speech.SpeechClient()
    
    # إعدادات الصوت القادم (مثال: بث حي بمعدل عينة قياسي)
    audio = speech.RecognitionAudio(content=audio_content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="${sourceLangCode}", # اللغة الأصلية للمتحدث (مثلاً: العربية)
    )

    recognition_response = speech_client.recognize(config=config, audio=audio)
    
    transcribed_text = ""
    for result in recognition_response.results:
        transcribed_text += result.alternatives[0].transcript

    if not transcribed_text:
        raise ValueError("لم يتم التعرف على أي كلام بداخل الملف الصوتى المرسل.")

    print(f"النص الأصلي: {transcribed_text}")

    # 2. خدمة الترجمة الفورية (Google Translate API)
    translate_client = translate.Client()
    translation_result = translate_client.translate(
        transcribed_text,
        target_language=target_language_code # مثل '${targetLangCode}'
    )
    
    translated_text = translation_result['translatedText']
    print(f"النص المترجم: {translated_text}")

    # 3. خدمة توليد الصوت (Google Text-to-Speech)
    tts_client = texttospeech.TextToSpeechClient()
    
    input_text = texttospeech.SynthesisInput(text=translated_text)
    
    # تحديد خصائص الصوت واللغة المستهدفة
    voice = texttospeech.VoiceSelectionParams(
        language_code=target_language_code,
        ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
    )
    
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    tts_response = tts_client.synthesize_speech(
        input=input_text, voice=voice, audio_config=audio_config
    )

    # إرجاع الصوت المدبلج بصيغة بايتات (Bytes) لتشغيله للمستمع
    return tts_response.audio_content

# مثال تجريبي للاستخدام:
if __name__ == "__main__":
    sample_audio_path = "path_to_input_audio.wav"
    if os.path.exists(sample_audio_path):
        with open(sample_audio_path, "rb") as audio_file:
            audio_bytes = audio_file.read()
            
        # دبلجة الصوت إلى اللغة المستهدفة ('${targetLangCode}')
        dubbed_audio = process_realtime_dubbing(audio_bytes, "${targetLangCode}")
        
        with open("output_dubbed_audio.mp3", "wb") as out_file:
            out_file.write(dubbed_audio)
        print("تم حفظ الصوت المدبلج بنجاح باسم output_dubbed_audio.mp3")`;

  // Start Mic
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
      });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start(250);
      setIsRecording(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 0.1);
      }, 100);
    } catch (e: any) {
      setErrorMessage(isAr ? 'تعذر فتح الميكروفون' : 'Could not access mic');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  // Run the Python function
  const runPythonFunction = async () => {
    setIsRunning(true);
    setErrorMessage(null);
    const newLogs: string[] = [
      `$ python process_realtime_dubbing.py`,
      `>>> target_language_code = "${targetLangCode}"`,
    ];

    try {
      let audioBlob: Blob;

      if (inputSource === 'mic' && recordedAudioBlob) {
        audioBlob = recordedAudioBlob;
        newLogs.push(`[*] تم تحميل بايتات التسجيل الصوتي (${audioBlob.size} Bytes)...`);
      } else if (inputSource === 'upload' && uploadedFile) {
        audioBlob = uploadedFile;
        newLogs.push(`[*] تم قراءة ملف: ${uploadedFile.name} (${uploadedFile.size} Bytes)...`);
      } else {
        // Preset sample
        newLogs.push(`[*] جاري قراءة sample_audio_path.wav (العينة العربية التجريبية)...`);
        audioBlob = await generateTestBeepTone(selectedSampleText);
      }

      newLogs.push(`[*] استدعاء: process_realtime_dubbing(audio_content, "${targetLangCode}")`);
      newLogs.push(`[1/3] خدمة تحويل الصوت إلى نص (Google Speech-to-Text)...`);
      setTerminalLogs([...newLogs]);

      const base64Audio = await blobToBase64(audioBlob);

      const res = await fetch('/api/process_realtime_dubbing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          target_language_code: targetLangCode,
          language_code: sourceLangCode,
          voice_name: voiceName,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Execution failed');
      }

      newLogs.push(`> النص الأصلي: ${data.transcribed_text}`);
      newLogs.push(`[2/3] خدمة الترجمة الفورية (Google Translate API)...`);
      newLogs.push(`> النص المترجم: ${data.translated_text}`);
      newLogs.push(`[3/3] خدمة توليد الصوت (Google Text-to-Speech)...`);
      newLogs.push(`[✓] تم حفظ الصوت المدبلج بنجاح باسم output_dubbed_audio.mp3`);
      newLogs.push(`[✓] وقت التنفيذ: ${(data.durationMs / 1000).toFixed(2)} ثانية.`);
      setTerminalLogs([...newLogs]);

      setOriginalTranscript(data.transcribed_text);
      setTranslatedText(data.translated_text);

      if (data.dubbed_audio_base64) {
        const outBlob = base64ToBlob(data.dubbed_audio_base64, data.dubbed_mime_type || 'audio/wav');
        const url = URL.createObjectURL(outBlob);
        setDubbedAudioUrl(url);
      }
    } catch (err: any) {
      console.error(err);
      newLogs.push(`[!] خطأ في التنفيذ: ${err.message}`);
      setTerminalLogs([...newLogs]);
      setErrorMessage(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const downloadScriptFile = () => {
    const blob = new Blob([pythonScript], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'process_realtime_dubbing.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadOutputMp3 = () => {
    if (!dubbedAudioUrl) return;
    const a = document.createElement('a');
    a.href = dubbedAudioUrl;
    a.download = 'output_dubbed_audio.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h3 className="font-mono font-bold text-base text-white">
                def process_realtime_dubbing(audio_content, target_language_code)
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              {isAr
                ? 'مُشغّل ومحاكي مباشر لدالة بايثون: تحويل الصوت إلى نص ➔ ترجمة النص ➔ توليد ملف output_dubbed_audio.mp3'
                : 'Direct Python function runner: STT ➔ Translate ➔ Synthesize and write output_dubbed_audio.mp3'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedCode ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكود' : 'Copy Code')}</span>
            </button>

            <button
              type="button"
              onClick={downloadScriptFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحميل ملف .py' : 'Download .py'}</span>
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

      {/* Workspace: Left side (Code & Config), Right side (Terminal & Output Audio) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Code & Execution Controls */}
        <div className="lg:col-span-6 space-y-5">
          {/* Function Arguments Configuration */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              {isAr ? 'مُدخلات الدالة (Function Parameters)' : 'Function Parameters'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Target Language Code */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-mono">
                  target_language_code:
                </label>
                <select
                  value={targetLangCode}
                  onChange={(e) => setTargetLangCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      "{l.code}" - {l.nativeName} ({l.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Language Code */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-mono">
                  language_code (Original):
                </label>
                <select
                  value={sourceLangCode}
                  onChange={(e) => setSourceLangCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="ar-EG">"ar-EG" - العربية (مصر)</option>
                  <option value="ar-SA">"ar-SA" - العربية (السعودية)</option>
                  <option value="en-US">"en-US" - English (US)</option>
                  <option value="es-ES">"es-ES" - Spanish</option>
                  <option value="fr-FR">"fr-FR" - French</option>
                </select>
              </div>
            </div>

            {/* Input Audio Selection */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <label className="text-xs text-slate-400 font-mono">
                audio_content: bytes:
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setInputSource('sample')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-center ${
                    inputSource === 'sample'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {isAr ? 'عينة تجريبية' : 'Sample Audio'}
                </button>

                <button
                  type="button"
                  onClick={() => setInputSource('mic')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-center ${
                    inputSource === 'mic'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {isAr ? 'تسجيل مايك' : 'Record Mic'}
                </button>

                <button
                  type="button"
                  onClick={() => setInputSource('upload')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-center ${
                    inputSource === 'upload'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {isAr ? 'رفع ملف' : 'Upload File'}
                </button>
              </div>

              {/* Mic mode details */}
              {inputSource === 'mic' && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-300 font-mono flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span>{formatTime(recordDuration)}</span>
                  </div>

                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{isAr ? 'بدء التسجيل' : 'Record'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold animate-pulse"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>{isAr ? 'إيقاف' : 'Stop'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Upload mode details */}
              {inputSource === 'upload' && (
                <label className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <span className="text-xs text-slate-300 truncate">
                    {uploadedFile ? uploadedFile.name : isAr ? 'اختر ملف صوت (.wav, .mp3)' : 'Select audio file'}
                  </span>
                  <Upload className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
                </label>
              )}
            </div>

            {/* Run Button */}
            <button
              type="button"
              onClick={runPythonFunction}
              disabled={isRunning}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isRunning
                  ? isAr
                    ? 'جارٍ تنفيذ دالة بايثون (Executing Python)...'
                    : 'Executing process_realtime_dubbing...'
                  : isAr
                  ? 'تشغيل الدالة الآن: process_realtime_dubbing()'
                  : 'Execute process_realtime_dubbing()'}
              </span>
            </button>
          </div>

          {/* Interactive Code Preview Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <FileCode className="w-3.5 h-3.5" />
                process_realtime_dubbing.py
              </span>
              <span>Python 3.10+</span>
            </div>
            <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[340px] leading-relaxed selection:bg-cyan-500/30">
              <code>{pythonScript}</code>
            </pre>
          </div>
        </div>

        {/* Right: Terminal Console & output_dubbed_audio.mp3 Player */}
        <div className="lg:col-span-6 space-y-5">
          {/* Simulated Python Terminal */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[320px]">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                <span className="ml-1 text-slate-300">Terminal (process_realtime_dubbing Output)</span>
              </div>
              {isRunning && (
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  RUNNING...
                </span>
              )}
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs text-emerald-400 space-y-1.5 leading-relaxed bg-black/90">
              {terminalLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`${
                    log.startsWith('النص')
                      ? 'text-cyan-300 font-bold bg-cyan-950/30 px-2 py-1 rounded'
                      : log.startsWith('[✓]')
                      ? 'text-emerald-300 font-bold'
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

          {/* output_dubbed_audio.mp3 Audio Player Result */}
          {dubbedAudioUrl && (
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="font-mono text-sm font-bold text-slate-100">
                      output_dubbed_audio.mp3
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {isAr ? 'الصوت المدبلج الناتج من دالة بايثون' : 'Synthesized audio returned from Python function'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={downloadOutputMp3}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحميل output_dubbed_audio.mp3' : 'Download MP3'}</span>
                </button>
              </div>

              {/* Audio tag */}
              <div className="pt-1">
                <audio
                  ref={audioPlayerRef}
                  controls
                  src={dubbedAudioUrl}
                  className="w-full accent-emerald-400 rounded-lg"
                />
              </div>

              {/* Side-by-side Text verification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                  <span className="font-mono text-[10px] text-slate-400 block mb-1">
                    transcribed_text (STT):
                  </span>
                  <p className="text-slate-200 line-clamp-3 font-['Cairo',sans-serif]">
                    {originalTranscript}
                  </p>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                  <span className="font-mono text-[10px] text-cyan-400 block mb-1">
                    translated_text ({targetLangCode}):
                  </span>
                  <p className="text-slate-100 font-bold line-clamp-3 font-['Cairo',sans-serif]">
                    {translatedText}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
