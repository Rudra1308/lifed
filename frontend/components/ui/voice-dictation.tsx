"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, AlertCircle, Loader2 } from "lucide-react";

interface VoiceDictationProps {
  onTranscript: (transcript: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  className?: string;
  buttonSize?: "sm" | "md" | "lg";
}

export function VoiceDictation({
  onTranscript,
  onListeningChange,
  className = "",
  buttonSize = "md",
}: VoiceDictationProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const speechRecognizedRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, []);

  const stopMedia = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);
  };

  const startListening = async () => {
    setErrorMsg(null);
    speechRecognizedRef.current = false;
    audioChunksRef.current = [];

    // 1. Acquire microphone access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      console.error("[Voice] Microphone access error:", err);
      setErrorMsg("Microphone not available or access denied.");
      return;
    }

    setIsListening(true);
    if (onListeningChange) onListeningChange(true);

    // 2. Real-time Volume Visualizer
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      }
    } catch (e) {
      // AudioContext optional
    }

    // 3. Initialize MediaRecorder (Guaranteed to record voice without cutting off)
    try {
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
      ];
      let selectedMime = "";
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn("[Voice] MediaRecorder init error:", e);
    }

    // 4. In standard Chrome/Edge browser (non-Electron), optionally run SpeechRecognition in parallel
    const isElectron = typeof window !== "undefined" && Boolean((window as any).electronAPI?.isDesktop);
    if (!isElectron) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = "en-US";

          rec.onresult = (event: any) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript.trim()) {
              speechRecognizedRef.current = true;
              onTranscript(transcript.trim());
            }
          };

          // NEVER call stop or cancel on speech errors! MediaRecorder is recording.
          rec.onerror = (e: any) => {
            console.debug("[Voice] Browser speech recognition event:", e.error);
          };

          rec.onend = () => {
            // Keep alive if still listening in browser
            if (mediaStreamRef.current && mediaStreamRef.current.active) {
              try {
                rec.start();
              } catch (e) {}
            }
          };

          rec.start();
          recognitionRef.current = rec;
        } catch (e) {
          console.debug("[Voice] Browser speech API start note:", e);
        }
      }
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    if (onListeningChange) onListeningChange(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // If browser Web Speech already delivered transcripts in live mode, stop here
    if (speechRecognizedRef.current) {
      stopMedia();
      return;
    }

    // Stop recorder and collect final audio chunks
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setIsProcessing(true);
      const recorder = mediaRecorderRef.current;

      recorder.onstop = async () => {
        try {
          const mimeType = recorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          if (audioBlob.size > 200) {
            const formData = new FormData();
            formData.append("file", audioBlob, "recording.webm");

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
            const res = await fetch(`${apiUrl}/api/voice/transcribe`, {
              method: "POST",
              body: formData,
            });

            if (res.ok) {
              const data = await res.json();
              if (data.text && data.text.trim()) {
                onTranscript(data.text.trim());
              }
            }
          }
        } catch (err: any) {
          console.error("[Voice] Transcription error:", err);
          setErrorMsg("Transcription failed. Please check backend connection.");
        } finally {
          setIsProcessing(false);
          stopMedia();
        }
      };

      try {
        recorder.stop();
      } catch (e) {
        setIsProcessing(false);
        stopMedia();
      }
    } else {
      stopMedia();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        disabled={isProcessing}
        title={
          isProcessing
            ? "Transcribing audio..."
            : isListening
            ? "Recording... click to finish"
            : "Click to speak"
        }
        className={`flex items-center justify-center rounded-xl transition-all duration-300 ${
          sizeClasses[buttonSize]
        } ${
          isProcessing
            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse cursor-wait"
            : isListening
            ? "bg-red-500/20 text-red-400 border border-red-500/40 shadow-lg shadow-red-500/25 scale-105"
            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
        }`}
      >
        {isProcessing ? (
          <Loader2 size={iconSizes[buttonSize]} className="animate-spin" />
        ) : isListening ? (
          <div className="flex items-center gap-0.5 px-1">
            <span
              className="w-1 bg-red-400 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(6, Math.min(22, 6 + (audioLevel / 100) * 16))}px` }}
            />
            <span
              className="w-1 bg-red-400 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(8, Math.min(24, 8 + (audioLevel / 100) * 18))}px` }}
            />
            <span
              className="w-1 bg-red-400 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(6, Math.min(20, 6 + (audioLevel / 100) * 14))}px` }}
            />
          </div>
        ) : (
          <Mic size={iconSizes[buttonSize]} />
        )}
      </button>

      {errorMsg && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-destructive/90 text-destructive-foreground text-[11px] px-2.5 py-1 rounded shadow-lg whitespace-nowrap flex items-center gap-1 z-50">
          <AlertCircle size={12} />
          {errorMsg}
        </div>
      )}
    </div>
  );
}


