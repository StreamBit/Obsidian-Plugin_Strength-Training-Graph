import { App, PluginSettingTab, Setting } from "obsidian";
import type StrengthTrainingGraphsPlugin from "./main";
import type { PluginSettings } from "./types";

export const DEFAULT_SETTINGS: PluginSettings = {
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
    volumeDisplayUnit: "lbs",
  },
};

export class StrengthTrainingGraphsSettingTab extends PluginSettingTab {
  plugin: StrengthTrainingGraphsPlugin;

  constructor(app: App, plugin: StrengthTrainingGraphsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Strength Training Graphs - Settings" });

    new Setting(containerEl)
      .setName("Source mode")
      .setDesc("Choose how workout notes are selected.")
      .addDropdown((dd) => {
        dd.addOption("folder", "Folder");
        dd.addOption("frontmatter", "Frontmatter match (property/value)");
        dd.setValue(this.plugin.settings.sourceMode);
        dd.onChange(async (v) => {
          this.plugin.settings.sourceMode = v as any;
          await this.plugin.saveSettings();
          await this.plugin.reindexAll();
          this.display();
        });
      });

    containerEl.createEl("h3", { text: "Folder mode" });
    new Setting(containerEl)
      .setName("Folder path")
      .setDesc("Folder containing training notes (relative to vault root).")
      .addText((t) => {
        t.setValue(this.plugin.settings.folderPath);
        t.onChange(async (v) => {
          this.plugin.settings.folderPath = v.trim();
          await this.plugin.saveSettings();
          await this.plugin.reindexAll();
        });
      });

    new Setting(containerEl)
      .setName("Include subfolders")
      .addToggle((tg) => {
        tg.setValue(this.plugin.settings.includeSubfolders);
        tg.onChange(async (v) => {
          this.plugin.settings.includeSubfolders = v;
          await this.plugin.saveSettings();
          await this.plugin.reindexAll();
        });
      });

    containerEl.createEl("h3", { text: "Frontmatter match mode" });
    new Setting(containerEl)
      .setName("Selector property name")
      .setDesc('Frontmatter key to match (e.g., "Note Type"). Case-insensitive.')
      .addText((t) => {
        t.setValue(this.plugin.settings.selectorPropertyName);
        t.onChange(async (v) => {
          this.plugin.settings.selectorPropertyName = v.trim();
          await this.plugin.saveSettings();
          await this.plugin.reindexAll();
        });
      });

    new Setting(containerEl)
      .setName("Selector property value")
      .setDesc('Required frontmatter value (e.g., "Training Entry").')
      .addText((t) => {
        t.setValue(this.plugin.settings.selectorPropertyValue);
        t.onChange(async (v) => {
          this.plugin.settings.selectorPropertyValue = v.trim();
          await this.plugin.saveSettings();
          await this.plugin.reindexAll();
        });
      });

    containerEl.createEl("h3", { text: "Field keys" });
    new Setting(containerEl)
      .setName("Date key")
      .setDesc('Frontmatter date key (e.g., "Date"). Required for note inclusion.')
      .addText((t) => {
        t.setValue(this.plugin.settings.dateKey);
        t.onChange(async (v) => {
          this.plugin.settings.dateKey = v.trim();
          await this.plugin.saveSettings();
          await this.plugin.reindexAll();
        });
      });

    containerEl.createEl("p", {
      text: "Input weight is assumed to be lbs unless the key indicates kg/kgs (Weight (kg) / Weight (kgs)). Volume display units are selected directly in the chart screen.",
    });

    containerEl.createEl("h3", { text: "Trendlines" });
    new Setting(containerEl)
      .setName("Default trendline type")
      .addDropdown((dd) => {
        dd.addOption("movingAverage", "Moving average");
        dd.addOption("linearRegression", "Linear regression");
        dd.setValue(this.plugin.settings.defaultTrendlineType);
        dd.onChange(async (v) => {
          this.plugin.settings.defaultTrendlineType = v as any;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Moving average window (days)")
      .setDesc("Used when moving average trendline is selected.")
      .addText((t) => {
        t.setValue(String(this.plugin.settings.movingAverageWindowDays));
        t.onChange(async (v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 1) return;
          this.plugin.settings.movingAverageWindowDays = Math.floor(n);
          await this.plugin.saveSettings();
        });
      });

    containerEl.createEl("p", {
      text: "Moving average smooths day-to-day noise and is useful for seeing short-term direction. Linear regression fits one best-fit line across the visible range and is useful for seeing the overall slope.",
    });

    containerEl.createEl("h3", { text: "Accessibility" });
    new Setting(containerEl)
      .setName("Colorblind mode")
      .setDesc("Uses stronger style separation for readability. To preserve clear line differentiation, chart selection cap is reduced to 8 exercises while enabled.")
      .addToggle((tg) => {
        tg.setValue(this.plugin.settings.colorblindMode);
        tg.onChange(async (v) => {
          this.plugin.settings.colorblindMode = v;
          await this.plugin.saveSettings();
          this.plugin.refreshView();
        });
      });
  }
}
