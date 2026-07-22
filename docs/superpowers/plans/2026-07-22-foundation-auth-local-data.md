# Orosi Foundation, Authentication, and Local Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a verified iOS/Android-capable Orosi vertical slice in which authentication always precedes the app shell and an authenticated user can create, autosave, reopen, trash, restore, and permanently delete a basic private Tiptap note from account-partitioned local storage while offline.

**Architecture:** React presentation consumes `AuthRepository`, `PrivateNoteRepository`, and `LocalDatabaseFactory` ports through a single runtime dependency object. Browser development and tests use IndexedDB; native builds use encrypted SQLCipher through the Capacitor SQLite adapter. Supabase PKCE OAuth and Capacitor secure storage are isolated adapters, so no domain or UI consumer depends on provider APIs.

**Tech Stack:** React 19.2.8, TypeScript 6.0.3, Vite 8.1.5, React Router 7.18.1, Tiptap 3.28.0, Capacitor 8.4.2, Supabase JS 2.110.8, IndexedDB/idb 8.0.3, Capacitor Community SQLite 8.1.0, Vitest 4.1.10, React Testing Library 16.3.2, Playwright 1.61.1.

## Global Constraints

- Product name is **Orosi**; the UI wordmark is lowercase `orosi`.
- Use sage `#42695B`, ivory `#F7F4EE`, ink `#26332E`, apricot `#E6A477`, and public mint `#DDEAE4`.
- Authentication is evaluated before the application shell; guest and email/password modes do not exist.
- Android offers Google login. iOS offers Google and Sign in with Apple.
- First login requires network access. A previously persisted valid session can unlock offline on the same device.
- A note is private by default and is committed locally before any saved-state message appears.
- Tiptap JSON is canonical. This slice uses StarterKit; tables, Markdown, images, and full editor controls belong to Slice 2.
- Native records are partitioned by account and stored in encrypted SQLite; browser development and Playwright use IndexedDB.
- OAuth tokens use iOS Keychain or Android Keystore-backed secure storage. Never log tokens, note content, or database secrets.
- Local database files and preferences are excluded from Android backup/device transfer.
- Android native builds require JDK 21, AGP 8.7.2, minSdk 23, compileSdk 35, and targetSdk 35.
- SQLCipher triggers an encryption-export compliance review before distribution.
- Exact dependency versions and `package-lock.json` are committed.
- Test authentication lives only under `src/test`; production modules may not import it.
- Actual store submission, production signing, Supabase project creation, paid services, and production ads are excluded.
- Every behavior change follows red-green-refactor and each task ends with an isolated commit.

---

## Preconditions

1. Work from repository root `D:\workspace\orosi` on `main` or an isolated worktree created with `superpowers:using-git-worktrees`.
2. Confirm `git status --short` is empty before starting.
3. Node 24.15.0 and npm 11.12.1 are already available.
4. Java currently reports 17.0.12. Task 7 intentionally makes the Android build gate fail with a clear JDK 21 message until an approved JDK 21 installation or selection is available.
5. Real OAuth smoke testing requires user-provided Supabase, Google, and Apple configuration. The slice remains locally verifiable through repository/auth contract tests without creating external accounts.

## File structure

```text
.
├── .github/workflows/quality.yml          # Web quality gate and Android preflight/build job
├── .env.example                           # Non-secret runtime variable names and example shapes
├── capacitor.config.ts                    # Capacitor IDs, web directory, encrypted SQLite settings
├── eslint.config.js                       # Type-aware flat ESLint configuration
├── index.html                             # Vite entry document
├── package.json / package-lock.json        # Exact dependency graph
├── scripts/check-native-toolchain.mjs     # Deterministic JDK/Android prerequisite check
├── src
│   ├── app
│   │   ├── App.tsx                        # Dependency provider, auth gate, protected routes
│   │   ├── App.test.tsx                   # Protected-shell behavior
│   │   ├── dependencies.ts                # Application dependency contract
│   │   ├── runtime.ts                     # Production adapter composition
│   │   └── styles.css                     # Brand tokens and accessible mobile shell
│   ├── features
│   │   ├── auth
│   │   │   ├── auth.ts                    # Auth domain types and repository port
│   │   │   ├── AuthGate.tsx               # Bootstrap/loading/signed-out/signed-in boundary
│   │   │   ├── AuthGate.test.tsx          # Provider and offline-session behavior
│   │   │   ├── LoginScreen.tsx            # Platform-specific OAuth buttons
│   │   │   └── supabaseAuth.ts            # Supabase PKCE/Capacitor Browser adapter
│   │   └── notes
│   │       ├── note.ts                    # Private-note aggregate and pure transitions
│   │       ├── note.test.ts                # Domain invariants and 30-day Trash lifecycle
│   │       ├── noteRepository.ts           # Repository port and use cases
│   │       ├── NotesScreen.tsx             # List/create/trash/restore/delete presentation
│   │       ├── NoteEditorScreen.tsx        # StarterKit editor and local autosave
│   │       └── NotesScreen.test.tsx        # Local vertical-flow integration tests
│   ├── main.tsx                            # Runtime boot only
│   ├── platform
│   │   ├── database
│   │   │   ├── databaseFactory.ts         # Per-account database factory port
│   │   │   ├── indexedDbNotes.ts           # Browser/Playwright adapter
│   │   │   ├── indexedDbNotes.test.ts      # Persistence and partition contract
│   │   │   ├── sqliteDriver.ts             # Narrow SQL driver port plus Capacitor adapter
│   │   │   ├── sqliteNotes.ts              # Native note repository
│   │   │   ├── sqliteNotes.test.ts         # SQL adapter contract with recording driver
│   │   │   └── migrations/001_notes.sql    # Native schema v1
│   │   └── secureStorage.ts                # Supabase-compatible secure storage adapter
│   └── test
│       ├── fakeAuth.ts                     # Test-only auth implementation
│       ├── memoryNotes.ts                  # Test-only note repository
│       ├── renderApp.tsx                   # Test dependency composition
│       └── setup.ts                        # jest-dom and fake IndexedDB
├── tsconfig.json
└── vite.config.ts
```

Generated `android/` and `ios/` projects are added in Task 7. Their generated files are committed because native configuration is part of the product.

### Task 1: Exact-pinned web scaffold and quality harness

**Files:**

- Create: `package.json`
- Create: `package-lock.json` through npm
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `eslint.config.js`
- Create: `.prettierignore`
- Create: `.gitignore`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/styles.css`
- Create: `src/test/setup.ts`
- Create: `src/app/App.test.tsx`

**Interfaces:**

- Consumes: no application interfaces.
- Produces: `App(): JSX.Element`, `@/*` path alias, jsdom/fake-IndexedDB test runtime, and the commands `format:check`, `lint`, `typecheck`, `test`, `build`, and `quality`.

- [ ] **Step 1: Create the exact package manifest**

Create `package.json` with this complete content:

```json
{
  "name": "orosi",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=24 <25",
    "npm": ">=11 <12"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit --pretty false",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "quality": "npm run format:check && npm run lint && npm run typecheck && npm test && npm run build",
    "cap:sync": "npm run build && cap sync",
    "native:check": "node scripts/check-native-toolchain.mjs",
    "android:debug": "npm run native:check && npm run cap:sync && cd android && gradlew.bat assembleDebug",
    "android:release": "npm run native:check && npm run cap:sync && cd android && gradlew.bat assembleRelease",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@aparajita/capacitor-secure-storage": "8.0.0",
    "@capacitor-community/sqlite": "8.1.0",
    "@capacitor/android": "8.4.2",
    "@capacitor/app": "8.1.1",
    "@capacitor/browser": "8.0.4",
    "@capacitor/core": "8.4.2",
    "@capacitor/ios": "8.4.2",
    "@capacitor/network": "8.0.1",
    "@supabase/supabase-js": "2.110.8",
    "@tiptap/core": "3.28.0",
    "@tiptap/pm": "3.28.0",
    "@tiptap/react": "3.28.0",
    "@tiptap/starter-kit": "3.28.0",
    "idb": "8.0.3",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-router-dom": "7.18.1",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@capacitor/cli": "8.4.2",
    "@eslint/js": "10.7.0",
    "@playwright/test": "1.61.1",
    "@testing-library/jest-dom": "7.0.0",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.1",
    "@types/node": "24.13.3",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.4",
    "eslint": "10.7.0",
    "eslint-plugin-react-hooks": "7.1.1",
    "eslint-plugin-react-refresh": "0.5.3",
    "fake-indexeddb": "6.2.5",
    "jsdom": "29.1.1",
    "prettier": "3.9.6",
    "typescript": "6.0.3",
    "typescript-eslint": "8.65.0",
    "vite": "8.1.5",
    "vite-tsconfig-paths": "6.1.1",
    "vitest": "4.1.10"
  }
}
```

- [ ] **Step 2: Install the locked dependency graph**

Run:

```powershell
npm.cmd install --ignore-scripts
npm.cmd ls --depth=0
```

Expected: `package-lock.json` is created, npm reports no missing/invalid dependency, and every top-level version matches `package.json`. Network access may require the normal sandbox approval; do not weaken registry or TLS settings.

- [ ] **Step 3: Create TypeScript, Vite, ESLint, and ignore configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "useDefineForClassFields": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vite/client", "vitest/globals"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "vite.config.ts", "capacitor.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
})
```

Create `eslint.config.js`:

```js
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'android/**',
      'coverage/**',
      'dist/**',
      'ios/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...reactRefresh.configs.vite.rules,
    },
  },
)
```

Create `.prettierignore`:

```text
android
coverage
dist
ios
package-lock.json
playwright-report
test-results
```

Create `.gitignore`:

```text
.env
.env.local
.idea/
.vscode/
.worktrees/
coverage/
dist/
node_modules/
playwright-report/
test-results/
android/.gradle/
android/local.properties
android/**/build/
ios/App/DerivedData/
ios/App/Pods/
*.xcuserstate
```

- [ ] **Step 4: Write the first failing application test**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
```

Create `src/app/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App scaffold', () => {
  it('renders the Orosi wordmark and promise', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'orosi' })).toBeVisible()
    expect(screen.getByText('필요한 부분만 가져와, 내 방식으로 기억하세요.')).toBeVisible()
  })
})
```

Run:

```powershell
npm.cmd test -- src/app/App.test.tsx
```

Expected: FAIL because `src/app/App.tsx` does not exist.

- [ ] **Step 5: Implement the branded scaffold**

Create `index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#42695B" />
    <title>orosi</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/app/App.tsx`:

```tsx
export function App() {
  return (
    <main className="welcome">
      <h1 className="wordmark">orosi</h1>
      <p>필요한 부분만 가져와, 내 방식으로 기억하세요.</p>
    </main>
  )
}
```

Create `src/app/styles.css`:

```css
:root {
  color: #26332e;
  background: #f7f4ee;
  font-family: Pretendard, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  --sage: #42695b;
  --ivory: #f7f4ee;
  --ink: #26332e;
  --apricot: #e6a477;
  --public-mint: #ddeae4;
  --danger: #9f3a38;
}

* { box-sizing: border-box; }
html, body, #root { min-height: 100%; margin: 0; }
button, input { font: inherit; }
button, a { min-height: 44px; min-width: 44px; }
.welcome { display: grid; min-height: 100vh; place-content: center; padding: 24px; text-align: center; }
.wordmark { color: var(--sage); font-family: Manrope, Pretendard, sans-serif; letter-spacing: -0.04em; }
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import '@/app/styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Orosi root element is missing')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 6: Verify scaffold quality**

Run:

```powershell
npm.cmd test -- src/app/App.test.tsx
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: the test passes; typecheck and lint exit 0; Vite emits `dist/index.html` and hashed assets.

- [ ] **Step 7: Commit the scaffold**

```powershell
git add package.json package-lock.json tsconfig.json vite.config.ts eslint.config.js .prettierignore .gitignore index.html src/main.tsx src/app/App.tsx src/app/App.test.tsx src/app/styles.css src/test/setup.ts
git commit -m "build: scaffold exact-pinned Orosi app"
```

### Task 2: Private-note domain, repository port, and IndexedDB adapter

**Files:**

- Create: `src/features/notes/note.ts`
- Create: `src/features/notes/note.test.ts`
- Create: `src/features/notes/noteRepository.ts`
- Create: `src/platform/database/databaseFactory.ts`
- Create: `src/platform/database/indexedDbNotes.ts`
- Create: `src/platform/database/indexedDbNotes.test.ts`

**Interfaces:**

- Consumes: browser `crypto.randomUUID()`, `idb.openDB()`, and the Task 1 test runtime.
- Produces: `PrivateNote`, `NoteDocument`, `PrivateNoteRepository`, `LocalDatabaseFactory`, `createPrivateNote()`, `editPrivateNote()`, `moveToTrash()`, `restoreFromTrash()`, `IndexedDbDatabaseFactory`.

- [ ] **Step 1: Write failing domain tests**

Create `src/features/notes/note.test.ts`:

```ts
import {
  createPrivateNote,
  editPrivateNote,
  moveToTrash,
  restoreFromTrash,
} from './note'

const NOW = '2026-07-22T03:00:00.000Z'

describe('private note lifecycle', () => {
  it('creates a private, pending-sync Tiptap document', () => {
    const note = createPrivateNote('user-a', NOW, 'note-a')

    expect(note).toMatchObject({
      id: 'note-a',
      ownerId: 'user-a',
      title: '제목 없는 노트',
      document: { type: 'doc', content: [{ type: 'paragraph' }] },
      derivedText: '',
      tags: [],
      baseRevision: 0,
      syncState: 'pending',
      deletedAt: null,
      purgeAfter: null,
      createdAt: NOW,
      updatedAt: NOW,
    })
  })

  it('derives searchable text and updates only the edited copy', () => {
    const original = createPrivateNote('user-a', NOW, 'note-a')
    const edited = editPrivateNote(original, {
      title: '용어',
      document: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '정확한 뜻' }] }],
      },
      now: '2026-07-22T03:01:00.000Z',
    })

    expect(edited.derivedText).toBe('정확한 뜻')
    expect(edited.updatedAt).toBe('2026-07-22T03:01:00.000Z')
    expect(original.title).toBe('제목 없는 노트')
  })

  it('sets a 30-day purge date and clears it on restore', () => {
    const note = createPrivateNote('user-a', NOW, 'note-a')
    const trashed = moveToTrash(note, NOW)
    const restored = restoreFromTrash(trashed, '2026-07-23T03:00:00.000Z')

    expect(trashed.deletedAt).toBe(NOW)
    expect(trashed.purgeAfter).toBe('2026-08-21T03:00:00.000Z')
    expect(restored.deletedAt).toBeNull()
    expect(restored.purgeAfter).toBeNull()
  })
})
```

Run:

```powershell
npm.cmd test -- src/features/notes/note.test.ts
```

Expected: FAIL because `note.ts` does not exist.

- [ ] **Step 2: Implement the note aggregate and transitions**

Create `src/features/notes/note.ts`:

```ts
import type { JSONContent } from '@tiptap/core'

export type NoteDocument = JSONContent & { type: 'doc' }
export type NoteSyncState = 'pending' | 'synced' | 'error'

export interface PrivateNote {
  id: string
  ownerId: string
  title: string
  document: NoteDocument
  derivedText: string
  tags: string[]
  createdAt: string
  updatedAt: string
  baseRevision: number
  syncState: NoteSyncState
  deletedAt: string | null
  purgeAfter: string | null
}

export const EMPTY_DOCUMENT: NoteDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

export function createPrivateNote(ownerId: string, now: string, id = crypto.randomUUID()): PrivateNote {
  if (!ownerId) throw new Error('A private note requires an owner')

  return {
    id,
    ownerId,
    title: '제목 없는 노트',
    document: structuredClone(EMPTY_DOCUMENT),
    derivedText: '',
    tags: [],
    createdAt: now,
    updatedAt: now,
    baseRevision: 0,
    syncState: 'pending',
    deletedAt: null,
    purgeAfter: null,
  }
}

export function derivePlainText(node: JSONContent): string {
  const own = typeof node.text === 'string' ? node.text : ''
  const children = node.content?.map(derivePlainText).filter(Boolean) ?? []
  return [own, ...children].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export function editPrivateNote(
  note: PrivateNote,
  change: { title: string; document: NoteDocument; now: string },
): PrivateNote {
  if (note.deletedAt) throw new Error('Restore a trashed note before editing')

  return {
    ...note,
    title: change.title.trim() || '제목 없는 노트',
    document: structuredClone(change.document),
    derivedText: derivePlainText(change.document),
    updatedAt: change.now,
    syncState: 'pending',
  }
}

export function moveToTrash(note: PrivateNote, now: string): PrivateNote {
  const purgeAfter = new Date(now)
  purgeAfter.setUTCDate(purgeAfter.getUTCDate() + 30)
  return { ...note, deletedAt: now, purgeAfter: purgeAfter.toISOString(), updatedAt: now, syncState: 'pending' }
}

export function restoreFromTrash(note: PrivateNote, now: string): PrivateNote {
  if (!note.deletedAt) return note
  return { ...note, deletedAt: null, purgeAfter: null, updatedAt: now, syncState: 'pending' }
}
```

Run `npm.cmd test -- src/features/notes/note.test.ts`.

Expected: 3 tests pass.

- [ ] **Step 3: Define the repository and database-factory ports**

Create `src/features/notes/noteRepository.ts`:

```ts
import type { PrivateNote } from './note'

export type NoteList = 'active' | 'trash'

export interface PrivateNoteRepository {
  readonly ownerId: string
  list(location: NoteList, query?: string): Promise<PrivateNote[]>
  get(id: string): Promise<PrivateNote | null>
  put(note: PrivateNote): Promise<void>
  deletePermanently(id: string): Promise<void>
  purgeExpired(now: string): Promise<number>
  close(): Promise<void>
}

export function assertOwned(repository: PrivateNoteRepository, note: PrivateNote): void {
  if (repository.ownerId !== note.ownerId) {
    throw new Error('Cross-account local note access is forbidden')
  }
}
```

Create `src/platform/database/databaseFactory.ts`:

```ts
import type { PrivateNoteRepository } from '@/features/notes/noteRepository'

export interface LocalDatabaseFactory {
  open(ownerId: string): Promise<PrivateNoteRepository>
  destroy(ownerId: string): Promise<void>
}
```

- [ ] **Step 4: Write failing IndexedDB contract tests**

Create `src/platform/database/indexedDbNotes.test.ts`:

```ts
import { createPrivateNote, moveToTrash } from '@/features/notes/note'
import { IndexedDbDatabaseFactory } from './indexedDbNotes'

describe('IndexedDbDatabaseFactory', () => {
  const owners = ['idb-user-a', 'idb-user-b']
  const factory = new IndexedDbDatabaseFactory('orosi-test')

  afterEach(async () => {
    await Promise.all(owners.map((owner) => factory.destroy(owner)))
  })

  it('persists after close/reopen and isolates accounts', async () => {
    const first = await factory.open(owners[0])
    await first.put(createPrivateNote(owners[0], '2026-07-22T03:00:00.000Z', 'note-a'))
    await first.close()

    const reopened = await factory.open(owners[0])
    const other = await factory.open(owners[1])

    expect(await reopened.get('note-a')).toMatchObject({ ownerId: owners[0] })
    expect(await other.get('note-a')).toBeNull()
    await reopened.close()
    await other.close()
  })

  it('separates active and trash lists and purges only expired notes', async () => {
    const repository = await factory.open(owners[0])
    const active = createPrivateNote(owners[0], '2026-07-01T00:00:00.000Z', 'active')
    const trashed = moveToTrash(
      createPrivateNote(owners[0], '2026-06-01T00:00:00.000Z', 'trashed'),
      '2026-06-01T00:00:00.000Z',
    )
    await repository.put(active)
    await repository.put(trashed)

    expect((await repository.list('active')).map((note) => note.id)).toEqual(['active'])
    expect((await repository.list('trash')).map((note) => note.id)).toEqual(['trashed'])
    expect(await repository.purgeExpired('2026-07-02T00:00:00.000Z')).toBe(1)
    expect(await repository.get('trashed')).toBeNull()
    await repository.close()
  })
})
```

Run:

```powershell
npm.cmd test -- src/platform/database/indexedDbNotes.test.ts
```

Expected: FAIL because `IndexedDbDatabaseFactory` does not exist.

- [ ] **Step 5: Implement the account-partitioned IndexedDB adapter**

Create `src/platform/database/indexedDbNotes.ts`:

```ts
import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PrivateNote } from '@/features/notes/note'
import {
  assertOwned,
  type NoteList,
  type PrivateNoteRepository,
} from '@/features/notes/noteRepository'
import type { LocalDatabaseFactory } from './databaseFactory'

interface OrosiBrowserDb extends DBSchema {
  notes: {
    key: string
    value: PrivateNote
    indexes: {
      'by-updated-at': string
      'by-deleted-at': string
    }
  }
}

class IndexedDbNoteRepository implements PrivateNoteRepository {
  constructor(
    readonly ownerId: string,
    private readonly database: IDBPDatabase<OrosiBrowserDb>,
  ) {}

  async list(location: NoteList, query = ''): Promise<PrivateNote[]> {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    const notes = (await this.database.getAll('notes'))
      .filter((note) => (location === 'trash' ? note.deletedAt !== null : note.deletedAt === null))
      .filter((note) => {
        if (!normalized) return true
        return [note.title, note.derivedText, ...note.tags]
          .join(' ')
          .toLocaleLowerCase('ko-KR')
          .includes(normalized)
      })
    return notes.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  async get(id: string): Promise<PrivateNote | null> {
    return (await this.database.get('notes', id)) ?? null
  }

  async put(note: PrivateNote): Promise<void> {
    assertOwned(this, note)
    await this.database.put('notes', structuredClone(note))
  }

  async deletePermanently(id: string): Promise<void> {
    await this.database.delete('notes', id)
  }

  async purgeExpired(now: string): Promise<number> {
    const transaction = this.database.transaction('notes', 'readwrite')
    const notes = await transaction.store.getAll()
    const expired = notes.filter((note) => note.purgeAfter !== null && note.purgeAfter <= now)
    await Promise.all(expired.map((note) => transaction.store.delete(note.id)))
    await transaction.done
    return expired.length
  }

  async close(): Promise<void> {
    this.database.close()
  }
}

export class IndexedDbDatabaseFactory implements LocalDatabaseFactory {
  constructor(private readonly prefix = 'orosi') {}

  private name(ownerId: string): string {
    if (!ownerId) throw new Error('An account id is required to open local notes')
    return `${this.prefix}-notes-${ownerId}`
  }

  async open(ownerId: string): Promise<PrivateNoteRepository> {
    const database = await openDB<OrosiBrowserDb>(this.name(ownerId), 1, {
      upgrade(db) {
        const store = db.createObjectStore('notes', { keyPath: 'id' })
        store.createIndex('by-updated-at', 'updatedAt')
        store.createIndex('by-deleted-at', 'deletedAt')
      },
    })
    return new IndexedDbNoteRepository(ownerId, database)
  }

  async destroy(ownerId: string): Promise<void> {
    await deleteDB(this.name(ownerId))
  }
}
```

- [ ] **Step 6: Run the domain and persistence suites**

Run:

```powershell
npm.cmd test -- src/features/notes/note.test.ts src/platform/database/indexedDbNotes.test.ts
npm.cmd run typecheck
```

Expected: 5 tests pass and typecheck exits 0. If fake IndexedDB reports a blocked delete, ensure every repository is closed in the test; do not add arbitrary sleeps.

- [ ] **Step 7: Commit the local domain and browser adapter**

```powershell
git add src/features/notes/note.ts src/features/notes/note.test.ts src/features/notes/noteRepository.ts src/platform/database/databaseFactory.ts src/platform/database/indexedDbNotes.ts src/platform/database/indexedDbNotes.test.ts
git commit -m "feat: add account-partitioned local notes"
```

### Task 3: Secure session storage and Supabase PKCE authentication adapter

**Files:**

- Create: `.env.example`
- Create: `src/platform/secureStorage.ts`
- Create: `src/features/auth/auth.ts`
- Create: `src/features/auth/supabaseAuth.ts`
- Create: `src/features/auth/supabaseAuth.test.ts`

**Interfaces:**

- Consumes: `@aparajita/capacitor-secure-storage`, Supabase `SupportedStorage`, Supabase PKCE, Capacitor Browser, and Capacitor Network.
- Produces: `SecureKeyValueStore`, `CapacitorSecureKeyValueStore`, `AuthRepository`, `AuthSnapshot`, `OAuthProvider`, `SupabaseAuthRepository`, and `createSupabaseAuthRepository()`.

- [ ] **Step 1: Define non-secret configuration and the secure-storage adapter**

Create `.env.example`:

```dotenv
VITE_SUPABASE_URL=https://project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example
VITE_AUTH_REDIRECT_URL=orosi://auth/callback
```

Create `src/platform/secureStorage.ts`:

```ts
import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import type { SupportedStorage } from '@supabase/supabase-js'

export interface SecureKeyValueStore extends SupportedStorage {
  clearNamespace(): Promise<void>
}

export class CapacitorSecureKeyValueStore implements SecureKeyValueStore {
  private readonly ready = SecureStorage.setKeyPrefix('orosi_')

  async getItem(key: string): Promise<string | null> {
    await this.ready
    return SecureStorage.getItem(key)
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.ready
    await SecureStorage.setItem(key, value)
  }

  async removeItem(key: string): Promise<void> {
    await this.ready
    await SecureStorage.removeItem(key)
  }

  async clearNamespace(): Promise<void> {
    await this.ready
    await SecureStorage.clear(false)
  }
}
```

The plugin uses iOS Keychain and Android Keystore-backed AES-GCM storage on native. Its web implementation is unencrypted localStorage and is permitted only for local browser development; no production web distribution is in scope.

- [ ] **Step 2: Define the authentication domain port**

Create `src/features/auth/auth.ts`:

```ts
export type OAuthProvider = 'google' | 'apple'

export type AuthSnapshot =
  | { status: 'checking' }
  | { status: 'signedOut'; reason?: 'first-login-online' | 'session-invalid' }
  | {
      status: 'signedIn'
      userId: string
      email: string | null
      offline: boolean
      lastValidatedAt: string
    }

export interface AuthRepository {
  bootstrap(): Promise<AuthSnapshot>
  signIn(provider: OAuthProvider): Promise<void>
  completeOAuth(callbackUrl: string): Promise<AuthSnapshot>
  signOut(): Promise<void>
  current(): AuthSnapshot
  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void
}

export interface NetworkPort {
  isConnected(): Promise<boolean>
}

export interface OAuthBrowserPort {
  open(url: string): Promise<void>
  close(): Promise<void>
}
```

- [ ] **Step 3: Write failing auth-adapter tests**

Create `src/features/auth/supabaseAuth.test.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SecureKeyValueStore } from '@/platform/secureStorage'
import type { NetworkPort, OAuthBrowserPort } from './auth'
import { SupabaseAuthRepository } from './supabaseAuth'

class MemorySecureStore implements SecureKeyValueStore {
  private readonly values = new Map<string, string>()
  async getItem(key: string) { return this.values.get(key) ?? null }
  async setItem(key: string, value: string) { this.values.set(key, value) }
  async removeItem(key: string) { this.values.delete(key) }
  async clearNamespace() { this.values.clear() }
}

function dependencies(connected: boolean) {
  const secure = new MemorySecureStore()
  const network: NetworkPort = { isConnected: async () => connected }
  const browser: OAuthBrowserPort = { open: vi.fn(async () => undefined), close: vi.fn(async () => undefined) }
  return { secure, network, browser }
}

describe('SupabaseAuthRepository', () => {
  it('unlocks offline from a previously validated secure marker', async () => {
    const { secure, network, browser } = dependencies(false)
    await secure.setItem(
      'offline-session',
      JSON.stringify({ userId: 'user-a', email: 'a@example.com', lastValidatedAt: '2026-07-22T03:00:00.000Z' }),
    )
    const client = {
      auth: { getSession: vi.fn(async () => ({ data: { session: null }, error: new Error('offline') })) },
    } as unknown as SupabaseClient

    const repository = new SupabaseAuthRepository(client, secure, network, browser, 'orosi://auth/callback')

    await expect(repository.bootstrap()).resolves.toEqual({
      status: 'signedIn',
      userId: 'user-a',
      email: 'a@example.com',
      offline: true,
      lastValidatedAt: '2026-07-22T03:00:00.000Z',
    })
  })

  it('clears the offline marker when the server definitively rejects the session', async () => {
    const { secure, network, browser } = dependencies(true)
    await secure.setItem(
      'offline-session',
      JSON.stringify({ userId: 'user-a', email: null, lastValidatedAt: '2026-07-22T03:00:00.000Z' }),
    )
    const error = Object.assign(new Error('invalid refresh token'), { status: 401 })
    const client = {
      auth: { getSession: vi.fn(async () => ({ data: { session: null }, error })) },
    } as unknown as SupabaseClient
    const repository = new SupabaseAuthRepository(client, secure, network, browser, 'orosi://auth/callback')

    await expect(repository.bootstrap()).resolves.toEqual({ status: 'signedOut', reason: 'session-invalid' })
    await expect(secure.getItem('offline-session')).resolves.toBeNull()
  })

  it('requires connectivity before opening OAuth', async () => {
    const { secure, network, browser } = dependencies(false)
    const client = { auth: {} } as unknown as SupabaseClient
    const repository = new SupabaseAuthRepository(client, secure, network, browser, 'orosi://auth/callback')

    await expect(repository.signIn('google')).rejects.toThrow('첫 로그인에는 인터넷 연결이 필요해요.')
    expect(browser.open).not.toHaveBeenCalled()
  })
})
```

Run:

```powershell
npm.cmd test -- src/features/auth/supabaseAuth.test.ts
```

Expected: FAIL because `SupabaseAuthRepository` does not exist.

- [ ] **Step 4: Implement Supabase PKCE auth behind the port**

Create `src/features/auth/supabaseAuth.ts`:

```ts
import { Browser } from '@capacitor/browser'
import { Network } from '@capacitor/network'
import {
  createClient,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js'
import { z } from 'zod'
import { CapacitorSecureKeyValueStore, type SecureKeyValueStore } from '@/platform/secureStorage'
import type {
  AuthRepository,
  AuthSnapshot,
  NetworkPort,
  OAuthBrowserPort,
  OAuthProvider,
} from './auth'

const MARKER_KEY = 'offline-session'

interface OfflineMarker {
  userId: string
  email: string | null
  lastValidatedAt: string
}

const environmentSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  VITE_AUTH_REDIRECT_URL: z.string().startsWith('orosi://'),
})

function fromSession(session: Session, offline: boolean, validatedAt: string): AuthSnapshot {
  return {
    status: 'signedIn',
    userId: session.user.id,
    email: session.user.email ?? null,
    offline,
    lastValidatedAt: validatedAt,
  }
}

function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined
  return typeof error.status === 'number' ? error.status : undefined
}

export class SupabaseAuthRepository implements AuthRepository {
  private snapshot: AuthSnapshot = { status: 'checking' }
  private readonly listeners = new Set<(snapshot: AuthSnapshot) => void>()

  constructor(
    private readonly client: SupabaseClient,
    private readonly secure: SecureKeyValueStore,
    private readonly network: NetworkPort,
    private readonly browser: OAuthBrowserPort,
    private readonly redirectUrl: string,
  ) {}

  current(): AuthSnapshot { return this.snapshot }

  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private publish(snapshot: AuthSnapshot): AuthSnapshot {
    this.snapshot = snapshot
    this.listeners.forEach((listener) => listener(snapshot))
    return snapshot
  }

  private async readMarker(): Promise<OfflineMarker | null> {
    const value = await this.secure.getItem(MARKER_KEY)
    if (!value) return null
    try {
      const marker = JSON.parse(value) as OfflineMarker
      return marker.userId && marker.lastValidatedAt ? marker : null
    } catch {
      await this.secure.removeItem(MARKER_KEY)
      return null
    }
  }

  private async remember(session: Session, validatedAt: string): Promise<void> {
    const marker: OfflineMarker = {
      userId: session.user.id,
      email: session.user.email ?? null,
      lastValidatedAt: validatedAt,
    }
    await this.secure.setItem(MARKER_KEY, JSON.stringify(marker))
  }

  async bootstrap(): Promise<AuthSnapshot> {
    const connected = await this.network.isConnected()
    const marker = await this.readMarker()
    const { data, error } = await this.client.auth.getSession()

    if (data.session) {
      const validatedAt = connected ? new Date().toISOString() : marker?.lastValidatedAt ?? new Date().toISOString()
      if (connected) await this.remember(data.session, validatedAt)
      return this.publish(fromSession(data.session, !connected, validatedAt))
    }

    const status = statusOf(error)
    if (connected && (status === 400 || status === 401 || status === 403)) {
      await this.secure.removeItem(MARKER_KEY)
      return this.publish({ status: 'signedOut', reason: 'session-invalid' })
    }

    if (marker) {
      return this.publish({ status: 'signedIn', ...marker, offline: true })
    }

    return this.publish({ status: 'signedOut', reason: 'first-login-online' })
  }

  async signIn(provider: OAuthProvider): Promise<void> {
    if (!(await this.network.isConnected())) {
      throw new Error('첫 로그인에는 인터넷 연결이 필요해요.')
    }
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: this.redirectUrl, skipBrowserRedirect: true },
    })
    if (error) throw error
    if (!data.url) throw new Error('로그인 주소를 열 수 없어요. 다시 시도해 주세요.')
    await this.browser.open(data.url)
  }

  async completeOAuth(callbackUrl: string): Promise<AuthSnapshot> {
    const code = new URL(callbackUrl).searchParams.get('code')
    if (!code) throw new Error('로그인 응답에 인증 코드가 없어요.')
    const { data, error } = await this.client.auth.exchangeCodeForSession(code)
    await this.browser.close()
    if (error) throw error
    const validatedAt = new Date().toISOString()
    await this.remember(data.session, validatedAt)
    return this.publish(fromSession(data.session, false, validatedAt))
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut({ scope: 'local' })
    if (error) throw error
    await this.secure.removeItem(MARKER_KEY)
    this.publish({ status: 'signedOut', reason: 'first-login-online' })
  }
}

export function createSupabaseAuthRepository(environment: Record<string, unknown>): AuthRepository {
  const config = environmentSchema.parse(environment)
  const secure = new CapacitorSecureKeyValueStore()
  const client = createClient(config.VITE_SUPABASE_URL, config.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
      storage: secure,
    },
  })
  const network: NetworkPort = {
    isConnected: async () => (await Network.getStatus()).connected,
  }
  const browser: OAuthBrowserPort = {
    open: async (url) => Browser.open({ url }),
    close: async () => Browser.close(),
  }
  return new SupabaseAuthRepository(client, secure, network, browser, config.VITE_AUTH_REDIRECT_URL)
}
```

- [ ] **Step 5: Verify authentication contracts and secret hygiene**

Run:

```powershell
npm.cmd test -- src/features/auth/supabaseAuth.test.ts
npm.cmd run typecheck
rg -n "service_role|refresh_token|access_token|console\.(log|debug)" src .env.example
```

Expected: 3 auth tests pass; typecheck exits 0; `rg` returns no matches. The Supabase publishable key name is allowed; a service-role secret is not.

- [ ] **Step 6: Commit secure authentication**

```powershell
git add .env.example package.json package-lock.json src/platform/secureStorage.ts src/features/auth/auth.ts src/features/auth/supabaseAuth.ts src/features/auth/supabaseAuth.test.ts
git commit -m "feat: add secure PKCE authentication port"
```

### Task 4: Authentication gate, platform login UI, and protected app shell

**Files:**

- Create: `src/app/dependencies.ts`
- Create: `src/app/runtime.ts`
- Create: `src/features/auth/AuthGate.tsx`
- Create: `src/features/auth/AuthGate.test.tsx`
- Create: `src/features/auth/LoginScreen.tsx`
- Create: `src/test/fakeAuth.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/app/styles.css`
- Modify: `src/main.tsx`

**Interfaces:**

- Consumes: `AuthRepository`, `LocalDatabaseFactory`, `createSupabaseAuthRepository()`, and `IndexedDbDatabaseFactory`.
- Produces: `AppDependencies`, `PlatformKind`, `createRuntimeDependencies()`, `attachOAuthCallback()`, `AuthGate`, and a protected three-tab shell receiving the authenticated `userId`.

- [ ] **Step 1: Define app composition and a production-excluded fake auth adapter**

Create `src/app/dependencies.ts`:

```ts
import type { AuthRepository } from '@/features/auth/auth'
import type { LocalDatabaseFactory } from '@/platform/database/databaseFactory'

export type PlatformKind = 'android' | 'ios' | 'web'

export interface AppDependencies {
  auth: AuthRepository
  databases: LocalDatabaseFactory
  platform: PlatformKind
  now(): string
  newId(): string
}
```

Create `src/test/fakeAuth.ts`:

```ts
import type { AuthRepository, AuthSnapshot, OAuthProvider } from '@/features/auth/auth'

export class FakeAuthRepository implements AuthRepository {
  readonly signInCalls: OAuthProvider[] = []
  signOutCalls = 0
  private listeners = new Set<(snapshot: AuthSnapshot) => void>()

  constructor(private snapshot: AuthSnapshot) {}

  current() { return this.snapshot }
  async bootstrap() { return this.snapshot }
  async signIn(provider: OAuthProvider) { this.signInCalls.push(provider) }
  async completeOAuth() { return this.snapshot }
  async signOut() { this.signOutCalls += 1; this.emit({ status: 'signedOut', reason: 'first-login-online' }) }
  subscribe(listener: (snapshot: AuthSnapshot) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  emit(snapshot: AuthSnapshot) {
    this.snapshot = snapshot
    this.listeners.forEach((listener) => listener(snapshot))
  }
}
```

Production code must never import `@/test/fakeAuth`; Task 7 adds an automated assertion.

- [ ] **Step 2: Write failing authentication-gate tests**

Create `src/features/auth/AuthGate.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FakeAuthRepository } from '@/test/fakeAuth'
import { AuthGate } from './AuthGate'

describe('AuthGate', () => {
  it('does not render protected content before authentication', async () => {
    const auth = new FakeAuthRepository({ status: 'signedOut', reason: 'first-login-online' })
    render(
      <AuthGate auth={auth} platform="android">
        {() => <div>개인 노트</div>}
      </AuthGate>,
    )

    expect(await screen.findByRole('button', { name: 'Google로 계속하기' })).toBeVisible()
    expect(screen.queryByText('개인 노트')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apple로 계속하기' })).not.toBeInTheDocument()
  })

  it('offers Apple and Google on iOS and sends the selected provider', async () => {
    const user = userEvent.setup()
    const auth = new FakeAuthRepository({ status: 'signedOut' })
    render(<AuthGate auth={auth} platform="ios">{() => <div />}</AuthGate>)

    await user.click(await screen.findByRole('button', { name: 'Apple로 계속하기' }))
    await user.click(screen.getByRole('button', { name: 'Google로 계속하기' }))
    expect(auth.signInCalls).toEqual(['apple', 'google'])
  })

  it('renders protected content and an offline status for a cached session', async () => {
    const auth = new FakeAuthRepository({
      status: 'signedIn',
      userId: 'user-a',
      email: null,
      offline: true,
      lastValidatedAt: '2026-07-22T03:00:00.000Z',
    })
    render(
      <AuthGate auth={auth} platform="android">
        {(session) => <div>사용자 {session.userId}의 개인 노트</div>}
      </AuthGate>,
    )

    expect(await screen.findByText('사용자 user-a의 개인 노트')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('오프라인에서도 이 기기의 노트를 편집할 수 있어요.')
  })
})
```

Run `npm.cmd test -- src/features/auth/AuthGate.test.tsx`.

Expected: FAIL because `AuthGate` does not exist.

- [ ] **Step 3: Implement the login screen and auth gate**

Create `src/features/auth/LoginScreen.tsx`:

```tsx
import { useState } from 'react'
import type { OAuthProvider } from './auth'
import type { PlatformKind } from '@/app/dependencies'

export function LoginScreen({
  platform,
  onSignIn,
}: {
  platform: PlatformKind
  onSignIn(provider: OAuthProvider): Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function start(provider: OAuthProvider) {
    setBusy(true)
    setError(null)
    try {
      await onSignIn(provider)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '로그인을 시작하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title" className="wordmark">orosi</h1>
        <p>필요한 부분만 가져와, 내 방식으로 기억하세요.</p>
        <div className="auth-actions">
          <button disabled={busy} onClick={() => void start('google')}>Google로 계속하기</button>
          {platform === 'ios' && (
            <button disabled={busy} onClick={() => void start('apple')}>Apple로 계속하기</button>
          )}
        </div>
        {error && <p role="alert" className="error-message">{error}</p>}
        <p className="supporting-copy">처음 로그인할 때만 인터넷 연결이 필요해요.</p>
      </section>
    </main>
  )
}
```

Create `src/features/auth/AuthGate.tsx`:

```tsx
import { useEffect, useState, type ReactNode } from 'react'
import type { PlatformKind } from '@/app/dependencies'
import type { AuthRepository, AuthSnapshot } from './auth'
import { LoginScreen } from './LoginScreen'

type SignedIn = Extract<AuthSnapshot, { status: 'signedIn' }>

export function AuthGate({
  auth,
  platform,
  children,
}: {
  auth: AuthRepository
  platform: PlatformKind
  children(session: SignedIn): ReactNode
}) {
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(auth.current())

  useEffect(() => {
    const unsubscribe = auth.subscribe(setSnapshot)
    void auth.bootstrap().then(setSnapshot)
    return unsubscribe
  }, [auth])

  if (snapshot.status === 'checking') {
    return <main className="loading-screen" role="status">노트를 안전하게 여는 중이에요…</main>
  }

  if (snapshot.status === 'signedOut') {
    return <LoginScreen platform={platform} onSignIn={(provider) => auth.signIn(provider)} />
  }

  return (
    <>
      {snapshot.offline && (
        <div className="offline-banner" role="status">
          오프라인에서도 이 기기의 노트를 편집할 수 있어요.
        </div>
      )}
      {children(snapshot)}
    </>
  )
}
```

Run `npm.cmd test -- src/features/auth/AuthGate.test.tsx`.

Expected: 3 tests pass.

- [ ] **Step 4: Write the protected-shell test**

Replace `src/app/App.test.tsx` with:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createPrivateNote } from '@/features/notes/note'
import { IndexedDbDatabaseFactory } from '@/platform/database/indexedDbNotes'
import { FakeAuthRepository } from '@/test/fakeAuth'
import { App } from './App'

describe('protected Orosi shell', () => {
  it('shows the three navigation destinations only after login', async () => {
    const auth = new FakeAuthRepository({
      status: 'signedIn',
      userId: 'user-a',
      email: 'a@example.com',
      offline: false,
      lastValidatedAt: '2026-07-22T03:00:00.000Z',
    })
    const databases = new IndexedDbDatabaseFactory('orosi-app-test-shell')
    render(
      <App dependencies={{
        auth,
        databases,
        platform: 'android',
        now: () => '2026-07-22T03:00:00.000Z',
        newId: () => 'note-a',
      }} />,
    )

    expect(await screen.findByRole('navigation', { name: '주요 메뉴' })).toBeVisible()
    expect(screen.getByRole('button', { name: '내 노트' })).toBeVisible()
    expect(screen.getByRole('button', { name: '둘러보기' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: '설정' })).toBeVisible()
  })

  it('warns before logout and clears the account partition after confirmation', async () => {
    const user = userEvent.setup()
    const auth = new FakeAuthRepository({
      status: 'signedIn', userId: 'user-a', email: null, offline: false,
      lastValidatedAt: '2026-07-22T03:00:00.000Z',
    })
    const databases = new IndexedDbDatabaseFactory('orosi-app-test-logout')
    const repository = await databases.open('user-a')
    await repository.put(createPrivateNote('user-a', '2026-07-22T03:00:00.000Z', 'note-a'))
    await repository.close()
    const destroy = vi.spyOn(databases, 'destroy')
    render(<App dependencies={{
      auth, databases, platform: 'android',
      now: () => '2026-07-22T03:00:00.000Z', newId: () => 'note-b',
    }} />)
    await user.click(await screen.findByRole('button', { name: '설정' }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: '이 기기에서 로그아웃' }))

    await waitFor(() => expect(auth.signOutCalls).toBe(1))
    await waitFor(() => expect(destroy).toHaveBeenCalledWith('user-a'))
    await destroy.mock.results[0].value
    const reopened = await databases.open('user-a')
    await expect(reopened.list('active')).resolves.toEqual([])
    await reopened.close()
    await databases.destroy('user-a')
  })
})
```

Run `npm.cmd test -- src/app/App.test.tsx`.

Expected: FAIL because `App` does not accept dependencies or render the shell.

- [ ] **Step 5: Implement runtime composition, OAuth deep-link completion, and shell**

Create `src/app/runtime.ts`:

```ts
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { createSupabaseAuthRepository } from '@/features/auth/supabaseAuth'
import { IndexedDbDatabaseFactory } from '@/platform/database/indexedDbNotes'
import type { AppDependencies, PlatformKind } from './dependencies'

export function createRuntimeDependencies(): AppDependencies {
  return {
    auth: createSupabaseAuthRepository(import.meta.env),
    databases: new IndexedDbDatabaseFactory(),
    platform: Capacitor.getPlatform() as PlatformKind,
    now: () => new Date().toISOString(),
    newId: () => crypto.randomUUID(),
  }
}

export async function attachOAuthCallback(dependencies: AppDependencies): Promise<() => Promise<void>> {
  const handle = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    if (url.startsWith('orosi://auth/callback')) void dependencies.auth.completeOAuth(url)
  })
  return () => handle.remove()
}
```

Replace `src/app/App.tsx` with:

```tsx
import { useState } from 'react'
import type { AppDependencies } from './dependencies'
import { AuthGate } from '@/features/auth/AuthGate'

type Tab = 'notes' | 'settings'

export function App({ dependencies }: { dependencies: AppDependencies }) {
  const [tab, setTab] = useState<Tab>('notes')

  async function logout(userId: string) {
    const confirmed = window.confirm(
      '동기화되지 않은 노트는 이 기기에서 삭제될 수 있어요. 로그아웃할까요?',
    )
    if (!confirmed) return
    await dependencies.auth.signOut()
    await dependencies.databases.destroy(userId)
  }

  return (
    <AuthGate auth={dependencies.auth} platform={dependencies.platform}>
      {(session) => (
        <main className="app-shell">
          <header className="app-header">
            <span className="wordmark">orosi</span>
          </header>
          <section className="screen-content">
            {tab === 'notes' ? (
              <div><h1>내 노트</h1><p>나만의 암기 포인트를 기록해 보세요.</p></div>
            ) : (
              <div>
                <h1>설정</h1>
                <p>{session.email ?? '로그인된 계정'}</p>
                <button onClick={() => void logout(session.userId)}>이 기기에서 로그아웃</button>
              </div>
            )}
          </section>
          <nav className="bottom-nav" aria-label="주요 메뉴">
            <button aria-current={tab === 'notes' ? 'page' : undefined} onClick={() => setTab('notes')}>내 노트</button>
            <button aria-disabled="true" disabled>둘러보기</button>
            <button aria-current={tab === 'settings' ? 'page' : undefined} onClick={() => setTab('settings')}>설정</button>
          </nav>
        </main>
      )}
    </AuthGate>
  )
}
```

Replace `src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { attachOAuthCallback, createRuntimeDependencies } from '@/app/runtime'
import '@/app/styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Orosi root element is missing')
const root = createRoot(rootElement)

try {
  const dependencies = createRuntimeDependencies()
  void attachOAuthCallback(dependencies)
  root.render(<StrictMode><App dependencies={dependencies} /></StrictMode>)
} catch {
  root.render(
    <main className="configuration-error">
      <h1>앱 설정을 확인해 주세요.</h1>
      <p>로그인 연결 정보가 아직 이 빌드에 설정되지 않았어요.</p>
    </main>,
  )
}
```

Append these rules to `src/app/styles.css`:

```css
.auth-screen, .loading-screen, .configuration-error { display: grid; min-height: 100vh; place-items: center; padding: 24px; }
.auth-card { width: min(100%, 420px); padding: 28px; border: 1px solid #d9d4ca; border-radius: 24px; background: #fffdf8; }
.auth-actions { display: grid; gap: 12px; margin-top: 28px; }
.auth-actions button, .bottom-nav button { border: 0; border-radius: 14px; padding: 12px 16px; }
.auth-actions button { color: white; background: var(--sage); }
.supporting-copy { color: #56635e; font-size: 0.875rem; }
.error-message { color: var(--danger); }
.offline-banner { padding: 8px 16px; color: var(--ink); background: var(--public-mint); text-align: center; }
.app-shell { min-height: 100vh; padding-bottom: calc(72px + env(safe-area-inset-bottom)); }
.app-header { display: flex; align-items: center; min-height: 56px; padding: 12px 20px; border-bottom: 1px solid #ded8ce; }
.screen-content { padding: 20px; }
.bottom-nav { position: fixed; right: 0; bottom: 0; left: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 8px 12px calc(8px + env(safe-area-inset-bottom)); background: #fffdf8; border-top: 1px solid #ded8ce; }
.bottom-nav button { color: var(--ink); background: transparent; }
.bottom-nav button[aria-current="page"] { color: white; background: var(--sage); }
.bottom-nav button[aria-disabled="true"] { color: #8b918e; }
```

The disabled Discover destination is intentional in this independently reviewable slice. Slice 4 enables the same shell destination; it is not reachable as an empty or misleading screen.

- [ ] **Step 6: Verify the auth boundary and protected shell**

Run:

```powershell
npm.cmd test -- src/features/auth/AuthGate.test.tsx src/app/App.test.tsx
npm.cmd run typecheck
npm.cmd run lint
```

Expected: 4 tests pass; typecheck and lint exit 0. The shell test database may be destroyed in an `afterEach` if a later assertion opens it; this task does not open it yet.

- [ ] **Step 7: Commit the authenticated shell**

```powershell
git add src/app src/features/auth/AuthGate.tsx src/features/auth/AuthGate.test.tsx src/features/auth/LoginScreen.tsx src/test/fakeAuth.ts src/main.tsx
git commit -m "feat: gate Orosi shell behind authentication"
```

### Task 5: Basic Tiptap editor and complete local private-note lifecycle

**Files:**

- Create: `src/test/memoryNotes.ts`
- Create: `src/features/notes/NoteEditorScreen.tsx`
- Create: `src/features/notes/NotesScreen.tsx`
- Create: `src/features/notes/NotesScreen.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/styles.css`

**Interfaces:**

- Consumes: `PrivateNote`, `PrivateNoteRepository`, `LocalDatabaseFactory`, `createPrivateNote()`, `editPrivateNote()`, `moveToTrash()`, and `restoreFromTrash()`.
- Produces: `NoteEditorScreen` with 400 ms local autosave and close-time flush, plus `NotesScreen` with active/search/trash/restore/permanent-delete flows.

- [ ] **Step 1: Create a test-only in-memory database factory**

Create `src/test/memoryNotes.ts`:

```ts
import type { PrivateNote } from '@/features/notes/note'
import { assertOwned, type NoteList, type PrivateNoteRepository } from '@/features/notes/noteRepository'
import type { LocalDatabaseFactory } from '@/platform/database/databaseFactory'

class MemoryNoteRepository implements PrivateNoteRepository {
  constructor(readonly ownerId: string, private readonly notes: Map<string, PrivateNote>) {}

  async list(location: NoteList, query = '') {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    return [...this.notes.values()]
      .filter((note) => location === 'trash' ? note.deletedAt !== null : note.deletedAt === null)
      .filter((note) => !normalized || [note.title, note.derivedText, ...note.tags]
        .join(' ').toLocaleLowerCase('ko-KR').includes(normalized))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((note) => structuredClone(note))
  }
  async get(id: string) { return structuredClone(this.notes.get(id) ?? null) }
  async put(note: PrivateNote) { assertOwned(this, note); this.notes.set(note.id, structuredClone(note)) }
  async deletePermanently(id: string) { this.notes.delete(id) }
  async purgeExpired(now: string) {
    const expired = [...this.notes.values()].filter((note) => note.purgeAfter && note.purgeAfter <= now)
    expired.forEach((note) => this.notes.delete(note.id))
    return expired.length
  }
  async close() {}
}

export class MemoryDatabaseFactory implements LocalDatabaseFactory {
  private readonly accounts = new Map<string, Map<string, PrivateNote>>()

  async open(ownerId: string): Promise<PrivateNoteRepository> {
    const notes = this.accounts.get(ownerId) ?? new Map<string, PrivateNote>()
    this.accounts.set(ownerId, notes)
    return new MemoryNoteRepository(ownerId, notes)
  }

  async destroy(ownerId: string) { this.accounts.delete(ownerId) }
}
```

- [ ] **Step 2: Write the failing local-note vertical-flow tests**

Create `src/features/notes/NotesScreen.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryDatabaseFactory } from '@/test/memoryNotes'
import { NotesScreen } from './NotesScreen'

describe('NotesScreen local lifecycle', () => {
  function renderNotes() {
    const databases = new MemoryDatabaseFactory()
    render(
      <NotesScreen
        ownerId="user-a"
        databases={databases}
        now={() => '2026-07-22T03:00:00.000Z'}
        newId={() => 'note-a'}
      />,
    )
    return databases
  }

  it('creates, flushes on close, and reopens a private Tiptap note', async () => {
    const user = userEvent.setup()
    renderNotes()

    await user.click(await screen.findByRole('button', { name: '새 노트' }))
    await user.clear(screen.getByRole('textbox', { name: '노트 제목' }))
    await user.type(screen.getByRole('textbox', { name: '노트 제목' }), '시험이 아닌 내 기준')
    await user.type(screen.getByRole('textbox', { name: '노트 내용' }), '내가 기억할 한 문장')
    await user.click(screen.getByRole('button', { name: '닫기' }))

    await user.click(await screen.findByRole('button', { name: '시험이 아닌 내 기준 열기' }))
    expect(screen.getByRole('textbox', { name: '노트 내용' })).toHaveTextContent('내가 기억할 한 문장')
  })

  it('moves a note to Trash, restores it, then permanently deletes it', async () => {
    const user = userEvent.setup()
    renderNotes()
    await user.click(await screen.findByRole('button', { name: '새 노트' }))
    await user.click(screen.getByRole('button', { name: '닫기' }))

    const activeCard = await screen.findByRole('article', { name: '제목 없는 노트' })
    await user.click(within(activeCard).getByRole('button', { name: '휴지통으로 이동' }))
    await user.click(screen.getByRole('button', { name: '휴지통 보기' }))
    const trashCard = await screen.findByRole('article', { name: '제목 없는 노트' })
    await user.click(within(trashCard).getByRole('button', { name: '복원' }))
    expect(screen.queryByRole('article', { name: '제목 없는 노트' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '내 노트 보기' }))
    const restoredCard = await screen.findByRole('article', { name: '제목 없는 노트' })
    await user.click(within(restoredCard).getByRole('button', { name: '휴지통으로 이동' }))
    await user.click(screen.getByRole('button', { name: '휴지통 보기' }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(within(await screen.findByRole('article', { name: '제목 없는 노트' }))
      .getByRole('button', { name: '영구 삭제' }))
    expect(screen.queryByRole('article', { name: '제목 없는 노트' })).not.toBeInTheDocument()
  })
})
```

Run `npm.cmd test -- src/features/notes/NotesScreen.test.tsx`.

Expected: FAIL because `NotesScreen` does not exist.

- [ ] **Step 3: Implement the StarterKit editor with debounced local commit and close flush**

Create `src/features/notes/NoteEditorScreen.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { editPrivateNote, type NoteDocument, type PrivateNote } from './note'

export function NoteEditorScreen({
  note,
  now,
  onSave,
  onClose,
}: {
  note: PrivateNote
  now(): string
  onSave(note: PrivateNote): Promise<void>
  onClose(): void
}) {
  const [title, setTitle] = useState(note.title)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveChain = useRef<Promise<boolean>>(Promise.resolve(true))
  const saveAttempt = useRef(0)
  const latest = useRef<{ title: string; document: NoteDocument }>({ title: note.title, document: note.document })

  const editor = useEditor({
    extensions: [StarterKit],
    content: note.document,
    editorProps: { attributes: { 'aria-label': '노트 내용', role: 'textbox' } },
    onUpdate: ({ editor: current }) => {
      latest.current.document = current.getJSON() as NoteDocument
      scheduleSave()
    },
  })

  function persist(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current)
    setSaveState('saving')
    const attempt = ++saveAttempt.current
    const change = structuredClone(latest.current)
    saveChain.current = saveChain.current.then(async () => {
      try {
        await onSave(editPrivateNote(note, { ...change, now: now() }))
        if (attempt === saveAttempt.current) setSaveState('saved')
        return true
      } catch {
        if (attempt === saveAttempt.current) setSaveState('error')
        return false
      }
    })
    return saveChain.current
  }

  function scheduleSave() {
    if (timer.current) clearTimeout(timer.current)
    setSaveState('saving')
    timer.current = setTimeout(() => void persist(), 400)
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  async function close() {
    if (await persist()) onClose()
  }

  return (
    <section className="editor-screen" aria-label="개인 노트 편집기">
      <header className="editor-header">
        <button onClick={() => void close()}>닫기</button>
        <span role="status">
          {saveState === 'saved' && '기기에 저장됨'}
          {saveState === 'saving' && '저장 중…'}
          {saveState === 'error' && '아직 저장하지 못했어요.'}
        </span>
      </header>
      <input
        aria-label="노트 제목"
        className="note-title-input"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
          latest.current.title = event.target.value
          scheduleSave()
        }}
      />
      <EditorContent className="basic-editor" editor={editor} />
      {saveState === 'error' && (
        <div className="save-error" role="alert">
          <p>작성 중인 내용은 화면에 그대로 있어요.</p>
          <button onClick={() => void persist()}>다시 저장</button>
        </div>
      )}
    </section>
  )
}
```

Do not capture `editor.getJSON()` only at close; `latest` preserves the in-memory draft when a write rejects. Slice 2 adds Markdown recovery/export to the same error panel.

- [ ] **Step 4: Implement list, local search, Trash, restore, and permanent delete**

Create `src/features/notes/NotesScreen.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react'
import type { LocalDatabaseFactory } from '@/platform/database/databaseFactory'
import { createPrivateNote, moveToTrash, restoreFromTrash, type PrivateNote } from './note'
import type { NoteList, PrivateNoteRepository } from './noteRepository'
import { NoteEditorScreen } from './NoteEditorScreen'

export function NotesScreen({
  ownerId,
  databases,
  now,
  newId,
}: {
  ownerId: string
  databases: LocalDatabaseFactory
  now(): string
  newId(): string
}) {
  const [repository, setRepository] = useState<PrivateNoteRepository | null>(null)
  const [notes, setNotes] = useState<PrivateNote[]>([])
  const [location, setLocation] = useState<NoteList>('active')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<PrivateNote | null>(null)

  const refresh = useCallback(async (repo: PrivateNoteRepository, list = location, search = query) => {
    setNotes(await repo.list(list, search))
  }, [location, query])

  useEffect(() => {
    let open = true
    let current: PrivateNoteRepository | null = null
    void databases.open(ownerId).then(async (repo) => {
      current = repo
      if (!open) { await repo.close(); return }
      await repo.purgeExpired(now())
      if (open) {
        setRepository(repo)
        setNotes(await repo.list('active', ''))
      }
    })
    return () => { open = false; if (current) void current.close() }
  }, [databases, now, ownerId])

  async function create() {
    if (!repository) return
    const note = createPrivateNote(ownerId, now(), newId())
    await repository.put(note)
    setSelected(note)
  }

  async function save(note: PrivateNote) {
    if (!repository) throw new Error('Local notes are not ready')
    await repository.put(note)
    setSelected(note)
  }

  async function trash(note: PrivateNote) {
    if (!repository) return
    await repository.put(moveToTrash(note, now()))
    await refresh(repository)
  }

  async function restore(note: PrivateNote) {
    if (!repository) return
    await repository.put(restoreFromTrash(note, now()))
    await refresh(repository)
  }

  async function permanentlyDelete(note: PrivateNote) {
    if (!repository || !window.confirm('이 노트는 복구할 수 없어요. 영구 삭제할까요?')) return
    await repository.deletePermanently(note.id)
    await refresh(repository)
  }

  async function changeLocation(next: NoteList) {
    if (!repository) return
    setLocation(next)
    await refresh(repository, next, query)
  }

  async function search(next: string) {
    setQuery(next)
    if (repository) await refresh(repository, location, next)
  }

  if (selected) {
    return <NoteEditorScreen note={selected} now={now} onSave={save} onClose={() => {
      setSelected(null)
      if (repository) void refresh(repository)
    }} />
  }

  return (
    <section aria-labelledby="notes-title">
      <div className="notes-heading">
        <h1 id="notes-title">{location === 'active' ? '내 노트' : '휴지통'}</h1>
        {location === 'active' && <button onClick={() => void create()} disabled={!repository}>새 노트</button>}
      </div>
      <div className="notes-filters">
        <button aria-pressed={location === 'active'} onClick={() => void changeLocation('active')}>내 노트 보기</button>
        <button aria-pressed={location === 'trash'} onClick={() => void changeLocation('trash')}>휴지통 보기</button>
      </div>
      <label className="search-field">내 노트 검색
        <input type="search" value={query} onChange={(event) => void search(event.target.value)} />
      </label>
      <div className="note-list">
        {notes.map((note) => (
          <article key={note.id} className="note-card" aria-label={note.title}>
            <button className="note-open" aria-label={`${note.title} 열기`} onClick={() => setSelected(note)}>
              <strong>{note.title}</strong><span>{note.derivedText || '내용을 적어 보세요.'}</span>
            </button>
            {location === 'active' ? (
              <button onClick={() => void trash(note)}>휴지통으로 이동</button>
            ) : (
              <div><button onClick={() => void restore(note)}>복원</button><button onClick={() => void permanentlyDelete(note)}>영구 삭제</button></div>
            )}
          </article>
        ))}
        {repository && notes.length === 0 && <p>여기에 표시할 노트가 없어요.</p>}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Connect the note screen to the authenticated shell**

Replace `src/app/App.tsx` with this complete file:

```tsx
import { useState } from 'react'
import { AuthGate } from '@/features/auth/AuthGate'
import { NotesScreen } from '@/features/notes/NotesScreen'
import type { AppDependencies } from './dependencies'

type Tab = 'notes' | 'settings'

export function App({ dependencies }: { dependencies: AppDependencies }) {
  const [tab, setTab] = useState<Tab>('notes')

  async function logout(userId: string) {
    const confirmed = window.confirm(
      '동기화되지 않은 노트는 이 기기에서 삭제될 수 있어요. 로그아웃할까요?',
    )
    if (!confirmed) return
    await dependencies.auth.signOut()
    await dependencies.databases.destroy(userId)
  }

  return (
    <AuthGate auth={dependencies.auth} platform={dependencies.platform}>
      {(session) => (
        <main className="app-shell">
          <header className="app-header"><span className="wordmark">orosi</span></header>
          <section className="screen-content">
            {tab === 'notes' ? (
              <NotesScreen
                ownerId={session.userId}
                databases={dependencies.databases}
                now={dependencies.now}
                newId={dependencies.newId}
              />
            ) : (
              <div>
                <h1>설정</h1>
                <p>{session.email ?? '로그인된 계정'}</p>
                <button onClick={() => void logout(session.userId)}>이 기기에서 로그아웃</button>
              </div>
            )}
          </section>
          <nav className="bottom-nav" aria-label="주요 메뉴">
            <button aria-current={tab === 'notes' ? 'page' : undefined} onClick={() => setTab('notes')}>내 노트</button>
            <button aria-disabled="true" disabled>둘러보기</button>
            <button aria-current={tab === 'settings' ? 'page' : undefined} onClick={() => setTab('settings')}>설정</button>
          </nav>
        </main>
      )}
    </AuthGate>
  )
}
```

Append to `src/app/styles.css`:

```css
.notes-heading, .notes-filters, .editor-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.notes-filters { justify-content: flex-start; margin-bottom: 16px; }
.search-field { display: grid; gap: 6px; color: #56635e; }
.search-field input, .note-title-input { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #c9c5bd; border-radius: 12px; background: #fffdf8; color: var(--ink); }
.note-list { display: grid; gap: 12px; margin-top: 16px; }
.note-card { display: grid; gap: 8px; padding: 14px; border: 1px solid #ded8ce; border-radius: 16px; background: #fffdf8; }
.note-open { display: grid; gap: 4px; width: 100%; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; }
.note-open span { overflow: hidden; color: #56635e; text-overflow: ellipsis; white-space: nowrap; }
.editor-screen { position: fixed; inset: 0; z-index: 10; display: grid; grid-template-rows: auto auto 1fr auto; gap: 12px; padding: calc(12px + env(safe-area-inset-top)) 16px 16px; background: var(--ivory); }
.note-title-input { font-size: 1.35rem; font-weight: 700; }
.basic-editor { min-height: 0; overflow: auto; padding: 12px; border: 1px solid #ded8ce; border-radius: 16px; background: #fffdf8; }
.basic-editor .tiptap { min-height: 50vh; outline: none; }
.save-error { padding: 12px; border: 1px solid var(--danger); border-radius: 12px; background: #fff4f2; }
```

- [ ] **Step 6: Verify the offline private-note vertical**

Run:

```powershell
npm.cmd test -- src/features/notes/note.test.ts src/platform/database/indexedDbNotes.test.ts src/features/notes/NotesScreen.test.tsx src/app/App.test.tsx
npm.cmd run typecheck
npm.cmd run lint
```

Expected: all focused suites pass. The vertical-flow test proves content is persisted before close returns and can be reopened without any network adapter.

- [ ] **Step 7: Commit the private-note user flow**

```powershell
git add src/features/notes src/test/memoryNotes.ts src/app/App.tsx src/app/styles.css
git commit -m "feat: add offline private note lifecycle"
```

### Task 6: Encrypted native SQLite adapter and runtime selection

**Files:**

- Create: `src/platform/database/migrations/001_notes.sql`
- Create: `src/platform/database/sqliteDriver.ts`
- Create: `src/platform/database/sqliteNotes.ts`
- Create: `src/platform/database/sqliteNotes.test.ts`
- Modify: `src/app/runtime.ts`

**Interfaces:**

- Consumes: `PrivateNoteRepository`, `LocalDatabaseFactory`, `SQLiteConnection`, `CapacitorSQLite`, and the account ID from the authenticated session.
- Produces: `SqlDriver`, `SqliteNoteRepository`, and `CapacitorSqliteDatabaseFactory`; runtime selects it only when `Capacitor.isNativePlatform()` is true.

- [ ] **Step 1: Create the native schema migration**

Create `src/platform/database/migrations/001_notes.sql`:

```sql
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  document_json TEXT NOT NULL,
  derived_text TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  base_revision INTEGER NOT NULL DEFAULT 0,
  sync_state TEXT NOT NULL CHECK (sync_state IN ('pending', 'synced', 'error')),
  deleted_at TEXT,
  purge_after TEXT
);

CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS notes_deleted_at_idx ON notes(deleted_at);
PRAGMA user_version = 1;
```

- [ ] **Step 2: Define the narrow SQL driver and native encrypted factory**

Create `src/platform/database/sqliteDriver.ts`:

```ts
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'
import type { LocalDatabaseFactory } from './databaseFactory'
import migration001 from './migrations/001_notes.sql?raw'
import { SqliteNoteRepository } from './sqliteNotes'

export interface SqlDriver {
  execute(statements: string): Promise<void>
  run(statement: string, values?: unknown[]): Promise<number>
  query<T extends Record<string, unknown>>(statement: string, values?: unknown[]): Promise<T[]>
  close(): Promise<void>
}

class CapacitorSqlDriver implements SqlDriver {
  constructor(private readonly connection: SQLiteDBConnection) {}

  async execute(statements: string) {
    await this.connection.execute(statements, true)
  }
  async run(statement: string, values: unknown[] = []) {
    const result = await this.connection.run(statement, values, true)
    return result.changes?.changes ?? 0
  }
  async query<T extends Record<string, unknown>>(statement: string, values: unknown[] = []) {
    const result = await this.connection.query(statement, values)
    return (result.values ?? []) as T[]
  }
  async close() { await this.connection.close() }
}

function databaseName(ownerId: string): string {
  if (!/^[A-Za-z0-9-]{1,128}$/.test(ownerId)) throw new Error('Invalid local account id')
  return `orosi_${ownerId.replaceAll('-', '')}`
}

function randomPassphrase(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

export class CapacitorSqliteDatabaseFactory implements LocalDatabaseFactory {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite)

  async open(ownerId: string) {
    const name = databaseName(ownerId)
    const exists = await this.sqlite.isDatabase(name)
    const hasSecret = await this.sqlite.isSecretStored()
    if (exists && !hasSecret) {
      throw new Error('암호화 키를 찾을 수 없어 로컬 노트를 열지 않았어요.')
    }
    if (!hasSecret) await this.sqlite.setEncryptionSecret(randomPassphrase())

    const connection = await this.sqlite.createConnection(name, true, 'secret', 1, false)
    await connection.open()
    const driver = new CapacitorSqlDriver(connection)
    await driver.execute(migration001)
    return new SqliteNoteRepository(ownerId, driver)
  }

  async destroy(ownerId: string) {
    const name = databaseName(ownerId)
    if (await this.sqlite.isConnection(name, false)) await this.sqlite.closeConnection(name, false)
    if (await this.sqlite.isDatabase(name)) await this.sqlite.deleteDatabase(name)
  }
}
```

The SQLite plugin's stored encryption secret is global to this app installation and is itself held by Keychain/Keystore. Do not duplicate the database passphrase in JavaScript storage or logs. If a database exists but its secret is missing, fail closed instead of creating a new secret and making the old data inaccessible.

- [ ] **Step 3: Write the failing SQLite repository contract test**

Create `src/platform/database/sqliteNotes.test.ts`:

```ts
import { createPrivateNote } from '@/features/notes/note'
import type { SqlDriver } from './sqliteDriver'
import { SqliteNoteRepository } from './sqliteNotes'

class RecordingDriver implements SqlDriver {
  readonly calls: Array<{ statement: string; values: unknown[] }> = []
  rows: Record<string, unknown>[] = []
  changes = 0
  async execute() {}
  async run(statement: string, values: unknown[] = []) {
    this.calls.push({ statement, values })
    return this.changes
  }
  async query<T extends Record<string, unknown>>(statement: string, values: unknown[] = []) {
    this.calls.push({ statement, values })
    return this.rows as T[]
  }
  async close() {}
}

describe('SqliteNoteRepository', () => {
  it('upserts an owned note as JSON without losing canonical fields', async () => {
    const driver = new RecordingDriver()
    const repository = new SqliteNoteRepository('user-a', driver)
    const note = createPrivateNote('user-a', '2026-07-22T03:00:00.000Z', 'note-a')

    await repository.put(note)

    expect(driver.calls[0].statement).toContain('INSERT INTO notes')
    expect(driver.calls[0].values).toContain(JSON.stringify(note.document))
    expect(driver.calls[0].values).toContain('user-a')
  })

  it('maps SQLite rows and enforces the account predicate', async () => {
    const driver = new RecordingDriver()
    driver.rows = [{
      id: 'note-a', owner_id: 'user-a', title: '내 노트',
      document_json: '{"type":"doc","content":[{"type":"paragraph"}]}',
      derived_text: '', tags_json: '[]', created_at: '2026-07-22T03:00:00.000Z',
      updated_at: '2026-07-22T03:00:00.000Z', base_revision: 0,
      sync_state: 'pending', deleted_at: null, purge_after: null,
    }]
    const repository = new SqliteNoteRepository('user-a', driver)

    await expect(repository.list('active')).resolves.toMatchObject([{ id: 'note-a', ownerId: 'user-a' }])
    expect(driver.calls[0].statement).toContain('owner_id = ?')
    expect(driver.calls[0].values[0]).toBe('user-a')
  })

  it('refuses a cross-account note before issuing SQL', async () => {
    const driver = new RecordingDriver()
    const repository = new SqliteNoteRepository('user-a', driver)

    await expect(repository.put(createPrivateNote('user-b', '2026-07-22T03:00:00.000Z')))
      .rejects.toThrow('Cross-account local note access is forbidden')
    expect(driver.calls).toHaveLength(0)
  })
})
```

Run `npm.cmd test -- src/platform/database/sqliteNotes.test.ts`.

Expected: FAIL because `SqliteNoteRepository` does not exist.

- [ ] **Step 4: Implement the SQLite repository**

Create `src/platform/database/sqliteNotes.ts`:

```ts
import type { NoteDocument, NoteSyncState, PrivateNote } from '@/features/notes/note'
import { assertOwned, type NoteList, type PrivateNoteRepository } from '@/features/notes/noteRepository'
import type { SqlDriver } from './sqliteDriver'

interface NoteRow extends Record<string, unknown> {
  id: string
  owner_id: string
  title: string
  document_json: string
  derived_text: string
  tags_json: string
  created_at: string
  updated_at: string
  base_revision: number
  sync_state: NoteSyncState
  deleted_at: string | null
  purge_after: string | null
}

function fromRow(row: NoteRow): PrivateNote {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    document: JSON.parse(row.document_json) as NoteDocument,
    derivedText: row.derived_text,
    tags: JSON.parse(row.tags_json) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    baseRevision: row.base_revision,
    syncState: row.sync_state,
    deletedAt: row.deleted_at,
    purgeAfter: row.purge_after,
  }
}

export class SqliteNoteRepository implements PrivateNoteRepository {
  constructor(readonly ownerId: string, private readonly driver: SqlDriver) {}

  async list(location: NoteList, query = ''): Promise<PrivateNote[]> {
    const deletedPredicate = location === 'trash' ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL'
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    const searchPredicate = normalized
      ? "AND LOWER(title || ' ' || derived_text || ' ' || tags_json) LIKE ?"
      : ''
    const values: unknown[] = [this.ownerId]
    if (normalized) values.push(`%${normalized}%`)
    const rows = await this.driver.query<NoteRow>(
      `SELECT * FROM notes WHERE owner_id = ? AND ${deletedPredicate} ${searchPredicate} ORDER BY updated_at DESC`,
      values,
    )
    return rows.map(fromRow)
  }

  async get(id: string): Promise<PrivateNote | null> {
    const rows = await this.driver.query<NoteRow>(
      'SELECT * FROM notes WHERE owner_id = ? AND id = ? LIMIT 1',
      [this.ownerId, id],
    )
    return rows[0] ? fromRow(rows[0]) : null
  }

  async put(note: PrivateNote): Promise<void> {
    assertOwned(this, note)
    await this.driver.run(
      `INSERT INTO notes (
        id, owner_id, title, document_json, derived_text, tags_json, created_at,
        updated_at, base_revision, sync_state, deleted_at, purge_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        document_json = excluded.document_json,
        derived_text = excluded.derived_text,
        tags_json = excluded.tags_json,
        updated_at = excluded.updated_at,
        base_revision = excluded.base_revision,
        sync_state = excluded.sync_state,
        deleted_at = excluded.deleted_at,
        purge_after = excluded.purge_after
      WHERE notes.owner_id = excluded.owner_id`,
      [
        note.id, note.ownerId, note.title, JSON.stringify(note.document), note.derivedText,
        JSON.stringify(note.tags), note.createdAt, note.updatedAt, note.baseRevision,
        note.syncState, note.deletedAt, note.purgeAfter,
      ],
    )
  }

  async deletePermanently(id: string): Promise<void> {
    await this.driver.run('DELETE FROM notes WHERE owner_id = ? AND id = ?', [this.ownerId, id])
  }

  async purgeExpired(now: string): Promise<number> {
    return this.driver.run(
      'DELETE FROM notes WHERE owner_id = ? AND purge_after IS NOT NULL AND purge_after <= ?',
      [this.ownerId, now],
    )
  }

  async close(): Promise<void> { await this.driver.close() }
}
```

- [ ] **Step 5: Select IndexedDB for browser and SQLCipher for native**

Replace `src/app/runtime.ts` with this complete file:

```ts
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { createSupabaseAuthRepository } from '@/features/auth/supabaseAuth'
import { IndexedDbDatabaseFactory } from '@/platform/database/indexedDbNotes'
import { CapacitorSqliteDatabaseFactory } from '@/platform/database/sqliteDriver'
import type { AppDependencies, PlatformKind } from './dependencies'

export function createRuntimeDependencies(): AppDependencies {
  return {
    auth: createSupabaseAuthRepository(import.meta.env),
    databases: Capacitor.isNativePlatform()
      ? new CapacitorSqliteDatabaseFactory()
      : new IndexedDbDatabaseFactory(),
    platform: Capacitor.getPlatform() as PlatformKind,
    now: () => new Date().toISOString(),
    newId: () => crypto.randomUUID(),
  }
}

export async function attachOAuthCallback(dependencies: AppDependencies): Promise<() => Promise<void>> {
  const handle = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    if (url.startsWith('orosi://auth/callback')) void dependencies.auth.completeOAuth(url)
  })
  return () => handle.remove()
}
```

- [ ] **Step 6: Verify both local repository adapters**

Run:

```powershell
npm.cmd test -- src/platform/database/indexedDbNotes.test.ts src/platform/database/sqliteNotes.test.ts
npm.cmd run typecheck
npm.cmd run lint
```

Expected: both adapter suites pass and expose the same repository contract. Native encryption itself is not claimed from jsdom; Task 7 and the final native smoke checklist verify the real plugin.

- [ ] **Step 7: Commit native encrypted storage**

```powershell
git add src/platform/database src/app/runtime.ts
git commit -m "feat: add encrypted native SQLite adapter"
```

### Task 7: Capacitor projects, native security configuration, CI, and slice evidence

**Files:**

- Create: `capacitor.config.ts`
- Create: `scripts/check-native-toolchain.mjs`
- Create: `scripts/check-production-boundaries.mjs`
- Generate and commit: `android/**`
- Generate and commit: `ios/**`
- Modify: `android/variables.gradle`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/main/res/xml/data_extraction_rules.xml`
- Modify: `ios/App/App/Info.plist`
- Create: `.github/workflows/quality.yml`
- Create: `docs/development.md`
- Create: `docs/verification/slice-1.md`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Consumes: web build output `dist/`, app ID `app.orosi.mobile`, callback URL `orosi://auth/callback`, encrypted `CapacitorSQLite`, and every prior test command.
- Produces: synchronized Android/iOS projects, deterministic native/tooling checks, CI evidence, and the Slice 1 review record.

- [ ] **Step 1: Add Capacitor configuration and deterministic repository checks**

Create `capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.orosi.mobile',
  appName: 'Orosi',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: true,
      iosKeychainPrefix: 'app.orosi.mobile',
      iosBiometric: { biometricAuth: false, biometricTitle: 'Orosi 잠금 해제' },
      androidIsEncryption: true,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: 'Orosi 잠금 해제',
        biometricSubTitle: '기기의 안전한 저장소를 사용해요.',
      },
    },
  },
}

export default config
```

Create `scripts/check-native-toolchain.mjs`:

```js
import { spawnSync } from 'node:child_process'

const result = spawnSync('java', ['-version'], { encoding: 'utf8', windowsHide: true })
const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
const match = output.match(/version "(\d+)(?:\.\d+)?/)

if (result.error || !match) {
  process.stderr.write('JDK 21 required; Java was not found or its version could not be read.\n')
  process.exit(1)
}

const major = Number(match[1])
if (major !== 21) {
  process.stderr.write(`JDK 21 required; found ${major}. Select a JDK 21 JAVA_HOME before Android builds.\n`)
  process.exit(1)
}

process.stdout.write('Native toolchain preflight passed: JDK 21.\n')
```

Create `scripts/check-production-boundaries.mjs`:

```js
import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const violations = []

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (path.replaceAll('\\', '/').endsWith('/src/test')) continue
      await scan(path)
      continue
    }
    if (!['.ts', '.tsx', '.js', '.mjs'].includes(extname(path)) || /\.test\.[^.]+$/.test(path)) continue
    const source = await readFile(path, 'utf8')
    if (source.includes('@/test/')) violations.push(`${path}: imports test-only code`)
    if (/service[_-]?role/i.test(source)) violations.push(`${path}: contains a service-role identifier`)
    if (/ca-app-pub-\d+/i.test(source)) violations.push(`${path}: contains an operational ad id`)
  }
}

await scan('src')
if (violations.length) {
  process.stderr.write(`${violations.join('\n')}\n`)
  process.exit(1)
}
process.stdout.write('Production boundary check passed.\n')
```

Modify the `scripts` object in `package.json` so `quality` and a new boundary command are exactly:

```json
"boundaries": "node scripts/check-production-boundaries.mjs",
"quality": "npm run format:check && npm run lint && npm run typecheck && npm test && npm run boundaries && npm run build"
```

- [ ] **Step 2: Prove the current Java mismatch is explicit**

Run on the current workstation before changing Java:

```powershell
npm.cmd run native:check
```

Expected current result: exit 1 with `JDK 21 required; found 17.` This is an expected precondition failure, not evidence that the app is broken.

Before executing Android compilation, obtain explicit approval for the system-level JDK change, then install the exact distribution:

```powershell
winget install --id EclipseAdoptium.Temurin.21.JDK --exact --silent --accept-package-agreements --accept-source-agreements
```

Open a new PowerShell process so the updated Java selection is visible, then run:

```powershell
java -version
npm.cmd run native:check
```

Expected: Java reports a 21.x release and the repository check prints `Native toolchain preflight passed: JDK 21.` If the user declines the system installation, keep Android compilation marked blocked and continue only with non-native verification; do not report Slice 1 complete.

- [ ] **Step 3: Generate the native projects from the committed web build**

Run:

```powershell
npm.cmd run build
npx.cmd cap add android
npx.cmd cap add ios
npx.cmd cap sync android
npx.cmd cap sync ios
```

Expected: `android/` and `ios/` are created; both platforms list all installed Capacitor plugins. On Windows, iOS generation/synchronization is evidence only; compilation and Keychain/OAuth tests remain a documented macOS gate.

- [ ] **Step 4: Apply exact Android platform and backup rules**

In `android/variables.gradle`, set these existing values exactly:

```gradle
minSdkVersion = 23
compileSdkVersion = 35
targetSdkVersion = 35
```

In the existing `<application>` element of `android/app/src/main/AndroidManifest.xml`, set:

```xml
android:allowBackup="false"
android:fullBackupContent="false"
android:dataExtractionRules="@xml/data_extraction_rules"
```

Inside the existing main `<activity>` element, add:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="orosi"
        android:host="auth"
        android:pathPrefix="/callback" />
</intent-filter>
```

Create `android/app/src/main/res/xml/data_extraction_rules.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="root" />
        <exclude domain="database" />
        <exclude domain="sharedpref" />
        <exclude domain="external" />
    </cloud-backup>
    <device-transfer>
        <exclude domain="root" />
        <exclude domain="database" />
        <exclude domain="sharedpref" />
        <exclude domain="external" />
    </device-transfer>
</data-extraction-rules>
```

- [ ] **Step 5: Register the exact iOS OAuth callback scheme**

Before the closing `</dict>` in `ios/App/App/Info.plist`, add:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>orosi</string>
        </array>
    </dict>
</array>
```

Run `npx.cmd cap sync ios` once more. Expected: the generated iOS project remains synchronized with no missing plugin declaration. Do not claim an iOS build on Windows.

- [ ] **Step 6: Add CI for the web gate and Android debug artifact**

Create `.github/workflows/quality.yml`:

```yaml
name: quality

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci --ignore-scripts
      - run: npm run quality

  android-debug:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
          cache: gradle
      - run: npm ci --ignore-scripts
      - run: npm run build
      - run: npx cap sync android
      - run: npm run native:check
      - run: chmod +x android/gradlew
      - working-directory: android
        run: ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with:
          name: orosi-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
```

The release-variant job is intentionally owned by Slice 6 because the approved release-candidate gate requires it, while this slice proves the native project and debug pipeline.

- [ ] **Step 7: Write development and verification documentation**

Create `docs/development.md`:

```markdown
# Orosi development

## Supported toolchain

- Node 24.x and npm 11.x
- Android builds: JDK 21, AGP 8.7.2, minSdk 23, compileSdk/targetSdk 35
- iOS compilation: macOS with the Capacitor 8-supported Xcode release

Run `npm run quality` before every review. Run `npm run native:check` before Android Gradle commands.

## Authentication configuration

Copy `.env.example` to `.env.local` and replace the example Supabase URL and publishable key. Never place a service-role key in a client file. Configure `orosi://auth/callback` as an allowed Supabase redirect URL. Google must be enabled for Android; Google and Apple must be enabled for iOS.

The application uses authorization-code PKCE. Supabase session material is persisted through native Keychain/Keystore storage. The web adapter is unencrypted localStorage and is for local development only. First login requires connectivity; after a successful validation, a secure marker can unlock local notes offline. A definitive server 400/401/403 rejection clears that marker and locks the vault without silently deleting local data.

## Local data

Native notes use encrypted SQLCipher SQLite. Browser development and automated browser tests use an account-partitioned IndexedDB adapter. `Saved on device` is shown only after `PrivateNoteRepository.put()` resolves. Android backups and device transfer exclude the database, preferences, and local files.

The SQLite dependency includes SQLCipher even when an unencrypted database is opened. Orosi opens encrypted databases, and distribution therefore requires an encryption-export compliance review and any applicable self-classification filing. No distribution claim is made by this repository stage.

## External configuration boundary

This repository does not create Supabase, Google, or Apple projects; buy accounts; submit stores; configure production signing; or enable production ads. Real OAuth smoke checks require user-supplied credentials. Contract tests and the test-only fake adapter never enter a production bundle.
```

Create `docs/verification/slice-1.md`:

```markdown
# Slice 1 verification: foundation, authentication, and local data

Date: 2026-07-22

## Automated commands

1. `npm ci --ignore-scripts` — exact lockfile installation.
2. `npm run quality` — formatting, lint, typecheck, unit/integration tests, production-boundary scan, and web build.
3. `npm run native:check` — JDK 21 prerequisite.
4. `npx cap sync android` — Android project/plugin synchronization.
5. `npx cap sync ios` — iOS project/plugin synchronization; not an iOS compilation claim on Windows.
6. `android/gradlew.bat assembleDebug` — local Android debug package after JDK 21 selection.

## Evidence required before marking the slice complete

- Git commit containing the exact package lock and generated native projects.
- Passing CI `web` and `android-debug` jobs.
- Focused tests prove the auth gate, Android/iOS provider presentation, offline cached-session unlock, definitive invalid-session lock, IndexedDB account isolation, SQLite owner predicates, note autosave/reopen, Trash restore, and permanent delete.
- Production boundary scan proves no production source imports `src/test`, no service-role identifier is present, and no operational ad ID exists.
- Android manifest and extraction rules prove local records are excluded from backup/device transfer.
- The APK artifact path is `android/app/build/outputs/apk/debug/app-debug.apk`.

## Explicitly deferred to later approved slices

- Full table/Markdown/image editor and Markdown recovery export: Slice 2.
- Remote note synchronization, RLS, revisions, and conflict copies: Slice 3.
- Publication/discovery/import/provenance: Slice 4.
- UGC moderation, blocking, reporting, and ads: Slice 5.
- Android release variant, device matrices, macOS iOS build, accessibility/performance evidence, and final release-candidate audit: Slice 6.
```

- [ ] **Step 8: Run final Slice 1 verification**

Run after JDK 21 is active:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run quality
npm.cmd run native:check
npx.cmd cap sync android
npx.cmd cap sync ios
Set-Location android
.\gradlew.bat assembleDebug
Set-Location ..
git status --short
```

Expected:

- `npm run quality` exits 0 with every test passing.
- boundary check prints `Production boundary check passed.`
- native check prints `Native toolchain preflight passed: JDK 21.`
- both Capacitor sync commands exit 0.
- Gradle prints `BUILD SUCCESSFUL` and creates `android/app/build/outputs/apk/debug/app-debug.apk`.
- `git status --short` lists only the intentional Task 7 files before commit.

Then push the branch and verify both GitHub Actions jobs pass. If real Supabase/Google/Apple credentials have not been supplied, record the real-provider smoke check as an external prerequisite for the later release gate; contract behavior may pass, but do not claim provider-console configuration.

- [ ] **Step 9: Commit and push the completed slice**

```powershell
git add package.json package-lock.json capacitor.config.ts scripts android ios .github/workflows/quality.yml docs/development.md docs/verification/slice-1.md
git commit -m "build: add native projects and slice one gates"
git push origin HEAD
```

Expected: the push succeeds and the remote quality workflow starts. Review the workflow result before declaring the slice complete.

## Plan self-review record

### Specification coverage

- Authentication gate, provider matrix, first-login connectivity, and cached offline access: Tasks 3-4.
- Calm Orosi brand and three-tab shell: Tasks 1 and 4.
- Private-by-default Tiptap canonical notes, local-first save, search, Trash, restore, 30-day purge, and permanent delete: Tasks 2 and 5.
- Account-partitioned IndexedDB and encrypted native SQLite: Tasks 2 and 6.
- Keychain/Keystore session storage, deep-link PKCE, no service-role secret, and local-only logout: Tasks 3-4.
- Android/iOS project baseline, backup exclusion, JDK/SDK constraints, CI, and evidence: Task 7.
- Tables, Markdown, assets, synchronization, publishing, imports, moderation, ads, and final release hardening are mapped to named later slices in the roadmap; none is silently removed.

### Placeholder scan

The executable steps contain no unresolved implementation markers, unspecified error handling, or unnamed tests. Example environment values are deliberately non-secret shapes and are rejected as real credentials by operational smoke testing.

### Type consistency

- `AppDependencies.auth` is `AuthRepository` from Task 3 in every consumer.
- `AppDependencies.databases` is `LocalDatabaseFactory`; IndexedDB, memory, and SQLite factories return the same `PrivateNoteRepository`.
- `PrivateNote.ownerId`, `document`, lifecycle fields, and repository method names match across domain, IndexedDB, memory, SQLite, UI, and tests.
- The callback URL is `orosi://auth/callback` in environment, Supabase options, runtime listener, Android intent filter, and iOS URL scheme.

## Authoritative references checked for this plan

- Supabase PKCE flow: `https://supabase.com/docs/guides/auth/sessions/pkce-flow`
- Supabase Google login: `https://supabase.com/docs/guides/auth/social-login/auth-google`
- Capacitor Community SQLite: `https://github.com/capacitor-community/sqlite`
- Capacitor secure storage: `https://github.com/aparajita/capacitor-secure-storage`
