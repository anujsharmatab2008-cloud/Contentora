import { useMemo } from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Compass,
  Film,
  Flame,
  FolderKanban,
  Layers,
  Plus,
} from "lucide-react";
import type { ProjectStatus, VideoProject } from "../types.ts";
import {
  computeContentTotals,
  computeStreakStats,
  type ActivityLog,
} from "../utils/creatorAnalytics.ts";

interface AnalyticsViewProps {
  projects: VideoProject[];
  activityLog: ActivityLog;
  onCreateProject: () => void;
  onOpenTools: () => void;
  onOpenProject: (projectId: string) => void;
  onFilterHistoryByStatus: (status: ProjectStatus) => void;
}

const STATUS_META: {
  id: ProjectStatus;
  label: string;
  description: string;
  barClass: string;
  dotClass: string;
}[] = [
  {
    id: "draft",
    label: "Draft",
    description: "Queued topics awaiting full kit generation",
    barClass: "bg-zinc-400 dark:bg-zinc-500",
    dotClass: "bg-zinc-400 dark:bg-zinc-500",
  },
  {
    id: "scripted",
    label: "Scripted",
    description: "Complete scripts, titles, and metadata ready",
    barClass: "bg-[#FF006E]",
    dotClass: "bg-[#FF006E]",
  },
  {
    id: "filmed",
    label: "Filmed",
    description: "Recorded and moving through edit & packaging",
    barClass: "bg-amber-500",
    dotClass: "bg-amber-500",
  },
  {
    id: "published",
    label: "Published",
    description: "Shipped and live on your channel",
    barClass: "bg-emerald-500",
    dotClass: "bg-emerald-500",
  },
];

function formatDurationTotal(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, "0")}m`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function AnalyticsView({
  projects,
  activityLog,
  onCreateProject,
  onOpenTools,
  onOpenProject,
  onFilterHistoryByStatus,
}: AnalyticsViewProps) {
  const totals = useMemo(
    () => computeContentTotals(projects, activityLog),
    [projects, activityLog]
  );

  const streak = useMemo(
    () => computeStreakStats(activityLog.activeDays, activityLog.generationsByDay),
    [activityLog]
  );

  const recentProjects = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [projects]
  );

  const statusOrderLabel: Record<ProjectStatus, string> = {
    draft: "Draft",
    scripted: "Scripted",
    filmed: "Filmed",
    published: "Published",
  };

  const inventoryRows = [
    { label: "Full Video Production Kits", value: totals.kitsGenerated },
    { label: "Timed Scenes & Voiceover Scripts", value: totals.scenesCount },
    { label: "Titles & Opening 5-Second Hooks", value: totals.titlesAndHooksCount },
    { label: "SEO Keywords & Reach Hashtags", value: totals.seoTagsAndHashtagsCount },
    { label: "Custom Thumbnail Designs", value: totals.thumbnailsCount },
    { label: "Cross-Platform Social Promo Packs", value: totals.socialPacksCount },
    { label: "Standalone Creator Tool Runs", value: totals.standaloneToolRuns },
  ];

  const inProgressCount =
    totals.statusCounts.draft +
    totals.statusCounts.scripted +
    totals.statusCounts.filmed;

  return (
    <section className="min-h-full bg-[#FAFAF9] dark:bg-[#09090B] py-7 sm:py-9 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-white/[0.08]">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-display">
              Creator Analytics
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Live overview of project stages, generated assets, and your daily studio streak.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenTools}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-zinc-200 dark:border-white/12 bg-white dark:bg-[#111114] text-zinc-800 dark:text-zinc-200 hover:border-[#FF006E]/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Compass className="w-3.5 h-3.5 text-[#FF006E]" />
              <span>Open Tools</span>
            </button>
            <button
              type="button"
              onClick={onCreateProject}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* 4-Column KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-5 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Total Generated Content</span>
              <Layers className="w-4 h-4 text-[#FF006E] shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tabular-nums font-display">
              {totals.totalGeneratedContent.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {totals.kitsGenerated} kits · {totals.standaloneToolRuns} tool runs
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-5 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Daily Active Streak</span>
              <Flame className="w-4 h-4 text-[#FF006E] shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tabular-nums font-display">
              {streak.currentStreak} {streak.currentStreak === 1 ? "Day" : "Days"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              Longest: {streak.longestStreak}d · {streak.totalActiveDays} active days
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-5 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Total Projects</span>
              <FolderKanban className="w-4 h-4 text-zinc-400 shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tabular-nums font-display">
              {totals.totalProjects.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {totals.statusCounts.published} published · {inProgressCount} in pipeline
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-5 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Scripted Scenes</span>
              <Film className="w-4 h-4 text-zinc-400 shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tabular-nums font-display">
              {totals.scenesCount.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              Runtime: {formatDurationTotal(totals.totalRuntimeSeconds)} total
            </p>
          </div>
        </div>

        {/* Middle 2-Column Row: Project Status Counts Left · Daily Streak Tracker Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Project Status Counts */}
          <div className="lg:col-span-6 rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-5 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                    Project Status Counts
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Click any stage to filter your project history.
                  </p>
                </div>
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">
                  {totals.totalProjects} total
                </span>
              </div>

              {/* Stacked Proportional Pipeline Bar */}
              <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-white/[0.06] overflow-hidden flex">
                {totals.totalProjects > 0 ? (
                  STATUS_META.map((stage) => {
                    const count = totals.statusCounts[stage.id] || 0;
                    if (count === 0) return null;
                    const pct = (count / totals.totalProjects) * 100;
                    return (
                      <div
                        key={stage.id}
                        style={{ width: `${pct}%` }}
                        className={`${stage.barClass} h-full transition-all`}
                        title={`${stage.label}: ${count}`}
                      />
                    );
                  })
                ) : (
                  <div className="w-full h-full bg-zinc-200/70 dark:bg-white/[0.05]" />
                )}
              </div>

              {/* Clean Status Rows */}
              <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06] border-t border-b border-zinc-200/70 dark:border-white/[0.06]">
                {STATUS_META.map((stage) => {
                  const count = totals.statusCounts[stage.id] || 0;
                  const pct =
                    totals.totalProjects > 0
                      ? Math.round((count / totals.totalProjects) * 100)
                      : 0;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => onFilterHistoryByStatus(stage.id)}
                      className="w-full py-3 flex items-center justify-between gap-4 text-left hover:bg-zinc-50/80 dark:hover:bg-white/[0.03] px-2 -mx-2 rounded-lg transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          aria-hidden="true"
                          className={`w-2.5 h-2.5 rounded-sm shrink-0 ${stage.dotClass}`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                            {stage.label}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {stage.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 tabular-nums">
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          {pct}%
                        </span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white w-7 text-right">
                          {count}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#FF006E] transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {totals.totalProjects === 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Create your first video kit to start tracking production stages here.
              </p>
            )}
          </div>

          {/* Daily Active Usage Streak Tracker */}
          <div className="lg:col-span-6 rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] p-5 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                    Daily Active Usage Streak
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Last 28 days of studio activity and content generation.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{streak.activeToday ? "Active today" : "Log activity"}</span>
                </span>
              </div>

              {/* 3-Column Streak Metrics */}
              <div className="grid grid-cols-3 divide-x divide-zinc-200/75 dark:divide-white/[0.08] rounded-xl border border-zinc-200/75 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] py-3">
                <div className="px-3 text-center">
                  <p className="text-lg font-bold text-zinc-900 dark:text-white tabular-nums font-display">
                    {streak.currentStreak}d
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Current Streak
                  </p>
                </div>
                <div className="px-3 text-center">
                  <p className="text-lg font-bold text-zinc-900 dark:text-white tabular-nums font-display">
                    {streak.longestStreak}d
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Longest Streak
                  </p>
                </div>
                <div className="px-3 text-center">
                  <p className="text-lg font-bold text-zinc-900 dark:text-white tabular-nums font-display">
                    {streak.totalActiveDays}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Total Active Days
                  </p>
                </div>
              </div>

              {/* 28-Day Activity Grid (4 weeks x 7 days) */}
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-2">
                  {streak.last28Days.map((cell) => {
                    const levelClass = !cell.active
                      ? "bg-zinc-100 dark:bg-white/[0.04] border-zinc-200/70 dark:border-white/[0.06] text-zinc-400 dark:text-zinc-500"
                      : cell.count >= 3
                      ? "bg-[#FF006E] border-[#FF006E] text-white"
                      : cell.count >= 1
                      ? "bg-[#FF006E]/75 border-[#FF006E]/80 text-white"
                      : "bg-[#FF006E]/25 border-[#FF006E]/40 text-zinc-900 dark:text-white";

                    return (
                      <div
                        key={cell.iso}
                        title={`${cell.label} (${cell.iso}) · ${
                          cell.active
                            ? `${cell.count > 0 ? `${cell.count} generated` : "Active session"}`
                            : "No activity"
                        }`}
                        className={`h-10 rounded-lg border flex flex-col items-center justify-center text-[10px] font-medium tabular-nums transition-colors ${levelClass} ${
                          cell.isToday ? "ring-2 ring-zinc-900/30 dark:ring-white/40" : ""
                        }`}
                      >
                        <span className="leading-none opacity-80">{cell.shortDay.slice(0, 2)}</span>
                        <span className="leading-tight font-semibold mt-0.5">
                          {cell.iso.slice(8)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-1">
                  <span>{streak.last28Days[0]?.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span>Inactive</span>
                    <span className="w-2.5 h-2.5 rounded-xs bg-zinc-200 dark:bg-white/[0.06]" />
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#FF006E]/30" />
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#FF006E]/75" />
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#FF006E]" />
                    <span>High output</span>
                  </div>
                  <span>Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Generated Content Breakdown + Recent Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Generated Content Breakdown Table */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200/75 dark:border-white/[0.08] flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                Generated Content Breakdown
              </h2>
              <span className="text-xs font-semibold text-[#FF006E] tabular-nums">
                {totals.totalGeneratedContent.toLocaleString()} total items
              </span>
            </div>

            <div className="divide-y divide-zinc-200/60 dark:divide-white/[0.06]">
              {inventoryRows.map((row) => (
                <div
                  key={row.label}
                  className="px-5 py-3 flex items-center justify-between gap-4 text-xs"
                >
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    {row.label}
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-white tabular-nums">
                    {row.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Projects & Schedule */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-200/85 dark:border-white/[0.08] bg-white dark:bg-[#111114] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200/75 dark:border-white/[0.08] flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white font-display">
                Recent Projects
              </h2>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                {recentProjects.length} shown
              </span>
            </div>

            {recentProjects.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No projects created yet. Start your first video kit to populate analytics.
                </p>
                <button
                  type="button"
                  onClick={onCreateProject}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#FF006E] hover:bg-[#e10062] text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Video Kit</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/60 dark:divide-white/[0.06]">
                {recentProjects.map((proj) => {
                  const st: ProjectStatus = proj.status ?? "scripted";
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => onOpenProject(proj.id)}
                      className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-zinc-50/80 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate group-hover:text-[#FF006E] transition-colors">
                          {proj.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums flex items-center gap-1.5">
                          <span>{statusOrderLabel[st]}</span>
                          {proj.scheduledDate && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {proj.scheduledDate}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#FF006E] shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
