import type { DerivedMetrics, ExerciseEntry } from "./types";

export function computeDerived(entry: ExerciseEntry): DerivedMetrics {
  const sets = entry.sets;
  const rps = entry.reps_per_set;
  const w = entry.weight_lbs;
  const mod = entry.modifier ?? 1;

  const totalReps = sets !== undefined && rps !== undefined ? sets * rps : undefined;

  const volume_lbs =
    w !== undefined && sets !== undefined && rps !== undefined
      ? w * sets * rps * mod
      : undefined;

  const e1rmEpley_lbs = w !== undefined && rps !== undefined && rps > 0 ? estimateEpley1RM(w, rps) : undefined;
  const e1rmBrzycki_lbs =
    w !== undefined && rps !== undefined && rps > 0 ? estimateBrzycki1RM(w, rps) : undefined;

  return { totalReps, volume_lbs, e1rmEpley_lbs, e1rmBrzycki_lbs };
}

export function estimateEpley1RM(weight_lbs: number, reps_per_set: number): number {
  return weight_lbs * (1 + reps_per_set / 30);
}

export function estimateBrzycki1RM(weight_lbs: number, reps_per_set: number): number {
  const reps = reps_per_set;
  const denom = 37 - reps;
  if (denom <= 0) return weight_lbs;
  return weight_lbs * (36 / denom);
}
