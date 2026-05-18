# GuiMintLab Studio

Visual editor for GuiMintLab UI projects. React + TypeScript + Vite.

Studio operates on the canonical IR defined in
`src/ui-ir/`.
There is **no separate editor model**: the editor store is a direct view
over the `UiProject → ScreenNode → WidgetNode` tree.

## What lives here

FSD-inspired layout. Dependency direction is `app → pages → widgets → entities → shared`.

- `src/app/` — root composition (providers, view switching, global styles).
- `src/pages/library/` — project library screen (cards, create/edit/delete modals).
- `src/pages/editor/` — editor screen shell + keyboard shortcuts.
- `src/widgets/tree-panel/` — widget tree panel.
- `src/widgets/canvas-workspace/` — canvas workspace + preview renderer (rulers, selection overlay, pure geometry helpers).
- `src/widgets/properties-panel/` — property inspector (per-type groups + shared inspector controls).
- `src/widgets/export-panel/` — IR export + C codegen UI.
- `src/entities/ui-project/` — canonical IR (`schema`, `types`, `validate`, `defaults`, `ids`), Zustand store (`model/store`), tree ops (`model/tree-ops`), undo/redo (`model/history`), shared layout semantics (`lib/layoutEngine`, `lib/color`), starter projects (`samples/`).
- `src/entities/icon/` — icon library + sizing helpers.
- `src/entities/font/` — bitmap font library + `BitmapText` renderer.
- `src/shared/ui/` — generic UI primitives (IconButton, CustomSelect, DraftNumberInput).
- `src/shared/config/` — display presets and other configuration data.
- `src/shared/assets/` — logo, font sources.

Imports use `@app`, `@pages`, `@widgets`, `@entities`, `@shared` aliases — see `vite.config.ts` and `tsconfig.json`.

## Commands

```bash
npm install
npm run dev        # starts Vite dev server on http://localhost:5173
npm run build      # production build
npm run codegen    # regenerates C from the active sample project
```

## Boundaries

Studio must NOT:

- Own its own layer/element model.
- Emit raw draw calls — codegen lives in `guimintlab-core`.
- Know about SPI/DMA/ESP-IDF.

Studio MUST:

- Speak IR only.
- Round-trip any project it opens without losing ids.
- Share layout semantics with the runtime (any divergence is a bug).

See [`guimintlab-core/docs/boundaries.md`](../guimintlab-core/docs/boundaries.md).
