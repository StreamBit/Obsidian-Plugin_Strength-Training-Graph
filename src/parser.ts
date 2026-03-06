import type { ExerciseEntry, ParseDiagnostics, PluginSettings } from "./types";

const WEIGHT_FIELD_RE = /^(.*?)\s+weight\s*\(([^)]+)\)\s*$/i;
const SETS_FIELD_RE = /^(.*?)\s+sets\s*$/i;
const REPS_FIELD_RE = /^(.*?)\s+reps\s*\(\s*per\s*set\s*\)\s*$/i;
const MOD_FIELD_RE = /^(.*?)\s+modifier\s*$/i;

function toNumber(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return undefined;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function clampModifier(n: number | undefined): number {
  if (!Number.isFinite(n as number)) return 1;
  return Math.max(1, n as number);
}

function toISODate(v: unknown): string | undefined {
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parsed = Date.parse(s);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
    return undefined;
  }
  if (v instanceof Date && Number.isFinite(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  return undefined;
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

export function extractEntriesWithDiagnostics(
  fm: Record<string, any>,
  notePath: string,
  settings: PluginSettings
): { entries: ExerciseEntry[]; diagnostics: ParseDiagnostics } {
  const fmEntries = Object.entries(fm ?? {}).map(([k, v]) => [normalizeKey(k), v] as const);
  const map = new Map<string, any>(fmEntries);
  const diagnostics: ParseDiagnostics = {
    invalidNumberFields: [],
    unrecognizedFields: [],
  };

  const iso = toISODate(map.get(normalizeKey(settings.dateKey)));
  if (!iso) return { entries: [], diagnostics };

  type Acc = {
    weight_lbs?: number;
    sets?: number;
    reps_per_set?: number;
    modifier?: number;
    weightUnit?: "lbs" | "kg";
  };

  const acc = new Map<string, Acc>();

  for (const [rawKey, value] of Object.entries(fm ?? {})) {
    const key = rawKey.trim();
    if (!key) continue;

    let match = key.match(WEIGHT_FIELD_RE);
    if (match) {
      const exerciseName = match[1].trim();
      if (!exerciseName) continue;

      const a = acc.get(exerciseName) ?? {};
      const unitRaw = (match[2] || "").trim().toLowerCase();
      const n = toNumber(value);
      if (n === undefined) {
        diagnostics.invalidNumberFields.push(rawKey);
        continue;
      }
      const unit =
        unitRaw === "lb" || unitRaw === "lbs"
          ? "lbs"
          : unitRaw === "kg" || unitRaw === "kgs"
            ? "kg"
            : undefined;
      if (!unit) {
        diagnostics.unrecognizedFields.push(rawKey);
        continue;
      }
      if (unit === "lbs") {
        a.weight_lbs = n;
        a.weightUnit = "lbs";
      } else {
        if (a.weightUnit !== "lbs") {
          a.weight_lbs = n * 2.20462262;
          a.weightUnit = "kg";
        }
      }
      acc.set(exerciseName, a);
      continue;
    }

    match = key.match(SETS_FIELD_RE);
    if (match) {
      const exerciseName = match[1].trim();
      if (!exerciseName) continue;

      const a = acc.get(exerciseName) ?? {};
      const n = toNumber(value);
      if (n === undefined) diagnostics.invalidNumberFields.push(rawKey);
      else a.sets = n;
      acc.set(exerciseName, a);
      continue;
    }

    match = key.match(REPS_FIELD_RE);
    if (match) {
      const exerciseName = match[1].trim();
      if (!exerciseName) continue;

      const a = acc.get(exerciseName) ?? {};
      const n = toNumber(value);
      if (n === undefined) diagnostics.invalidNumberFields.push(rawKey);
      else a.reps_per_set = n;
      acc.set(exerciseName, a);
      continue;
    }

    match = key.match(MOD_FIELD_RE);
    if (match) {
      const exerciseName = match[1].trim();
      if (!exerciseName) continue;

      const a = acc.get(exerciseName) ?? {};
      const n = toNumber(value);
      if (n === undefined) diagnostics.invalidNumberFields.push(rawKey);
      a.modifier = clampModifier(n);
      acc.set(exerciseName, a);
      continue;
    }

    const isPotentialExerciseField = /\b(weight|sets|reps|modifier)\b/i.test(key);
    if (isPotentialExerciseField && normalizeKey(key) !== normalizeKey(settings.dateKey)) {
      diagnostics.unrecognizedFields.push(rawKey);
    }
  }

  const out: ExerciseEntry[] = [];
  for (const [exerciseName, a] of acc.entries()) {
    out.push({
      exerciseName,
      dateISO: iso,
      sourceNotePath: notePath,
      weight_lbs: a.weight_lbs,
      sets: a.sets,
      reps_per_set: a.reps_per_set,
      modifier: clampModifier(a.modifier),
    });
  }

  return {
    entries: out,
    diagnostics: {
      invalidNumberFields: Array.from(new Set(diagnostics.invalidNumberFields)),
      unrecognizedFields: Array.from(new Set(diagnostics.unrecognizedFields)),
    },
  };
}

export function extractEntriesFromFrontmatter(
  fm: Record<string, any>,
  notePath: string,
  settings: PluginSettings
): ExerciseEntry[] {
  return extractEntriesWithDiagnostics(fm, notePath, settings).entries;
}
