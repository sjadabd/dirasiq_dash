# dirasiq_dash — Admin / Teacher Dashboard Analysis

> Read-only audit. No source files were modified. See [../CLAUDE.md](../CLAUDE.md) for the cross-project index.

## At a glance

- **Package name:** `mulhim-iq` v3.2.0 (`package.json`)
- **Stack:** Vue 3.5, Vuetify 3.7 (Material 3), Vite 5.4, Pinia 2.3, vue-router 4.5, CASL 6.7, `axios` (imported directly; not declared in `package.json`)
- **Build tooling:** `unplugin-vue-router` (file-based routing), `unplugin-vue-components` (auto-import), `unplugin-auto-import`, `vite-plugin-vue-layouts`, `vite-plugin-vuetify`, `vite-svg-loader`
- **Languages:** 100% JavaScript (`jsconfig.json`, no `tsconfig.json`). ESLint is TypeScript-aware via @antfu config.
- **Major features baked in:** TipTap rich-text editor, ApexCharts + Chart.js + vue-chartjs, FullCalendar, Leaflet + Mapbox-gl, jsPDF + html2canvas + exceljs (exports/printing), hls.js + video.js + `@videojs-player/vue` (video playback), `@ffmpeg/ffmpeg` + `@ffmpeg/util` (WASM video transcoding for intro-video upload), OneSignal + `react-native-onesignal` (dead, RN-only), MSW (mocked service worker), Shepherd.js (product tour, unused).
- **Template lineage:** Vuexy/Materio Vue Vuetify admin template. The `src/@core/` and `src/@layouts/` trees are the shipped scaffold; application code lives in `src/api/`, `src/pages/`, `src/views/`, `src/components/`, `src/composables/`, `src/plugins/`, `src/navigation/`, `src/utils/`, `src/constant/`.

---

## Root configuration files

### `package.json`
- Scripts: `dev` (Vite), `build`, `preview`, `lint`, `msw:init`, `build:icons` (no-op), `postinstall` (runs the two above).
- ⚠ `axios` is used by `src/utils/axios.js` but is **not declared in `dependencies`**. It works only because some transitive dep installs it. Add it explicitly.
- Several deps look unused or wrong:
  - `react-native-onesignal` — React Native package in a Vue web app.
  - `nodemailer` — server-side SMTP; should not be in a browser bundle.
  - `shepherd.js` / `vue-shepherd` — no tour code observed.
  - `emailjs-com` — possibly unused.

### `vite.config.js`
- Aliases: `@/*` → `src/`, `@core/`, `@layouts/`, `@themeConfig`, `@images/`, `@styles/`, `@db/`, `@api-utils/`.
- Plugin chain (in order): `VueRouter` (file-based routing) → `vue` (with `compilerOptions.isCustomElement` for swiper) → vue devtools → JSX → Vuetify → Layouts → Components auto-import (scans `@core/components`, `views/demos`, `components`) → AutoImport (Vue 3, vue-router, VueUse, pinia, plus utility dirs) → SVG loader.
- AutoImport `ignore`: `useCookies`, `useStorage` (these must be imported manually).

### `themeConfig.js`
- App title `mulhim-iq`. Logo is an inline SVG with dynamic `currentColor` binding.
- Default layout = vertical nav, RTL enabled, content boxed, navbar sticky+blur, footer static, icon set = Remix (`ri-`).
- I18n flag is disabled (no translation layer wired up).

### `index.html`
- Title: "Mulhim IQ".
- Loads Cairo font from Google Fonts (Arabic-optimized).
- Loads **OneSignal SDK v16** and **Google Sign-In SDK** directly via `<script>`. CSP would block these — that's why the API also has CSP disabled. The OneSignal app ID `b136e33d-56f0-4fc4-ad08-8c8a534ca447` is in source.
- Inline script reads `materio-initial-loader-bg` / `…-color` from `localStorage` so the loader matches saved theme on first paint.
- No CSP, no SRI on third-party scripts.

### `jsconfig.json`
- Same path aliases as Vite. No `checkJs` flag.

### `.eslintrc.cjs`
- Extends antfu Vue base. Strict rules ban:
  - Direct imports from `vuetify/components` (auto-import is mandatory).
  - Any icon prefix other than `ri-`.
  - Importing `@core` symbols from inside `@layouts/` (modular boundary).
  - Raw asset paths (must use the path aliases).
- 2-space indent, no semicolons, trailing commas always.

### `.eslintrc-auto-import.json`, `auto-imports.d.ts`, `components.d.ts`, `typed-router.d.ts`
- **Generated** by the unplugin tools at dev/build time. Do not edit by hand.

### `.stylelintrc.json`
- Standard SCSS + `@stylistic` rules; line length 220; some logical-properties relaxations.

### `nginx.conf`
- Single server, port 80, SPA fallback to `index.html`.

### `dev.Dockerfile` / `prod.Dockerfile`
- Dev: Node LTS, `vite --host`. Prod: multi-stage Node → Nginx, exposes 80. Package manager autodetected (yarn / pnpm / npm).

### `docker-compose.dev.yml` / `docker-compose.prod.yml`
- Dev maps host port to 5173 with `./src` and `./public` bind-mounted. Prod maps 8080 → 80.

### `.env`
- **CRITICAL — secret leak in repo (local).** The file contains:
  - `SMTP_HOST=mail.lamassu-iq.com`
  - `SMTP_USER=mulhim@lamassu-iq.com`
  - `SMTP_PASS=u1grc9ffjge1`
  - `VITE_GOOGLE_CLIENT_ID=765386230641-1be5i4mejr0mql13ib6bk27dj0uq7n8f.apps.googleusercontent.com`
- **Action:** rotate the SMTP password immediately, confirm `.env` is git-ignored (it is, per `.gitignore`), and replace with a `.env.example` of placeholders only. Also: any `VITE_*` value ends up in the client bundle and is **not** secret by definition — design accordingly.

### `.dockerignore`, `.editorconfig`, `.gitignore`, `.gitattributes`, `.npmrc`, `.nvmrc`, `README.md`
- Standard. README is minimal scaffolding text.

---

## `src/` — application entry and routing

### `src/main.js`
- Imports core SCSS (`@core/scss/template/index.scss`), then `@styles/styles.scss`, Leaflet CSS, and `@/@core/scss/template/libs/full-calendar.scss` (commented out vuetify-flag-icons).
- Creates app, registers all plugins via `registerPlugins(app)` (glob loader from `src/plugins/`).
- Loads `user` and `accessToken` from `localStorage` and exposes them as `app.config.globalProperties.$user`, `$token`, `$isAuthenticated`.
- After router is ready, logs every route's path and meta to the console — leftover dev artifact.
- **Issues:** mixing global properties with composables (`useAuth.js`) creates two sources of truth; user loaded before router/store init (timing-sensitive).

### `src/App.vue`
- `<script setup>` (Composition).
- Wraps everything in `<v-locale-provider rtl>`.
- Injects the active Vuetify primary color into a CSS variable on `<html>` so non-Vuetify components (custom loader) can match the theme.
- Reads `localStorage` (`isProfileComplete`, `user`) and shows a profile-completion `<v-alert>` if the user is not super_admin and incomplete.
- Hosts a **draggable WhatsApp floating button** with a hard-coded number `9647724275947` and position persisted to `localStorage.wa_pos`.
- **Issues:** WhatsApp number, alert z-index (`98999999`), and direct `localStorage` access are all hard-coded; the FAB drag handlers are inline (`mousedown`/`touchmove`) and not extracted into a composable.

---

## Routing & layouts

### `src/plugins/1.router/index.js`
- Builds the router from `unplugin-vue-router`'s generated `routes/auto`.
- Wraps each route with `setupLayouts` (vite-plugin-vue-layouts).
- Adds a route extender: legacy `/register/teacher` (with `?ref=…`) redirects to `/login?ref=…`.
- Global `router.onError` reloads the page only on three chunk-load error patterns; other navigation errors fall through silently.
- **No `beforeEach` guard for auth or roles.** Each page does its own check.

### `src/plugins/1.router/additional-routes.js`, `default-route.js`
- Helper modules for the extender. The default layout is `default.vue`.

### `src/layouts/default.vue`
- Async-loads either `DefaultLayoutWithHorizontalNav` or `DefaultLayoutWithVerticalNav` from `@layouts/components/` based on `appContentLayoutNav` in the config store.
- Uses `<Suspense>` with `timeout="0"` — a slow async layout will block render with no fallback boundary.

### `src/layouts/blank.vue`
- Minimal `<RouterView />` wrapper for auth screens.

### `src/layouts/components/` (template-shipped, lightly customized)
- `DefaultLayoutWithVerticalNav.vue` / `…WithHorizontalNav.vue` — the two top-level shells.
- `UserProfile.vue` — top-bar menu (profile / logout). Reads user from localStorage and triggers `Auth.logout()`.
- `NavBarNotifications.vue` — notifications dropdown.
- `NavbarShortcuts.vue` — quick-action menu.
- `NavbarThemeSwitcher.vue` — theme toggle (light/system/dark).
- `NavSearchBar.vue` — global search.
- `Footer.vue` — copyright/version.

---

## Navigation

### `src/navigation/vertical/index.js`
The only nav source actually rendered. Items are role-gated by a custom `type: 'super_admin' | 'teacher'` field. Groups (Arabic titles preserved):

- **Super admin:** Dashboard, Academic Years, Grades, Subscription Packages, Teachers.
- **Teacher:**
  1. Dashboard.
  2. Accounting: Reservation Payments, Student Invoices, Expenses, Financial Reports.
  3. Content & Bookings: Subjects, Courses, Bookings.
  4. Schedule: Weekly Schedule, Student Evaluations.
  5. Communication: Notifications, Assignments.
  6. Exams: Exams & Grades.

### `src/navigation/horizontal/index.js`
- Stub file exists per template convention but the horizontal nav is not selected in `themeConfig`.

---

## API client layer

### `src/utils/axios.js`
- Singleton `axios` instance, base URL **hard-coded** to `https://api.mulhimiq.com/api`, timeout 100 s.
- Request interceptor: adds `Authorization: Bearer ${localStorage.accessToken}` when present.
- Response interceptor:
  - `401` → wipes `accessToken`/`user`/`isProfileComplete` from `localStorage`, then `window.location.href = '/login'`.
  - `403` → writes `message` to `localStorage.lastErrorMessage` and navigates to `/errors/unauthorized`.
- **Issues:** hard-coded base URL (no `import.meta.env.VITE_API_BASE_URL`), tokens in `localStorage` (XSS-stealable), passing error context via `localStorage` is unusual and not reactive, no refresh token, no retry.

### `src/utils/api.js`, `src/composables/useApi.js`
- Both are unused: an `ofetch`-based wrapper and a VueUse `createFetch` wrapper. Nothing imports them. Remove or pick one and unify.

### `src/api/auth/auth_api.js`
- Singleton class with: `loginInGoogele()` (typo — should be `loginInGoogle`), `login()`, `logout()`, `registerTeacher()`, `verifyEmail()`, `resendVerification()`, `requestPasswordReset()`, `resetPassword()`.
- Calls `axios` directly; no error normalization.

### `src/api/admin/admin_api.js`
- Admin CRUD for academic years, grades, subscription packages, settings.
- Query strings built via string interpolation in some calls (fragile vs. passing `params`).
- Mixed `isActive` / `is_active` naming visible in callers.

### `src/api/teacher/teacher_api.js`
- ~530 lines. Covers ~50 endpoints across:
  - Profile + intro video (`completeProfile`, `uploadIntroVideo`, `getIntroVideo`)
  - Courses, subjects, grades, study years
  - Bookings (CRUD + `pre-approve` / `consent` / `reject`)
  - Sessions (CRUD + attendance + attendees)
  - Assignments (CRUD + grading + recipient management)
  - Exams (CRUD + grading + listing students)
  - Evaluations (bulk upsert + read)
  - Invoices (list, create, pay, discount, restore, full accounting)
  - Payments (reservation payments, Wayl gateway)
  - Notifications, students roster, financial reports, wallet (balance + transactions), subscriptions.
- **Issues:** very large single class, no JSDoc, inconsistent encoding (some calls use `encodeURIComponent`, others don't), inconsistent query construction (params object vs interpolation), no response shape normalization.

---

## State management

### `src/plugins/2.pinia.js`
- Just `createPinia()`. No persistent plugin.

### `src/@core/stores/config.js`
- The **only** Pinia store in active use. Holds theme, skin, RTL flag, layout layout (boxed/wide), navbar type, vertical-nav collapsed state. Persists via `cookieRef()` (cookie-based). Watches `prefers-color-scheme`.

### `src/composables/useAuth.js`
- Composition-style auth singleton: shared refs `user`, `token`, `isAuthenticated`.
- Methods: `loadUserFromStorage`, `login`, `logout`, `updateUser`, `hasPermission`, `redirectBasedOnUserStatus`.
- Computed `requiresProfileCompletion` checks four teacher fields (`phone`, `address`, `bio`, `experienceYears`). Not aligned with the backend's full validation.
- **Issues:** duplicates `Auth.logout()` semantics without calling the API; switch on `userType` falls through to a default redirect; persistence is still raw `localStorage`.

### Cross-cutting state observations
- User identity exists in **three** places: `localStorage`, `useAuth` refs, `app.config.globalProperties.$user`. There's no single source of truth and no reactive store dedicated to it.
- Other ad-hoc `localStorage` keys used app-wide: `accessToken`, `user`, `isProfileComplete`, `studyYear`, `lastErrorMessage`, `wa_pos`, `materio-initial-loader-bg/color`, `reloaded`, `results`. Centralizing these into a Pinia store with a persistence layer would help.

---

## Theming & i18n

### `src/plugins/vuetify/index.js`
- Initializes Vuetify with labs `VDateInput`, custom + Remix icons, two themes (light/dark), mobile breakpoint at 600 px, component defaults.

### `src/plugins/vuetify/theme.js`
- Primary `#0B2545`, secondary `#3FA9F5`, success `#6EF2B4`, warning `#FF8A00`, error `#E53935`; Cairo font.

### `src/plugins/vuetify/icons.js`
- Default set = custom SVG icons (checkbox, radio variants); aliases for Remix (`ri-*`) and a custom MDI renderer.

### Internationalization
- Disabled in `themeConfig` (`i18n.enable: false`). Arabic strings are inlined in templates. No translation files. RTL is on globally.

---

## Pages (file-based routes)

`unplugin-vue-router` turns every `.vue` under `src/pages/` into a route. Inventory (counts approximate, names normalized):

### Public / shared (under `src/pages/`)
- `index.vue` → `/` — landing.
- `login.vue` → `/login` — auth page. Hard-codes the OneSignal app ID at line ~31.
- `register/*.vue` — teacher registration flow.
- `forgot-password.vue`, `reset-password.vue`, `verify-email.vue`.
- `[...error].vue` — catch-all 404 → `/errors/*` pages.
- `errors/*` — 401/403/404/500 pages.

### Super admin (`src/pages/admin/`)
- `dashboard.vue`
- `teachers/index.vue`, `teachers/[id].vue`
- `study-years.vue`, `grades.vue`, `subscription-packages.vue`
- `settings/booking-confirmation-fee.vue`

### Teacher (`src/pages/teacher/` — ~24 files)
- `dashboard.vue`, `profile-setup.vue`, `wallet.vue`
- `courses/[id]/show.vue`, `courses/[id]/students.vue`
- `subjects.vue`, `grades.vue`
- `bookings/index.vue`, `bookings/[id]/show.vue`, `bookings/reservations-report.vue`, `bookings/payment-details.vue`
- `sessions/manage.vue`, `sessions/attendance.vue`
- `assignments/manage.vue`, `assignments/overview.vue`
- `exams/manage.vue`, `exams/details.vue`
- `evaluations/manage.vue`, `evaluations/bulk-upsert.vue`
- `invoices/manage.vue`, `invoices/create.vue`, `invoices/edit.vue`, `invoices/show.vue`
- `expenses/manage.vue`
- `notifications/show.vue`
- `payments/redirecting.vue` (return URL from Wayl)
- `reports/financial.vue`
- `billing/pricing.vue`

### Student (`src/pages/student/`)
- Limited; mostly viewing/landing. The mobile Flutter app is the primary student surface.

> Per page: most use `<script setup>` and the auto-imported APIs. Auth checks are page-local (each `mounted()`/`onMounted` reads `localStorage.user` and `userType` and `router.push('/login')` if missing). **No global route guard.** This is the dashboard's biggest correctness gap.

---

## Components

### `src/components/` (shared)
- `AppLoadingIndicator.vue`, `AppSearchHeader.vue`, `AppBreadcrumbs.vue`, `AppLoadingOverlay.vue`, `AppPricing.vue`, `SmartTable.vue` (300+ line generic table), `BaseAlert.vue`, `ConfirmDangerDialog.vue`, plus auth/registration card dialogs.

### `src/components/teacher/`
- `profile/MapPicker.vue` — Leaflet/Mapbox map for teacher location.
- `courses/AddCourse.vue`, `EditCourse.vue`
- `subjects/AddSubjects.vue`, `EditSubjects.vue`
- `reports/report-invoices.vue`, `report-reservation.vue`
- `VideoUploadEditor.vue` — uses **FFmpeg WASM** (`@ffmpeg/ffmpeg`) to transcode intro videos in the browser. Payload is ~30 MB on first use; no progress UI surfaced.
- `ReferAndEarnDialog.vue`

### `src/components/auth/`
- `AuthGoogele.vue` (typo — should be `AuthGoogle`). Wraps the Google Sign-In button and posts the ID token via `auth_api.loginInGoogele()`.

---

## Constants and utilities

### `src/constant/`
- `calculateBill.js` — bill math (salary − payments − discounts).
- `Tafqeet.js` — Arabic number-to-text conversion (for invoice "amount in words").
- `date.js` — date formatters.
- `number.js` — number formatters (commas, decimals).
- `rand_pass.js` — password generator.
- `color.js` — color helpers.

### `src/@core/utils/`
- `helpers.js` (isEmpty, isObject, isToday, …)
- `validators.js` (email, password, required, URL, length, alpha, …)
- `colorConverter.js`, `formatters.js`
- `plugins.js` — glob auto-registration of `src/plugins/*`.

### `src/@core/composable/useCookie.js`
- Reactive cookie ref with auto JSON serialization, 30-day max age.

---

## Template scaffold (read but condensed)

### `src/@core/` — purpose: Vuexy/Materio shipped components, composables, SCSS, defaults

- `components/`
  - `app-form-elements/` — DateTimePicker, CustomCheckboxes/Radios (with icon/image variants), Stepper.
  - `cards/` — `AppCardActions.vue`, `AppCardCode.vue` (uses **`v-html`** to render highlighted snippets — XSS risk if user content ever flows here; current usage is developer-controlled), `CardStatisticsHorizontal.vue`, `…Vertical.vue`, `…WithIcon.vue`, `…WithImages.vue`.
  - `AppBarSearch.vue`, `AppDrawerHeaderSection.vue`, `DialogCloseBtn.vue`, `DropZone.vue`, `MoreBtn.vue`, `Notifications.vue`, `ProductDescriptionEditor.vue`, `ScrollToTop.vue`, `Shortcuts.vue`, `TablePagination.vue`, `TiptapEditor.vue`, `CustomizerSection.vue`.
- `composable/` — `createUrl.js`, `useCookie.js`, `useGenerateImageVariant.js`, `useResponsiveSidebar.js`, `useSkins.js`.
- `libs/`
  - `apex-chart/` — ApexCharts theme defaults.
  - `chartjs/` — Chart.js defaults and component wrappers.
- `scss/`
  - `base/` — Vuetify variable overrides, libs, placeholders, skin variants.
  - `template/` — page-specific styles, layout placeholders for vertical/horizontal nav, theme skins, component overrides.
- `stores/config.js` — described above.
- `utils/` — described above.

### `src/@layouts/` — purpose: layout framework (nav, sidebar, footer, plugins, styles)

- `components/` — `DefaultLayoutWithVerticalNav.vue`, `DefaultLayoutWithHorizontalNav.vue`, `Navbar.vue`, `VerticalNav.vue`, `HorizontalNav.vue`, `VerticalNavLink.vue`, `VerticalNavGroup.vue`, etc.
- `plugins/casl.js` — sets up the `Can` ability and provides `useAbility`. **Note:** CASL is initialized but neither the router nor the menu actually rejects unauthorized navigation — gating is by `type` string on each nav item.
- `stores/` — internal layout state (collapsed/floating drawer, etc.).
- `styles/` — layout SCSS shared with `@core`.

### `src/assets/` — image and SCSS assets
- `assets/app/` — app branding (logos, splash).
- `assets/images/` — backgrounds, avatars (15), front-pages illustrations (~9), brand icons (~20), payment icons (~10), customizer icons. Total ~100+ PNGs (template default art; many likely unused).
- `assets/styles/` — additional SCSS imports.

---

## Architecture overview

### Vite plugin pipeline (in order)
1. `VueRouter` — generates routes from `src/pages/**` and emits `typed-router.d.ts`.
2. `vue` — Vue SFC compiler (custom element passthrough for swiper).
3. `vueDevTools` — devtools panel in dev.
4. `vueJsx` — JSX support.
5. `vuetify` — auto-import Vuetify components/directives, inject SCSS variables.
6. `Layouts` — wraps every route with the chosen layout (`default` or `blank`).
7. `Components` — auto-imports components from `@core/components`, `views/demos`, `components`; emits `components.d.ts`.
8. `AutoImport` — auto-imports Vue 3 / vue-router / VueUse / Pinia APIs and local utility dirs (`@core/utils`, `@core/composable`, `composables`, `utils`, `plugins/*/composables`); emits `auto-imports.d.ts` and `.eslintrc-auto-import.json`.
9. `svgLoader` — SVG → Vue component.

### Layout / route generation
- `src/pages/<path>/<file>.vue` → `/<path>/<file>`.
- A `<route>` block per page (when present) overrides the meta/layout.
- Catch-all `[...error].vue` handles 404s.

### Auth flow (current state)
1. User lands on `/login` → submits credentials.
2. `Auth.login()` calls `POST /auth/login`, stores `accessToken` and `user` in `localStorage`.
3. Each protected page reads `localStorage.user.userType` in `onMounted` and calls `router.push('/login')` if missing.
4. `axios` interceptor catches `401` and force-redirects to `/login`; `403` to `/errors/unauthorized`.
5. **No global guard, no CASL enforcement.**

### Theming pipeline
- `themeConfig.js` → initial values.
- `@core/initCore.js` (or equivalent in `@core/utils/plugins.js`) syncs RTL + initial loader colors.
- Vuetify `useTheme()` runtime switch.
- `App.vue` mirrors primary color into a CSS variable for non-Vuetify chrome.
- `localStorage` persists the user's choice.

---

## Quality findings (prioritized)

### Critical security
1. **Secrets in `.env`** (SMTP credentials and OAuth client ID). Rotate now.
2. **`localStorage` token storage** — vulnerable to XSS exfiltration. Combined with embedded third-party scripts (OneSignal SDK, Google SDK) and disabled CSP, the attack surface is wide.
3. **No CSP / no SRI** in `index.html`. Any compromise of a third-party SDK CDN steals every active session.
4. **No router-level auth guard** — page-by-page checks are easy to forget. Add `router.beforeEach` that validates `accessToken` + role against the route's meta.
5. **Hard-coded API base URL** — no `VITE_API_BASE_URL`. Different envs need different hosts.

### Correctness
6. **`AuthGoogele` typo** (and the method `loginInGoogele`) — cosmetic, but easy to mistype in callers.
7. **Boot race in `main.js`** — user is loaded before router and Pinia, so anything reading `user` during boot may see a partial state.
8. **`Suspense timeout=0`** in `default.vue` — slow async layout can render an empty tree with no fallback.
9. **No error boundary** anywhere; an uncaught render error blanks the page.
10. **API method encoding inconsistency** in `teacher_api.js` — some methods URI-encode parameters, others don't; behavior diverges on Arabic / special characters.
11. **Two unused HTTP wrappers** (`src/utils/api.js`, `src/composables/useApi.js`) — confuses future maintainers.

### Maintainability
12. **No TypeScript.** The auto-generated `*.d.ts` files exist but the codebase is JS. Enable `checkJs` in `jsconfig.json` to get type checking without migrating.
13. **`teacher_api.js` is 530 lines.** Split by domain (sessions, invoices, exams, …).
14. **No tests**, no testing infrastructure.
15. **No central constants** — status strings (`pending`, `pre_approved`, `confirmed`, …) are spread across files; dropdowns and conditionals re-write them.
16. **Components mix Options and Composition** — pick `<script setup>` everywhere.
17. **State scattered across `localStorage` + globals + composables.** Consolidate into a Pinia `useUserStore`.

### Performance
18. **FFmpeg WASM** is heavy (~30 MB). Lazy-load `VideoUploadEditor.vue` only when invoked; show a download/progress UI.
19. **No bundle analysis** in build pipeline.
20. **Leaflet + Mapbox GL both installed** — pick one. Mapbox token in `.env` is empty.

### UX / accessibility
21. WhatsApp FAB is draggable but has no keyboard equivalent and a hard-coded number.
22. Profile-completion `<v-alert>` is dismissible only via close — no link to the relevant page on most layouts.
23. Form validation is present but submit buttons aren't always disabled while submitting.

---

## Tech debt / inconsistencies

- **Dead deps:** `react-native-onesignal`, `nodemailer`, `shepherd.js`, possibly `emailjs-com`.
- **Undeclared dep:** `axios` is imported but not in `dependencies`. Add it.
- **Two routing-related ESLint rules** (`no-restricted-imports` on `vuetify/components` and `@core` from `@layouts`) prove the team enforces template modularity — but several spots already break it; consider a pre-commit hook.
- **Generated files (`auto-imports.d.ts`, `components.d.ts`, `typed-router.d.ts`)** are tracked in git. They're regenerated on dev/build — committing them invites merge conflicts. Consider ignoring them.
- **Mixed naming:** `loginInGoogele`, `AuthGoogele.vue`, `subjects` vs `subject_id`, `getReservationPayments` vs `getBookings`.
- **CASL is installed but unused at the guard level.** Either remove it or wire it into `router.beforeEach` and `<Can>` directives.
- **No environment matrix** — single `.env` for dev/prod.
- **`MSW` (mock service worker)** is wired via `postinstall msw:init` but no mocks directory is checked in. Either populate it or remove.
