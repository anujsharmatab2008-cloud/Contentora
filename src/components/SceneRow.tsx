import { useState } from "react";
import { Download, Film, Loader2, Mic, Music, Volume2 } from "lucide-react";
import type { SceneAudioState, SceneItem, TtsModelId, VoiceName } from "../types.ts";
import { CopyButton } from "./CopyButton.tsx";

interface SceneRowProps {
  scene: SceneItem;
  audioState?: SceneAudioState;
  selectedVoice: VoiceName;
  selectedTtsModel: TtsModelId;
  onGenerateAudio: (scene: SceneItem) => void;
}

export function SceneRow({
  scene,
  audioState,
  selectedVoice,
  selectedTtsModel,
  onGenerateAudio,
}: SceneRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleDownloadAudio = () => {
    if (!audioState?.audioUrl) return;
    const link = document.createElement("a");
    link.href = audioState.audioUrl;
    link.download = `scene-${String(scene.sceneNumber).padStart(2, "0")}-voiceover.wav`;
    link.click();
  };

  return (
    <article className="py-5 border-b border-zinc-200/80 dark:border-zinc-800/80 last:border-b-0 space-y-3.5">
      {/* Scene Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
            {String(scene.sceneNumber).padStart(2, "0")}
          </span>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {scene.title}
          </h4>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
          <span>{scene.timestamp}</span>
          <span aria-hidden="true">·</span>
          <span>{scene.durationSeconds}s</span>
          <span aria-hidden="true">·</span>
          <span>{scene.cameraMovement}</span>
        </div>
      </div>

      {/* Voiceover + TTS Audio */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#111114] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <Mic className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Voiceover</span>
            <span className="text-zinc-400 dark:text-zinc-500">· {scene.voiceStyle}</span>
          </div>

          <div className="flex items-center gap-2">
            <CopyButton text={scene.narration} label="Copy" />
            <button
              type="button"
              onClick={() => onGenerateAudio(scene)}
              disabled={audioState?.loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
            >
              {audioState?.loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>
                    {audioState?.audioUrl
                      ? "Regenerate"
                      : `Voice (${selectedVoice})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          {scene.narration}
        </p>

        {audioState?.error && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {audioState.error}
          </p>
        )}

        {audioState?.audioUrl && (
          <div className="pt-2.5 flex flex-wrap items-center gap-3 border-t border-zinc-200/70 dark:border-zinc-800">
            <audio
              controls
              src={audioState.audioUrl}
              className="h-8 flex-1 min-w-[220px]"
            />
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {audioState.voiceName || selectedVoice} · {audioState.modelUsed || selectedTtsModel}
              </span>
              <button
                type="button"
                onClick={handleDownloadAudio}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>WAV</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sound & Video Prompts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#111114] p-3.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <Music className="w-3.5 h-3.5 text-zinc-400" />
              <span>Sound & Music</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                {expanded ? "Less" : "More"}
              </button>
              <CopyButton text={scene.audioPrompt} label="Copy" />
            </div>
          </div>
          <p className={`text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 ${expanded ? "" : "line-clamp-2"}`}>
            {scene.audioPrompt}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#111114] p-3.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <Film className="w-3.5 h-3.5 text-zinc-400" />
              <span>Video Shot</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                {expanded ? "Less" : "More"}
              </button>
              <CopyButton text={scene.videoPrompt} label="Copy" />
            </div>
          </div>
          <p className={`text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 ${expanded ? "" : "line-clamp-2"}`}>
            {scene.videoPrompt}
          </p>
        </div>
      </div>
    </article>
  );
}
