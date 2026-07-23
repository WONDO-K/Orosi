# Slice 2: editor, tables, Markdown, assets, and private search

## Scope

Make the local-first private-note editor complete without adding network, publishing, or ad behavior. Tiptap JSON remains canonical; Markdown is an import, export, and recoverable source-editing representation.

## Delivery order

1. Extend the note model with stable block IDs, asset references, recovery Markdown, and validation helpers. Add an additive database migration and repository ports; preserve existing account partitioning and Trash behavior.
2. Add the Tiptap schema and commands for underline, text color, task lists, image nodes, and tables. Keep frequently used controls near the keyboard and put uncommon table operations in a calm `+` menu.
3. Build mobile table controls: grid insertion, rows/columns, header cells, alignment, cell color, merge/split, equal width, fit content, and horizontal table scrolling. Parse valid spreadsheet clipboard input; preserve invalid rows as plain text.
4. Implement Markdown conversion: GFM for common content and Orosi HTML attributes for unsupported table features. On failed conversion, retain the last valid JSON and save the Markdown draft for recovery. Export UTF-8 Markdown and referenced assets.
5. Add an application-private asset service. Copy picked images before referencing them, record MIME/hash/dimensions, and guarantee a failed asset operation leaves note text intact.
6. Add tag editing and indexed local private search across title, derived text, and tags. Private queries and note content never leave the device.
7. Wire autosave/reopen recovery, undo/redo, save-error export, and accessible controls into the existing notes UI.
8. Add unit, repository, UI, and browser E2E coverage; include 1,000-note search/open fixtures and editor restart recovery. Run full quality and Android debug packaging.

## Required invariants

- Editing, private search, image insertion, and Markdown recovery work offline.
- Every addressable editor block has a stable ID.
- Failed Markdown or asset work never overwrites the last valid note document.
- Assets are copied into application-private storage; no external file URI is persisted as the canonical asset location.
- Tables preserve supported Orosi features through an Orosi Markdown round trip.
- Production source never imports test helpers or embeds operational ad credentials.

## Slice exit evidence

- Rich-table and Markdown round-trip tests pass.
- Restart recovery proves saved content and recoverable Markdown remain available.
- Asset failure preserves the text document.
- Local search and ordinary note-open fixtures meet the recorded acceptance budget.
- `npm run quality`, focused E2E, Capacitor synchronization, and Android debug packaging pass.
