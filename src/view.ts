import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import type StrengthTrainingGraphsPlugin from "./main";
import { computeDerived } from "./metrics";
import type {
  ChartViewState,
  DerivedMetrics,
  ExerciseEntry,
  MetricMode,
  TimeframePreset,
  TrendlineType,
  VolumeDisplayUnit,
} from "./types";

export const VIEW_TYPE_STRENGTH_CHARTS = "strength-training-graphs-view";

const MAX_EXERCISES_STANDARD = 16;
const MAX_EXERCISES_COLORBLIND = 8;
const DAY_MS = 24 * 60 * 60 * 1000;
const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#ea580c", "#0f766e", "#9333ea", "#ca8a04", "#6b7280"];
const LINE_STYLES = ["", "8 4", "2 4", "12 4", "1 3", "8 3 2 3", "4 2 1 2", "10 2 2 2"];

interface SeriesPoint {
  xMs: number;
  plotXMs: number;
  y: number;
  entry: ExerciseEntry;
  derived: DerivedMetrics;
}

interface ChartSeries {
  exerciseName: string;
  color: string;
  dashArray: string;
  points: SeriesPoint[];
  trendlinePoints: Array<{ xMs: number; y: number }>;
}

interface SummaryStats {
  average?: number;
  max?: number;
  total?: number;
}

interface CsvExportRow {
  exercise: string;
  date: string;
  note: string;
  weight_lbs: string;
  sets: string;
  reps_per_set: string;
  total_reps: string;
  volume_lbs: string;
  volume_display: string;
  e1rm_epley_lbs: string;
  e1rm_brzycki_lbs: string;
  plotted_metric: string;
}

function parseISOToUtcMs(iso: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const ms = Date.parse(`${iso}T12:00:00Z`);
  return Number.isFinite(ms) ? ms : undefined;
}

function formatNumber(n: number, digits = 2): string {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(n) ? 0 : Math.min(1, digits),
  });
}

function toVolumeDisplay(valueLbs: number, unit: VolumeDisplayUnit): number {
  if (unit === "lbs") return valueLbs;
  if (unit === "kg") return valueLbs * 0.45359237;
  if (unit === "metric_tonne") return (valueLbs * 0.45359237) / 1000;
  return valueLbs / 2000;
}

function volumeUnitLabel(unit: VolumeDisplayUnit): string {
  if (unit === "lbs") return "lb";
  if (unit === "kg") return "kg";
  if (unit === "metric_tonne") return "t";
  return "short tons";
}

function metricUnitLabel(metricMode: MetricMode, volumeUnit: VolumeDisplayUnit): string {
  if (metricMode === "weight") return "lb";
  if (metricMode === "reps") return "reps";
  if (metricMode === "sets") return "sets";
  return volumeUnitLabel(volumeUnit);
}

function formatVolume(value: number | undefined, unit: VolumeDisplayUnit): string {
  if (value === undefined) return "n/a";
  if (unit === "lbs") return `${formatNumber(value, 1)} lb`;
  if (unit === "kg") return `${formatNumber(value, 1)} kg`;
  if (unit === "metric_tonne") return `${formatNumber(value, 3)} t`;
  return `${formatNumber(value, 3)} short tons`;
}

function calculateMovingAverage(points: SeriesPoint[], windowDays: number): Array<{ xMs: number; y: number }> {
  if (points.length < 2) return [];
  const out: Array<{ xMs: number; y: number }> = [];
  const windowMs = Math.max(1, windowDays) * DAY_MS;

  for (let i = 0; i < points.length; i++) {
    const endX = points[i].xMs;
    const startX = endX - windowMs;
    let sum = 0;
    let count = 0;
    for (let j = 0; j < points.length; j++) {
      const x = points[j].xMs;
      if (x >= startX && x <= endX) {
        sum += points[j].y;
        count++;
      }
    }
    if (count > 0) out.push({ xMs: endX, y: sum / count });
  }
  return out;
}

function calculateLinearRegression(points: SeriesPoint[]): Array<{ xMs: number; y: number }> {
  if (points.length < 2) return [];
  const x0 = points[0].xMs;
  const xs = points.map((p) => (p.xMs - x0) / DAY_MS);
  const ys = points.map((p) => p.y);
  const n = points.length;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return [];

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const xStart = xs[0];
  const xEnd = xs[n - 1];
  return [
    { xMs: x0 + xStart * DAY_MS, y: slope * xStart + intercept },
    { xMs: x0 + xEnd * DAY_MS, y: slope * xEnd + intercept },
  ];
}

function createSvgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>
): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function sanitizeTimeframePreset(raw: string): TimeframePreset {
  const valid: TimeframePreset[] = ["last30", "last90", "last180", "last365", "all", "custom"];
  return valid.includes(raw as TimeframePreset) ? (raw as TimeframePreset) : "last180";
}

function sanitizeMetric(raw: string): MetricMode {
  const valid: MetricMode[] = ["reps", "sets", "weight", "volume"];
  return valid.includes(raw as MetricMode) ? (raw as MetricMode) : "weight";
}

function sanitizeVolumeUnit(raw: string): VolumeDisplayUnit {
  if (raw === "lbs" || raw === "kg" || raw === "us_short_ton" || raw === "metric_tonne") return raw;
  if (raw === "tons") return "us_short_ton";
  return "lbs";
}

function sanitizeTrendline(raw: string): Exclude<TrendlineType, "none"> {
  return raw === "linearRegression" ? "linearRegression" : "movingAverage";
}

function toLocalIsoString(iso: string | undefined): string {
  if (!iso) return "n/a";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "n/a";
  return d.toLocaleString();
}

export class StrengthChartsView extends ItemView {
  plugin: StrengthTrainingGraphsPlugin;

  selectedExercises = new Set<string>();
  metricMode: MetricMode = "weight";
  trendlineEnabled = false;
  trendlineType: Exclude<TrendlineType, "none"> = "movingAverage";
  timeframePreset: TimeframePreset = "last180";
  customStartISO = "";
  customEndISO = "";
  exerciseSearchQuery = "";
  volumeDisplayUnit: VolumeDisplayUnit = "lbs";

  private currentSvg: SVGSVGElement | null = null;
  private lastVisibleRows: CsvExportRow[] = [];

  constructor(leaf: WorkspaceLeaf, plugin: StrengthTrainingGraphsPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.loadStateFromSettings();
  }

  getViewType(): string {
    return VIEW_TYPE_STRENGTH_CHARTS;
  }

  getDisplayText(): string {
    return "Strength Charts";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  private getSelectionCap(): number {
    return this.plugin.settings.colorblindMode ? MAX_EXERCISES_COLORBLIND : MAX_EXERCISES_STANDARD;
  }

  private loadStateFromSettings(): void {
    const state = this.plugin.settings.chartViewState;
    this.selectedExercises = new Set(Array.isArray(state.selectedExercises) ? state.selectedExercises : []);
    this.metricMode = sanitizeMetric(state.metricMode);
    this.trendlineEnabled = !!state.trendlineEnabled;
    this.trendlineType = sanitizeTrendline(state.trendlineType);
    this.timeframePreset = sanitizeTimeframePreset(state.timeframePreset);
    this.customStartISO = state.customStartISO ?? "";
    this.customEndISO = state.customEndISO ?? "";
    this.exerciseSearchQuery = state.exerciseSearchQuery ?? "";
    this.volumeDisplayUnit = sanitizeVolumeUnit(state.volumeDisplayUnit);
    this.enforceSelectionCap(false);
  }

  private persistState(): void {
    const state: ChartViewState = {
      selectedExercises: Array.from(this.selectedExercises),
      metricMode: this.metricMode,
      trendlineEnabled: this.trendlineEnabled,
      trendlineType: this.trendlineType,
      timeframePreset: this.timeframePreset,
      customStartISO: this.customStartISO,
      customEndISO: this.customEndISO,
      exerciseSearchQuery: this.exerciseSearchQuery,
      volumeDisplayUnit: this.volumeDisplayUnit,
    };
    this.plugin.settings.chartViewState = state;
    void this.plugin.saveSettings();
  }

  private enforceSelectionCap(showNotice: boolean): void {
    const cap = this.getSelectionCap();
    if (this.selectedExercises.size <= cap) return;
    const trimmed = Array.from(this.selectedExercises).slice(0, cap);
    this.selectedExercises = new Set(trimmed);
    if (showNotice) {
      new Notice(
        this.plugin.settings.colorblindMode
          ? "Colorblind mode limits chart selection to 8 exercises for clearer line differentiation."
          : `You can plot at most ${cap} exercises.`
      );
    }
  }

  private getDateRange(): { startMs?: number; endMs?: number } {
    if (this.timeframePreset === "all") return {};

    if (this.timeframePreset === "custom") {
      const startCandidate = this.customStartISO ? Date.parse(`${this.customStartISO}T00:00:00Z`) : undefined;
      const endCandidate = this.customEndISO ? Date.parse(`${this.customEndISO}T23:59:59Z`) : undefined;
      const start = Number.isFinite(startCandidate) ? startCandidate : undefined;
      const end = Number.isFinite(endCandidate) ? endCandidate : undefined;
      if (start !== undefined && end !== undefined && start > end) return { startMs: end, endMs: start };
      return { startMs: start, endMs: end };
    }

    const days =
      this.timeframePreset === "last30"
        ? 30
        : this.timeframePreset === "last90"
          ? 90
          : this.timeframePreset === "last180"
            ? 180
            : 365;

    const now = new Date();
    const utcStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return {
      startMs: utcStart - (days - 1) * DAY_MS,
      endMs: utcStart + DAY_MS - 1,
    };
  }

  private getMetricValue(entry: ExerciseEntry, derived: DerivedMetrics): number | undefined {
    if (this.metricMode === "reps") return derived.totalReps;
    if (this.metricMode === "sets") return entry.sets;
    if (this.metricMode === "weight") return entry.weight_lbs;
    if (derived.volume_lbs === undefined) return undefined;
    return toVolumeDisplay(derived.volume_lbs, this.volumeDisplayUnit);
  }

  private getSeriesStyle(index: number, totalSeries: number): { color: string; dashArray: string } {
    if (this.plugin.settings.colorblindMode) {
      return {
        color: COLORS[index % COLORS.length],
        dashArray: LINE_STYLES[index % LINE_STYLES.length],
      };
    }

    if (totalSeries <= 8) {
      return { color: COLORS[index % COLORS.length], dashArray: LINE_STYLES[0] };
    }
    if (index < 8) {
      return { color: COLORS[index], dashArray: LINE_STYLES[0] };
    }
    const shifted = index - 8;
    return {
      color: COLORS[shifted % COLORS.length],
      dashArray: LINE_STYLES[(shifted + 1) % LINE_STYLES.length],
    };
  }

  private applyJitter(points: SeriesPoint[]): void {
    const byDate = new Map<string, SeriesPoint[]>();
    for (const point of points) {
      const list = byDate.get(point.entry.dateISO) ?? [];
      list.push(point);
      byDate.set(point.entry.dateISO, list);
    }
    const step = 0.06 * DAY_MS;
    for (const group of byDate.values()) {
      if (group.length <= 1) {
        group[0].plotXMs = group[0].xMs;
        continue;
      }
      group.sort((a, b) => a.entry.sourceNotePath.localeCompare(b.entry.sourceNotePath));
      for (let i = 0; i < group.length; i++) {
        const offset = (i - (group.length - 1) / 2) * step;
        group[i].plotXMs = group[i].xMs + offset;
      }
    }
  }

  private async openSourceNote(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`Source note not found: ${path}`);
      return;
    }
    await this.app.workspace.getLeaf(true).openFile(file);
  }

  private computeSummary(values: number[]): SummaryStats {
    if (!values.length) return {};
    const total = values.reduce((acc, x) => acc + x, 0);
    return {
      average: total / values.length,
      max: Math.max(...values),
      total,
    };
  }

  private async handleRefreshClick(): Promise<void> {
    if (this.plugin.indexingStatus.isReindexing) return;
    try {
      await this.plugin.reindexAll();
      new Notice("Strength charts refreshed.");
    } catch (error) {
      new Notice("Refresh failed. See indexing status at the bottom.");
      console.error(error);
    }
  }

  private csvEscape(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async handleCopyPng(): Promise<void> {
    if (!this.currentSvg) {
      new Notice("No chart available to copy.");
      return;
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(this.currentSvg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Unable to load chart image."));
        img.src = svgUrl;
      });

      const vb = this.currentSvg.viewBox.baseVal;
      const width = vb.width > 0 ? Math.round(vb.width) : Math.max(this.currentSvg.clientWidth, 800);
      const height = vb.height > 0 ? Math.round(vb.height) : Math.max(this.currentSvg.clientHeight, 420);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to prepare canvas.");
      ctx.fillStyle = getComputedStyle(this.containerEl).getPropertyValue("--background-primary").trim() || "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) reject(new Error("Unable to create PNG."));
          else resolve(blob);
        }, "image/png");
      });

      const canWriteClipboard =
        typeof ClipboardItem !== "undefined" &&
        !!navigator.clipboard &&
        typeof navigator.clipboard.write === "function";
      if (canWriteClipboard) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
        new Notice("Chart PNG copied to clipboard.");
      } else {
        this.downloadBlob(pngBlob, "strength-chart.png");
        new Notice("Clipboard write unavailable. Downloaded PNG instead.");
      }
    } catch (error) {
      new Notice("Could not copy PNG.");
      console.error(error);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  private handleExportCsv(): void {
    if (this.lastVisibleRows.length === 0) {
      new Notice("No visible chart data to export.");
      return;
    }
    const header = [
      "exercise",
      "date",
      "note",
      "weight_lbs",
      "sets",
      "reps_per_set",
      "total_reps",
      "volume_lbs",
      "volume_display",
      "e1rm_epley_lbs",
      "e1rm_brzycki_lbs",
      "plotted_metric",
    ];
    const lines = [header.join(",")];
    for (const row of this.lastVisibleRows) {
      lines.push(
        [
          row.exercise,
          row.date,
          row.note,
          row.weight_lbs,
          row.sets,
          row.reps_per_set,
          row.total_reps,
          row.volume_lbs,
          row.volume_display,
          row.e1rm_epley_lbs,
          row.e1rm_brzycki_lbs,
          row.plotted_metric,
        ]
          .map((v) => this.csvEscape(v))
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    this.downloadBlob(blob, `strength-chart-${stamp}.csv`);
    new Notice("Visible chart data exported to CSV.");
  }

  private renderE1rmPanel(container: HTMLDivElement, selected: string[], series: ChartSeries[]): void {
    container.empty();
    container.addClass("stg-e1rm");
    const heading = container.createDiv({ cls: "stg-e1rm-heading", text: "Estimated 1RM (Visible Data)" });
    heading.createSpan({
      cls: "stg-e1rm-sub",
      text: "Latest = most recent visible workout. Max = highest visible estimate in the selected timeframe.",
    });

    container.createDiv({
      cls: "stg-e1rm-notes",
      text: "Epley is often stable for moderate rep ranges. Brzycki is often favored for lower reps. Both are estimates, not direct test maxes.",
    });

    const tableWrap = container.createDiv({ cls: "stg-e1rm-table-wrap" });
    const table = tableWrap.createEl("table", { cls: "stg-e1rm-table" });
    const thead = table.createTHead();
    const headRow = thead.insertRow();
    ["Exercise", "Epley Latest", "Epley Max", "Brzycki Latest", "Brzycki Max"].forEach((label) => {
      const cell = headRow.createEl("th");
      cell.setText(label);
    });
    const tbody = table.createTBody();

    if (selected.length === 0) {
      const row = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.setText("Select one or more exercises to view e1RM estimates.");
      return;
    }

    for (const exercise of selected) {
      const row = tbody.insertRow();
      const currentSeries = series.find((s) => s.exerciseName === exercise);
      const pts = currentSeries?.points ?? [];
      const latest = pts.length ? pts[pts.length - 1] : undefined;

      const maxEpley = pts
        .map((p) => p.derived.e1rmEpley_lbs)
        .filter((v): v is number => v !== undefined)
        .reduce<number | undefined>((acc, v) => (acc === undefined ? v : Math.max(acc, v)), undefined);
      const maxBrzycki = pts
        .map((p) => p.derived.e1rmBrzycki_lbs)
        .filter((v): v is number => v !== undefined)
        .reduce<number | undefined>((acc, v) => (acc === undefined ? v : Math.max(acc, v)), undefined);

      row.insertCell().setText(exercise);
      row
        .insertCell()
        .setText(latest?.derived.e1rmEpley_lbs !== undefined ? `${formatNumber(latest.derived.e1rmEpley_lbs, 1)} lb` : "n/a");
      row.insertCell().setText(maxEpley !== undefined ? `${formatNumber(maxEpley, 1)} lb` : "n/a");
      row
        .insertCell()
        .setText(latest?.derived.e1rmBrzycki_lbs !== undefined ? `${formatNumber(latest.derived.e1rmBrzycki_lbs, 1)} lb` : "n/a");
      row.insertCell().setText(maxBrzycki !== undefined ? `${formatNumber(maxBrzycki, 1)} lb` : "n/a");
    }
  }

  private renderDiagnosticsPanel(container: HTMLDivElement): void {
    container.empty();
    container.addClass("stg-diagnostics");
    const status = this.plugin.indexingStatus;

    const top = container.createDiv({ cls: "stg-diag-line" });
    top.setText(
      status.isReindexing
        ? "Indexing in progress..."
        : `Last indexed: ${toLocalIsoString(status.lastIndexedAtISO)} | Scanned: ${status.notesScanned} | Included: ${status.notesIncluded} | Entries: ${status.entriesParsed}`
    );

    container.createDiv({
      cls: "stg-diag-line",
      text: `Skipped by filter: ${status.skippedByFilter} | Missing date: ${status.missingDate} | Invalid date: ${status.invalidDate}`,
    });
    container.createDiv({
      cls: "stg-diag-line",
      text: `Field issues: invalid numbers ${status.invalidNumberFields} | unrecognized fields ${status.unrecognizedFields}`,
    });

    if (status.lastRefreshError) {
      container.createDiv({ cls: "stg-diag-error", text: `Last refresh error: ${status.lastRefreshError}` });
    }

    const issues = status.recentIssues.slice(0, 12);
    if (issues.length > 0) {
      container.createDiv({ cls: "stg-diag-heading", text: "Recent Parse Issues" });
      const ul = container.createEl("ul", { cls: "stg-diag-list" });
      for (const issue of issues) ul.createEl("li", { text: issue });
    }
  }

  private buildUi(): void {
    const root = this.contentEl;
    root.empty();
    root.addClass("stg-root");

    this.enforceSelectionCap(true);
    const selectionCap = this.getSelectionCap();

    const allExercises = this.plugin.index.getExerciseNames();
    for (const selected of Array.from(this.selectedExercises)) {
      if (!allExercises.includes(selected)) this.selectedExercises.delete(selected);
    }

    const layoutEl = root.createDiv({ cls: "stg-layout" });
    const sidebarEl = layoutEl.createDiv({ cls: "stg-sidebar" });
    const mainEl = layoutEl.createDiv({ cls: "stg-main" });

    sidebarEl.createEl("h3", { text: "Exercises" });
    sidebarEl.createDiv({ cls: "stg-sidebar-count", text: `${this.selectedExercises.size}/${selectionCap} selected` });

    const searchEl = sidebarEl.createEl("input", {
      cls: "stg-search",
      type: "search",
      placeholder: "Search exercise",
    });
    searchEl.value = this.exerciseSearchQuery;
    searchEl.addEventListener("input", () => {
      this.exerciseSearchQuery = searchEl.value.trim().toLowerCase();
      this.persistState();
      this.render();
    });

    const actionRow = sidebarEl.createDiv({ cls: "stg-actions" });
    const selectAllBtn = actionRow.createEl("button", { text: "Select All" });
    const clearBtn = actionRow.createEl("button", { text: "Clear" });
    selectAllBtn.addEventListener("click", () => {
      if (allExercises.length > selectionCap) {
        new Notice(`Selection cap is ${selectionCap}. Selected first ${selectionCap} exercises.`);
      }
      this.selectedExercises = new Set(allExercises.slice(0, selectionCap));
      this.persistState();
      this.render();
    });
    clearBtn.addEventListener("click", () => {
      this.selectedExercises.clear();
      this.persistState();
      this.render();
    });

    const listEl = sidebarEl.createDiv({ cls: "stg-exercise-list" });
    const filtered = allExercises.filter((name) =>
      this.exerciseSearchQuery ? name.toLowerCase().includes(this.exerciseSearchQuery) : true
    );
    if (filtered.length === 0) {
      listEl.createDiv({ cls: "stg-empty", text: "No exercises found." });
    } else {
      for (const exerciseName of filtered) {
        const row = listEl.createEl("label", { cls: "stg-exercise-row" });
        const cb = row.createEl("input", { type: "checkbox" });
        cb.checked = this.selectedExercises.has(exerciseName);
        cb.addEventListener("change", () => {
          if (cb.checked) {
            if (this.selectedExercises.size >= selectionCap) {
              cb.checked = false;
              new Notice(`Exercise limit reached (${selectionCap}).`);
              return;
            }
            this.selectedExercises.add(exerciseName);
          } else {
            this.selectedExercises.delete(exerciseName);
          }
          this.persistState();
          this.render();
        });
        row.createSpan({ text: exerciseName });
      }
    }

    const controlsEl = mainEl.createDiv({ cls: "stg-controls" });
    const metricGroupEl = controlsEl.createDiv({ cls: "stg-control-group" });
    metricGroupEl.createSpan({ cls: "stg-group-label", text: "Metric" });

    const metricOptions: Array<{ value: MetricMode; label: string }> = [
      { value: "reps", label: "Reps" },
      { value: "sets", label: "Sets" },
      { value: "weight", label: "Weight" },
      { value: "volume", label: "Volume" },
    ];
    for (const opt of metricOptions) {
      const label = metricGroupEl.createEl("label", { cls: "stg-radio" });
      const input = label.createEl("input", { type: "radio", name: "stg-metric" });
      input.checked = this.metricMode === opt.value;
      input.addEventListener("change", () => {
        this.metricMode = opt.value;
        this.persistState();
        this.render();
      });
      label.createSpan({ text: opt.label });
    }

    const volumeUnitGroup = controlsEl.createDiv({ cls: "stg-control-group" });
    volumeUnitGroup.createSpan({ cls: "stg-group-label", text: "Volume Unit" });
    const unitSelect = volumeUnitGroup.createEl("select");
    unitSelect.createEl("option", { value: "lbs", text: "lbs" });
    unitSelect.createEl("option", { value: "kg", text: "kg" });
    unitSelect.createEl("option", { value: "us_short_ton", text: "US short tons" });
    unitSelect.createEl("option", { value: "metric_tonne", text: "Metric tonnes" });
    unitSelect.value = this.volumeDisplayUnit;
    unitSelect.addEventListener("change", () => {
      this.volumeDisplayUnit = unitSelect.value as VolumeDisplayUnit;
      this.persistState();
      this.render();
    });

    const timeframeGroup = controlsEl.createDiv({ cls: "stg-control-group" });
    timeframeGroup.createSpan({ cls: "stg-group-label", text: "Timeframe" });
    const timeframeSelect = timeframeGroup.createEl("select");
    timeframeSelect.createEl("option", { value: "last30", text: "Last 30 days" });
    timeframeSelect.createEl("option", { value: "last90", text: "Last 90 days" });
    timeframeSelect.createEl("option", { value: "last180", text: "Last 180 days" });
    timeframeSelect.createEl("option", { value: "last365", text: "Last 365 days" });
    timeframeSelect.createEl("option", { value: "all", text: "All time" });
    timeframeSelect.createEl("option", { value: "custom", text: "Custom range" });
    timeframeSelect.value = this.timeframePreset;
    timeframeSelect.addEventListener("change", () => {
      this.timeframePreset = sanitizeTimeframePreset(timeframeSelect.value);
      this.persistState();
      this.render();
    });

    if (this.timeframePreset === "custom") {
      const startInput = timeframeGroup.createEl("input", { type: "date", cls: "stg-date-input" });
      startInput.value = this.customStartISO;
      startInput.addEventListener("change", () => {
        this.customStartISO = startInput.value;
        this.persistState();
        this.render();
      });
      const endInput = timeframeGroup.createEl("input", { type: "date", cls: "stg-date-input" });
      endInput.value = this.customEndISO;
      endInput.addEventListener("change", () => {
        this.customEndISO = endInput.value;
        this.persistState();
        this.render();
      });
    }

    const trendlineGroup = controlsEl.createDiv({ cls: "stg-control-group" });
    trendlineGroup.createSpan({ cls: "stg-group-label", text: "Trendline" });
    const trendToggleLabel = trendlineGroup.createEl("label", { cls: "stg-radio" });
    const trendToggle = trendToggleLabel.createEl("input", { type: "checkbox" });
    trendToggle.checked = this.trendlineEnabled;
    trendToggle.addEventListener("change", () => {
      this.trendlineEnabled = trendToggle.checked;
      this.persistState();
      this.render();
    });
    trendToggleLabel.createSpan({ text: "Enabled" });
    const trendTypeSelect = trendlineGroup.createEl("select");
    trendTypeSelect.createEl("option", { value: "movingAverage", text: "Moving average" });
    trendTypeSelect.createEl("option", { value: "linearRegression", text: "Linear regression" });
    trendTypeSelect.value = this.trendlineType;
    trendTypeSelect.disabled = !this.trendlineEnabled;
    trendTypeSelect.addEventListener("change", () => {
      this.trendlineType = sanitizeTrendline(trendTypeSelect.value);
      this.persistState();
      this.render();
    });

    const actionsGroup = controlsEl.createDiv({ cls: "stg-control-group stg-control-actions" });
    const refreshBtn = actionsGroup.createEl("button", {
      text: this.plugin.indexingStatus.isReindexing ? "Refreshing..." : "Refresh Data",
    });
    refreshBtn.disabled = this.plugin.indexingStatus.isReindexing;
    refreshBtn.addEventListener("click", () => {
      void this.handleRefreshClick();
    });

    const copyBtn = actionsGroup.createEl("button", { text: "Copy PNG" });
    copyBtn.addEventListener("click", () => {
      void this.handleCopyPng();
    });
    const exportBtn = actionsGroup.createEl("button", { text: "Export CSV" });
    exportBtn.addEventListener("click", () => this.handleExportCsv());

    const chartContainer = mainEl.createDiv({ cls: "stg-chart-wrap" });
    const summaryContainer = mainEl.createDiv({ cls: "stg-summary" });
    const e1rmContainer = mainEl.createDiv({ cls: "stg-e1rm" });
    const diagnosticsContainer = mainEl.createDiv({ cls: "stg-diagnostics" });

    this.renderChart(chartContainer, summaryContainer, e1rmContainer, diagnosticsContainer, allExercises);
  }

  private renderChart(
    chartEl: HTMLDivElement,
    summaryEl: HTMLDivElement,
    e1rmEl: HTMLDivElement,
    diagnosticsEl: HTMLDivElement,
    allExercises: string[]
  ): void {
    chartEl.empty();
    summaryEl.empty();
    this.currentSvg = null;
    this.lastVisibleRows = [];

    const selected = allExercises.filter((name) => this.selectedExercises.has(name));
    const { startMs, endMs } = this.getDateRange();
    const series: ChartSeries[] = [];
    const visibleMetricValues: number[] = [];

    for (let i = 0; i < selected.length; i++) {
      const exerciseName = selected[i];
      const entries = this.plugin.index.getEntriesForExercise(exerciseName);
      const points: SeriesPoint[] = [];
      for (const entry of entries) {
        const xMs = parseISOToUtcMs(entry.dateISO);
        if (xMs === undefined) continue;
        if (startMs !== undefined && xMs < startMs) continue;
        if (endMs !== undefined && xMs > endMs) continue;
        const derived = computeDerived(entry);
        const y = this.getMetricValue(entry, derived);
        if (!Number.isFinite(y)) continue;
        points.push({ xMs, plotXMs: xMs, y: y as number, entry, derived });
      }

      points.sort((a, b) => a.xMs - b.xMs);
      this.applyJitter(points);
      for (const p of points) {
        visibleMetricValues.push(p.y);
        const volumeDisplay =
          p.derived.volume_lbs !== undefined ? toVolumeDisplay(p.derived.volume_lbs, this.volumeDisplayUnit) : undefined;
        this.lastVisibleRows.push({
          exercise: exerciseName,
          date: p.entry.dateISO,
          note: p.entry.sourceNotePath,
          weight_lbs: p.entry.weight_lbs !== undefined ? String(p.entry.weight_lbs) : "",
          sets: p.entry.sets !== undefined ? String(p.entry.sets) : "",
          reps_per_set: p.entry.reps_per_set !== undefined ? String(p.entry.reps_per_set) : "",
          total_reps: p.derived.totalReps !== undefined ? String(p.derived.totalReps) : "",
          volume_lbs: p.derived.volume_lbs !== undefined ? String(p.derived.volume_lbs) : "",
          volume_display: volumeDisplay !== undefined ? String(volumeDisplay) : "",
          e1rm_epley_lbs: p.derived.e1rmEpley_lbs !== undefined ? String(p.derived.e1rmEpley_lbs) : "",
          e1rm_brzycki_lbs: p.derived.e1rmBrzycki_lbs !== undefined ? String(p.derived.e1rmBrzycki_lbs) : "",
          plotted_metric: String(p.y),
        });
      }

      const style = this.getSeriesStyle(i, selected.length);
      const shouldDrawTrendline =
        this.trendlineEnabled && (this.metricMode === "weight" || this.metricMode === "volume");
      const trendlinePoints = shouldDrawTrendline
        ? this.trendlineType === "movingAverage"
          ? calculateMovingAverage(points, this.plugin.settings.movingAverageWindowDays)
          : calculateLinearRegression(points)
        : [];

      series.push({ exerciseName, color: style.color, dashArray: style.dashArray, points, trendlinePoints });
    }

    const allPoints = series.flatMap((s) => s.points);
    if (selected.length === 0) {
      chartEl.createDiv({ cls: "stg-empty", text: "Select at least one exercise to plot." });
      this.renderE1rmPanel(e1rmEl, selected, series);
      this.renderDiagnosticsPanel(diagnosticsEl);
      return;
    }
    if (allPoints.length === 0) {
      chartEl.createDiv({ cls: "stg-empty", text: "No datapoints for the current selection/timeframe." });
      this.renderE1rmPanel(e1rmEl, selected, series);
      this.renderDiagnosticsPanel(diagnosticsEl);
      return;
    }

    const summary = this.computeSummary(visibleMetricValues);
    const unit = metricUnitLabel(this.metricMode, this.volumeDisplayUnit);
    const summaryCards = summaryEl.createDiv({ cls: "stg-summary-cards" });
    const avg = summaryCards.createDiv({ cls: "stg-summary-card" });
    avg.createDiv({ cls: "stg-summary-label", text: "Average" });
    avg.createDiv({
      cls: "stg-summary-value",
      text: summary.average !== undefined ? `${formatNumber(summary.average, 2)} ${unit}` : "n/a",
    });
    const max = summaryCards.createDiv({ cls: "stg-summary-card" });
    max.createDiv({ cls: "stg-summary-label", text: "Max" });
    max.createDiv({
      cls: "stg-summary-value",
      text: summary.max !== undefined ? `${formatNumber(summary.max, 2)} ${unit}` : "n/a",
    });
    const total = summaryCards.createDiv({ cls: "stg-summary-card" });
    total.createDiv({ cls: "stg-summary-label", text: "Total" });
    total.createDiv({
      cls: "stg-summary-value",
      text: summary.total !== undefined ? `${formatNumber(summary.total, 2)} ${unit}` : "n/a",
    });

    const legendEl = chartEl.createDiv({ cls: "stg-legend" });
    for (const s of series.filter((x) => x.points.length > 0)) {
      const item = legendEl.createDiv({ cls: "stg-legend-item" });
      const swatch = item.createDiv({ cls: "stg-legend-swatch" });
      swatch.style.borderColor = s.color;
      if (s.dashArray) swatch.style.borderStyle = "dashed";
      item.createDiv({ text: s.exerciseName });
    }

    const host = chartEl.createDiv({ cls: "stg-chart-host" });
    const measuredWidth = host.clientWidth || chartEl.clientWidth || 680;
    const width = Math.max(320, measuredWidth);
    const height = width < 500 ? 320 : 420;
    const margin = { top: 16, right: 20, bottom: 44, left: 68 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const minX = Math.min(...allPoints.map((p) => p.plotXMs));
    const maxX = Math.max(...allPoints.map((p) => p.plotXMs));
    const xSpan = Math.max(DAY_MS, maxX - minX);
    const xStart = minX - 0.04 * xSpan;
    const xEnd = maxX + 0.04 * xSpan;
    const minY = Math.min(...allPoints.map((p) => p.y));
    const maxY = Math.max(...allPoints.map((p) => p.y));
    const yFloor = Math.min(0, minY);
    const yCeil = maxY <= yFloor ? yFloor + 1 : maxY * 1.08;

    const xToPx = (x: number): number => margin.left + ((x - xStart) / (xEnd - xStart)) * plotWidth;
    const yToPx = (y: number): number => margin.top + (1 - (y - yFloor) / (yCeil - yFloor)) * plotHeight;

    const svg = createSvgEl("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width: "100%",
      height: String(height),
      role: "img",
      "aria-label": "Strength progression chart",
    });
    host.appendChild(svg);
    this.currentSvg = svg;

    for (let i = 0; i <= 5; i++) {
      const ratio = i / 5;
      const yValue = yFloor + (1 - ratio) * (yCeil - yFloor);
      const y = margin.top + ratio * plotHeight;
      svg.appendChild(
        createSvgEl("line", {
          x1: String(margin.left),
          y1: String(y),
          x2: String(width - margin.right),
          y2: String(y),
          stroke: "var(--background-modifier-border)",
          "stroke-width": "1",
        })
      );
      const label = createSvgEl("text", {
        x: String(margin.left - 8),
        y: String(y + 4),
        "text-anchor": "end",
        "font-size": "11",
        fill: "var(--text-muted)",
      });
      label.textContent = formatNumber(yValue, 2);
      svg.appendChild(label);
    }

    const tickCount = width < 700 ? 4 : 6;
    for (let i = 0; i <= tickCount; i++) {
      const ratio = i / tickCount;
      const x = margin.left + ratio * plotWidth;
      const t = xStart + ratio * (xEnd - xStart);
      svg.appendChild(
        createSvgEl("line", {
          x1: String(x),
          y1: String(margin.top),
          x2: String(x),
          y2: String(height - margin.bottom),
          stroke: "var(--background-modifier-border)",
          "stroke-width": "1",
          opacity: "0.4",
        })
      );
      const label = createSvgEl("text", {
        x: String(x),
        y: String(height - margin.bottom + 18),
        "text-anchor": "middle",
        "font-size": "11",
        fill: "var(--text-muted)",
      });
      label.textContent = new Date(t).toISOString().slice(0, 10);
      svg.appendChild(label);
    }

    svg.appendChild(
      createSvgEl("line", {
        x1: String(margin.left),
        y1: String(height - margin.bottom),
        x2: String(width - margin.right),
        y2: String(height - margin.bottom),
        stroke: "var(--text-normal)",
        "stroke-width": "1.2",
      })
    );
    svg.appendChild(
      createSvgEl("line", {
        x1: String(margin.left),
        y1: String(margin.top),
        x2: String(margin.left),
        y2: String(height - margin.bottom),
        stroke: "var(--text-normal)",
        "stroke-width": "1.2",
      })
    );

    const tooltip = host.createDiv({ cls: "stg-tooltip" });
    tooltip.hide();

    for (const s of series) {
      if (s.points.length === 0) continue;

      const linePath = s.points
        .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xToPx(p.plotXMs).toFixed(2)} ${yToPx(p.y).toFixed(2)}`)
        .join(" ");
      svg.appendChild(
        createSvgEl("path", {
          d: linePath,
          fill: "none",
          stroke: s.color,
          "stroke-width": "2",
          "stroke-dasharray": s.dashArray,
        })
      );

      if (s.trendlinePoints.length >= 2) {
        const trendPath = s.trendlinePoints
          .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xToPx(p.xMs).toFixed(2)} ${yToPx(p.y).toFixed(2)}`)
          .join(" ");
        svg.appendChild(
          createSvgEl("path", {
            d: trendPath,
            fill: "none",
            stroke: s.color,
            "stroke-width": "1.5",
            "stroke-dasharray": "4 3",
            opacity: "0.65",
          })
        );
      }

      for (const p of s.points) {
        const cx = xToPx(p.plotXMs);
        const cy = yToPx(p.y);
        const circle = createSvgEl("circle", {
          cx: String(cx),
          cy: String(cy),
          r: "4",
          fill: "var(--background-primary)",
          stroke: s.color,
          "stroke-width": "2",
          cursor: "pointer",
        });

        circle.addEventListener("mouseenter", (evt) => {
          const volumeDisplayed =
            p.derived.volume_lbs !== undefined ? toVolumeDisplay(p.derived.volume_lbs, this.volumeDisplayUnit) : undefined;
          tooltip.setText(
            [
              `${s.exerciseName}`,
              `Date: ${p.entry.dateISO}`,
              `Weight: ${p.entry.weight_lbs !== undefined ? `${formatNumber(p.entry.weight_lbs, 1)} lb` : "n/a"}`,
              `Sets: ${p.entry.sets !== undefined ? formatNumber(p.entry.sets, 0) : "n/a"}`,
              `Reps/set: ${p.entry.reps_per_set !== undefined ? formatNumber(p.entry.reps_per_set, 0) : "n/a"}`,
              `Total reps: ${p.derived.totalReps !== undefined ? formatNumber(p.derived.totalReps, 0) : "n/a"}`,
              `Volume: ${formatVolume(volumeDisplayed, this.volumeDisplayUnit)}`,
              `e1RM (Epley): ${p.derived.e1rmEpley_lbs !== undefined ? `${formatNumber(p.derived.e1rmEpley_lbs, 1)} lb` : "n/a"}`,
              `e1RM (Brzycki): ${p.derived.e1rmBrzycki_lbs !== undefined ? `${formatNumber(p.derived.e1rmBrzycki_lbs, 1)} lb` : "n/a"}`,
              `Note: ${p.entry.sourceNotePath}`,
            ].join("\n")
          );
          tooltip.show();
          const hostRect = host.getBoundingClientRect();
          tooltip.style.left = `${evt.clientX - hostRect.left + 12}px`;
          tooltip.style.top = `${evt.clientY - hostRect.top + 12}px`;
        });
        circle.addEventListener("mousemove", (evt) => {
          const hostRect = host.getBoundingClientRect();
          tooltip.style.left = `${evt.clientX - hostRect.left + 12}px`;
          tooltip.style.top = `${evt.clientY - hostRect.top + 12}px`;
        });
        circle.addEventListener("mouseleave", () => tooltip.hide());
        circle.addEventListener("click", () => {
          void this.openSourceNote(p.entry.sourceNotePath);
        });
        svg.appendChild(circle);
      }
    }

    this.renderE1rmPanel(e1rmEl, selected, series);
    this.renderDiagnosticsPanel(diagnosticsEl);
  }

  render(): void {
    this.buildUi();
  }
}
