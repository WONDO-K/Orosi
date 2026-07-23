# Slice 6-1 verification evidence

## Scope completed in this environment

- Browser E2E runs in an isolated `VITE_E2E=true` runtime; production code does not import test helpers.
- The browser scenario creates a note, edits title/tags, saves, closes, searches, and verifies the result opens through accessible roles.
- The existing IndexedDB fixture covers 1,000 private notes searched by title, derived text, and tags.
- Editor controls expose labels/roles, global buttons retain 44px minimum touch targets, and horizontally dense editor/table controls scroll rather than clip.
- Ad policy is code-only: non-personalized, first slot after eight organic cards and then every twenty cards. No production ad ID exists in source.

## Commands and evidence

```powershell
npm run test:e2e
npm run quality
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
$env:ANDROID_HOME='C:\Users\<user>\AppData\Local\Android\Sdk'
npm run android:release
```

The E2E run on 2026-07-23 passed: `creates, saves, searches, and opens a private note with keyboard-accessible controls`.

## Remaining external release gates

- Apply `supabase/migrations` to a real Supabase project and perform two-user RLS smoke tests.
- Create release signing credentials and enroll the store accounts.
- Complete physical-device accessibility checks (TalkBack/VoiceOver, text scaling) and privacy/store metadata reviews.
