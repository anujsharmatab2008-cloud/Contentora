import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Film,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

interface SiteDemoModalProps {
  open: boolean;
  onClose: () => void;
  onStartCreate?: () => void;
}

interface DemoChapter {
  id: string;
  num: string;
  label: string;
  title: string;
  caption: string;
  startSec: number;
  endSec: number;
  narration: string;
}

const DEMO_DURATION_SEC = 36;

const DEMO_THUMBNAIL_SRC =
  "/assets/aistudio/IMG_9040db62-0743-4be4-bbf2-6b952e038399_f9928a2b.jpg";

const DEMO_CHAPTERS: DemoChapter[] = [
  {
    id: "prompt",
    num: "01",
    label: "Prompt",
    title: "Enter One Simple Idea",
    caption:
      "Type a topic like \"Why Airplanes Can't Fly Higher\", choose YouTube 16:9, language, tone, and scenes.",
    startSec: 0,
    endSec: 6,
    narration:
      "Start by typing your video idea, like why commercial airplanes cannot fly higher, and pick your format and tone.",
  },
  {
    id: "thumbnail",
    num: "02",
    label: "Thumbnail",
    title: "Thumbnail Studio & YouTube Feed Check",
    caption:
      "First, preview your \"CAN'T GO HIGHER?\" thumbnail in the live studio and inside a realistic YouTube feed.",
    startSec: 6,
    endSec: 12,
    narration:
      "First, inspect your Can't Go Higher thumbnail right inside the live studio and realistic YouTube feed preview.",
  },
  {
    id: "titles",
    num: "03",
    label: "Titles & Hooks",
    title: "High-CTR Titles & 5s Openers",
    caption:
      "Next, get your primary headline, 5 curiosity and SEO title angles, plus 3 spoken 5-second opening hooks.",
    startSec: 12,
    endSec: 18,
    narration:
      "Next, get a primary high-click title, five angled alternatives, and three opening five-second aviation hooks.",
  },
  {
    id: "scenes",
    num: "04",
    label: "Storyboard",
    title: "Timed Scenes, Camera & Video Prompts",
    caption:
      "Every scene includes timestamps, spoken narration, camera direction, and AI video prompts.",
    startSec: 18,
    endSec: 24,
    narration:
      "Review timed scenes complete with camera cues, cockpit visuals, narration, and AI video prompts.",
  },
  {
    id: "audio",
    num: "05",
    label: "Voice & Audio",
    title: "Studio WAV Voiceover & Teleprompter",
    caption:
      "Synthesize clean WAV voiceovers in 5 narrator voices, read with the teleprompter, and copy sound prompts.",
    startSec: 24,
    endSec: 30,
    narration:
      "Synthesize downloadable WAV voiceovers, copy ambient sound prompts, or record cleanly with the teleprompter.",
  },
  {
    id: "export",
    num: "06",
    label: "SEO & Export",
    title: "SEO Metadata, Analytics & .ZIP Pack",
    caption:
      "Track project stages and streaks in Analytics, then download scripts, PNG thumbnail, .SRT captions, and CSV in one .ZIP.",
    startSec: 30,
    endSec: 36,
    narration:
      "Finish with YouTube SEO tags, daily streak analytics, and a one-click zip production pack.",
  },
];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
  stroke?: string,
  lineWidth = 1
) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): boolean {
  if (!img || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
    return false;
  }
  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let drawW = w;
  let drawH = h;
  let drawX = x;
  let drawY = y;
  if (imgRatio > boxRatio) {
    drawH = h;
    drawW = h * imgRatio;
    drawX = x - (drawW - w) / 2;
  } else {
    drawW = w;
    drawH = w / imgRatio;
    drawY = y - (drawH - h) / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
  return true;
}

function drawDemoFrame(
  ctx: CanvasRenderingContext2D,
  timeSec: number,
  thumbImg: HTMLImageElement | null
) {
  const W = 1280;
  const H = 720;

  // Base obsidian canvas
  ctx.fillStyle = "#06060A";
  ctx.fillRect(0, 0, W, H);

  // Subtle architectural grid
  ctx.strokeStyle = "rgba(255, 0, 110, 0.065)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 48) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, H);
    ctx.stroke();
  }
  for (let gy = 0; gy <= H; gy += 48) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
  }

  // Soft studio spotlight
  const glow = ctx.createRadialGradient(920, 320, 40, 920, 320, 560);
  glow.addColorStop(0, "rgba(255, 0, 110, 0.20)");
  glow.addColorStop(0.5, "rgba(255, 0, 110, 0.05)");
  glow.addColorStop(1, "rgba(6, 6, 10, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Determine current chapter (0..5) and local progress (0..1)
  const clamped = Math.max(0, Math.min(DEMO_DURATION_SEC - 0.001, timeSec));
  const chIdx = Math.min(DEMO_CHAPTERS.length - 1, Math.floor(clamped / 6));
  const ch = DEMO_CHAPTERS[chIdx];
  const localP = clamp01((clamped - ch.startSec) / (ch.endSec - ch.startSec));
  const enter = easeOutCubic(clamp01(localP * 3.2));

  // Simulated browser/studio window frame
  const winX = 76;
  const winY = 58;
  const winW = W - 152;
  const winH = H - 134;
  fillRoundRect(ctx, winX, winY, winW, winH, 20, "#0D0D12", "rgba(255,255,255,0.12)", 1.5);

  // Window header bar
  fillRoundRect(ctx, winX, winY, winW, 56, 20, "#121218");
  ctx.fillStyle = "#121218";
  ctx.fillRect(winX, winY + 34, winW, 22);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(winX, winY + 56);
  ctx.lineTo(winX + winW, winY + 56);
  ctx.stroke();

  // Brand mark inside window header
  fillRoundRect(ctx, winX + 24, winY + 14, 28, 28, 8, "rgba(255,0,110,0.15)", "rgba(255,0,110,0.5)");
  ctx.fillStyle = "#FF006E";
  ctx.font = "700 14px Plus Jakarta Sans, system-ui, sans-serif";
  ctx.fillText("C", winX + 33, winY + 33);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 15px Plus Jakarta Sans, system-ui, sans-serif";
  ctx.fillText("Contentora Studio", winX + 64, winY + 33);

  // Step tabs along top right of mockup window
  const stepNames = ["Prompt", "Thumbnail", "Titles", "Scenes", "Voice", "Export"];
  let tabX = winX + 320;
  stepNames.forEach((name, idx) => {
    const active = idx === chIdx;
    ctx.font = active
      ? "600 13px Plus Jakarta Sans, system-ui, sans-serif"
      : "500 13px Plus Jakarta Sans, system-ui, sans-serif";
    const tw = ctx.measureText(name).width + 24;
    if (active) {
      fillRoundRect(ctx, tabX, winY + 13, tw, 30, 8, "rgba(255,0,110,0.18)", "#FF006E", 1);
      ctx.fillStyle = "#FFFFFF";
    } else {
      ctx.fillStyle = idx < chIdx ? "#D4D4D8" : "#71717A";
    }
    ctx.fillText(name, tabX + 12, winY + 33);
    tabX += tw + 10;
  });

  // Main stage coordinates inside window
  const stageX = winX + 36;
  const stageY = winY + 84;
  const stageW = winW - 72;
  const stageH = winH - 114;

  // Step kicker + title at top of inner stage
  ctx.fillStyle = "#FF006E";
  ctx.font = "700 13px JetBrains Mono, monospace";
  ctx.fillText(`STEP ${ch.num} OF 06`, stageX, stageY + 12);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 28px Plus Jakarta Sans, system-ui, sans-serif";
  ctx.fillText(ch.title, stageX, stageY + 46);

  // Content area below title
  const contentY = stageY + 72;

  if (chIdx === 0) {
    // SCENE 1: PROMPT INPUT -> GENERATE
    const boxW = stageW;
    const boxH = 215;
    fillRoundRect(ctx, stageX, contentY + (1 - enter) * 14, boxW, boxH, 16, "#14141B", "rgba(255,0,110,0.45)", 1.5);

    const fullPrompt = "Why Airplanes Can't Fly Higher Than 43,000 Feet";
    const typedLen = Math.floor(fullPrompt.length * clamp01(localP * 1.9));
    const shownPrompt = fullPrompt.slice(0, typedLen);

    ctx.fillStyle = "#A1A1AA";
    ctx.font = "600 12px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("VIDEO IDEA PROMPT", stageX + 24, contentY + 34);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "500 22px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText(shownPrompt, stageX + 24, contentY + 78);

    // Blinking cursor
    if (Math.floor(timeSec * 3) % 2 === 0 || typedLen < fullPrompt.length) {
      const cw = ctx.measureText(shownPrompt).width;
      ctx.fillStyle = "#FF006E";
      ctx.fillRect(stageX + 26 + cw, contentY + 56, 3, 28);
    }

    // Parameter chips bar inside prompt window
    fillRoundRect(ctx, stageX + 20, contentY + 140, boxW - 40, 56, 12, "#1A1A23", "rgba(255,255,255,0.08)");
    const controls = ["YouTube 16:9", "English", "Engaging & Clear", "5 Scenes"];
    let cx = stageX + 34;
    controls.forEach((lbl) => {
      ctx.font = "600 13px Plus Jakarta Sans, system-ui, sans-serif";
      const w = ctx.measureText(lbl).width + 28;
      fillRoundRect(ctx, cx, contentY + 152, w, 32, 8, "#23232E", "rgba(255,255,255,0.1)");
      ctx.fillStyle = "#E4E4E7";
      ctx.fillText(lbl, cx + 14, contentY + 173);
      cx += w + 12;
    });

    // Animated Generate CTA button on right
    const btnActive = localP > 0.58;
    const btnScale = btnActive ? 0.96 + 0.04 * Math.sin((localP - 0.58) * Math.PI * 3) : 1;
    const bw = 176 * btnScale;
    const bh = 36 * btnScale;
    fillRoundRect(
      ctx,
      stageX + boxW - 34 - bw,
      contentY + 150,
      bw,
      bh,
      9,
      btnActive ? "#FF1B7D" : "#FF006E"
    );
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 13px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText(localP > 0.7 ? "Building Full Kit..." : "Generate Kit  →", stageX + boxW - 34 - bw + 24, contentY + 173);

    // Output preview cards peeking in at bottom (Thumbnail appears first right after typing!)
    const outputLabels = [
      { t: "1280×720 Thumbnail", d: "CAN'T GO HIGHER? art" },
      { t: "6 Titles & 3 Hooks", d: "High-CTR aviation angles" },
      { t: "5 Timed Scenes", d: "Coffin corner & WAV audio" },
      { t: "SEO + .ZIP Export", d: "Tags, .SRT, shot list CSV" },
    ];
    const cardW = (stageW - 42) / 4;
    outputLabels.forEach((item, i) => {
      const cardReveal = easeOutCubic(clamp01((localP - 0.52 - i * 0.09) * 3.5));
      const cardX = stageX + i * (cardW + 14);
      const cy = contentY + 245 + (1 - cardReveal) * 18;
      ctx.save();
      ctx.globalAlpha = cardReveal;
      fillRoundRect(
        ctx,
        cardX,
        cy,
        cardW,
        110,
        12,
        "#13131A",
        i === 0 ? "rgba(255,0,110,0.55)" : "rgba(255,255,255,0.09)"
      );
      if (i === 0 && thumbImg && thumbImg.complete && thumbImg.naturalWidth > 0) {
        drawCoverImage(ctx, thumbImg, cardX + cardW - 76, cy + 12, 62, 35, 6);
      }
      ctx.fillStyle = "#FF006E";
      ctx.font = "700 12px JetBrains Mono, monospace";
      ctx.fillText(`0${i + 1}`, cardX + 18, cy + 30);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "600 15px Plus Jakarta Sans, system-ui, sans-serif";
      ctx.fillText(item.t, cardX + 18, cy + 62);
      ctx.fillStyle = "#A1A1AA";
      ctx.font = "400 12px Plus Jakarta Sans, system-ui, sans-serif";
      ctx.fillText(item.d, cardX + 18, cy + 86);
      ctx.restore();
    });
  } else if (chIdx === 1) {
    // SCENE 2 (FIRST AFTER PROMPT): USER UPLOADED THUMBNAIL + YOUTUBE FEED PREVIEW
    const thumbW = 540;
    const thumbH = 304;
    const drewImage = drawCoverImage(ctx, thumbImg, stageX, contentY, thumbW, thumbH, 16);
    if (!drewImage) {
      const thumbGrad = ctx.createLinearGradient(stageX, contentY, stageX + thumbW, contentY + thumbH);
      thumbGrad.addColorStop(0, "#020E24");
      thumbGrad.addColorStop(1, "#0B5FA5");
      fillRoundRect(ctx, stageX, contentY, thumbW, thumbH, 16, thumbGrad, "rgba(255,255,255,0.16)", 1.5);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "800 42px Plus Jakarta Sans, system-ui, sans-serif";
      ctx.fillText("CAN'T GO", stageX + 28, contentY + 86);
      ctx.fillStyle = "#EF4444";
      ctx.fillText("HIGHER?", stageX + 28, contentY + 138);
    }

    // Crisp outer border around the uploaded thumbnail
    roundRectPath(ctx, stageX, contentY, thumbW, thumbH, 16);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Duration corner badge on thumbnail
    fillRoundRect(ctx, stageX + thumbW - 68, contentY + thumbH - 36, 52, 22, 5, "rgba(0,0,0,0.85)");
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 12px JetBrains Mono, monospace";
    ctx.fillText("08:14", stageX + thumbW - 58, contentY + thumbH - 21);

    // Right panel: Realistic YouTube Feed Preview using the same uploaded thumbnail
    const rightX = stageX + thumbW + 28;
    const rightW = stageW - thumbW - 28;
    fillRoundRect(ctx, rightX, contentY, rightW, thumbH, 16, "#13131A", "rgba(255,255,255,0.12)");
    ctx.fillStyle = "#FF006E";
    ctx.font = "700 12px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("YOUTUBE FEED PREVIEW", rightX + 24, contentY + 32);

    // Mini YouTube card preview inside right panel
    const cardX = rightX + 24;
    const cardY = contentY + 50;
    const miniW = rightW - 48;
    const miniH = 122;
    const drewMini = drawCoverImage(ctx, thumbImg, cardX, cardY, miniW, miniH, 10);
    if (!drewMini) {
      fillRoundRect(ctx, cardX, cardY, miniW, miniH, 10, "#0A2A52");
    }
    roundRectPath(ctx, cardX, cardY, miniW, miniH, 10);
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    ctx.stroke();
    fillRoundRect(ctx, cardX + miniW - 54, cardY + miniH - 26, 44, 18, 4, "rgba(0,0,0,0.85)");
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 10px JetBrains Mono, monospace";
    ctx.fillText("08:14", cardX + miniW - 46, cardY + miniH - 13);

    // Channel avatar + title line below mini feed card
    ctx.beginPath();
    ctx.arc(rightX + 42, contentY + 206, 17, 0, Math.PI * 2);
    ctx.fillStyle = "#FF006E";
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 14px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("C", rightX + 37, contentY + 211);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 15px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("Why Airplanes Can't Fly Any Higher", rightX + 70, contentY + 201);
    ctx.fillStyle = "#A1A1AA";
    ctx.font = "400 12px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("Your Channel · 412K views · 3 hours ago", rightX + 70, contentY + 221);

    fillRoundRect(ctx, rightX + 24, contentY + 244, 200, 40, 10, "#FF006E");
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 13px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("Export 1280×720 Thumbnail", rightX + 39, contentY + 269);
  } else if (chIdx === 2) {
    // SCENE 3: HIGH-CTR TITLES & OPENING HOOKS
    fillRoundRect(ctx, stageX, contentY, stageW, 112, 14, "#14141C", "rgba(255,0,110,0.5)", 1.5);
    ctx.fillStyle = "#FF006E";
    ctx.font = "700 12px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("PRIMARY TITLE", stageX + 24, contentY + 32);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 24px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("Why Airplanes Can't Fly Any Higher (The 43,000 ft Limit)", stageX + 24, contentY + 72);
    ctx.fillStyle = "#A1A1AA";
    ctx.font = "500 12px JetBrains Mono, monospace";
    ctx.fillText("56 chars · High-CTR", stageX + stageW - 170, contentY + 32);

    const altTitles = [
      { angle: "Curiosity", t: "The Invisible Wall Stopping Every Commercial Jet" },
      { angle: "Direct SEO", t: "Why Passenger Planes Stop Climbing at 40,000 Feet" },
      { angle: "Contrarian", t: "It's Not Fuel — The Physics Behind Flight Ceilings" },
    ];
    altTitles.forEach((row, i) => {
      const rp = easeOutCubic(clamp01((localP - i * 0.14) * 3));
      const ry = contentY + 132 + i * 54 + (1 - rp) * 14;
      ctx.save();
      ctx.globalAlpha = rp;
      fillRoundRect(ctx, stageX, ry, stageW * 0.57, 46, 10, "#121218", "rgba(255,255,255,0.08)");
      ctx.fillStyle = "#FF006E";
      ctx.font = "700 12px JetBrains Mono, monospace";
      ctx.fillText(`0${i + 1}`, stageX + 16, ry + 28);
      ctx.fillStyle = "#E4E4E7";
      ctx.font = "600 13px Plus Jakarta Sans, system-ui, sans-serif";
      ctx.fillText(row.t, stageX + 46, ry + 28);
      ctx.restore();
    });

    // Right column: Opening 5-second hook card
    const hookX = stageX + stageW * 0.6;
    const hookW = stageW * 0.4;
    const hookFade = easeOutCubic(clamp01((localP - 0.2) * 2.5));
    ctx.save();
    ctx.globalAlpha = hookFade;
    fillRoundRect(ctx, hookX, contentY + 132, hookW, 154, 14, "#14141C", "rgba(255,255,255,0.12)");
    ctx.fillStyle = "#FF006E";
    ctx.font = "700 12px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("OPENING 5-SECOND HOOK", hookX + 20, contentY + 162);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 15px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText('"At 43,000 feet, one tiny gust can', hookX + 20, contentY + 196);
    ctx.fillText('either stall the wings or push the', hookX + 20, contentY + 219);
    ctx.fillText('jet past the sound barrier."', hookX + 20, contentY + 242);
    ctx.fillStyle = "#A1A1AA";
    ctx.font = "400 12px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("Visual cue: Boeing 787 climbing above cloud deck", hookX + 20, contentY + 270);
    ctx.restore();
  } else if (chIdx === 3) {
    // SCENE 4: SCENE-BY-SCENE STORYBOARD & PROMPTS
    const scenes = [
      {
        n: "01",
        t: "The Invisible Ceiling Above the Clouds",
        ts: "00:00 - 00:12",
        cam: "Air-to-air tracking · 35mm f/1.8",
        line: '"Every passenger jet levels off around 40,000 feet. What happens if pilots keep climbing?"',
      },
      {
        n: "02",
        t: "Where Thin Air Starves Lift & Engines",
        ts: "00:12 - 00:26",
        cam: "Turbine intake push-in · 50mm",
        line: '"At 43,000 feet, air density plunges by 75%. Wings lose lift and jet cores gasp for oxygen."',
      },
      {
        n: "03",
        t: "Inside Pilots' Dreaded Coffin Corner",
        ts: "00:26 - 00:44",
        cam: "Cockpit airspeed tape macro",
        line: '"Slow down slightly and the wing stalls. Speed up slightly and shockwaves hit the tail."',
      },
    ];

    const selected = Math.min(2, Math.floor(localP * 3));
    scenes.forEach((sc, idx) => {
      const sy = contentY + idx * 108;
      const active = idx === selected;
      fillRoundRect(
        ctx,
        stageX,
        sy,
        stageW,
        94,
        14,
        active ? "#171420" : "#121218",
        active ? "#FF006E" : "rgba(255,255,255,0.08)",
        active ? 1.5 : 1
      );
      ctx.fillStyle = active ? "#FF006E" : "#71717A";
      ctx.font = "700 14px JetBrains Mono, monospace";
      ctx.fillText(sc.n, stageX + 22, sy + 36);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "700 17px Plus Jakarta Sans, system-ui, sans-serif";
      ctx.fillText(sc.t, stageX + 60, sy + 36);

      ctx.fillStyle = "#A1A1AA";
      ctx.font = "500 12px JetBrains Mono, monospace";
      ctx.fillText(`${sc.ts}  ·  ${sc.cam}`, stageX + stageW - 360, sy + 35);

      ctx.fillStyle = "#D4D4D8";
      ctx.font = "400 14px Plus Jakarta Sans, system-ui, sans-serif";
      ctx.fillText(sc.line, stageX + 60, sy + 68);
    });
  } else if (chIdx === 4) {
    // SCENE 5: VOICEOVER AUDIO SYNTHESIS & WAVEFORM
    fillRoundRect(ctx, stageX, contentY, stageW, 310, 16, "#13131A", "rgba(255,255,255,0.12)");

    ctx.fillStyle = "#FF006E";
    ctx.font = "700 12px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("GEMINI 3.8 TTS · NARRATOR: KORE (WARM)", stageX + 28, contentY + 38);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 18px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText(
      '"At 43,000 feet, the gap between stalling and breaking Mach 1 shrinks to just a few knots."',
      stageX + 28,
      contentY + 80
    );

    // Animated real-time waveform bars
    const waveX = stageX + 28;
    const waveY = contentY + 116;
    const waveW = stageW - 56;
    const barCount = 56;
    const step = waveW / barCount;
    const playProgress = clamp01(localP * 1.1);

    fillRoundRect(ctx, waveX, waveY, waveW, 96, 12, "#0B0B10", "rgba(255,255,255,0.06)");
    for (let b = 0; b < barCount; b++) {
      const pct = b / barCount;
      const amp =
        0.22 +
        0.58 *
          Math.abs(Math.sin(b * 0.45 + timeSec * 5.2)) *
          Math.abs(Math.cos(b * 0.21 - timeSec * 2.8));
      const bh = Math.max(10, amp * 68);
      const bx = waveX + 14 + b * ((waveW - 28) / barCount);
      const by = waveY + (96 - bh) / 2;
      ctx.fillStyle = pct <= playProgress ? "#FF006E" : "rgba(255,255,255,0.18)";
      fillRoundRect(ctx, bx, by, Math.max(5, step * 0.56), bh, 3, ctx.fillStyle);
    }

    // Bottom playback strip
    fillRoundRect(ctx, stageX + 28, contentY + 236, 160, 42, 10, "#FF006E");
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 13px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("Download .WAV", stageX + 58, contentY + 262);

    fillRoundRect(ctx, stageX + 204, contentY + 236, 190, 42, 10, "#1E1E28", "rgba(255,255,255,0.12)");
    ctx.fillStyle = "#E4E4E7";
    ctx.fillText("Open Teleprompter", stageX + 232, contentY + 262);
  } else {
    // SCENE 6: SEO, ANALYTICS STREAK & .ZIP EXPORT
    const leftW = stageW * 0.56;
    const rightX = stageX + leftW + 24;
    const rightW = stageW - leftW - 24;

    fillRoundRect(ctx, stageX, contentY, leftW, 310, 16, "#13131A", "rgba(255,255,255,0.1)");
    ctx.fillStyle = "#FF006E";
    ctx.font = "700 12px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("CREATOR ANALYTICS & STREAK", stageX + 24, contentY + 34);

    // 3 KPI blocks
    const kpis = [
      { k: "Total Content", v: "148" },
      { k: "Active Streak", v: "12 Days" },
      { k: "Published", v: "9 Videos" },
    ];
    kpis.forEach((kp, idx) => {
      const kx = stageX + 24 + idx * ((leftW - 64) / 3 + 8);
      const kw = (leftW - 64) / 3;
      fillRoundRect(ctx, kx, contentY + 56, kw, 86, 10, "#1A1A23", "rgba(255,255,255,0.08)");
      ctx.fillStyle = "#A1A1AA";
      ctx.font = "500 11px Plus Jakarta Sans, system-ui, sans-serif";
      ctx.fillText(kp.k, kx + 14, contentY + 80);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "700 22px Plus Jakarta Sans, system-ui, sans-serif";
      ctx.fillText(kp.v, kx + 14, contentY + 116);
    });

    // 28-day heatmap preview
    ctx.fillStyle = "#A1A1AA";
    ctx.font = "600 11px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("28-DAY ACTIVITY HEATMAP", stageX + 24, contentY + 174);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 14; col++) {
        const idx = row * 14 + col;
        const lit = idx < Math.floor(10 + localP * 18);
        const intense = idx % 3 === 0 || idx > 22;
        const fill = !lit
          ? "#1C1C26"
          : intense
          ? "#FF006E"
          : "rgba(255,0,110,0.45)";
        fillRoundRect(ctx, stageX + 24 + col * 37, contentY + 190 + row * 40, 29, 29, 6, fill);
      }
    }

    // Right panel: 1-click export bundle
    fillRoundRect(ctx, rightX, contentY, rightW, 310, 16, "#14141C", "rgba(255,0,110,0.45)", 1.5);
    ctx.fillStyle = "#FF006E";
    ctx.font = "700 12px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("1-CLICK STUDIO BUNDLE", rightX + 24, contentY + 34);

    const files = [
      "cant-go-higher-script.md",
      "cant-go-higher-thumb.png",
      "aviation-captions.srt",
      "boeing-787-shot-list.csv",
    ];
    files.forEach((f, idx) => {
      const fy = contentY + 60 + idx * 42;
      fillRoundRect(ctx, rightX + 24, fy, rightW - 48, 34, 8, "#1B1B24", "rgba(255,255,255,0.08)");
      ctx.fillStyle = "#10B981";
      ctx.font = "700 12px Plus Jakarta Sans, system-ui, sans-serif";
      ctx.fillText("✓", rightX + 38, fy + 22);
      ctx.fillStyle = "#E4E4E7";
      ctx.font = "500 12px JetBrains Mono, monospace";
      ctx.fillText(f, rightX + 60, fy + 22);
      if (idx === 1 && thumbImg && thumbImg.complete && thumbImg.naturalWidth > 0) {
        drawCoverImage(ctx, thumbImg, rightX + rightW - 68, fy + 5, 38, 24, 4);
      }
    });

    fillRoundRect(ctx, rightX + 24, contentY + 242, rightW - 48, 42, 10, "#FF006E");
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 13px Plus Jakarta Sans, system-ui, sans-serif";
    ctx.fillText("Download .ZIP Production Pack", rightX + 74, contentY + 268);
  }

  // Subtle bottom caption inside the video frame
  const scrim = ctx.createLinearGradient(0, H - 76, 0, H);
  scrim.addColorStop(0, "rgba(6,6,10,0)");
  scrim.addColorStop(1, "rgba(6,6,10,0.92)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H - 76, W, 76);

  ctx.fillStyle = "#E4E4E7";
  ctx.font = "500 16px Plus Jakarta Sans, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(ch.caption, W / 2, H - 24);
  ctx.textAlign = "left";
}

export function SiteDemoModal({ open, onClose, onStartCreate }: SiteDemoModalProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [voiceOn, setVoiceOn] = useState(false);
  const [thumbReady, setThumbReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenChapterRef = useRef<number>(-1);
  const thumbImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = DEMO_THUMBNAIL_SRC;
    img.onload = () => {
      thumbImgRef.current = img;
      setThumbReady(true);
    };
    thumbImgRef.current = img;
    return () => {
      img.onload = null;
    };
  }, []);

  const chapterIndex = Math.min(
    DEMO_CHAPTERS.length - 1,
    Math.floor(Math.max(0, Math.min(DEMO_DURATION_SEC - 0.001, currentTime)) / 6)
  );
  const activeChapter = DEMO_CHAPTERS[chapterIndex] || DEMO_CHAPTERS[0];

  const stopVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    if (!open) {
      setIsPlaying(false);
      setCurrentTime(0);
      lastSpokenChapterRef.current = -1;
      stopVoice();
      return;
    }
    setCurrentTime(0);
    setIsPlaying(true);
    lastSpokenChapterRef.current = -1;
    return () => {
      stopVoice();
    };
  }, [open]);

  // Keyboard shortcuts while demo modal is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === "ArrowRight") {
        const nextIdx = Math.min(DEMO_CHAPTERS.length - 1, chapterIndex + 1);
        setCurrentTime(DEMO_CHAPTERS[nextIdx].startSec);
      } else if (e.key === "ArrowLeft") {
        const prevIdx = Math.max(0, chapterIndex - 1);
        setCurrentTime(DEMO_CHAPTERS[prevIdx].startSec);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, chapterIndex]);

  // 60fps Canvas video playback clock
  useEffect(() => {
    if (!open || !isPlaying) return;
    let rafId = 0;
    let prevTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - prevTs) / 1000);
      prevTs = now;
      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= DEMO_DURATION_SEC) {
          setIsPlaying(false);
          return DEMO_DURATION_SEC;
        }
        return next;
      });
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [open, isPlaying]);

  // Draw current video frame onto canvas
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawDemoFrame(ctx, currentTime, thumbImgRef.current);
  }, [open, currentTime, thumbReady]);

  // Optional narrated audio guide synced with chapters
  useEffect(() => {
    if (!open || !isPlaying || !voiceOn) {
      stopVoice();
      if (!voiceOn) lastSpokenChapterRef.current = -1;
      return;
    }
    if (lastSpokenChapterRef.current === chapterIndex) return;
    lastSpokenChapterRef.current = chapterIndex;
    stopVoice();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(activeChapter.narration);
      utter.rate = 1.04;
      window.speechSynthesis.speak(utter);
    }
  }, [open, isPlaying, voiceOn, chapterIndex, activeChapter.narration]);

  if (!open) return null;

  const progressPct = (currentTime / DEMO_DURATION_SEC) * 100;

  const handleTogglePlay = () => {
    if (!isPlaying && currentTime >= DEMO_DURATION_SEC) {
      setCurrentTime(0);
    }
    setIsPlaying((v) => !v);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = progressTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = clamp01((e.clientX - rect.left) / rect.width);
    lastSpokenChapterRef.current = -1;
    setCurrentTime(ratio * DEMO_DURATION_SEC);
  };

  const jumpToChapter = (idx: number) => {
    const target = DEMO_CHAPTERS[idx];
    if (!target) return;
    lastSpokenChapterRef.current = -1;
    setCurrentTime(target.startSec);
    setIsPlaying(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Contentora Workflow Demo Video"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-5xl rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#0B0A0F] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Film className="w-4 h-4 text-[#FF006E] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate font-display">
                How Contentora Works · Product Walkthrough
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums truncate">
                {activeChapter.num} / 06 · {activeChapter.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setVoiceOn((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/15 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              {voiceOn ? (
                <Volume2 className="w-3.5 h-3.5 text-[#FF006E]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span>{voiceOn ? "Voice Guide On" : "Voice Guide Off"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close demo"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 16:9 Cinema Video Viewport */}
        <div className="relative bg-[#06060A] flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            onClick={handleTogglePlay}
            className="w-full h-auto max-h-[58vh] aspect-video object-contain cursor-pointer select-none block"
          />

          {!isPlaying && (
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label="Play walkthrough video"
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors cursor-pointer"
            >
              <span className="w-16 h-16 rounded-full bg-[#FF006E] border border-white/25 text-white flex items-center justify-center shadow-2xl">
                <Play className="w-7 h-7 ml-0.5 fill-current" />
              </span>
            </button>
          )}
        </div>

        {/* Scrubbable Progress Bar & Transport Controls */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0E0E13] space-y-3 shrink-0">
          {/* Interactive Timeline Scrubber */}
          <div
            ref={progressTrackRef}
            onClick={handleSeek}
            role="slider"
            aria-label="Seek demo video timeline"
            aria-valuemin={0}
            aria-valuemax={DEMO_DURATION_SEC}
            aria-valuenow={Math.round(currentTime)}
            tabIndex={0}
            className="relative h-2 rounded-full bg-zinc-200 dark:bg-white/12 cursor-pointer overflow-hidden"
          >
            <div
              className="h-full bg-[#FF006E] transition-[width] duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => jumpToChapter(Math.max(0, chapterIndex - 1))}
                disabled={chapterIndex <= 0}
                aria-label="Previous chapter"
                className="p-2 rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60 disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF006E] hover:bg-[#e10062] text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{currentTime >= DEMO_DURATION_SEC ? "Replay" : "Play"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  jumpToChapter(Math.min(DEMO_CHAPTERS.length - 1, chapterIndex + 1))
                }
                disabled={chapterIndex >= DEMO_CHAPTERS.length - 1}
                aria-label="Next chapter"
                className="p-2 rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60 disabled:opacity-35 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  lastSpokenChapterRef.current = -1;
                  setCurrentTime(0);
                  setIsPlaying(true);
                }}
                aria-label="Restart demo"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>

              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums pl-1 whitespace-nowrap">
                {formatClock(currentTime)} / {formatClock(DEMO_DURATION_SEC)}
              </span>
            </div>

            {onStartCreate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartCreate();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
              >
                <span>Try It Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 6 Chapter Jump Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 pt-1">
            {DEMO_CHAPTERS.map((ch, idx) => {
              const active = idx === chapterIndex;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => jumpToChapter(idx)}
                  className={`px-2.5 py-1.5 rounded-lg border text-left transition-colors cursor-pointer truncate ${
                    active
                      ? "border-[#FF006E] bg-[#FF006E]/10 text-zinc-900 dark:text-white"
                      : "border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold tabular-nums mr-1.5 ${
                      active ? "text-[#FF006E]" : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {ch.num}
                  </span>
                  <span className="text-[11px] font-medium">{ch.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
