# Slice 1 verification: foundation, authentication, and local data

Date: 2026-07-23

## Automated commands

1. `npm ci --ignore-scripts`: exact lockfile installation.
2. `npm run quality`: formatting, lint, typecheck, unit/integration tests, production-boundary scan, and web build.
3. `npm run native:check`: JDK 21 prerequisite.
4. `npx cap sync android`: Android project/plugin synchronization.
5. `npx cap sync ios`: iOS project/plugin synchronization; not an iOS compilation claim on Windows.
6. `android/gradlew.bat assembleDebug`: local Android debug package after JDK 21 and Android SDK selection.

## Local evidence

- `npm run quality` passed on 2026-07-23: 10 test files and 36 tests passed; formatting, lint, typecheck, production-boundary scan, and production build also passed.
- `npm run native:check` passed with Eclipse Temurin JDK 21.0.11.
- Android and iOS synchronization found the same five native plugins: secure storage, SQLite, App, Browser, and Network.
- Android `assembleDebug` passed with API 36 and Build Tools 36.0.0. The generated APK is 25,375,394 bytes at `android/app/build/outputs/apk/debug/app-debug.apk`.
- Android backup and device-transfer exclusions, plus the `orosi://auth/callback` Android and iOS registrations, were verified in the generated native projects.
- iOS was generated and synchronized on Windows; an iOS compilation is intentionally not claimed.
- Capacitor 8.4.2 generates minSdk 24 and compileSdk/targetSdk 36. These generated supported values replace the earlier pre-generation assumption of minSdk 23 and SDK 35.
- GitHub Actions run `29971703463` passed on 2026-07-23: both the `web` quality gate and the `android-debug` APK job succeeded.

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
