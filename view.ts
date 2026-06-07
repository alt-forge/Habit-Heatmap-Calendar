import { ItemView, WorkspaceLeaf } from "obsidian";
import type HabitHeatmapPlugin from "./main";

export const HEATMAP_VIEW_TYPE = "habit-heatmap-view";

type DayState = "none" | "done" | "skip";

const STATE_CYCLE: DayState[] = ["none", "done", "skip"];

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MIN_YEAR = 2025;
const MAX_YEAR = 2099;

export class HabitHeatmapView extends ItemView {
  private plugin: HabitHeatmapPlugin;
  private root: HTMLElement | null = null;

  private viewYear: number = new Date().getFullYear();

  constructor(leaf: WorkspaceLeaf, plugin: HabitHeatmapPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.viewYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, new Date().getFullYear()));
  }

  getViewType(): string { return HEATMAP_VIEW_TYPE; }
  getDisplayText(): string { return "Habit Heatmap"; }
  getIcon(): string { return "calendar-check-2"; }

  async onOpen(): Promise<void> {
    this.root = this.containerEl.children[1] as HTMLElement;
    this.root.empty();
    this.root.addClass("habit-heatmap-container");
    this.render();
  }

  async onClose(): Promise<void> {}


  render(): void {
    if (!this.root) return;
    this.root.empty();

    const data = this.plugin.data;
    const activeHabit = data.activeHabit;

    const header = this.root.createDiv({ cls: "habit-heatmap-header" });

    header.createEl("h2", { cls: "habit-heatmap-title", text: "Habit Heatmap" });

    const selectorWrap = header.createDiv({ cls: "habit-heatmap-habit-selector" });

    const select = selectorWrap.createEl("select", { cls: "habit-heatmap-select" });
    if (data.habits.length === 0) {
      const opt = select.createEl("option", { text: "— no habits yet —" });
      opt.disabled = true;
      opt.selected = true;
    } else {
      data.habits.forEach((h) => {
        const opt = select.createEl("option", { text: h, value: h });
        if (h === activeHabit) opt.selected = true;
      });
    }
    select.addEventListener("change", async () => {
      this.plugin.data.activeHabit = select.value;
      await this.plugin.saveData();
      this.render();
    });

    const addBtn = selectorWrap.createEl("button", {
      cls: "habit-heatmap-btn habit-heatmap-btn-primary",
      text: "+ Add habit",
    });
    addBtn.addEventListener("click", () => this.showAddHabitModal());

    if (activeHabit) {
      const delBtn = selectorWrap.createEl("button", {
        cls: "habit-heatmap-btn habit-heatmap-btn-danger",
        text: "Remove",
      });
      delBtn.addEventListener("click", () => this.confirmRemoveHabit(activeHabit));
    }

    if (!activeHabit || data.habits.length === 0) {
      const empty = this.root.createDiv({ cls: "habit-heatmap-empty" });
      empty.createDiv({ cls: "habit-heatmap-empty-icon", text: "📅" });
      empty.createEl("p", { text: "No habits yet. Add your first habit to get started." });
      const startBtn = empty.createEl("button", {
        cls: "habit-heatmap-btn habit-heatmap-btn-primary",
        text: "+ Add your first habit",
      });
      startBtn.addEventListener("click", () => this.showAddHabitModal());
      return;
    }

    this.renderYearNav();

    const stats = this.computeStats(activeHabit, this.viewYear);
    this.renderStats(stats);

    const monthsEl = this.root.createDiv({ cls: "habit-heatmap-months" });
    for (let m = 0; m < 12; m++) {
      this.renderMonth(monthsEl, this.viewYear, m, activeHabit);
    }

    this.renderLegend();
  }


  private renderYearNav(): void {
    const nav = this.root!.createDiv({ cls: "habit-heatmap-year-nav" });

    const prevBtn = nav.createEl("button", {
      cls: "habit-heatmap-btn habit-heatmap-nav-btn",
      text: "←",
    });
    prevBtn.setAttribute("aria-label", "Previous year");
    prevBtn.disabled = this.viewYear <= MIN_YEAR;
    prevBtn.addEventListener("click", () => {
      if (this.viewYear > MIN_YEAR) {
        this.viewYear--;
        this.render();
      }
    });

    const yearLabel = nav.createDiv({ cls: "habit-heatmap-year-label" });

    yearLabel.createSpan({ text: String(this.viewYear) });

    const currentYear = new Date().getFullYear();
    if (this.viewYear !== currentYear) {
      const todayBtn = yearLabel.createEl("button", {
        cls: "habit-heatmap-btn habit-heatmap-btn-ghost habit-heatmap-today-btn",
        text: "Today",
      });
      todayBtn.addEventListener("click", () => {
        this.viewYear = currentYear;
        this.render();
      });
    }

    const nextBtn = nav.createEl("button", {
      cls: "habit-heatmap-btn habit-heatmap-nav-btn",
      text: "→",
    });
    nextBtn.setAttribute("aria-label", "Next year");
    nextBtn.disabled = this.viewYear >= MAX_YEAR;
    nextBtn.addEventListener("click", () => {
      if (this.viewYear < MAX_YEAR) {
        this.viewYear++;
        this.render();
      }
    });
  }

  private computeStats(habit: string, year: number): {
    done: number; skip: number; streak: number; yearTotal: number;
  } {
    const records = this.plugin.data.records[habit] ?? {};

    let done = 0, skip = 0, yearTotal = 0;

    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const key = this.dateKey(year, m, d);
        yearTotal++;
        const state = records[key];
        if (state === "done") done++;
        else if (state === "skip") skip++;
      }
    }

    let streak = 0;
    const cur = new Date();
    while (true) {
      const key = this.dateKeyFromDate(cur);
      if (records[key] === "done") {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }

    return { done, skip, streak, yearTotal };
  }

  private renderStats(stats: { done: number; skip: number; streak: number; yearTotal: number }): void {
    const bar = this.root!.createDiv({ cls: "habit-heatmap-stats" });
    this.createStat(bar, String(stats.streak), "🔥 Streak", "accent");
    this.createStat(bar, String(stats.done), "Done", "green");
    this.createStat(bar, String(stats.skip), "Missed", "red");
    const pct = stats.done + stats.skip > 0
      ? Math.round((stats.done / (stats.done + stats.skip)) * 100)
      : 0;
    this.createStat(bar, pct + "%", "Success rate", "accent");
  }

  private createStat(parent: HTMLElement, value: string, label: string, colorCls: string): void {
    const wrap = parent.createDiv({ cls: "habit-heatmap-stat" });
    wrap.createDiv({ cls: `habit-heatmap-stat-value ${colorCls}`, text: value });
    wrap.createDiv({ cls: "habit-heatmap-stat-label", text: label });
  }

  private renderMonth(
    container: HTMLElement,
    year: number,
    month: number,
    habit: string
  ): void {
    const monthEl = container.createDiv({ cls: "habit-heatmap-month" });

    monthEl.createDiv({
      cls: "habit-heatmap-month-label",
      text: MONTH_NAMES[month],
    });

    const weekdayRow = monthEl.createDiv({ cls: "habit-heatmap-weekdays" });
    WEEKDAY_LABELS.forEach((d) => {
      weekdayRow.createDiv({ cls: "habit-heatmap-weekday", text: d });
    });

    const grid = monthEl.createDiv({ cls: "habit-heatmap-grid" });

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = this.todayKey();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Offset so week starts on Monday
    const offset = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) {
      grid.createDiv({ cls: "habit-heatmap-day-empty" });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = this.dateKey(year, month, d);
      const cellDate = new Date(year, month, d);
      cellDate.setHours(0, 0, 0, 0);
      const isFuture = cellDate > today;
      const isToday = key === todayKey;

      const records = this.plugin.data.records[habit] ?? {};
      const state: DayState = (records[key] as DayState) ?? "none";

      const cell = grid.createDiv({ cls: "habit-heatmap-day" });
      cell.setAttribute("data-state", state);
      cell.setAttribute("data-key", key);
      if (isToday) cell.addClass("is-today");
      if (isFuture) cell.addClass("is-future");

      const stateText = this.stateLabel(state);
      cell.setAttribute(
        "title",
        `${d} ${MONTH_NAMES[month]}${stateText ? " · " + stateText : ""}`
      );

      if (!isFuture) {
        cell.addEventListener("click", async () => {
          await this.toggleDayState(habit, key, cell);
        });
      }
    }
  }

  private async toggleDayState(
    habit: string,
    dateKey: string,
    cell: HTMLElement
  ): Promise<void> {
    const records = this.plugin.data.records;
    if (!records[habit]) records[habit] = {};

    const current: DayState = (records[habit][dateKey] as DayState) ?? "none";
    const nextState = STATE_CYCLE[(STATE_CYCLE.indexOf(current) + 1) % STATE_CYCLE.length];

    if (nextState === "none") {
      delete records[habit][dateKey];
    } else {
      records[habit][dateKey] = nextState;
    }

    await this.plugin.saveData();

    cell.setAttribute("data-state", nextState);
    const baseTitle = cell.getAttribute("title")!.replace(/ · .*$/, "");
    const stateText = this.stateLabel(nextState);
    cell.setAttribute("title", baseTitle + (stateText ? " · " + stateText : ""));

    this.refreshStatsBar(habit);
  }

  private refreshStatsBar(habit: string): void {
    const statsEl = this.root?.querySelector(".habit-heatmap-stats");
    const months = this.root?.querySelector(".habit-heatmap-months");
    if (!statsEl || !months) return;

    const stats = this.computeStats(habit, this.viewYear);
    const bar = createDiv({ cls: "habit-heatmap-stats" });
    this.createStat(bar, String(stats.streak), "🔥 Streak", "accent");
    this.createStat(bar, String(stats.done), "Done", "green");
    this.createStat(bar, String(stats.skip), "Missed", "red");
    const pct = stats.done + stats.skip > 0
      ? Math.round((stats.done / (stats.done + stats.skip)) * 100)
      : 0;
    this.createStat(bar, pct + "%", "Success rate", "accent");

    statsEl.replaceWith(bar);
  }

  private renderLegend(): void {
    const legend = this.root!.createDiv({ cls: "habit-heatmap-legend" });
    const items = [
      { cls: "none", label: "Not tracked" },
      { cls: "done", label: "Done ✓" },
      { cls: "skip", label: "Missed ✗" },
    ];
    items.forEach(({ cls, label }) => {
      const item = legend.createDiv({ cls: "habit-heatmap-legend-item" });
      item.createDiv({ cls: `habit-heatmap-legend-dot ${cls}` });
      item.createSpan({ text: label });
    });
  }

  private showAddHabitModal(): void {
    const overlay = document.body.createDiv({ cls: "habit-heatmap-modal-overlay" });
    const modal = overlay.createDiv({ cls: "habit-heatmap-modal" });
    modal.createEl("h3", { text: "Add new habit" });

    const input = modal.createEl("input", {
      type: "text",
      placeholder: "e.g. Morning run, Read 20 pages…",
    });
    input.style.display = "block";

    const actions = modal.createDiv({ cls: "habit-heatmap-modal-actions" });

    actions.createEl("button", {
      cls: "habit-heatmap-btn habit-heatmap-btn-ghost",
      text: "Cancel",
    }).addEventListener("click", () => overlay.remove());

    const save = async () => {
      const name = input.value.trim();
      if (!name) return;
      if (this.plugin.data.habits.includes(name)) {
        input.style.borderColor = "var(--text-error, #e05252)";
        return;
      }
      this.plugin.data.habits.push(name);
      this.plugin.data.activeHabit = name;
      if (!this.plugin.data.records[name]) this.plugin.data.records[name] = {};
      await this.plugin.saveData();
      overlay.remove();
      this.render();
    };

    actions.createEl("button", {
      cls: "habit-heatmap-btn habit-heatmap-btn-primary",
      text: "Add",
    }).addEventListener("click", save);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") save();
      if (e.key === "Escape") overlay.remove();
    });

    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    setTimeout(() => input.focus(), 50);
  }


  private confirmRemoveHabit(habit: string): void {
    const overlay = document.body.createDiv({ cls: "habit-heatmap-modal-overlay" });
    const modal = overlay.createDiv({ cls: "habit-heatmap-modal" });

    modal.createEl("h3", { text: `Remove "${habit}"?` });
    modal.createEl("p", {
      text: "All recorded data for this habit will be deleted. This cannot be undone.",
    }).style.cssText = "font-size:0.875rem;color:var(--text-muted);margin:0 0 16px";

    const actions = modal.createDiv({ cls: "habit-heatmap-modal-actions" });

    actions.createEl("button", {
      cls: "habit-heatmap-btn habit-heatmap-btn-ghost",
      text: "Cancel",
    }).addEventListener("click", () => overlay.remove());

    actions.createEl("button", {
      cls: "habit-heatmap-btn habit-heatmap-btn-danger",
      text: "Delete",
    }).addEventListener("click", async () => {
      this.plugin.data.habits = this.plugin.data.habits.filter((h) => h !== habit);
      delete this.plugin.data.records[habit];
      this.plugin.data.activeHabit =
        this.plugin.data.habits[this.plugin.data.habits.length - 1] ?? null;
      await this.plugin.saveData();
      overlay.remove();
      this.render();
    });

    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  }

  private dateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  private dateKeyFromDate(d: Date): string {
    return this.dateKey(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private todayKey(): string {
    return this.dateKeyFromDate(new Date());
  }

  private stateLabel(state: DayState): string {
    if (state === "done") return "Done ✓";
    if (state === "skip") return "Missed ✗";
    return "";
  }
}
