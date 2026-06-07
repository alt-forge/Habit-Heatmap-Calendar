import { Plugin, WorkspaceLeaf } from "obsidian";
import { HabitHeatmapView, HEATMAP_VIEW_TYPE } from "./view";

export interface HabitData {
  habits: string[];
  activeHabit: string | null;
  records: Record<string, Record<string, "done" | "skip">>;
}

const DEFAULT_DATA: HabitData = {
  habits: [],
  activeHabit: null,
  records: {},
};

export default class HabitHeatmapPlugin extends Plugin {
  data: HabitData = DEFAULT_DATA;

  async onload(): Promise<void> {
    console.log("[HabitHeatmap] Loading plugin — no vault notes will be created");

    await this.loadData();

    this.registerView(
      HEATMAP_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new HabitHeatmapView(leaf, this)
    );

    this.addRibbonIcon("calendar-check-2", "Habit Heatmap", async () => {
      await this.activateView();
    });

    this.addCommand({
      id: "open-habit-heatmap",
      name: "Open Habit Heatmap",
      callback: async () => {
        await this.activateView();
      },
    });

    if (this.app.workspace.layoutReady) {
      this.restoreView();
    } else {
      this.app.workspace.onLayoutReady(() => this.restoreView());
    }
  }

  onunload(): void {
    console.log("[HabitHeatmap] Unloading plugin");
    this.app.workspace.detachLeavesOfType(HEATMAP_VIEW_TYPE);
  }


  async loadData(): Promise<void> {
    const saved = await super.loadData();
    this.data = Object.assign({}, DEFAULT_DATA, saved ?? {});

    if (!this.data.habits) this.data.habits = [];
    if (!this.data.records) this.data.records = {};
    if (this.data.activeHabit && !this.data.habits.includes(this.data.activeHabit)) {
      this.data.activeHabit = this.data.habits[0] ?? null;
    }
  }


  async saveData(): Promise<void> {
    await super.saveData(this.data);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(HEATMAP_VIEW_TYPE)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      leaf = rightLeaf ?? workspace.getLeaf("tab");
      await leaf.setViewState({ type: HEATMAP_VIEW_TYPE, active: true });
    }

    workspace.revealLeaf(leaf);
  }

  private restoreView(): void {
    if (this.app.workspace.getLeavesOfType(HEATMAP_VIEW_TYPE).length === 0) {
    }
  }
}
