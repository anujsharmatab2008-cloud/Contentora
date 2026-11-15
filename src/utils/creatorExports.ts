import JSZip from "jszip";
import type { SceneAudioState, SceneItem, SocialPromoPack, VideoKit } from "../types.ts";

function formatSrtTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000);
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function splitCaptionLines(text: string, maxCharsPerLine = 42): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildSrtExport(scenes: SceneItem[]): string {
  const blocks: string[] = [];
  let cueIndex = 1;
  let cursor = 0;

  for (const scene of scenes) {
    const duration = Math.max(2, Number(scene.durationSeconds) || 8);
    const narration = scene.narration?.trim();
    if (!narration) {
      cursor += duration;
      continue;
    }

    const lines = splitCaptionLines(narration, 42);
    const chunks: string[] = [];
    for (let i = 0; i < lines.length; i += 2) {
      chunks.push(lines.slice(i, i + 2).join("\n"));
    }

    const sliceSec = duration / Math.max(1, chunks.length);
    chunks.forEach((chunk, idx) => {
      const start = cursor + idx * sliceSec;
      const end = cursor + (idx + 1) * sliceSec - 0.05;
      blocks.push(
        `${cueIndex}\n${formatSrtTime(start)} --> ${formatSrtTime(Math.max(start + 0.5, end))}\n${chunk}`
      );
      cueIndex += 1;
    });

    cursor += duration;
  }

  return blocks.join("\n\n");
}

function csvEscape(value: string | number | undefined): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildShotListCsv(kit: Pick<VideoKit, "primaryTitle" | "scenes">): string {
  const header = [
    "Scene",
    "Timestamp",
    "Duration (s)",
    "Scene Title",
    "Spoken Voiceover",
    "Camera Direction",
    "B-Roll / Visual Prompt",
    "BGM & SFX Cue",
  ];

  const rows = kit.scenes.map((s) =>
    [
      s.sceneNumber,
      s.timestamp,
      s.durationSeconds,
      s.title,
      s.narration,
      s.cameraMovement,
      s.videoPrompt,
      s.audioPrompt,
    ]
      .map(csvEscape)
      .join(",")
  );

  return [header.map(csvEscape).join(","), ...rows].join("\n");
}

export function buildChaptersText(scenes: SceneItem[]): string {
  return scenes
    .map((s) => `${(s.timestamp || "00:00").split("-")[0].trim()} ${s.title}`)
    .join("\n");
}

export function downloadTextFile(filename: string, content: string, mimeType = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export interface ReadinessCheckItem {
  id: string;
  label: string;
  status: "pass" | "warn";
  detail: string;
}

export function evaluatePublishReadiness(kit: VideoKit): ReadinessCheckItem[] {
  const titleLen = kit.primaryTitle.trim().length;
  const tagChars = kit.tags.join(", ").length;
  const hasChapters = kit.description.includes("00:00");
  const descLen = kit.description.trim().length;
  const thumbWords = kit.thumbnail.headline.trim().split(/\s+/).filter(Boolean).length;
  const hooksCount = kit.hookVariations?.length ?? 0;

  return [
    {
      id: "title-len",
      label: "Title Feed Fit",
      status: titleLen > 0 && titleLen <= 60 ? "pass" : "warn",
      detail:
        titleLen <= 60
          ? `${titleLen}/60 chars — fits cleanly without mobile truncation`
          : `${titleLen} chars — consider trimming under 60 chars`,
    },
    {
      id: "thumb-words",
      label: "Thumbnail Readability",
      status: thumbWords > 0 && thumbWords <= 5 ? "pass" : "warn",
      detail:
        thumbWords <= 5
          ? `${thumbWords} words on canvas — crisp at mobile scale`
          : `${thumbWords} words — shorten to 2–4 punchy words`,
    },
    {
      id: "chapters",
      label: "Description & 00:00 Chapters",
      status: hasChapters && descLen >= 150 ? "pass" : "warn",
      detail:
        hasChapters && descLen >= 150
          ? `Includes 00:00 chapters and ${descLen} chars of SEO context`
          : !hasChapters
          ? "Add 00:00 timestamp chapters to enable YouTube chapter bars"
          : "Description is short — expand above 150 chars for search SEO",
    },
    {
      id: "tags-limit",
      label: "SEO Tags Budget",
      status: tagChars <= 500 && kit.tags.length >= 6 ? "pass" : "warn",
      detail:
        tagChars <= 500
          ? `${tagChars}/500 chars across ${kit.tags.length} tags`
          : `${tagChars}/500 chars — trim a few tags to fit YouTube's 500-char box`,
    },
    {
      id: "hashtags",
      label: "Hashtags",
      status: kit.hashtags.length >= 3 && kit.hashtags.length <= 15 ? "pass" : "warn",
      detail: `${kit.hashtags.length} hashtags ready (3–5 appear above the YouTube title)`,
    },
    {
      id: "hooks-engagement",
      label: "Hooks & Engagement Assets",
      status: hooksCount >= 2 && Boolean(kit.pinnedComment) ? "pass" : "warn",
      detail: `${hooksCount} opening hooks · ${kit.pinnedComment ? "Pinned comment ready" : "No pinned comment"}`,
    },
  ];
}

export function buildYouTubeUploadText(kit: VideoKit): string {
  return [
    "=== PRIMARY TITLE ===",
    kit.primaryTitle,
    "",
    "=== DESCRIPTION (WITH CHAPTERS) ===",
    kit.description,
    "",
    "=== CHAPTERS ONLY ===",
    buildChaptersText(kit.scenes),
    "",
    "=== PINNED COMMENT ===",
    kit.pinnedComment || "",
    "",
    "=== SEO TAGS (PASTE INTO STUDIO TAGS BOX) ===",
    kit.tags.join(", "),
    "",
    "=== HASHTAGS ===",
    kit.hashtags.join(" "),
  ].join("\n");
}

export function buildSocialPackText(pack: SocialPromoPack): string {
  return [
    "=== X / TWITTER THREAD ===",
    ...pack.xThread.map((tweet, idx) => `${idx + 1}/ ${tweet}`),
    "",
    "=== LINKEDIN POST ===",
    pack.linkedInPost,
    "",
    "=== INSTAGRAM / TIKTOK CAPTION ===",
    pack.instagramCaption,
    "",
    "=== EMAIL NEWSLETTER BLURB ===",
    pack.newsletterBlurb,
  ].join("\n");
}

function dataUrlToBase64Payload(dataUrl: string): string | null {
  const idx = dataUrl.indexOf("base64,");
  if (idx === -1) return null;
  return dataUrl.slice(idx + 7);
}

export async function exportProductionZip(params: {
  kit: VideoKit;
  markdownContent: string;
  thumbnailPngUrl?: string;
  audioByScene?: Record<number, SceneAudioState>;
}): Promise<void> {
  const { kit, markdownContent, thumbnailPngUrl, audioByScene } = params;
  const zip = new JSZip();
  const slug =
    kit.primaryTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "video-kit";

  zip.file("01-script-and-kit.md", markdownContent);
  const srt = buildSrtExport(kit.scenes);
  if (srt) {
    zip.file("02-captions.srt", srt);
  }
  zip.file("03-shot-list.csv", buildShotListCsv(kit));
  zip.file("04-youtube-upload.txt", buildYouTubeUploadText(kit));

  if (thumbnailPngUrl) {
    const pngBase64 = dataUrlToBase64Payload(thumbnailPngUrl);
    if (pngBase64) {
      zip.file("05-thumbnail.png", pngBase64, { base64: true });
    }
  }

  if (kit.socialPack) {
    zip.file("06-social-promo-pack.txt", buildSocialPackText(kit.socialPack));
  }

  if (audioByScene) {
    for (const scene of kit.scenes) {
      const audioUrl = audioByScene[scene.sceneNumber]?.audioUrl;
      if (audioUrl) {
        const audioBase64 = dataUrlToBase64Payload(audioUrl);
        if (audioBase64) {
          const fileName = `audio/scene-${String(scene.sceneNumber).padStart(2, "0")}-voiceover.wav`;
          zip.file(fileName, audioBase64, { base64: true });
        }
      }
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}-production-pack.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
