import "dotenv/config";
import http from "http";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type {
  ChannelProfile,
  HookVariation,
  ModelMode,
  TtsModelId,
  VideoFormat,
  VideoKit,
  VoiceName,
} from "./src/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getAiClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      ...(apiVersion ? { apiVersion } : {}),
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

class ProviderConfigError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  if (err instanceof ProviderConfigError) {
    return { status: err.status, message: err.message };
  }
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("GEMINI_API_KEY")) {
    return { status: 400, message: raw };
  }
  if (raw.includes("403") || raw.includes("PERMISSION_DENIED")) {
    return {
      status: 403,
      message:
        "Permission denied by AI provider. Please check your API key in Settings > Secrets.",
    };
  }
  if (
    raw.includes("API_KEY_INVALID") ||
    raw.includes("API key not valid") ||
    raw.includes("API key is invalid")
  ) {
    return {
      status: 400,
      message:
        "Invalid API key. Please verify your API key in Settings > Secrets.",
    };
  }
  if (raw.includes("400") || raw.includes("INVALID_ARGUMENT")) {
    return {
      status: 400,
      message: raw,
    };
  }
  if (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      message:
        "Free-tier rate limit reached. Please wait a few seconds or switch to another free-tier model.",
    };
  }
  if (raw.includes("404") || raw.includes("NOT_FOUND")) {
    return {
      status: 404,
      message: "Requested free-tier model was not found or is temporarily unavailable.",
    };
  }
  return { status: 500, message: raw || "Unexpected server error." };
}

const FORMAT_LABELS: Record<VideoFormat, string> = {
  "youtube-16-9": "YouTube Long-Form Video (16:9 widescreen, engaging storytelling & chapters)",
  "shorts-9-16": "YouTube Shorts / Reels / TikTok (9:16 vertical, fast-paced 45-60s)",
  documentary: "Mini-Documentary (16:9 cinematic narration, atmospheric pacing)",
  explainer: "Educational / Product Explainer (16:9 clear visual breakdown)",
};

const KIT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    primaryTitle: {
      type: Type.STRING,
      description: "The single best high-CTR, SEO-optimized title for the video.",
    },
    titleOptions: {
      type: Type.ARRAY,
      description: "5 distinct title variations covering curiosity, direct value, list/numbered, contrarian, and search-SEO angles.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          angle: { type: Type.STRING, description: "Short label like Curiosity, Direct SEO, Contrarian" },
        },
        required: ["title", "angle"],
      },
    },
    hookVariations: {
      type: Type.ARRAY,
      description: "3 distinct opening 5-second hook options (e.g., Bold Claim, Pattern Interrupt, Question) with exact spoken opener and visual B-roll/camera cue.",
      items: {
        type: Type.OBJECT,
        properties: {
          style: { type: Type.STRING, description: "Short hook style label like Bold Claim, Curiosity Gap, Pattern Interrupt" },
          spokenHook: { type: Type.STRING, description: "Exact 1-2 sentence spoken hook for the first 5 seconds" },
          visualCue: { type: Type.STRING, description: "On-screen action, visual reveal, or text overlay during the first 5 seconds" },
        },
        required: ["style", "spokenHook", "visualCue"],
      },
    },
    description: {
      type: Type.STRING,
      description: "Complete ready-to-publish video description including hook paragraph, key takeaways, chapter timestamps matching the scenes, and call to action.",
    },
    pinnedComment: {
      type: Type.STRING,
      description: "Ready-to-pin engaging first comment from the creator asking a specific question to boost viewer comments.",
    },
    communityPost: {
      type: Type.STRING,
      description: "Short YouTube Community tab post or companion social teaser announcing the video.",
    },
    tags: {
      type: Type.ARRAY,
      description: "15 to 20 high-intent SEO tags and keyword phrases without # symbols.",
      items: { type: Type.STRING },
    },
    hashtags: {
      type: Type.ARRAY,
      description: "5 to 8 relevant hashtags starting with #.",
      items: { type: Type.STRING },
    },
    thumbnail: {
      type: Type.OBJECT,
      properties: {
        headline: {
          type: Type.STRING,
          description: "Ultra-punchy 2 to 4 word thumbnail text overlay in Title Case or ALL CAPS.",
        },
        subheadline: {
          type: Type.STRING,
          description: "Short 3 to 5 word supporting kicker for the thumbnail.",
        },
        badgeText: {
          type: Type.STRING,
          description: "Concise 1 to 2 word top corner label like 2026 GUIDE or DEEP DIVE.",
        },
        accentColor: {
          type: Type.STRING,
          description: "Vibrant hex color for highlights, e.g. #2563EB or #EA580C or #0D9488.",
        },
        bgStart: {
          type: Type.STRING,
          description: "Deep dark background gradient start hex, e.g. #090D16.",
        },
        bgEnd: {
          type: Type.STRING,
          description: "Deep background gradient end hex, e.g. #162032.",
        },
        layout: {
          type: Type.STRING,
          description: "One of: split-editorial, bold-center, cinematic-frame, spotlight-minimal",
        },
        motif: {
          type: Type.STRING,
          description: "One of: orbit, waveform, prism, horizon-grid, aperture, peaks",
        },
        imagePrompt: {
          type: Type.STRING,
          description: "Detailed, production-grade AI image generation prompt for the thumbnail specifying subject, composition, lighting, lens, mood, color palette, and aspect ratio.",
        },
        negativePrompt: {
          type: Type.STRING,
          description: "Concise negative prompt listing visual artifacts to avoid.",
        },
      },
      required: [
        "headline",
        "subheadline",
        "badgeText",
        "accentColor",
        "bgStart",
        "bgEnd",
        "layout",
        "motif",
        "imagePrompt",
        "negativePrompt",
      ],
    },
    scenes: {
      type: Type.ARRAY,
      description: "Ordered list of video scenes covering intro hook through outro CTA.",
      items: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: { type: Type.INTEGER },
          title: { type: Type.STRING, description: "Short descriptive scene title" },
          timestamp: { type: Type.STRING, description: "Time range like 00:00 - 00:12" },
          durationSeconds: { type: Type.INTEGER },
          narration: {
            type: Type.STRING,
            description: "Exact spoken voiceover script for this scene, natural and ready for TTS.",
          },
          voiceStyle: {
            type: Type.STRING,
            description: "Voice delivery instruction for TTS, e.g. Warm, curious documentary narrator with measured pacing",
          },
          audioPrompt: {
            type: Type.STRING,
            description: "Detailed background music, ambient bed, and SFX prompt for this scene.",
          },
          videoPrompt: {
            type: Type.STRING,
            description: "Detailed AI video generation prompt specifying visual subject, action, camera movement, lighting, color grading, and framing.",
          },
          cameraMovement: {
            type: Type.STRING,
            description: "Concise camera direction like Slow dolly-in, 35mm f/1.8",
          },
        },
        required: [
          "sceneNumber",
          "title",
          "timestamp",
          "durationSeconds",
          "narration",
          "voiceStyle",
          "audioPrompt",
          "videoPrompt",
          "cameraMovement",
        ],
      },
    },
  },
  required: [
    "primaryTitle",
    "titleOptions",
    "hookVariations",
    "description",
    "pinnedComment",
    "communityPost",
    "tags",
    "hashtags",
    "thumbnail",
    "scenes",
  ],
};

const HOOKS_TAGS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    titleOptions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          angle: { type: Type.STRING },
        },
        required: ["title", "angle"],
      },
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["titleOptions", "tags", "hashtags"],
};

function normalizeThumbnail(raw: VideoKit["thumbnail"]): VideoKit["thumbnail"] {
  const validLayouts = new Set([
    "split-editorial",
    "bold-center",
    "cinematic-frame",
    "spotlight-minimal",
  ]);
  const validMotifs = new Set([
    "orbit",
    "waveform",
    "prism",
    "horizon-grid",
    "aperture",
    "peaks",
  ]);
  const isHex = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v?.trim() || "");

  return {
    headline: raw?.headline || "THE FULL BREAKDOWN",
    subheadline: raw?.subheadline || "Everything you need to know",
    badgeText: raw?.badgeText || "FEATURE",
    accentColor: isHex(raw?.accentColor) ? raw.accentColor : "#2563EB",
    bgStart: isHex(raw?.bgStart) ? raw.bgStart : "#0B1120",
    bgEnd: isHex(raw?.bgEnd) ? raw.bgEnd : "#172554",
    layout: validLayouts.has(raw?.layout) ? raw.layout : "split-editorial",
    motif: validMotifs.has(raw?.motif) ? raw.motif : "orbit",
    imagePrompt: raw?.imagePrompt || "",
    negativePrompt: raw?.negativePrompt || "blurry text, watermark, distorted faces, low resolution",
  };
}

function normalizeHookVariations(raw: unknown): HookVariation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      style: String(item.style || "Opening Hook").trim(),
      spokenHook: String(item.spokenHook || "").trim(),
      visualCue: String(item.visualCue || "").trim(),
    }))
    .filter((item) => item.spokenHook.length > 0)
    .slice(0, 4);
}

function formatChannelProfileContext(profile?: ChannelProfile): string {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.channelName?.trim()) parts.push(`Channel Name: ${profile.channelName.trim()}`);
  if (profile.niche?.trim()) parts.push(`Channel Niche: ${profile.niche.trim()}`);
  if (profile.defaultCta?.trim()) parts.push(`Preferred CTA: ${profile.defaultCta.trim()}`);
  return parts.length > 0 ? `\nCreator Channel Profile:\n${parts.join("\n")}` : "";
}

function applyDescriptionFooter(description: string, footer?: string): string {
  const cleanDesc = (description || "").trim();
  const cleanFooter = (footer || "").trim();
  if (!cleanFooter) return cleanDesc;
  if (cleanDesc.includes(cleanFooter)) return cleanDesc;
  return cleanDesc ? `${cleanDesc}\n\n${cleanFooter}` : cleanFooter;
}

type ExternalProvider = "groq" | "openrouter";

const EXTERNAL_PROVIDER_META: Record<
  ExternalProvider,
  { name: string; envKey: string; endpoint: string }
> = {
  groq: {
    name: "Groq",
    envKey: "GROQ_API_KEY",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
  },
  openrouter: {
    name: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
  },
};

const EXTERNAL_MODEL_LABELS: Record<string, string> = {
  "groq:llama-3.3-70b-versatile": "Llama 3.3 70B · Groq Free",
  "groq:llama-3.1-8b-instant": "Llama 3.1 8B Instant · Groq Free",
  "groq:qwen/qwen3-32b": "Qwen 3 32B · Groq Free",
  "groq:openai/gpt-oss-120b": "GPT-OSS 120B · Groq Free",
  "openrouter:openrouter/free": "OpenRouter Auto · :free",
};

function parseExternalMode(mode?: ModelMode): {
  provider: ExternalProvider;
  modelId: string;
  label: string;
} | null {
  if (!mode) return null;
  for (const provider of ["groq", "openrouter"] as const) {
    const prefix = `${provider}:`;
    if (mode.startsWith(prefix)) {
      const modelId = mode.slice(prefix.length);
      return {
        provider,
        modelId,
        label: EXTERNAL_MODEL_LABELS[mode] || `${modelId} (${EXTERNAL_PROVIDER_META[provider].name})`,
      };
    }
  }
  return null;
}

function extractJsonObject(rawText: string): Record<string, any> {
  const withoutThink = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const withoutFences = withoutThink
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(withoutFences);
  } catch {
    const firstBrace = withoutFences.indexOf("{");
    const lastBrace = withoutFences.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(withoutFences.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("The selected model returned malformed JSON. Please try again.");
  }
}

async function callOpenAiCompatibleJson(params: {
  provider: ExternalProvider;
  modelId: string;
  systemInstruction: string;
  userPrompt: string;
  jsonExample: string;
}): Promise<Record<string, any>> {
  const meta = EXTERNAL_PROVIDER_META[params.provider];
  const apiKey = process.env[meta.envKey]?.trim();
  if (!apiKey) {
    throw new ProviderConfigError(
      400,
      `${meta.envKey} is not configured. Add your free ${meta.name} API key in Settings > Secrets, or switch to a built-in Gemini Free Tier model.`
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (params.provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.APP_URL || "http://localhost:3000";
    headers["X-Title"] = "Contentora";
  }

  const systemPrompt = `${params.systemInstruction}

You MUST respond with a single valid JSON object ONLY (no markdown fences, no commentary) matching this exact structure:
${params.jsonExample}`;

  const runFetch = async (useResponseFormat: boolean) => {
    const body: Record<string, any> = {
      model: params.modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: 0.7,
    };
    if (useResponseFormat) {
      body.response_format = { type: "json_object" };
    }
    const resp = await fetch(meta.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // keep raw text for error reporting
    }
    return { ok: resp.ok, status: resp.status, json, text };
  };

  let result = await runFetch(true);
  if (!result.ok && result.status === 400) {
    result = await runFetch(false);
  }

  if (!result.ok) {
    const errDetail =
      result.json?.error?.message ||
      result.json?.message ||
      result.text ||
      `${meta.name} API request failed (${result.status}).`;
    if (result.status === 429) {
      throw new ProviderConfigError(
        429,
        `${meta.name} free-tier rate limit reached. Wait a moment or try another model.`
      );
    }
    if (result.status === 401 || result.status === 403) {
      throw new ProviderConfigError(
        result.status,
        `Invalid or unauthorized ${meta.envKey}. Check your key in Settings > Secrets.`
      );
    }
    throw new ProviderConfigError(result.status || 502, `${meta.name}: ${errDetail}`);
  }

  const content = result.json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new ProviderConfigError(502, `${meta.name} returned an empty response.`);
  }
  return extractJsonObject(content);
}

const VIDEO_KIT_JSON_GUIDE = `{
  "primaryTitle": "string",
  "titleOptions": [{ "title": "string", "angle": "Curiosity | Direct SEO | Contrarian | Story | Value" }],
  "hookVariations": [{ "style": "Bold Claim | Curiosity Gap | Pattern Interrupt", "spokenHook": "Exact spoken 5-second opener", "visualCue": "Opening shot & text overlay action" }],
  "description": "string",
  "pinnedComment": "Engaging first pinned comment asking viewers a question",
  "communityPost": "Short companion Community tab teaser post",
  "tags": ["15 to 20 SEO keywords without #"],
  "hashtags": ["6 to 8 hashtags starting with #"],
  "thumbnail": {
    "headline": "2 TO 4 BOLD WORDS",
    "subheadline": "Short 3-5 word kicker",
    "badgeText": "1-2 WORD LABEL",
    "accentColor": "#FACC15",
    "bgStart": "#090D16",
    "bgEnd": "#162032",
    "layout": "split-editorial | bold-center | cinematic-frame | spotlight-minimal",
    "motif": "orbit | waveform | prism | horizon-grid | aperture | peaks",
    "imagePrompt": "Detailed AI image prompt in English",
    "negativePrompt": "Things to avoid"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene title",
      "timestamp": "00:00 - 00:10",
      "durationSeconds": 10,
      "narration": "Spoken voiceover script only",
      "voiceStyle": "Voice delivery instruction",
      "audioPrompt": "BGM and SFX prompt in English",
      "videoPrompt": "AI video shot prompt in English",
      "cameraMovement": "Slow dolly-in, 35mm"
    }
  ]
}`;

function resolveFreeTierModel(
  mode?: ModelMode,
  preferLiteForAuto = false
): {
  model: "gemini-4-hydrogen" | "gemini-3.1-flash-lite";
  thinkingLevel: ThinkingLevel;
  label: string;
} {
  switch (mode) {
    case "gemini-3.1-flash-lite":
      return {
        model: "gemini-3.1-flash-lite",
        thinkingLevel: ThinkingLevel.MINIMAL,
        label: "Gemini 3.1 Flash Lite (Instant)",
      };
    case "gemini-3.1-flash-lite-think":
      return {
        model: "gemini-3.1-flash-lite",
        thinkingLevel: ThinkingLevel.MEDIUM,
        label: "Gemini 3.1 Flash Lite (Reasoned)",
      };
    case "gemini-4-hydrogen-balanced":
      return {
        model: "gemini-4-hydrogen",
        thinkingLevel: ThinkingLevel.MEDIUM,
        label: "Gemini 4 Hydrogen (Balanced)",
      };
    case "gemini-4-hydrogen-deep":
      return {
        model: "gemini-4-hydrogen",
        thinkingLevel: ThinkingLevel.HIGH,
        label: "Gemini 4 Hydrogen (Deep)",
      };
    case "gemini-4-hydrogen-max":
      return {
        model: "gemini-4-hydrogen",
        thinkingLevel: ThinkingLevel.XHIGH,
        label: "Gemini 4 Hydrogen (Max Reasoning)",
      };
    case "gemini-4-hydrogen":
      return {
        model: "gemini-4-hydrogen",
        thinkingLevel: ThinkingLevel.LOW,
        label: "Gemini 4 Hydrogen (Fast)",
      };
    case "all-free-tier":
    default:
      return preferLiteForAuto
        ? {
            model: "gemini-3.1-flash-lite",
            thinkingLevel: ThinkingLevel.MINIMAL,
            label: "Gemini 3.1 Flash Lite",
          }
        : {
            model: "gemini-4-hydrogen",
            thinkingLevel: ThinkingLevel.LOW,
            label: "Gemini 4 Hydrogen",
          };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "4mb" }));

  app.get("/api/models", (_req, res) => {
    const providers = {
      gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
      groq: Boolean(process.env.GROQ_API_KEY?.trim()),
      openrouter: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    };

    res.json({
      providers,
      models: [
        {
          id: "all-free-tier",
          provider: "gemini",
          available: providers.gemini,
          label: "Auto · Dual Free Tier",
          role: "Parallel Gemini 4 Hydrogen (kit & script) + Gemini 3.1 Flash Lite (hooks & SEO)",
          tier: "Free Tier",
        },
        {
          id: "gemini-4-hydrogen",
          provider: "gemini",
          available: providers.gemini,
          label: "Gemini 4 Hydrogen · Fast",
          role: "Low-latency full video production kit & script architect",
          tier: "Free Tier",
        },
        {
          id: "gemini-4-hydrogen-balanced",
          provider: "gemini",
          available: providers.gemini,
          label: "Gemini 4 Hydrogen · Balanced",
          role: "Balanced storytelling depth, hooks & scene pacing",
          tier: "Free Tier",
        },
        {
          id: "gemini-4-hydrogen-deep",
          provider: "gemini",
          available: providers.gemini,
          label: "Gemini 4 Hydrogen · Deep",
          role: "High-reasoning cinematography, detailed narrative & shot prompts",
          tier: "Free Tier",
        },
        {
          id: "gemini-4-hydrogen-max",
          provider: "gemini",
          available: providers.gemini,
          label: "Gemini 4 Hydrogen · Max",
          role: "Maximum multi-step reasoning depth for complex topics",
          tier: "Free Tier",
        },
        {
          id: "gemini-3.1-flash-lite",
          provider: "gemini",
          available: providers.gemini,
          label: "Gemini 3.1 Flash Lite · Instant",
          role: "Ultra-fast title hooks, SEO tags, hashtags & instant drafts",
          tier: "Free Tier",
        },
        {
          id: "gemini-3.1-flash-lite-think",
          provider: "gemini",
          available: providers.gemini,
          label: "Gemini 3.1 Flash Lite · Reasoned",
          role: "Fast Flash Lite model with added reasoning pass",
          tier: "Free Tier",
        },
        {
          id: "groq:llama-3.3-70b-versatile",
          provider: "groq",
          available: providers.groq,
          label: "Llama 3.3 70B · Groq Free",
          role: "High-speed general script & production kit on Groq LPU",
          tier: "Groq Free Tier",
        },
        {
          id: "groq:llama-3.1-8b-instant",
          provider: "groq",
          available: providers.groq,
          label: "Llama 3.1 8B Instant · Groq Free",
          role: "Sub-second drafts, hooks & SEO tags on Groq LPU",
          tier: "Groq Free Tier",
        },
        {
          id: "groq:qwen/qwen3-32b",
          provider: "groq",
          available: providers.groq,
          label: "Qwen 3 32B · Groq Free",
          role: "Dual-mode reasoning & creative script generation on Groq",
          tier: "Groq Free Tier",
        },
        {
          id: "groq:openai/gpt-oss-120b",
          provider: "groq",
          available: providers.groq,
          label: "GPT-OSS 120B · Groq Free",
          role: "Large open-weight reasoning model on Groq LPU",
          tier: "Groq Free Tier",
        },
        {
          id: "openrouter:openrouter/free",
          provider: "openrouter",
          available: providers.openrouter,
          label: "OpenRouter Auto · :free",
          role: "Routes automatically to available $0 OpenRouter free models",
          tier: "OpenRouter Free",
        },
        {
          id: "gemini-3.8-flash-lite-tts",
          provider: "gemini",
          available: providers.gemini,
          label: "Gemini 3.8 Flash Lite TTS",
          role: "Low-latency single-speaker scene voiceover audio synthesis (WAV)",
          tier: "Free Tier",
        },
        {
          id: "gemini-3.8-flash-tts",
          provider: "gemini",
          available: providers.gemini,
          label: "Gemini 3.8 Flash TTS",
          role: "Expressive voice design & dramatic scene narration synthesis (WAV)",
          tier: "Free Tier",
        },
      ],
    });
  });

  app.post("/api/generate-kit", async (req, res) => {
    try {
      const {
        topic,
        format = "youtube-16-9",
        sceneCount,
        totalDurationSeconds = 60,
        secondsPerScene = 10,
        language = "English",
        tone = "Cinematic",
        modelMode = "all-free-tier",
        channelProfile,
      } = req.body as {
        topic?: string;
        format?: VideoFormat;
        sceneCount?: number;
        totalDurationSeconds?: number;
        secondsPerScene?: number;
        language?: string;
        tone?: string;
        modelMode?: ModelMode;
        channelProfile?: ChannelProfile;
      };

      if (!topic || !topic.trim()) {
        return res.status(400).json({ error: "Please enter a video topic prompt." });
      }

      const safeSecPerScene = Math.min(Math.max(Number(secondsPerScene) || 10, 4), 30);
      const safeTotalDuration = Math.min(Math.max(Number(totalDurationSeconds) || 60, 20), 600);
      const computedScenes =
        sceneCount ?? Math.round(safeTotalDuration / safeSecPerScene);
      const clampedScenes = Math.min(Math.max(Number(computedScenes) || 6, 3), 12);
      const formatLabel = FORMAT_LABELS[format] || FORMAT_LABELS["youtube-16-9"];
      const externalModel = parseExternalMode(modelMode);
      const resolved = resolveFreeTierModel(modelMode, false);
      const channelContext = formatChannelProfileContext(channelProfile);

      const mainSystemInstruction = `You are an elite YouTube & short-form video producer, SEO strategist, sound designer, and AI cinematography director.
Given a user's video topic, produce a complete, production-ready video kit with zero filler.
Rules:
- Write titles, opening hooks, description, pinned comment, community post, tags, hashtags, and spoken scene narration in ${language}. Keep technical videoPrompt and audioPrompt in English (with ${language} text cues if on-screen text is needed) so AI video/audio generators understand them accurately.
- Generate 3 distinct 5-second hookVariations (exact spoken hook + opening visualCue) so the creator can test different openings.
- Generate an engaging pinnedComment (question to spark discussion) and a short companion communityPost teaser.
- Generate exactly ${clampedScenes} sequential scenes targeting roughly ${safeSecPerScene} seconds per scene (~${safeTotalDuration}s total runtime) with realistic cumulative timestamps starting at 00:00.
- Make every scene narration natural, punchy, and ready for direct Text-to-Speech synthesis (avoid stage directions inside the spoken narration text itself).
- Put delivery style cues in voiceStyle, soundscape/BGM/SFX cues in audioPrompt, and detailed visual/camera instructions in videoPrompt.
- For thumbnail.headline, keep it 2 to 4 crisp words that look bold on a 16:9 or 9:16 canvas.
- For thumbnail.imagePrompt, write a vivid, photorealistic or editorial AI image prompt tailored to the format (${format.includes("9-16") ? "9:16 vertical" : "16:9 widescreen"}).
- Output strictly valid JSON matching the schema.`;

      const mainPrompt = `Video Topic: "${topic.trim()}"
Language: ${language}
Format: ${formatLabel}
Tone & Style: ${tone}
Target Duration: ~${safeTotalDuration} seconds (${clampedScenes} scenes, ~${safeSecPerScene}s per scene)${channelContext}`;

      if (externalModel) {
        const parsed = await callOpenAiCompatibleJson({
          provider: externalModel.provider,
          modelId: externalModel.modelId,
          systemInstruction: mainSystemInstruction,
          userPrompt: mainPrompt,
          jsonExample: VIDEO_KIT_JSON_GUIDE,
        });

        const kit: VideoKit = {
          topic: topic.trim(),
          format,
          tone,
          primaryTitle: parsed.primaryTitle || topic.trim(),
          titleOptions: Array.isArray(parsed.titleOptions) ? parsed.titleOptions : [],
          hookVariations: normalizeHookVariations(parsed.hookVariations),
          description: applyDescriptionFooter(
            parsed.description || "",
            channelProfile?.descriptionFooter
          ),
          pinnedComment: String(parsed.pinnedComment || "").trim(),
          communityPost: String(parsed.communityPost || "").trim(),
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
          thumbnail: normalizeThumbnail(parsed.thumbnail),
          scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
          modelsUsed: {
            scriptAndPrompts: externalModel.label,
            hooksAndTags: externalModel.label,
            audioSynthesisOptions: ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"],
          },
        };

        return res.json({
          kit,
          assistantMessage: `Generated your ${kit.scenes.length}-scene video production kit using ${externalModel.label}.`,
        });
      }

      const ai = getAiClient();

      if (modelMode === "all-free-tier") {
        const mainCall = ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: mainPrompt,
          config: {
            systemInstruction: mainSystemInstruction,
            responseMimeType: "application/json",
            responseSchema: KIT_RESPONSE_SCHEMA,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        const hooksCall = ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `Generate 5 viral high-CTR video title options (with short angle labels), 18 high-intent SEO tags (without #), and 6 hashtags (with #) in ${language} for this video topic: "${topic.trim()}" in format "${formatLabel}" with tone "${tone}".`,
          config: {
            systemInstruction:
              "You are a fast YouTube SEO & packaging specialist. Return sharp, click-worthy titles and high-search-volume tags.",
            responseMimeType: "application/json",
            responseSchema: HOOKS_TAGS_SCHEMA,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          },
        });

        const [mainResp, hooksResp] = await Promise.all([mainCall, hooksCall]);
        const mainParsed = JSON.parse((mainResp.text ?? "{}").trim());
        const hooksParsed = JSON.parse((hooksResp.text ?? "{}").trim());

        const mergedTags = Array.from(
          new Set([
            ...(Array.isArray(hooksParsed.tags) ? hooksParsed.tags : []),
            ...(Array.isArray(mainParsed.tags) ? mainParsed.tags : []),
          ])
        ).slice(0, 22);

        const mergedHashtags = Array.from(
          new Set([
            ...(Array.isArray(hooksParsed.hashtags) ? hooksParsed.hashtags : []),
            ...(Array.isArray(mainParsed.hashtags) ? mainParsed.hashtags : []),
          ])
        ).slice(0, 8);

        const titleOptions =
          Array.isArray(hooksParsed.titleOptions) && hooksParsed.titleOptions.length >= 3
            ? hooksParsed.titleOptions.slice(0, 5)
            : mainParsed.titleOptions || [];

        const kit: VideoKit = {
          topic: topic.trim(),
          format,
          tone,
          primaryTitle: mainParsed.primaryTitle || titleOptions[0]?.title || topic.trim(),
          titleOptions,
          hookVariations: normalizeHookVariations(mainParsed.hookVariations),
          description: applyDescriptionFooter(
            mainParsed.description || "",
            channelProfile?.descriptionFooter
          ),
          pinnedComment: String(mainParsed.pinnedComment || "").trim(),
          communityPost: String(mainParsed.communityPost || "").trim(),
          tags: mergedTags,
          hashtags: mergedHashtags,
          thumbnail: normalizeThumbnail(mainParsed.thumbnail),
          scenes: Array.isArray(mainParsed.scenes) ? mainParsed.scenes : [],
          modelsUsed: {
            scriptAndPrompts: "gemini-4-hydrogen",
            hooksAndTags: "gemini-3.1-flash-lite",
            audioSynthesisOptions: ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"],
          },
        };

        return res.json({
          kit,
          assistantMessage: `Generated a complete ${kit.scenes.length}-scene production kit for "${kit.primaryTitle}" using Gemini 4 Hydrogen (script, scenes, audio & video prompts, thumbnail art) and Gemini 3.1 Flash Lite (title hooks & SEO tags).`,
        });
      }

      // Single selected free-tier model mode
      const singleResp = await ai.models.generateContent({
        model: resolved.model,
        contents: mainPrompt,
        config: {
          systemInstruction: mainSystemInstruction,
          responseMimeType: "application/json",
          responseSchema: KIT_RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel: resolved.thinkingLevel,
          },
        },
      });

      const parsed = JSON.parse((singleResp.text ?? "{}").trim());
      const kit: VideoKit = {
        topic: topic.trim(),
        format,
        tone,
        primaryTitle: parsed.primaryTitle || topic.trim(),
        titleOptions: Array.isArray(parsed.titleOptions) ? parsed.titleOptions : [],
        hookVariations: normalizeHookVariations(parsed.hookVariations),
        description: applyDescriptionFooter(
          parsed.description || "",
          channelProfile?.descriptionFooter
        ),
        pinnedComment: String(parsed.pinnedComment || "").trim(),
        communityPost: String(parsed.communityPost || "").trim(),
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        thumbnail: normalizeThumbnail(parsed.thumbnail),
        scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
        modelsUsed: {
          scriptAndPrompts: resolved.label,
          hooksAndTags: resolved.label,
          audioSynthesisOptions: ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"],
        },
      };

      return res.json({
        kit,
        assistantMessage: `Generated your ${kit.scenes.length}-scene video production kit using ${resolved.label}.`,
      });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/refine", async (req, res) => {
    try {
      const { currentKit, instruction, modelMode = "all-free-tier" } = req.body as {
        currentKit?: VideoKit;
        instruction?: string;
        modelMode?: ModelMode;
      };

      if (!currentKit || !instruction?.trim()) {
        return res.status(400).json({ error: "Current video kit and refinement instruction are required." });
      }

      const externalModel = parseExternalMode(modelMode);
      const resolved = resolveFreeTierModel(modelMode, false);
      const refinePrompt = `Current Video Kit JSON:
${JSON.stringify(currentKit)}

User Refinement Request:
"${instruction.trim()}"

Update the video kit accordingly while keeping untouched parts cohesive and high-quality. Return the complete updated kit and a brief summary of your changes.`;

      let parsed: Record<string, any>;
      let modelLabel = resolved.label;

      if (externalModel) {
        modelLabel = externalModel.label;
        parsed = await callOpenAiCompatibleJson({
          provider: externalModel.provider,
          modelId: externalModel.modelId,
          systemInstruction:
            "You are an expert video director & producer refining an existing video production kit based on user feedback. Always return the full updated kit JSON.",
          userPrompt: refinePrompt,
          jsonExample: `{ "assistantSummary": "1-2 sentence summary", "updatedKit": ${VIDEO_KIT_JSON_GUIDE} }`,
        });
      } else {
        const ai = getAiClient();
        const refineSchema = {
          type: Type.OBJECT,
          properties: {
            assistantSummary: {
              type: Type.STRING,
              description: "Concise 1-2 sentence explanation of what was updated in the video kit.",
            },
            updatedKit: KIT_RESPONSE_SCHEMA,
          },
          required: ["assistantSummary", "updatedKit"],
        };

        const response = await ai.models.generateContent({
          model: resolved.model,
          contents: refinePrompt,
          config: {
            systemInstruction:
              "You are an expert video director & producer refining an existing video production kit based on user feedback. Always return the full updated kit JSON.",
            responseMimeType: "application/json",
            responseSchema: refineSchema,
            thinkingConfig: {
              thinkingLevel: resolved.thinkingLevel,
            },
          },
        });

        parsed = JSON.parse((response.text ?? "{}").trim());
      }

      const rawUpdated = parsed.updatedKit || {};

      const updatedKit: VideoKit = {
        topic: currentKit.topic,
        format: currentKit.format,
        tone: currentKit.tone,
        primaryTitle: rawUpdated.primaryTitle || currentKit.primaryTitle,
        titleOptions: Array.isArray(rawUpdated.titleOptions)
          ? rawUpdated.titleOptions
          : currentKit.titleOptions,
        hookVariations:
          normalizeHookVariations(rawUpdated.hookVariations).length > 0
            ? normalizeHookVariations(rawUpdated.hookVariations)
            : currentKit.hookVariations || [],
        description: rawUpdated.description || currentKit.description,
        pinnedComment:
          typeof rawUpdated.pinnedComment === "string" && rawUpdated.pinnedComment.trim()
            ? rawUpdated.pinnedComment.trim()
            : currentKit.pinnedComment,
        communityPost:
          typeof rawUpdated.communityPost === "string" && rawUpdated.communityPost.trim()
            ? rawUpdated.communityPost.trim()
            : currentKit.communityPost,
        tags: Array.isArray(rawUpdated.tags) ? rawUpdated.tags : currentKit.tags,
        hashtags: Array.isArray(rawUpdated.hashtags)
          ? rawUpdated.hashtags
          : currentKit.hashtags,
        thumbnail: normalizeThumbnail(rawUpdated.thumbnail || currentKit.thumbnail),
        scenes: Array.isArray(rawUpdated.scenes) ? rawUpdated.scenes : currentKit.scenes,
        modelsUsed: {
          ...currentKit.modelsUsed,
          scriptAndPrompts: modelLabel,
        },
      };

      return res.json({
        kit: updatedKit,
        assistantMessage:
          parsed.assistantSummary || `Updated the video kit using ${modelLabel}.`,
      });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/repurpose-shorts", async (req, res) => {
    try {
      const {
        currentKit,
        modelMode = "all-free-tier",
        channelProfile,
      } = req.body as {
        currentKit?: VideoKit;
        modelMode?: ModelMode;
        channelProfile?: ChannelProfile;
      };

      if (!currentKit || !currentKit.primaryTitle) {
        return res.status(400).json({ error: "A source video kit is required to repurpose." });
      }

      const externalModel = parseExternalMode(modelMode);
      const resolved = resolveFreeTierModel(modelMode, false);
      const channelContext = formatChannelProfileContext(channelProfile);

      const systemInstruction = `You are a viral YouTube Shorts, Instagram Reels, and TikTok vertical editor.
Convert the provided long-form video kit into a tightly paced, high-retention 9:16 vertical Short (4 scenes, ~45 seconds total).
Rules:
- Open with an explosive first-3-second hookVariation & scene 1 that stops the scroll immediately.
- Keep spoken narration punchy, conversational, and fast-paced (no stage directions inside narration).
- Tailor thumbnail.headline (2-3 huge bold words) and thumbnail.imagePrompt explicitly for 9:16 vertical mobile screens.
- Include #Shorts in hashtags alongside niche hashtags.
- Write 3 distinct hookVariations, a pinnedComment question, and a short communityPost teaser.
- Keep technical videoPrompt and audioPrompt in English.
- Output strictly valid JSON matching the schema.`;

      const sourceDigest = {
        primaryTitle: currentKit.primaryTitle,
        topic: currentKit.topic,
        tone: currentKit.tone,
        description: currentKit.description,
        scenes: currentKit.scenes.map((s) => ({
          title: s.title,
          narration: s.narration,
        })),
      };

      const userPrompt = `Repurpose this video kit into a standalone 4-scene 9:16 vertical Short (~45s total):
${JSON.stringify(sourceDigest)}${channelContext}`;

      let parsed: Record<string, any>;
      let modelLabel = resolved.label;

      if (externalModel) {
        modelLabel = externalModel.label;
        parsed = await callOpenAiCompatibleJson({
          provider: externalModel.provider,
          modelId: externalModel.modelId,
          systemInstruction,
          userPrompt,
          jsonExample: VIDEO_KIT_JSON_GUIDE,
        });
      } else {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
          model: resolved.model,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: KIT_RESPONSE_SCHEMA,
            thinkingConfig: { thinkingLevel: resolved.thinkingLevel },
          },
        });
        parsed = JSON.parse((response.text ?? "{}").trim());
      }

      const shortKit: VideoKit = {
        topic: `${currentKit.topic} (Shorts Cut)`,
        format: "shorts-9-16",
        tone: currentKit.tone || "Fast-Paced & Punchy",
        primaryTitle: parsed.primaryTitle || `${currentKit.primaryTitle} #Shorts`,
        titleOptions: Array.isArray(parsed.titleOptions) ? parsed.titleOptions : [],
        hookVariations: normalizeHookVariations(parsed.hookVariations),
        description: applyDescriptionFooter(
          parsed.description || "",
          channelProfile?.descriptionFooter
        ),
        pinnedComment: String(parsed.pinnedComment || "").trim(),
        communityPost: String(parsed.communityPost || "").trim(),
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ["#Shorts"],
        thumbnail: normalizeThumbnail(parsed.thumbnail),
        scenes: Array.isArray(parsed.scenes) ? parsed.scenes : [],
        modelsUsed: {
          scriptAndPrompts: modelLabel,
          hooksAndTags: modelLabel,
          audioSynthesisOptions: ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"],
        },
      };

      return res.json({
        kit: shortKit,
        assistantMessage: `Repurposed "${currentKit.primaryTitle}" into a ${shortKit.scenes.length}-scene 9:16 Shorts kit.`,
      });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/generate-audio", async (req, res) => {
    try {
      const {
        text,
        style = "Clear, engaging narrator",
        voiceName = "Kore",
        ttsModel = "gemini-3.8-flash-lite-tts",
      } = req.body as {
        text?: string;
        style?: string;
        voiceName?: VoiceName;
        ttsModel?: TtsModelId;
      };

      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Narration text is required for audio synthesis." });
      }

      const validModel: TtsModelId =
        ttsModel === "gemini-3.8-flash-tts"
          ? "gemini-3.8-flash-tts"
          : "gemini-3.8-flash-lite-tts";

      const validVoices = new Set<VoiceName>(["Kore", "Puck", "Charon", "Fenrir", "Zephyr"]);
      const safeVoice: VoiceName = validVoices.has(voiceName) ? voiceName : "Kore";

      const safeStyle =
        typeof style === "string" && style.trim()
          ? style.trim()
          : "Clear, engaging narrator";

      const ai = getAiClient("v1beta");
      const response = await ai.models.generateContent({
        model: validModel,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style: safeStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: safeVoice,
              },
            },
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const inlineData = parts.find((p) => Boolean(p?.inlineData?.data))?.inlineData;
      const base64Audio = inlineData?.data;
      if (!base64Audio) {
        return res.status(502).json({
          error: "No audio data was returned by the TTS model. Please try again.",
        });
      }

      const mimeType = inlineData?.mimeType || "audio/wav";
      return res.json({
        audioDataUrl: `data:${mimeType};base64,${base64Audio}`,
        mimeType,
        modelUsed: validModel,
        voiceName: safeVoice,
      });
    } catch (err) {
      console.error("[generate-audio] error:", err);
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/generate-tool", async (req, res) => {
    try {
      const {
        tool,
        topic,
        format = "youtube-16-9",
        language = "English",
        tone = "Engaging & Clear",
        sceneCount = 5,
        modelMode = "all-free-tier",
      } = req.body as {
        tool?: "title" | "description" | "tags" | "hashtags" | "thumbnail" | "scenes" | "audio";
        topic?: string;
        format?: VideoFormat;
        language?: string;
        tone?: string;
        sceneCount?: number;
        modelMode?: ModelMode;
      };

      const validTools = new Set([
        "title",
        "description",
        "tags",
        "hashtags",
        "thumbnail",
        "scenes",
        "audio",
      ]);

      if (!tool || !validTools.has(tool)) {
        return res.status(400).json({ error: "Please select a valid tool." });
      }
      if (!topic || !topic.trim()) {
        return res.status(400).json({ error: "Please enter a video topic or prompt." });
      }

      const formatLabel = FORMAT_LABELS[format] || FORMAT_LABELS["youtube-16-9"];
      const fastTool = tool === "title" || tool === "tags" || tool === "hashtags";
      const externalModel = parseExternalMode(modelMode);
      const resolvedTool = resolveFreeTierModel(modelMode, fastTool);
      const model = resolvedTool.model;
      const thinkingLevel = resolvedTool.thinkingLevel;

      const cleanTopic = topic.trim();
      const clampedScenes = Math.min(Math.max(Number(sceneCount) || 5, 3), 10);

      const runStructured = async (params: {
        systemInstruction: string;
        userPrompt: string;
        schema: any;
        jsonExample: string;
      }): Promise<Record<string, any>> => {
        if (externalModel) {
          return callOpenAiCompatibleJson({
            provider: externalModel.provider,
            modelId: externalModel.modelId,
            systemInstruction: params.systemInstruction,
            userPrompt: params.userPrompt,
            jsonExample: params.jsonExample,
          });
        }
        const ai = getAiClient();
        const resp = await ai.models.generateContent({
          model,
          contents: params.userPrompt,
          config: {
            systemInstruction: params.systemInstruction,
            responseMimeType: "application/json",
            responseSchema: params.schema,
            thinkingConfig: { thinkingLevel },
          },
        });
        return JSON.parse((resp.text ?? "{}").trim());
      };

      const usedModelLabel = externalModel ? externalModel.label : model;

      if (tool === "title") {
        const schema = {
          type: Type.OBJECT,
          properties: {
            primaryTitle: { type: Type.STRING },
            titleOptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  angle: { type: Type.STRING },
                },
                required: ["title", "angle"],
              },
            },
          },
          required: ["primaryTitle", "titleOptions"],
        };
        const data = await runStructured({
          systemInstruction: "You are a YouTube packaging & CTR specialist. Output valid JSON only.",
          userPrompt: `Generate 1 best primary YouTube/Reels title and 5 distinct high-CTR alternative title variations (with short 1-2 word angle labels like Curiosity, Direct SEO, Contrarian, Story, Value) in ${language} for topic: "${cleanTopic}". Format: ${formatLabel}. Tone: ${tone}.`,
          schema,
          jsonExample: `{ "primaryTitle": "string", "titleOptions": [{ "title": "string", "angle": "Curiosity" }] }`,
        });
        return res.json({ tool, data, modelUsed: usedModelLabel });
      }

      if (tool === "description") {
        const schema = {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: "Complete ready-to-publish video description with hook, key takeaways, timestamps placeholder if helpful, and CTA.",
            },
          },
          required: ["description"],
        };
        const data = await runStructured({
          systemInstruction: "You are an expert YouTube & Instagram SEO copywriter. Output valid JSON only.",
          userPrompt: `Write a high-retention, SEO-optimized video description in ${language} for topic: "${cleanTopic}". Format: ${formatLabel}. Tone: ${tone}. Include a compelling opening hook, bullet highlights, and a subtle call to action.`,
          schema,
          jsonExample: `{ "description": "string" }`,
        });
        return res.json({ tool, data, modelUsed: usedModelLabel });
      }

      if (tool === "tags") {
        const schema = {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "20 high-intent SEO search tags without # symbols.",
            },
          },
          required: ["tags"],
        };
        const data = await runStructured({
          systemInstruction: "You are a YouTube search & keyword strategist. Output valid JSON only.",
          userPrompt: `Generate 20 high-search-volume SEO keyword tags (no # symbols) in ${language} for topic: "${cleanTopic}". Format: ${formatLabel}.`,
          schema,
          jsonExample: `{ "tags": ["keyword 1", "keyword 2"] }`,
        });
        return res.json({
          tool,
          data: { tags: Array.isArray(data.tags) ? data.tags.slice(0, 24) : [] },
          modelUsed: usedModelLabel,
        });
      }

      if (tool === "hashtags") {
        const schema = {
          type: Type.OBJECT,
          properties: {
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "10 targeted hashtags each starting with #.",
            },
          },
          required: ["hashtags"],
        };
        const data = await runStructured({
          systemInstruction: "You are a YouTube & Instagram Reels growth strategist. Output valid JSON only.",
          userPrompt: `Generate 10 high-reach hashtags starting with # in ${language} for topic: "${cleanTopic}". Format: ${formatLabel}.`,
          schema,
          jsonExample: `{ "hashtags": ["#tag1", "#tag2"] }`,
        });
        return res.json({
          tool,
          data: {
            hashtags: Array.isArray(data.hashtags)
              ? data.hashtags.map((h: string) => (h.startsWith("#") ? h : `#${h}`))
              : [],
          },
          modelUsed: usedModelLabel,
        });
      }

      if (tool === "thumbnail") {
        const schema = {
          type: Type.OBJECT,
          properties: {
            thumbnail: KIT_RESPONSE_SCHEMA.properties.thumbnail,
          },
          required: ["thumbnail"],
        };
        const data = await runStructured({
          systemInstruction: "You are a top YouTube thumbnail director. Output valid JSON only.",
          userPrompt: `Design a high-CTR viral thumbnail concept and AI image prompt for topic: "${cleanTopic}". Format: ${formatLabel} (${format === "shorts-9-16" ? "9:16 vertical" : "16:9 widescreen"}). Tone: ${tone}. Headline should be 2-4 crisp words in ${language}. Keep imagePrompt in detailed photography/cinema English.`,
          schema,
          jsonExample: `{ "thumbnail": { "headline": "2-4 WORDS", "subheadline": "short kicker", "badgeText": "GUIDE", "accentColor": "#FACC15", "bgStart": "#090D16", "bgEnd": "#162032", "layout": "split-editorial", "motif": "orbit", "imagePrompt": "detailed prompt", "negativePrompt": "avoid blurry text" } }`,
        });
        return res.json({
          tool,
          data: { thumbnail: normalizeThumbnail(data.thumbnail as VideoKit["thumbnail"]) },
          modelUsed: usedModelLabel,
        });
      }

      if (tool === "scenes") {
        const schema = {
          type: Type.OBJECT,
          properties: {
            scenes: KIT_RESPONSE_SCHEMA.properties.scenes,
          },
          required: ["scenes"],
        };
        const data = await runStructured({
          systemInstruction: "You are a film director & AI video prompt architect. Output valid JSON only.",
          userPrompt: `Create a ${clampedScenes}-scene storyboard with spoken narration in ${language}, cumulative timestamps starting at 00:00, camera movement, audio prompt, and detailed AI video generation prompts (in English) for topic: "${cleanTopic}". Format: ${formatLabel}. Tone: ${tone}.`,
          schema,
          jsonExample: `{ "scenes": [{ "sceneNumber": 1, "title": "Hook", "timestamp": "00:00 - 00:10", "durationSeconds": 10, "narration": "spoken line", "voiceStyle": "Engaging", "audioPrompt": "BGM prompt", "videoPrompt": "visual shot prompt", "cameraMovement": "Slow dolly-in" }] }`,
        });
        return res.json({
          tool,
          data: { scenes: Array.isArray(data.scenes) ? data.scenes : [] },
          modelUsed: usedModelLabel,
        });
      }

      // audio tool: narration + voice style + BGM/SFX prompt
      const schema = {
        type: Type.OBJECT,
        properties: {
          narration: {
            type: Type.STRING,
            description: "Natural, punchy voiceover script ready for TTS synthesis.",
          },
          voiceStyle: {
            type: Type.STRING,
            description: "Delivery style cue for voiceover, e.g. Warm, confident narrator",
          },
          audioPrompt: {
            type: Type.STRING,
            description: "Detailed background music, ambient soundscape, and SFX production prompt.",
          },
        },
        required: ["narration", "voiceStyle", "audioPrompt"],
      };
      const data = await runStructured({
        systemInstruction: "You are a voiceover scriptwriter & sound designer. Output valid JSON only.",
        userPrompt: `Write a clean, compelling spoken voiceover script in ${language}, delivery voiceStyle cue, and detailed background music/SFX audioPrompt (in English) for topic: "${cleanTopic}". Format: ${formatLabel}. Tone: ${tone}.`,
        schema,
        jsonExample: `{ "narration": "spoken voiceover script", "voiceStyle": "Warm narrator", "audioPrompt": "ambient music and SFX prompt" }`,
      });
      return res.json({ tool, data, modelUsed: usedModelLabel });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  function decodeHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\\u0026/g, "&");
  }

  function extractMetaTag(html: string, attrValue: string): string {
    const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match?.[1]) return decodeHtmlEntities(match[1].trim());
    }
    return "";
  }

  function parseYouTubeChannelInput(rawInput: string): {
    fetchUrl: string;
    handle?: string;
    channelId?: string;
  } | null {
    const trimmed = rawInput.trim();
    if (!trimmed) return null;

    // Handle bare @handle or plain handle text
    if (!trimmed.includes(".") && !trimmed.includes("/")) {
      const handle = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
      if (!/^@[A-Za-z0-9._-]{2,50}$/.test(handle)) return null;
      return {
        fetchUrl: `https://www.youtube.com/${handle}`,
        handle,
      };
    }

    let candidateUrl = trimmed;
    if (!/^https?:\/\//i.test(candidateUrl)) {
      candidateUrl = `https://${candidateUrl}`;
    }

    let parsed: URL;
    try {
      parsed = new URL(candidateUrl);
    } catch {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    const isYoutube =
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com";
    if (!isYoutube) return null;

    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    const segments = cleanPath.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    if (segments[0].startsWith("@")) {
      const handle = segments[0];
      return { fetchUrl: `https://www.youtube.com/${handle}`, handle };
    }
    if (segments[0] === "channel" && segments[1]) {
      const channelId = segments[1];
      return {
        fetchUrl: `https://www.youtube.com/channel/${channelId}`,
        channelId,
      };
    }
    if ((segments[0] === "c" || segments[0] === "user") && segments[1]) {
      return {
        fetchUrl: `https://www.youtube.com/${segments[0]}/${segments[1]}`,
      };
    }
    // Legacy custom URL like youtube.com/mkbhd
    if (segments[0] !== "watch" && segments[0] !== "shorts" && segments[0] !== "playlist") {
      return { fetchUrl: `https://www.youtube.com/@${segments[0].replace(/^@/, "")}`, handle: `@${segments[0].replace(/^@/, "")}` };
    }

    return null;
  }

  app.post("/api/import-channel", async (req, res) => {
    try {
      const { input } = req.body as { input?: string };
      if (!input || !input.trim()) {
        return res.status(400).json({ error: "Please paste a YouTube channel link or @handle." });
      }

      const target = parseYouTubeChannelInput(input);
      if (!target) {
        return res.status(400).json({
          error: "Enter a valid YouTube channel link (e.g. youtube.com/@handle or /channel/UC...) or @handle.",
        });
      }

      // Optional official YouTube Data API v3 path if YOUTUBE_API_KEY is configured in environment
      const ytApiKey = process.env.YOUTUBE_API_KEY?.trim();
      if (ytApiKey && (target.handle || target.channelId)) {
        const qs = new URLSearchParams({ part: "snippet", key: ytApiKey });
        if (target.channelId) {
          qs.set("id", target.channelId);
        } else if (target.handle) {
          qs.set("forHandle", target.handle.replace(/^@/, ""));
        }
        const apiResp = await fetch(`https://www.googleapis.com/youtube/v3/channels?${qs.toString()}`);
        if (apiResp.ok) {
          const apiData: any = await apiResp.json();
          const item = apiData?.items?.[0];
          if (item?.snippet) {
            const snippet = item.snippet;
            const logo =
              snippet.thumbnails?.high?.url ||
              snippet.thumbnails?.medium?.url ||
              snippet.thumbnails?.default?.url ||
              "";
            return res.json({
              channelName: String(snippet.title || "").trim(),
              channelLogo: logo,
              channelHandle: snippet.customUrl || target.handle || "",
              channelUrl: target.fetchUrl,
              niche: String(snippet.description || "").replace(/\s+/g, " ").trim().slice(0, 160),
            });
          }
        }
      }

      const pageResp = await fetch(target.fetchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: "SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg",
        },
        redirect: "follow",
      });

      if (!pageResp.ok) {
        return res.status(404).json({
          error: "Could not find that YouTube channel. Double-check the URL or @handle.",
        });
      }

      const html = await pageResp.text();

      let channelName =
        extractMetaTag(html, "og:title") ||
        extractMetaTag(html, "twitter:title") ||
        extractMetaTag(html, "title");

      if (!channelName) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch?.[1]) {
          channelName = decodeHtmlEntities(titleMatch[1]).replace(/\s*-\s*YouTube\s*$/i, "").trim();
        }
      }

      let channelLogo =
        extractMetaTag(html, "og:image") ||
        extractMetaTag(html, "twitter:image");

      if (!channelLogo) {
        const avatarMatch = html.match(
          /"avatar"\s*:\s*\{\s*"thumbnails"\s*:\s*\[\s*\{\s*"url"\s*:\s*"(https:[^"]+)"/
        );
        if (avatarMatch?.[1]) {
          channelLogo = decodeHtmlEntities(avatarMatch[1]);
        }
      }

      if (channelLogo.startsWith("//")) {
        channelLogo = `https:${channelLogo}`;
      }

      const rawDesc =
        extractMetaTag(html, "og:description") ||
        extractMetaTag(html, "description");
      const niche = rawDesc.replace(/\s+/g, " ").trim().slice(0, 160);

      const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
      const canonicalUrl = canonicalMatch?.[1] || target.fetchUrl;

      let handle = target.handle || "";
      if (!handle) {
        const vanityMatch = html.match(/"vanityChannelUrl"\s*:\s*"https?:\/\/www\.youtube\.com\/(@[^"]+)"/i);
        if (vanityMatch?.[1]) handle = vanityMatch[1];
      }

      if (
        !channelName ||
        channelName.toLowerCase() === "youtube" ||
        channelName.toLowerCase().includes("before you continue")
      ) {
        return res.status(422).json({
          error: "YouTube blocked automated lookup right now. You can enter your Channel Name below manually.",
        });
      }

      return res.json({
        channelName,
        channelLogo,
        channelHandle: handle,
        channelUrl: canonicalUrl,
        niche,
      });
    } catch {
      return res.status(500).json({
        error: "Unable to reach YouTube right now. Try again or enter your channel details manually.",
      });
    }
  });

  app.post("/api/repurpose-social", async (req, res) => {
    try {
      const {
        currentKit,
        modelMode = "all-free-tier",
        channelProfile,
      } = req.body as {
        currentKit?: VideoKit;
        modelMode?: ModelMode;
        channelProfile?: ChannelProfile;
      };

      if (!currentKit || !currentKit.primaryTitle) {
        return res.status(400).json({ error: "A video kit is required to generate social promos." });
      }

      const externalModel = parseExternalMode(modelMode);
      const resolved = resolveFreeTierModel(modelMode, true);
      const channelContext = formatChannelProfileContext(channelProfile);

      const systemInstruction = `You are a multi-platform creator growth strategist.
Turn the provided video kit into ready-to-publish promotional copy across X/Twitter, LinkedIn, Instagram/TikTok, and Email Newsletter.
Keep hooks crisp, human, and free of corporate buzzwords. Output valid JSON only.`;

      const userPrompt = `Repurpose this video kit into a cross-platform promo pack:
Title: ${currentKit.primaryTitle}
Topic: ${currentKit.topic}
Tone: ${currentKit.tone}
Key Points:
${currentKit.scenes.map((s) => `- ${s.title}: ${s.narration}`).join("\n")}${channelContext}`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          xThread: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "4-5 concise, high-engagement X/Twitter thread posts (each <= 260 chars).",
          },
          linkedInPost: {
            type: Type.STRING,
            description: "Clean narrative LinkedIn post with line breaks and takeaway question.",
          },
          instagramCaption: {
            type: Type.STRING,
            description: "Punchy Instagram Reel / TikTok caption with 3-5 relevant hashtags.",
          },
          newsletterBlurb: {
            type: Type.STRING,
            description: "Short email newsletter spotlight paragraph + CTA to watch.",
          },
        },
        required: ["xThread", "linkedInPost", "instagramCaption", "newsletterBlurb"],
      };

      let parsed: Record<string, any>;
      if (externalModel) {
        parsed = await callOpenAiCompatibleJson({
          provider: externalModel.provider,
          modelId: externalModel.modelId,
          systemInstruction,
          userPrompt,
          jsonExample: `{ "xThread": ["1/ Hook...", "2/ Insight..."], "linkedInPost": "...", "instagramCaption": "...", "newsletterBlurb": "..." }`,
        });
      } else {
        const ai = getAiClient();
        const resp = await ai.models.generateContent({
          model: resolved.model,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: schema,
            thinkingConfig: { thinkingLevel: resolved.thinkingLevel },
          },
        });
        parsed = JSON.parse((resp.text ?? "{}").trim());
      }

      return res.json({
        socialPack: {
          xThread: Array.isArray(parsed.xThread) ? parsed.xThread.map(String) : [],
          linkedInPost: String(parsed.linkedInPost || "").trim(),
          instagramCaption: String(parsed.instagramCaption || "").trim(),
          newsletterBlurb: String(parsed.newsletterBlurb || "").trim(),
        },
      });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  function parseYouTubeVideoUrl(raw: string): string | null {
    const trimmed = raw.trim();
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.includes("youtube.com") && !trimmed.includes("youtu.be")) {
      return null;
    }
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const u = new URL(candidate);
      const host = u.hostname.toLowerCase();
      if (
        host === "youtube.com" ||
        host === "www.youtube.com" ||
        host === "m.youtube.com" ||
        host === "youtu.be"
      ) {
        return u.toString();
      }
      return null;
    } catch {
      return null;
    }
  }

  app.post("/api/analyze-video", async (req, res) => {
    try {
      const {
        input,
        modelMode = "all-free-tier",
        channelProfile,
      } = req.body as {
        input?: string;
        modelMode?: ModelMode;
        channelProfile?: ChannelProfile;
      };

      if (!input || !input.trim()) {
        return res.status(400).json({ error: "Paste a YouTube video link or rough video notes." });
      }

      const safeUrl = parseYouTubeVideoUrl(input);
      let fetchedTitle = "";
      let fetchedChannel = "";
      let fetchedDesc = "";

      if (safeUrl) {
        try {
          const oembedResp = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(safeUrl)}&format=json`
          );
          if (oembedResp.ok) {
            const oembed: any = await oembedResp.json();
            fetchedTitle = String(oembed.title || "").trim();
            fetchedChannel = String(oembed.author_name || "").trim();
          }
        } catch {
          // Continue with HTML fallback
        }

        try {
          const pageResp = await fetch(safeUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
              "Accept-Language": "en-US,en;q=0.9",
              Cookie: "SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg",
            },
            redirect: "follow",
          });
          if (pageResp.ok) {
            const html = await pageResp.text();
            if (!fetchedTitle) {
              fetchedTitle = extractMetaTag(html, "og:title") || extractMetaTag(html, "title");
            }
            fetchedDesc = (
              extractMetaTag(html, "og:description") || extractMetaTag(html, "description")
            ).slice(0, 600);
          }
        } catch {
          // Proceed with oEmbed or URL alone
        }
      }

      const externalModel = parseExternalMode(modelMode);
      const resolved = resolveFreeTierModel(modelMode, false);
      const channelContext = formatChannelProfileContext(channelProfile);

      const systemInstruction = `You are a YouTube packaging & retention strategist.
Analyze the reference video or notes and provide a concise breakdown of why it works, what content gaps viewers are left wanting, and 3 remix angles the user can turn into a better video for their own channel.
Output strictly valid JSON.`;

      const referenceSummary = safeUrl
        ? `Reference URL: ${safeUrl}
Video Title: ${fetchedTitle || "Unknown (analyze from URL/context)"}
Channel: ${fetchedChannel || "Unknown"}
Description Snippet: ${fetchedDesc || "None"}`
        : `User Reference Notes / Concept:\n${input.trim()}`;

      const userPrompt = `Analyze this reference and return hook breakdown, 3-4 whyItWorks bullets, 3-4 contentGaps to exploit, and 3 remixAngles (title, hook, angle):
${referenceSummary}${channelContext}`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          videoTitle: { type: Type.STRING },
          hookBreakdown: { type: Type.STRING },
          whyItWorks: { type: Type.ARRAY, items: { type: Type.STRING } },
          contentGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          remixAngles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                hook: { type: Type.STRING },
                angle: { type: Type.STRING },
              },
              required: ["title", "hook", "angle"],
            },
          },
        },
        required: ["videoTitle", "hookBreakdown", "whyItWorks", "contentGaps", "remixAngles"],
      };

      let parsed: Record<string, any>;
      if (externalModel) {
        parsed = await callOpenAiCompatibleJson({
          provider: externalModel.provider,
          modelId: externalModel.modelId,
          systemInstruction,
          userPrompt,
          jsonExample: `{ "videoTitle": "...", "hookBreakdown": "...", "whyItWorks": ["..."], "contentGaps": ["..."], "remixAngles": [{ "title": "...", "hook": "...", "angle": "Contrarian" }] }`,
        });
      } else {
        const ai = getAiClient();
        const resp = await ai.models.generateContent({
          model: resolved.model,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: schema,
            thinkingConfig: { thinkingLevel: resolved.thinkingLevel },
          },
        });
        parsed = JSON.parse((resp.text ?? "{}").trim());
      }

      return res.json({
        analysis: {
          sourceUrl: safeUrl || undefined,
          videoTitle: fetchedTitle || String(parsed.videoTitle || input.trim()).slice(0, 140),
          channelName: fetchedChannel || undefined,
          hookBreakdown: String(parsed.hookBreakdown || "").trim(),
          whyItWorks: Array.isArray(parsed.whyItWorks) ? parsed.whyItWorks.map(String) : [],
          contentGaps: Array.isArray(parsed.contentGaps) ? parsed.contentGaps.map(String) : [],
          remixAngles: Array.isArray(parsed.remixAngles) ? parsed.remixAngles : [],
        },
      });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`PromptReel server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
