# Orosi MVP Product Design

- Status: Approved product design
- Date: 2026-07-22
- Product: Orosi mobile memory-note app
- Platforms: iPhone and Android

## 1. Product Summary

Orosi is a general-purpose personal memory-note app. Its central promise is:

> Bring in what helps, shape it into your own, and remember it your way.

Users create private notes, optionally publish a sanitized snapshot, discover public notes by keyword and tag, and import an entire note, paragraph, or sentence into an independently editable personal copy. Imported material retains provenance, but it never remains linked to later source edits.

The product is not tied to a particular examination or certification. Reading, writing, organizing, tables, and selective reuse are the MVP. Quiz and recall modes may be added later without changing the core note model.

## 2. Design Principles

1. **Personal first.** A note belongs to its author and is private by default.
2. **Local first.** Editing never waits for the network; the device copy is written first.
3. **Reuse without lock-in.** Imported content becomes an independent copy with durable attribution.
4. **Tables are first-class.** Mobile table creation and editing must be easier than hand-writing Markdown tables.
5. **Explicit publishing.** Private work and public snapshots are separate data products.
6. **Quiet monetization.** Ads are rare, clearly labeled, and excluded from focused workflows.
7. **No silent data loss.** Failed saves, sync conflicts, Markdown conversion failures, and partial imports preserve recoverable data.

## 3. Goals and Non-goals

### MVP goals

- Require account authentication before accessing the app.
- Create, edit, search, tag, trash, restore, and permanently delete private notes.
- Support rich text, images, easy tables, and Markdown source/import/export.
- Open and edit existing local notes without a network connection.
- Synchronize private notes across devices through Supabase.
- Publish and unpublish explicit public snapshots.
- Search public notes by keyword and tag.
- Import a whole note, paragraph, or sentence into a new or existing note.
- Preserve provenance and permit attributed derivative republication.
- Provide reporting, blocking, moderation, and operator contact paths.
- Show low-frequency native ads only in public discovery/search lists.
- Produce Android packaging evidence and an iOS project with a macOS verification checklist.

### MVP non-goals

- Exam-specific templates or certification catalogs
- Flashcards, quizzes, spaced repetition, or AI-generated summaries
- Author following, public profile search, comments, direct messages, or collaboration
- Real-time CRDT synchronization
- End-to-end encrypted vaults
- Web or desktop distribution as a consumer product
- Premium billing or an ad-free purchase
- Actual App Store or Google Play submission
- Production ad activation

These non-goals must not be hard-coded into the domain model in a way that prevents later expansion.

## 4. Brand System

- Product name: **Orosi**
- Wordmark: lowercase `orosi`
- Meaning: a note may begin elsewhere, but becomes wholly the user's own perspective
- English line: **Remember it your way.**
- Korean line: **필요한 부분만 가져와, 내 방식으로 기억하세요.**
- Character: calm, friendly, trustworthy, personal
- Logo symbol: two rounded note surfaces overlap while one small fragment moves from one note into the other; no utilitarian arrow
- Typography: Manrope for Latin brand display, Pretendard for Korean and application UI
- Primary sage: `#42695B`
- Warm ivory background: `#F7F4EE`
- Deep ink text: `#26332E`
- Apricot accent: `#E6A477`
- Public-state mint: `#DDEAE4`

The icon uses a sage field, ivory note surfaces, and a single apricot transferred fragment. UI copy uses short, gentle Korean honorifics and avoids exam-pressure language.

## 5. Information Architecture

### Authentication gate

The authentication gate is always evaluated before the application shell. A first installation requires an online login. A previously authenticated device may unlock offline while a valid cached secure session exists; this is still authenticated access, not guest mode. A session rejected as revoked or invalid requires online reauthentication.

- Android primary provider: Google
- iOS providers: Google and Sign in with Apple
- Email/password and guest mode are excluded from the MVP

### Main navigation

The mobile shell has three bottom tabs:

1. **My Notes**: default tab, private note creation, local search, tags, sorting, sync state, and a Trash filter
2. **Discover**: public keyword/tag search, reading, reporting, blocking, and importing
3. **Settings**: account, synchronization, privacy, blocked authors, contact, terms, and account deletion

The private editor and public reader open as full-screen routes above the tab shell.

### Primary user flows

#### Create and edit

1. Open My Notes.
2. Create a note, which is private by default.
3. Edit rich content or switch to Markdown source mode.
4. Save immediately to the local database.
5. Synchronize later without blocking the editor.

#### Publish

1. Open a private note and choose Publish.
2. Review the sanitized public preview.
3. Provide a required title and zero to ten tags.
4. Accept the public reuse terms when first publishing or when those terms change.
5. Create a public snapshot.
6. Later private edits do not change that snapshot until Update Publication is explicitly chosen.

#### Discover and import

1. Search public notes by keyword or tag.
2. Open a public note.
3. Choose the entire note, one or more paragraphs, or a text sentence selection.
4. Choose a new note or an existing destination note.
5. Copy content and supported assets into a single local transaction.
6. Attach provenance outside the editable content document.
7. Edit freely; republishing displays mandatory source attribution.

#### Unpublish

Unpublishing immediately removes the current publication from discovery. Existing imported copies remain. Their attribution resolves to an unavailable-source tombstone if the source content can no longer be displayed.

#### Delete and restore

Deleting a private note moves it to Trash and synchronizes a tombstone. A note can be restored for 30 days. Permanent Delete removes its local content after confirmation and queues remote deletion; ordinary trashed notes are permanently purged after the 30-day window once deletion has synchronized. Account deletion follows the separate account-wide process in section 12.

## 6. Editor and Content Model

### Canonical format

Tiptap JSON is the canonical note representation. Every addressable block receives a stable block ID. Plain text is derived for local and public search. Markdown is an interchange and source-editing format, not the canonical database record.

This choice preserves rich tables, cell colors, merged cells, images, stable block identity, and future recall metadata that ordinary Markdown cannot represent reliably.

### Rich editor

The WYSIWYG editor supports:

- Headings, paragraphs, bold, italic, underline, and text color
- Ordered, unordered, and task lists
- Images with local-first insertion
- Tables
- Undo and redo for every content mutation

Frequently used controls appear above the mobile keyboard. Less common controls live in a `+` menu so the editor remains calm and uncluttered.

### Table interaction

- Insert Table opens a bottom sheet with an initial row/column grid selector.
- Selecting a cell exposes row/column add/delete, header toggle, alignment, background color, merge, and split.
- A narrow viewport scrolls the table horizontally without scrolling the entire document sideways.
- Equal Width and Fit Content are the default width operations.
- Spreadsheet-shaped clipboard data is converted to a table where parsing is reliable.
- Invalid pasted rows remain recoverable as text rather than being discarded.
- All structural table operations participate in undo/redo.

### Markdown round trip

Common formatting serializes as GitHub Flavored Markdown. Rich table features unsupported by GFM serialize as embedded HTML carrying Orosi round-trip attributes. Orosi Markdown must round-trip without losing merged cells or supported cell presentation.

If parsing or conversion fails, the last valid Tiptap document is left untouched and the edited Markdown is retained as a recoverable draft. Export produces UTF-8 Markdown plus referenced assets.

### Images

An inserted image is copied into application-managed local storage and referenced by an asset record. Private sync uploads it to a private path. Publishing copies only referenced, approved assets into a separate public path, preventing a public URL from exposing a private object.

## 7. Architecture

The application follows ports-and-adapters boundaries so UI, domain behavior, and storage technology can change independently.

### Layers

1. **Presentation**: auth, notes list, editor, discovery, public reader, settings, moderation UI
2. **Application use cases**: create, edit, publish, import, search, report, block, sync
3. **Domain**: Note, Publication, Provenance, Tag, SyncOperation, Report, Block
4. **Repository ports**: local notes, remote notes, publications, assets, moderation, ads
5. **Adapters**: SQLite, IndexedDB development fallback, Supabase, Capacitor native plugins, AdMob

### Technology baseline

- React, TypeScript, and Vite
- Tiptap editor
- Capacitor iOS/Android packaging
- Supabase Auth, PostgreSQL, Storage, Edge Functions/RPC, and RLS
- SQLite on mobile
- IndexedDB adapter for browser development and Playwright runs
- Vitest, React Testing Library, and Playwright

Dependency versions are pinned to mutually compatible stable releases when the approved implementation plan begins. Native integrations sit behind ports so plugin replacement does not change domain consumers.

### Bounded modules

- `auth`: session state and provider adapters
- `notes`: private note lifecycle and local search
- `editor`: Tiptap schema, commands, tables, Markdown conversion
- `sync`: outbox, remote revisions, retries, conflict copies
- `publishing`: snapshots, public assets, provenance projection
- `discovery`: keyword/tag search and public reading
- `moderation`: reports, blocks, review queue, enforcement
- `ads`: placement policy and provider adapter
- `platform`: SQLite, secure storage, network, filesystem, lifecycle

No module reads another module's database tables directly. Cross-module work goes through an application use case or repository port.

## 8. Data Model

### Local records

| Record | Purpose |
| --- | --- |
| `notes` | UUID, owner, title, Tiptap JSON, derived text, timestamps, base revision, sync state, deletion marker |
| `note_assets` | Local URI, MIME type, hash, dimensions, private remote path, sync state |
| `provenance_links` | Target note/block IDs, source publication/version/author, scope, source digest, import time |
| `sync_outbox` | Idempotency key, aggregate, operation, payload, base revision, retry metadata |
| `sync_cursor` | Per-account pull cursor and last successful sync time |

Local records are partitioned by account. Authentication secrets and database encryption keys are not stored in these tables.

### Server records

| Record | Purpose |
| --- | --- |
| `profiles` | Minimal attribution identity: account ID, display name, optional avatar; no MVP profile page |
| `private_notes` | Owner-only synchronized private note copies and current revision |
| `private_assets` | Owner-only asset metadata and private Storage paths |
| `publications` | Current discoverable state and pointer to current version |
| `publication_versions` | Immutable sanitized snapshots, derived text, author display, and timestamps |
| `publication_assets` | Approved public Storage paths associated with one version |
| `publication_provenance` | Mandatory source projections for attributed republication |
| `tags` / `publication_tags` | Normalized public tags and associations |
| `reports` | Reporter, target, category, details, state, and timestamps |
| `user_blocks` | Blocking account and blocked author |
| `moderation_actions` | Append-only operator decision and enforcement audit trail |

A removed source keeps only the minimum tombstone needed for attribution, abuse handling, and legal retention. Account deletion anonymizes attribution where retention is required and follows the explicit deletion schedule in section 12.

## 9. Local-first Synchronization

### Write path

1. Write the note mutation and an outbox operation in one SQLite transaction.
2. Show `Saved on device` only after that transaction commits.
3. Push queued operations when connectivity is available.
4. Mark `Synced` only after note and referenced assets are acknowledged.

Synchronization runs on application start, foreground resume, network reconnection, manual request, and an allowed background opportunity. Retries use exponential backoff with jitter and never block editing.

### Revision protocol

Every private note has a server revision. An upsert supplies `base_revision` and an idempotency key. The server accepts and increments the revision only when the base matches the current revision; replaying an acknowledged idempotency key returns the prior result.

### Conflict handling

If the server revision has advanced:

1. Preserve the unsent local document as a new private note named `Title (Conflict copy YYYY-MM-DD HH:mm)`.
2. Retain its assets, tags, and provenance, but no public state.
3. Replace the original local aggregate with the current server version.
4. Surface a persistent conflict notice linking to both notes.

No automatic merge is attempted in the MVP, and neither version is discarded.

### Deletes

Delete operations use tombstones until every relevant sync is acknowledged. A pending local delete never causes a newer remote edit to disappear silently; it produces a conflict notice. Trashed notes remain restorable for 30 days; after that window, synchronized note content and assets are purged from active storage. Backup expiry follows the account deletion schedule in section 12.

## 10. Publishing and Provenance

### Snapshot isolation

Publishing never changes the private note's visibility flag in place. It creates a sanitized `publication_version` and public asset set. Updating creates another immutable version and advances the publication pointer.

### Provenance semantics

A provenance link records:

- Exact source publication and version
- Source author identity at import time
- Import scope: note, paragraph, or sentence
- Destination block IDs
- Source content digest and import time

Editing imported text does not delete the source relationship. Republishing projects all relevant sources into a visible `Based on` section. Duplicate imports from the same source/version are consolidated for display while preserving audit records.

### Reuse license behavior

Before first publication, the author accepts terms granting other Orosi users an in-app license to copy, modify, and republish the public snapshot with attribution. The author confirms they hold the necessary rights. Unpublishing stops future discovery/import but does not revoke rights already exercised in existing copies. Copyright complaints can remove a source and trigger review of derivatives; legally required removal may override ordinary copy-retention behavior.

## 11. Search

- Private search is entirely local over derived note text, titles, and tags.
- Public search runs against sanitized publication title, derived text, and normalized tags in PostgreSQL full-text search.
- Search results exclude unpublished, quarantined, removed, and blocked-author content.
- Author display appears on a result, but author profile browsing, following, and author-name search are excluded.
- Private note contents, private tags, and private search queries are never sent to the public search index.

## 12. Security and Privacy

### Authorization

- Private-note and private-asset rows require `owner_id = auth.uid()` through RLS.
- Public reads require a publication state of `published` and an approved current version.
- Users may create reports and their own block records but cannot read another reporter's data.
- Moderation actions require a server-verified operator role and execute through trusted server code.
- Client code never contains a Supabase service-role secret.

RLS is tested with at least two ordinary users plus an operator identity to prove both allowed and denied access.

### Device security

- OAuth tokens and the local database key live in iOS Keychain or Android Keystore-backed secure storage.
- The mobile SQLite database is encrypted at rest using a key unavailable to application logs.
- Local files live in application-private storage.
- Logout warns about unsynchronized changes, then removes that account's local database partition and assets after confirmation.

### Data minimization

- Private notes, private tags, public search terms, and note text are excluded from ads and analytics.
- MVP telemetry is limited to content-free crash and operational diagnostics.
- Sensitive payloads and OAuth tokens are redacted from logs.
- Settings provide privacy information, data export guidance, and in-app account deletion.
- The MVP is not a Kids Category or Designed for Families product.

Account deletion immediately revokes active sessions, hides public publications, and locks further sync. Active identity, private-note, and private-asset data is deleted within 30 days. Encrypted backups expire within 90 days. Moderation, fraud, security, or legal records retained beyond that period contain only the minimum required data and use anonymized attribution where permitted. The launch privacy policy and reuse terms must receive legal review before store submission; store submission itself remains outside the MVP release-candidate scope.

### Authentication behavior

The first login requires network access. A cached secure session permits offline access on the same device. When a server response establishes revocation or invalidity, the local vault locks and online authentication is required; local data is not silently erased.

## 13. UGC Safety and Moderation

### Publishing controls

- Users accept Terms of Use and Community Standards before creating public UGC and whenever those terms materially change.
- Server-side sanitization removes executable HTML and invalid embeds.
- Text passes prohibited-content, link, spam, and abuse heuristics.
- A post that triggers a rule enters `pending_review` rather than appearing publicly.
- In the MVP, a new public snapshot containing images remains pending until an operator approves its public assets.

The moderation integration is exposed as a `ContentModerationPort`; a later automated image provider may replace manual image review without changing publishing use cases.

### User controls

Every public note and author menu provides:

- Report note
- Report author
- Block author
- Published support/contact information

Report categories are sexual content, violence, hate/harassment, illegal information, copyright, spam, and other. Blocking hides all current and future publications from that author in discovery and direct in-app reading.

### Operator workflow

A secured web-only operator surface lists pending publications and reports. Operators can approve, hide, remove, warn, suspend, or ban. Actions are append-only audited. Severe safety reports are quarantined immediately and reviewed within 24 hours; normal reports are reviewed within 72 hours. Contact and appeal instructions are published in the app.

This design follows current platform expectations for filtering, reporting, blocking, terms, moderation, and contact information:

- [Apple App Review Guidelines, section 1.2](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play User-generated content policy](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en-GB)

## 14. Advertising

### Placement policy

- Eligible surfaces: public Discover and public search result lists only
- First eligible slot: after eight organic public-note cards
- Continued frequency: no more than one native ad per twenty additional organic cards
- Ineligible surfaces: auth, My Notes, editor, private/public reader, import flow, settings, moderation, empty states
- No ad appears when offline, before enough organic content exists, or while consent state is unresolved

The placement calculation is a pure domain policy with automated tests. UI components cannot request ads outside an explicit eligible slot.

### Presentation and privacy

Native ads may match Orosi spacing and typography but must show the localized `광고` label and unobscured AdChoices. They must remain distinguishable from note cards and cannot occupy navigation or expected tap targets.

The MVP defaults to non-personalized advertising. It never uses note content, tags, provenance, imported material, or search terms as ad signals. Regional consent is obtained through the supported consent flow; if compliant consent cannot be established, ads remain disabled.

Development and automated tests use test IDs or a disabled adapter. Production ad IDs and operational activation require separate user authorization. The provider is isolated behind `AdService`.

- [AdMob native ad requirements](https://support.google.com/admob/answer/6239795?hl=en)

## 15. Error Handling and Recovery

| Failure | Required behavior |
| --- | --- |
| Local database write fails | Do not claim save success; retain the in-memory draft, show persistent retry, and offer Markdown export |
| Device storage is full | Explain the cause, retain recoverable text, and offer cleanup/export guidance |
| Markdown conversion fails | Preserve the last valid Tiptap JSON and retain the edited Markdown as a recovery draft |
| Asset upload fails | Keep the note locally saved and show `Sync needed`; retry the asset independently |
| Sync network/auth failure | Keep editing available when authenticated locally; retry network failures; prompt login only when required |
| Revision conflict | Preserve the unsent local version as a conflict copy and load the server version into the original |
| Import fails | Roll back content, assets, and provenance together; never leave a partial import |
| Publish fails | Keep the private note unchanged and never show a public-success state |
| Moderation rejects publication | Keep the private source; show the reason and appeal/contact route |
| Public source disappears | Keep the imported copy and display an unavailable-source attribution tombstone |

All user-facing failures use calm language, name what is safe, and offer the next action.

## 16. Testing Strategy

### Unit tests

- Domain invariants for private/public separation
- Note, publication, tag, provenance, report, block, and ad placement behavior
- Markdown and rich-table round trips
- Sanitization and invalid-content handling
- Outbox retry, idempotency, revision matching, and conflict-copy creation
- Log/analytics redaction rules

### Integration tests

- SQLite transactions, migrations, account partitioning, encrypted open/close, and restart persistence
- Asset filesystem lifecycle
- Supabase local-stack migrations, RPCs, Storage policy, and RLS allow/deny matrix
- Publication snapshot and import atomicity
- Network disconnect/reconnect and retry persistence

### End-to-end tests

Playwright covers the browser-compatible application shell with an IndexedDB adapter and a test auth adapter that is excluded from production builds:

- Authentication gate and signed-in routing
- Create, autosave, close, reopen, and edit offline
- Rich table operations and Markdown recovery
- Publish, search, tag, read, and unpublish
- Whole-note, paragraph, and sentence import
- Provenance display and attributed republication
- Report, block, and moderation state changes
- Conflict-copy notification
- Ad eligibility and prohibited-surface assertions

### Native verification

Android emulator and physical-device smoke checks cover Google OAuth, SQLite encryption, secure storage, file/image handling, WebView keyboard behavior, app lifecycle, network recovery, back navigation, and package installation.

The iOS project is generated and synchronized on Windows. Final compilation, Google/Apple OAuth, Keychain, SQLite, keyboard, VoiceOver, and packaging checks are documented for execution on macOS.

## 17. Accessibility and Performance

### Accessibility

- WCAG AA color contrast for text and controls
- Minimum 44 by 44 CSS-pixel primary touch targets
- Text scaling without clipped editor or navigation controls
- VoiceOver and TalkBack names, roles, states, and error announcements
- Keyboard navigation for browser/editor development workflows
- Color is never the sole indicator of private, public, sync, or error state

### Performance acceptance budgets

Using a recorded reference device/emulator and a deterministic fixture:

- With 1,000 local notes, warm list rendering and local search complete within 500 ms at p95.
- Opening an ordinary local note completes within 300 ms at p95.
- A 10,000-character document and a 50 by 20 table maintain input-to-render latency below 100 ms at p95 during the defined edit script.
- Autosave does not block the typing thread and never loses the last committed transaction after process restart.

The reference environment and raw measurements are stored with release verification results so performance claims remain reproducible.

## 18. Release-candidate Gate

The MVP is a release candidate only when all of the following are evidenced:

- Type checking, linting, unit, integration, and critical E2E suites pass.
- Database migrations work from an empty database and every previously released schema fixture.
- Android debug packaging builds, installs, launches, and passes the native smoke checklist.
- The Android release variant compiles and produces an unsigned or internal-test artifact without requiring production signing credentials.
- The iOS project is generated and synchronized; a complete macOS verification checklist is present.
- Offline restart, reconnect sync, asset retry, and conflict-copy tests pass.
- Public publishing, search, all three import granularities, provenance, and republication pass.
- RLS and Storage tests prove private cross-account access is denied.
- Automated assertions prove prohibited screens cannot request ads.
- Accessibility and performance acceptance checks pass.
- Installation, environment, Supabase, build, test, moderation, recovery, privacy/consent, and iOS verification documentation is complete.
- No unresolved critical or high-severity defect remains.
- Test authentication cannot be reached or bundled in a production build.
- Operational ads are disabled unless separately authorized and configured.

Actual store submission, account purchases, and production ad activation remain outside this gate.

## 19. Delivery Slices

Implementation planning divides the approved design into bounded slices, each with its own tests and review gate:

1. Foundation, app shell, authentication ports, and local database
2. Private notes, editor, tables, Markdown, and assets
3. Private synchronization, revisions, conflict copies, and security
4. Publishing, discovery, tags, import, and provenance
5. UGC moderation, reporting, blocking, and advertising policy
6. Native packaging, hardening, accessibility, performance, and release documentation

The slices are sequencing boundaries, not a reduction of the approved MVP scope.

## 20. Approval Record

The user approved the following design sections in sequence:

1. MVP scope and screen structure
2. Architecture and data boundaries
3. Editor, tables, import, and publishing
4. Synchronization, security, and error recovery
5. UGC operations, advertising, and privacy
6. Testing and release-candidate criteria

This document consolidates those approvals without authorizing actual store submission, paid services, or production ad activation.
