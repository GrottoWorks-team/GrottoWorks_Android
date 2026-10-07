# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Broader, agent-agnostic rules also live in `AGENTS.md`.

## Project: GrottoWorks Mobile — Volunteer App

Expo (SDK 57) + React Native app for GrottoWorks — the mobile counterpart of the web SPA in `../grottoworks`. Volunteers view assignments and invites, browse and register for open tasks, respond to assignments (accept/decline + reason), submit photo evidence, track timesheets, read notifications, and manage their profile. Leader/admin work (materials, purchases, donations, approving registrations) belongs to the web app — do not build it here. Domain types and i18n keys mirror the web app.

Product constraints live in `PRODUCT.md`; UI and token rules live in the workspace `DESIGN_SYSTEM.md`.

## Expo/RN: do not trust your training data

Expo and React Native break APIs across releases. Read the `expo` version in `package.json` (currently `~57`), then fetch `https://docs.expo.dev/versions/v57.0.0/`. For anything else, use https://docs.expo.dev/llms.txt (index + LLM-misconception corrections) and follow its links. Prefer Context7 for React Navigation 7 / React Query 5 / i18next. Never write Expo APIs from memory.

## Commands

```bash
npm install                  # deps — npm only (package-lock.json v3; no bun/pnpm/yarn)
npm start                    # Metro dev server (Expo Go / emulator)
npm run android | ios | web  # start on a specific target
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint-config-expo (flat config)
npm run doctor               # expo-doctor dependency/config diagnostics
npx expo install <pkg>       # ALWAYS for RN/Expo packages — resolves SDK-57-compatible versions
npx expo install --fix       # align package versions with the SDK
```

Run `npm run typecheck` and `npm run lint` before declaring any task done. There is **no test script** — do not invent one or claim tests were run.

## Architecture

```text
index.ts → registerRootComponent(App)
App.tsx  → SafeAreaProvider → QueryClientProvider → AuthProvider → ToastProvider
         → NavigationContainer → RootNavigator
              ├─ no session → LoginScreen
              └─ session    → MainTabs: Tasks · Timesheets · Home · Notifications · Profile
src/api/hooks.ts → src/api/index.ts (mock) → src/mocks/db.ts (AsyncStorage) → src/mocks/seed.ts
```

- **Offline mock data — no HTTP and no MSW.** `src/api/index.ts` async functions read/write `src/mocks/db.ts` (AsyncStorage key `grotto-mobile-db-v2`, seeded deterministically by `src/mocks/seed.ts`). To adopt a real backend, replace the function bodies with `fetch` and keep signatures + hooks unchanged.
- **React Query is confined to `src/api/hooks.ts`**: tuple `keys`, `useQuery`/`useMutation`, and `invalidateQueries` on every mutation. Screens read through hooks only. Mock DB writes are `loadDb()` → mutate → `saveDb(db)`.
- **Session**: `src/auth/AuthContext.tsx` persists to AsyncStorage `grotto-mobile-session-v1`; `restoring` prevents a login flash on boot. Demo password `grotto`; accounts `volunteer@grottoworks.vn`, `volunteer2@grottoworks.vn`.
- **Navigation**: React Navigation v7 (native-stack + bottom-tabs). **Not Expo Router** — do not add `expo-router` or an `src/app/` route tree. Route params live in `src/navigation/types.ts` (`RootStackParamList`, `MainTabParamList`, `TasksStackParamList`, `ProfileStackParamList`); register new screens in their navigator (`TasksNavigator` / `ProfileNavigator` / `MainTabs` / `RootNavigator`).
- **Two distinct concepts — do not conflate.** `VolunteerReg` (`PENDING` → `APPROVED`/`REJECTED`) is the volunteer-initiated application; `TaskAssignment` (`PENDING`/`ACCEPTED`/`DECLINED`) is the leader-initiated invite. `assignees` is legacy data meaning ACCEPTED, overlaid by `assignments`.

## Conventions

- Strict TS; **relative imports** (no `@/` alias configured). Screens end in `Screen`, hooks are `useX`, components are PascalCase.
- Shared domain types + helpers (`taskAssignmentList`, `assignmentStatus`, `isOpenForRegistration`, `skillMatchScore`, …) live in `src/types/index.ts` — keep them in sync with the web app.
- Reuse `src/components` primitives; wrap every screen in `<Screen>` and use `ScreenHeader`.
- Styling via `StyleSheet.create` + tokens in `src/theme/tokens.ts` (`colors`/`radius`/`spacing`/`fontSize`/`elevation`). No hard-coded hex — the palette mirrors the web `tailwind.config.ts` (Golden Winter).
- i18n: flat keys in `src/locales/{vi,en}.json` (keySeparator off), `useTranslation()`, default `vi`. Add both `vi` + `en` entries; feedback via `useToast()`; statuses via `StatusTag`.
- Errors are thrown as `Error('CODE')` (e.g. `NOT_FOUND`, `ALREADY_ASSIGNED`, `ALREADY_REGISTERED`, `NOT_PENDING`) and mapped to translated messages in screens.

## Key Paths

`index.ts`, `App.tsx`, `src/api/index.ts`, `src/api/hooks.ts`, `src/auth/AuthContext.tsx`, `src/mocks/db.ts`, `src/mocks/seed.ts`, `src/navigation/types.ts`, `src/theme/tokens.ts`, `src/types/index.ts`, `src/lib/i18n.ts`, `app.json`.

## Tooling

npm (lockfile v3), Expo SDK 57, RN 0.86, React 19, TS 6, React Navigation 7, React Query 5, i18next 26, Node 20+. `ios/` + `android/` are generated (Continuous Native Generation) — never hand-edit; configure via `app.json` + config plugins. Native modules need a development build (`npx expo run:ios|android` or EAS). EAS runs as `npx eas-cli@latest`; there is no `eas.json` yet.

## Testing

No test runner is configured. Verify with `npm run typecheck` + `npm run lint` and a manual check in Expo Go/emulator; `npm run doctor` validates deps and native config. Reset persisted state with `resetDb()` (`src/mocks/db.ts`). Never claim tests passed.
