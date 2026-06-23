import type { RunSummary } from "./types";

export const RUN_HISTORY_KEY = "social-engine.contextCollapse.runs.v1";
const MAX_RUNS = 10;

export function loadRuns(): RunSummary[] {
  try {
    const raw = localStorage.getItem(RUN_HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RunSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRun(summary: RunSummary): RunSummary[] {
  const runs = [summary, ...loadRuns()]
    .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
    .slice(0, MAX_RUNS);
  localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(runs));
  return runs;
}

export function clearRuns(): void {
  localStorage.removeItem(RUN_HISTORY_KEY);
}
