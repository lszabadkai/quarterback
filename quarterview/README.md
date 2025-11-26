# QuarterView

QuarterView is a single-page quarterly planning surface for engineering managers. It combines a lightweight capacity estimator with a visual Gantt board so you can translate headcount into concrete commitments and publish the plan straight to GitHub Pages.

## Highlights

- **Quarter-aware Gantt** – renders 13-week swimlanes, highlights the current week, and filters projects via search.
- **Multi-quarter planning** – quarter selector auto-populates future quarters so you can slot work well ahead of time.
- **Capacity estimator** – models PTO, holidays, and reserve buffers to turn team size into available focus days.
- **Direct manipulation Gantt** – drag bars to shift projects or pull resize handles to stretch/compress the schedule inline.
- **Live timeline feedback** – get real-time start/end dates while dragging or resizing so you can line up milestones precisely.
- **JSON import/export** – roundtrip your entire workspace via one-click exports and guarded imports.
- **Unassigned TODO lane** – park projects without owners until you’re ready to place them on the timeline.
- **ICE scoring helper** – capture Impact/Confidence/Effort inputs per project and see the score before saving.
- **Team management** – rename members, add/remove seats, and keep assignments synced with the modal.
- **Regional PTO & roles** – assign teammates to region calendars and occupational focus rules for profile-aware capacity math.
- **Local persistence** – saves capacity settings, projects, and team data to `localStorage` for instant reloads.
- **Exports & sharing** – CSV + JSON exports plus one-click URL copying for quick sharing.
- **Vite + esbuild** – modern toolchain with esbuild minification and a Pages‑friendly base path for deployments.

## Getting Started

```bash
cd quarterview
npm install
npm run dev
```

The dev server runs on <http://localhost:5173> by default. Hot Module Replacement is enabled, so edits to any `src/` file will refresh automatically.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Produce a production build with esbuild minification in `dist/`. |
| `npm run preview` | Serve the built assets locally to sanity-check the deployment bundle. |
| `npm run deploy` | Build and push the `dist/` folder to the `gh-pages` branch via `gh-pages`. |

## Project Structure

```
quarterview/
├── index.html          # Vite entry with app mount point
├── vite.config.js      # Base path + esbuild settings
├── src/
│   ├── main.js         # Renders the PRD UI shell and boots the app
│   ├── app.js          # Core controller (storage, teams, projects, exports)
│   ├── gantt.js        # Timeline + swimlane renderer
│   ├── capacity.js     # Capacity math helpers
│   ├── storage.js      # LocalStorage wrapper
│   └── style.css       # PRD-styled layout and components
└── public/
    └── vite.svg        # Favicon served statically
```

## Deploying to GitHub Pages

1. Commit your changes and push the `main` branch to GitHub.
2. Run `npm run deploy`. This builds the app and publishes `dist/` to the `gh-pages` branch using the configured base path (`/quarterview/`).
3. In the repository settings, enable GitHub Pages and point it at the `gh-pages` branch.
4. (Optional) If your repository name or custom domain differs, set `VITE_BASE_PATH` before building (e.g., `VITE_BASE_PATH=/capacity/ npm run build`).

Once the Pages workflow finishes, your dashboard will be available at `https://<user>.github.io/quarterview/`.

## Regional PTO & Roles

- Use the **Regional PTO Calendars** panel in the capacity modal to define the number of PTO and holiday days for each geography. Regions can only be deleted once no teammates reference them.
- Configure **Occupational Focus Rules** to represent how much project time different roles typically reserve (e.g., 90% for leads, 70% for EMs). Input values are clamped between 10–200% to prevent obvious mistakes.
- Each teammate can now be assigned a region and a role. Capacity calculations automatically combine their regional PTO/holiday totals with the role’s focus percentage, resulting in per-person available days that roll up into the net capacity figure.
- Exports still include these settings via the JSON payload so you can re-import the exact configuration later.

## Timeline Tips

- Use the **quarter selector** in the header to jump multiple years ahead—the dropdown always includes the current quarter plus the next three years of planning windows.
- **Drag any project bar** to move the entire commitment left or right. The dates update instantly and the bar remains clamped within the visible quarter.
- **Resize via handles:** grab the left handle to move the start date or the right handle to adjust the end date. A live status pill mirrors the exact range, and changes persist immediately so the committed-days readout stays in sync.
- If you need to extend beyond the current quarter, switch to the next quarter, adjust, then flip back—the project list persists across all views.

## ICE Score Helpers

- Each project includes numeric inputs for **Impact**, **Confidence**, and **Effort** (1–10 scales). The live badge shows `(Impact × Confidence) ÷ Effort` as you type.
- ICE fields are persisted on every project, surfaced in exports, and shown throughout the UI (cards, tooltips, and data imports) so prioritization remains transparent.
- Because the score is stored alongside the project, importing previous plans rehydrates their exact ICE values without extra work.

## Importing Data

- Click the **Import** button in the header, choose a JSON file previously exported from QuarterView, and confirm. The app reloads your capacity settings, team roster, projects, and storage defaults in one go.
- Imports replace the current browser data, so export first if you need a backup before experimenting.
- After the import finishes, the UI refreshes automatically—no manual reload required.

## Unassigned TODOs

- Saving a project without any assignees automatically routes it to the **Unassigned Projects** panel beneath the Gantt.
- Projects in this lane do not consume capacity or appear on the timeline; they stay on deck until you click **Assign** to open the edit modal and attach owners.
- Once at least one teammate is assigned, the project leaves the TODO list and renders in its swimlane as usual.

## Data & Privacy

The app stores everything in the browser via `localStorage`. No project or capacity data leaves the device unless you export it manually.
