import { useEffect, useState } from "react";
import { Check, Cog, Settings } from "lucide-react";

interface KitBuildingProgressProps {
  topic?: string;
  formatLabel?: string;
  sceneCount?: number;
}

interface BuildStage {
  id: string;
  label: string;
  detail: string;
  thresholdSec: number;
}

const BUILD_STAGES: BuildStage[] = [
  {
    id: "analyze",
    label: "Analyzing prompt & target audience",
    detail: "Mapping format pacing, retention structure, and creator tone",
    thresholdSec: 0,
  },
  {
    id: "thumbnail",
    label: "Designing 1280×720 thumbnail concept",
    detail: "Composing focal artwork, contrast typography, and AI image prompt",
    thresholdSec: 2.2,
  },
  {
    id: "packaging",
    label: "Generating high-CTR titles & 5s hooks",
    detail: "Crafting primary headline, title angles, and spoken cold-open hooks",
    thresholdSec: 4.8,
  },
  {
    id: "scenes",
    label: "Writing timed storyboard & video prompts",
    detail: "Building scene-by-scene narration, camera movement, and visual cues",
    thresholdSec: 7.8,
  },
  {
    id: "seo",
    label: "Finalizing voiceover, SEO & export pack",
    detail: "Preparing narrator script, keyword tags, .SRT captions, and .ZIP kit",
    thresholdSec: 11.2,
  },
];

export function KitBuildingProgress({
  topic,
  formatLabel,
  sceneCount,
}: KitBuildingProgressProps) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSec((Date.now() - start) / 1000);
    }, 120);
    return () => window.clearInterval(timer);
  }, []);

  let activeIndex = 0;
  for (let i = 0; i < BUILD_STAGES.length; i++) {
    if (elapsedSec >= BUILD_STAGES[i].thresholdSec) {
      activeIndex = i;
    }
  }

  // Smoothly approaches 94% while the request completes
  const progressPct = Math.min(
    94,
    Math.max(8, Math.round(94 * (1 - Math.exp(-elapsedSec / 6.5))))
  );
  const activeStage = BUILD_STAGES[activeIndex];

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111114] overflow-hidden shadow-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
        {/* Left Side: Anime Creator Mascot */}
        <div className="md:col-span-4 relative flex items-end justify-center bg-gradient-to-b from-stone-100/90 to-stone-200/50 dark:from-[#16151D] dark:to-[#0C0B10] border-b md:border-b-0 md:border-r border-zinc-200 dark:border-white/[0.08] px-4 pt-5 min-h-[190px] md:min-h-[280px] overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-x-8 bottom-4 top-8 rounded-full bg-[#FF006E]/20 blur-2xl pointer-events-none"
          />
          <img
            src="/assets/aistudio/anime-boy-full_852c18f5.png"
            alt="Contentora studio character"
            referrerPolicy="no-referrer"
            className="relative h-44 md:h-64 w-auto object-contain object-bottom select-none drop-shadow-[0_0_24px_rgba(255,0,110,0.28)]"
          />
        </div>

        {/* Right Side: Claude-style Gear Progress Pipeline */}
        <div className="md:col-span-8 p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            {/* Header with rotating gears & elapsed clock */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="relative w-10 h-10 rounded-xl bg-[#FF006E]/10 border border-[#FF006E]/25 flex items-center justify-center shrink-0">
                  <Cog className="w-5 h-5 text-[#FF006E] animate-spin" />
                  <Settings
                    className="w-3 h-3 text-[#FF006E]/80 absolute -bottom-0.5 -right-0.5 animate-spin"
                    style={{ animationDirection: "reverse", animationDuration: "3s" }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white tracking-tight">
                      Building Video Kit
                    </h3>
                    <span className="text-xs font-semibold text-[#FF006E] tabular-nums">
                      {progressPct}%
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {topic ? `"${topic}"` : "Preparing your complete production package"}
                    {formatLabel ? ` · ${formatLabel}` : ""}
                    {sceneCount ? ` · ${sceneCount} scenes` : ""}
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0 pt-0.5">
                {elapsedSec.toFixed(1)}s
              </span>
            </div>

            {/* Smooth Progress Track */}
            <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-[#FF006E] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Step-by-step live stage pipeline */}
            <div className="space-y-2 pt-1">
              {BUILD_STAGES.map((stage, idx) => {
                const isDone = idx < activeIndex;
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={stage.id}
                    className={`flex items-start gap-3 px-3 py-2 rounded-xl border transition-colors ${
                      isActive
                        ? "border-[#FF006E]/35 bg-[#FF006E]/[0.05] dark:bg-[#FF006E]/[0.07]"
                        : isDone
                        ? "border-transparent bg-zinc-50/70 dark:bg-white/[0.02]"
                        : "border-transparent opacity-55"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </span>
                      ) : isActive ? (
                        <Cog className="w-4 h-4 text-[#FF006E] animate-spin" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-zinc-300 dark:border-white/20 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold leading-snug ${
                          isActive
                            ? "text-zinc-900 dark:text-white"
                            : isDone
                            ? "text-zinc-700 dark:text-zinc-300"
                            : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {stage.label}
                      </p>
                      {isActive && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                          {stage.detail}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Step {activeIndex + 1} of {BUILD_STAGES.length} · {activeStage.label}
          </p>
        </div>
      </div>
    </div>
  );
}
