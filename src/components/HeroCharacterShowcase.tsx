import { motion } from "motion/react";
import type { VideoFormat } from "../types.ts";

interface HeroCharacterShowcaseProps {
  onSelectPlatform?: (format: VideoFormat) => void;
}

function YouTubeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  );
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.5" cy="6.5" r="1" className="fill-white stroke-none" />
    </svg>
  );
}

function TikTokGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.7a8.18 8.18 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.13Z" />
    </svg>
  );
}

export function HeroCharacterShowcase({ onSelectPlatform }: HeroCharacterShowcaseProps) {
  return (
    <div className="relative flex items-center justify-center w-full h-full max-h-[calc(100vh-10.5rem)] select-none">
      {/* Ambient studio halo */}
      <div
        aria-hidden="true"
        className="absolute inset-x-8 inset-y-10 rounded-full bg-[#FF006E]/30 blur-3xl pointer-events-none"
      />

      {/* Subtle orbital ring behind the anime character */}
      <motion.div
        aria-hidden="true"
        animate={{ rotate: 360 }}
        transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
        className="absolute w-[340px] h-[340px] xl:w-[390px] xl:h-[390px] rounded-full border border-dashed border-zinc-400/25 dark:border-white/10 pointer-events-none"
      />

      {/* Main Anime Creator Cutout */}
      <img
        src="/assets/aistudio/anime-boy-full_852c18f5.png"
        alt="Contentora creator mascot"
        referrerPolicy="no-referrer"
        className="relative z-10 h-full max-h-[480px] w-auto object-contain drop-shadow-[0_0_32px_rgba(255,0,110,0.35)]"
      />

      {/* Glossy Floating Card 1: YouTube (Top Left) */}
      <motion.button
        type="button"
        onClick={() => onSelectPlatform?.("youtube-16-9")}
        initial={{ opacity: 0, y: 12, scale: 0.94 }}
        animate={{
          opacity: 1,
          y: [0, -9, 0],
          rotate: [-1.5, 0.5, -1.5],
          scale: 1,
        }}
        transition={{
          opacity: { duration: 0.5 },
          scale: { duration: 0.5 },
          y: { duration: 4.4, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 5.6, repeat: Infinity, ease: "easeInOut" },
        }}
        whileHover={{ scale: 1.06, y: -4 }}
        className="group absolute top-[12%] left-2 xl:left-4 z-20 cursor-pointer text-left"
        aria-label="Create YouTube 16:9 video kit"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/70 dark:border-white/20 bg-white/75 dark:bg-white/[0.08] backdrop-blur-xl px-3.5 py-2.5 shadow-[0_14px_34px_rgba(255,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.65)]">
          {/* Specular glossy light sweep */}
          <motion.div
            aria-hidden="true"
            animate={{ x: ["-130%", "210%"] }}
            transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-y-0 w-12 -skew-x-20 bg-gradient-to-r from-transparent via-white/50 dark:via-white/25 to-transparent"
          />
          <div className="relative flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF1F1F] to-[#B91C1C] shadow-[0_4px_14px_rgba(239,68,68,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)] flex items-center justify-center shrink-0">
              <YouTubeGlyph />
            </span>
            <div className="pr-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight whitespace-nowrap">
                YouTube
              </p>
              <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                16:9 Studio
              </p>
            </div>
          </div>
        </div>
      </motion.button>

      {/* Glossy Floating Card 2: Instagram (Upper Right) */}
      <motion.button
        type="button"
        onClick={() => onSelectPlatform?.("shorts-9-16")}
        initial={{ opacity: 0, y: 12, scale: 0.94 }}
        animate={{
          opacity: 1,
          y: [0, 8, 0],
          rotate: [1.5, -0.5, 1.5],
          scale: 1,
        }}
        transition={{
          opacity: { duration: 0.55, delay: 0.1 },
          scale: { duration: 0.55, delay: 0.1 },
          y: { duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
          rotate: { duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
        }}
        whileHover={{ scale: 1.06, y: -4 }}
        className="group absolute top-[22%] right-1 xl:right-3 z-20 cursor-pointer text-left"
        aria-label="Create Instagram Reels video kit"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/70 dark:border-white/20 bg-white/75 dark:bg-white/[0.08] backdrop-blur-xl px-3.5 py-2.5 shadow-[0_14px_34px_rgba(236,72,153,0.22),inset_0_1px_1px_rgba(255,255,255,0.65)]">
          <motion.div
            aria-hidden="true"
            animate={{ x: ["-130%", "210%"] }}
            transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 2.8, delay: 1.1, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-y-0 w-12 -skew-x-20 bg-gradient-to-r from-transparent via-white/50 dark:via-white/25 to-transparent"
          />
          <div className="relative flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] shadow-[0_4px_14px_rgba(221,42,123,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)] flex items-center justify-center shrink-0">
              <InstagramGlyph />
            </span>
            <div className="pr-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight whitespace-nowrap">
                Instagram
              </p>
              <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Reels 9:16
              </p>
            </div>
          </div>
        </div>
      </motion.button>

      {/* Glossy Floating Card 3: TikTok (Lower Left) */}
      <motion.button
        type="button"
        onClick={() => onSelectPlatform?.("shorts-9-16")}
        initial={{ opacity: 0, y: 12, scale: 0.94 }}
        animate={{
          opacity: 1,
          y: [0, -7, 0],
          rotate: [1, -1.2, 1],
          scale: 1,
        }}
        transition={{
          opacity: { duration: 0.6, delay: 0.2 },
          scale: { duration: 0.6, delay: 0.2 },
          y: { duration: 5.1, repeat: Infinity, ease: "easeInOut", delay: 0.9 },
          rotate: { duration: 6.4, repeat: Infinity, ease: "easeInOut", delay: 0.9 },
        }}
        whileHover={{ scale: 1.06, y: -4 }}
        className="group absolute bottom-[16%] left-3 xl:left-6 z-20 cursor-pointer text-left"
        aria-label="Create TikTok vertical video kit"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/70 dark:border-white/20 bg-white/75 dark:bg-white/[0.08] backdrop-blur-xl px-3.5 py-2.5 shadow-[0_14px_34px_rgba(6,182,212,0.20),inset_0_1px_1px_rgba(255,255,255,0.65)]">
          <motion.div
            aria-hidden="true"
            animate={{ x: ["-130%", "210%"] }}
            transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 2.5, delay: 2.0, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-y-0 w-12 -skew-x-20 bg-gradient-to-r from-transparent via-white/50 dark:via-white/25 to-transparent"
          />
          <div className="relative flex items-center gap-2.5">
            <span className="relative w-9 h-9 rounded-xl bg-zinc-950 border border-white/15 shadow-[0_4px_14px_rgba(37,244,238,0.32),0_2px_10px_rgba(254,44,85,0.35),inset_0_1px_1px_rgba(255,255,255,0.35)] flex items-center justify-center shrink-0">
              <TikTokGlyph />
            </span>
            <div className="pr-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight whitespace-nowrap">
                TikTok
              </p>
              <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                Short-Form
              </p>
            </div>
          </div>
        </div>
      </motion.button>
    </div>
  );
}
