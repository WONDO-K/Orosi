# Orosi Slice 6-2 handoff: local release and iOS verification

This document starts after Slice 6-1. Do not commit signing keys, provisioning profiles, `.env.local`, `google-services.json`, or store API keys.

## 1. Prepare local configuration

1. Clone the repository and run `npm ci` with Node 24 and npm 11.
2. Copy `.env.example` to `.env.local`; insert only the Supabase URL and publishable key.
3. In Supabase SQL Editor or CLI, apply migrations in numerical order from `supabase/migrations`.
4. Configure `orosi://auth/callback` in Supabase Auth redirect URLs and create the Google/Apple OAuth providers.

## 2. Android release

1. Create a Play Console account and register `app.orosi.mobile`, or change the package ID before first upload.
2. Generate an upload keystore locally. Keep its passwords in a secret manager, not Git.
3. Add an untracked `android/keystore.properties` with `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`; configure Gradle `signingConfigs.release` to read it.
4. Run `npm run android:release`. Prefer an Android App Bundle (`bundleRelease`) for Play upload.
5. Enroll in Play App Signing, upload through internal testing first, then satisfy any closed-test requirement before production access.
6. Complete Data safety, account deletion, privacy policy, content rating, store listing, screenshots, and support contact details.

## 3. iOS macOS verification

1. Install a current Xcode, sign into the Apple Account that belongs to the Apple Developer team, and run `npm run cap:sync`.
2. Run `npx cap open ios`; set the final unique Bundle ID, Team, version, build number, and automatic signing in Xcode.
3. Confirm URL scheme `orosi://auth/callback`, Keychain storage, SQLite opening, Google OAuth callback, offline reopen, keyboard behavior, and image/file permissions on a real iPhone.
4. Archive in Xcode, upload to App Store Connect, distribute through TestFlight, then submit for App Review.
5. Complete App Privacy, age rating, support URL, privacy-policy URL, screenshots, review notes, and test account instructions if required.

## 4. Mandatory release smoke checklist

- New account login and offline reopen after one successful login
- Create/edit/search/table/image/Markdown recovery
- Cross-device sync, conflict copy, publish/unpublish, import provenance, report/block
- TalkBack and VoiceOver navigation; 200% text scaling; light/dark readability
- Privacy policy and community reporting links are live
- No production ad IDs until ad account, consent flow, and store policy review are approved

## 5. Useful commands

```bash
npm run quality
npm run test:e2e
npm run cap:sync
npm run android:release
npx cap open ios
```
