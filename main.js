/* Strength Training Graphs - Obsidian Plugin */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => StrengthTrainingGraphsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  sourceMode: "folder",
  folderPath: "Training",
  includeSubfolders: true,
  selectorPropertyName: "Note Type",
  selectorPropertyValue: "Training Entry",
  dateKey: "Date",
  colorblindMode: false,
  defaultTrendlineType: "movingAverage",
  movingAverageWindowDays: 14,
  chartViewState: {
    selectedExercises: [],
    metricMode: "weight",
    trendlineEnabled: false,
    trendlineType: "movingAverage",
    timeframePreset: "last180",
    customStartISO: "",
    customEndISO: "",
    exerciseSearchQuery: "",
    volumeDisplayUnit: "lbs"
  }
};
var StrengthTrainingGraphsSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Strength Training Graphs - Settings" });
    new import_obsidian.Setting(containerEl).setName("Source mode").setDesc("Choose how workout notes are selected.").addDropdown((dd) => {
      dd.addOption("folder", "Folder");
      dd.addOption("frontmatter", "Frontmatter match (property/value)");
      dd.setValue(this.plugin.settings.sourceMode);
      dd.onChange(async (v) => {
        this.plugin.settings.sourceMode = v;
        await this.plugin.saveSettings();
        await this.plugin.reindexAll();
        this.display();
      });
    });
    containerEl.createEl("h3", { text: "Folder mode" });
    new import_obsidian.Setting(containerEl).setName("Folder path").setDesc("Folder containing training notes (relative to vault root).").addText((t) => {
      t.setValue(this.plugin.settings.folderPath);
      t.onChange(async (v) => {
        this.plugin.settings.folderPath = v.trim();
        await this.plugin.saveSettings();
        await this.plugin.reindexAll();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Include subfolders").addToggle((tg) => {
      tg.setValue(this.plugin.settings.includeSubfolders);
      tg.onChange(async (v) => {
        this.plugin.settings.includeSubfolders = v;
        await this.plugin.saveSettings();
        await this.plugin.reindexAll();
      });
    });
    containerEl.createEl("h3", { text: "Frontmatter match mode" });
    new import_obsidian.Setting(containerEl).setName("Selector property name").setDesc('Frontmatter key to match (e.g., "Note Type"). Case-insensitive.').addText((t) => {
      t.setValue(this.plugin.settings.selectorPropertyName);
      t.onChange(async (v) => {
        this.plugin.settings.selectorPropertyName = v.trim();
        await this.plugin.saveSettings();
        await this.plugin.reindexAll();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Selector property value").setDesc('Required frontmatter value (e.g., "Training Entry").').addText((t) => {
      t.setValue(this.plugin.settings.selectorPropertyValue);
      t.onChange(async (v) => {
        this.plugin.settings.selectorPropertyValue = v.trim();
        await this.plugin.saveSettings();
        await this.plugin.reindexAll();
      });
    });
    containerEl.createEl("h3", { text: "Field keys" });
    new import_obsidian.Setting(containerEl).setName("Date key").setDesc('Frontmatter date key (e.g., "Date"). Required for note inclusion.').addText((t) => {
      t.setValue(this.plugin.settings.dateKey);
      t.onChange(async (v) => {
        this.plugin.settings.dateKey = v.trim();
        await this.plugin.saveSettings();
        await this.plugin.reindexAll();
      });
    });
    containerEl.createEl("p", {
      text: "Input weight is assumed to be lbs unless the key indicates kg/kgs (Weight (kg) / Weight (kgs)). Volume display units are selected directly in the chart screen."
    });
    containerEl.createEl("h3", { text: "Trendlines" });
    new import_obsidian.Setting(containerEl).setName("Default trendline type").addDropdown((dd) => {
      dd.addOption("movingAverage", "Moving average");
      dd.addOption("linearRegression", "Linear regression");
      dd.setValue(this.plugin.settings.defaultTrendlineType);
      dd.onChange(async (v) => {
        this.plugin.settings.defaultTrendlineType = v;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Moving average window (days)").setDesc("Used when moving average trendline is selected.").addText((t) => {
      t.setValue(String(this.plugin.settings.movingAverageWindowDays));
      t.onChange(async (v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 1)
          return;
        this.plugin.settings.movingAverageWindowDays = Math.floor(n);
        await this.plugin.saveSettings();
      });
    });
    containerEl.createEl("p", {
      text: "Moving average smooths day-to-day noise and is useful for seeing short-term direction. Linear regression fits one best-fit line across the visible range and is useful for seeing the overall slope."
    });
    containerEl.createEl("h3", { text: "Accessibility" });
    new import_obsidian.Setting(containerEl).setName("Colorblind mode").setDesc("Uses stronger style separation for readability. To preserve clear line differentiation, chart selection cap is reduced to 8 exercises while enabled.").addToggle((tg) => {
      tg.setValue(this.plugin.settings.colorblindMode);
      tg.onChange(async (v) => {
        this.plugin.settings.colorblindMode = v;
        await this.plugin.saveSettings();
        this.plugin.refreshView();
      });
    });
  }
};

// src/parser.ts
var WEIGHT_FIELD_RE = /^(.*?)\s+weight\s*\(([^)]+)\)\s*$/i;
var SETS_FIELD_RE = /^(.*?)\s+sets\s*$/i;
var REPS_FIELD_RE = /^(.*?)\s+reps\s*\(\s*per\s*set\s*\)\s*$/i;
var MOD_FIELD_RE = /^(.*?)\s+modifier\s*$/i;
function toNumber(v) {
  if (v === null || v === void 0)
    return void 0;
  if (typeof v === "number" && Number.isFinite(v))
    return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s)
      return void 0;
    const n = Number(s);
    if (Number.isFinite(n))
      return n;
  }
  return void 0;
}
function clampModifier(n) {
  if (!Number.isFinite(n))
    return 1;
  return Math.max(1, n);
}
function toISODate(v) {
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s))
      return s;
    const parsed = Date.parse(s);
    if (Number.isFinite(parsed))
      return new Date(parsed).toISOString().slice(0, 10);
    return void 0;
  }
  if (v instanceof Date && Number.isFinite(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  return void 0;
}
function normalizeKey(s) {
  return s.trim().toLowerCase();
}
function extractEntriesWithDiagnostics(fm, notePath, settings) {
  const fmEntries = Object.entries(fm ?? {}).map(([k, v]) => [normalizeKey(k), v]);
  const map = new Map(fmEntries);
  const diagnostics = {
    invalidNumberFields: [],
    unrecognizedFields: []
  };
  const iso = toISODate(map.get(normalizeKey(settings.dateKey)));
  if (!iso)
    return { entries: [], diagnostics };
  const acc = /* @__PURE__ */ new Map();
  for (const [rawKey, value] of Object.entries(fm ?? {})) {
    const key = rawKey.trim();
    if (!key)
      continue;
    let match = key.match(WEIGHT_FIELD_RE);
    if (match) {
      const exerciseName = match[1].trim();
      if (!exerciseName)
        continue;
      const a = acc.get(exerciseName) ?? {};
      const unitRaw = (match[2] || "").trim().toLowerCase();
      const n = toNumber(value);
      if (n === void 0) {
        diagnostics.invalidNumberFields.push(rawKey);
        continue;
      }
      const unit = unitRaw === "lb" || unitRaw === "lbs" ? "lbs" : unitRaw === "kg" || unitRaw === "kgs" ? "kg" : void 0;
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
      if (!exerciseName)
        continue;
      const a = acc.get(exerciseName) ?? {};
      const n = toNumber(value);
      if (n === void 0)
        diagnostics.invalidNumberFields.push(rawKey);
      else
        a.sets = n;
      acc.set(exerciseName, a);
      continue;
    }
    match = key.match(REPS_FIELD_RE);
    if (match) {
      const exerciseName = match[1].trim();
      if (!exerciseName)
        continue;
      const a = acc.get(exerciseName) ?? {};
      const n = toNumber(value);
      if (n === void 0)
        diagnostics.invalidNumberFields.push(rawKey);
      else
        a.reps_per_set = n;
      acc.set(exerciseName, a);
      continue;
    }
    match = key.match(MOD_FIELD_RE);
    if (match) {
      const exerciseName = match[1].trim();
      if (!exerciseName)
        continue;
      const a = acc.get(exerciseName) ?? {};
      const n = toNumber(value);
      if (n === void 0)
        diagnostics.invalidNumberFields.push(rawKey);
      a.modifier = clampModifier(n);
      acc.set(exerciseName, a);
      continue;
    }
    const isPotentialExerciseField = /\b(weight|sets|reps|modifier)\b/i.test(key);
    if (isPotentialExerciseField && normalizeKey(key) !== normalizeKey(settings.dateKey)) {
      diagnostics.unrecognizedFields.push(rawKey);
    }
  }
  const out = [];
  for (const [exerciseName, a] of acc.entries()) {
    out.push({
      exerciseName,
      dateISO: iso,
      sourceNotePath: notePath,
      weight_lbs: a.weight_lbs,
      sets: a.sets,
      reps_per_set: a.reps_per_set,
      modifier: clampModifier(a.modifier)
    });
  }
  return {
    entries: out,
    diagnostics: {
      invalidNumberFields: Array.from(new Set(diagnostics.invalidNumberFields)),
      unrecognizedFields: Array.from(new Set(diagnostics.unrecognizedFields))
    }
  };
}

// src/index.ts
var WorkoutIndex = class {
  constructor() {
    this.byExercise = /* @__PURE__ */ new Map();
    this.noteToEntries = /* @__PURE__ */ new Map();
  }
  clear() {
    this.byExercise.clear();
    this.noteToEntries.clear();
  }
  getExerciseNames() {
    return Array.from(this.byExercise.keys()).sort((a, b) => a.localeCompare(b));
  }
  getEntriesForExercise(exerciseName) {
    return this.byExercise.get(exerciseName) ?? [];
  }
  upsertNote(notePath, entries) {
    const old = this.noteToEntries.get(notePath) ?? [];
    for (const e of old) {
      const arr = this.byExercise.get(e.exerciseName);
      if (!arr)
        continue;
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
  deleteNote(notePath) {
    this.upsertNote(notePath, []);
    this.noteToEntries.delete(notePath);
  }
};
function normalizeKey2(s) {
  return s.trim().toLowerCase();
}
function getDateFieldStatus(fm, dateKey) {
  const entries = Object.entries(fm).map(([k, v]) => [normalizeKey2(k), v]);
  const map = new Map(entries);
  const dateRaw = map.get(normalizeKey2(dateKey));
  if (dateRaw === void 0 || dateRaw === null || String(dateRaw).trim() === "")
    return "missing";
  if (typeof dateRaw === "string") {
    const s = dateRaw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s))
      return "valid";
    return Number.isFinite(Date.parse(s)) ? "valid" : "invalid";
  }
  if (dateRaw instanceof Date && Number.isFinite(dateRaw.getTime()))
    return "valid";
  return "invalid";
}
function evaluateNoteInclusion(file, metadataCache, settings) {
  if (file.extension !== "md")
    return { include: false, skipReason: "source-filter" };
  const fm = metadataCache.getFileCache(file)?.frontmatter;
  if (!fm)
    return { include: false, skipReason: "missing-frontmatter" };
  const dateStatus = getDateFieldStatus(fm, settings.dateKey);
  if (dateStatus === "missing")
    return { include: false, skipReason: "missing-date" };
  if (dateStatus === "invalid")
    return { include: false, skipReason: "invalid-date" };
  if (settings.sourceMode === "folder") {
    const folder = settings.folderPath.replace(/^\/+/, "").replace(/\/+$/, "");
    const path = file.path;
    if (!folder) {
      return { include: true, frontmatter: fm };
    }
    if (settings.includeSubfolders) {
      if (!path.startsWith(folder + "/"))
        return { include: false, skipReason: "source-filter" };
      return { include: true, frontmatter: fm };
    }
    if (!path.startsWith(folder + "/"))
      return { include: false, skipReason: "source-filter" };
    const rest = path.slice((folder + "/").length);
    if (rest.includes("/"))
      return { include: false, skipReason: "source-filter" };
    return { include: true, frontmatter: fm };
  }
  const targetKey = normalizeKey2(settings.selectorPropertyName);
  const wanted = settings.selectorPropertyValue.trim();
  const entries = Object.entries(fm).map(([k, v]) => [normalizeKey2(k), v]);
  const map = new Map(entries);
  const actual = map.get(targetKey);
  if (actual === void 0 || actual === null)
    return { include: false, skipReason: "source-filter" };
  if (typeof actual === "string") {
    const matches2 = actual.trim() === wanted;
    return matches2 ? { include: true, frontmatter: fm } : { include: false, skipReason: "source-filter" };
  }
  const matches = String(actual).trim() === wanted;
  return matches ? { include: true, frontmatter: fm } : { include: false, skipReason: "source-filter" };
}
function extractEntriesForFileWithDiagnostics(file, metadataCache, settings) {
  const fm = metadataCache.getFileCache(file)?.frontmatter;
  if (!fm) {
    return {
      entries: [],
      diagnostics: {
        invalidNumberFields: [],
        unrecognizedFields: []
      }
    };
  }
  return extractEntriesWithDiagnostics(fm, file.path, settings);
}

// src/view.ts
var import_obsidian2 = require("obsidian");

// src/metrics.ts
function computeDerived(entry) {
  const sets = entry.sets;
  const rps = entry.reps_per_set;
  const w = entry.weight_lbs;
  const mod = entry.modifier ?? 1;
  const totalReps = sets !== void 0 && rps !== void 0 ? sets * rps : void 0;
  const volume_lbs = w !== void 0 && sets !== void 0 && rps !== void 0 ? w * sets * rps * mod : void 0;
  const e1rmEpley_lbs = w !== void 0 && rps !== void 0 && rps > 0 ? estimateEpley1RM(w, rps) : void 0;
  const e1rmBrzycki_lbs = w !== void 0 && rps !== void 0 && rps > 0 ? estimateBrzycki1RM(w, rps) : void 0;
  return { totalReps, volume_lbs, e1rmEpley_lbs, e1rmBrzycki_lbs };
}
function estimateEpley1RM(weight_lbs, reps_per_set) {
  return weight_lbs * (1 + reps_per_set / 30);
}
function estimateBrzycki1RM(weight_lbs, reps_per_set) {
  const reps = reps_per_set;
  const denom = 37 - reps;
  if (denom <= 0)
    return weight_lbs;
  return weight_lbs * (36 / denom);
}

// src/view.ts
var VIEW_TYPE_STRENGTH_CHARTS = "strength-training-graphs-view";
var MAX_EXERCISES_STANDARD = 16;
var MAX_EXERCISES_COLORBLIND = 8;
var DAY_MS = 24 * 60 * 60 * 1e3;
var COLORS = ["#2563eb", "#16a34a", "#dc2626", "#ea580c", "#0f766e", "#9333ea", "#ca8a04", "#6b7280"];
var LINE_STYLES = ["", "8 4", "2 4", "12 4", "1 3", "8 3 2 3", "4 2 1 2", "10 2 2 2"];
function parseISOToUtcMs(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso))
    return void 0;
  const ms = Date.parse(`${iso}T12:00:00Z`);
  return Number.isFinite(ms) ? ms : void 0;
}
function formatNumber(n, digits = 2) {
  return n.toLocaleString(void 0, {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(n) ? 0 : Math.min(1, digits)
  });
}
function toVolumeDisplay(valueLbs, unit) {
  if (unit === "lbs")
    return valueLbs;
  if (unit === "kg")
    return valueLbs * 0.45359237;
  if (unit === "metric_tonne")
    return valueLbs * 0.45359237 / 1e3;
  return valueLbs / 2e3;
}
function volumeUnitLabel(unit) {
  if (unit === "lbs")
    return "lb";
  if (unit === "kg")
    return "kg";
  if (unit === "metric_tonne")
    return "t";
  return "short tons";
}
function metricUnitLabel(metricMode, volumeUnit) {
  if (metricMode === "weight")
    return "lb";
  if (metricMode === "reps")
    return "reps";
  if (metricMode === "sets")
    return "sets";
  return volumeUnitLabel(volumeUnit);
}
function formatVolume(value, unit) {
  if (value === void 0)
    return "n/a";
  if (unit === "lbs")
    return `${formatNumber(value, 1)} lb`;
  if (unit === "kg")
    return `${formatNumber(value, 1)} kg`;
  if (unit === "metric_tonne")
    return `${formatNumber(value, 3)} t`;
  return `${formatNumber(value, 3)} short tons`;
}
function calculateMovingAverage(points, windowDays) {
  if (points.length < 2)
    return [];
  const out = [];
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
    if (count > 0)
      out.push({ xMs: endX, y: sum / count });
  }
  return out;
}
function calculateLinearRegression(points) {
  if (points.length < 2)
    return [];
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
  if (denom === 0)
    return [];
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const xStart = xs[0];
  const xEnd = xs[n - 1];
  return [
    { xMs: x0 + xStart * DAY_MS, y: slope * xStart + intercept },
    { xMs: x0 + xEnd * DAY_MS, y: slope * xEnd + intercept }
  ];
}
function createSvgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs))
    el.setAttribute(k, v);
  return el;
}
function sanitizeTimeframePreset(raw) {
  const valid = ["last30", "last90", "last180", "last365", "all", "custom"];
  return valid.includes(raw) ? raw : "last180";
}
function sanitizeMetric(raw) {
  const valid = ["reps", "sets", "weight", "volume"];
  return valid.includes(raw) ? raw : "weight";
}
function sanitizeVolumeUnit(raw) {
  if (raw === "lbs" || raw === "kg" || raw === "us_short_ton" || raw === "metric_tonne")
    return raw;
  if (raw === "tons")
    return "us_short_ton";
  return "lbs";
}
function sanitizeTrendline(raw) {
  return raw === "linearRegression" ? "linearRegression" : "movingAverage";
}
function toLocalIsoString(iso) {
  if (!iso)
    return "n/a";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime()))
    return "n/a";
  return d.toLocaleString();
}
var StrengthChartsView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.selectedExercises = /* @__PURE__ */ new Set();
    this.metricMode = "weight";
    this.trendlineEnabled = false;
    this.trendlineType = "movingAverage";
    this.timeframePreset = "last180";
    this.customStartISO = "";
    this.customEndISO = "";
    this.exerciseSearchQuery = "";
    this.volumeDisplayUnit = "lbs";
    this.currentSvg = null;
    this.lastVisibleRows = [];
    this.plugin = plugin;
    this.loadStateFromSettings();
  }
  getViewType() {
    return VIEW_TYPE_STRENGTH_CHARTS;
  }
  getDisplayText() {
    return "Strength Charts";
  }
  async onOpen() {
    this.render();
  }
  getSelectionCap() {
    return this.plugin.settings.colorblindMode ? MAX_EXERCISES_COLORBLIND : MAX_EXERCISES_STANDARD;
  }
  loadStateFromSettings() {
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
  persistState() {
    const state = {
      selectedExercises: Array.from(this.selectedExercises),
      metricMode: this.metricMode,
      trendlineEnabled: this.trendlineEnabled,
      trendlineType: this.trendlineType,
      timeframePreset: this.timeframePreset,
      customStartISO: this.customStartISO,
      customEndISO: this.customEndISO,
      exerciseSearchQuery: this.exerciseSearchQuery,
      volumeDisplayUnit: this.volumeDisplayUnit
    };
    this.plugin.settings.chartViewState = state;
    void this.plugin.saveSettings();
  }
  enforceSelectionCap(showNotice) {
    const cap = this.getSelectionCap();
    if (this.selectedExercises.size <= cap)
      return;
    const trimmed = Array.from(this.selectedExercises).slice(0, cap);
    this.selectedExercises = new Set(trimmed);
    if (showNotice) {
      new import_obsidian2.Notice(
        this.plugin.settings.colorblindMode ? "Colorblind mode limits chart selection to 8 exercises for clearer line differentiation." : `You can plot at most ${cap} exercises.`
      );
    }
  }
  getDateRange() {
    if (this.timeframePreset === "all")
      return {};
    if (this.timeframePreset === "custom") {
      const startCandidate = this.customStartISO ? Date.parse(`${this.customStartISO}T00:00:00Z`) : void 0;
      const endCandidate = this.customEndISO ? Date.parse(`${this.customEndISO}T23:59:59Z`) : void 0;
      const start = Number.isFinite(startCandidate) ? startCandidate : void 0;
      const end = Number.isFinite(endCandidate) ? endCandidate : void 0;
      if (start !== void 0 && end !== void 0 && start > end)
        return { startMs: end, endMs: start };
      return { startMs: start, endMs: end };
    }
    const days = this.timeframePreset === "last30" ? 30 : this.timeframePreset === "last90" ? 90 : this.timeframePreset === "last180" ? 180 : 365;
    const now = /* @__PURE__ */ new Date();
    const utcStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return {
      startMs: utcStart - (days - 1) * DAY_MS,
      endMs: utcStart + DAY_MS - 1
    };
  }
  getMetricValue(entry, derived) {
    if (this.metricMode === "reps")
      return derived.totalReps;
    if (this.metricMode === "sets")
      return entry.sets;
    if (this.metricMode === "weight")
      return entry.weight_lbs;
    if (derived.volume_lbs === void 0)
      return void 0;
    return toVolumeDisplay(derived.volume_lbs, this.volumeDisplayUnit);
  }
  getSeriesStyle(index, totalSeries) {
    if (this.plugin.settings.colorblindMode) {
      return {
        color: COLORS[index % COLORS.length],
        dashArray: LINE_STYLES[index % LINE_STYLES.length]
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
      dashArray: LINE_STYLES[(shifted + 1) % LINE_STYLES.length]
    };
  }
  applyJitter(points) {
    const byDate = /* @__PURE__ */ new Map();
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
  async openSourceNote(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian2.TFile)) {
      new import_obsidian2.Notice(`Source note not found: ${path}`);
      return;
    }
    await this.app.workspace.getLeaf(true).openFile(file);
  }
  computeSummary(values) {
    if (!values.length)
      return {};
    const total = values.reduce((acc, x) => acc + x, 0);
    return {
      average: total / values.length,
      max: Math.max(...values),
      total
    };
  }
  async handleRefreshClick() {
    if (this.plugin.indexingStatus.isReindexing)
      return;
    try {
      await this.plugin.reindexAll();
      new import_obsidian2.Notice("Strength charts refreshed.");
    } catch (error) {
      new import_obsidian2.Notice("Refresh failed. See indexing status at the bottom.");
      console.error(error);
    }
  }
  csvEscape(value) {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  async handleCopyPng() {
    if (!this.currentSvg) {
      new import_obsidian2.Notice("No chart available to copy.");
      return;
    }
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(this.currentSvg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
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
      if (!ctx)
        throw new Error("Unable to prepare canvas.");
      ctx.fillStyle = getComputedStyle(this.containerEl).getPropertyValue("--background-primary").trim() || "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob)
            reject(new Error("Unable to create PNG."));
          else
            resolve(blob);
        }, "image/png");
      });
      const canWriteClipboard = typeof ClipboardItem !== "undefined" && !!navigator.clipboard && typeof navigator.clipboard.write === "function";
      if (canWriteClipboard) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
        new import_obsidian2.Notice("Chart PNG copied to clipboard.");
      } else {
        this.downloadBlob(pngBlob, "strength-chart.png");
        new import_obsidian2.Notice("Clipboard write unavailable. Downloaded PNG instead.");
      }
    } catch (error) {
      new import_obsidian2.Notice("Could not copy PNG.");
      console.error(error);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }
  handleExportCsv() {
    if (this.lastVisibleRows.length === 0) {
      new import_obsidian2.Notice("No visible chart data to export.");
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
      "plotted_metric"
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
          row.plotted_metric
        ].map((v) => this.csvEscape(v)).join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "-");
    this.downloadBlob(blob, `strength-chart-${stamp}.csv`);
    new import_obsidian2.Notice("Visible chart data exported to CSV.");
  }
  renderE1rmPanel(container, selected, series) {
    container.empty();
    container.addClass("stg-e1rm");
    const heading = container.createDiv({ cls: "stg-e1rm-heading", text: "Estimated 1RM (Visible Data)" });
    heading.createSpan({
      cls: "stg-e1rm-sub",
      text: "Latest = most recent visible workout. Max = highest visible estimate in the selected timeframe."
    });
    container.createDiv({
      cls: "stg-e1rm-notes",
      text: "Epley is often stable for moderate rep ranges. Brzycki is often favored for lower reps. Both are estimates, not direct test maxes."
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
      const latest = pts.length ? pts[pts.length - 1] : void 0;
      const maxEpley = pts.map((p) => p.derived.e1rmEpley_lbs).filter((v) => v !== void 0).reduce((acc, v) => acc === void 0 ? v : Math.max(acc, v), void 0);
      const maxBrzycki = pts.map((p) => p.derived.e1rmBrzycki_lbs).filter((v) => v !== void 0).reduce((acc, v) => acc === void 0 ? v : Math.max(acc, v), void 0);
      row.insertCell().setText(exercise);
      row.insertCell().setText(latest?.derived.e1rmEpley_lbs !== void 0 ? `${formatNumber(latest.derived.e1rmEpley_lbs, 1)} lb` : "n/a");
      row.insertCell().setText(maxEpley !== void 0 ? `${formatNumber(maxEpley, 1)} lb` : "n/a");
      row.insertCell().setText(latest?.derived.e1rmBrzycki_lbs !== void 0 ? `${formatNumber(latest.derived.e1rmBrzycki_lbs, 1)} lb` : "n/a");
      row.insertCell().setText(maxBrzycki !== void 0 ? `${formatNumber(maxBrzycki, 1)} lb` : "n/a");
    }
  }
  renderDiagnosticsPanel(container) {
    container.empty();
    container.addClass("stg-diagnostics");
    const status = this.plugin.indexingStatus;
    const top = container.createDiv({ cls: "stg-diag-line" });
    top.setText(
      status.isReindexing ? "Indexing in progress..." : `Last indexed: ${toLocalIsoString(status.lastIndexedAtISO)} | Scanned: ${status.notesScanned} | Included: ${status.notesIncluded} | Entries: ${status.entriesParsed}`
    );
    container.createDiv({
      cls: "stg-diag-line",
      text: `Skipped by filter: ${status.skippedByFilter} | Missing date: ${status.missingDate} | Invalid date: ${status.invalidDate}`
    });
    container.createDiv({
      cls: "stg-diag-line",
      text: `Field issues: invalid numbers ${status.invalidNumberFields} | unrecognized fields ${status.unrecognizedFields}`
    });
    if (status.lastRefreshError) {
      container.createDiv({ cls: "stg-diag-error", text: `Last refresh error: ${status.lastRefreshError}` });
    }
    const issues = status.recentIssues.slice(0, 12);
    if (issues.length > 0) {
      container.createDiv({ cls: "stg-diag-heading", text: "Recent Parse Issues" });
      const ul = container.createEl("ul", { cls: "stg-diag-list" });
      for (const issue of issues)
        ul.createEl("li", { text: issue });
    }
  }
  buildUi() {
    const root = this.contentEl;
    root.empty();
    root.addClass("stg-root");
    this.enforceSelectionCap(true);
    const selectionCap = this.getSelectionCap();
    const allExercises = this.plugin.index.getExerciseNames();
    for (const selected of Array.from(this.selectedExercises)) {
      if (!allExercises.includes(selected))
        this.selectedExercises.delete(selected);
    }
    const layoutEl = root.createDiv({ cls: "stg-layout" });
    const sidebarEl = layoutEl.createDiv({ cls: "stg-sidebar" });
    const mainEl = layoutEl.createDiv({ cls: "stg-main" });
    sidebarEl.createEl("h3", { text: "Exercises" });
    sidebarEl.createDiv({ cls: "stg-sidebar-count", text: `${this.selectedExercises.size}/${selectionCap} selected` });
    const searchEl = sidebarEl.createEl("input", {
      cls: "stg-search",
      type: "search",
      placeholder: "Search exercise"
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
        new import_obsidian2.Notice(`Selection cap is ${selectionCap}. Selected first ${selectionCap} exercises.`);
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
    const filtered = allExercises.filter(
      (name) => this.exerciseSearchQuery ? name.toLowerCase().includes(this.exerciseSearchQuery) : true
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
              new import_obsidian2.Notice(`Exercise limit reached (${selectionCap}).`);
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
    const metricOptions = [
      { value: "reps", label: "Reps" },
      { value: "sets", label: "Sets" },
      { value: "weight", label: "Weight" },
      { value: "volume", label: "Volume" }
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
      this.volumeDisplayUnit = unitSelect.value;
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
      text: this.plugin.indexingStatus.isReindexing ? "Refreshing..." : "Refresh Data"
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
  renderChart(chartEl, summaryEl, e1rmEl, diagnosticsEl, allExercises) {
    chartEl.empty();
    summaryEl.empty();
    this.currentSvg = null;
    this.lastVisibleRows = [];
    const selected = allExercises.filter((name) => this.selectedExercises.has(name));
    const { startMs, endMs } = this.getDateRange();
    const series = [];
    const visibleMetricValues = [];
    for (let i = 0; i < selected.length; i++) {
      const exerciseName = selected[i];
      const entries = this.plugin.index.getEntriesForExercise(exerciseName);
      const points = [];
      for (const entry of entries) {
        const xMs = parseISOToUtcMs(entry.dateISO);
        if (xMs === void 0)
          continue;
        if (startMs !== void 0 && xMs < startMs)
          continue;
        if (endMs !== void 0 && xMs > endMs)
          continue;
        const derived = computeDerived(entry);
        const y = this.getMetricValue(entry, derived);
        if (!Number.isFinite(y))
          continue;
        points.push({ xMs, plotXMs: xMs, y, entry, derived });
      }
      points.sort((a, b) => a.xMs - b.xMs);
      this.applyJitter(points);
      for (const p of points) {
        visibleMetricValues.push(p.y);
        const volumeDisplay = p.derived.volume_lbs !== void 0 ? toVolumeDisplay(p.derived.volume_lbs, this.volumeDisplayUnit) : void 0;
        this.lastVisibleRows.push({
          exercise: exerciseName,
          date: p.entry.dateISO,
          note: p.entry.sourceNotePath,
          weight_lbs: p.entry.weight_lbs !== void 0 ? String(p.entry.weight_lbs) : "",
          sets: p.entry.sets !== void 0 ? String(p.entry.sets) : "",
          reps_per_set: p.entry.reps_per_set !== void 0 ? String(p.entry.reps_per_set) : "",
          total_reps: p.derived.totalReps !== void 0 ? String(p.derived.totalReps) : "",
          volume_lbs: p.derived.volume_lbs !== void 0 ? String(p.derived.volume_lbs) : "",
          volume_display: volumeDisplay !== void 0 ? String(volumeDisplay) : "",
          e1rm_epley_lbs: p.derived.e1rmEpley_lbs !== void 0 ? String(p.derived.e1rmEpley_lbs) : "",
          e1rm_brzycki_lbs: p.derived.e1rmBrzycki_lbs !== void 0 ? String(p.derived.e1rmBrzycki_lbs) : "",
          plotted_metric: String(p.y)
        });
      }
      const style = this.getSeriesStyle(i, selected.length);
      const shouldDrawTrendline = this.trendlineEnabled && (this.metricMode === "weight" || this.metricMode === "volume");
      const trendlinePoints = shouldDrawTrendline ? this.trendlineType === "movingAverage" ? calculateMovingAverage(points, this.plugin.settings.movingAverageWindowDays) : calculateLinearRegression(points) : [];
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
      text: summary.average !== void 0 ? `${formatNumber(summary.average, 2)} ${unit}` : "n/a"
    });
    const max = summaryCards.createDiv({ cls: "stg-summary-card" });
    max.createDiv({ cls: "stg-summary-label", text: "Max" });
    max.createDiv({
      cls: "stg-summary-value",
      text: summary.max !== void 0 ? `${formatNumber(summary.max, 2)} ${unit}` : "n/a"
    });
    const total = summaryCards.createDiv({ cls: "stg-summary-card" });
    total.createDiv({ cls: "stg-summary-label", text: "Total" });
    total.createDiv({
      cls: "stg-summary-value",
      text: summary.total !== void 0 ? `${formatNumber(summary.total, 2)} ${unit}` : "n/a"
    });
    const legendEl = chartEl.createDiv({ cls: "stg-legend" });
    for (const s of series.filter((x) => x.points.length > 0)) {
      const item = legendEl.createDiv({ cls: "stg-legend-item" });
      const swatch = item.createDiv({ cls: "stg-legend-swatch" });
      swatch.style.borderColor = s.color;
      if (s.dashArray)
        swatch.style.borderStyle = "dashed";
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
    const xToPx = (x) => margin.left + (x - xStart) / (xEnd - xStart) * plotWidth;
    const yToPx = (y) => margin.top + (1 - (y - yFloor) / (yCeil - yFloor)) * plotHeight;
    const svg = createSvgEl("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width: "100%",
      height: String(height),
      role: "img",
      "aria-label": "Strength progression chart"
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
          "stroke-width": "1"
        })
      );
      const label = createSvgEl("text", {
        x: String(margin.left - 8),
        y: String(y + 4),
        "text-anchor": "end",
        "font-size": "11",
        fill: "var(--text-muted)"
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
          opacity: "0.4"
        })
      );
      const label = createSvgEl("text", {
        x: String(x),
        y: String(height - margin.bottom + 18),
        "text-anchor": "middle",
        "font-size": "11",
        fill: "var(--text-muted)"
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
        "stroke-width": "1.2"
      })
    );
    svg.appendChild(
      createSvgEl("line", {
        x1: String(margin.left),
        y1: String(margin.top),
        x2: String(margin.left),
        y2: String(height - margin.bottom),
        stroke: "var(--text-normal)",
        "stroke-width": "1.2"
      })
    );
    const tooltip = host.createDiv({ cls: "stg-tooltip" });
    tooltip.hide();
    for (const s of series) {
      if (s.points.length === 0)
        continue;
      const linePath = s.points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${xToPx(p.plotXMs).toFixed(2)} ${yToPx(p.y).toFixed(2)}`).join(" ");
      svg.appendChild(
        createSvgEl("path", {
          d: linePath,
          fill: "none",
          stroke: s.color,
          "stroke-width": "2",
          "stroke-dasharray": s.dashArray
        })
      );
      if (s.trendlinePoints.length >= 2) {
        const trendPath = s.trendlinePoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${xToPx(p.xMs).toFixed(2)} ${yToPx(p.y).toFixed(2)}`).join(" ");
        svg.appendChild(
          createSvgEl("path", {
            d: trendPath,
            fill: "none",
            stroke: s.color,
            "stroke-width": "1.5",
            "stroke-dasharray": "4 3",
            opacity: "0.65"
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
          cursor: "pointer"
        });
        circle.addEventListener("mouseenter", (evt) => {
          const volumeDisplayed = p.derived.volume_lbs !== void 0 ? toVolumeDisplay(p.derived.volume_lbs, this.volumeDisplayUnit) : void 0;
          tooltip.setText(
            [
              `${s.exerciseName}`,
              `Date: ${p.entry.dateISO}`,
              `Weight: ${p.entry.weight_lbs !== void 0 ? `${formatNumber(p.entry.weight_lbs, 1)} lb` : "n/a"}`,
              `Sets: ${p.entry.sets !== void 0 ? formatNumber(p.entry.sets, 0) : "n/a"}`,
              `Reps/set: ${p.entry.reps_per_set !== void 0 ? formatNumber(p.entry.reps_per_set, 0) : "n/a"}`,
              `Total reps: ${p.derived.totalReps !== void 0 ? formatNumber(p.derived.totalReps, 0) : "n/a"}`,
              `Volume: ${formatVolume(volumeDisplayed, this.volumeDisplayUnit)}`,
              `e1RM (Epley): ${p.derived.e1rmEpley_lbs !== void 0 ? `${formatNumber(p.derived.e1rmEpley_lbs, 1)} lb` : "n/a"}`,
              `e1RM (Brzycki): ${p.derived.e1rmBrzycki_lbs !== void 0 ? `${formatNumber(p.derived.e1rmBrzycki_lbs, 1)} lb` : "n/a"}`,
              `Note: ${p.entry.sourceNotePath}`
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
  render() {
    this.buildUi();
  }
};

// src/main.ts
var StrengthTrainingGraphsPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.index = new WorkoutIndex();
    this.indexingStatus = {
      isReindexing: false,
      notesScanned: 0,
      notesIncluded: 0,
      entriesParsed: 0,
      skippedByFilter: 0,
      missingDate: 0,
      invalidDate: 0,
      invalidNumberFields: 0,
      unrecognizedFields: 0,
      recentIssues: []
    };
    this.noteProcessRecords = /* @__PURE__ */ new Map();
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new StrengthTrainingGraphsSettingTab(this.app, this));
    this.registerView(VIEW_TYPE_STRENGTH_CHARTS, (leaf) => new StrengthChartsView(leaf, this));
    this.addRibbonIcon("activity", "Open Strength Charts", () => {
      void this.activateView();
    });
    this.addCommand({
      id: "open-strength-charts",
      name: "Open Strength Charts",
      callback: async () => {
        await this.activateView();
      }
    });
    await this.reindexAll();
    this.registerEvent(
      this.app.vault.on("create", async (file) => {
        if (file instanceof import_obsidian3.TFile && file.extension === "md")
          await this.reindexFile(file);
      })
    );
    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        if (file instanceof import_obsidian3.TFile && file.extension === "md")
          await this.reindexFile(file);
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", async (file) => {
        if (file instanceof import_obsidian3.TFile) {
          this.index.deleteNote(file.path);
          this.noteProcessRecords.delete(file.path);
          this.recomputeIndexingStatus();
        }
        this.refreshView();
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", async (file, oldPath) => {
        if (file instanceof import_obsidian3.TFile && file.extension === "md") {
          this.index.deleteNote(oldPath);
          this.noteProcessRecords.delete(oldPath);
          await this.reindexFile(file);
        }
      })
    );
  }
  async activateView() {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_STRENGTH_CHARTS, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  refreshView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_STRENGTH_CHARTS);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof StrengthChartsView)
        view.render();
    }
  }
  async reindexAll() {
    this.indexingStatus.isReindexing = true;
    this.indexingStatus.lastRefreshError = void 0;
    this.refreshView();
    try {
      this.index.clear();
      this.noteProcessRecords.clear();
      const files = this.app.vault.getMarkdownFiles();
      for (const file of files)
        await this.reindexFile(file, { refresh: false });
      this.indexingStatus.lastIndexedAtISO = (/* @__PURE__ */ new Date()).toISOString();
    } catch (error) {
      this.indexingStatus.lastRefreshError = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      this.indexingStatus.isReindexing = false;
      this.recomputeIndexingStatus();
      this.refreshView();
    }
  }
  async reindexFile(file, opts = {}) {
    const refresh = opts.refresh ?? true;
    const inclusion = evaluateNoteInclusion(file, this.app.metadataCache, this.settings);
    if (!inclusion.include) {
      this.index.deleteNote(file.path);
      this.noteProcessRecords.set(file.path, {
        included: false,
        entriesParsed: 0,
        skipReason: inclusion.skipReason,
        invalidNumberCount: 0,
        unrecognizedCount: 0,
        issues: []
      });
      this.indexingStatus.lastIndexedAtISO = (/* @__PURE__ */ new Date()).toISOString();
      this.recomputeIndexingStatus();
      if (refresh)
        this.refreshView();
      return;
    }
    const { entries, diagnostics } = extractEntriesForFileWithDiagnostics(file, this.app.metadataCache, this.settings);
    const issues = [
      ...diagnostics.invalidNumberFields.map((field) => `${file.path}: invalid number in "${field}"`),
      ...diagnostics.unrecognizedFields.map((field) => `${file.path}: unrecognized field "${field}"`)
    ];
    this.noteProcessRecords.set(file.path, {
      included: true,
      entriesParsed: entries.length,
      invalidNumberCount: diagnostics.invalidNumberFields.length,
      unrecognizedCount: diagnostics.unrecognizedFields.length,
      issues
    });
    this.index.upsertNote(file.path, entries);
    this.indexingStatus.lastIndexedAtISO = (/* @__PURE__ */ new Date()).toISOString();
    this.recomputeIndexingStatus();
    if (refresh)
      this.refreshView();
  }
  recomputeIndexingStatus() {
    let notesIncluded = 0;
    let entriesParsed = 0;
    let skippedByFilter = 0;
    let missingDate = 0;
    let invalidDate = 0;
    let invalidNumberFields = 0;
    let unrecognizedFields = 0;
    const recentIssues = [];
    for (const record of this.noteProcessRecords.values()) {
      if (record.included)
        notesIncluded++;
      else if (record.skipReason === "missing-date")
        missingDate++;
      else if (record.skipReason === "invalid-date")
        invalidDate++;
      else
        skippedByFilter++;
      entriesParsed += record.entriesParsed;
      invalidNumberFields += record.invalidNumberCount;
      unrecognizedFields += record.unrecognizedCount;
      for (const issue of record.issues) {
        if (recentIssues.length >= 30)
          break;
        recentIssues.push(issue);
      }
    }
    this.indexingStatus.notesScanned = this.noteProcessRecords.size;
    this.indexingStatus.notesIncluded = notesIncluded;
    this.indexingStatus.entriesParsed = entriesParsed;
    this.indexingStatus.skippedByFilter = skippedByFilter;
    this.indexingStatus.missingDate = missingDate;
    this.indexingStatus.invalidDate = invalidDate;
    this.indexingStatus.invalidNumberFields = invalidNumberFields;
    this.indexingStatus.unrecognizedFields = unrecognizedFields;
    this.indexingStatus.recentIssues = recentIssues;
  }
  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded ?? {},
      chartViewState: {
        ...DEFAULT_SETTINGS.chartViewState,
        ...loaded?.chartViewState ?? {}
      }
    };
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
