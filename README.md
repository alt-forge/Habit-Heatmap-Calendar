# Habit Heatmap Calendar 📅

Track your daily habits at a glance. A clean, heatmap-style calendar for Obsidian that helps you stay consistent — no notes required.

## ✨ Features

- **Multiple habits** — Add as many as you want and switch between them
- **One-click tracking** — Click any day to cycle through: `Not tracked → Done → Missed`
- **Year-at-a-glance** — Full year heatmap with month grids
- **Streak counter** — See your current streak, total done, missed, and success rate
- **Year navigation** — Browse past years or jump back to today
- **Zero clutter** — All data stored in a single `data.json`, no vault notes created

## 🚀 How to use

1. Click the **calendar icon** in the ribbon or run the command *"Open Habit Heatmap"*
2. Click **+ Add habit** and give it a name
3. Select your habit from the dropdown
4. Click any day to toggle its state:

| Click | State |
|-------|-------|
| 1st click | ✅ Done |
| 2nd click | ❌ Missed |
| 3rd click | ⬜ Not tracked |

The stats bar updates instantly so you always know where you stand.

*Screenshots coming soon*

## 📦 Installation

### From BRAT (recommended for now)

1. Install the [BRAT](https://obsidian.md/plugins?id=obsidian-42-brat) plugin
2. Add `alt-forge/Habit-Heatmap-Calendar` to the list of beta plugins
3. Enable **Habit Heatmap Calendar** in Community Plugins

### Manual

1. Download the latest release from [GitHub](https://github.com/alt-forge/Habit-Heatmap-Calendar/releases)
2. Extract the folder into `.obsidian/plugins/`
3. Enable the plugin in Obsidian settings

## 💾 Data

All your habits and history live in:

```
.obsidian/plugins/habit-heatmap-calendar/data.json
```

It's plain JSON — easy to back up, sync, or edit.

## 📄 License

MIT
