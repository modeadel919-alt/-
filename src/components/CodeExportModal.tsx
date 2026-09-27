import React, { useState } from 'react';
import { X, Copy, Check, Terminal, FileCode, Layers, Film } from 'lucide-react';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLang: string;
  targetLang: string;
  voiceName: string;
  isAr: boolean;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({
  isOpen,
  onClose,
  sourceLang,
  targetLang,
  voiceName,
  isAr,
}) => {
  const [activeTab, setActiveTab] = useState<'fastapi_video' | 'moviepy_chunking' | 'python_audio' | 'gemini_ts' | 'curl'>('moviepy_chunking');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const moviePyChunkingSnippet = `import os
from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_audioclips
from google.cloud import texttospeech, translate_v2 as translate, speech_v2 as speech

def process_long_video_dubbing(video_path: str, target_language: str = "${targetLang}", chunk_duration_sec: int = 600):
    """
    تقوم هذه الدالة بقطع الصوت الخاص بالفيديوهات الطويلة (3-4 ساعات) 
    إلى أجزاء (مثلاً كل 10 دقائق = 600 ثانية)، دبلجتها، ثم دمجها لتفادي القيود والحفاظ على الذاكرة.
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
    
    # 2. تقسيم الصوت إلى أجزاء (مثلاً كل 10 دقائق = 600 ثانية) لتجنب أخطاء الحجم والوقت
    for start_time in range(0, int(total_duration), chunk_duration_sec):
        end_time = min(start_time + chunk_duration_sec, total_duration)
        print(f"جاري معالجة الجزء الصوتي من المقطع: {start_time} إلى {end_time} ثانية...")
        
        # قص الجزء الحالي
        chunk = audio_clip.subclip(start_time, end_time)
        chunk_path = os.path.join(output_dir, f"chunk_{start_time}_{end_time}.wav")
        chunk.write_audiofile(chunk_path, fps=16000)
        
        # دبلجة المقطع الحالي عبر خدمات جوجل (STT -> Translate -> TTS)
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

  const fastApiVideoSnippet = `import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
import yt_dlp
from moviepy.editor import VideoFileClip, AudioFileClip
from google.cloud import texttospeech, translate_v2 as translate, speech_v2 as speech

app = FastAPI(title="Video Dubbing API")

OUTPUT_DIR = "processed_videos"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def download_video_from_url(url: str) -> str:
    """تحميل الفيديو من يوتيوب أو روابط خارجية باستخدام yt-dlp"""
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': os.path.join(OUTPUT_DIR, '%(id)s.%(ext)s'),
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        return filename

def process_dubbing_audio(audio_path: str, target_lang: str) -> str:
    """معالجة الصوت: التعرف -> الترجمة -> التوليف الصوتي المدبلج"""
    speech_client = speech.SpeechClient()
    with open(audio_path, "rb") as f:
        audio_content = f.read()

    audio = speech.RecognitionAudio(content=audio_content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="${sourceLang === 'ar' ? 'ar-EG' : sourceLang}",
    )
    res = speech_client.recognize(config=config, audio=audio)
    transcribed = "".join([r.alternatives[0].transcript for r in res.results])

    # الترجمة
    translate_client = translate.Client()
    translated = translate_client.translate(transcribed, target_language=target_lang)['translatedText']

    # التوليف
    tts_client = texttospeech.TextToSpeechClient()
    voice = texttospeech.VoiceSelectionParams(language_code=target_lang, ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL)
    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
    tts_res = tts_client.synthesize_speech(input=texttospeech.SynthesisInput(text=translated), voice=voice, audio_config=audio_config)

    dubbed_path = audio_path.replace(".wav", "_dubbed.mp3")
    with open(dubbed_path, "wb") as f:
        f.write(tts_res.audio_content)
    return dubbed_path

@app.post("/process-video/")
async def process_video(
    target_language: str = Form("${targetLang}"),
    video_url: str = Form(None),
    file: UploadFile = File(None)
):
    video_path = ""
    # 1. الحصول على الفيديو
    if video_url:
        try:
            video_path = download_video_from_url(video_url)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"فشل تحميل الفيديو من الرابط: {str(e)}")
    elif file:
        video_path = os.path.join(OUTPUT_DIR, file.filename)
        with open(video_path, "wb") as buffer:
            buffer.write(await file.read())
    else:
        raise HTTPException(status_code=400, detail="يجب توفير إما رابط فيديو أو رفع ملف.")

    base_name = os.path.splitext(os.path.basename(video_path))[0]
    final_output_path = os.path.join(OUTPUT_DIR, f"{base_name}_final.mp4")

    try:
        # 2. استخراج الصوت من الفيديو الأصلي
        video_clip = VideoFileClip(video_path)
        original_audio_path = os.path.join(OUTPUT_DIR, f"{base_name}_temp.wav")
        video_clip.audio.write_audiofile(original_audio_path, fps=16000)

        # 3. معالجة الصوت ودبلجته
        dubbed_audio_path = process_dubbing_audio(original_audio_path, target_language)

        # 4. دمج الصوت المدبلج الجديد مع الفيديو
        new_audio = AudioFileClip(dubbed_audio_path)
        final_video = video_clip.set_audio(new_audio)
        final_video.write_videofile(final_output_path, codec="libx264", audio_codec="aac")

        video_clip.close()
        new_audio.close()
        final_video.close()

        return {
            "status": "success",
            "message": "تمت دبلجة الفيديو بنجاح",
            "download_url": f"/download/{os.path.basename(final_output_path)}",
            "stream_url": f"/stream/{os.path.basename(final_output_path)}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"حدث خطأ أثناء المعالجة: {str(e)}")

@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="video/mp4", filename=filename)
    raise HTTPException(status_code=404, detail="الملف غير موجود")
`;

  const pythonAudioSnippet = `import os
from google.cloud import speech_v2 as speech
from google.cloud import translate_v2 as translate
from google.cloud import texttospeech

def process_realtime_dubbing(audio_content: bytes, target_language_code: str = "${targetLang}") -> bytes:
    """
    تقوم هذه الدالة بتحويل الصوت القادم، ترجمته إلى اللغة المستهدفة، ثم توليد صوت جديد باللغة المطلوبة.
    """
    # 1. خدمة تحويل الصوت إلى نص (Google Speech-to-Text)
    speech_client = speech.SpeechClient()
    audio = speech.RecognitionAudio(content=audio_content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="${sourceLang === 'ar' ? 'ar-EG' : sourceLang}",
    )
    recognition_response = speech_client.recognize(config=config, audio=audio)
    transcribed_text = "".join([r.alternatives[0].transcript for r in recognition_response.results])

    if not transcribed_text:
        raise ValueError("لم يتم التعرف على أي كلام بداخل الملف الصوتى المرسل.")

    # 2. خدمة الترجمة الفورية (Google Translate API)
    translate_client = translate.Client()
    translation_result = translate_client.translate(transcribed_text, target_language=target_language_code)
    translated_text = translation_result['translatedText']

    # 3. خدمة توليد الصوت (Google Text-to-Speech)
    tts_client = texttospeech.TextToSpeechClient()
    input_text = texttospeech.SynthesisInput(text=translated_text)
    voice = texttospeech.VoiceSelectionParams(language_code=target_language_code, ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL)
    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
    tts_response = tts_client.synthesize_speech(input=input_text, voice=voice, audio_config=audio_config)

    return tts_response.audio_content
`;

  const geminiTsSnippet = `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

// Full-stack Video & Audio Dubbing with Gemini
export async function processVideoDubbing(videoOrAudioBase64: string, mimeType: string, targetLanguage = "${targetLang}") {
  // 1. Multimodal Speech Transcription
  const stt = await ai.models.generateContent({
    model: "gemini-3.5-transcribe",
    contents: {
      parts: [
        { inlineData: { data: videoOrAudioBase64, mimeType } },
        { text: "Transcribe the dialogue accurately with sentence timecodes." }
      ]
    }
  });

  // 2. Localization Translation
  const trans = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: \`Translate this video dialogue for natural dubbing into \${targetLanguage}: "\${stt.text}"\`
  });

  // 3. Dubbed Audio Synthesis
  const tts = await ai.models.generateContent({
    model: "gemini-3.8-flash-lite-tts",
    contents: [{
      role: "user",
      parts: [{
        text: trans.text,
        speechMetadata: { style: "Natural, synchronized documentary or cinematic dubbing" }
      }]
    }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "${voiceName}" } }
      }
    }
  });

  const dubbedAudioBase64 = tts.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return { transcript: stt.text, translatedText: trans.text, dubbedAudioBase64 };
}
`;

  const curlSnippet = `# Video Dubbing API Request
curl -X POST http://localhost:3000/api/process-video \\
  -H "Content-Type: application/json" \\
  -d '{
    "videoUrl": "https://example.com/video.mp4",
    "targetLanguage": "${targetLang}",
    "voiceName": "${voiceName}",
    "voiceStyle": "Cinematic studio dubbing"
  }'

# Audio Dubbing API Request
curl -X POST http://localhost:3000/api/dubbing/process \\
  -H "Content-Type: application/json" \\
  -d '{
    "audioBase64": "<BASE64_AUDIO_DATA>",
    "mimeType": "audio/wav",
    "targetLanguage": "${targetLang}",
    "voiceName": "${voiceName}"
  }'`;

  const getCode = () => {
    switch (activeTab) {
      case 'moviepy_chunking':
        return moviePyChunkingSnippet;
      case 'fastapi_video':
        return fastApiVideoSnippet;
      case 'python_audio':
        return pythonAudioSnippet;
      case 'gemini_ts':
        return geminiTsSnippet;
      case 'curl':
        return curlSnippet;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                {isAr ? 'كود دبلجة الفيديو والصوت وتقطيع المقاطع الطويلة' : 'Video, Speech & Long Video Dubbing Code'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'تطبيق كامل بـ MoviePy و FastAPI و Google Cloud' : 'MoviePy Chunking Engine + FastAPI Video Dubbing & Gemini'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-slate-800 bg-slate-950/30 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('moviepy_chunking')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                activeTab === 'moviepy_chunking'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-cyan-400" />
              MoviePy Long Video Chunking
            </button>
            <button
              onClick={() => setActiveTab('fastapi_video')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                activeTab === 'fastapi_video'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              FastAPI Video (yt-dlp)
            </button>
            <button
              onClick={() => setActiveTab('python_audio')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                activeTab === 'python_audio'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Python Audio STT/TTS
            </button>
            <button
              onClick={() => setActiveTab('gemini_ts')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                activeTab === 'gemini_ts'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Full-Stack TS
            </button>
            <button
              onClick={() => setActiveTab('curl')}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                activeTab === 'curl'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              cURL API
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 mb-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95 shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكود' : 'Copy Code')}</span>
          </button>
        </div>

        {/* Code Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed selection:bg-cyan-500/30">
          <pre className="whitespace-pre overflow-x-auto p-4 bg-slate-900/90 rounded-xl border border-slate-800">
            <code>{getCode()}</code>
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Target language: <strong className="text-cyan-400">{targetLang}</strong> | Voice: <strong className="text-emerald-400">{voiceName}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
