import type { ProjectStatus, VideoKit, VideoProject } from "../types.ts";

export const ACTIVITY_STORAGE_KEY = "contentora_activity_v1";

export interface ActivityLog {
  activeDays: string[];
  generationsByDay: Record<string, number>;
  toolGenerations: number;
}

export function toLocalIsoDate(input: Date | number = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLatestKit(proj: VideoProject): VideoKit | undefined {
  return proj.turns
    .slice()
    .reverse()
    .find((t) => t.role === "assistant" && t.kit)?.kit;
}

export function loadActivityLog(projects: VideoProject[]): ActivityLog {
  const today = toLocalIsoDate();
  let activeSet = new Set<string>([today]);
  const generationsByDay: Record<string, number> = {};
  let toolGenerations = 0;

  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.activeDays)) {
        for (const day of parsed.activeDays) {
          if (typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
            activeSet.add(day);
          }
        }
      }
      if (parsed?.generationsByDay && typeof parsed.generationsByDay === "object") {
        for (const [k, v] of Object.entries(parsed.generationsByDay)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === "number" && v > 0) {
            generationsByDay[k] = v;
          }
        }
      }
      if (typeof parsed?.toolGenerations === "number" && parsed.toolGenerations >= 0) {
        toolGenerations = parsed.toolGenerations;
      }
    }
  } catch {
    // Ignore storage read errors
  }

  // Merge historical project creation/update dates so existing projects populate daily activity
  for (const proj of projects) {
    if (proj.createdAt) activeSet.add(toLocalIsoDate(proj.createdAt));
    if (proj.updatedAt) activeSet.add(toLocalIsoDate(proj.updatedAt));
    for (const turn of proj.turns) {
      if (turn.role === "assistant" && turn.kit && turn.timestamp) {
        const iso = toLocalIsoDate(turn.timestamp);
        activeSet.add(iso);
        if (!generationsByDay[iso]) {
          generationsByDay[iso] = 1;
        }
      }
    }
  }

  return {
    activeDays: Array.from(activeSet).sort(),
    generationsByDay,
    toolGenerations,
  };
}

export function saveActivityLog(log: ActivityLog): void {
  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordActivityGeneration(
  prev: ActivityLog,
  options: { isTool?: boolean; count?: number } = {}
): ActivityLog {
  const today = toLocalIsoDate();
  const increment = options.count ?? 1;
  const activeSet = new Set(prev.activeDays);
  activeSet.add(today);

  return {
    activeDays: Array.from(activeSet).sort(),
    generationsByDay: {
      ...prev.generationsByDay,
      [today]: (prev.generationsByDay[today] || 0) + increment,
    },
    toolGenerations: prev.toolGenerations + (options.isTool ? increment : 0),
  };
}

export interface DayActivityCell {
  iso: string;
  label: string;
  shortDay: string;
  active: boolean;
  count: number;
  isToday: boolean;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  activeToday: boolean;
  last28Days: DayActivityCell[];
}

export function computeStreakStats(
  activeDays: string[],
  generationsByDay: Record<string, number>
): StreakStats {
  const activeSet = new Set(activeDays);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayIso = toLocalIsoDate(todayDate);

  // Current streak walking backwards from today (or yesterday if not active today yet)
  let currentStreak = 0;
  const cursor = new Date(todayDate);
  if (!activeSet.has(todayIso)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activeSet.has(toLocalIsoDate(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak across all sorted active days
  const sorted = Array.from(activeSet).sort();
  let longestStreak = 0;
  let running = 0;
  let prevTime: number | null = null;

  for (const iso of sorted) {
    const [y, m, d] = iso.split("-").map(Number);
    const t = new Date(y, m - 1, d).getTime();
    if (prevTime !== null && Math.round((t - prevTime) / 86400000) === 1) {
      running += 1;
    } else {
      running = 1;
    }
    if (running > longestStreak) longestStreak = running;
    prevTime = t;
  }

  // Last 28 days (4 rows x 7 days) ending today
  const last28Days: DayActivityCell[] = [];
  for (let offset = 27; offset >= 0; offset--) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - offset);
    const iso = toLocalIsoDate(d);
    last28Days.push({
      iso,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      shortDay: d.toLocaleDateString(undefined, { weekday: "short" }),
      active: activeSet.has(iso),
      count: generationsByDay[iso] || 0,
      isToday: iso === todayIso,
    });
  }

  return {
    currentStreak,
    longestStreak,
    totalActiveDays: sorted.length,
    activeToday: activeSet.has(todayIso),
    last28Days,
  };
}

export interface ContentTotals {
  totalProjects: number;
  statusCounts: Record<ProjectStatus, number>;
  kitsGenerated: number;
  scenesCount: number;
  totalRuntimeSeconds: number;
  titlesAndHooksCount: number;
  seoTagsAndHashtagsCount: number;
  thumbnailsCount: number;
  socialPacksCount: number;
  standaloneToolRuns: number;
  totalGeneratedContent: number;
}

export function computeContentTotals(
  projects: VideoProject[],
  log: ActivityLog
): ContentTotals {
  const statusCounts: Record<ProjectStatus, number> = {
    draft: 0,
    scripted: 0,
    filmed: 0,
    published: 0,
  };

  let kitsGenerated = 0;
  let scenesCount = 0;
  let totalRuntimeSeconds = 0;
  let titlesAndHooksCount = 0;
  let seoTagsAndHashtagsCount = 0;
  let thumbnailsCount = 0;
  let socialPacksCount = 0;

  for (const proj of projects) {
    const status: ProjectStatus = proj.status ?? "scripted";
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const kitTurns = proj.turns.filter((t) => t.role === "assistant" && t.kit);
    kitsGenerated += kitTurns.length;

    const latest = getLatestKit(proj);
    if (latest) {
      scenesCount += latest.scenes.length;
      totalRuntimeSeconds += latest.scenes.reduce(
        (sum, s) => sum + (Number(s.durationSeconds) || 0),
        0
      );
      titlesAndHooksCount +=
        1 + latest.titleOptions.length + (latest.hookVariations?.length || 0);
      seoTagsAndHashtagsCount += latest.tags.length + latest.hashtags.length;
      if (latest.thumbnail) thumbnailsCount += 1;
      if (latest.socialPack) socialPacksCount += 1;
    }
  }

  const totalGeneratedContent =
    kitsGenerated +
    scenesCount +
    titlesAndHooksCount +
    seoTagsAndHashtagsCount +
    thumbnailsCount +
    socialPacksCount +
    log.toolGenerations;

  return {
    totalProjects: projects.length,
    statusCounts,
    kitsGenerated,
    scenesCount,
    totalRuntimeSeconds,
    titlesAndHooksCount,
    seoTagsAndHashtagsCount,
    thumbnailsCount,
    socialPacksCount,
    standaloneToolRuns: log.toolGenerations,
    totalGeneratedContent,
  };
}
