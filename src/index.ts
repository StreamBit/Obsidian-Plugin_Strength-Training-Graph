import { TFile, MetadataCache } from "obsidian";
import type { ExerciseEntry, ParseDiagnostics, PluginSettings } from "./types";
import { extractEntriesFromFrontmatter, extractEntriesWithDiagnostics } from "./parser";

export class WorkoutIndex {
  private byExercise = new Map<string, ExerciseEntry[]>();
  private noteToEntries = new Map<string, ExerciseEntry[]>();

  clear(): void {
    this.byExercise.clear();
    this.noteToEntries.clear();
  }

  getExerciseNames(): string[] {
    return Array.from(this.byExercise.keys()).sort((a, b) => a.localeCompare(b));
  }

  getEntriesForExercise(exerciseName: string): ExerciseEntry[] {
    return this.byExercise.get(exerciseName) ?? [];
  }

  upsertNote(notePath: string, entries: ExerciseEntry[]): void {
    const old = this.noteToEntries.get(notePath) ?? [];
    for (const e of old) {
      const arr = this.byExercise.get(e.exerciseName);
      if (!arr) continue;
      this.byExercise.set(
        e.exerciseName,
        arr.filter((x) => x.sourceNotePath !== notePath || x.dateISO !== e.dateISO)
      );
      if ((this.byExercise.get(e.exerciseName) ?? []).length === 0) {
        this.byExercise.delete(e.exerciseName);
      }
    }

    this.noteToEntries.set(notePath, entries);
    for (const e of entries) {
      const arr = this.byExercise.get(e.exerciseName) ?? [];
      arr.push(e);
      arr.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
      this.byExercise.set(e.exerciseName, arr);
    }
  }

  deleteNote(notePath: string): void {
    this.upsertNote(notePath, []);
    this.noteToEntries.delete(notePath);
  }
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

export type DateFieldStatus = "valid" | "missing" | "invalid";
export type NoteSkipReason = "source-filter" | "missing-frontmatter" | "missing-date" | "invalid-date";

function getDateFieldStatus(fm: Record<string, unknown>, dateKey: string): DateFieldStatus {
  const entries = Object.entries(fm).map(([k, v]) => [normalizeKey(k), v] as const);
  const map = new Map(entries);
  const dateRaw = map.get(normalizeKey(dateKey));
  if (dateRaw === undefined || dateRaw === null || String(dateRaw).trim() === "") return "missing";
  if (typeof dateRaw === "string") {
    const s = dateRaw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return "valid";
    return Number.isFinite(Date.parse(s)) ? "valid" : "invalid";
  }
  if (dateRaw instanceof Date && Number.isFinite(dateRaw.getTime())) return "valid";
  return "invalid";
}

export interface NoteInclusionInfo {
  include: boolean;
  skipReason?: NoteSkipReason;
  frontmatter?: Record<string, unknown>;
}

export function evaluateNoteInclusion(
  file: TFile,
  metadataCache: MetadataCache,
  settings: PluginSettings
): NoteInclusionInfo {
  if (file.extension !== "md") return { include: false, skipReason: "source-filter" };

  const fm = metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
  if (!fm) return { include: false, skipReason: "missing-frontmatter" };
  const dateStatus = getDateFieldStatus(fm, settings.dateKey);
  if (dateStatus === "missing") return { include: false, skipReason: "missing-date" };
  if (dateStatus === "invalid") return { include: false, skipReason: "invalid-date" };

  if (settings.sourceMode === "folder") {
    const folder = settings.folderPath.replace(/^\/+/, "").replace(/\/+$/, "");
    const path = file.path;
    if (!folder) {
      return { include: true, frontmatter: fm };
    }
    if (settings.includeSubfolders) {
      if (!path.startsWith(folder + "/")) return { include: false, skipReason: "source-filter" };
      return { include: true, frontmatter: fm };
    }
    if (!path.startsWith(folder + "/")) return { include: false, skipReason: "source-filter" };
    const rest = path.slice((folder + "/").length);
    if (rest.includes("/")) return { include: false, skipReason: "source-filter" };
    return { include: true, frontmatter: fm };
  }

  const targetKey = normalizeKey(settings.selectorPropertyName);
  const wanted = settings.selectorPropertyValue.trim();

  const entries = Object.entries(fm).map(([k, v]) => [normalizeKey(k), v] as const);
  const map = new Map(entries);
  const actual = map.get(targetKey);

  if (actual === undefined || actual === null) return { include: false, skipReason: "source-filter" };

  if (typeof actual === "string") {
    const matches = actual.trim() === wanted;
    return matches ? { include: true, frontmatter: fm } : { include: false, skipReason: "source-filter" };
  }
  const matches = String(actual).trim() === wanted;
  return matches ? { include: true, frontmatter: fm } : { include: false, skipReason: "source-filter" };
}

export async function shouldIncludeNote(
  file: TFile,
  metadataCache: MetadataCache,
  settings: PluginSettings
): Promise<boolean> {
  return evaluateNoteInclusion(file, metadataCache, settings).include;
}

export function extractEntriesForFile(
  file: TFile,
  metadataCache: MetadataCache,
  settings: PluginSettings
): ExerciseEntry[] {
  const fm = metadataCache.getFileCache(file)?.frontmatter;
  if (!fm) return [];
  return extractEntriesFromFrontmatter(fm as any, file.path, settings);
}

export function extractEntriesForFileWithDiagnostics(
  file: TFile,
  metadataCache: MetadataCache,
  settings: PluginSettings
): { entries: ExerciseEntry[]; diagnostics: ParseDiagnostics } {
  const fm = metadataCache.getFileCache(file)?.frontmatter;
  if (!fm) {
    return {
      entries: [],
      diagnostics: {
        invalidNumberFields: [],
        unrecognizedFields: [],
      },
    };
  }
  return extractEntriesWithDiagnostics(fm as any, file.path, settings);
}
