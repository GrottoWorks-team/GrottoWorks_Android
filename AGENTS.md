# Repository Guidelines

## Prompt Workflow

For every prompt, prioritize locating applicable skills; if none apply, continue without one.

## Project Overview

GrottoWorks Mobile is the **volunteer-facing** mobile app for the GrottoWorks parish Christmas-preparation system — the mobile counterpart of the web app in `../grottoworks`. A volunteer uses it to see assigned tasks and invites, browse and register for open tasks, respond to assignments (accept/decline with a reason), submit completion evidence (photos required), track timesheets, read activity notifications, and manage their profile.

Built with **Expo SDK 57 + React Native 0.86 + TypeScript + React Navigation v7 + React Query v5 + i18next**. Design tokens, domain types, and i18n keys are kept in sync with the web app — update both sides when the domain model changes.

Scope boundary: the web app owns planning, work areas, materials, purchases, donations, and the **leader-side approval** of volunteer registrations. This app owns the **volunteer half** of the self-registration flow. Do not reimplement leader/admin workflows here.

Use `PRODUCT.md` for product constraints (volunteer scope, season-based usage, offline-first, Golden Winter brand) and the workspace `DESIGN_SYSTEM.md` for UI and token rules.

## Expo & React Native versions — do not trust your training data

Expo ships breaking changes every SDK release, and React Native follows suit. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the installed version in `package.json` (currently `expo` ~57).
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v57.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

The package manager is **npm** — `package-lock.json` (lockfile v3) is present and there is no `bun.lock`, pnpm, or Yarn config. Do not switch package managers or reach for `bunx`.

```bash
npm install                 # install dependencies
npm start                   # start the Metro dev server (Expo Go / emulator)
npm run android             # start + open on Android
npm run ios                 # start + open on iOS (requires macOS)
npm run web                 # start the web target
npm run typecheck           # tsc --noEmit
npm run lint                # ESLint (eslint-config-expo flat config)
npm run doctor              # expo-doctor — dependency and config diagnostics

npx expo install <package>  # ALWAYS use instead of npm install for RN/Expo packages — resolves SDK-compatible versions
npx expo install --fix      # align incompatible package versions with the SDK
```

- Add native/Expo dependencies with `npx expo install`, never `npm install`, so versions match SDK 57.
- Run `npm run typecheck` and `npm run lint` before declaring any task done.
- With the dev server running, scan the QR code in Expo Go, or press `a` (Android) / `i` (iOS).

## Architecture & Data Flow

```text
index.ts (registerRootComponent)
  → App.tsx
    → SafeAreaProvider
      → QueryClientProvider (retry: 1, staleTime: 30s)
        → AuthProvider (AsyncStorage session)
          → ToastProvider (useToast)
            → NavigationContainer → RootNavigator
                ├─ no session → LoginScreen
                └─ session    → MainTabs (5 tabs, Home in the middle)
                                  Tasks(TasksNavigator) · Timesheets · Home · Notifications · Profile(ProfileNavigator)
```

- The app runs **fully offline with a mock data layer**. There is no HTTP client and no MSW. `src/api/index.ts` exposes async functions that read/write an AsyncStorage-backed mock DB (`src/mocks/db.ts`, key `grotto-mobile-db-v2`) seeded deterministically from `src/mocks/seed.ts`. To adopt a real backend, replace the function bodies in `src/api/index.ts` with `fetch` while keeping their signatures and the hooks intact.
- `src/api/hooks.ts` is the only place React Query is used: tuple query keys under `keys`, `useQuery` / `useMutation`, and `invalidateQueries` after every mutation. Screens consume these hooks and do not call `src/api` directly for reads.
- The session persists in AsyncStorage under `grotto-mobile-session-v1`. `AuthProvider` restores it on boot and exposes `restoring` so `RootNavigator` can show a spinner instead of flashing the login screen.
- Demo login: password is always `grotto`; accounts are `volunteer@grottoworks.vn` and `volunteer2@grottoworks.vn`.

## Navigation & Routing

- Navigation is **React Navigation v7** (`@react-navigation/native`, `native-stack`, `bottom-tabs`). **Expo Router is intentionally not used** — ignore Expo Router guidance, do not add `expo-router`, and do not create an `src/app/` route tree.
- Route param types live in `src/navigation/types.ts` (`RootStackParamList`, `MainTabParamList`, `TasksStackParamList`, `ProfileStackParamList`) and augment `ReactNavigation.RootParamList` for typed navigation. Add a new route there first, then register it in its navigator.
- `RootNavigator` switches between `Login` and `Main` based on auth state. `MainTabs` is the 5-tab bar (`Home` is the initial, middle tab). Nested stacks live in `TasksNavigator` and `ProfileNavigator`.
- Screens get typed navigation props; navigate with `navigation.navigate('TaskDetail', { taskId })` etc.

## Key Directories

- `src/features/auth/` — `LoginScreen`.
- `src/features/volunteer/` — volunteer screens: `HomeScreen`, `TaskListScreen`, `TaskDetailScreen`, `OpenTaskDetailScreen`, `TimesheetScreen`, `NotificationsScreen`, and `profile/` (`ProfileViewScreen`, `ProfileEditScreen`).
- `src/components/` — shared UI: `Screen` (SafeArea + signature gradient), `ScreenHeader`, `AppText`, `Button`, `Card`, `StatusTag`, `Avatar`, `Calendar`, `EmptyState`, `PhotoPicker`, `Snowfall`, `Toast`.
- `src/api/` — mock data layer (`index.ts`) and React Query hooks (`hooks.ts`).
- `src/mocks/` — `seed.ts` (deterministic sample data) and `db.ts` (AsyncStorage-backed mock DB).
- `src/navigation/` — navigators and route param types.
- `src/theme/tokens.ts` — Golden Winter design tokens (`colors`, `radius`, `spacing`, `fontSize`, `elevation`, `screenGradient`).
- `src/types/index.ts` — domain model plus domain helpers, synced with the web app.
- `src/lib/` — `i18n.ts` (i18next init) and `format.ts` (date/relative-time/VND helpers).
- `src/locales/{vi,en}.json` — flat-key translations.

## Code Conventions & Common Patterns

### TypeScript
- Strict TypeScript; `tsconfig.json` extends `expo/tsconfig.base`. **No `@/` alias is configured** — use relative imports.
- Keep shared domain interfaces, string unions, and domain helpers (`taskAssignmentList`, `assignmentStatus`, `isOpenForRegistration`, `skillMatchScore`) in `src/types/index.ts`. Mirror web-app changes there instead of forking types.
- Components are PascalCase, screens end in `Screen`, hooks start with `use`.

### Data and state
- Server/mock state lives in React Query; UI-only state stays in local `useState`. Add a key to `keys` and a `useX` hook in `src/api/hooks.ts`, and invalidate every affected key in the mutation's `onSuccess`.
- Errors are thrown as `Error('CODE')` (e.g. `NOT_FOUND`, `ALREADY_ASSIGNED`, `ALREADY_REGISTERED`, `NOT_PENDING`, `INVALID_CREDENTIALS`); screens map codes to translated messages.
- Mock DB writes are read-modify-write: `loadDb()` → mutate → `saveDb(db)` (`saveDb` also refreshes the in-memory cache).
- Do not conflate the two assignment concepts: `VolunteerReg` (`PENDING` → `APPROVED` / `REJECTED`) is the **volunteer-initiated application**; `TaskAssignment` (`PENDING` / `ACCEPTED` / `DECLINED`) is the **leader-initiated invite**. `assignees` is legacy data meaning ACCEPTED, overlaid by `assignments`.

### UI, theme, and i18n
- Reuse `src/components` primitives before adding new ones. Wrap every screen in `<Screen>` and use `ScreenHeader` for titles.
- Style with `StyleSheet.create` and tokens from `src/theme/tokens.ts`. Never hard-code brand hex values — pull from `colors`, `radius`, `spacing`, `fontSize`, `elevation`. The palette mirrors the web app's `tailwind.config.ts`.
- All user-facing text goes through `useTranslation()` / `t('key')` in both `vi.json` (default) and `en.json`. Keys are flat and literal (key separators are disabled) — e.g. `tasks.accept`, `status.DONE`. Avoid new user-facing string literals.
- Show feedback with `useToast()`. Render statuses with `StatusTag` and extend its `MAP`/`TONES` when adding statuses.

### Navigation
When adding a screen: add its param to the relevant list in `src/navigation/types.ts`, register it in its navigator (`TasksNavigator` / `ProfileNavigator` / `MainTabs` / `RootNavigator`), and add any needed i18n keys.

## Important Files

- `index.ts` — entry point (`registerRootComponent(App)`).
- `App.tsx` — provider tree (SafeArea → QueryClient → Auth → Toast → Navigation) and i18n bootstrap.
- `src/api/index.ts` — mock data layer; the single swap point for a real backend.
- `src/api/hooks.ts` — React Query keys, queries, mutations, invalidation.
- `src/auth/AuthContext.tsx` — session state and AsyncStorage persistence.
- `src/mocks/db.ts` / `src/mocks/seed.ts` — mock DB and deterministic seed data.
- `src/navigation/types.ts` — route contracts.
- `src/theme/tokens.ts` — design tokens.
- `src/types/index.ts` — domain model and helpers.
- `src/lib/i18n.ts` — i18next configuration.
- `app.json` — Expo config (scheme, bundle/package IDs, plugins, splash, image-picker permissions).
- `eslint.config.js` — `eslint-config-expo` flat config.

## Runtime/Tooling Preferences

- **npm only**; `package-lock.json` is present. The project is not declared ESM — Metro/Babel handles TS/JSX.
- Expo SDK 57, React Native 0.86, React 19, TypeScript 6, React Navigation 7, React Query 5, i18next 26.
- Node 20+ (required by the current Expo SDK).
- No `ios/` or `android/` directories are committed — native projects are generated (Continuous Native Generation). Never create or edit them by hand; configure native behavior in `app.json` and config plugins.
- Expo Go only bundles its own native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or an EAS development build.
- Prefer Expo-maintained modules over third-party libraries. Docs: https://docs.expo.dev/versions/latest/index.md

## Building & Shipping

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run the CLI as `npx eas-cli@latest <command>` (this is an npm project, not Bun), substituting it for bare `eas` in docs examples. There is currently **no `eas.json`** — do not assume an EAS profile exists. Docs: https://docs.expo.dev/eas/index.md

## Testing & QA

- **No test runner is configured** — there is no Jest/Vitest setup and no test script. Do not invent one and do not claim tests were run.
- Verification for a change means `npm run typecheck` + `npm run lint` pass, plus a manual check in Expo Go or an emulator. `npm run doctor` validates dependencies and native config.
- Because data persists in AsyncStorage, use the demo accounts and call `resetDb()` (exported from `src/mocks/db.ts`) when you need a clean state.

## Documentation / Context7

When code depends on a third-party library:

1. Check the installed version in `package.json` first.
2. Use Context7 or the library's official docs when API behavior, configuration, or version-specific usage is uncertain (Expo SDK 57, React Navigation 7, React Query 5, i18next).
3. Prefer documentation matching the installed major/minor version.
4. Do not introduce APIs or patterns solely from memory — this matters most for Expo, which breaks APIs between SDKs.

Context7 and official docs are references. They do not replace project conventions, `npm run typecheck`/`npm run lint`, or manual verification.

## Completion Reporting

Never report a task as completed based only on code changes. Distinguish:

- **Implemented** — code has been changed.
- **Verified** — `npm run typecheck` and `npm run lint` pass and the behavior was actually checked in the app (or state clearly that it was not).
- **Known issues** — remaining problems or limitations.

Do not claim tests passed — there is no test suite. Do not claim a feature works based only on a plan or specification.
