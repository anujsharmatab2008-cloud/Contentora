import { useEffect, useState } from "react";
import { Columns2, Eye, Monitor, Smartphone } from "lucide-react";
import type { TitleOption } from "../types.ts";

interface YouTubeFeedPreviewProps {
  thumbnailUrl: string;
  title: string;
  titleOptions?: TitleOption[];
  channelName?: string;
  channelLogo?: string;
  durationBadge?: string;
  isVertical?: boolean;
}

export function YouTubeFeedPreview({
  thumbnailUrl,
  title,
  titleOptions = [],
  channelName = "Your Channel",
  channelLogo,
  durationBadge = "01:00",
  isVertical = false,
}: YouTubeFeedPreviewProps) {
  const [surfaceTheme, setSurfaceTheme] = useState<"dark" | "light">("dark");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [compareMode, setCompareMode] = useState(false);
  const [blurTest, setBlurTest] = useState(false);
  const [compareIndex, setCompareIndex] = useState(0);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [channelLogo]);

  const truncatedCheck = title.trim().length > 60;
  const isDark = surfaceTheme === "dark";
  const altTitle = titleOptions[compareIndex]?.title || title;

  const renderFeedCard = (cardTitle: string, label?: string) => (
    <div
      className={
        device === "mobile" ? "w-full max-w-[300px]" : "w-full max-w-[360px]"
      }
    >
      {label && (
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
          <span className="text-[#FF006E]">{label}</span>
          <span
            className={`tabular-nums ${
              isDark ? "text-[#AAAAAA]" : "text-[#606060]"
            }`}
          >
            {cardTitle.length} chars
          </span>
        </div>
      )}
      <div
        className={`relative rounded-xl overflow-hidden bg-zinc-900 transition-all ${
          isVertical ? "aspect-[9/16] max-h-[340px] mx-auto" : "aspect-video w-full"
        } ${blurTest ? "blur-[1.6px] scale-[0.98]" : ""}`}
      >
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={cardTitle}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover block"
          />
        )}
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[11px] font-semibold tabular-nums">
          {durationBadge}
        </span>
      </div>

      <div className="flex items-start gap-3 mt-3">
        {channelLogo && !logoError ? (
          <img
            src={channelLogo}
            alt={channelName}
            referrerPolicy="no-referrer"
            onError={() => setLogoError(true)}
            className="w-9 h-9 rounded-full object-cover shrink-0 bg-zinc-800 border border-white/10"
          />
        ) : (
          <div
            className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
              isDark ? "bg-zinc-800 text-zinc-200" : "bg-zinc-200 text-zinc-800"
            }`}
          >
            {(channelName.trim()[0] || "C").toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[14px] font-semibold leading-snug line-clamp-2">
            {cardTitle}
          </p>
          <p
            className={`text-[12px] truncate ${
              isDark ? "text-[#AAAAAA]" : "text-[#606060]"
            }`}
          >
            {channelName} · 12K views · 2 hours ago
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-zinc-900 dark:text-white font-display">
            YouTube Feed Packaging Check
          </h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5">
            {title.length} chars ·{" "}
            {truncatedCheck
              ? "May truncate after ~60 chars on home feed"
              : "Fits cleanly without truncation"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {titleOptions.length > 0 && (
            <button
              type="button"
              onClick={() => setCompareMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                compareMode
                  ? "border-[#FF006E] bg-[#FF006E]/10 text-[#FF006E]"
                  : "border-zinc-200 dark:border-white/12 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/25"
              }`}
            >
              <Columns2 className="w-3 h-3" />
              <span>A/B Compare</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setBlurTest((v) => !v)}
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
              blurTest
                ? "border-[#FF006E] bg-[#FF006E]/10 text-[#FF006E]"
                : "border-zinc-200 dark:border-white/12 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/25"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Squint Test</span>
          </button>

          <div className="inline-flex items-center h-8 p-0.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/70 dark:border-white/10">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`inline-flex items-center gap-1 h-full px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                device === "desktop"
                  ? "bg-white dark:bg-[#1C1C22] text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`inline-flex items-center gap-1 h-full px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                device === "mobile"
                  ? "bg-white dark:bg-[#1C1C22] text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Mobile</span>
            </button>
          </div>

          <div className="inline-flex items-center h-8 p-0.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/70 dark:border-white/10">
            <button
              type="button"
              onClick={() => setSurfaceTheme("dark")}
              className={`h-full px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isDark
                  ? "bg-white dark:bg-[#1C1C22] text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setSurfaceTheme("light")}
              className={`h-full px-2.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                !isDark
                  ? "bg-white dark:bg-[#1C1C22] text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Light
            </button>
          </div>
        </div>
      </div>

      {compareMode && titleOptions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
          <span className="text-zinc-500 dark:text-zinc-400">
            Comparing Primary Title vs Alternative:
          </span>
          <select
            aria-label="Alternative title for comparison"
            value={compareIndex}
            onChange={(e) => setCompareIndex(Number(e.target.value))}
            className="max-w-md px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/12 bg-zinc-50 dark:bg-[#141418] text-zinc-800 dark:text-zinc-200 text-xs"
          >
            {titleOptions.map((opt, idx) => (
              <option key={`${opt.title}-${idx}`} value={idx}>
                {opt.angle}: {opt.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Simulated YouTube Feed Card Surface */}
      <div
        className={`rounded-xl border p-4 sm:p-5 transition-colors ${
          isDark
            ? "bg-[#0F0F0F] border-white/10 text-[#F1F1F1]"
            : "bg-[#FFFFFF] border-zinc-200 text-[#0F0F0F]"
        }`}
      >
        {compareMode && titleOptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center">
            {renderFeedCard(title, "Option A · Primary")}
            {renderFeedCard(altTitle, `Option B · ${titleOptions[compareIndex]?.angle || "Alt"}`)}
          </div>
        ) : (
          <div className="flex justify-center">{renderFeedCard(title)}</div>
        )}
      </div>
    </div>
  );
}
