# Orosi development

## Supported toolchain

- Node 24.x and npm 11.x
- Android builds: JDK 21, AGP 8.13.0, minSdk 24, compileSdk/targetSdk 36
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
