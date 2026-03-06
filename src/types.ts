export type SourceMode = "folder" | "frontmatter";

export type MetricMode = "reps" | "sets" | "weight" | "volume";

export type TrendlineType = "none" | "movingAverage" | "linearRegression";

export type TimeframePreset = "last30" | "last90" | "last180" | "last365" | "all" | "custom";

export type VolumeDisplayUnit = "lbs" | "kg" | "us_short_ton" | "metric_tonne";

export interface ChartViewState {
  selectedExercises: string[];
  metricMode: MetricMode;
  trendlineEnabled: boolean;
  trendlineType: Exclude<TrendlineType, "none">;
  timeframePreset: TimeframePreset;
  customStartISO: string;
  customEndISO: string;
  exerciseSearchQuery: string;
  volumeDisplayUnit: VolumeDisplayUnit;
}

export interface ParseDiagnostics {
  invalidNumberFields: string[];
  unrecognizedFields: string[];
}

export interface IndexingStatus {
  isReindexing: boolean;
  lastIndexedAtISO?: string;
  notesScanned: number;
  notesIncluded: number;
  entriesParsed: number;
  skippedByFilter: number;
  missingDate: number;
  invalidDate: number;
  invalidNumberFields: number;
  unrecognizedFields: number;
  recentIssues: string[];
  lastRefreshError?: string;
}

export interface PluginSettings {
  sourceMode: SourceMode;

  // Folder mode
  folderPath: string;
  includeSubfolders: boolean;

  // Frontmatter mode
  selectorPropertyName: string;
  selectorPropertyValue: string;

  // Field keys
  dateKey: string;

  // Display
  colorblindMode: boolean;

  // Trendlines
  defaultTrendlineType: Exclude<TrendlineType, "none">;
  movingAverageWindowDays: number;

  // View state
  chartViewState: ChartViewState;
}

export interface ExerciseEntry {
  exerciseName: string;
  dateISO: string; // YYYY-MM-DD
  sourceNotePath: string;

  weight_lbs?: number;
  sets?: number;
  reps_per_set?: number;
  modifier: number; // defaults to 1, clamped >=1
}

export interface DerivedMetrics {
  totalReps?: number;
  volume_lbs?: number;
  e1rmEpley_lbs?: number;
  e1rmBrzycki_lbs?: number;
}
