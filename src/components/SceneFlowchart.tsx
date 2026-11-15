import { useEffect, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Film,
  GitBranch,
  List,
  Mic,
  Volume2,
} from "lucide-react";
import type { SceneItem } from "../types.ts";
import { CopyButton } from "./CopyButton.tsx";

interface SceneFlowchartProps {
  formatLabel: string;
  scenes: SceneItem[];
  initialSceneNumber?: number;
  onOpenAudio?: (sceneNumber: number) => void;
}

type SceneViewMode = "tree" | "list";

function formatTotalRuntime(scenes: SceneItem[]): string {
  const total = scenes.reduce((acc, s) => acc + (Number(s.durationSeconds) || 0), 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function SceneFlowchart({
  formatLabel,
  scenes,
  initialSceneNumber,
  onOpenAudio,
}: SceneFlowchartProps) {
  const [viewMode, setViewMode] = useState<SceneViewMode>("tree");
  const [selectedSceneNum, setSelectedSceneNum] = useState<number>(
    initialSceneNumber ?? scenes[0]?.sceneNumber ?? 1
  );
  const [showAllScenes, setShowAllScenes] = useState<boolean>(false);
  const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (initialSceneNumber) {
      setSelectedSceneNum(initialSceneNumber);
    }
  }, [initialSceneNumber]);

  const activeIndex = Math.max(
    0,
    scenes.findIndex((s) => s.sceneNumber === selectedSceneNum)
  );
  const activeScene = scenes[activeIndex] || scenes[0];

  const displayedScenes =
    viewMode === "list" || showAllScenes
      ? scenes
      : activeScene
      ? [activeScene]
      : scenes;

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {viewMode === "tree" && (
            <>
              <div className="inline-flex items-center rounded-xl border border-zinc-200/80 dark:border-white/12 bg-white dark:bg-[#111114] overflow-hidden">
                <button
                  type="button"
                  disabled={activeIndex <= 0}
                  onClick={() =>
                    setSelectedSceneNum(scenes[activeIndex - 1].sceneNumber)
                  }
                  aria-label="Previous scene"
                  className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.06] disabled:opacity-35 cursor-pointer border-r border-zinc-200/80 dark:border-white/10"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={activeIndex >= scenes.length - 1}
                  onClick={() =>
                    setSelectedSceneNum(scenes[activeIndex + 1].sceneNumber)
                  }
                  aria-label="Next scene"
                  className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.06] disabled:opacity-35 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAllScenes((v) => !v)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200/80 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {showAllScenes ? "Focused" : "All"}
              </button>
            </>
          )}

          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {formatTotalRuntime(scenes)} · {formatLabel}
          </span>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#111114] border border-zinc-200/70 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === "tree"
                ? "bg-white dark:bg-white/[0.08] text-zinc-900 dark:text-white border border-zinc-200/60 dark:border-white/10 shadow-2xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent"
            }`}
          >
            <GitBranch
              className={`w-3.5 h-3.5 ${
                viewMode === "tree" ? "text-[#FF006E]" : ""
              }`}
            />
            <span>Flow</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === "list"
                ? "bg-white dark:bg-white/[0.08] text-zinc-900 dark:text-white border border-zinc-200/60 dark:border-white/10 shadow-2xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent"
            }`}
          >
            <List
              className={`w-3.5 h-3.5 ${
                viewMode === "list" ? "text-[#FF006E]" : ""
              }`}
            />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scene Pipeline */}
      {viewMode === "tree" && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-1.5 overflow-x-auto pb-1">
          {scenes.map((scene, index) => {
            const isSelected = scene.sceneNumber === activeScene?.sceneNumber;
            return (
              <div
                key={scene.sceneNumber}
                className="flex-1 min-w-[144px] flex flex-col lg:flex-row items-center gap-1.5"
              >
                <button
                  type="button"
                  onClick={() => setSelectedSceneNum(scene.sceneNumber)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors cursor-pointer ${
                    isSelected
                      ? "border-[#FF006E]/75 bg-white dark:bg-[#17171C]"
                      : "border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#111114] hover:border-zinc-300 dark:hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                    <span
                      className={`font-semibold ${
                        isSelected
                          ? "text-[#FF006E]"
                          : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      {String(scene.sceneNumber).padStart(2, "0")}
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500">
                      {scene.durationSeconds}s
                    </span>
                  </div>
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mt-1 truncate">
                    {scene.title}
                  </p>
                </button>

                {index < scenes.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-white/20 rotate-90 lg:rotate-0 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Scene Script & Visual Shot Inspector */}
      <div className="space-y-4">
        {displayedScenes.map((scene) => {
          const isExpanded = Boolean(expandedPrompts[scene.sceneNumber]);
          return (
            <div
              key={scene.sceneNumber}
              className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200/70 dark:border-white/[0.08]">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-xs font-semibold text-[#FF006E] tabular-nums">
                    {String(scene.sceneNumber).padStart(2, "0")}
                  </span>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {scene.title}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  <span>{scene.timestamp}</span>
                  <span aria-hidden="true">·</span>
                  <span>{scene.durationSeconds}s</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-[#FF006E]/80" />
                    <span>{scene.cameraMovement}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="rounded-xl border border-zinc-200/70 dark:border-white/10 bg-zinc-50/60 dark:bg-white/[0.025] p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      <Mic className="w-3.5 h-3.5 text-[#FF006E]" />
                      <span>Script</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {onOpenAudio && (
                        <button
                          type="button"
                          onClick={() => onOpenAudio(scene.sceneNumber)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FF006E] hover:underline cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Audio</span>
                        </button>
                      )}
                      <CopyButton text={scene.narration} label="Copy" />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {scene.narration}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200/70 dark:border-white/10 bg-zinc-50/40 dark:bg-white/[0.02] p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      <Film className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Visual Shot</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPrompts((prev) => ({
                            ...prev,
                            [scene.sceneNumber]: !prev[scene.sceneNumber],
                          }))
                        }
                        className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        {isExpanded ? "Less" : "Full"}
                      </button>
                      <CopyButton text={scene.videoPrompt} label="Copy" />
                    </div>
                  </div>
                  <p
                    className={`text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 ${
                      isExpanded ? "" : "line-clamp-4"
                    }`}
                  >
                    {scene.videoPrompt}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
