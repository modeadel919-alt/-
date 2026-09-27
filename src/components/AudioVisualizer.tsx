import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isRecording: boolean;
  audioStream: MediaStream | null;
  audioElement?: HTMLAudioElement | null;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isRecording,
  audioStream,
  audioElement,
  height = 96,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;

    if (!isRecording && !audioStream && !audioElement) {
      // Draw resting state idle waveform
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      const centerY = height / 2;
      ctx.moveTo(0, centerY);

      const numPoints = 64;
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const y = centerY + Math.sin(i * 0.2) * 2;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      if (audioStream) {
        const source = audioCtx.createMediaStreamSource(audioStream);
        source.connect(analyser);
        sourceNodeRef.current = source;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameId.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 1.6;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * (height - 16);

          // Dynamic gradient from cyan to violet
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, '#06b6d4'); // cyan
          gradient.addColorStop(0.5, '#6366f1'); // indigo
          gradient.addColorStop(1, '#ec4899'); // pink

          ctx.fillStyle = gradient;
          // Centered mirrored rounded bars
          const topY = (height - barHeight) / 2;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, topY, Math.max(2, barWidth - 2), Math.max(4, barHeight), 2);
          } else {
            ctx.rect(x, topY, Math.max(2, barWidth - 2), Math.max(4, barHeight));
          }
          ctx.fill();

          x += barWidth + 1.5;
        }
      };

      draw();
    } catch (e) {
      console.warn('AudioContext visualization initialization warning:', e);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isRecording, audioStream, audioElement, height]);

  return (
    <div className="w-full relative flex items-center justify-center overflow-hidden rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
      <canvas
        ref={canvasRef}
        style={{ height: `${height}px` }}
        className="w-full block"
      />
      {isRecording && (
        <div className="absolute top-2.5 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] font-mono text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          LIVE MIC
        </div>
      )}
    </div>
  );
};
