import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Image as ImageIcon, SlidersHorizontal, Upload, X } from "lucide-react";
import type {
  ThumbnailDesign,
  ThumbnailLayout,
  ThumbnailMotif,
  VideoFormat,
} from "../types.ts";
import { CopyButton } from "./CopyButton.tsx";

interface ThumbnailStudioProps {
  design: ThumbnailDesign;
  format: VideoFormat;
  primaryTitle: string;
  onPngChange?: (pngDataUrl: string) => void;
}

const LAYOUT_OPTIONS: { value: ThumbnailLayout; label: string }[] = [
  { value: "split-editorial", label: "YouTube Split" },
  { value: "bold-center", label: "Center Impact" },
  { value: "cinematic-frame", label: "Cinema Frame" },
  { value: "spotlight-minimal", label: "Spotlight" },
];

const MOTIF_OPTIONS: { value: ThumbnailMotif; label: string }[] = [
  { value: "orbit", label: "Reactor Core" },
  { value: "aperture", label: "Precision Lens" },
  { value: "waveform", label: "Audio Pulse" },
  { value: "prism", label: "Light Prism" },
  { value: "horizon-grid", label: "Cyber Grid" },
  { value: "peaks", label: "Dramatic Peaks" },
];

const STYLE_PRESETS: {
  name: string;
  accentColor: string;
  bgStart: string;
  bgEnd: string;
  layout: ThumbnailLayout;
}[] = [
  {
    name: "Viral Gold",
    accentColor: "#FACC15",
    bgStart: "#090B14",
    bgEnd: "#1E1B4B",
    layout: "split-editorial",
  },
  {
    name: "Neon Pink",
    accentColor: "#FF006E",
    bgStart: "#09060E",
    bgEnd: "#2A081E",
    layout: "split-editorial",
  },
  {
    name: "Turbo Orange",
    accentColor: "#F97316",
    bgStart: "#0B0A09",
    bgEnd: "#3B1506",
    layout: "split-editorial",
  },
  {
    name: "Electric Cyan",
    accentColor: "#06B6D4",
    bgStart: "#061018",
    bgEnd: "#0F2942",
    layout: "bold-center",
  },
];

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function getContrastTextColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#FFFFFF";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.64 ? "#09090B" : "#FFFFFF";
}

function getHighlightColor(accent: string): string {
  const clean = accent.replace("#", "").toUpperCase();
  // Use high-CTR Electric Gold on dark/saturated accents, or bright cyan/gold contrast
  if (clean === "FACC15" || clean === "EAB308" || clean === "FDE047") {
    return "#FACC15";
  }
  return "#FACC15";
}

function drawStudioBackdropEffects(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent: string,
  focalX: number,
  focalY: number
) {
  ctx.save();

  // Subtle halftone dot matrix focused around the focal visual
  ctx.fillStyle = "rgba(255, 255, 255, 0.045)";
  const step = 28;
  for (let x = 20; x < width; x += step) {
    for (let y = 20; y < height; y += step) {
      const dist = Math.hypot(x - focalX, y - focalY);
      if (dist < width * 0.55) {
        const radius = Math.max(0.8, 2.3 * (1 - dist / (width * 0.55)));
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Diagonal dramatic volumetric light rays
  for (let i = 0; i < 3; i++) {
    const startX = focalX - 240 + i * 165;
    const beamGrad = ctx.createLinearGradient(startX, 0, startX + 260, height);
    beamGrad.addColorStop(0, "rgba(255,255,255,0)");
    beamGrad.addColorStop(0.5, `${accent}18`);
    beamGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX + 110, 0);
    ctx.lineTo(startX + 360, height);
    ctx.lineTo(startX + 230, height);
    ctx.closePath();
    ctx.fill();
  }

  // Crisp focal embers / floating depth particles
  const particles = [
    { dx: -190, dy: -150, r: 4 },
    { dx: 185, dy: -125, r: 3.5 },
    { dx: -140, dy: 165, r: 3 },
    { dx: 210, dy: 135, r: 5 },
    { dx: 45, dy: -200, r: 2.5 },
    { dx: -250, dy: 30, r: 3 },
    { dx: 250, dy: -35, r: 4 },
    { dx: 95, dy: 195, r: 3 },
  ];
  particles.forEach((p, idx) => {
    const px = focalX + p.dx;
    const py = focalY + p.dy;
    const pg = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3.5);
    pg.addColorStop(0, idx % 2 === 0 ? "#FFFFFF" : accent);
    pg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, p.r * 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawMotif(
  ctx: CanvasRenderingContext2D,
  motif: ThumbnailMotif,
  cx: number,
  cy: number,
  scale: number,
  accent: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Intense multi-stop focal ambient aura
  const aura = ctx.createRadialGradient(0, 0, 12, 0, 0, 290);
  aura.addColorStop(0, "rgba(255,255,255,0.42)");
  aura.addColorStop(0.22, `${accent}AA`);
  aura.addColorStop(0.55, `${accent}36`);
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 290, 0, Math.PI * 2);
  ctx.fill();

  if (motif === "orbit" || motif === "aperture") {
    // High-contrast 3D mechanical/reactor turbine emblem
    // Outer segmented precision track
    ctx.lineCap = "round";
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const inner = i % 3 === 0 ? 172 : 186;
      const outer = 204;
      ctx.strokeStyle = i % 3 === 0 ? "#FFFFFFCC" : `${accent}AA`;
      ctx.lineWidth = i % 3 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }

    // Thick glowing energy arc rings
    ctx.strokeStyle = accent;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 148, -0.7, 2.35);
    ctx.stroke();

    ctx.strokeStyle = "#FFFFFFE6";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 148, 2.8, 5.2);
    ctx.stroke();

    // Inner turbine blades / iris segments
    const blades = 8;
    for (let i = 0; i < blades; i++) {
      ctx.save();
      ctx.rotate((i / blades) * Math.PI * 2);
      const bladeGrad = ctx.createLinearGradient(35, -18, 125, 18);
      bladeGrad.addColorStop(0, "rgba(255,255,255,0.85)");
      bladeGrad.addColorStop(0.45, `${accent}DD`);
      bladeGrad.addColorStop(1, "rgba(15,15,25,0.85)");
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(42, -14);
      ctx.lineTo(122, -24);
      ctx.lineTo(116, 16);
      ctx.lineTo(42, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Glowing incandescent core + metallic bezel
    const coreShell = ctx.createRadialGradient(-10, -10, 6, 0, 0, 66);
    coreShell.addColorStop(0, "#FFFFFF");
    coreShell.addColorStop(0.42, accent);
    coreShell.addColorStop(0.88, "#0F172A");
    coreShell.addColorStop(1, "rgba(255,255,255,0.4)");
    ctx.fillStyle = coreShell;
    ctx.beginPath();
    ctx.arc(0, 0, 66, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 66, 0, Math.PI * 2);
    ctx.stroke();

    // Horizontal anamorphic lens flare streak
    const flare = ctx.createLinearGradient(-250, 0, 250, 0);
    flare.addColorStop(0, "rgba(255,255,255,0)");
    flare.addColorStop(0.42, `${accent}88`);
    flare.addColorStop(0.5, "rgba(255,255,255,0.95)");
    flare.addColorStop(0.58, `${accent}88`);
    flare.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = flare;
    ctx.fillRect(-250, -3, 500, 6);
  } else if (motif === "waveform") {
    const bars = 15;
    const spacing = 28;
    const startX = -((bars - 1) * spacing) / 2;
    for (let i = 0; i < bars; i++) {
      const dist = Math.abs(i - (bars - 1) / 2);
      const h = Math.max(48, 255 - dist * 24 + ((i % 2) * 30));
      const barGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      barGrad.addColorStop(0, "#FFFFFF");
      barGrad.addColorStop(0.35, accent);
      barGrad.addColorStop(0.65, accent);
      barGrad.addColorStop(1, "#FFFFFF88");
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(startX + i * spacing - 8, -h / 2, 16, h, 8);
      ctx.fill();
    }
  } else if (motif === "prism") {
    // High-impact spectrum rays + 3D crystalline prism
    const beam = ctx.createLinearGradient(-260, -180, 260, 180);
    beam.addColorStop(0, "rgba(255,255,255,0)");
    beam.addColorStop(0.44, `${accent}AA`);
    beam.addColorStop(0.5, "#FFFFFFCC");
    beam.addColorStop(0.58, "#FACC1588");
    beam.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(-260, -240);
    ctx.lineTo(110, -240);
    ctx.lineTo(290, 240);
    ctx.lineTo(-90, 240);
    ctx.closePath();
    ctx.fill();

    const triGrad = ctx.createLinearGradient(-120, -140, 140, 130);
    triGrad.addColorStop(0, "rgba(255,255,255,0.45)");
    triGrad.addColorStop(0.5, `${accent}55`);
    triGrad.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = triGrad;
    ctx.strokeStyle = "#FFFFFFCC";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -150);
    ctx.lineTo(155, 125);
    ctx.lineTo(-155, 125);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (motif === "horizon-grid") {
    const sun = ctx.createRadialGradient(0, -35, 16, 0, -35, 185);
    sun.addColorStop(0, "#FFFFFF");
    sun.addColorStop(0.32, "#FACC15");
    sun.addColorStop(0.6, accent);
    sun.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(0, -35, 185, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `${accent}CC`;
    ctx.lineWidth = 2.5;
    for (let y = 30; y <= 210; y += 30) {
      ctx.beginPath();
      ctx.moveTo(-290, y);
      ctx.lineTo(290, y);
      ctx.stroke();
    }
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 22, 30);
      ctx.lineTo(i * 95, 220);
      ctx.stroke();
    }
  } else if (motif === "peaks") {
    const skyGlow = ctx.createRadialGradient(40, -110, 12, 40, -110, 230);
    skyGlow.addColorStop(0, "#FFFFFFCC");
    skyGlow.addColorStop(0.35, accent);
    skyGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = skyGlow;
    ctx.beginPath();
    ctx.arc(40, -110, 230, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-320, 200);
    ctx.lineTo(-140, -115);
    ctx.lineTo(-10, 35);
    ctx.lineTo(135, -160);
    ctx.lineTo(320, 200);
    ctx.closePath();
    const peakGrad = ctx.createLinearGradient(0, -160, 0, 200);
    peakGrad.addColorStop(0, "#FFFFFFDD");
    peakGrad.addColorStop(0.25, accent);
    peakGrad.addColorStop(1, "#09090B");
    ctx.fillStyle = peakGrad;
    ctx.fill();
  }

  ctx.restore();
}

export function renderThumbnailPng(
  design: ThumbnailDesign,
  isVertical: boolean,
  customBgImg?: HTMLImageElement | null
): string {
  const width = isVertical ? 1080 : 1280;
  const height = isVertical ? 1920 : 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const accent = design.accentColor || "#F97316";
  const highlightColor = getHighlightColor(accent);

  // 1. Rich high-contrast dark studio backdrop or user uploaded photo
  if (customBgImg && customBgImg.naturalWidth > 0 && customBgImg.naturalHeight > 0) {
    const scale = Math.max(width / customBgImg.naturalWidth, height / customBgImg.naturalHeight);
    const drawW = customBgImg.naturalWidth * scale;
    const drawH = customBgImg.naturalHeight * scale;
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;
    ctx.drawImage(customBgImg, drawX, drawY, drawW, drawH);
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, design.bgStart || "#080B14");
    grad.addColorStop(0.52, design.bgEnd || "#181C30");
    grad.addColorStop(1, "#050508");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  const focalX = isVertical
    ? width * 0.5
    : design.layout === "split-editorial"
    ? width * 0.74
    : width * 0.5;
  const focalY = isVertical ? height * 0.34 : height * 0.5;

  // 2. Bright studio key-light glow on focal side
  const glow = ctx.createRadialGradient(focalX, focalY, 20, focalX, focalY, width * 0.62);
  glow.addColorStop(0, customBgImg ? `${accent}45` : `${accent}88`);
  glow.addColorStop(0.4, `${accent}24`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  if (!customBgImg) {
    // 3. Studio halftone dots, light streaks & particles
    drawStudioBackdropEffects(ctx, width, height, accent, focalX, focalY);

    // 4. Dimensional subject artwork
    if (isVertical) {
      drawMotif(ctx, design.motif, focalX, focalY, 1.45, accent);
    } else if (design.layout === "split-editorial") {
      drawMotif(ctx, design.motif, focalX, focalY, 1.18, accent);
    } else if (design.layout === "cinematic-frame") {
      drawMotif(ctx, design.motif, width * 0.5, height * 0.45, 1.28, accent);
    } else {
      drawMotif(ctx, design.motif, width * 0.5, height * 0.48, 1.22, accent);
    }
  }

  // 5. Deep contrast scrim on typography zone so text pops with zero clutter
  const textAlignCenter =
    isVertical || design.layout === "bold-center" || design.layout === "cinematic-frame";

  if (!textAlignCenter) {
    const leftScrim = ctx.createLinearGradient(0, 0, width * 0.68, 0);
    leftScrim.addColorStop(0, "rgba(4, 4, 8, 0.92)");
    leftScrim.addColorStop(0.55, "rgba(4, 4, 8, 0.72)");
    leftScrim.addColorStop(1, "rgba(4, 4, 8, 0)");
    ctx.fillStyle = leftScrim;
    ctx.fillRect(0, 0, width, height);
  } else {
    const bottomScrim = ctx.createLinearGradient(0, height * 0.25, 0, height);
    bottomScrim.addColorStop(0, "rgba(4, 4, 8, 0.15)");
    bottomScrim.addColorStop(0.58, "rgba(4, 4, 8, 0.75)");
    bottomScrim.addColorStop(1, "rgba(4, 4, 8, 0.94)");
    ctx.fillStyle = bottomScrim;
    ctx.fillRect(0, 0, width, height);
  }

  // Subtle edge vignette for polished cinema look
  const vig = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.3,
    width / 2,
    height / 2,
    width * 0.78
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.48)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  if (design.layout === "cinematic-frame" && !isVertical) {
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(0, 0, width, 44);
    ctx.fillRect(0, height - 44, width, 44);
  }

  // 6. High-Contrast Skewed Kicker Pill
  const padX = isVertical ? 84 : 76;
  ctx.textBaseline = "middle";
  const kickerText = (design.badgeText || "FULL GUIDE").toUpperCase();
  const kickerFontSize = isVertical ? 28 : 22;
  ctx.font = `900 ${kickerFontSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
  const kickerWidth = ctx.measureText(kickerText).width + 44;
  const kickerHeight = isVertical ? 54 : 44;
  const kickerY = isVertical ? height * 0.51 : textAlignCenter ? 105 : 108;
  const pillX = textAlignCenter ? width / 2 - kickerWidth / 2 : padX;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(pillX, kickerY, kickerWidth, kickerHeight, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = getContrastTextColor(accent);
  ctx.fillText(kickerText, pillX + kickerWidth / 2, kickerY + kickerHeight / 2 + 1);

  // 7. Massive YouTube Headline with Thick Dark Outline + Power-Word Color Highlight
  ctx.textBaseline = "top";
  const headlineSize = isVertical ? 102 : design.layout === "split-editorial" ? 94 : 100;
  ctx.font = `900 ${headlineSize}px "Plus Jakarta Sans", "Impact", sans-serif`;
  const maxTextWidth = isVertical
    ? width - 148
    : design.layout === "split-editorial"
    ? width * 0.55
    : width - 200;

  const rawHeadline = (design.headline || "HOW IT WORKS").toUpperCase();
  ctx.font = `900 ${headlineSize}px "Montserrat", "Plus Jakarta Sans", "Impact", sans-serif`;
  const lines = wrapCanvasText(ctx, rawHeadline, maxTextWidth).slice(0, 3);
  const lineHeight = headlineSize * 1.02;

  const startY = isVertical
    ? height * 0.57
    : design.layout === "split-editorial"
    ? 176
    : height / 2 - (lines.length * lineHeight) / 2 + 18;

  lines.forEach((line, idx) => {
    const y = startY + idx * lineHeight;
    const isLastLine = idx === lines.length - 1;
    const lineX = textAlignCenter ? width / 2 : padX;
    ctx.textAlign = textAlignCenter ? "center" : "left";

    // Draw dark stroke + deep shadow first
    ctx.save();
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#040407";
    ctx.lineWidth = 14;
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.strokeText(line, lineX, y);
    ctx.restore();

    // Color last line (or key words) with high-CTR Electric Gold / Bright White contrast
    if (isLastLine && lines.length > 1) {
      ctx.fillStyle = highlightColor;
    } else {
      ctx.fillStyle = "#FFFFFF";
    }
    ctx.fillText(line, lineX, y);
  });

  // 8. Clean Supporting Callout Pill / Subheadline
  const subText = (design.subheadline || "").trim();
  const subY = startY + lines.length * lineHeight + 28;
  if (subText) {
    ctx.font = `700 ${isVertical ? 34 : 26}px "Plus Jakarta Sans", "Inter", sans-serif`;
    const subLines = wrapCanvasText(ctx, subText, maxTextWidth).slice(0, 2);
    subLines.forEach((line, idx) => {
      const y = subY + idx * (isVertical ? 44 : 36);
      const x = textAlignCenter ? width / 2 : padX;
      ctx.textAlign = textAlignCenter ? "center" : "left";
      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 6;
      ctx.strokeText(line, x, y);
      ctx.restore();
      ctx.fillStyle = "rgba(244, 244, 245, 0.96)";
      ctx.fillText(line, x, y);
    });
  }

  // 9. Crisp Accent Bar & Subtle Inner Studio Border
  ctx.fillStyle = highlightColor;
  const barY = subY + (subText ? 48 : 8);
  ctx.beginPath();
  if (textAlignCenter) {
    ctx.roundRect(width / 2 - 54, barY, 108, 7, 4);
  } else {
    ctx.roundRect(padX, barY, 112, 7, 4);
  }
  ctx.fill();

  // Thin crisp frame highlight around entire thumbnail
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  return canvas.toDataURL("image/png");
}

export function ThumbnailStudio({
  design,
  format,
  primaryTitle,
  onPngChange,
}: ThumbnailStudioProps) {
  const isVertical = format === "shorts-9-16";
  const [editable, setEditable] = useState<ThumbnailDesign>(design);
  const [showControls, setShowControls] = useState(false);
  const [expandPrompt, setExpandPrompt] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [fontVersion, setFontVersion] = useState(0);
  const [loadedBgImg, setLoadedBgImg] = useState<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    document.fonts?.ready.then(() => {
      if (active) setFontVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setEditable(design);
    setImgError(false);
  }, [design]);

  useEffect(() => {
    const src = editable.customBgDataUrl;
    if (!src) {
      setLoadedBgImg(null);
      return;
    }
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (active) setLoadedBgImg(img);
    };
    img.onerror = () => {
      if (active) setLoadedBgImg(null);
    };
    img.src = src;
    return () => {
      active = false;
    };
  }, [editable.customBgDataUrl]);

  const pngDataUrl = useMemo(() => {
    try {
      void fontVersion;
      return renderThumbnailPng(editable, isVertical, loadedBgImg);
    } catch {
      return "";
    }
  }, [editable, isVertical, fontVersion, loadedBgImg]);

  useEffect(() => {
    if (pngDataUrl && onPngChange) {
      onPngChange(pngDataUrl);
    }
  }, [pngDataUrl, onPngChange]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setEditable((prev) => ({ ...prev, customBgDataUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDownloadPng = () => {
    if (!pngDataUrl) return;
    const link = document.createElement("a");
    link.href = pngDataUrl;
    const slug = (editable.headline || primaryTitle || "thumbnail")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.download = `${slug || "thumbnail"}-${isVertical ? "1080x1920" : "1280x720"}.png`;
    link.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white font-display">
            Thumbnail
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {isVertical ? "1080 × 1920" : "1280 × 720"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-[#FF006E]" />
            <span>{editable.customBgDataUrl ? "Replace Photo" : "Upload Photo"}</span>
          </button>

          {editable.customBgDataUrl && (
            <button
              type="button"
              onClick={() =>
                setEditable((prev) => ({ ...prev, customBgDataUrl: undefined }))
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/12 text-zinc-600 dark:text-zinc-300 hover:text-[#FF006E] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Photo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowControls((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 hover:border-[#FF006E]/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF006E]" />
            <span>{showControls ? "Done" : "Edit"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={!pngDataUrl}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Studio Canvas Preview */}
        <div className={isVertical ? "lg:col-span-5 flex justify-center" : "lg:col-span-7"}>
          <div
            className={`relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-white/12 bg-zinc-950 shadow-xl ${
              isVertical ? "w-64 aspect-[9/16]" : "w-full aspect-video"
            }`}
          >
            {pngDataUrl && !imgError ? (
              <img
                src={pngDataUrl}
                alt={`Generated thumbnail preview for ${primaryTitle}`}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover block"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-zinc-900 to-zinc-800 text-zinc-200">
                <ImageIcon className="w-8 h-8 mb-2 text-zinc-400" />
                <p className="text-sm font-semibold">{editable.headline}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Rail: Quick Editor & Prompt */}
        <div className={`${isVertical ? "lg:col-span-7" : "lg:col-span-5"} space-y-3`}>
          {showControls && (
            <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#111114] space-y-3">
              {/* Quick Pro Presets */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Style Presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        setEditable((prev) => ({
                          ...prev,
                          accentColor: preset.accentColor,
                          bgStart: preset.bgStart,
                          bgEnd: preset.bgEnd,
                          layout: preset.layout,
                        }))
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#07060A] hover:border-[#FF006E]/60 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: preset.accentColor }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Headline
                  </span>
                  <input
                    type="text"
                    value={editable.headline}
                    onChange={(e) =>
                      setEditable((prev) => ({ ...prev, headline: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#07060A] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#FF006E]/40"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Kicker
                  </span>
                  <input
                    type="text"
                    value={editable.badgeText}
                    onChange={(e) =>
                      setEditable((prev) => ({ ...prev, badgeText: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#07060A] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#FF006E]/40"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Subheadline
                </span>
                <input
                  type="text"
                  value={editable.subheadline}
                  onChange={(e) =>
                    setEditable((prev) => ({ ...prev, subheadline: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#07060A] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#FF006E]/40"
                />
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Layout
                  </span>
                  <select
                    value={editable.layout}
                    onChange={(e) =>
                      setEditable((prev) => ({
                        ...prev,
                        layout: e.target.value as ThumbnailLayout,
                      }))
                    }
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#07060A] text-zinc-900 dark:text-zinc-100"
                  >
                    {LAYOUT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Visual
                  </span>
                  <select
                    value={editable.motif}
                    onChange={(e) =>
                      setEditable((prev) => ({
                        ...prev,
                        motif: e.target.value as ThumbnailMotif,
                      }))
                    }
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#07060A] text-zinc-900 dark:text-zinc-100"
                  >
                    {MOTIF_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Accent
                  </span>
                  <input
                    type="color"
                    value={editable.accentColor}
                    onChange={(e) =>
                      setEditable((prev) => ({ ...prev, accentColor: e.target.value }))
                    }
                    className="w-full h-[30px] p-0.5 rounded-lg border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#07060A] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Image Prompt
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpandPrompt((v) => !v)}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer"
                >
                  {expandPrompt ? "Less" : "Full"}
                </button>
                <CopyButton text={design.imagePrompt} label="Copy" />
              </div>
            </div>
            <p
              className={`text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 ${
                expandPrompt ? "" : "line-clamp-3"
              }`}
            >
              {design.imagePrompt}
            </p>
          </div>

          <div className="px-4 py-3 rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Avoid
              </span>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate mt-0.5">
                {design.negativePrompt}
              </p>
            </div>
            <CopyButton text={design.negativePrompt} label="Copy" />
          </div>
        </div>
      </div>
    </div>
  );
}
