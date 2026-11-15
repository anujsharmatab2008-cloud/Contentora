import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Download,
  FileSpreadsheet,
  FileText,
  Film,
  Hash,
  Heading,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Moon,
  Music,
  Package,
  Play,
  Plus,
  Scissors,
  Send,
  SlidersHorizontal,
  Sun,
  Trash2,
  User,
  Video,
  Volume2,
  X,
} from "lucide-react";
import type {
  ChannelProfile,
  ChatTurn,
  ModelMode,
  ProjectStatus,
  SectionTab,
  SocialPromoPack,
  VideoFormat,
  VideoKit,
  VideoProject,
} from "./types.ts";
import { VideoKitView, buildMarkdownExport } from "./components/VideoKitView.tsx";
import { renderThumbnailPng } from "./components/ThumbnailStudio.tsx";
import { ToolsStudio } from "./components/ToolsStudio.tsx";
import { AnalyticsView } from "./components/AnalyticsView.tsx";
import { SiteDemoModal } from "./components/SiteDemoModal.tsx";
import { KitBuildingProgress } from "./components/KitBuildingProgress.tsx";
import { HeroCharacterShowcase } from "./components/HeroCharacterShowcase.tsx";
import {
  buildShotListCsv,
  buildSrtExport,
  downloadTextFile,
  exportProductionZip,
} from "./utils/creatorExports.ts";
import {
  loadActivityLog,
  recordActivityGeneration,
  saveActivityLog,
  type ActivityLog,
} from "./utils/creatorAnalytics.ts";

const STORAGE_KEY = "promptreel_projects_v1";
const THEME_KEY = "promptreel_theme_v1";
const CHANNEL_PROFILE_KEY = "contentora_channel_profile_v1";

const EMPTY_CHANNEL_PROFILE: ChannelProfile = {
  channelUrl: "",
  channelHandle: "",
  channelLogo: "",
  channelName: "",
  niche: "",
  defaultCta: "",
  descriptionFooter: "",
};

const STATUS_OPTIONS: { id: ProjectStatus; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "scripted", label: "Scripted" },
  { id: "filmed", label: "Filmed" },
  { id: "published", label: "Published" },
];

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  scripted: "Scripted",
  filmed: "Filmed",
  published: "Published",
};

const STARTER_TOPICS: {
  title: string;
  subtitle: string;
  format: VideoFormat;
}[] = [
  {
    title: "How Quantum Computers Actually Work in 2026",
    subtitle: "Explainer · 16:9 Widescreen",
    format: "explainer",
  },
  {
    title: "5 Morning Habits That Doubled My Deep Work",
    subtitle: "Shorts / Reels · 9:16 Vertical",
    format: "shorts-9-16",
  },
  {
    title: "The Hidden World of Deep-Sea Bioluminescence",
    subtitle: "Mini-Documentary · 16:9 Cinema",
    format: "documentary",
  },
  {
    title: "Why Cities Are Replacing Concrete With Sponge Parks",
    subtitle: "YouTube Essay · 16:9 Story",
    format: "youtube-16-9",
  },
  {
    title: "How One Equation Shaped Modern Computing",
    subtitle: "Explainer · 16:9 Breakdown",
    format: "explainer",
  },
  {
    title: "3 Lighting Setups for Studio-Grade Video",
    subtitle: "Shorts / Reels · 9:16 Creator Tip",
    format: "shorts-9-16",
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

type ProviderId = "gemini" | "groq" | "openrouter";

interface ModelOption {
  value: ModelMode;
  label: string;
  provider: ProviderId;
}

const PROVIDER_GROUPS: { id: ProviderId; label: string; secretHint?: string }[] = [
  { id: "gemini", label: "Gemini Free Tier (Built-in)" },
  { id: "groq", label: "Groq Free Tier", secretHint: "Add GROQ_API_KEY in Secrets" },
  { id: "openrouter", label: "OpenRouter Free Tier", secretHint: "Add OPENROUTER_API_KEY in Secrets" },
];

const MODEL_OPTIONS: ModelOption[] = [
  { value: "all-free-tier", label: "Auto · Dual Free Tier", provider: "gemini" },
  { value: "gemini-4-hydrogen", label: "Gemini 4 Hydrogen · Fast", provider: "gemini" },
  { value: "gemini-4-hydrogen-balanced", label: "Gemini 4 Hydrogen · Balanced", provider: "gemini" },
  { value: "gemini-4-hydrogen-deep", label: "Gemini 4 Hydrogen · Deep", provider: "gemini" },
  { value: "gemini-4-hydrogen-max", label: "Gemini 4 Hydrogen · Max Reasoning", provider: "gemini" },
  { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite · Instant", provider: "gemini" },
  { value: "gemini-3.1-flash-lite-think", label: "Gemini 3.1 Flash Lite · Reasoned", provider: "gemini" },
  { value: "groq:llama-3.3-70b-versatile", label: "Llama 3.3 70B · Groq Free", provider: "groq" },
  { value: "groq:llama-3.1-8b-instant", label: "Llama 3.1 8B Instant · Groq Free", provider: "groq" },
  { value: "groq:qwen/qwen3-32b", label: "Qwen 3 32B · Groq Free", provider: "groq" },
  { value: "groq:openai/gpt-oss-120b", label: "GPT-OSS 120B · Groq Free", provider: "groq" },
  { value: "openrouter:openrouter/free", label: "OpenRouter Auto · :free", provider: "openrouter" },
];

function loadProjects(): VideoProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadChannelProfile(): ChannelProfile {
  try {
    const raw = localStorage.getItem(CHANNEL_PROFILE_KEY);
    if (!raw) return EMPTY_CHANNEL_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      channelUrl: String(parsed?.channelUrl || ""),
      channelHandle: String(parsed?.channelHandle || ""),
      channelLogo: String(parsed?.channelLogo || ""),
      channelName: String(parsed?.channelName || ""),
      niche: String(parsed?.niche || ""),
      defaultCta: String(parsed?.defaultCta || ""),
      descriptionFooter: String(parsed?.descriptionFooter || ""),
    };
  } catch {
    return EMPTY_CHANNEL_PROFILE;
  }
}

function getLatestKit(proj: VideoProject): VideoKit | undefined {
  return proj.turns
    .slice()
    .reverse()
    .find((t) => t.role === "assistant" && t.kit)?.kit;
}

function formatDurationBadge(kit?: VideoKit): string {
  if (!kit) return "00:00";
  const total = kit.scenes.reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatDateShort(ts: number): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

export default function App() {
  const [projects, setProjects] = useState<VideoProject[]>(loadProjects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | "youtube" | "reels">("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | ProjectStatus>("all");

  const [activeTab, setActiveTab] = useState<SectionTab>("overview");
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved ? saved === "dark" : true;
    } catch {
      return true;
    }
  });

  const [topicInput, setTopicInput] = useState("");
  const [format, setFormat] = useState<VideoFormat>("youtube-16-9");
  const [sceneCount, setSceneCount] = useState<number>(5);
  const [tone, setTone] = useState<string>("Engaging & Clear");
  const [modelMode, setModelMode] = useState<ModelMode>("all-free-tier");
  const [providerStatus, setProviderStatus] = useState<Record<ProviderId, boolean>>({
    gemini: true,
    groq: false,
    openrouter: false,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);

  const [homePageView, setHomePageView] = useState<
    "hero" | "create" | "tools" | "community" | "analytics"
  >("hero");
  const [activityLog, setActivityLog] = useState<ActivityLog>(() =>
    loadActivityLog(loadProjects())
  );
  const [communityFilter, setCommunityFilter] = useState<"all" | "youtube" | "reels">("all");
  const [language, setLanguage] = useState<string>("English");
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState<"grid" | "calendar">("grid");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [channelProfile, setChannelProfile] = useState<ChannelProfile>(loadChannelProfile);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [channelUrlInput, setChannelUrlInput] = useState(() => loadChannelProfile().channelUrl || "");
  const [isImportingChannel, setIsImportingChannel] = useState(false);
  const [channelImportError, setChannelImportError] = useState<string | null>(null);
  const [channelExtrasOpen, setChannelExtrasOpen] = useState(false);
  const [channelLogoError, setChannelLogoError] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [copiedFullKit, setCopiedFullKit] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const handleImportChannel = async () => {
    const clean = channelUrlInput.trim();
    if (!clean || isImportingChannel) return;
    setChannelImportError(null);
    setIsImportingChannel(true);
    try {
      const response = await fetch("/api/import-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: clean }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not import YouTube channel.");
      }
      setChannelLogoError(false);
      setChannelProfile((prev) => ({
        ...prev,
        channelUrl: data.channelUrl || clean,
        channelHandle: data.channelHandle || "",
        channelLogo: data.channelLogo || "",
        channelName: data.channelName || prev.channelName,
        niche: data.niche || prev.niche,
      }));
    } catch (err) {
      setChannelImportError(
        err instanceof Error ? err.message : "Failed to load YouTube channel."
      );
      setChannelExtrasOpen(true);
    } finally {
      setIsImportingChannel(false);
    }
  };

  const openCreateStudio = () => {
    setActiveProjectId(null);
    setHistoryModalOpen(false);
    setRefineOpen(false);
    setErrorMsg(null);
    setHomePageView("create");
    setTimeout(() => composerInputRef.current?.focus(), 60);
  };

  const openToolsStudio = () => {
    setActiveProjectId(null);
    setHistoryModalOpen(false);
    setRefineOpen(false);
    setErrorMsg(null);
    setHomePageView("tools");
  };

  const openCommunityView = () => {
    setActiveProjectId(null);
    setHistoryModalOpen(false);
    setRefineOpen(false);
    setErrorMsg(null);
    setHomePageView("community");
  };

  const openAnalyticsView = () => {
    setActiveProjectId(null);
    setHistoryModalOpen(false);
    setRefineOpen(false);
    setErrorMsg(null);
    setHomePageView("analytics");
  };

  const openHeroHome = () => {
    setActiveProjectId(null);
    setHistoryModalOpen(false);
    setRefineOpen(false);
    setErrorMsg(null);
    setHomePageView("hero");
  };

  const openHistoryModal = () => {
    setHistoryModalOpen(true);
  };

  const recordGeneration = (isTool = false) => {
    setActivityLog((prev) => recordActivityGeneration(prev, { isTool }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHistoryModalOpen(false);
        setChannelModalOpen(false);
        setExportMenuOpen(false);
        setDemoModalOpen(false);
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/models")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.providers) return;
        setProviderStatus((prev) => ({ ...prev, ...data.providers }));
      })
      .catch(() => {
        // Ignore model list fetch errors on startup
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredHistory = useMemo(() => {
    return projects.filter((p) => {
      if (historyFilter === "reels" && p.format !== "shorts-9-16") return false;
      if (historyFilter === "youtube" && p.format === "shorts-9-16") return false;
      if (historyStatusFilter !== "all" && (p.status ?? "scripted") !== historyStatusFilter) {
        return false;
      }
      return true;
    });
  }, [projects, historyFilter, historyStatusFilter]);

  const thumbnailsById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const proj of projects) {
      const kit = getLatestKit(proj);
      if (kit?.thumbnail) {
        try {
          map[proj.id] = renderThumbnailPng(kit.thumbnail, proj.format === "shorts-9-16");
        } catch {
          // Ignore canvas errors
        }
      }
    }
    return map;
  }, [projects]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
    } catch {
      // Ignore storage quota errors
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // Ignore storage quota errors
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(CHANNEL_PROFILE_KEY, JSON.stringify(channelProfile));
    } catch {
      // Ignore storage quota errors
    }
  }, [channelProfile]);

  useEffect(() => {
    saveActivityLog(activityLog);
  }, [activityLog]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const latestAssistantTurn = activeProject?.turns
    .slice()
    .reverse()
    .find((t) => t.role === "assistant" && t.kit);
  const latestKit: VideoKit | undefined = latestAssistantTurn?.kit;

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab, activeProjectId]);


  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activeProjectId === id) {
        setActiveProjectId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  const handleExportJson = () => {
    if (!latestKit) return;
    const blob = new Blob([JSON.stringify(latestKit, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug = latestKit.primaryTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.download = `${slug || "video-kit"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    if (!latestKit) return;
    const md = buildMarkdownExport(latestKit);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug = latestKit.primaryTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.download = `${slug || "video-kit"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSrt = () => {
    if (!latestKit) return;
    const srt = buildSrtExport(latestKit.scenes);
    if (!srt) return;
    const slug = latestKit.primaryTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    downloadTextFile(`${slug || "video-kit"}-captions.srt`, srt, "application/x-subrip;charset=utf-8");
  };

  const handleExportCsv = () => {
    if (!latestKit) return;
    const csv = buildShotListCsv(latestKit);
    const slug = latestKit.primaryTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    downloadTextFile(`${slug || "video-kit"}-shot-list.csv`, csv, "text/csv;charset=utf-8");
  };

  const handleUpdateProjectStatus = (projectId: string, status: ProjectStatus) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status, updatedAt: Date.now() } : p))
    );
  };

  const handleUpdateProjectSchedule = (projectId: string, scheduledDate: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, scheduledDate: scheduledDate || undefined, updatedAt: Date.now() }
          : p
      )
    );
  };

  const handleSaveSocialPack = (socialPack: SocialPromoPack) => {
    if (!activeProject) return;
    const targetId = activeProject.id;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== targetId) return p;
        const lastAssistantIdx = [...p.turns]
          .reverse()
          .findIndex((t) => t.role === "assistant" && t.kit);
        if (lastAssistantIdx === -1) return p;
        const realIdx = p.turns.length - 1 - lastAssistantIdx;
        const nextTurns = p.turns.map((t, idx) =>
          idx === realIdx && t.kit ? { ...t, kit: { ...t.kit, socialPack } } : t
        );
        return { ...p, updatedAt: Date.now(), turns: nextTurns };
      })
    );
  };

  const handleExportZip = async () => {
    if (!latestKit) return;
    const thumbUrl = renderThumbnailPng(
      latestKit.thumbnail,
      latestKit.format === "shorts-9-16"
    );
    await exportProductionZip({
      kit: latestKit,
      markdownContent: buildMarkdownExport(latestKit),
      thumbnailPngUrl: thumbUrl,
    });
  };

  const handleCopyFullKit = async () => {
    if (!latestKit) return;
    const text = buildMarkdownExport(latestKit);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedFullKit(true);
    window.setTimeout(() => setCopiedFullKit(false), 1800);
  };

  const handleRepurposeToShorts = async () => {
    if (!latestKit || isRepurposing || isGenerating) return;
    setErrorMsg(null);
    setIsRepurposing(true);
    try {
      const response = await fetch("/api/repurpose-shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentKit: latestKit,
          modelMode,
          channelProfile,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to repurpose into Shorts.");
      }

      const shortKit: VideoKit = data.kit;
      const newProjectId = `proj_${Date.now()}`;
      const newProject: VideoProject = {
        id: newProjectId,
        title: shortKit.primaryTitle || `${latestKit.primaryTitle} #Shorts`,
        topic: shortKit.topic,
        format: "shorts-9-16",
        status: "scripted",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        turns: [
          {
            id: `turn_${Date.now()}_u`,
            role: "user",
            text: `Repurpose to 9:16 Shorts: ${latestKit.primaryTitle}`,
            timestamp: Date.now(),
          },
          {
            id: `turn_${Date.now()}_a`,
            role: "assistant",
            text: data.assistantMessage || "Repurposed into a 9:16 Shorts production kit.",
            timestamp: Date.now(),
            kit: shortKit,
          },
        ],
      };

      setProjects((prev) => [newProject, ...prev]);
      setActiveProjectId(newProjectId);
      setActiveTab("overview");
      recordGeneration(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to repurpose into Shorts.");
    } finally {
      setIsRepurposing(false);
    }
  };

  const submitNewTopic = async (
    overrideTopic?: string,
    overrideFormat?: VideoFormat
  ) => {
    const cleanTopic = (overrideTopic ?? topicInput).trim();
    if (!cleanTopic || isGenerating) return;

    const chosenFormat = overrideFormat ?? format;
    setErrorMsg(null);
    setIsGenerating(true);
    setActiveTab("overview");

    const projectId = `proj_${Date.now()}`;
    const userTurn: ChatTurn = {
      id: `turn_${Date.now()}_u`,
      role: "user",
      text: cleanTopic,
      timestamp: Date.now(),
    };

    const draftProject: VideoProject = {
      id: projectId,
      title: cleanTopic.slice(0, 60),
      topic: cleanTopic,
      format: chosenFormat,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      turns: [userTurn],
    };

    setProjects((prev) => [draftProject, ...prev]);
    setActiveProjectId(projectId);
    setHistoryModalOpen(false);
    setTopicInput("");

    const promptTopic =
      language !== "English"
        ? `${cleanTopic}\n\nWrite script, titles, and description in ${language}.`
        : cleanTopic;

    try {
      const response = await fetch("/api/generate-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: promptTopic,
          format: chosenFormat,
          sceneCount,
          tone,
          modelMode,
          channelProfile,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate video production kit.");
      }

      const assistantTurn: ChatTurn = {
        id: `turn_${Date.now()}_a`,
        role: "assistant",
        text: data.assistantMessage || "Here is your complete video production kit.",
        timestamp: Date.now(),
        kit: data.kit,
      };

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                title: data.kit?.primaryTitle || p.title,
                status: "scripted",
                updatedAt: Date.now(),
                turns: [...p.turns, assistantTurn],
              }
            : p
        )
      );
      recordGeneration(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  };

  const submitRefinement = async () => {
    const instruction = topicInput.trim();
    if (!instruction || !activeProject || !latestKit || isGenerating) return;

    setErrorMsg(null);
    setIsGenerating(true);

    const userTurn: ChatTurn = {
      id: `turn_${Date.now()}_u`,
      role: "user",
      text: instruction,
      timestamp: Date.now(),
    };

    const targetId = activeProject.id;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === targetId
          ? { ...p, updatedAt: Date.now(), turns: [...p.turns, userTurn] }
          : p
      )
    );
    setTopicInput("");
    setRefineOpen(false);

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentKit: latestKit,
          instruction,
          modelMode,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update video kit.");
      }

      const assistantTurn: ChatTurn = {
        id: `turn_${Date.now()}_a`,
        role: "assistant",
        text: data.assistantMessage || "Updated your video kit.",
        timestamp: Date.now(),
        kit: data.kit,
      };

      setProjects((prev) =>
        prev.map((p) =>
          p.id === targetId
            ? {
                ...p,
                title: data.kit?.primaryTitle || p.title,
                updatedAt: Date.now(),
                turns: [...p.turns, assistantTurn],
              }
            : p
        )
      );
      recordGeneration(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to refine kit.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setRefineOpen(false);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (activeProject && latestKit) {
        submitRefinement();
      } else {
        submitNewTopic();
      }
    }
  };

  const tabs: {
    id: SectionTab;
    label: string;
    count?: number;
    icon: typeof LayoutGrid;
  }[] = latestKit
    ? [
        { id: "overview", label: "Overview", icon: LayoutGrid },
        { id: "packaging", label: "Packaging", icon: ImageIcon },
        {
          id: "scenes",
          label: "Script & Scenes",
          count: latestKit.scenes.length,
          icon: Film,
        },
        {
          id: "audio",
          label: "Voice & Audio",
          count: latestKit.scenes.length,
          icon: Volume2,
        },
        { id: "seo", label: "YouTube SEO", icon: FileText },
        { id: "publish", label: "Publish", icon: Send },
      ]
    : [];

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#FAFAF9] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100">
      {/* Main Studio Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-white dark:bg-[#09090B]">
        {/* Clean 3-Zone Top Bar (Hidden in dedicated Create Studio page, shown on Hero, Tools & Workspace) */}
        {(activeProject || homePageView !== "create") && (
          <header className="h-16 px-4 sm:px-8 flex items-center justify-between gap-8 border-b border-zinc-200/80 dark:border-white/10 bg-white/95 dark:bg-[#050507]/95 backdrop-blur-md shrink-0">
            {/* Zone 1: Contentora Brand */}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                openHeroHome();
              }}
              className="inline-flex items-center gap-2.5 shrink-0 group whitespace-nowrap"
            >
              <span className="w-9 h-9 rounded-xl bg-[#FF006E]/10 border border-[#FF006E]/45 flex items-center justify-center shrink-0 transition-colors group-hover:bg-[#FF006E]/15">
                <Crown className="w-4 h-4 text-[#FF006E]" />
              </span>
              <span className="text-sm sm:text-base font-bold tracking-wider text-zinc-900 dark:text-white font-hero">
                Contentora
              </span>
            </a>

            {/* Zone 2: Clean Single-Line Navigation */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-300">
              <button
                type="button"
                onClick={openHeroHome}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 ${
                  !activeProject && homePageView === "hero" && !historyModalOpen
                    ? "text-zinc-900 dark:text-white border-[#FF006E]"
                    : "border-transparent hover:text-zinc-900 dark:hover:text-white hover:border-[#FF006E]"
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={openToolsStudio}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 ${
                  !activeProject && homePageView === "tools" && !historyModalOpen
                    ? "text-zinc-900 dark:text-white border-[#FF006E]"
                    : "border-transparent hover:text-zinc-900 dark:hover:text-white hover:border-[#FF006E]"
                }`}
              >
                Tools
              </button>
              <button
                type="button"
                onClick={openCommunityView}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 ${
                  !activeProject && homePageView === "community" && !historyModalOpen
                    ? "text-zinc-900 dark:text-white border-[#FF006E]"
                    : "border-transparent hover:text-zinc-900 dark:hover:text-white hover:border-[#FF006E]"
                }`}
              >
                Community
              </button>
              <button
                type="button"
                onClick={openAnalyticsView}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 ${
                  !activeProject && homePageView === "analytics" && !historyModalOpen
                    ? "text-zinc-900 dark:text-white border-[#FF006E]"
                    : "border-transparent hover:text-zinc-900 dark:hover:text-white hover:border-[#FF006E]"
                }`}
              >
                Analytics
              </button>
              <button
                type="button"
                onClick={openHistoryModal}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 ${
                  historyModalOpen
                    ? "text-zinc-900 dark:text-white border-[#FF006E]"
                    : "border-transparent hover:text-zinc-900 dark:hover:text-white hover:border-[#FF006E]"
                }`}
              >
                History
              </button>
            </nav>

            {/* Zone 3: Theme Switch + Primary Action */}
            <div className="flex items-center gap-2.5 shrink-0">
              <select
                id="model-select"
                aria-label="Model"
                value={modelMode}
                onChange={(e) => setModelMode(e.target.value as ModelMode)}
                className="hidden lg:inline-flex max-w-[230px] px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-[#141418] text-zinc-700 dark:text-zinc-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF006E]/35"
              >
                {PROVIDER_GROUPS.map((group) => {
                  const groupOpts = MODEL_OPTIONS.filter((m) => m.provider === group.id);
                  const ready = providerStatus[group.id];
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

              <button
                type="button"
                onClick={() => setDarkMode((v) => !v)}
                aria-label={darkMode ? "Switch to Light theme" : "Switch to Dark theme"}
                className="inline-flex items-center justify-center p-2 rounded-lg border border-zinc-200 dark:border-white/15 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannelImportError(null);
                  setChannelModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-white/15 bg-white dark:bg-white/[0.04] text-zinc-900 dark:text-white hover:border-[#FF006E] transition-colors whitespace-nowrap shrink-0 cursor-pointer max-w-[190px]"
              >
                {channelProfile.channelLogo && !channelLogoError ? (
                  <img
                    src={channelProfile.channelLogo}
                    alt={channelProfile.channelName || "Channel"}
                    referrerPolicy="no-referrer"
                    onError={() => setChannelLogoError(true)}
                    className="w-4 h-4 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <User className="w-3.5 h-3.5 text-[#FF006E] shrink-0" />
                )}
                <span className="truncate">
                  {channelProfile.channelName.trim() || "Connect YouTube"}
                </span>
              </button>
            </div>
          </header>
        )}

        {/* Main Studio Viewport (No scroll on hero/create/tools desktop, scrollable on Community, Analytics & active project) */}
        <main
          ref={mainScrollRef}
          className={
            !activeProject &&
            homePageView !== "tools" &&
            homePageView !== "community" &&
            homePageView !== "analytics"
              ? "flex-1 overflow-hidden"
              : !activeProject && homePageView === "tools"
              ? "flex-1 overflow-y-auto lg:overflow-hidden"
              : "flex-1 overflow-y-auto"
          }
        >
          {!activeProject && homePageView === "analytics" ? (
            <AnalyticsView
              projects={projects}
              activityLog={activityLog}
              onCreateProject={openCreateStudio}
              onOpenTools={openToolsStudio}
              onOpenProject={(projectId) => {
                setActiveProjectId(projectId);
                setActiveTab("overview");
                setErrorMsg(null);
              }}
              onFilterHistoryByStatus={(status) => {
                setHistoryStatusFilter(status);
                setHistoryViewMode("grid");
                setHistoryModalOpen(true);
              }}
            />
          ) : !activeProject && homePageView === "tools" ? (
            <ToolsStudio
              modelMode={modelMode}
              onChangeModelMode={setModelMode}
              modelOptions={MODEL_OPTIONS}
              providerStatus={providerStatus}
              channelName={channelProfile.channelName}
              channelLogo={channelProfile.channelLogo}
              channelProfile={channelProfile}
              onToolGenerated={() => recordGeneration(true)}
              onBuildKitFromTopic={(topic, chosenFmt) => {
                setFormat(chosenFmt);
                void submitNewTopic(topic, chosenFmt);
              }}
            />
          ) : !activeProject && homePageView === "community" ? (
            <section className="relative min-h-full bg-[#FAFAF9] dark:bg-[#09090B] py-7 sm:py-9 px-4 sm:px-8">
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-display">
                      Creator Community
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                      Starter video concepts. Open in studio to customize or build a full kit.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#111114] border border-zinc-200/80 dark:border-white/[0.08]">
                    {(
                      [
                        { id: "all", label: "All" },
                        { id: "youtube", label: "YouTube 16:9" },
                        { id: "reels", label: "Shorts / Reels" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCommunityFilter(f.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                          communityFilter === f.id
                            ? "bg-white dark:bg-white/[0.08] text-zinc-900 dark:text-white border border-zinc-200/70 dark:border-white/10"
                            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-transparent"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {STARTER_TOPICS.filter((item) => {
                    if (communityFilter === "reels") return item.format === "shorts-9-16";
                    if (communityFilter === "youtube") return item.format !== "shorts-9-16";
                    return true;
                  }).map((item) => {
                    const isReels = item.format === "shorts-9-16";
                    return (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] hover:border-zinc-300 dark:hover:border-white/20 p-5 flex flex-col justify-between gap-4 transition-colors"
                      >
                        <div className="space-y-2.5">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10">
                            {isReels ? "Shorts / Reels 9:16" : "YouTube 16:9"}
                          </span>
                          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white leading-snug font-display">
                            {item.title}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {item.subtitle}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-zinc-200/70 dark:border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => {
                              setFormat(item.format);
                              setTopicInput(item.title);
                              openCreateStudio();
                            }}
                            className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/12 bg-zinc-50 dark:bg-white/[0.04] text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Open in Studio
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormat(item.format);
                              submitNewTopic(item.title, item.format);
                            }}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Build Kit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : !activeProject && homePageView === "create" ? (
            /* DEDICATED FULL-SCREEN NON-SCROLLABLE CREATE STUDIO PAGE */
            <section className="relative overflow-hidden h-full flex flex-col bg-[#FAFAF9] dark:bg-[#050507]">
              {/* Matching Obsidian Grid + Left Magenta Spotlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,0,110,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,0,110,0.05)_1px,transparent_1px)] bg-[size:48px_48px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_52%,rgba(255,0,110,0.22),rgba(255,0,110,0.06)_36%,transparent_66%)]"
              />

              {/* Top Floating Back + History Pills */}
              <div className="relative w-full px-6 sm:px-10 pt-5 flex items-center justify-between gap-4 shrink-0">
                <button
                  type="button"
                  onClick={openHeroHome}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 dark:border-white/15 bg-white/80 dark:bg-white/[0.04] hover:border-[#FF006E]/60 text-xs font-medium text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={openHistoryModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 dark:border-white/15 bg-white/80 dark:bg-white/[0.04] hover:border-[#FF006E]/60 text-xs font-medium text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer whitespace-nowrap tabular-nums"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>History{projects.length > 0 ? ` (${projects.length})` : ""}</span>
                </button>
              </div>

              {/* 2-Column Centered Stage: Mascot Left + Prompt Studio Right */}
              <div className="relative flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-8 lg:px-10 pb-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Character Visual */}
                <div className="hidden lg:flex lg:col-span-5 items-center justify-center relative h-full min-h-0">
                  <div className="relative flex items-center justify-center h-full max-h-[calc(100vh-7rem)]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-4 inset-y-8 rounded-full bg-[#FF006E]/25 blur-3xl pointer-events-none"
                    />
                    <img
                      src="/assets/aistudio/anime-boy-full_852c18f5.png"
                      alt="Contentora creator mascot"
                      referrerPolicy="no-referrer"
                      className="relative h-full max-h-[560px] w-auto object-contain select-none drop-shadow-[0_0_32px_rgba(255,0,110,0.3)]"
                    />
                  </div>
                </div>

                {/* Right Prompt Studio Box */}
                <div className="lg:col-span-7 space-y-4">
                  <h1 className="font-hero text-xl sm:text-2xl lg:text-[1.85rem] font-bold tracking-wide text-zinc-900 dark:text-white">
                    Got an Idea? Let&apos;s Make It Happen.
                  </h1>

                  <div className="rounded-2xl border border-zinc-300 dark:border-white/15 focus-within:border-[#FF006E]/80 bg-white dark:bg-[#0D0D11] shadow-xl p-4 sm:p-5 flex flex-col justify-between min-h-[215px] gap-4 transition-colors">
                    {/* Prompt Textarea + Top-Right Platform Selector */}
                    <div className="flex items-start justify-between gap-4 flex-1">
                      <textarea
                        ref={composerInputRef}
                        rows={4}
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        placeholder="Describe your video idea... (e.g. 'How a jet engine works in 60 seconds')"
                        className="flex-1 resize-none bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none leading-relaxed"
                      />

                      <select
                        aria-label="Video Format"
                        value={format}
                        onChange={(e) => setFormat(e.target.value as VideoFormat)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-white/12 bg-zinc-50 dark:bg-[#15151A] text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF006E]/35 shrink-0"
                      >
                        {FORMAT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Bottom Controls Strip Inside Prompt Box */}
                    <div className="rounded-xl bg-zinc-100/90 dark:bg-[#141419] border border-zinc-200/80 dark:border-white/[0.08] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label="Language"
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1B1B21] text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none"
                        >
                          {["English", "Hindi", "Spanish", "French"].map((lang) => (
                            <option key={lang} value={lang}>
                              {lang}
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label="Tone"
                          value={tone}
                          onChange={(e) => setTone(e.target.value)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1B1B21] text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none"
                        >
                          {TONE_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label="Scene Count"
                          value={sceneCount}
                          onChange={(e) => setSceneCount(Number(e.target.value))}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1B1B21] text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none tabular-nums"
                        >
                          {[4, 5, 6, 8].map((n) => (
                            <option key={n} value={n}>
                              {n} Scenes
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label="Engine Model"
                          value={modelMode}
                          onChange={(e) => setModelMode(e.target.value as ModelMode)}
                          className="max-w-[215px] px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1B1B21] text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none"
                        >
                          {PROVIDER_GROUPS.map((group) => {
                            const groupOpts = MODEL_OPTIONS.filter((m) => m.provider === group.id);
                            const ready = providerStatus[group.id];
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

                      <button
                        type="button"
                        aria-label="Generate Video Kit"
                        onClick={() => submitNewTopic()}
                        disabled={!topicInput.trim() || isGenerating}
                        className="p-2 rounded-lg text-[#FF006E] hover:bg-[#FF006E] hover:text-white transition-colors disabled:opacity-35 cursor-pointer shrink-0"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : !activeProject ? (
            /* Single-Viewport Non-Scrollable Contentora Homepage */
            <section
              id="hero-top"
              className="relative overflow-hidden h-full flex flex-col justify-between bg-[#FAFAF9] dark:bg-[#050507]"
            >
              {/* Exact Deep Obsidian Grid + Magenta Studio Glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,0,110,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,0,110,0.05)_1px,transparent_1px)] bg-[size:48px_48px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_48%,rgba(255,0,110,0.26),rgba(255,0,110,0.08)_36%,transparent_66%)]"
              />

              <div className="relative flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-8 lg:px-10 py-4 lg:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left Hero Copy */}
                <div className="lg:col-span-7 space-y-5">
                  <span className="inline-block px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-white/15 bg-white/80 dark:bg-white/[0.03] text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    AI-Powered Creative Studio
                  </span>

                  <h1 className="font-hero uppercase tracking-wide text-2xl sm:text-4xl lg:text-[2.55rem] xl:text-[2.9rem] font-extrabold leading-[1.15] text-zinc-900 dark:text-white">
                    <span className="block sm:whitespace-nowrap">JUST PROMPT & GET</span>
                    <span className="block sm:whitespace-nowrap">
                      YOUR{" "}
                      <span className="italic text-[#FF006E] drop-shadow-[0_0_24px_rgba(255,0,110,0.5)] pr-2">
                        COMPLETE
                      </span>{" "}
                      SCRIPT!
                    </span>
                  </h1>

                  <p className="text-sm sm:text-[15px] text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed pl-4 border-l-2 border-[#FF006E]">
                    Enter a simple prompt and get your entire package — script with audio, video prompt, image prompt, thumbnail, description, tags, music & sound prompt, all in one place.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <button
                      type="button"
                      onClick={openCreateStudio}
                      className="btn-chamfer inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold bg-[#FF006E] hover:bg-[#ff1b7d] text-white shadow-[0_0_30px_rgba(255,0,110,0.45)] transition-all cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>Unleash Your Idea</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDemoModalOpen(true)}
                      className="btn-chamfer inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border border-zinc-300 dark:border-white/25 bg-white/80 dark:bg-white/[0.03] text-zinc-900 dark:text-white hover:border-[#FF006E] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Play className="w-4 h-4 text-[#FF006E] fill-current" />
                      <span>Demo</span>
                    </button>
                  </div>
                </div>

                {/* Right Hero Character Visual with Glossy Floating Platform Cards */}
                <div className="hidden lg:flex lg:col-span-5 items-center justify-center relative h-full min-h-0">
                  <HeroCharacterShowcase
                    onSelectPlatform={(chosenFormat) => {
                      setFormat(chosenFormat);
                      openCreateStudio();
                    }}
                  />
                </div>
              </div>

              {/* Bottom Deliverable Strip (Exact 7-item icon strip) */}
              <div
                id="deliverables-bar"
                className="relative border-t border-zinc-200/80 dark:border-white/10 bg-white/75 dark:bg-[#050507]/95 backdrop-blur-sm shrink-0"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-3.5 flex items-center justify-between gap-4 overflow-x-auto">
                  {(
                    [
                      { label: "Title", icon: Heading, tab: "packaging" as SectionTab },
                      { label: "Description", icon: AlignLeft, tab: "seo" as SectionTab },
                      { label: "Tags", icon: Hash, tab: "seo" as SectionTab },
                      { label: "Thumbnail", icon: ImageIcon, tab: "packaging" as SectionTab },
                      { label: "Photo Prompt", icon: Camera, tab: "packaging" as SectionTab },
                      { label: "Video Prompt", icon: Video, tab: "scenes" as SectionTab },
                      { label: "Audio Prompt", icon: Music, tab: "audio" as SectionTab },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          if (projects.length > 0) {
                            const firstWithKit = projects.find((p) => getLatestKit(p));
                            if (firstWithKit) {
                              setActiveProjectId(firstWithKit.id);
                              setActiveTab(item.tab);
                              return;
                            }
                          }
                          openCreateStudio();
                        }}
                        className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
                      >
                        <span className="w-8 h-8 rounded-lg border border-[#FF006E]/35 bg-[#FF006E]/10 text-[#FF006E] flex items-center justify-center group-hover:bg-[#FF006E] group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : (
            /* Active Project Workspace (Full-Width Clean 5-Stage Studio) */
            <div className="min-h-full bg-[#FAFAF9] dark:bg-[#09090B]">
              <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 pt-6 pb-14 space-y-6">
                {latestKit && activeProject && (
                  <div className="space-y-4">
                    {/* Top Row: Breadcrumb + Metadata Left · Clean Actions Right */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5 min-w-0 text-xs text-zinc-500 dark:text-zinc-400">
                        <button
                          type="button"
                          onClick={openHistoryModal}
                          className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-200 hover:text-[#FF006E] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Projects</span>
                        </button>
                        <span aria-hidden="true">·</span>
                        {channelProfile.channelName.trim() && (
                          <>
                            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-200">
                              {channelProfile.channelLogo && !channelLogoError && (
                                <img
                                  src={channelProfile.channelLogo}
                                  alt={channelProfile.channelName}
                                  referrerPolicy="no-referrer"
                                  onError={() => setChannelLogoError(true)}
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                              )}
                              <span>{channelProfile.channelName.trim()}</span>
                            </span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span className="tabular-nums whitespace-nowrap">
                          {latestKit.format === "shorts-9-16" ? "Shorts 9:16" : "YouTube 16:9"} ·{" "}
                          {latestKit.scenes.length} scenes · {formatDurationBadge(latestKit)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#141418] text-xs text-zinc-700 dark:text-zinc-200">
                          <span className="text-zinc-400 dark:text-zinc-500 font-medium whitespace-nowrap">
                            Status
                          </span>
                          <select
                            id="project-status-select"
                            aria-label="Project status"
                            value={activeProject.status ?? "scripted"}
                            onChange={(e) =>
                              handleUpdateProjectStatus(
                                activeProject.id,
                                e.target.value as ProjectStatus
                              )
                            }
                            className="bg-transparent font-semibold text-zinc-900 dark:text-white cursor-pointer focus:outline-none"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option
                                key={opt.id}
                                value={opt.id}
                                className="bg-white dark:bg-[#141418] text-zinc-900 dark:text-white"
                              >
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#141418] text-xs text-zinc-700 dark:text-zinc-200">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <input
                            id="project-schedule-date"
                            type="date"
                            aria-label="Upload date"
                            value={activeProject.scheduledDate || ""}
                            onChange={(e) =>
                              handleUpdateProjectSchedule(activeProject.id, e.target.value)
                            }
                            className="bg-transparent text-xs font-medium text-zinc-800 dark:text-zinc-100 focus:outline-none tabular-nums cursor-pointer"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => setRefineOpen((v) => !v)}
                          className={`inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            refineOpen
                              ? "border-[#FF006E] bg-[#FF006E] text-white"
                              : "border-zinc-200 dark:border-white/12 bg-white dark:bg-[#141418] text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60"
                          }`}
                        >
                          <SlidersHorizontal
                            className={`w-3.5 h-3.5 ${refineOpen ? "text-white" : "text-[#FF006E]"}`}
                          />
                          <span>Refine</span>
                        </button>

                        {latestKit.format !== "shorts-9-16" && (
                          <button
                            type="button"
                            onClick={handleRepurposeToShorts}
                            disabled={isRepurposing || isGenerating}
                            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#141418] text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60 hover:text-[#FF006E] transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {isRepurposing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF006E]" />
                            ) : (
                              <Scissors className="w-3.5 h-3.5 text-[#FF006E]" />
                            )}
                            <span>{isRepurposing ? "Repurposing..." : "To Shorts"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={openCreateStudio}
                          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#141418] text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New</span>
                        </button>

                        {/* Clean Single Export Dropdown */}
                        <div className="relative" ref={exportMenuRef}>
                          <button
                            type="button"
                            onClick={() => setExportMenuOpen((v) => !v)}
                            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold rounded-lg bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-90" />
                          </button>

                          {exportMenuOpen && (
                            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#121216] shadow-xl p-1.5 z-30 space-y-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setExportMenuOpen(false);
                                  void handleExportZip();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-semibold text-zinc-900 dark:text-white hover:bg-[#FF006E]/10 hover:text-[#FF006E] transition-colors cursor-pointer"
                              >
                                <Package className="w-3.5 h-3.5 text-[#FF006E] shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div>Download .ZIP Pack</div>
                                  <div className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">
                                    All files, thumbnail &amp; captions
                                  </div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleCopyFullKit()}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                              >
                                {copiedFullKit ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                )}
                                <span>{copiedFullKit ? "Copied Full Kit" : "Copy Full Kit"}</span>
                              </button>

                              <div className="my-1 border-t border-zinc-200/70 dark:border-white/[0.08]" />

                              <button
                                type="button"
                                onClick={() => {
                                  setExportMenuOpen(false);
                                  handleExportSrt();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>Subtitles (.SRT)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setExportMenuOpen(false);
                                  handleExportCsv();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>Shot List (.CSV)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setExportMenuOpen(false);
                                  handleExportMarkdown();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>Script &amp; Kit (.MD)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setExportMenuOpen(false);
                                  handleExportJson();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>Raw JSON (.JSON)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Clean Project Title */}
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white leading-snug text-balance font-display">
                      {latestKit.primaryTitle}
                    </h1>

                    {/* 5-Stage Workflow Tabs */}
                    <div
                      role="tablist"
                      aria-label="Production workflow stages"
                      className="flex items-center gap-1 border-b border-zinc-200/80 dark:border-white/[0.08] overflow-x-auto"
                    >
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer -mb-px ${
                              active
                                ? "border-[#FF006E] text-zinc-900 dark:text-white"
                                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                            }`}
                          >
                            <Icon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                active ? "text-[#FF006E]" : "text-zinc-400 dark:text-zinc-500"
                              }`}
                            />
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                              <span
                                className={`text-[11px] tabular-nums ${
                                  active
                                    ? "text-[#FF006E]"
                                    : "text-zinc-400 dark:text-zinc-500"
                                }`}
                              >
                                {tab.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <KitBuildingProgress
                    topic={activeProject?.topic}
                    formatLabel={
                      FORMAT_OPTIONS.find((f) => f.value === (activeProject?.format ?? format))
                        ?.label
                    }
                    sceneCount={sceneCount}
                  />
                )}

                {errorMsg && (
                  <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-4">
                    <span>{errorMsg}</span>
                    <button
                      type="button"
                      onClick={() => setErrorMsg(null)}
                      className="text-xs font-medium underline cursor-pointer shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {latestKit && (
                  <VideoKitView
                    kit={latestKit}
                    activeTab={activeTab}
                    onSelectTab={setActiveTab}
                    channelName={channelProfile.channelName}
                    channelLogo={channelProfile.channelLogo}
                    channelProfile={channelProfile}
                    modelMode={modelMode}
                    onRepurposeToShorts={
                      latestKit.format !== "shorts-9-16" ? handleRepurposeToShorts : undefined
                    }
                    isRepurposing={isRepurposing}
                    onSaveSocialPack={handleSaveSocialPack}
                    onContentGenerated={() => recordGeneration(false)}
                  />
                )}
              </div>
            </div>
          )}
        </main>

        {/* On-Demand Refine Popover */}
        {activeProject && refineOpen && (
          <div className="fixed bottom-6 right-6 z-40">
            <div className="w-[330px] sm:w-[360px] rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#111114] shadow-2xl overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-zinc-200 dark:border-white/[0.08] flex items-center justify-between gap-2 bg-stone-50/90 dark:bg-[#0C0C0F]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF006E]" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Edit Project
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRefineOpen(false)}
                  aria-label="Close popup"
                  className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Punchier hook",
                    "Add 2 scenes",
                    "Shorter pacing",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setTopicInput((prev) =>
                          prev.trim() ? `${prev.trim()}, ${preset.toLowerCase()}` : preset
                        )
                      }
                      className="px-2 py-1 rounded-md border border-zinc-200 dark:border-white/12 bg-stone-50 dark:bg-white/[0.04] text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:border-[#FF006E]/60 hover:text-[#FF006E] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  autoFocus
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="What should be updated?"
                  className="w-full resize-none rounded-xl border border-zinc-200 dark:border-white/12 bg-stone-50/70 dark:bg-[#07060A] px-3 py-2 text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#FF006E]"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={submitRefinement}
                    disabled={!topicInput.trim() || isGenerating || !latestKit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF006E] hover:bg-[#ff1b7d] text-white text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating</span>
                      </>
                    ) : (
                      <>
                        <span>Apply</span>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ON-DEMAND PROJECT HISTORY MODAL */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setHistoryModalOpen(false)}
          />
          <div className="relative w-full max-w-4xl max-h-[84vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#0B0A0F] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#FF006E]" />
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white font-display">
                  Project History
                </h2>
                <span className="text-xs text-zinc-400 tabular-nums">
                  ({projects.length})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {projects.length > 0 && (
                  <>
                    <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode("grid")}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                          historyViewMode === "grid"
                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        <LayoutGrid className="w-3 h-3" />
                        <span>Grid</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode("calendar")}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                          historyViewMode === "calendar"
                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Calendar</span>
                      </button>
                    </div>

                    <select
                      aria-label="Filter by status"
                      value={historyStatusFilter}
                      onChange={(e) =>
                        setHistoryStatusFilter(e.target.value as "all" | ProjectStatus)
                      }
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 cursor-pointer focus:outline-none"
                    >
                      <option value="all">All Statuses</option>
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-white/10">
                      {(
                        [
                          { id: "all", label: "All" },
                          { id: "youtube", label: "YouTube 16:9" },
                          { id: "reels", label: "Reels / Shorts" },
                        ] as const
                      ).map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setHistoryFilter(filter.id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                            historyFilter === filter.id
                              ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs"
                              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(false)}
                  aria-label="Close history modal"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {filteredHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/15 p-10 text-center space-y-2">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {projects.length === 0 ? "No projects yet" : "No projects match this filter"}
                  </p>
                  <button
                    type="button"
                    onClick={openCreateStudio}
                    className="btn-chamfer inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#FF006E] text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Project</span>
                  </button>
                </div>
              ) : historyViewMode === "calendar" ? (
                (() => {
                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();
                  const monthLabel = calendarMonth.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  });
                  const firstWeekday = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const cells: (number | null)[] = [
                    ...Array.from({ length: firstWeekday }, () => null),
                    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
                  ];
                  const unscheduled = filteredHistory.filter((p) => !p.scheduledDate);

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                          {monthLabel}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(new Date(year, month - 1, 1))
                            }
                            aria-label="Previous month"
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/12 text-zinc-600 dark:text-zinc-300 hover:border-[#FF006E]/60 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                            }}
                            className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/12 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60 cursor-pointer"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(new Date(year, month + 1, 1))
                            }
                            aria-label="Next month"
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/12 text-zinc-600 dark:text-zinc-300 hover:border-[#FF006E]/60 cursor-pointer"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 text-center">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                          <div key={d} className="py-1">
                            {d}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1.5">
                        {cells.map((day, idx) => {
                          if (day === null) {
                            return (
                              <div
                                key={`empty-${idx}`}
                                className="min-h-[82px] rounded-lg bg-zinc-50/40 dark:bg-white/[0.01]"
                              />
                            );
                          }
                          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                            day
                          ).padStart(2, "0")}`;
                          const dayProjects = filteredHistory.filter(
                            (p) => p.scheduledDate === iso
                          );
                          return (
                            <div
                              key={iso}
                              className="min-h-[82px] rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#121118] p-1.5 space-y-1"
                            >
                              <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                                {day}
                              </span>
                              {dayProjects.map((dp) => (
                                <button
                                  key={dp.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveProjectId(dp.id);
                                    setActiveTab("overview");
                                    setErrorMsg(null);
                                    setHistoryModalOpen(false);
                                  }}
                                  className="w-full text-left px-1.5 py-1 rounded bg-[#FF006E]/12 border border-[#FF006E]/35 text-[10px] font-semibold text-zinc-900 dark:text-white truncate hover:bg-[#FF006E]/20 cursor-pointer"
                                  title={`${dp.title} (${STATUS_LABELS[dp.status ?? "scripted"]})`}
                                >
                                  {dp.title}
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>

                      {unscheduled.length > 0 && (
                        <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.08] space-y-2">
                          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                            Unscheduled Videos ({unscheduled.length}) — set an Upload Date in the workspace sidebar to place them on the calendar:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {unscheduled.map((up) => (
                              <button
                                key={up.id}
                                type="button"
                                onClick={() => {
                                  setActiveProjectId(up.id);
                                  setActiveTab("overview");
                                  setErrorMsg(null);
                                  setHistoryModalOpen(false);
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-white/12 bg-zinc-50 dark:bg-[#141418] hover:border-[#FF006E]/60 text-xs text-zinc-800 dark:text-zinc-200 truncate max-w-[240px] cursor-pointer"
                              >
                                {up.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredHistory.map((proj) => {
                    const kit = getLatestKit(proj);
                    const thumbUrl = thumbnailsById[proj.id];
                    const isReels = proj.format === "shorts-9-16";
                    return (
                      <div
                        key={proj.id}
                        onClick={() => {
                          setActiveProjectId(proj.id);
                          setActiveTab("overview");
                          setErrorMsg(null);
                          setHistoryModalOpen(false);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setActiveProjectId(proj.id);
                            setActiveTab("overview");
                            setErrorMsg(null);
                            setHistoryModalOpen(false);
                          }
                        }}
                        className="group rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#121118] hover:border-[#FF006E]/60 overflow-hidden transition-all cursor-pointer flex flex-col"
                      >
                        <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                          {thumbUrl ? (
                            <div
                              className={
                                isReels
                                  ? "w-full h-full flex items-center justify-center bg-zinc-950 py-1.5"
                                  : "w-full h-full"
                              }
                            >
                              <img
                                src={thumbUrl}
                                alt={proj.title}
                                referrerPolicy="no-referrer"
                                className={
                                  isReels
                                    ? "h-full w-auto aspect-[9/16] object-cover rounded"
                                    : "w-full h-full object-cover"
                                }
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                              <Film className="w-6 h-6" />
                            </div>
                          )}

                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-white/10 text-[10px] font-medium text-white">
                            {isReels ? "Reels 9:16" : "YouTube 16:9"}
                          </span>

                          {kit && (
                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-medium tabular-nums">
                              {formatDurationBadge(kit)}
                            </span>
                          )}
                        </div>

                        <div className="p-3 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                              {kit?.primaryTitle || proj.title}
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                              {STATUS_LABELS[proj.status ?? "scripted"]}
                              {proj.scheduledDate ? ` · ${proj.scheduledDate}` : ""}
                              {kit ? ` · ${kit.scenes.length} scenes` : ""} ·{" "}
                              {formatDateShort(proj.updatedAt)}
                            </p>
                          </div>

                          <button
                            type="button"
                            aria-label={`Delete ${proj.title}`}
                            onClick={(e) => handleDeleteProject(proj.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-[#FF006E] transition-opacity cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHANNEL BRANDING PRESET MODAL */}
      {channelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setChannelModalOpen(false)}
          />
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#0B0A0F] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-[#FF006E]" />
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white font-display">
                  Channel Brand Kit
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setChannelModalOpen(false)}
                aria-label="Close channel kit modal"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Primary 1-Line YouTube Channel Importer */}
              <div className="space-y-2">
                <label
                  htmlFor="youtube-channel-url-input"
                  className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                >
                  Paste YouTube Channel Link or @handle
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="youtube-channel-url-input"
                    type="text"
                    value={channelUrlInput}
                    onChange={(e) => setChannelUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleImportChannel();
                      }
                    }}
                    placeholder="https://youtube.com/@mkbhd or @handle"
                    className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-white/12 bg-zinc-50 dark:bg-[#141419] text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF006E]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleImportChannel()}
                    disabled={!channelUrlInput.trim() || isImportingChannel}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF006E] hover:bg-[#e10062] text-xs font-semibold text-white transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isImportingChannel ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>Import</span>
                    )}
                  </button>
                </div>
                {channelImportError && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {channelImportError}
                  </p>
                )}
              </div>

              {/* Imported Channel Preview Card */}
              {(channelProfile.channelName || channelProfile.channelLogo) && (
                <div className="rounded-xl border border-zinc-200/85 dark:border-white/10 bg-zinc-50/80 dark:bg-[#141419] p-3.5 flex items-center gap-3.5">
                  {channelProfile.channelLogo && !channelLogoError ? (
                    <img
                      src={channelProfile.channelLogo}
                      alt={channelProfile.channelName || "Channel logo"}
                      referrerPolicy="no-referrer"
                      onError={() => setChannelLogoError(true)}
                      className="w-12 h-12 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-white/15 bg-zinc-900"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full shrink-0 bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-white flex items-center justify-center text-sm font-bold">
                      {((channelProfile.channelName || "C").trim()[0] || "C").toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white truncate font-display">
                      {channelProfile.channelName || "Your Channel"}
                    </p>
                    {channelProfile.channelHandle && (
                      <p className="text-[11px] text-[#FF006E] font-medium truncate">
                        {channelProfile.channelHandle}
                      </p>
                    )}
                    {channelProfile.niche && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {channelProfile.niche}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Optional Collapsible Extras (CTA, Description Links, Manual Override) */}
              <div className="border-t border-zinc-200/70 dark:border-white/[0.08] pt-3">
                <button
                  type="button"
                  onClick={() => setChannelExtrasOpen((v) => !v)}
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-[#FF006E] transition-colors cursor-pointer"
                >
                  {channelExtrasOpen
                    ? "Hide manual details & CTA links ↑"
                    : "Optional: Edit name, niche, CTA or description links →"}
                </button>

                {channelExtrasOpen && (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="channel-name-input"
                        className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        Channel Name
                      </label>
                      <input
                        id="channel-name-input"
                        type="text"
                        value={channelProfile.channelName}
                        onChange={(e) =>
                          setChannelProfile((prev) => ({
                            ...prev,
                            channelName: e.target.value,
                          }))
                        }
                        placeholder="e.g. Studio Mechanics"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-white/12 bg-zinc-50 dark:bg-[#141419] text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF006E]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="channel-niche-input"
                        className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        Niche & Audience
                      </label>
                      <input
                        id="channel-niche-input"
                        type="text"
                        value={channelProfile.niche}
                        onChange={(e) =>
                          setChannelProfile((prev) => ({ ...prev, niche: e.target.value }))
                        }
                        placeholder="e.g. Fast-paced science & hardware explainers"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-white/12 bg-zinc-50 dark:bg-[#141419] text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF006E]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="channel-cta-input"
                        className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        Default Call-to-Action
                      </label>
                      <input
                        id="channel-cta-input"
                        type="text"
                        value={channelProfile.defaultCta}
                        onChange={(e) =>
                          setChannelProfile((prev) => ({
                            ...prev,
                            defaultCta: e.target.value,
                          }))
                        }
                        placeholder="e.g. Subscribe for weekly visual breakdowns"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-white/12 bg-zinc-50 dark:bg-[#141419] text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF006E]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          htmlFor="channel-footer-input"
                          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                        >
                          Auto-Append Description Links / Footer
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[
                            {
                              label: "+ Socials",
                              snippet: "Follow on Instagram & X: @yourhandle",
                            },
                            {
                              label: "+ Gear",
                              snippet: "My Studio Gear & Desk Setup: https://kit.co/yourhandle",
                            },
                            {
                              label: "+ Sponsor",
                              snippet: "Business & Sponsorships: business@yourchannel.com",
                            },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() =>
                                setChannelProfile((prev) => ({
                                  ...prev,
                                  descriptionFooter: prev.descriptionFooter.trim()
                                    ? `${prev.descriptionFooter.trim()}\n${preset.snippet}`
                                    : preset.snippet,
                                }))
                              }
                              className="px-2 py-0.5 rounded border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] hover:border-[#FF006E]/60 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer whitespace-nowrap"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        id="channel-footer-input"
                        rows={3}
                        value={channelProfile.descriptionFooter}
                        onChange={(e) =>
                          setChannelProfile((prev) => ({
                            ...prev,
                            descriptionFooter: e.target.value,
                          }))
                        }
                        placeholder="Newsletter, socials, gear links, or business email..."
                        className="w-full resize-none px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-white/12 bg-zinc-50 dark:bg-[#141419] text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF006E] leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setChannelProfile(EMPTY_CHANNEL_PROFILE);
                    setChannelUrlInput("");
                    setChannelImportError(null);
                    setChannelLogoError(false);
                  }}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                >
                  Disconnect
                </button>
                <button
                  type="button"
                  onClick={() => setChannelModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FF006E] hover:bg-[#e10062] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SiteDemoModal
        open={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onStartCreate={openCreateStudio}
      />
    </div>
  );
}
