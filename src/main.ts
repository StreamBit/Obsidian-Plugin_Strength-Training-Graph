import { Plugin, TFile } from "obsidian";
import { StrengthTrainingGraphsSettingTab, DEFAULT_SETTINGS } from "./settings";
import {
  WorkoutIndex,
  evaluateNoteInclusion,
  extractEntriesForFileWithDiagnostics,
  type NoteSkipReason,
} from "./index";
import { StrengthChartsView, VIEW_TYPE_STRENGTH_CHARTS } from "./view";
import type { IndexingStatus, PluginSettings } from "./types";

interface NoteProcessRecord {
  included: boolean;
  entriesParsed: number;
  skipReason?: NoteSkipReason;
  invalidNumberCount: number;
  unrecognizedCount: number;
  issues: string[];
}

export default class StrengthTrainingGraphsPlugin extends Plugin {
  settings: PluginSettings;
  index: WorkoutIndex = new WorkoutIndex();
  indexingStatus: IndexingStatus = {
    isReindexing: false,
    notesScanned: 0,
    notesIncluded: 0,
    entriesParsed: 0,
    skippedByFilter: 0,
    missingDate: 0,
    invalidDate: 0,
    invalidNumberFields: 0,
    unrecognizedFields: 0,
    recentIssues: [],
  };
  private noteProcessRecords = new Map<string, NoteProcessRecord>();

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
      },
    });

    await this.reindexAll();

    this.registerEvent(
      this.app.vault.on("create", async (file) => {
        if (file instanceof TFile && file.extension === "md") await this.reindexFile(file);
      })
    );
    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        if (file instanceof TFile && file.extension === "md") await this.reindexFile(file);
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", async (file) => {
        if (file instanceof TFile) {
          this.index.deleteNote(file.path);
          this.noteProcessRecords.delete(file.path);
          this.recomputeIndexingStatus();
        }
        this.refreshView();
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", async (file, oldPath) => {
        if (file instanceof TFile && file.extension === "md") {
          this.index.deleteNote(oldPath);
          this.noteProcessRecords.delete(oldPath);
          await this.reindexFile(file);
        }
      })
    );
  }

  async activateView(): Promise<void> {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_STRENGTH_CHARTS, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  refreshView(): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_STRENGTH_CHARTS);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof StrengthChartsView) view.render();
    }
  }

  async reindexAll(): Promise<void> {
    this.indexingStatus.isReindexing = true;
    this.indexingStatus.lastRefreshError = undefined;
    this.refreshView();
    try {
      this.index.clear();
      this.noteProcessRecords.clear();
      const files = this.app.vault.getMarkdownFiles();
      for (const file of files) await this.reindexFile(file, { refresh: false });
      this.indexingStatus.lastIndexedAtISO = new Date().toISOString();
    } catch (error) {
      this.indexingStatus.lastRefreshError = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      this.indexingStatus.isReindexing = false;
      this.recomputeIndexingStatus();
      this.refreshView();
    }
  }

  async reindexFile(file: TFile, opts: { refresh?: boolean } = {}): Promise<void> {
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
        issues: [],
      });
      this.indexingStatus.lastIndexedAtISO = new Date().toISOString();
      this.recomputeIndexingStatus();
      if (refresh) this.refreshView();
      return;
    }

    const { entries, diagnostics } = extractEntriesForFileWithDiagnostics(file, this.app.metadataCache, this.settings);
    const issues = [
      ...diagnostics.invalidNumberFields.map((field) => `${file.path}: invalid number in "${field}"`),
      ...diagnostics.unrecognizedFields.map((field) => `${file.path}: unrecognized field "${field}"`),
    ];

    this.noteProcessRecords.set(file.path, {
      included: true,
      entriesParsed: entries.length,
      invalidNumberCount: diagnostics.invalidNumberFields.length,
      unrecognizedCount: diagnostics.unrecognizedFields.length,
      issues,
    });

    this.index.upsertNote(file.path, entries);
    this.indexingStatus.lastIndexedAtISO = new Date().toISOString();
    this.recomputeIndexingStatus();
    if (refresh) this.refreshView();
  }

  private recomputeIndexingStatus(): void {
    let notesIncluded = 0;
    let entriesParsed = 0;
    let skippedByFilter = 0;
    let missingDate = 0;
    let invalidDate = 0;
    let invalidNumberFields = 0;
    let unrecognizedFields = 0;
    const recentIssues: string[] = [];

    for (const record of this.noteProcessRecords.values()) {
      if (record.included) notesIncluded++;
      else if (record.skipReason === "missing-date") missingDate++;
      else if (record.skipReason === "invalid-date") invalidDate++;
      else skippedByFilter++;

      entriesParsed += record.entriesParsed;
      invalidNumberFields += record.invalidNumberCount;
      unrecognizedFields += record.unrecognizedCount;
      for (const issue of record.issues) {
        if (recentIssues.length >= 30) break;
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
    const loaded = (await this.loadData()) as Partial<PluginSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(loaded ?? {}),
      chartViewState: {
        ...DEFAULT_SETTINGS.chartViewState,
        ...(loaded?.chartViewState ?? {}),
      },
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
