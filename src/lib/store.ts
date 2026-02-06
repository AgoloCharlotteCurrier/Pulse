import { ResearchRun } from "./types";

// In-memory store for demo/development. In production, replace with a database.
const runs: Map<string, ResearchRun> = new Map();

export function getRun(id: string): ResearchRun | undefined {
  return runs.get(id);
}

export function getUserRuns(userId: string): ResearchRun[] {
  return Array.from(runs.values())
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveRun(run: ResearchRun): void {
  runs.set(run.id, run);
}

export function updateRun(id: string, updates: Partial<ResearchRun>): void {
  const run = runs.get(id);
  if (run) {
    runs.set(id, { ...run, ...updates });
  }
}
