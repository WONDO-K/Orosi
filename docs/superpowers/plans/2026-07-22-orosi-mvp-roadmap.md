# Orosi MVP Delivery Roadmap

- Status: Draft for implementation approval
- Date: 2026-07-22
- Governing specification: `docs/superpowers/specs/2026-07-22-orosi-design.md`
- Repository: `https://github.com/WONDO-K/Orosi`

## Purpose

This roadmap turns the approved product design into six independently reviewable delivery slices. It is an index and coverage contract, not a substitute for the executable implementation plan for each slice. A detailed plan is written just before its slice begins so that it can use the interfaces and evidence produced by the preceding slice.

The sequencing boundary does not reduce the approved MVP. The release candidate exists only after every slice and the final cross-slice gate pass.

## Fixed technical baseline

| Area | Decision |
| --- | --- |
| Application | React 19.2.8, TypeScript 6.0.3, Vite 8.1.5 |
| Native shell | Capacitor 8.4.2 for iOS and Android |
| Editor | Tiptap 3.28.0 with Tiptap JSON as canonical content |
| Local storage | Encrypted SQLite on native; IndexedDB development/test adapter |
| Remote platform | Supabase Auth, PostgreSQL, Storage, RLS, and trusted RPC/Edge Functions |
| Verification | Vitest 4.1.10, React Testing Library 16.3.2, Playwright 1.61.1 |
| Android toolchain | JDK 21, AGP 8.7.2, minSdk 23, compileSdk/targetSdk 35 |
| Brand | Sage `#42695B`, ivory `#F7F4EE`, ink `#26332E`, apricot `#E6A477`, mint `#DDEAE4` |

TypeScript 7 is deliberately excluded because the selected `typescript-eslint` 8.65.0 peer range is below TypeScript 6.1. All dependencies are exact-pinned and the lockfile is committed.

The current Windows workstation has Node 24.15.0 and npm 11.12.1, but Java 17.0.12. Android compilation therefore remains blocked until JDK 21 is installed or selected. The repository will contain a deterministic preflight check so this difference cannot be missed.

## Global constraints

- Authentication is evaluated before the app shell; there is no guest or email/password path.
- Android exposes Google login. iOS exposes Google and Sign in with Apple.
- A first login requires network access; a valid cached secure session can unlock the same device offline.
- Private notes are local-first and private by default.
- Public content is an explicit sanitized immutable snapshot, not a visibility flag on a private note.
- Imports support note, paragraph, and sentence granularity and create independent copies with durable provenance.
- No module reads another module's database tables directly.
- Ads are eligible only in Discover/public-search lists and remain operationally disabled without separate authorization.
- Actual store submission, production signing, paid-service purchases, and production ad activation are excluded.
- No success message may precede a committed local transaction or acknowledged remote operation.
- Each implementation task follows red-green-refactor, ends with focused verification, and is committed separately.

## Slice map

### Slice 1: Foundation, authentication, and local private-note vertical

**Detailed plan:** `docs/superpowers/plans/2026-07-22-foundation-auth-local-data.md`

**Outcome:** A branded Capacitor application gates access behind Google/Apple OAuth adapters, restores a secure cached session, opens an account-partitioned encrypted SQLite database on native, and lets an authenticated user create, autosave, reopen, trash, restore, and permanently delete a basic Tiptap note without network access.

**Interfaces frozen for later slices:**

- `AuthRepository` and `AuthSnapshot`
- `SecureKeyValueStore`
- `PrivateNoteRepository` and `PrivateNote`
- `LocalDatabaseFactory`
- runtime dependency composition
- app shell and protected route boundary

**Review gate:** quality pipeline passes; browser persistence restarts pass; repository contract passes for IndexedDB and the SQLite driver boundary; test auth is not imported by production code; native projects synchronize; Android preflight reports JDK 21 accurately.

### Slice 2: Editor, tables, Markdown, assets, and private search

**Plan file to create after Slice 1 approval:** `docs/superpowers/plans/2026-07-22-editor-tables-markdown-assets.md`

**Outcome:** The basic Tiptap note becomes the complete mobile editor: rich formatting, stable block IDs, first-class table controls, Markdown source/import/export with lossless Orosi round trips, local-first images, tags, local search, and recovery drafts.

**Required coverage:**

- headings, paragraphs, emphasis, underline, text color, ordered/unordered/task lists
- keyboard-adjacent common controls and a calm `+` menu
- table grid insertion; row/column controls; headers; alignment; cell color; merge/split; sizing
- spreadsheet clipboard parsing with invalid rows preserved as text
- GFM plus Orosi HTML attributes for rich-table features
- last-valid JSON plus edited Markdown recovery on conversion failure
- application-private asset copies and asset lifecycle
- 1,000-note search and ordinary-note-open performance fixtures

**Review gate:** rich table and Markdown round-trip suites pass; editor restart recovery is proven; asset failure never loses note text; no network is needed for editing or private search.

### Slice 3: Private synchronization, revisions, conflicts, and security

**Plan file to create after Slice 2 approval:** `docs/superpowers/plans/2026-07-22-private-sync-security.md`

**Outcome:** Private notes/assets synchronize through Supabase using an atomic local outbox, idempotency keys, revision matching, retry persistence, secure RLS, and conflict copies.

**Required coverage:**

- note mutation plus outbox operation in one SQLite transaction
- start/foreground/reconnect/manual/background sync triggers
- exponential backoff with jitter
- per-note server revisions and acknowledged idempotency replay
- conflict copies retaining assets, tags, and provenance but no public state
- synchronized tombstones and 30-day Trash purge rules
- owner-only private-note and private-asset RLS
- log/token/content redaction
- local logout warning and account-partition cleanup

**Review gate:** local Supabase-stack integration tests prove two-user isolation, restart retry, revision conflict behavior, asset retry, and no silent deletion.

### Slice 4: Publishing, discovery, imports, and provenance

**Plan file to create after Slice 3 approval:** `docs/superpowers/plans/2026-07-22-publishing-discovery-import.md`

**Outcome:** Users explicitly publish sanitized immutable snapshots, search them by keyword/tag, import all three granularities into new or existing notes atomically, and republish derivatives with required attribution.

**Required coverage:**

- publish preview, required title, zero-to-ten tags, and reuse-terms acceptance
- private/public asset separation
- explicit publication update and immediate unpublish
- keyword/tag PostgreSQL full-text search
- exclusions for blocked, removed, quarantined, and unpublished results
- note, paragraph, and sentence selection
- atomic content/asset/provenance import transaction
- source version, author, scope, digest, destination block IDs, and timestamp provenance
- unavailable-source attribution tombstones
- attributed derivative republication

**Review gate:** the complete publish/search/import/unpublish/republication E2E flow passes, including rollback on partial import or publish failure.

### Slice 5: UGC safety, moderation, blocking, and advertising policy

**Plan file to create after Slice 4 approval:** `docs/superpowers/plans/2026-07-22-moderation-blocking-ads.md`

**Outcome:** Public content has policy acceptance, sanitization, filtering, reports, author blocking, operator review/audit, contact/appeal paths, and a privacy-preserving native-ad placement policy.

**Required coverage:**

- terms/community-standard version acceptance
- executable HTML/invalid embed removal and text abuse/spam/link heuristics
- manual approval of new public snapshots containing images
- note/author reports across all approved categories
- current and future publication hiding for blocked authors
- operator approve/hide/remove/warn/suspend/ban actions with append-only audit
- severe 24-hour and ordinary 72-hour operating targets in documentation
- ad placement after eight organic cards, then at most one per twenty more
- explicit localized ad label and unobscured AdChoices
- non-personalized default with no note/tag/provenance/import/search signals
- disabled/test adapters unless production activation is separately authorized

**Review gate:** prohibited screens cannot request ads; RLS prevents unauthorized report/moderation reads; block/report/moderation E2E cases pass; test and release configurations contain no production ad IDs.

### Slice 6: Native hardening and release-candidate evidence

**Plan file to create after Slice 5 approval:** `docs/superpowers/plans/2026-07-22-native-release-hardening.md`

**Outcome:** Android build/install evidence, an iOS macOS verification package, accessibility/performance evidence, recovery/privacy/operator documentation, and a final release-candidate audit are complete.

**Required coverage:**

- Android debug build, install, launch, physical/emulator smoke checks
- Android unsigned/internal release-variant artifact
- iOS project synchronization and macOS build/OAuth/Keychain/SQLite/keyboard/VoiceOver checklist
- TalkBack, touch targets, text scaling, color independence, and WCAG AA checks
- deterministic performance fixtures and raw p95 measurements
- empty and prior-schema migration fixtures
- installation, environment, Supabase, recovery, moderation, consent, privacy, and operations guides
- encryption export-compliance review note for SQLCipher
- test-auth exclusion and production-ad-disable assertions
- no unresolved critical/high defect

**Review gate:** every item in specification section 18 has a dated evidence link. A missing macOS result is reported as a release blocker; it is never inferred from Windows project synchronization.

## Specification coverage matrix

| Specification section | Owning slice | Cross-slice dependency |
| --- | --- | --- |
| 1. Product summary | 1-6 | Final release audit |
| 2. Design principles | 1-6 | Every plan copies applicable invariants |
| 3. Goals/non-goals | 1-6 | Roadmap scope and final audit |
| 4. Brand system | 1 | Accessibility recheck in 6 |
| 5. Information architecture | 1, 4, 5 | Shell in 1; public flows in 4/5 |
| 6. Editor/content model | 1, 2 | Canonical basic document in 1; full capability in 2 |
| 7. Architecture | 1 | Boundaries enforced in all later slices |
| 8. Data model | 1, 3, 4, 5 | Local base in 1; server modules by owner slice |
| 9. Local-first synchronization | 1, 3 | Local commit semantics in 1; remote protocol in 3 |
| 10. Publishing/provenance | 4 | Moderation gate from 5 |
| 11. Search | 2, 4 | Private search in 2; public search in 4 |
| 12. Security/privacy | 1, 3, 5, 6 | Secure device base, RLS, ads/UGC, legal gate |
| 13. UGC safety/moderation | 5 | Publishing hooks originate in 4 |
| 14. Advertising | 5 | Final disable assertion in 6 |
| 15. Error/recovery | 1-5 | Cross-slice recovery audit in 6 |
| 16. Testing | 1-6 | Final aggregate evidence in 6 |
| 17. Accessibility/performance | 1, 2, 6 | Tokens/components early; final measurements in 6 |
| 18. Release-candidate gate | 6 | Consumes all prior evidence |
| 19. Delivery slices | This roadmap | Detailed plans remain authoritative |
| 20. Approval record | Documentation | Preserved unchanged |

## Plan lifecycle and approvals

1. Review and approve this roadmap plus the executable Slice 1 plan.
2. Execute Slice 1 task-by-task with its required Superpowers execution skill.
3. Verify and review Slice 1; do not begin Slice 2 while a Slice 1 review issue is open.
4. Write the Slice 2 plan against the actual frozen interfaces, self-review it against this roadmap and the product specification, and request approval.
5. Repeat through Slice 6.
6. Run the final specification-to-evidence audit. Only then may the repository be labeled an MVP release candidate.

Any proposed change to the approved product behavior is a specification amendment and requires user approval. Implementation-detail changes that preserve the behavior are recorded in the relevant plan's decision log.
