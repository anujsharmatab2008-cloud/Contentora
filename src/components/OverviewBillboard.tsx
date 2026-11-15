import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  MonitorPlay,
  Package,
  Pause,
  Play,
  Volume2,
} from "lucide-react";
import type { SectionTab, VideoKit } from "../types.ts";
import { CopyButton } from "./CopyButton.tsx";
import { buildChaptersText, evaluatePublishReadiness } from "../utils/creatorExports.ts";

interface OverviewBillboardProps {
  kit: VideoKit;
  previewThumbnailUrl: string;
  channelName?: string;
  channelLogo?: string;
  totalDuration: number;
  formatName: string;
  onSelectTab?: (tab: SectionTab) => void;
  onOpenStoryboard: () => void;
  onOpenTeleprompter: () => void;
  onDownloadThumbnail: () => void;
  onDownloadZip: () => void;
  zipExporting: boolean;
  onOpenSceneInFlow: (sceneNumber: number) => void;
  onOpenSceneAudio: (sceneNumber: number) => void;
}

function formatRuntime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function OverviewBillboard({
  kit,
  previewThumbnailUrl,
  channelName,
  channelLogo,
  totalDuration,
  formatName,
  onSelectTab,
  onOpenStoryboard,
  onOpenTeleprompter,
  onDownloadThumbnail,
  onDownloadZip,
  zipExporting,
  onOpenSceneInFlow,
  onOpenSceneAudio,
}: OverviewBillboardProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const isVertical = kit.format === "shorts-9-16";
  const readinessChecks = evaluatePublishReadiness(kit);
  const readinessPassed = readinessChecks.filter((c) => c.status === "pass").length;

  useEffect(() => {
    setSlideIndex(0);
    setActiveSceneIdx(0);
    setImgError(false);
  }, [kit]);

  useEffect(() => {
    setLogoError(false);
  }, [channelLogo]);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % 4);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [autoPlay]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") {
        setAutoPlay(false);
        setSlideIndex((prev) => (prev + 3) % 4);
      } else if (e.key === "ArrowRight") {
        setAutoPlay(false);
        setSlideIndex((prev) => (prev + 1) % 4);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const slides = [
    {
      id: "packaging",
      num: "01",
      title: "Packaging & Hook",
      subtitle: "Thumbnail & Primary Title",
    },
    {
      id: "storyboard",
      num: "02",
      title: "Scene Storyboard",
      subtitle: `${kit.scenes.length} timed scenes · ${formatRuntime(totalDuration)}`,
    },
    {
      id: "script",
      num: "03",
      title: "Description & Chapters",
      subtitle: "Copy-ready upload text",
    },
    {
      id: "launch",
      num: "04",
      title: "SEO & Launch",
      subtitle: `${readinessPassed}/${readinessChecks.length} checks ready`,
    },
  ] as const;

  const activeSlide = slides[slideIndex] || slides[0];
  const featuredScene = kit.scenes[activeSceneIdx] || kit.scenes[0];
  const leadHook = kit.hookVariations?.[0];

  const handlePrev = () => {
    setAutoPlay(false);
    setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setAutoPlay(false);
    setSlideIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <section
      aria-label="Project Overview Billboard"
      className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.1] bg-white dark:bg-[#111114] shadow-lg overflow-hidden"
    >
      {/* Top Billboard Control Strip */}
      <div className="px-5 py-3 border-b border-zinc-200/75 dark:border-white/[0.08] bg-zinc-50/75 dark:bg-[#0E0E12] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0 text-xs">
          <span className="font-semibold text-[#FF006E] tabular-nums">
            {activeSlide.num} / 04
          </span>
          <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
            ·
          </span>
          <span className="font-semibold text-zinc-900 dark:text-white truncate font-display">
            {activeSlide.title}
          </span>
          <span className="hidden sm:inline text-zinc-400 dark:text-zinc-500 truncate">
            — {activeSlide.subtitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setAutoPlay((v) => !v)}
            aria-label={autoPlay ? "Pause slideshow" : "Auto-play slideshow"}
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
              autoPlay
                ? "border-[#FF006E] bg-[#FF006E]/10 text-[#FF006E]"
                : "border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/25"
            }`}
          >
            {autoPlay ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span>{autoPlay ? "Playing" : "Auto"}</span>
          </button>

          <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] overflow-hidden">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous slide"
              className="h-7 w-7 inline-flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.08] border-r border-zinc-200 dark:border-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next slide"
              className="h-7 w-7 inline-flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Billboard Stage */}
      <div className="min-h-[410px] flex flex-col justify-center">
        {/* SLIDE 01: PACKAGING & HOOK */}
        {slideIndex === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[410px]">
            {/* Visual Media Column */}
            <div
              className={`${
                isVertical ? "lg:col-span-5" : "lg:col-span-6"
              } relative bg-zinc-950 flex items-center justify-center overflow-hidden p-4 sm:p-6`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,110,0.18),transparent_70%)]"
              />
              <div
                className={`relative group overflow-hidden rounded-xl border border-white/15 bg-zinc-900 shadow-2xl ${
                  isVertical ? "w-[215px] aspect-[9/16]" : "w-full aspect-video"
                }`}
              >
                {previewThumbnailUrl && !imgError ? (
                  <img
                    src={previewThumbnailUrl}
                    alt={kit.primaryTitle}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover block"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-zinc-900 to-zinc-800 text-zinc-200">
                    <ImageIcon className="w-8 h-8 mb-2 text-zinc-400" />
                    <p className="text-sm font-semibold">{kit.thumbnail.headline}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onOpenStoryboard}
                  aria-label="Play storyboard preview"
                  className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-colors cursor-pointer"
                >
                  <span className="w-12 h-12 rounded-full bg-[#FF006E] border border-white/25 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 shadow-xl">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </span>
                </button>

                <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-white text-[11px] font-semibold tabular-nums">
                  {formatRuntime(totalDuration)}
                </span>
              </div>
            </div>

            {/* Editorial Packaging Details */}
            <div
              className={`${
                isVertical ? "lg:col-span-7" : "lg:col-span-6"
              } p-6 sm:p-8 flex flex-col justify-between gap-6 border-t lg:border-t-0 lg:border-l border-zinc-200/75 dark:border-white/[0.08]`}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {channelLogo && !logoError ? (
                    <img
                      src={channelLogo}
                      alt={channelName || "Channel"}
                      referrerPolicy="no-referrer"
                      onError={() => setLogoError(true)}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-white/15 bg-zinc-900"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full shrink-0 bg-zinc-100 dark:bg-white/[0.08] border border-zinc-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-xs font-bold">
                      {((channelName || "C").trim()[0] || "C").toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      {channelName?.trim() || "Your Channel"}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {formatName} · {kit.scenes.length} scenes · {kit.tone}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white leading-snug text-balance font-display">
                    {kit.primaryTitle}
                  </h1>
                  {leadHook ? (
                    <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                      <span className="font-semibold text-[#FF006E]">Opening Hook: </span>
                      &ldquo;{leadHook.spokenHook}&rdquo;
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 line-clamp-3">
                      {kit.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-zinc-200/70 dark:border-white/[0.07]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenStoryboard}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Play Storyboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenTeleprompter}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 dark:border-white/12 bg-zinc-50 dark:bg-white/[0.04] text-zinc-800 dark:text-zinc-100 hover:border-[#FF006E]/60 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <MonitorPlay className="w-3.5 h-3.5 text-[#FF006E]" />
                    <span>Teleprompter</span>
                  </button>

                  <CopyButton text={kit.primaryTitle} label="Copy Title" size="sm" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-3">
                    {onSelectTab && (
                      <button
                        type="button"
                        onClick={() => onSelectTab("packaging")}
                        className="font-medium hover:text-[#FF006E] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {kit.titleOptions.length} Alt Titles →
                      </button>
                    )}
                    {onSelectTab && (
                      <button
                        type="button"
                        onClick={() => onSelectTab("packaging")}
                        className="font-medium hover:text-[#FF006E] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Edit Thumbnail →
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onDownloadThumbnail}
                    disabled={!previewThumbnailUrl}
                    className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-200 hover:text-[#FF006E] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PNG</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 02: STORYBOARD SPOTLIGHT */}
        {slideIndex === 1 && featuredScene && (
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[410px]">
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-5">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#FF006E] tabular-nums">
                    Scene {String(featuredScene.sceneNumber).padStart(2, "0")} ·{" "}
                    {featuredScene.timestamp} ({featuredScene.durationSeconds}s)
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {featuredScene.cameraMovement}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-display leading-snug">
                  {featuredScene.title}
                </h2>

                <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.03] p-4 space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Spoken Script
                  </span>
                  <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">
                    &ldquo;{featuredScene.narration}&rdquo;
                  </p>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Visual Cue:{" "}
                  </span>
                  {featuredScene.videoPrompt}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-200/70 dark:border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenStoryboard}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Animatic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenSceneAudio(featuredScene.sceneNumber)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#FF006E]" />
                    <span>Voiceover</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenSceneInFlow(featuredScene.sceneNumber)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF006E] hover:underline cursor-pointer whitespace-nowrap"
                >
                  <span>Open Scene Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-zinc-200/75 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#0D0D11] p-5 sm:p-6 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white font-display">
                  All Scenes
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {kit.scenes.length} total
                </span>
              </div>

              <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06] rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] overflow-hidden">
                {kit.scenes.map((scene, idx) => {
                  const selected = idx === activeSceneIdx;
                  return (
                    <button
                      key={scene.sceneNumber}
                      type="button"
                      onClick={() => setActiveSceneIdx(idx)}
                      className={`w-full px-3.5 py-2.5 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#FF006E]/10 text-zinc-900 dark:text-white"
                          : "hover:bg-zinc-50 dark:hover:bg-white/[0.03] text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#FF006E] tabular-nums shrink-0">
                        {String(scene.sceneNumber).padStart(2, "0")}
                      </span>
                      <span className="text-xs font-medium truncate flex-1">
                        {scene.title}
                      </span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                        {scene.durationSeconds}s
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 03: DESCRIPTION & CHAPTERS */}
        {slideIndex === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[410px]">
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-display">
                    Video Description
                  </h2>
                  <CopyButton text={kit.description} label="Copy" />
                </div>
                <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.025] p-4 max-h-[250px] overflow-y-auto">
                  <p className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">
                    {kit.description}
                  </p>
                </div>
              </div>

              {onSelectTab && (
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-200/70 dark:border-white/[0.07] text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {kit.description.length} characters
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectTab("seo")}
                    className="inline-flex items-center gap-1 font-semibold text-[#FF006E] hover:underline cursor-pointer"
                  >
                    <span>Open Full Description &amp; Community Post</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-zinc-200/75 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#0D0D11] p-5 sm:p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white font-display">
                    Chapter Timestamps
                  </span>
                  <CopyButton text={buildChaptersText(kit.scenes)} label="Copy" />
                </div>

                <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06] rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] overflow-hidden">
                  {kit.scenes.map((scene) => (
                    <div
                      key={scene.sceneNumber}
                      className="px-3.5 py-2.5 flex items-baseline gap-3 text-xs"
                    >
                      <span className="font-semibold text-[#FF006E] tabular-nums shrink-0">
                        {(scene.timestamp || "00:00").split("-")[0].trim()}
                      </span>
                      <span className="text-zinc-800 dark:text-zinc-200 truncate">
                        {scene.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {kit.pinnedComment && (
                <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-zinc-900 dark:text-white">
                      Pinned Comment
                    </span>
                    <CopyButton text={kit.pinnedComment} label="Copy" />
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                    {kit.pinnedComment}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SLIDE 04: SEO & LAUNCH READINESS */}
        {slideIndex === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[410px]">
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                      Top SEO Keywords ({kit.tags.length})
                    </h2>
                    <CopyButton text={kit.tags.join(", ")} label="Copy All Tags" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {kit.tags.slice(0, 12).map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.04] text-xs text-zinc-700 dark:text-zinc-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                      Hashtags ({kit.hashtags.length})
                    </h3>
                    <CopyButton text={kit.hashtags.join(" ")} label="Copy Hashtags" />
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {kit.hashtags.join("  ")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-200/70 dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={onDownloadZip}
                  disabled={zipExporting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {zipExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Package className="w-3.5 h-3.5" />
                  )}
                  <span>{zipExporting ? "Bundling..." : "Download .ZIP Pack"}</span>
                </button>

                {onSelectTab && (
                  <button
                    type="button"
                    onClick={() => onSelectTab("publish")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF006E] hover:underline cursor-pointer whitespace-nowrap"
                  >
                    <span>Open Publish &amp; Promo Pack</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-zinc-200/75 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#0D0D11] p-5 sm:p-6 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white font-display">
                  Publish Readiness
                </span>
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {readinessPassed}/{readinessChecks.length}
                </span>
              </div>

              <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06] rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] overflow-hidden">
                {readinessChecks.map((item) => (
                  <div
                    key={item.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {item.status === "pass" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className="text-zinc-800 dark:text-zinc-200 truncate font-medium">
                        {item.label}
                      </span>
                    </span>
                    <span
                      className={`text-[11px] font-medium shrink-0 ${
                        item.status === "pass"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {item.status === "pass" ? "Ready" : "Review"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom 4-Slide Billboard Selector Dock */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-[#0C0C10] divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/70 dark:divide-white/[0.07]">
        {slides.map((slide, idx) => {
          const active = idx === slideIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => {
                setAutoPlay(false);
                setSlideIndex(idx);
              }}
              className={`relative px-4 py-3 text-left transition-colors cursor-pointer ${
                active
                  ? "bg-white dark:bg-[#16161C] text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-white/[0.03] hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 inset-x-0 h-0.5 bg-[#FF006E]"
                />
              )}
              <div className="flex items-center gap-1.5 text-[11px] font-semibold tabular-nums">
                <span className={active ? "text-[#FF006E]" : "text-zinc-400 dark:text-zinc-500"}>
                  {slide.num}
                </span>
                <span className="truncate">{slide.title}</span>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                {slide.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
