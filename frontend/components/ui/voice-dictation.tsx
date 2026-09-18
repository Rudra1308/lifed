"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, Loader2 } from "lucide-react";

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

  const shouldListenRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasTranscribedRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const stopAll = () => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsListening(false);
    if (onListeningChange) onListeningChange(false);
  };

  const startListening = async () => {
    setErrorMsg(null);
    hasTranscribedRef.current = false;
    audioChunksRef.current = [];

    // 1. Acquire microphone stream to verify permissions & warm up hardware
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setErrorMsg("Microphone access denied. Please allow microphone in Windows/browser.");
      return;
    }

    shouldListenRef.current = true;
    setIsListening(true);
    if (onListeningChange) onListeningChange(true);

    // 2. Real-time audio volume visualizer using AudioContext
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (!shouldListenRef.current) return;
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
      // AudioContext optional fallback
    }

    // 3. Start MediaRecorder as fallback/dual recorder
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg")
        ? "audio/ogg"
        : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn("MediaRecorder initialization note:", e);
    }

    // 4. Start Web Speech Recognition with auto-restart on silence
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      initSpeechRecognition(SpeechRecognition);
    }
  };

  const initSpeechRecognition = (SpeechRecognitionClass: any) => {
    if (!shouldListenRef.current) return;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const text = final || interim;
        if (text.trim()) {
          hasTranscribedRef.current = true;
          onTranscript(text.trim());
        }
      };

      recognition.onerror = (event: any) => {
        // "no-speech" means user hasn't spoken yet; DO NOT turn off!
        if (event.error === "no-speech") {
          console.debug("[Voice] Waiting for speech...");
          return;
        }

        if (event.error === "not-allowed") {
          setErrorMsg("Microphone permission denied.");
          stopAll();
          return;
        }

        // In Electron, "network" error occurs when Chromium cannot reach Google cloud speech.
        // We log and let MediaRecorder handle transcription on stop.
        if (event.error === "network") {
          console.info("[Voice] Web Speech cloud offline; using local audio recorder.");
          return;
        }

        console.warn("[Voice] SpeechRecognition error:", event.error);
      };

      recognition.onend = () => {
        // Automatically restart if user is still in listening mode
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // If restart fails, recreate after small pause
            setTimeout(() => {
              if (shouldListenRef.current) {
                initSpeechRecognition(SpeechRecognitionClass);
              }
            }, 300);
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("[Voice] Web Speech start note:", err);
    }
  };

  const stopListening = async () => {
    shouldListenRef.current = false;
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

    // If Web Speech already produced transcripts, we don't need backend transcription
    if (hasTranscribedRef.current) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      return;
    }

    // If no text was produced yet (e.g. Electron offline speech), transcribe recorded audio via backend
    if (mediaRecorderRef.current && audioChunksRef.current.length > 0) {
      setIsProcessing(true);
      try {
        const mimeType = mediaRecorderRef.current.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size > 1000) {
          const formData = new FormData();
          formData.append("file", audioBlob, "dictation.webm");

          const res = await fetch("http://127.0.0.1:8000/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.text && data.text.trim()) {
              onTranscript(data.text.trim());
            } else if (data.status === "no_speech_detected") {
              console.debug("[Voice] No speech was detected in audio clip.");
            }
          }
        }
      } catch (err: any) {
        console.warn("[Voice] Backend transcription fallback error:", err);
      } finally {
        setIsProcessing(false);
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
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
            ? "Processing audio..."
            : isListening
            ? "Listening... click to stop"
            : "Start voice dictation"
        }
        className={`flex items-center justify-center rounded-xl transition-all duration-300 ${
          sizeClasses[buttonSize]
        } ${
          isProcessing
            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse"
            : isListening
            ? "bg-red-500/20 text-red-400 border border-red-500/40 shadow-lg shadow-red-500/20 scale-105"
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

