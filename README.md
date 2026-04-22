# GuiMintLab Studio

Visual editor for GuiMintLab UI projects. React + TypeScript + Vite.

Studio operates on the canonical IR defined in
[`guimintlab-core/packages/ui-ir`](../guimintlab-core/packages/ui-ir).
There is **no separate editor model**: the editor store is a direct view
over the `UiProject → ScreenNode → WidgetNode` tree.

## What lives here

- `src/store/` — Zustand store over IR (tree-first, stable ids).
- `src/features/tree/` — widget tree panel.
- `src/features/canvas/` — canvas workspace + preview renderer.
- `src/features/properties/` — property inspector.
- `src/features/export/` — IR export + C codegen UI.
- `src/layout/` — shared layout semantics (mirrors runtime v1).
- `src/samples/` — starter projects.

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
