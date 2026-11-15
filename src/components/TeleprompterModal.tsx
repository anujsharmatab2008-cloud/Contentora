import { useEffect, useRef, useState } from "react";
import {
  Download,
  FlipHorizontal2,
  Mic,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  X,
} from "lucide-react";

export interface PrompterSection {
  sceneNumber: number;
  title: string;
  timestamp?: string;
  narration: string;
}

interface TeleprompterModalProps {
  open: boolean;
  title: string;
  sections: PrompterSection[];
  onClose: () => void;
}

export function TeleprompterModal({
  open,
  title,
  sections,
  onClose,
}: TeleprompterModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [speedWpm, setSpeedWpm] = useState(145);
  const [fontSizePx, setFontSizePx] = useState(40);
  const [mirrored, setMirrored] = useState(false);

  // In-browser voice take recorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef(speedWpm);
  speedRef.current = speedWpm;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const stopMicStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore already-stopped recorder
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
  };

  useEffect(() => {
    if (!open) {
      setIsPlaying(false);
      setCountdown(null);
      stopMicStream();
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        if (countdown !== null) {
          setCountdown(null);
        } else {
          setIsPlaying((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, countdown, onClose]);

  useEffect(() => {
    return () => {
      stopMicStream();
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  useEffect(() => {
    if (!isRecording) return;
    const id = window.setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRecording]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      setIsPlaying(true);
      return;
    }
    const id = window.setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => window.clearTimeout(id);
  }, [countdown]);

  useEffect(() => {
    if (!open || !isPlaying) return;
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const el = scrollRef.current;
      if (el) {
        const pxPerSecond = (speedRef.current / 145) * 46;
        el.scrollTop += pxPerSecond * dt;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
          setIsPlaying(false);
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [open, isPlaying]);

  if (!open) return null;

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (countdown !== null) {
      setCountdown(null);
      return;
    }
    const el = scrollRef.current;
    if (el && el.scrollTop < 12) {
      setCountdown(3);
    } else {
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCountdown(null);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleToggleRecord = async () => {
    setRecordError(null);
    if (isRecording) {
      stopMicStream();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordError("Microphone recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (recordedAudioUrl) {
          URL.revokeObjectURL(recordedAudioUrl);
        }
        setRecordedAudioUrl(URL.createObjectURL(blob));
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        setIsRecording(false);
      };

      setRecordSeconds(0);
      recorder.start();
      setIsRecording(true);
    } catch {
      setRecordError("Microphone access was denied. Allow mic access to record takes.");
    }
  };

  const handleDownloadTake = () => {
    if (!recordedAudioUrl) return;
    const link = document.createElement("a");
    link.href = recordedAudioUrl;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.download = `${slug || "voiceover"}-take.webm`;
    link.click();
  };

  const scrollToScene = (sceneNumber: number) => {
    const target = scrollRef.current?.querySelector(
      `[data-prompter-scene="${sceneNumber}"]`
    ) as HTMLElement | null;
    if (target && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: Math.max(0, target.offsetTop - 90),
        behavior: "smooth",
      });
    }
  };

  const formatTimer = (sec: number) =>
    `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#050507] text-white flex flex-col">
      {/* Top Teleprompter Control Bar */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0B0B0F] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF006E] hover:bg-[#e10062] text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>
              {countdown !== null
                ? `Starting in ${countdown}...`
                : isPlaying
                ? "Pause"
                : "Roll Script"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleToggleRecord()}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
              isRecording
                ? "border-red-500 bg-red-600 text-white"
                : "border-white/15 text-zinc-200 hover:bg-white/10"
            }`}
          >
            {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5 text-[#FF006E]" />}
            <span>{isRecording ? `Stop (${formatTimer(recordSeconds)})` : "Record Take"}</span>
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-xs font-medium text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>

          <span className="hidden xl:inline text-xs text-zinc-400 truncate max-w-[220px]">
            {title}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 whitespace-nowrap">Speed</span>
            <input
              type="range"
              aria-label="Scroll speed WPM"
              min={80}
              max={240}
              step={5}
              value={speedWpm}
              onChange={(e) => setSpeedWpm(Number(e.target.value))}
              className="w-24 accent-[#FF006E] cursor-pointer"
            />
            <span className="tabular-nums font-mono text-zinc-200 w-16">
              {speedWpm} wpm
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Decrease font size"
              onClick={() => setFontSizePx((s) => Math.max(24, s - 4))}
              className="p-1.5 rounded-lg border border-white/15 text-zinc-300 hover:bg-white/10 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="tabular-nums font-mono text-zinc-200 w-10 text-center">
              {fontSizePx}px
            </span>
            <button
              type="button"
              aria-label="Increase font size"
              onClick={() => setFontSizePx((s) => Math.min(64, s + 4))}
              className="p-1.5 rounded-lg border border-white/15 text-zinc-300 hover:bg-white/10 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMirrored((m) => !m)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mirrored
                ? "border-[#FF006E] bg-[#FF006E]/20 text-white"
                : "border-white/15 text-zinc-300 hover:bg-white/10"
            }`}
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
            <span>Mirror</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close teleprompter"
            className="p-1.5 rounded-lg border border-white/15 text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recorded Voice Take Strip / Error */}
      {(recordedAudioUrl || recordError) && (
        <div className="shrink-0 px-4 sm:px-6 py-2 border-b border-white/10 bg-[#101016] flex flex-wrap items-center justify-between gap-3 text-xs">
          {recordError ? (
            <span className="text-red-400">{recordError}</span>
          ) : (
            recordedAudioUrl && (
              <>
                <span className="font-medium text-zinc-200 whitespace-nowrap">
                  Recorded Take
                </span>
                <audio controls src={recordedAudioUrl} className="h-8 flex-1 min-w-[200px]" />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTake}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-900 font-semibold hover:bg-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Take</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(recordedAudioUrl);
                      setRecordedAudioUrl(null);
                    }}
                    aria-label="Discard take"
                    className="p-1.5 rounded-lg border border-white/15 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* Scene Quick Jump Strip */}
      {sections.length > 1 && (
        <div className="shrink-0 px-4 sm:px-6 py-2 border-b border-white/10 bg-[#08080B] flex items-center gap-1.5 overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.sceneNumber}
              type="button"
              onClick={() => scrollToScene(s.sceneNumber)}
              className="px-2.5 py-1 rounded-md border border-white/10 bg-white/[0.03] hover:border-[#FF006E]/60 text-[11px] text-zinc-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap tabular-nums"
            >
              {String(s.sceneNumber).padStart(2, "0")} · {s.title}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-zinc-500 whitespace-nowrap pl-4">
            Spacebar to Play / Pause · Esc to exit
          </span>
        </div>
      )}

      {/* Reading Viewport with Subtle Eye-Line Guide */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[26%] h-px bg-[#FF006E]/45 z-10"
        />
        {countdown !== null && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65">
            <span className="text-7xl font-bold font-display text-[#FF006E] tabular-nums">
              {countdown}
            </span>
          </div>
        )}

        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-6 sm:px-14 py-[22vh]"
        >
          <div
            className={`max-w-4xl mx-auto space-y-12 ${
              mirrored ? "-scale-x-100" : ""
            }`}
          >
            {sections.map((sec) => (
              <div
                key={sec.sceneNumber}
                data-prompter-scene={sec.sceneNumber}
                className="space-y-3"
              >
                <p className="text-xs font-mono uppercase tracking-wider text-[#FF006E] tabular-nums">
                  Scene {String(sec.sceneNumber).padStart(2, "0")} · {sec.title}
                  {sec.timestamp ? ` · ${sec.timestamp}` : ""}
                </p>
                <p
                  style={{ fontSize: `${fontSizePx}px`, lineHeight: 1.42 }}
                  className="font-semibold text-zinc-100 tracking-tight"
                >
                  {sec.narration}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
