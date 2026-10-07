# Product

<!-- impeccable:product-schema 1 -->

## Platform

mobile

## Stack

Expo SDK 57 + React Native 0.86 + TypeScript + React Navigation 7 (native-stack + bottom-tabs) + React Query 5. Navigation is React Navigation **by request** — Expo Router is intentionally not used.
Mock layer: an in-app mock DB persisted to AsyncStorage (`src/mocks/db.ts`, `src/mocks/seed.ts`) — the mobile replacement for the web app's MSW + localStorage. No HTTP client is present; `src/api/index.ts` is the single swap point for a real backend.
i18n: react-i18next with Vietnamese default and English fallback; keys are shared with the web app.
Design tokens (Golden Winter) are mirrored from the web `tailwind.config.ts` in `src/theme/tokens.ts`.

## Users

One mobile role: **Volunteer** (`VOLUNTEER`) — parish members who do the hands-on Christmas preparation work. Mixed ages and digital literacy, on their personal phones, often on site and one-handed.

A volunteer can:
- see the tasks they are assigned to and invites awaiting a response;
- discover tasks still recruiting volunteers and apply for them;
- respond to a leader invite (accept, or decline with a reason);
- submit evidence of completion (at least one photo) for leader review;
- check in and out of work shifts and request a timesheet correction;
- read activity notifications about their own work;
- view and edit their profile (skills, weekly availability).

The four web roles (Parish Committee, Work Area Leader, Material & Contribution Officer, System Administrator) are **out of scope** for this app — they live in the web build (`../grottoworks`). Mobile owns the **volunteer half** of the self-registration flow; the leader-side approval sits on the web.

## Product Purpose

Give volunteers one pocket-sized place to know what they need to do, commit to open work, prove it is done, and see the hours and recognition they earned — so preparation no longer depends on chat groups and verbal announcements for the people doing the work.

## Positioning

The volunteer's mobile companion to GrottoWorks: task discovery, commitment, evidence, and timesheets — always at hand and offline-tolerant.

## Operating Context

- Season-based usage: activity peaks Sep–Dec before Christmas, with final reporting after.
- Used on phones in the field (parish grounds, grotto site): one-handed, outdoors, with intermittent signal — the app is offline-first with local persistence.
- Volunteers are assigned by a work-area leader and may respond to invites or self-register for open tasks.
- Work spans five area types (grotto, tree, lighting, church yard, stage) and the parish skill set (electrical, carpentry, welding, decoration, transport, logistics, painting).

## Capabilities and Constraints

Confirmed (implemented across 5 tabs):
- **Tasks** — two sub-tabs: *My tasks* (filter by status, detail view, accept/decline an invite with a reason, submit completion for review) and *Recruiting* (open tasks sorted by skill-match score, apply with a note, cancel a pending application).
- **Timesheets** — monthly calendar marking days with logged hours or due work; pick a day to see its hours and due tasks; check in/out of shifts; request a correction.
- **Home** (middle, initial tab) — week hours, pending invites, my applications, suggested open tasks, work in progress.
- **Notifications** — activity related to the volunteer (assignment invites, registration results, hours logged).
- **Profile** — read view (avatar by personal hue, name/email, points and total hours, skills, weekly availability, app version) plus an edit screen for skills/availability; sign out.

Domain rules:
- Two distinct, non-interchangeable concepts: `VolunteerReg` (`PENDING` → `APPROVED` / `REJECTED`) is the **volunteer-initiated application**; `TaskAssignment` (`PENDING` / `ACCEPTED` / `DECLINED`) is the **leader-initiated invite**. `assignees` is legacy data meaning ACCEPTED, overlaid by `assignments`.
- A task is open for registration only while its status is neither `DONE` nor `REVIEW` and accepted assignees < volunteers needed.
- Submitting for review requires at least one evidence photo.

Non-functional (inherited from the shared product): summaries load quickly; plain Vietnamese labels and large touch targets for low-digital-literacy users; documents/photos linked to the correct task.

## Brand Commitments

Name: **GrottoWorks**. No logo or brand assets yet beyond the app icon and splash screen.
**Visual direction: "Golden Winter"** — the same tokens as the web app (`DESIGN_SYSTEM.md` mục 37). Pine-green primary `#0A5C36` (hover `#0D7344`, light `#E8F5E9`), champagne-gold accent `#EEB902`, warm gold `#F4A261`, canvas `#F8F9FA`, ink `#2B2D42`, dark-mode-free light UI. Status is communicated as glyph + color (`StatusTag`). Each screen carries the signature gradient that fades from a soft green into the canvas. Warm, communal, trustworthy — not corporate-cold, not festival decoration.

## Evidence on Hand

- Capstone project register docx (FA26SE067) — the product source of truth, shared with the web build.
- `DESIGN_SYSTEM.md` (Golden Winter) — UI/UX and token source covering both web and mobile.
- No real data, photos, or testimonials yet — mock data must be plausible Vietnamese parish data, clearly non-production.

## Product Principles

1. **Danh mục rõ ràng hơn dòng chat** — every screen answers "việc của tôi là gì, còn thiếu ai, đến đâu rồi" at a glance.
2. **Usability cho mọi độ tuổi** — large touch targets, plain Vietnamese labels, no hidden gestures; complexity lives in data, not in the interface.
3. **Minh bạch tới giờ cuối cùng** — logged hours and recognition points trace back to the shift that produced them.
4. **Một mùa, một sự thật** — the current season is the spine; historical seasons stay queryable for reports.
5. **Offline-first** — a volunteer's work must not depend on a live connection.

## Accessibility & Inclusion

Mixed-age, low-digital-literacy audience: readable base font sizes from the token scale, WCAG-minded contrast, generous touch targets, clear status labels, and reduced-motion respected.
