# TaskForge OS — Build Spec for an AI Artifact

> **How to use this file:** Paste this whole document into an AI tool (Claude, ChatGPT, etc.) and say:
> *"Build this app as a single-file React artifact. Every feature in the spec must actually work."*
>
> **Source note:** The live sites (taskforge-os.app, taskforge-os.netlify.app) could not be opened from the
> environment that wrote this spec, so it was not written by looking at them. The confirmed facts are the name, the
> tagline *"Personal Work Operating System"*, that the UI is in **Italian**, that it works **offline and keeps all
> data on the device**, and that it covers **projects, tasks, time and finances**. Everything else (screens, layout,
> colors, fields) is a reasonable design built around those facts. If you have screenshots of the real app, attach
> them with this file and tell the AI that the screenshots win wherever they disagree with this spec.

---

## 1. Product summary

**TaskForge OS — Personal Work Operating System.** A single workspace where a freelancer or solo professional runs their
work: **projects**, the **tasks** inside them, **time** spent on them, and the **money** they bring in or cost.
It runs entirely in the browser. No account, no server, and all data stays in the browser's storage.

- **Language:** all UI text is in Italian (labels listed below).
- **Data:** persisted to `localStorage` under one key (`taskforge-os-v1`), with JSON export and import.
- **Offline-first:** no network calls, no external APIs. Everything works with Wi-Fi off.

## 2. Technical requirements (for the artifact)

- A single React component (default export), using hooks only. Tailwind utility classes for styling.
- Icons: `lucide-react`. Charts: `recharts`. No other dependencies.
- State: one `useReducer` store holding the whole data model (§4), saved to `localStorage` on every change
  (wrap reads/writes in `try/catch`; if storage is unavailable, keep working in memory).
- **Seed data** (§9) loads on first run so the app looks alive. A "Ripristina dati demo" button reloads it.
- IDs: `crypto.randomUUID()` with a fallback to `Date.now()+Math.random()`.
- Dates are stored as ISO strings. Display them in Italian format (`dd/mm/yyyy`, `toLocaleDateString('it-IT')`).
  Currency is EUR (`Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'})`).
- Responsive: the sidebar collapses into a bottom tab bar under 768px.

## 3. Layout and visual design

**Overall feel:** a calm, dense "operating system" dashboard, close to Linear or Notion in dark mode. Rounded cards,
thin borders, a single accent color, and no heavy shadows.

| Token | Dark (default) | Light |
|---|---|---|
| Background | `#0B0D12` | `#F7F8FA` |
| Surface / card | `#13161D` | `#FFFFFF` |
| Border | `#232733` | `#E4E7EC` |
| Text primary | `#E8EAF0` | `#111827` |
| Text muted | `#8A90A2` | `#6B7280` |
| Accent (forge orange) | `#F97316` | `#EA580C` |
| Success | `#22C55E` | `#16A34A` |
| Warning | `#EAB308` | `#CA8A04` |
| Danger | `#EF4444` | `#DC2626` |
| Info | `#3B82F6` | `#2563EB` |

- **Font:** Inter (fallback `system-ui`). Numbers use `font-variant-numeric: tabular-nums`.
- **Radius:** 12px for cards, 8px for inputs and buttons. **Spacing:** an 8px grid.
- **Shell:**
  - **Left sidebar (240px):** logo (an anvil/hammer icon plus "TaskForge **OS**", with "OS" in the accent color),
    then the nav items with icons, then the running-timer widget pinned to the bottom (§5.5).
  - **Top bar:** the page title, a global search input ("Cerca… ⌘K"), the "+ Nuovo" quick-add dropdown
    (Progetto / Attività / Movimento) and a light/dark theme toggle.
  - **Content:** max-width 1280px, padded 24px.
- **Status colors:**
  - Projects: *Attivo* = accent, *In pausa* = warning, *Completato* = success, *Archiviato* = muted.
  - Task priority: *Alta* = danger, *Media* = warning, *Bassa* = info.
- **Empty states:** an icon, one Italian sentence and a primary button (e.g. "Nessuna attività. Crea la prima").
- **Toasts:** bottom-right, auto-dismiss after 3 seconds (e.g. "Attività creata", "Dati esportati").
- **Modals:** centered, close on Esc or a backdrop click, with Annulla / Salva buttons.

## 4. Data model

```ts
Project   { id, nome, cliente, descrizione, colore, stato: 'attivo'|'in_pausa'|'completato'|'archiviato',
            budget: number /*EUR*/, tariffaOraria: number /*EUR/h*/, scadenza?: ISO, creatoIl: ISO }
Task      { id, progettoId?: string, titolo, descrizione, stato: 'da_fare'|'in_corso'|'revisione'|'fatto',
            priorita: 'alta'|'media'|'bassa', scadenza?: ISO, tag: string[], sottoattivita: {id,testo,fatto}[],
            stimaOre?: number, creatoIl: ISO, completatoIl?: ISO }
TimeEntry { id, progettoId?: string, taskId?: string, nota, inizio: ISO, fine: ISO, fatturabile: boolean }
Transaction { id, tipo: 'entrata'|'uscita', importo: number, categoria, descrizione, data: ISO,
              progettoId?: string, stato: 'pagato'|'in_attesa' }
Settings  { tema: 'scuro'|'chiaro', nomeUtente, valuta: 'EUR', obiettivoOreSettimana: number,
            obiettivoEntrateMese: number }
ActiveTimer { progettoId?, taskId?, nota, inizio: ISO } | null
```

## 5. Screens and features (every item must work)

Sidebar navigation, in this order: **Dashboard, Progetti, Attività, Calendario, Tempo, Finanze, Report, Impostazioni.**

### 5.1 Dashboard (`Dashboard`)
- Greeting: "Buongiorno/Buon pomeriggio/Buonasera, {nomeUtente}" (based on the hour) plus today's date in Italian.
- **4 KPI cards:**
  - "Attività aperte" (count of tasks that aren't done)
  - "Ore questa settimana" (from time entries, with a progress bar toward `obiettivoOreSettimana`)
  - "Entrate del mese" (with a progress bar toward `obiettivoEntrateMese`)
  - "Saldo del mese" (income minus expenses; green if positive, red if negative)
- **"Oggi" list:** tasks due today or overdue (overdue ones shown in red with "Scaduta"), each with a checkbox that
  completes the task.
- **"Progetti attivi":** cards showing the project color dot, name, client, task progress % (done/total) and the
  budget used (time × rate + project expenses vs budget).
- **"Ore ultimi 7 giorni":** a recharts bar chart.
- **"Attività recenti":** a feed of the last 8 events (task created/completed, time logged, transaction added).

### 5.2 Projects (`Progetti`)
- A grid of project cards, with a toggle to a table view. Filter chips: Tutti / Attivi / In pausa / Completati /
  Archiviati. Search by name or client.
- "+ Nuovo progetto" opens a modal: nome, cliente, descrizione, colore (8 swatches), stato, budget, tariffa oraria,
  scadenza.
- Each card's ⋯ menu offers: Modifica, Archivia, Elimina (with a confirm dialog that also asks whether to delete the
  related tasks).
- **Project detail** (opens when a card is clicked), with tabs:
  - **Panoramica:** stats for ore totali, valore (ore × tariffa), entrate, uscite, margine, and % budget.
  - **Attività:** a filtered kanban (same as §5.3).
  - **Tempo:** the time entries for this project.
  - **Finanze:** this project's transactions.
  - A back button returns to the list.

### 5.3 Tasks (`Attività`)
- **View switcher:** *Kanban* | *Lista*.
- **Kanban:** 4 columns: Da fare · In corso · Revisione · Fatto. Each column shows a count. Cards can be moved by
  **HTML5 drag-and-drop** between columns (this changes the status; moving to "Fatto" sets `completatoIl`). Each
  card shows the title, project color and name, a priority badge, the due date, tags and subtask progress ("2/5").
- **List:** a sortable table (titolo, progetto, priorità, scadenza, stato) with checkboxes to complete tasks.
- **Filters:** progetto, priorità, tag, plus a "Nascondi completate" toggle. Search by title.
- **Quick add:** an input at the top of each column / list ("Aggiungi attività…" then Enter).
- **Task detail drawer** (slides in from the right): edit every field, a subtask checklist (add, toggle, delete), and
  a "▶ Avvia timer" button that starts the global timer for this task. Delete is also here.

### 5.4 Calendar (`Calendario`)
- A month grid (Mon–Sun, with Italian day names "Lun Mar Mer Gio Ven Sab Dom"), with ‹ › navigation and an "Oggi"
  button.
- Each day shows its due tasks as colored pills (the project color) and the hours logged as a small badge.
- Clicking a day opens a side panel listing that day's tasks and time entries, with "+ Attività per questo giorno".
- Dragging a task pill onto another day changes its due date.

### 5.5 Time (`Tempo`)
- **Global timer:**
  - Pick a project and task (optional) and a note, then press Start / Stop.
  - While running, the elapsed time `hh:mm:ss` ticks every second, and the timer also shows in the sidebar widget
    and the browser tab title ("⏱ 00:12:34 — TaskForge OS").
  - The timer survives a page reload, because `ActiveTimer.inizio` is persisted.
  - Stopping it creates a TimeEntry.
- **Manual entry:** a form with data, ora inizio, ora fine (or durata), progetto, attività, nota and fatturabile.
- **Log:** entries grouped by day with daily totals, plus edit and delete. Filters: settimana corrente / mese / tutto,
  and by progetto.
- **Weekly summary:** a stacked bar chart of hours per day by project, total ore, ore fatturabili and valore €.

### 5.6 Finances (`Finanze`)
- **Summary cards:** Entrate, Uscite, Saldo, "In attesa" (unpaid income), for the selected month (‹ month picker ›).
- **Transactions table:** data, descrizione, categoria, progetto, importo (green for income, red for expenses with a
  − sign) and a stato badge (Pagato / In attesa, which toggles on click). Edit and delete.
- **Add modal:** tipo (Entrata/Uscita as a segmented control), importo, categoria, descrizione, data, progetto and
  stato.
  - Income categories: *Fattura, Consulenza, Altro*.
  - Expense categories: *Software, Hardware, Tasse, Ufficio, Trasporti, Formazione, Altro*.
- **Charts:**
  - A donut of expenses by category.
  - A 6-month line or bar chart of entrate vs uscite.
- **"Genera da ore"** button: picks a project and a date range, sums the unbilled billable hours × rate, and creates
  an *Entrata / Fattura / In attesa* transaction.

### 5.7 Reports (`Report`)
- A period selector: Questa settimana / Questo mese / Ultimi 3 mesi / Anno.
- Panels:
  - Hours by project (a horizontal bar chart).
  - Tasks completed over time (a line chart).
  - Income by project (a table).
  - Productivity stats: tasks completed, average completion time in days, % on time.
- An "Esporta CSV" button for each panel, which downloads the file through a Blob plus an `<a download>` link.

### 5.8 Settings (`Impostazioni`)
- Nome utente, tema (Scuro/Chiaro), weekly hours goal and monthly income goal.
- **Dati:**
  - "Esporta backup (JSON)" downloads the full state.
  - "Importa backup" uses a file input and validates the shape before replacing the state, with a confirm step.
  - "Ripristina dati demo".
  - "Cancella tutti i dati" (with a double confirm).
- A footer line: "I tuoi dati restano sul tuo dispositivo. Nessun server, nessun account."

## 6. Global features
- **Command palette (⌘K / Ctrl+K):** a fuzzy search across projects, tasks and pages, plus actions ("Nuova attività",
  "Avvia timer", "Vai a Finanze", "Cambia tema"). Use arrow keys plus Enter.
- **Keyboard shortcuts:**
  - `N` adds a new task.
  - `T` starts or stops the timer.
  - `G` then `D/P/A/C/T/F/R/I` jumps to a page.
  - `Esc` closes the open modal or drawer.
  - Shortcuts are disabled while typing in an input.
- **Undo:** after deleting something, the toast shows "Annulla" for 5 seconds.
- **Overdue logic:** a task whose due date is before today and that isn't *fatto* is "Scaduta" and shows red
  everywhere.

## 7. Italian UI strings (use these exactly)
Dashboard · Progetti · Attività · Calendario · Tempo · Finanze · Report · Impostazioni · Nuovo · Salva · Annulla ·
Elimina · Modifica · Archivia · Cerca · Filtri · Oggi · Scaduta · Da fare · In corso · Revisione · Fatto · Alta ·
Media · Bassa · Entrata · Uscita · Saldo · Pagato · In attesa · Avvia timer · Ferma · Ore · Fatturabile · Esporta ·
Importa · Nessun elemento.

## 8. Acceptance checklist (the AI must verify each one)
1. Creating, editing and deleting projects, tasks, time entries and transactions each updates every screen right away.
2. Kanban drag-and-drop changes the status, and the Dashboard counts update.
3. The timer keeps running across navigation and a page reload, and stopping it creates an entry.
4. The Finance totals, the charts and the Dashboard KPIs all agree.
5. Export, then clearing the data, then import restores everything exactly.
6. The theme toggle restyles the whole app and is remembered.
7. ⌘K opens the palette, and every action in it works.
8. The app is usable at 375px width with no horizontal scroll.

## 9. Seed data
- **User:** "Marco".
- **Projects:**
  - "Sito Web Rossi Srl" (client Rossi Srl, €3.000 budget, €45/h, attivo, orange)
  - "App Mobile FitLife" (FitLife, €8.000, €55/h, attivo, blue)
  - "Branding Caffè Aurora" (Caffè Aurora, €1.500, €40/h, in pausa, green)
  - "Consulenza SEO" (Studio Bianchi, €1.200, €50/h, completato, purple)
- **Tasks:** about 14 spread across all four statuses and three priorities, including 2 overdue and 2 due today.
  Examples: "Wireframe homepage", "Integrare API pagamenti", "Revisione logo", "Scrivere copy pagina Chi siamo",
  "Test su iOS".
- **Time entries:** about 20 over the past 14 days, between 0.5h and 4h each.
- **Transactions:** about 15 over the past 3 months.
  - Income: invoices of €600–€2.000, two of them *in attesa*.
  - Expenses: Software €29 Figma, Hardware €120, Tasse €450, Ufficio €80, etc.
