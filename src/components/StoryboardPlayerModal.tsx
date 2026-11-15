import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Film,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { SceneAudioState, SceneItem } from "../types.ts";

interface StoryboardPlayerModalProps {
  open: boolean;
  title: string;
  scenes: SceneItem[];
  audioByScene?: Record<number, SceneAudioState>;
  thumbnailUrl?: string;
  isVertical?: boolean;
  onClose: () => void;
}

export function StoryboardPlayerModal({
  open,
  title,
  scenes,
  audioByScene,
  thumbnailUrl,
  isVertical = false,
  onClose,
}: StoryboardPlayerModalProps) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedInScene, setElapsedInScene] = useState(0);
  const [speechFallback, setSpeechFallback] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentScene = scenes[sceneIndex] || scenes[0];
  const sceneDuration = Math.max(3, Number(currentScene?.durationSeconds) || 8);
  const currentAudioUrl = currentScene
    ? audioByScene?.[currentScene.sceneNumber]?.audioUrl
    : undefined;

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    if (!open) {
      setIsPlaying(false);
      setElapsedInScene(0);
      setSceneIndex(0);
      stopAllAudio();
    }
    return () => {
      stopAllAudio();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === "ArrowRight") {
        setElapsedInScene(0);
        setSceneIndex((i) => Math.min(scenes.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        setElapsedInScene(0);
        setSceneIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, scenes.length, onClose]);

  // Play generated WAV audio or browser SpeechSynthesis preview when playing a scene
  useEffect(() => {
    stopAllAudio();
    if (!open || !isPlaying || !currentScene) return;

    if (currentAudioUrl && audioRef.current) {
      audioRef.current.src = currentAudioUrl;
      audioRef.current.play().catch(() => {
        // Autoplay restriction fallback
      });
    } else if (
      speechFallback &&
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      currentScene.narration
    ) {
      const utter = new SpeechSynthesisUtterance(currentScene.narration);
      utter.rate = 1.04;
      window.speechSynthesis.speak(utter);
    }

    return () => {
      stopAllAudio();
    };
  }, [open, isPlaying, sceneIndex, currentAudioUrl, speechFallback, currentScene]);

  // Advance timer tick while playing
  useEffect(() => {
    if (!open || !isPlaying || !currentScene) return;
    const interval = window.setInterval(() => {
      setElapsedInScene((prev) => {
        const next = prev + 0.1;
        if (next >= sceneDuration) {
          if (sceneIndex < scenes.length - 1) {
            setSceneIndex((idx) => idx + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return sceneDuration;
          }
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [open, isPlaying, sceneIndex, sceneDuration, scenes.length, currentScene]);

  const totalRuntime = useMemo(
    () => scenes.reduce((sum, s) => sum + Math.max(3, Number(s.durationSeconds) || 8), 0),
    [scenes]
  );

  const totalElapsed = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < sceneIndex; i++) {
      sum += Math.max(3, Number(scenes[i]?.durationSeconds) || 8);
    }
    return Math.min(totalRuntime, sum + elapsedInScene);
  }, [scenes, sceneIndex, elapsedInScene, totalRuntime]);

  if (!open || !currentScene) return null;

  const progressPct = totalRuntime > 0 ? (totalElapsed / totalRuntime) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#050507] text-white flex flex-col">
      <audio ref={audioRef} className="hidden" />

      {/* Top Bar */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0B0B0F] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Film className="w-4 h-4 text-[#FF006E] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold truncate font-display">
              Storyboard Preview · {title}
            </h2>
            <p className="text-[11px] text-zinc-400 tabular-nums">
              Scene {sceneIndex + 1} of {scenes.length} ·{" "}
              {Math.floor(totalElapsed)}s / {totalRuntime}s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSpeechFallback((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            {speechFallback ? (
              <Volume2 className="w-3.5 h-3.5 text-[#FF006E]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span>{currentAudioUrl ? "WAV Audio" : speechFallback ? "Voice Preview On" : "Muted"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close storyboard player"
            className="p-1.5 rounded-lg border border-white/15 text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Animatic Frame */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div
          className={`relative rounded-2xl border border-white/15 bg-[#0E0E14] shadow-2xl overflow-hidden flex flex-col justify-between ${
            isVertical
              ? "w-full max-w-[380px] aspect-[9/16]"
              : "w-full max-w-4xl aspect-video"
          }`}
        >
          {/* Ambient Visual Stage */}
          {thumbnailUrl && sceneIndex === 0 && (
            <img
              src={thumbnailUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-20 scale-105 pointer-events-none"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,0,110,0.2),rgba(9,9,13,0.92)_68%)] pointer-events-none"
          />

          {/* Top Scene Metadata */}
          <div className="relative z-10 p-5 sm:p-7 flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-mono text-[#FF006E] tabular-nums">
                <span>SCENE {String(currentScene.sceneNumber).padStart(2, "0")}</span>
                <span>·</span>
                <span>{currentScene.timestamp}</span>
                <span>·</span>
                <span>{sceneDuration}s</span>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white font-display">
                {currentScene.title}
              </h3>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/55 border border-white/12 text-[11px] text-zinc-200">
              <Camera className="w-3.5 h-3.5 text-[#FF006E]" />
              <span>{currentScene.cameraMovement}</span>
            </span>
          </div>

          {/* Center Visual Shot Prompt */}
          <div className="relative z-10 px-5 sm:px-10 text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-2">
              Visual Direction
            </p>
            <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
              {currentScene.videoPrompt}
            </p>
          </div>

          {/* Bottom Burned-In Subtitle Overlay */}
          <div className="relative z-10 p-5 sm:p-7 bg-gradient-to-t from-black/95 via-black/75 to-transparent">
            <div className="max-w-3xl mx-auto text-center space-y-2">
              <div className="inline-block px-4 py-2 rounded-xl bg-black/75 border border-white/10">
                <p className="text-sm sm:text-lg font-semibold text-white leading-snug">
                  {currentScene.narration}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Transport & Scene Timeline */}
      <div className="shrink-0 px-4 sm:px-6 py-3.5 border-t border-white/10 bg-[#0B0B0F] space-y-3">
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-[#FF006E] transition-all duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setElapsedInScene(0);
                setSceneIndex((i) => Math.max(0, i - 1));
              }}
              disabled={sceneIndex <= 0}
              aria-label="Previous scene"
              className="p-2 rounded-lg border border-white/15 text-zinc-200 hover:bg-white/10 disabled:opacity-35 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isPlaying && sceneIndex === scenes.length - 1 && elapsedInScene >= sceneDuration) {
                  setSceneIndex(0);
                  setElapsedInScene(0);
                }
                setIsPlaying((v) => !v);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF006E] hover:bg-[#e10062] text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "Pause" : "Play Storyboard"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setElapsedInScene(0);
                setSceneIndex((i) => Math.min(scenes.length - 1, i + 1));
              }}
              disabled={sceneIndex >= scenes.length - 1}
              aria-label="Next scene"
              className="p-2 rounded-lg border border-white/15 text-zinc-200 hover:bg-white/10 disabled:opacity-35 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setSceneIndex(0);
                setElapsedInScene(0);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-xs font-medium text-zinc-300 hover:bg-white/10 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            {scenes.map((s, idx) => (
              <button
                key={s.sceneNumber}
                type="button"
                onClick={() => {
                  setSceneIndex(idx);
                  setElapsedInScene(0);
                }}
                className={`px-2.5 py-1 rounded-md border text-[11px] font-medium whitespace-nowrap cursor-pointer tabular-nums transition-colors ${
                  idx === sceneIndex
                    ? "border-[#FF006E] bg-[#FF006E]/20 text-white"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
                }`}
              >
                {String(s.sceneNumber).padStart(2, "0")} · {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
