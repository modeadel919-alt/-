/**
 * Audio Utilities for recording, playback, and processing
 */

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64: string, mimeType: string = 'audio/wav'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
}

export function createSRT(original: string, translated: string, durationSec: number = 4): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatSrtTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `00:${pad(m)}:${pad(s)},${ms.toString().padStart(3, '0')}`;
  };

  return `1
00:00:00,000 --> ${formatSrtTime(durationSec)}
${translated}

// Original (${original})
`;
}

// Generate a synthetic test audio wave if the user clicks a preset without uploading a file
export function generateTestBeepTone(text: string): Promise<Blob> {
  return new Promise((resolve) => {
    const sampleRate = 16000;
    const duration = 2.5;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Simple gentle human-like speech harmonic frequencies
    const offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Speech formant emulation (fundamental ~160Hz + harmonics)
      const freq = 160 + Math.sin(t * 8) * 20;
      const sample =
        Math.sin(2 * Math.PI * freq * t) * 0.4 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.2 +
        Math.sin(2 * Math.PI * freq * 3 * t) * 0.1;
      const envelope = Math.sin((Math.PI * i) / numSamples); // smooth fade in and out
      const s = Math.max(-1, Math.min(1, sample * envelope));
      view.setInt16(offset + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    resolve(new Blob([buffer], { type: 'audio/wav' }));
  });
}

/**
 * Extracts pure audio waveform from a video file in browser memory via Web Audio API.
 * This avoids sending full video frames, reducing token usage by >99% and preventing 250k input token quota errors!
 */
export async function extractAudioFromVideo(file: File): Promise<Blob | null> {
  try {
    // Only slice first 15MB to avoid memory pressure
    const slice = file.slice(0, 15 * 1024 * 1024);
    const arrayBuffer = await slice.arrayBuffer();

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Limit to max 35 seconds of speech audio to stay well below token limits
    const sampleRate = 16000;
    const maxDuration = Math.min(35, audioBuffer.duration);
    const numSamples = Math.floor(sampleRate * maxDuration);

    const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    const rendered = await offlineCtx.startRendering();

    const channelData = rendered.getChannelData(0);
    const wavBuffer = new ArrayBuffer(44 + channelData.length * 2);
    const view = new DataView(wavBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + channelData.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, channelData.length * 2, true);

    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  } catch (err) {
    console.warn('Web Audio decoding bypassed for this container/codec:', err);
    return null;
  }
}

