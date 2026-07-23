# orosi

나만의 관점으로 만드는 개인 암기 노트 앱입니다. 기본은 비공개 노트이며, 장기적으로는 다른 사용자의 공개 노트를 전체·문단·문장 단위로 가져와 내 노트로 자유롭게 다듬을 수 있습니다.

Orosi는 특정 시험에 종속되지 않습니다. 표, 서식, 태그, 로컬 우선 저장을 중심으로 어떤 학습 주제에도 쓸 수 있는 모바일 앱을 목표로 합니다.

## 현재 구현 상태

- 로그인 후 계정별 비공개 노트 생성·수정·휴지통·복원·영구 삭제
- Android/iOS Capacitor 프로젝트 및 Android 디버그 APK 빌드 검증
- 모바일 SQLite 우선 저장, 브라우저 개발 환경의 계정 분리 IndexedDB
- Tiptap 기반 서식, 목록, 할 일 목록, 표, undo/redo, 안정 블록 ID
- 태그 편집 및 제목·본문·태그 대상의 로컬 검색
- Markdown 소스 보기·적용 UI와 브라우저용 이미지 자산 저장 포트

아직 개발 중인 기능은 동기화·충돌 복사본, 공개/검색/가져오기/출처, 운영 도구와 광고, 네이티브 이미지 UI 연결입니다. 공개 기능이나 광고가 현재 앱에 활성화돼 있다고 가정하면 안 됩니다.

## 사용자 설명서

1. 앱을 열고 로그인합니다. 첫 로그인에는 인터넷 연결이 필요합니다.
2. **내 노트**에서 새 노트를 만듭니다. 저장은 기기에서 먼저 처리됩니다.
3. 제목, 태그(쉼표로 구분), 본문을 수정합니다.
4. 편집기 도구 모음에서 굵게, 기울임, 밑줄, 목록, 할 일, 표, 실행 취소/다시 실행을 사용합니다.
5. **Markdown**을 눌러 소스를 확인하거나 수정한 뒤 적용합니다. 변환에 실패해도 기존 리치 텍스트는 유지하는 방향으로 확장 중입니다.
6. 노트를 닫으면 저장이 완료된 뒤 목록으로 돌아갑니다. 필요 없는 노트는 휴지통으로 옮기고 30일 안에 복원할 수 있습니다.

## 개발 시작하기

### 요구 사항

- Node.js 24.x
- npm 11.x
- Android 빌드: JDK 21, Android SDK API 36, Build Tools 36.0.0
- iOS 빌드: macOS 및 Capacitor 8 호환 Xcode

```powershell
git clone https://github.com/WONDO-K/Orosi.git
cd Orosi
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`.env.local`에는 Supabase 프로젝트의 URL과 publishable key만 넣습니다. service-role key는 절대로 클라이언트 파일이나 환경 파일에 넣지 않습니다.

## 주요 명령

| 명령                      | 용도                                               |
| ------------------------- | -------------------------------------------------- |
| `npm run dev`             | 웹 개발 서버                                       |
| `npm run quality`         | 포맷, 린트, 타입, 테스트, 경계 검사, 프로덕션 빌드 |
| `npm run test`            | Vitest 테스트                                      |
| `npm run cap:sync`        | 웹 빌드 후 Android/iOS 프로젝트 동기화             |
| `npm run native:check`    | JDK 21 확인                                        |
| `npm run android:debug`   | Android 디버그 APK 빌드                            |
| `npm run android:release` | 서명 없는 Android 릴리스 빌드                      |

## 포팅 매뉴얼

### 웹에서 Android/iOS로 동기화

Capacitor 설정은 [capacitor.config.ts](capacitor.config.ts)에 있습니다. 앱 식별자는 `app.orosi.mobile`이고 웹 산출물은 `dist/`입니다.

```powershell
npm run cap:sync
```

웹 코드를 바꾼 뒤에는 반드시 동기화합니다. 네이티브 프로젝트 안에서 앱 아이콘, 서명, OAuth 설정처럼 플랫폼 고유 항목을 바꿨다면 동기화 후에도 해당 변경이 유지되는지 확인합니다.

### Android

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
$env:ANDROID_HOME='C:\Users\<user>\AppData\Local\Android\Sdk'
npm run native:check
npm run android:debug
```

APK는 `android/app/build/outputs/apk/debug/app-debug.apk`에 생성됩니다. Android는 백업과 기기 이전에서 데이터베이스·환경설정·앱 파일을 제외하도록 설정돼 있습니다. 실제 배포용 서명 키와 Play Console 작업은 저장소에서 관리하지 않습니다.

### iOS

Windows에서는 iOS 프로젝트 생성과 동기화까지만 지원합니다. 최종 빌드는 macOS에서 실행합니다.

```bash
npm run cap:sync
npx cap open ios
```

Xcode에서 팀, 서명, 번들 식별자, Google/Apple 로그인 구성을 지정하고 `orosi://auth/callback` URL scheme을 확인합니다. Keychain, SQLite 암호화, OAuth 콜백, 키보드, VoiceOver, 오프라인 재실행을 실기기에서 점검한 뒤 배포합니다.

## 환경·보안 경계

- 네이티브에서는 SQLCipher SQLite와 Keychain/Keystore 기반 보안 저장소를 사용합니다.
- 브라우저 IndexedDB와 localStorage 어댑터는 개발·자동 테스트용입니다.
- 개인 노트·태그·검색어는 광고나 공개 검색 인덱스에 보내지 않습니다.
- 실제 Supabase, Google, Apple 프로젝트 생성과 운영 광고 활성화, 스토어 제출은 별도 승인 작업입니다.

자세한 개발 환경과 인증 설정은 [docs/development.md](docs/development.md)를, Slice 1 검증 근거는 [docs/verification/slice-1.md](docs/verification/slice-1.md)를 참고하세요.

## 품질 기준

커밋 전에는 다음을 실행합니다.

```powershell
npm run quality
```

GitHub Actions는 웹 품질 검사와 Android 디버그 APK 빌드를 수행합니다. 현재 구현 범위와 이후 계획은 [Slice 2 계획](docs/plans/2026-07-23-editor-tables-markdown-assets.md)에 정리돼 있습니다.
