import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Film,
  Loader2,
  MessageSquare,
  Mic,
  MonitorPlay,
  Music,
  Package,
  Play,
  Send,
  Share2,
  Volume2,
} from "lucide-react";
import type {
  ChannelProfile,
  ModelMode,
  SceneAudioState,
  SceneItem,
  SectionTab,
  SocialPromoPack,
  TtsModelId,
  VideoKit,
  VoiceName,
} from "../types.ts";
import { CopyButton } from "./CopyButton.tsx";
import { ThumbnailStudio, renderThumbnailPng } from "./ThumbnailStudio.tsx";
import { SceneFlowchart } from "./SceneFlowchart.tsx";
import { TeleprompterModal, type PrompterSection } from "./TeleprompterModal.tsx";
import { StoryboardPlayerModal } from "./StoryboardPlayerModal.tsx";
import { OverviewBillboard } from "./OverviewBillboard.tsx";
import { YouTubeFeedPreview } from "./YouTubeFeedPreview.tsx";
import {
  buildChaptersText,
  buildShotListCsv,
  buildSocialPackText,
  buildSrtExport,
  buildYouTubeUploadText,
  downloadTextFile,
  evaluatePublishReadiness,
  exportProductionZip,
} from "../utils/creatorExports.ts";

interface VideoKitViewProps {
  kit: VideoKit;
  activeTab: SectionTab;
  onSelectTab?: (tab: SectionTab) => void;
  channelName?: string;
  channelLogo?: string;
  channelProfile?: ChannelProfile;
  modelMode?: ModelMode;
  onRepurposeToShorts?: () => void;
  isRepurposing?: boolean;
  onSaveSocialPack?: (pack: SocialPromoPack) => void;
  onContentGenerated?: () => void;
}

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

const FORMAT_NAMES: Record<string, string> = {
  "youtube-16-9": "16:9 YouTube",
  "shorts-9-16": "9:16 Shorts",
  documentary: "16:9 Documentary",
  explainer: "16:9 Explainer",
};

function formatRuntime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function buildMarkdownExport(kit: VideoKit): string {
  const lines: string[] = [
    `# ${kit.primaryTitle}`,
    "",
    `Topic: ${kit.topic}`,
    `Format: ${kit.format} | Tone: ${kit.tone}`,
    "",
    "## Title Variations",
    ...kit.titleOptions.map((opt, idx) => `${idx + 1}. [${opt.angle}] ${opt.title}`),
    "",
    ...(kit.hookVariations && kit.hookVariations.length > 0
      ? [
          "## Opening 5-Second Hook Variations",
          ...kit.hookVariations.flatMap((h, idx) => [
            `${idx + 1}. [${h.style}] "${h.spokenHook}"`,
            `   Visual Cue: ${h.visualCue}`,
          ]),
          "",
        ]
      : []),
    "## Video Description",
    kit.description,
    "",
    ...(kit.pinnedComment
      ? ["## Pinned Comment", kit.pinnedComment, ""]
      : []),
    ...(kit.communityPost
      ? ["## Community Post", kit.communityPost, ""]
      : []),
    "## SEO Tags",
    kit.tags.join(", "),
    "",
    "## Hashtags",
    kit.hashtags.join(" "),
    "",
    "## Thumbnail Prompt",
    `Overlay Headline: ${kit.thumbnail.headline}`,
    `Image Prompt: ${kit.thumbnail.imagePrompt}`,
    `Negative Prompt: ${kit.thumbnail.negativePrompt}`,
    "",
    "## Scene-by-Scene Production",
    ...kit.scenes.flatMap((scene) => [
      `### Scene ${scene.sceneNumber}: ${scene.title} (${scene.timestamp}, ${scene.durationSeconds}s)`,
      `- Camera: ${scene.cameraMovement}`,
      `- Voice Style: ${scene.voiceStyle}`,
      `- Voiceover Script: "${scene.narration}"`,
      `- Audio / BGM / SFX Prompt: ${scene.audioPrompt}`,
      `- Video Generation Prompt: ${scene.videoPrompt}`,
      "",
    ]),
  ];
  return lines.join("\n");
}

export function VideoKitView({
  kit,
  activeTab,
  onSelectTab,
  channelName,
  channelLogo,
  channelProfile,
  modelMode = "all-free-tier",
  onRepurposeToShorts,
  isRepurposing = false,
  onSaveSocialPack,
  onContentGenerated,
}: VideoKitViewProps) {
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>("Kore");
  const [selectedTtsModel, setSelectedTtsModel] = useState<TtsModelId>(
    "gemini-3.8-flash-lite-tts"
  );
  const [audioByScene, setAudioByScene] = useState<Record<number, SceneAudioState>>({});
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [focusedSceneNum, setFocusedSceneNum] = useState<number | undefined>(
    kit.scenes[0]?.sceneNumber
  );
  const [audioSceneNum, setAudioSceneNum] = useState<number>(
    kit.scenes[0]?.sceneNumber ?? 1
  );
  const [showAllAudio, setShowAllAudio] = useState(false);
  const [expandedAudioPrompt, setExpandedAudioPrompt] = useState<Record<number, boolean>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [fontVersion, setFontVersion] = useState(0);
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);
  const [storyboardOpen, setStoryboardOpen] = useState(false);
  const [liveThumbPng, setLiveThumbPng] = useState<string>("");
  const [zipExporting, setZipExporting] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  useEffect(() => {
    setLiveThumbPng("");
    setSocialError(null);
  }, [kit]);

  useEffect(() => {
    let active = true;
    document.fonts?.ready.then(() => {
      if (active) setFontVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  const isVertical = kit.format === "shorts-9-16";

  const previewThumbnailUrl = useMemo(() => {
    try {
      void fontVersion;
      return renderThumbnailPng(kit.thumbnail, isVertical);
    } catch {
      return "";
    }
  }, [kit.thumbnail, isVertical, fontVersion]);

  const totalDuration = kit.scenes.reduce(
    (sum, s) => sum + (Number(s.durationSeconds) || 0),
    0
  );

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

  const generateAudioForScene = async (scene: SceneItem) => {
    setAudioByScene((prev) => ({
      ...prev,
      [scene.sceneNumber]: {
        ...prev[scene.sceneNumber],
        loading: true,
        error: undefined,
      },
    }));

    try {
      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: scene.narration,
          style: scene.voiceStyle,
          voiceName: selectedVoice,
          ttsModel: selectedTtsModel,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate audio");
      }
      setAudioByScene((prev) => ({
        ...prev,
        [scene.sceneNumber]: {
          loading: false,
          audioUrl: data.audioDataUrl,
          modelUsed: data.modelUsed,
          voiceName: data.voiceName,
        },
      }));
      onContentGenerated?.();
    } catch (err) {
      setAudioByScene((prev) => ({
        ...prev,
        [scene.sceneNumber]: {
          loading: false,
          error: err instanceof Error ? err.message : "Audio synthesis failed",
        },
      }));
    }
  };

  const handleGenerateAllAudio = async () => {
    if (batchGenerating) return;
    setBatchGenerating(true);
    try {
      for (const scene of kit.scenes) {
        await generateAudioForScene(scene);
      }
    } finally {
      setBatchGenerating(false);
    }
  };

  const handleDownloadThumbnail = () => {
    const targetUrl = liveThumbPng || previewThumbnailUrl;
    if (!targetUrl) return;
    const link = document.createElement("a");
    link.href = targetUrl;
    const slug = kit.primaryTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.download = `${slug || "thumbnail"}-${isVertical ? "1080x1920" : "1280x720"}.png`;
    link.click();
  };

  const handleDownloadAudio = (scene: SceneItem, url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `scene-${String(scene.sceneNumber).padStart(2, "0")}-voiceover.wav`;
    link.click();
  };

  const slug =
    kit.primaryTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "video-kit";

  const handleDownloadSrt = () => {
    const srt = buildSrtExport(kit.scenes);
    if (!srt) return;
    downloadTextFile(`${slug}-captions.srt`, srt, "application/x-subrip;charset=utf-8");
  };

  const handleDownloadShotListCsv = () => {
    const csv = buildShotListCsv(kit);
    downloadTextFile(`${slug}-shot-list.csv`, csv, "text/csv;charset=utf-8");
  };

  const handleDownloadZipPack = async () => {
    if (zipExporting) return;
    setZipExporting(true);
    try {
      await exportProductionZip({
        kit,
        markdownContent: buildMarkdownExport(kit),
        thumbnailPngUrl: liveThumbPng || previewThumbnailUrl,
        audioByScene,
      });
    } finally {
      setZipExporting(false);
    }
  };

  const handleGenerateSocialPack = async () => {
    if (socialLoading) return;
    setSocialLoading(true);
    setSocialError(null);
    try {
      const resp = await fetch("/api/repurpose-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentKit: kit,
          modelMode,
          channelProfile,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Failed to generate social promo pack.");
      }
      if (data.socialPack && onSaveSocialPack) {
        onSaveSocialPack(data.socialPack as SocialPromoPack);
        onContentGenerated?.();
      }
    } catch (err) {
      setSocialError(err instanceof Error ? err.message : "Failed to generate promo pack.");
    } finally {
      setSocialLoading(false);
    }
  };

  const readinessChecks = useMemo(() => evaluatePublishReadiness(kit), [kit]);
  const readinessPassed = readinessChecks.filter((c) => c.status === "pass").length;

  const prompterSections = useMemo<PrompterSection[]>(
    () =>
      kit.scenes.map((s) => ({
        sceneNumber: s.sceneNumber,
        title: s.title,
        timestamp: s.timestamp,
        narration: s.narration,
      })),
    [kit.scenes]
  );

  const formatName = FORMAT_NAMES[kit.format] || kit.format;

  const activeAudioIndex = Math.max(
    0,
    kit.scenes.findIndex((s) => s.sceneNumber === audioSceneNum)
  );
  const activeAudioScene = kit.scenes[activeAudioIndex] || kit.scenes[0];
  const displayedAudioScenes = showAllAudio
    ? kit.scenes
    : activeAudioScene
    ? [activeAudioScene]
    : kit.scenes;

  return (
    <div className="space-y-4">
      {/* OVERVIEW TAB: Professional 4-Slide Billboard Showcase */}
      {activeTab === "overview" && (
        <OverviewBillboard
          kit={kit}
          previewThumbnailUrl={liveThumbPng || previewThumbnailUrl}
          channelName={channelName}
          channelLogo={channelLogo}
          totalDuration={totalDuration}
          formatName={formatName}
          onSelectTab={onSelectTab}
          onOpenStoryboard={() => setStoryboardOpen(true)}
          onOpenTeleprompter={() => setTeleprompterOpen(true)}
          onDownloadThumbnail={handleDownloadThumbnail}
          onDownloadZip={() => void handleDownloadZipPack()}
          zipExporting={zipExporting}
          onOpenSceneInFlow={(sceneNumber) => {
            setFocusedSceneNum(sceneNumber);
            onSelectTab?.("scenes");
          }}
          onOpenSceneAudio={(sceneNumber) => {
            setAudioSceneNum(sceneNumber);
            onSelectTab?.("audio");
          }}
        />
      )}

      {/* PACKAGING TAB: Thumbnail Studio, Live Preview, Titles & Opening Hooks */}
      {activeTab === "packaging" && (
        <div className="space-y-8">
          <section className="space-y-5">
            <ThumbnailStudio
              design={kit.thumbnail}
              format={kit.format}
              primaryTitle={kit.primaryTitle}
              onPngChange={setLiveThumbPng}
            />
            <YouTubeFeedPreview
              thumbnailUrl={liveThumbPng || previewThumbnailUrl}
              title={kit.primaryTitle}
              titleOptions={kit.titleOptions}
              channelName={channelName || "Your Channel"}
              channelLogo={channelLogo}
              durationBadge={formatRuntime(totalDuration)}
              isVertical={isVertical}
            />
          </section>

          <section className="space-y-5 pt-2 border-t border-zinc-200/80 dark:border-white/[0.08]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2.5">
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-display">
                Titles
              </h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {kit.titleOptions.length + 1} options
              </span>
            </div>

            <CopyButton
              text={kit.primaryTitle}
              label="Copy Primary"
              size="sm"
              className="!border-transparent !bg-[#FF006E] hover:!bg-[#e10062] !text-white"
            />
          </div>

          {/* Primary Title Spotlight */}
          <div className="rounded-2xl border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#111114] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#FF006E]">
                Primary
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {kit.primaryTitle.length} chars
              </span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white leading-snug text-balance font-display">
              {kit.primaryTitle}
            </p>
          </div>

          {/* Clean Alternative Title Cards */}
          <div className="space-y-2.5">
            {kit.titleOptions.map((item, idx) => (
              <div
                key={`${item.title}-${idx}`}
                className="group rounded-xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] hover:border-zinc-300 dark:hover:border-white/20 px-4 py-3.5 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <span className="text-xs font-bold text-[#FF006E] tabular-nums pt-0.5 shrink-0">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                      {item.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {item.angle} · {item.title.length} chars
                    </p>
                  </div>
                </div>

                <CopyButton text={item.title} label="Copy" />
              </div>
            ))}
          </div>

          {/* Opening 5-Second Hooks */}
          {kit.hookVariations && kit.hookVariations.length > 0 && (
            <div className="pt-2 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white font-display">
                  Opening 5-Second Hooks
                </h4>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {kit.hookVariations.length} openers
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {kit.hookVariations.map((hook, idx) => (
                  <div
                    key={`${hook.style}-${idx}`}
                    className="rounded-xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FF006E]">
                          {hook.style}
                        </span>
                        <CopyButton text={hook.spokenHook} label="Copy" />
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                        &ldquo;{hook.spokenHook}&rdquo;
                      </p>
                    </div>
                    {hook.visualCue && (
                      <p className="pt-2.5 border-t border-zinc-200/70 dark:border-white/[0.06] text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Visual: {hook.visualCue}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          </section>
        </div>
      )}

      {/* YOUTUBE SEO TAB: Description, Chapters, Tags & Hashtags */}
      {activeTab === "seo" && (
        <div className="space-y-8">
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2.5">
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-display">
                    Description
                  </h3>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {kit.description.length} chars
                  </span>
                </div>
                <CopyButton text={kit.description} label="Copy" size="sm" />
              </div>
              <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] max-h-[66vh] overflow-y-auto">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {kit.description}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                    Chapters
                  </h4>
                  <CopyButton
                    text={buildChaptersText(kit.scenes)}
                    label="Copy"
                  />
                </div>
                <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06] rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114]">
                  {kit.scenes.map((scene) => (
                    <div
                      key={scene.sceneNumber}
                      className="px-4 py-2.5 flex items-baseline justify-between gap-3 text-xs"
                    >
                      <span className="font-semibold text-[#FF006E] tabular-nums shrink-0">
                        {(scene.timestamp || "00:00").split("-")[0].trim()}
                      </span>
                      <span className="text-zinc-800 dark:text-zinc-200 truncate flex-1">
                        {scene.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {kit.pinnedComment && (
                <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white font-display">
                      <MessageSquare className="w-3.5 h-3.5 text-[#FF006E]" />
                      <span>Pinned Comment</span>
                    </span>
                    <CopyButton text={kit.pinnedComment} label="Copy" />
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {kit.pinnedComment}
                  </p>
                </div>
              )}

              {kit.communityPost && (
                <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white font-display">
                      <Share2 className="w-3.5 h-3.5 text-[#FF006E]" />
                      <span>Community Post</span>
                    </span>
                    <CopyButton text={kit.communityPost} label="Copy" />
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                    {kit.communityPost}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 pt-2 border-t border-zinc-200/80 dark:border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-display tabular-nums">
                SEO Tags ({kit.tags.length})
              </h3>
              <CopyButton text={kit.tags.join(", ")} label="Copy All" size="sm" />
            </div>

            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {kit.tags.map((tag, idx) => {
                  const isCopied = copiedToken === tag;
                  return (
                    <button
                      key={`${tag}-${idx}`}
                      type="button"
                      onClick={() => handleCopyToken(tag)}
                      className="group px-3.5 py-2.5 rounded-xl border border-zinc-200/75 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-white/[0.03] hover:border-zinc-300 dark:hover:border-white/20 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer text-left"
                    >
                      <span className="text-zinc-800 dark:text-zinc-200 truncate">
                        {tag}
                      </span>
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-2 border-t border-zinc-200/80 dark:border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-display tabular-nums">
                Hashtags ({kit.hashtags.length})
              </h3>
              <CopyButton text={kit.hashtags.join(" ")} label="Copy All" size="sm" />
            </div>

            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {kit.hashtags.map((tag, idx) => {
                  const isCopied = copiedToken === tag;
                  return (
                    <button
                      key={`${tag}-${idx}`}
                      type="button"
                      onClick={() => handleCopyToken(tag)}
                      className="group px-3.5 py-2.5 rounded-xl border border-zinc-200/75 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-white/[0.03] hover:border-zinc-300 dark:hover:border-white/20 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer text-left"
                    >
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {tag}
                      </span>
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#111114] flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-zinc-700 dark:text-zinc-300 flex-1 min-w-0">
                {kit.hashtags.join("  ")}
              </p>
              <CopyButton text={kit.hashtags.join(" ")} label="Copy" />
            </div>
          </section>
        </div>
      )}

      {/* SCENES TAB */}
      {activeTab === "scenes" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-display">
              Scenes
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStoryboardOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Storyboard</span>
              </button>
              <button
                type="button"
                onClick={() => setTeleprompterOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200/80 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-800 dark:text-zinc-100 hover:border-[#FF006E]/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <MonitorPlay className="w-3.5 h-3.5 text-[#FF006E]" />
                <span>Teleprompter</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSrt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200/80 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Export .SRT</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadShotListCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200/80 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                <span>Shot List CSV</span>
              </button>
            </div>
          </div>

          <SceneFlowchart
            formatLabel={formatName}
            scenes={kit.scenes}
            initialSceneNumber={focusedSceneNum}
            onOpenAudio={(sceneNumber) => {
              setAudioSceneNum(sceneNumber);
              onSelectTab?.("audio");
            }}
          />
        </section>
      )}

      {/* AUDIO TAB */}
      {activeTab === "audio" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-display">
              Audio
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="TTS Model"
                value={selectedTtsModel}
                onChange={(e) => setSelectedTtsModel(e.target.value as TtsModelId)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-zinc-200/80 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                {TTS_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Narrator Voice"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value as VoiceName)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-zinc-200/80 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setTeleprompterOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200/80 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <MonitorPlay className="w-3.5 h-3.5 text-[#FF006E]" />
                <span>Teleprompter</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateAllAudio}
                disabled={batchGenerating}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
              >
                {batchGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Generate All</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-xl border border-zinc-200/80 dark:border-white/12 bg-white dark:bg-[#111114] overflow-hidden">
              <button
                type="button"
                disabled={activeAudioIndex <= 0}
                onClick={() =>
                  setAudioSceneNum(kit.scenes[activeAudioIndex - 1].sceneNumber)
                }
                aria-label="Previous track"
                className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.06] disabled:opacity-35 cursor-pointer border-r border-zinc-200/80 dark:border-white/10"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={activeAudioIndex >= kit.scenes.length - 1}
                onClick={() =>
                  setAudioSceneNum(kit.scenes[activeAudioIndex + 1].sceneNumber)
                }
                aria-label="Next track"
                className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.06] disabled:opacity-35 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAllAudio((v) => !v)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200/80 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {showAllAudio ? "Focused" : "All"}
            </button>
          </div>

          {!showAllAudio && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {kit.scenes.map((scene) => {
                const selected = scene.sceneNumber === activeAudioScene?.sceneNumber;
                const ready = Boolean(audioByScene[scene.sceneNumber]?.audioUrl);
                return (
                  <button
                    key={scene.sceneNumber}
                    type="button"
                    onClick={() => setAudioSceneNum(scene.sceneNumber)}
                    className={`flex-1 min-w-[136px] text-left rounded-xl border px-3 py-2 transition-colors cursor-pointer ${
                      selected
                        ? "border-[#FF006E]/75 bg-white dark:bg-[#17171C]"
                        : "border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#111114] hover:border-zinc-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                      <span
                        className={`font-semibold ${
                          selected
                            ? "text-[#FF006E]"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        {String(scene.sceneNumber).padStart(2, "0")}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500">
                        {ready ? "WAV" : `${scene.durationSeconds}s`}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mt-1 truncate">
                      {scene.title}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-4">
            {displayedAudioScenes.map((scene) => {
              const audioState = audioByScene[scene.sceneNumber];
              const isExpanded = Boolean(expandedAudioPrompt[scene.sceneNumber]);

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
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {scene.timestamp} · {scene.voiceStyle}
                    </span>
                  </div>

                  <div className="rounded-xl border border-zinc-200/70 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.025] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        <Mic className="w-3.5 h-3.5 text-[#FF006E]" />
                        <span>Voiceover</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CopyButton text={scene.narration} label="Copy" />
                        <button
                          type="button"
                          onClick={() => generateAudioForScene(scene)}
                          disabled={audioState?.loading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
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
                                  : `Generate (${selectedVoice})`}
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
                      <div className="pt-2.5 flex flex-wrap items-center gap-3 border-t border-zinc-200/70 dark:border-white/10">
                        <audio
                          controls
                          src={audioState.audioUrl}
                          className="h-8 flex-1 min-w-[220px]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadAudio(scene, audioState.audioUrl!)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/55 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>WAV</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-zinc-200/70 dark:border-white/10 bg-zinc-50/40 dark:bg-white/[0.02] p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        <Music className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Sound & Music</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAudioPrompt((prev) => ({
                              ...prev,
                              [scene.sceneNumber]: !prev[scene.sceneNumber],
                            }))
                          }
                          className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          {isExpanded ? "Less" : "Full"}
                        </button>
                        <CopyButton text={scene.audioPrompt} label="Copy" />
                      </div>
                    </div>
                    <p
                      className={`text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 ${
                        isExpanded ? "" : "line-clamp-3"
                      }`}
                    >
                      {scene.audioPrompt}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* PUBLISH & DISTRIBUTION TAB */}
      {activeTab === "publish" && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white font-display">
                Publish &amp; Distribution
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5">
                {readinessPassed} of {readinessChecks.length} upload checks passed
              </p>
            </div>
          </div>

          {/* Balanced 2-Column Top Grid: Checklist Left · Studio Bundle & Quick Copy Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] overflow-hidden">
              <div className="px-4 sm:px-5 py-3 border-b border-zinc-200/70 dark:border-white/[0.08] flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white font-display">
                  Upload Readiness Checklist
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {readinessPassed}/{readinessChecks.length} ready
                </span>
              </div>

              <div className="divide-y divide-zinc-200/60 dark:divide-white/[0.06]">
                {readinessChecks.map((item) => {
                  const fixTab: SectionTab =
                    item.id === "title-length" ||
                    item.id === "hooks" ||
                    item.id === "thumbnail"
                      ? "packaging"
                      : "seo";

                  return (
                    <div
                      key={item.id}
                      className="px-4 sm:px-5 py-3 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {item.status === "pass" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.label}
                          </p>
                          <p className="text-zinc-500 dark:text-zinc-400">
                            {item.detail}
                          </p>
                        </div>
                      </div>

                      {item.status === "pass" ? (
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                          Ready
                        </span>
                      ) : onSelectTab ? (
                        <button
                          type="button"
                          onClick={() => onSelectTab(fixTab)}
                          className="font-semibold text-[#FF006E] hover:underline shrink-0 cursor-pointer whitespace-nowrap"
                        >
                          Review →
                        </button>
                      ) : (
                        <span className="font-medium text-amber-600 dark:text-amber-400 shrink-0">
                          Review
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: 1-Click .ZIP Bundle + Studio Field Copy */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 sm:p-5 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white font-display">
                    Release Bundle
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Includes script, thumbnail PNG, .SRT captions, shot list CSV, and upload sheet.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownloadZipPack()}
                    disabled={zipExporting}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {zipExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Package className="w-3.5 h-3.5" />
                    )}
                    <span>{zipExporting ? "Bundling .ZIP..." : "Download .ZIP Production Pack"}</span>
                  </button>

                  <CopyButton
                    text={buildYouTubeUploadText(kit)}
                    label="Copy Full YouTube Upload Sheet"
                    size="sm"
                    className="w-full justify-center"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 sm:p-5 space-y-3">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-white font-display">
                  Quick Copy Studio Fields
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <CopyButton text={kit.primaryTitle} label="Title" className="w-full justify-center" />
                  <CopyButton text={kit.description} label="Description" className="w-full justify-center" />
                  <CopyButton text={kit.tags.join(", ")} label="SEO Tags" className="w-full justify-center" />
                  <CopyButton
                    text={kit.pinnedComment || kit.hashtags.join(" ")}
                    label={kit.pinnedComment ? "Pinned Comment" : "Hashtags"}
                    className="w-full justify-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cross-Platform Promo Pack */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                  Cross-Platform Promo Pack
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Turn this video kit into ready-to-post X threads, LinkedIn posts, Instagram captions, and email blurbs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {kit.socialPack && (
                  <CopyButton
                    text={buildSocialPackText(kit.socialPack)}
                    label="Copy All"
                  />
                )}
                <button
                  type="button"
                  onClick={() => void handleGenerateSocialPack()}
                  disabled={socialLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {socialLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{kit.socialPack ? "Regenerate Pack" : "Generate Social Pack"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {socialError && (
              <p className="text-xs text-red-600 dark:text-red-400">{socialError}</p>
            )}

            {kit.socialPack ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* X Thread */}
                <div className="rounded-xl border border-zinc-200/75 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                      X / Twitter Thread
                    </span>
                    <CopyButton
                      text={kit.socialPack.xThread.map((t, i) => `${i + 1}/ ${t}`).join("\n\n")}
                      label="Copy Thread"
                    />
                  </div>
                  <div className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {kit.socialPack.xThread.map((tweet, idx) => (
                      <p key={idx} className="pb-2 border-b last:border-b-0 last:pb-0 border-zinc-200/60 dark:border-white/[0.06]">
                        <span className="font-semibold text-[#FF006E] mr-1.5 tabular-nums">
                          {idx + 1}/
                        </span>
                        {tweet}
                      </p>
                    ))}
                  </div>
                </div>

                {/* LinkedIn Post */}
                <div className="rounded-xl border border-zinc-200/75 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                      LinkedIn Post
                    </span>
                    <CopyButton text={kit.socialPack.linkedInPost} label="Copy" />
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {kit.socialPack.linkedInPost}
                  </p>
                </div>

                {/* Instagram Caption */}
                <div className="rounded-xl border border-zinc-200/75 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                      Instagram / TikTok Caption
                    </span>
                    <CopyButton text={kit.socialPack.instagramCaption} label="Copy" />
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {kit.socialPack.instagramCaption}
                  </p>
                </div>

                {/* Newsletter Blurb */}
                <div className="rounded-xl border border-zinc-200/75 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                      Email Newsletter Blurb
                    </span>
                    <CopyButton text={kit.socialPack.newsletterBlurb} label="Copy" />
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {kit.socialPack.newsletterBlurb}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/12 p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Click &ldquo;Generate Social Pack&rdquo; to create X, LinkedIn, Instagram, and Newsletter copy from this kit.
              </div>
            )}
          </div>
        </section>
      )}

      <TeleprompterModal
        open={teleprompterOpen}
        title={kit.primaryTitle}
        sections={prompterSections}
        onClose={() => setTeleprompterOpen(false)}
      />

      <StoryboardPlayerModal
        open={storyboardOpen}
        title={kit.primaryTitle}
        scenes={kit.scenes}
        audioByScene={audioByScene}
        thumbnailUrl={liveThumbPng || previewThumbnailUrl}
        isVertical={isVertical}
        onClose={() => setStoryboardOpen(false)}
      />
    </div>
  );
}
