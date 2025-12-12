# AI Nutritionist — Step-by-Step TODO (MVP)

> This is a developer-oriented, step-by-step checklist to build the mobile-optimized ReactJS AI Nutritionist MVP. Tasks are grouped by phase and ordered by priority. Each task includes brief notes, acceptance criteria, and suggested implementation pointers.

---

## Phase 0 — Project Setup & Planning

1. **Create repository & project board**
   - Create GitHub repo, add README, license, .gitignore
   - Create project board (To do / In progress / Review / Done)
   - Acceptance: Repo exists and is shared with collaborators.

2. **Define tech stack & architecture**
   - ReactJS (V18+), Vite or Create React App, React Router
   - TailwindCSS for styling
   - IndexedDB (via idb) and LocalStorage for persistence
   - PWA setup for offline
   - AI: Ollama / LM Studio for local; OpenAI / Gemini for online
   - Acceptance: Documented architecture diagram and decisions in repo.

3. **Design simple wireframes & user flows**
   - Onboarding, Home, Capture/Upload, Edit Detection, Meal Summary, Profile, Settings
   - Acceptance: PNG or Figma links saved in repo.

4. **Define data model**
   - UserProfile, MedicalInfo, Meal, FoodItem, NutrientProfile, Settings
   - Acceptance: JSON schema or TypeScript interfaces committed.

---

## Phase 1 — Core App Skeleton (MVP UI)

1. **Bootstrap app**
   - Initialize project with Vite + React + TypeScript (suggested)
   - Install TailwindCSS, React Router, idb
   - Acceptance: App runs locally and shows placeholder Home screen.

2. **Add global state & storage layer**
   - Implement a simple state management (React Context + hooks)
   - Implement a storage adapter that uses IndexedDB for large objects and LocalStorage for flags
   - Acceptance: Can save/load a sample profile to IndexedDB.

3. **Responsive mobile-first layout**
   - Implement mobile-first responsive layout and global styles
   - Acceptance: Layout matches basic wireframes on mobile widths.

4. **Onboarding & Getting Started screens**
   - Screens: Welcome, Body details (height, weight, age, sex, activity), Medical conditions screen, Privacy info
   - Include skip options
   - Acceptance: Can fill and save a profile locally; skipping uses defaults.

5. **Home screen skeleton**
   - Buttons for Take Photo, Upload Meal, Manual Entry, Quick history
   - Acceptance: Navigation between screens works.

---

## Phase 2 — Meal Input & Storage

1. **Implement camera & upload UI**
   - Use input type=file with accept attributes and camera capture attribute
   - Handle image preview and basic resizing
   - Acceptance: Can capture or upload image and store it in IndexedDB.

2. **Manual entry UI**
   - Input fields for food name, serving size, quantity
   - Autocomplete from local lightweight DB
   - Acceptance: Manual meals saved and displayed in history.

3. **Meal history & local export/import**
   - Show list of meals, filter by date
   - Export: JSON download containing profiles, meals, settings
   - Import: Validate JSON and merge or replace
   - Acceptance: Import/export tested end-to-end.

---

## Phase 3 — AI Integration & Food Detection

1. **Prototype online AI call**
   - Implement a configurable API client for OpenAI and/or Gemini
   - Create a simple endpoint wrapper that sends image (or descriptive text) and receives predicted food items and confidence
   - Acceptance: When online, the app can call the API and receive predicted labels.

2. **Prototype local AI (Ollama / LM Studio)**
   - Add support for local inference endpoints (configurable base URL)
   - Document how to run a local model and connect the app for dev/test
   - Acceptance: App can call a local Ollama/LM Studio instance and receive predictions.

3. **Image preprocessing in browser**
   - Resize, normalize, and optionally crop images before sending
   - Acceptance: Image payloads are under limits and detections remain accurate.

4. **Food detection review & edit UI**
   - Show AI-detected items with confidence and allow users to edit/replace/add items
   - Acceptance: Edited items are saved to meal record.

5. **Nutrient lookup & hybrid DB**
   - Implement local lightweight nutrient DB (common foods + Filipino dishes)
   - Implement an optional online detailed DB fetcher for micronutrients when online
   - Acceptance: Meal nutrient summary computed from combined sources.

---

## Phase 4 — Personalization & Health Logic

1. **Daily needs calculator**
   - Implement Mifflin St Jeor and other formulas; allow manual override
   - Account for activity level and goals (maintain, lose, gain)
   - Acceptance: Each profile has a computed recommended daily calories/macros.

2. **Health conditions & warnings engine**
   - Store conditions (diabetes, hypertension, kidney disease, allergies)
   - Implement rule-based warnings (e.g., high sodium, high sugar)
   - Acceptance: Warnings surfaced on meal summary when conditions trigger them.

3. **Weight tracking UI & graphs**
   - Add logged weight entries and a simple graph (matplotlib not available; use chart library or plain SVG)
   - Acceptance: Users can add weight entries and see historical trend.

4. **Multiple local profiles**
   - Implement profile switching, isolated data per profile
   - Acceptance: Profiles can be created, edited, switched, and deleted locally.

---

## Phase 5 — UX Polish & Offline Reliability

1. **PWA & offline caching**
   - Add service worker, manifest, offline fallbacks for key pages
   - Acceptance: App can load core screens offline if previously visited.

2. **Accessibility & internationalization**
   - Use semantic HTML, proper labels, keyboard navigation
   - Prepare strings for i18n; include Tagalog/Filipino translations later
   - Acceptance: Basic accessibility checks pass.

3. **Notifications & scheduled reminders (optional)**
   - Allow user to enable local reminders for meal logging or weigh-ins
   - Acceptance: Browser reminders/fire Notifications API usage documented and optional.

---

## Phase 6 — Testing, Security & Privacy

1. **Unit & integration tests**
   - Unit tests for storage adapter, nutrient calculations, and health logic
   - Integration tests for major flows (onboarding, meal logging, import/export)
   - Acceptance: Tests run in CI and pass.

2. **E2E tests**
   - Use Playwright or Cypress to automate key flows
   - Acceptance: E2E scripts exist for capture→analyze→save flow.

3. **Privacy & security review**
   - Confirm no data leaks to third parties by default. If online AI is used, ask user for consent and document what is sent.
   - Ensure JSON export is opt-in and encrypted option documented
   - Acceptance: Privacy documentation added to repo and onboarding.

---

## Phase 7 — Release & Post-MVP

1. **Beta release & feedback**
   - Release PWA link to testers, collect feedback and bug reports
   - Acceptance: Feedback items triaged into backlog

2. **Performance & model improvements**
   - Add more Filipino dishes to local DB
   - Fine-tune detection prompts or models for local cuisine
   - Acceptance: Accuracy improves on local test set.

3. **Optional features**
   - Barcode scanner, meal plans, integrations, cloud sync (opt-in)
   - Acceptance: Prioritized based on user feedback.

---

## Developer Checklist & Sprint Suggestions

- **Sprint 0 (1 week)**: Setup repo, architecture doc, wireframes, and data model
- **Sprint 1 (2 weeks)**: Core app skeleton, onboarding, profile storage, home screen
- **Sprint 2 (2 weeks)**: Photo upload, manual entry, meal history, export/import
- **Sprint 3 (2-3 weeks)**: Online AI integration + detection edit UI, nutrient calculations
- **Sprint 4 (2-3 weeks)**: Local AI support, health logic, weight tracking, multi-profile
- **Sprint 5 (1-2 weeks)**: PWA, offline polish, accessibility, tests
- **Sprint 6 (ongoing)**: Beta feedback, model improvements, feature additions

---

## Useful Links & Tools
- Local model runtime suggestions: Ollama, LM Studio
- Online AI: OpenAI, Gemini
- IndexedDB helper: idb (npm)
- PWA boilerplates: Vite PWA plugin
- Image utilities: browser-image-compression, canvas resizing
- UI: TailwindCSS, Headless UI

---

## Acceptance Criteria Summary (MVP)
- Mobile-optimized React app that allows photo upload/capture and manual meal entry
- AI detection supported via online or local models (configurable)
- Local storage of all user data with import/export
- Basic personalization (daily needs calculation, health warnings)
- Weight tracking and multiple profiles
- PWA-capable and offline resilient for core flows

