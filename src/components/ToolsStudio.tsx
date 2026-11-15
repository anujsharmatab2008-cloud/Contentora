import { useMemo, useState } from "react";
import {
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Film,
  Hash,
  Image as ImageIcon,
  Loader2,
  Mic,
  MonitorPlay,
  Music,
  Play,
  RotateCcw,
  Tag,
  Type,
  Volume2,
  X,
} from "lucide-react";
import type {
  ChannelProfile,
  ModelMode,
  SceneItem,
  ThumbnailDesign,
  TitleOption,
  TtsModelId,
  VideoAnalysisResult,
  VideoFormat,
  VoiceName,
} from "../types.ts";
import { CopyButton } from "./CopyButton.tsx";
import { ThumbnailStudio, renderThumbnailPng } from "./ThumbnailStudio.tsx";
import { SceneFlowchart } from "./SceneFlowchart.tsx";
import { TeleprompterModal, type PrompterSection } from "./TeleprompterModal.tsx";
import { StoryboardPlayerModal } from "./StoryboardPlayerModal.tsx";
import { YouTubeFeedPreview } from "./YouTubeFeedPreview.tsx";
import {
  buildShotListCsv,
  buildSrtExport,
  downloadTextFile,
} from "../utils/creatorExports.ts";

export type ToolId =
  | "title"
  | "description"
  | "tags"
  | "hashtags"
  | "thumbnail"
  | "scenes"
  | "audio"
  | "analyzer";

type ProviderId = "gemini" | "groq" | "openrouter";

const TOOL_PROVIDER_GROUPS: { id: ProviderId; label: string; secretHint?: string }[] = [
  { id: "gemini", label: "Gemini Free Tier (Built-in)" },
  { id: "groq", label: "Groq Free Tier", secretHint: "Add GROQ_API_KEY in Secrets" },
  { id: "openrouter", label: "OpenRouter Free Tier", secretHint: "Add OPENROUTER_API_KEY in Secrets" },
];

interface ToolsStudioProps {
  modelMode: ModelMode;
  onChangeModelMode?: (mode: ModelMode) => void;
  modelOptions?: { value: ModelMode; label: string; provider?: ProviderId }[];
  providerStatus?: Record<ProviderId, boolean>;
  channelName?: string;
  channelLogo?: string;
  channelProfile?: ChannelProfile;
  onBuildKitFromTopic?: (topic: string, format: VideoFormat) => void;
  onToolGenerated?: () => void;
}

interface ToolMeta {
  id: ToolId;
  index: string;
  label: string;
  windowTitle: string;
  summary: string;
  outputSpec: string;
  sampleTopic: string;
  placeholder: string;
  cta: string;
  icon: typeof Type;
}

const TOOL_ITEMS: ToolMeta[] = [
  {
    id: "title",
    index: "01",
    label: "Titles",
    windowTitle: "Title Generator",
    summary: "Primary headline paired with 5 distinct high-CTR variations.",
    outputSpec: "1 primary title + 5 angled headline variations with character counts",
    sampleTopic: "How a turbocharger works in 60 seconds",
    placeholder: "Describe your video topic (e.g. How a turbocharger works in 60 seconds)",
    cta: "Generate Titles",
    icon: Type,
  },
  {
    id: "description",
    index: "02",
    label: "Description",
    windowTitle: "Description Writer",
    summary: "Publish-ready video copy with opening hook, takeaways, and CTA.",
    outputSpec: "Formatted YouTube or Reels description ready to paste",
    sampleTopic: "5 desk lighting upgrades for small home studios",
    placeholder: "Describe your video topic (e.g. 5 desk lighting upgrades for small home studios)",
    cta: "Generate Description",
    icon: AlignLeft,
  },
  {
    id: "tags",
    index: "03",
    label: "SEO Tags",
    windowTitle: "SEO Tag Extractor",
    summary: "20 high-intent search keywords tailored for discovery.",
    outputSpec: "Click-to-copy keyword grid plus one-click full comma list",
    sampleTopic: "Mechanical keyboard build for beginners",
    placeholder: "Describe your video topic (e.g. Mechanical keyboard build for beginners)",
    cta: "Generate SEO Tags",
    icon: Tag,
  },
  {
    id: "hashtags",
    index: "04",
    label: "Hashtags",
    windowTitle: "Hashtag Builder",
    summary: "10 targeted reach hashtags calibrated for YouTube and Reels.",
    outputSpec: "10 formatted #hashtags with single and bulk copy actions",
    sampleTopic: "60-second coffee espresso dial-in guide",
    placeholder: "Describe your video topic (e.g. 60-second coffee espresso dial-in guide)",
    cta: "Generate Hashtags",
    icon: Hash,
  },
  {
    id: "thumbnail",
    index: "05",
    label: "Thumbnail",
    windowTitle: "Thumbnail Studio",
    summary: "Interactive canvas artwork, style presets, and image prompt.",
    outputSpec: "Editable high-CTR canvas preview + PNG export + AI art prompt",
    sampleTopic: "Inside an abandoned 1990s arcade",
    placeholder: "Describe your video topic (e.g. Inside an abandoned 1990s arcade)",
    cta: "Generate Thumbnail",
    icon: ImageIcon,
  },
  {
    id: "scenes",
    index: "06",
    label: "Scenes",
    windowTitle: "Scene Storyboard",
    summary: "Timed shot breakdown with narration, camera cues, and prompts.",
    outputSpec: "Interactive scene flow with timestamps, camera angles, and prompts",
    sampleTopic: "Why deep-sea submarines don't implode",
    placeholder: "Describe your video topic (e.g. Why deep-sea submarines don't implode)",
    cta: "Generate Scenes",
    icon: Film,
  },
  {
    id: "audio",
    index: "07",
    label: "Audio & Voice",
    windowTitle: "Voiceover & Audio",
    summary: "Voiceover script, BGM direction, and WAV audio synthesis.",
    outputSpec: "Narration script, downloadable WAV voiceover, and soundscape prompt",
    sampleTopic: "The forgotten history of neon signs",
    placeholder: "Describe your video topic (e.g. The forgotten history of neon signs)",
    cta: "Generate Audio",
    icon: Volume2,
  },
  {
    id: "analyzer",
    index: "08",
    label: "Analyzer",
    windowTitle: "Video Analyzer",
    summary: "Paste any YouTube video URL to uncover hook psychology, content gaps, and remix angles.",
    outputSpec: "Hook breakdown, why-it-works audit, content gaps, and 3 one-click remix angles",
    sampleTopic: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    placeholder: "Paste a YouTube video URL (youtube.com/watch?v=...) or rough video concept",
    cta: "Analyze Video",
    icon: Compass,
  },
];

const FORMAT_OPTIONS: { value: VideoFormat; label: string }[] = [
  { value: "youtube-16-9", label: "YouTube 16:9" },
  { value: "shorts-9-16", label: "Shorts / Reels 9:16" },
  { value: "documentary", label: "Documentary" },
  { value: "explainer", label: "Explainer" },
];

const TONE_OPTIONS = [
  "Engaging & Clear",
  "Cinematic & Dramatic",
  "Fast-Paced & Punchy",
  "Educational & Calm",
];

const VOICES: { id: VoiceName; label: string }[] = [
  { id: "Kore", label: "Kore · Warm" },
  { id: "Puck", label: "Puck · Energetic" },
  { id: "Charon", label: "Charon · Deep" },
  { id: "Fenrir", label: "Fenrir · Bold" },
  { id: "Zephyr", label: "Zephyr · Crisp" },
];

const TTS_MODELS: { id: TtsModelId; label: string }[] = [
  { id: "gemini-3.8-flash-lite-tts", label: "Gemini 3.8 Flash Lite TTS" },
  { id: "gemini-3.8-flash-tts", label: "Gemini 3.8 Flash TTS" },
];

type ToolResultState =
  | { tool: "title"; topic: string; primaryTitle: string; titleOptions: TitleOption[] }
  | { tool: "description"; topic: string; description: string }
  | { tool: "tags"; topic: string; tags: string[] }
  | { tool: "hashtags"; topic: string; hashtags: string[] }
  | { tool: "thumbnail"; topic: string; format: VideoFormat; thumbnail: ThumbnailDesign }
  | { tool: "scenes"; topic: string; format: VideoFormat; scenes: SceneItem[] }
  | {
      tool: "audio";
      topic: string;
      narration: string;
      voiceStyle: string;
      audioPrompt: string;
      audioUrl?: string;
    }
  | {
      tool: "analyzer";
      topic: string;
      format: VideoFormat;
      analysis: VideoAnalysisResult;
    };

interface ToolWindowState {
  topic: string;
  format: VideoFormat;
  language: string;
  tone: string;
  sceneCount: number;
  voiceName: VoiceName;
  ttsModel: TtsModelId;
  isGenerating: boolean;
  audioLoading: boolean;
  errorMsg: string | null;
  result: ToolResultState | null;
}

function createInitialWindowState(): ToolWindowState {
  return {
    topic: "",
    format: "youtube-16-9",
    language: "English",
    tone: "Engaging & Clear",
    sceneCount: 5,
    voiceName: "Kore",
    ttsModel: "gemini-3.8-flash-lite-tts",
    isGenerating: false,
    audioLoading: false,
    errorMsg: null,
    result: null,
  };
}

function createAllWindowStates(): Record<ToolId, ToolWindowState> {
  return {
    title: createInitialWindowState(),
    description: createInitialWindowState(),
    tags: createInitialWindowState(),
    hashtags: createInitialWindowState(),
    thumbnail: createInitialWindowState(),
    scenes: createInitialWindowState(),
    audio: createInitialWindowState(),
    analyzer: createInitialWindowState(),
  };
}

export function ToolsStudio({
  modelMode,
  onChangeModelMode,
  modelOptions,
  providerStatus,
  channelName,
  channelLogo,
  channelProfile,
  onBuildKitFromTopic,
  onToolGenerated,
}: ToolsStudioProps) {
  const [activeWindowTool, setActiveWindowTool] = useState<ToolId | null>("title");
  const [windows, setWindows] = useState<Record<ToolId, ToolWindowState>>(createAllWindowStates);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [prompterState, setPrompterState] = useState<{
    open: boolean;
    title: string;
    sections: PrompterSection[];
  }>({ open: false, title: "", sections: [] });
  const [storyboardState, setStoryboardState] = useState<{
    open: boolean;
    title: string;
    scenes: SceneItem[];
    isVertical: boolean;
  }>({ open: false, title: "", scenes: [], isVertical: false });
  const [showFeedPreview, setShowFeedPreview] = useState(false);
  const [liveThumbUrl, setLiveThumbUrl] = useState("");

  const updateWindow = (toolId: ToolId, patch: Partial<ToolWindowState>) => {
    setWindows((prev) => ({
      ...prev,
      [toolId]: { ...prev[toolId], ...patch },
    }));
  };

  const resetWindow = (toolId: ToolId) => {
    setWindows((prev) => ({
      ...prev,
      [toolId]: createInitialWindowState(),
    }));
  };

  const handleCopyToken = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedToken(value);
    window.setTimeout(() => {
      setCopiedToken((prev) => (prev === value ? null : prev));
    }, 1500);
  };

  const synthesizeWav = async (
    toolId: ToolId,
    text: string,
    style: string,
    voiceName: VoiceName,
    ttsModel: TtsModelId
  ) => {
    updateWindow(toolId, { audioLoading: true, errorMsg: null });
    try {
      const res = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          style,
          voiceName,
          ttsModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Audio synthesis failed");
      }
      setWindows((prev) => {
        const currentResult = prev[toolId].result;
        if (!currentResult || currentResult.tool !== "audio") return prev;
        return {
          ...prev,
          [toolId]: {
            ...prev[toolId],
            audioLoading: false,
            result: { ...currentResult, audioUrl: data.audioDataUrl },
          },
        };
      });
      onToolGenerated?.();
    } catch (err) {
      updateWindow(toolId, {
        audioLoading: false,
        errorMsg: err instanceof Error ? err.message : "Failed to synthesize audio.",
      });
    }
  };

  const handleGenerate = async (toolId: ToolId) => {
    const win = windows[toolId];
    const clean = win.topic.trim();
    if (!clean || win.isGenerating) return;

    updateWindow(toolId, { errorMsg: null, isGenerating: true });

    try {
      if (toolId === "analyzer") {
        const res = await fetch("/api/analyze-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: clean,
            modelMode,
            channelProfile,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to analyze video.");
        }
        updateWindow(toolId, {
          isGenerating: false,
          result: {
            tool: "analyzer",
            topic: clean,
            format: win.format,
            analysis: json.analysis as VideoAnalysisResult,
          },
        });
        onToolGenerated?.();
        return;
      }

      const res = await fetch("/api/generate-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: toolId,
          topic: clean,
          format: win.format,
          language: win.language,
          tone: win.tone,
          sceneCount: win.sceneCount,
          modelMode,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate output.");
      }

      const d = json.data || {};
      let nextResult: ToolResultState | null = null;

      if (toolId === "title") {
        nextResult = {
          tool: "title",
          topic: clean,
          primaryTitle: d.primaryTitle || clean,
          titleOptions: Array.isArray(d.titleOptions) ? d.titleOptions : [],
        };
      } else if (toolId === "description") {
        nextResult = {
          tool: "description",
          topic: clean,
          description: d.description || "",
        };
      } else if (toolId === "tags") {
        nextResult = {
          tool: "tags",
          topic: clean,
          tags: Array.isArray(d.tags) ? d.tags : [],
        };
      } else if (toolId === "hashtags") {
        nextResult = {
          tool: "hashtags",
          topic: clean,
          hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
        };
      } else if (toolId === "thumbnail") {
        nextResult = {
          tool: "thumbnail",
          topic: clean,
          format: win.format,
          thumbnail: d.thumbnail,
        };
      } else if (toolId === "scenes") {
        nextResult = {
          tool: "scenes",
          topic: clean,
          format: win.format,
          scenes: Array.isArray(d.scenes) ? d.scenes : [],
        };
      } else if (toolId === "audio") {
        nextResult = {
          tool: "audio",
          topic: clean,
          narration: d.narration || "",
          voiceStyle: d.voiceStyle || "Engaging narrator",
          audioPrompt: d.audioPrompt || "",
        };
      }

      updateWindow(toolId, { isGenerating: false, result: nextResult });
      onToolGenerated?.();

      if (toolId === "audio" && nextResult?.tool === "audio" && nextResult.narration) {
        void synthesizeWav(
          toolId,
          nextResult.narration,
          nextResult.voiceStyle,
          win.voiceName,
          win.ttsModel
        );
      }
    } catch (err) {
      updateWindow(toolId, {
        isGenerating: false,
        errorMsg: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  };

  const thumbToolResult = windows.thumbnail.result;
  const thumbnailPreviewUrl = useMemo(() => {
    if (thumbToolResult?.tool !== "thumbnail") return "";
    try {
      return renderThumbnailPng(
        thumbToolResult.thumbnail,
        thumbToolResult.format === "shorts-9-16"
      );
    } catch {
      return "";
    }
  }, [thumbToolResult]);

  // VIEW 1: ZERO-SCROLL TOOLS WINDOW LAUNCHER GRID
  if (!activeWindowTool) {
    const readyCount = Object.values(windows).filter((w) => Boolean(w.result)).length;

    return (
      <section className="h-full bg-[#FAFAF9] dark:bg-[#09090B] px-4 sm:px-8 py-5 lg:py-6 flex flex-col justify-center overflow-y-auto lg:overflow-hidden">
        <div className="max-w-6xl mx-auto w-full flex flex-col gap-5">
          {/* Header Row */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200/80 dark:border-white/[0.08] pb-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-display">
                Creator Tools
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Open any generator in its own dedicated workspace window. Each tool keeps its prompt and output saved.
              </p>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
              {TOOL_ITEMS.length} Tool Windows · {readyCount} Active
            </div>
          </div>

          {/* Balanced 7-Window Launcher Grid (Fits cleanly inside 1 desktop viewport) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {TOOL_ITEMS.map((item) => {
              const Icon = item.icon;
              const win = windows[item.id];
              const hasResult = Boolean(win.result);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveWindowTool(item.id)}
                  className={`group rounded-2xl border p-4 sm:p-5 text-left flex flex-col justify-between gap-4 transition-colors cursor-pointer bg-white dark:bg-[#111114] ${
                    hasResult
                      ? "border-[#FF006E]/45 hover:border-[#FF006E]"
                      : "border-zinc-200/85 dark:border-white/[0.08] hover:border-zinc-400 dark:hover:border-white/25"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-white/[0.06] group-hover:bg-[#FF006E] text-zinc-700 dark:text-zinc-200 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                        {item.index}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-sm sm:text-[15px] font-semibold text-zinc-900 dark:text-white font-display">
                        {item.windowTitle}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                        {item.summary}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-200/70 dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                    <span
                      className={
                        hasResult
                          ? "font-medium text-[#FF006E] inline-flex items-center gap-1"
                          : "text-zinc-400 dark:text-zinc-500"
                      }
                    >
                      {hasResult ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Output ready</span>
                        </>
                      ) : win.isGenerating ? (
                        "Generating..."
                      ) : (
                        "Idle"
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-200 group-hover:text-[#FF006E] transition-colors whitespace-nowrap">
                      <span>Open Window</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // VIEW 2: DEDICATED SEPARATE WINDOW FOR THE ACTIVE TOOL (ZERO PAGE SCROLL)
  const activeMeta = TOOL_ITEMS.find((t) => t.id === activeWindowTool) || TOOL_ITEMS[0];
  const ActiveIcon = activeMeta.icon;
  const win = windows[activeWindowTool];
  const hasStateToReset = Boolean(win.topic.trim() || win.result || win.errorMsg);

  return (
    <section className="h-full bg-[#FAFAF9] dark:bg-[#09090B] p-3 sm:p-5 flex flex-col min-h-0 lg:overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex-1 min-h-0 rounded-2xl border border-zinc-200/90 dark:border-white/[0.1] bg-white dark:bg-[#111114] flex flex-col overflow-hidden">
        {/* Window Titlebar */}
        <div className="shrink-0 px-4 sm:px-5 py-2.5 border-b border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141418] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setActiveWindowTool(null)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] hover:border-zinc-300 dark:hover:border-white/25 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Tools</span>
            </button>

            <span className="h-4 w-px bg-zinc-200 dark:bg-white/10 shrink-0" aria-hidden="true" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-[#FF006E]/10 text-[#FF006E] flex items-center justify-center shrink-0">
                <ActiveIcon className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-white font-display truncate">
                {activeMeta.windowTitle}
              </span>
            </div>
          </div>

          {/* Quick Window Tabs */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#0D0D10] border border-zinc-200/70 dark:border-white/[0.06] overflow-x-auto min-w-0">
            {TOOL_ITEMS.map((item) => {
              const isCurrent = item.id === activeWindowTool;
              const ready = Boolean(windows[item.id].result);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveWindowTool(item.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isCurrent
                      ? "bg-white dark:bg-white/[0.08] text-zinc-900 dark:text-white border border-zinc-200/70 dark:border-white/10"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent"
                  }`}
                >
                  <span>{item.label}</span>
                  {ready && !isCurrent && (
                    <Check className="w-3 h-3 text-[#FF006E]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasStateToReset && (
              <button
                type="button"
                onClick={() => resetWindow(activeWindowTool)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-white/12 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveWindowTool(null)}
              aria-label="Close tool window"
              className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Split-Pane Window Workspace (Input Left · Output Right) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT PANE: Prompt & Parameters */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-zinc-200/80 dark:border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between gap-4 min-h-0 overflow-y-auto">
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="tool-topic-input"
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-200"
                >
                  Video Topic or Brief
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateWindow(activeWindowTool, {
                      topic: activeMeta.sampleTopic,
                      errorMsg: null,
                    })
                  }
                  className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-[#FF006E] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Use example
                </button>
              </div>

              <textarea
                id="tool-topic-input"
                value={win.topic}
                onChange={(e) => updateWindow(activeWindowTool, { topic: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleGenerate(activeWindowTool);
                  }
                }}
                placeholder={activeMeta.placeholder}
                className="flex-1 min-h-[120px] w-full resize-none rounded-xl border border-zinc-200 dark:border-white/12 focus:border-[#FF006E]/75 bg-zinc-50/70 dark:bg-[#16161B] p-3.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none leading-relaxed transition-colors"
              />
            </div>

            <div className="space-y-3 shrink-0">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    Format
                  </span>
                  <select
                    aria-label="Video Format"
                    value={win.format}
                    onChange={(e) =>
                      updateWindow(activeWindowTool, { format: e.target.value as VideoFormat })
                    }
                    className="w-full px-2.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#19191F] text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none"
                  >
                    {FORMAT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    Language
                  </span>
                  <select
                    aria-label="Language"
                    value={win.language}
                    onChange={(e) => updateWindow(activeWindowTool, { language: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#19191F] text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none"
                  >
                    {["English", "Hindi", "Spanish", "French"].map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    Tone
                  </span>
                  <select
                    aria-label="Tone"
                    value={win.tone}
                    onChange={(e) => updateWindow(activeWindowTool, { tone: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#19191F] text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none"
                  >
                    {TONE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {onChangeModelMode && modelOptions && (
                  <div className="space-y-1">
                    <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      AI Model
                    </span>
                    <select
                      aria-label="Free-Tier AI Model"
                      value={modelMode}
                      onChange={(e) => onChangeModelMode(e.target.value as ModelMode)}
                      className="w-full px-2.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#19191F] text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none"
                    >
                      {TOOL_PROVIDER_GROUPS.map((group) => {
                        const groupOpts = modelOptions.filter(
                          (m) => (m.provider ?? "gemini") === group.id
                        );
                        if (groupOpts.length === 0) return null;
                        const ready = providerStatus
                          ? providerStatus[group.id]
                          : group.id === "gemini";
                        const groupLabel =
                          !ready && group.secretHint
                            ? `${group.label} (${group.secretHint})`
                            : group.label;
                        return (
                          <optgroup key={group.id} label={groupLabel}>
                            {groupOpts.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>
                )}

                {activeWindowTool === "scenes" && (
                  <div className="col-span-2 space-y-1">
                    <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      Scene Count
                    </span>
                    <select
                      aria-label="Scene Count"
                      value={win.sceneCount}
                      onChange={(e) =>
                        updateWindow(activeWindowTool, { sceneCount: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#19191F] text-zinc-800 dark:text-zinc-100 cursor-pointer tabular-nums focus:outline-none"
                    >
                      {[4, 5, 6, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} Scenes
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeWindowTool === "audio" && (
                  <>
                    <div className="space-y-1">
                      <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        Narrator Voice
                      </span>
                      <select
                        aria-label="Narrator Voice"
                        value={win.voiceName}
                        onChange={(e) =>
                          updateWindow(activeWindowTool, {
                            voiceName: e.target.value as VoiceName,
                          })
                        }
                        className="w-full px-2.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#19191F] text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none"
                      >
                        {VOICES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        TTS Model
                      </span>
                      <select
                        aria-label="TTS Model"
                        value={win.ttsModel}
                        onChange={(e) =>
                          updateWindow(activeWindowTool, {
                            ttsModel: e.target.value as TtsModelId,
                          })
                        }
                        className="w-full px-2.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#19191F] text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none"
                      >
                        {TTS_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {win.errorMsg && (
                <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
                  <span>{win.errorMsg}</span>
                  <button
                    type="button"
                    onClick={() => updateWindow(activeWindowTool, { errorMsg: null })}
                    className="text-xs font-medium underline cursor-pointer shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleGenerate(activeWindowTool)}
                disabled={!win.topic.trim() || win.isGenerating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                {win.isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span>{activeMeta.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT PANE: Output Viewport */}
          <div className="lg:col-span-7 bg-[#FAFAF9]/70 dark:bg-[#0B0B0E] p-4 sm:p-6 min-h-0 overflow-y-auto">
            {win.isGenerating ? (
              <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF006E]" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white font-display">
                    Building {activeMeta.label.toLowerCase()} output
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {activeMeta.outputSpec}
                  </p>
                </div>
              </div>
            ) : !win.result ? (
              <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center max-w-md mx-auto gap-3.5">
                <span className="w-11 h-11 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141418] text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                  <ActiveIcon className="w-5 h-5" />
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white font-display">
                    {activeMeta.windowTitle} Output
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {activeMeta.outputSpec}. Enter your video topic on the left and press Enter or click {activeMeta.cta}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateWindow(activeWindowTool, {
                      topic: activeMeta.sampleTopic,
                      errorMsg: null,
                    })
                  }
                  className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#141418] hover:border-zinc-300 dark:hover:border-white/25 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Load Example Prompt
                </button>
              </div>
            ) : (
              <>
                {win.result.tool === "title" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                        Generated Titles
                      </h3>
                      <CopyButton
                        text={win.result.primaryTitle}
                        label="Copy Primary"
                        size="sm"
                        className="!border-transparent !bg-[#FF006E] hover:!bg-[#e10062] !text-white"
                      />
                    </div>

                    <div className="rounded-xl border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#111114] p-4 space-y-1">
                      <span className="text-xs font-semibold text-[#FF006E]">
                        Primary
                      </span>
                      <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-display">
                        {win.result.primaryTitle}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {win.result.titleOptions.map((item, idx) => (
                        <div
                          key={`${item.title}-${idx}`}
                          className="rounded-xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] hover:border-zinc-300 dark:hover:border-white/20 px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="text-xs font-bold text-[#FF006E] tabular-nums pt-0.5 shrink-0">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {item.title}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                                {item.angle} · {item.title.length} chars
                              </p>
                            </div>
                          </div>
                          <CopyButton text={item.title} label="Copy" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {win.result.tool === "description" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                        Generated Description
                      </h3>
                      <CopyButton text={win.result.description} label="Copy" size="sm" />
                    </div>
                    <div className="p-4 sm:p-5 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {win.result.description}
                    </div>
                  </div>
                )}

                {win.result.tool === "tags" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display tabular-nums">
                        SEO Tags ({win.result.tags.length})
                      </h3>
                      <CopyButton text={win.result.tags.join(", ")} label="Copy All" size="sm" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {win.result.tags.map((tag, idx) => {
                        const isCopied = copiedToken === tag;
                        return (
                          <button
                            key={`${tag}-${idx}`}
                            type="button"
                            onClick={() => handleCopyToken(tag)}
                            className="group px-3.5 py-2 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] hover:border-zinc-300 dark:hover:border-white/20 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer text-left"
                          >
                            <span className="text-zinc-800 dark:text-zinc-200 truncate">
                              {tag}
                            </span>
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {win.result.tool === "hashtags" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display tabular-nums">
                        Hashtags ({win.result.hashtags.length})
                      </h3>
                      <CopyButton text={win.result.hashtags.join(" ")} label="Copy All" size="sm" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {win.result.hashtags.map((tag, idx) => {
                        const isCopied = copiedToken === tag;
                        return (
                          <button
                            key={`${tag}-${idx}`}
                            type="button"
                            onClick={() => handleCopyToken(tag)}
                            className="group px-3.5 py-2.5 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] hover:border-zinc-300 dark:hover:border-white/20 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer text-left"
                          >
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {tag}
                            </span>
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {win.result.tool === "thumbnail" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setShowFeedPreview((v) => !v)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                          showFeedPreview
                            ? "border-[#FF006E] bg-[#FF006E]/10 text-[#FF006E]"
                            : "border-zinc-200 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{showFeedPreview ? "Hide Feed Check" : "YouTube Feed Check"}</span>
                      </button>
                    </div>

                    <ThumbnailStudio
                      design={win.result.thumbnail}
                      format={win.result.format}
                      primaryTitle={win.result.topic}
                      onPngChange={setLiveThumbUrl}
                    />

                    {showFeedPreview && (
                      <YouTubeFeedPreview
                        thumbnailUrl={liveThumbUrl || thumbnailPreviewUrl}
                        title={win.result.topic}
                        channelName={channelName || "Your Channel"}
                        channelLogo={channelLogo}
                        isVertical={win.result.format === "shorts-9-16"}
                      />
                    )}
                  </div>
                )}

                {win.result.tool === "scenes" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                        {win.result.scenes.length} Scenes Ready
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (win.result?.tool !== "scenes") return;
                            setStoryboardState({
                              open: true,
                              title: win.result.topic,
                              scenes: win.result.scenes,
                              isVertical: win.result.format === "shorts-9-16",
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Storyboard</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (win.result?.tool !== "scenes") return;
                            setPrompterState({
                              open: true,
                              title: win.result.topic,
                              sections: win.result.scenes.map((s) => ({
                                sceneNumber: s.sceneNumber,
                                title: s.title,
                                timestamp: s.timestamp,
                                narration: s.narration,
                              })),
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-800 dark:text-zinc-100 hover:border-[#FF006E]/60 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <MonitorPlay className="w-3.5 h-3.5 text-[#FF006E]" />
                          <span>Teleprompter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (win.result?.tool !== "scenes") return;
                            const srt = buildSrtExport(win.result.scenes);
                            if (srt) {
                              downloadTextFile(
                                "contentora-captions.srt",
                                srt,
                                "application/x-subrip;charset=utf-8"
                              );
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <FileText className="w-3.5 h-3.5 text-zinc-400" />
                          <span>.SRT</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (win.result?.tool !== "scenes") return;
                            const csv = buildShotListCsv({
                              primaryTitle: win.result.topic,
                              scenes: win.result.scenes,
                            });
                            downloadTextFile(
                              "contentora-shot-list.csv",
                              csv,
                              "text/csv;charset=utf-8"
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                          <span>CSV</span>
                        </button>
                      </div>
                    </div>

                    <SceneFlowchart
                      formatLabel={
                        FORMAT_OPTIONS.find(
                          (f) =>
                            f.value ===
                            (win.result?.tool === "scenes" ? win.result.format : win.format)
                        )?.label || "16:9"
                      }
                      scenes={win.result.scenes}
                    />
                  </div>
                )}

                {win.result.tool === "audio" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 sm:p-5 space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200/70 dark:border-white/[0.08]">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
                          <Mic className="w-4 h-4 text-[#FF006E]" />
                          <span>Voiceover Script ({win.result.voiceStyle})</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (win.result?.tool !== "audio") return;
                              setPrompterState({
                                open: true,
                                title: win.result.topic,
                                sections: [
                                  {
                                    sceneNumber: 1,
                                    title: "Voiceover Script",
                                    narration: win.result.narration,
                                  },
                                ],
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <MonitorPlay className="w-3.5 h-3.5 text-[#FF006E]" />
                            <span>Teleprompter</span>
                          </button>
                          <CopyButton text={win.result.narration} label="Copy Script" />
                          <button
                            type="button"
                            onClick={() => {
                              if (win.result?.tool !== "audio") return;
                              void synthesizeWav(
                                activeWindowTool,
                                win.result.narration,
                                win.result.voiceStyle,
                                win.voiceName,
                                win.ttsModel
                              );
                            }}
                            disabled={win.audioLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
                          >
                            {win.audioLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Synthesizing...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>
                                  {win.result.audioUrl ? "Regenerate WAV" : `Generate (${win.voiceName})`}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                        {win.result.narration}
                      </p>

                      {win.result.audioUrl && (
                        <div className="pt-3 border-t border-zinc-200/70 dark:border-white/[0.08] flex flex-wrap items-center gap-3">
                          <audio controls src={win.result.audioUrl} className="h-9 flex-1 min-w-[200px]" />
                          <a
                            href={win.result.audioUrl}
                            download="contentora-voiceover.wav"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>WAV</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
                          <Music className="w-3.5 h-3.5 text-[#FF006E]" />
                          <span>Sound & BGM Prompt</span>
                        </div>
                        <CopyButton text={win.result.audioPrompt} label="Copy" />
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {win.result.audioPrompt}
                      </p>
                    </div>
                  </div>
                )}

                {win.result.tool === "analyzer" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#FF006E]">
                          {win.result.analysis.channelName || "Reference Breakdown"}
                        </span>
                        <CopyButton text={win.result.analysis.videoTitle} label="Copy Title" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white font-display">
                        {win.result.analysis.videoTitle}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                        {win.result.analysis.hookBreakdown}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 space-y-2">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white font-display">
                          Why It Works
                        </h4>
                        <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300 list-disc pl-4 leading-relaxed">
                          {win.result.analysis.whyItWorks.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 space-y-2">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white font-display">
                          Content Gaps to Beat It
                        </h4>
                        <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300 list-disc pl-4 leading-relaxed">
                          {win.result.analysis.contentGaps.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white font-display">
                        Remix Angles for Your Channel
                      </h4>
                      <div className="space-y-2.5">
                        {win.result.analysis.remixAngles.map((remix, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FF006E]">
                                {remix.angle}
                              </span>
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                {remix.title}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                Hook: &ldquo;{remix.hook}&rdquo;
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <CopyButton text={remix.title} label="Copy" />
                              {onBuildKitFromTopic && (
                                <button
                                  type="button"
                                  onClick={() => onBuildKitFromTopic(remix.title, win.format)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF006E] hover:bg-[#e10062] text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <span>Build Full Kit</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <TeleprompterModal
        open={prompterState.open}
        title={prompterState.title}
        sections={prompterState.sections}
        onClose={() => setPrompterState((prev) => ({ ...prev, open: false }))}
      />

      <StoryboardPlayerModal
        open={storyboardState.open}
        title={storyboardState.title}
        scenes={storyboardState.scenes}
        isVertical={storyboardState.isVertical}
        onClose={() => setStoryboardState((prev) => ({ ...prev, open: false }))}
      />
    </section>
  );
}
