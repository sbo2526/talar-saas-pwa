# AGENTS.md

## Project Architecture

This is a Next.js App Router SaaS/PWA project for Persian-speaking banquet hall owners.

- `src/app`: Route tree for marketing, auth, demo, purchase, account, and dashboard pages.
- `src/app/api/auth/[...nextauth]/route.ts`: NextAuth route handler.
- `src/components`: Reusable UI components grouped by auth, dashboard, and PWA concerns.
- `src/app/dashboard/account/page.tsx`: Authenticated dashboard account center with profile overview, unified access/subscription status, editable personal information, verification status, workspace permissions, security summary, and read-only system information.
- `src/app/dashboard/settings/backups/page.tsx`: Tenant-scoped backup and data export center for CSV exports, full JSON backup, export history, and controlled restore guidance.
- `src/app/dashboard/hall-info/page.tsx`: Tenant-scoped business/venue profile page for the main banquet hall identity, contacts, license, and facilities.
- `src/app/dashboard/halls/page.tsx`: Tenant-scoped hall/branch management under base definitions.
- `src/app/dashboard/salons/page.tsx`: Tenant-scoped salon/room management under base definitions.
- `src/app/dashboard/payment-methods/page.tsx`: Tenant-scoped payment-method setup under base definitions.
- `src/app/dashboard/financial-categories/page.tsx`: Tenant-scoped financial-category setup under base definitions.
- `src/app/dashboard/calendar/page.tsx`: Tenant-scoped Jalali reservation calendar for contracts, day notes, blocked days, holidays, and follow-up statuses.
- `src/app/dashboard/contracts/new/page.tsx`: Tenant-scoped professional contract registration with customer search, Jalali event date, service/menu snapshots, and financial totals.
- `src/app/dashboard/contracts/[id]/print/page.tsx`: Tenant-scoped A4 browser-print contract template using stored contract snapshots, hall info, contract settings, Jalali dates, Persian digits, and Rial formatting.
- `src/components/dashboard/notification-bell-server.tsx` and `src/components/dashboard/notification-bell-client.tsx`: Dashboard header in-app notification center for real tenant-scoped reminders, unread counts, read actions, dismiss actions, and relevant links.
- `src/lib/notifications/in-app-notification-service.ts`: Lightweight sync/read service for deterministic in-app reminder fingerprints.
- `src/lib/auth`: Authentication options, validation schemas, and session/tenant helpers.
- `src/lib/actions`: Server actions for registration and demo workspace creation.
- `src/lib/date/jalali.ts`: Mandatory Jalali/Shamsi display helpers.
- `src/lib/formatters.ts`: Persian number and IRR money formatting helpers.
- `src/types/next-auth.d.ts`: NextAuth/JWT module augmentation for custom session fields.
- `src/lib/prisma.ts`: Stable generated Prisma Client singleton with a `getPrisma()` compatibility wrapper.
- `prisma/schema.prisma`: Multi-tenant PostgreSQL domain model.
- `prisma/seed.mjs`: Local development seed script.
- `public`: PWA manifest, service worker, icons, and static visual assets.

The app uses TypeScript, Tailwind CSS v4, Prisma ORM, PostgreSQL through Prisma 7's `@prisma/adapter-pg`, NextAuth credentials auth, bcrypt password hashing, zod validation, Vazirmatn Variable typography, Jalali display helpers, and Persian RTL UI.

## Coding Standards

- Keep code production-minded, typed, and organized around reusable components.
- Prefer server components by default; use client components only for browser APIs or interactive state.
- Keep all user-facing UI in Persian and RTL unless a technical identifier must stay English.
- Do not introduce unrelated refactors while implementing a task.
- Do not remove existing features or routes unless the user explicitly asks.
- Do not commit real `.env` files. Keep `.env.example` as the documented template only.
- Always update `README.md` after each task.
- Always update `AGENTS.md` when architecture, conventions, auth flow, tenant rules, design rules, date rules, or business rules change.

## Design System

- Use `@fontsource-variable/vazirmatn` as the main app font. Do not add runtime Google Fonts/CDN dependencies.
- Vazirmatn must be applied globally to `html`, `body`, form controls, and components through `src/app/globals.css`.
- The visual language is premium banquet-hall SaaS: deep charcoal/navy backgrounds, warm ivory surfaces, champagne/gold accents, muted emerald secondary accents, soft gradients, rounded-2xl/rounded-3xl cards, subtle borders, and tasteful shadows.
- Avoid generic teal/slate-only styling, default SaaS chrome, plain cards, and low-effort placeholder layouts.
- Visible brand text should be Persian, currently `تالار منیجر`; avoid visible English product titles unless technically necessary.
- All new public/auth/dashboard pages must use the luxury design-system classes from `src/app/globals.css`: `.btn-luxury-primary`, `.btn-luxury-secondary`, `.btn-luxury-dark`, `.card-luxury`, `.card-luxury-dark`, `.input-luxury`, `.badge-luxury`, `.section-luxury`, and `.gold-divider`.
- Use valid Tailwind utilities. For non-standard values use arbitrary syntax such as `opacity-[0.48]`, `py-[4.5rem]`, `h-[4.5rem]`, and `bg-white/[0.06]`.
- Visible Persian copy must be polished and use correct half-spaces where appropriate, for example `ثبت‌نام`, `فعال‌سازی`, `می‌توانید`, `قیمت‌گذاری`, `نرم‌افزار`, and `یک‌باره`.
- Keep controls spacious, high contrast, and readable on mobile and desktop.

## Dashboard And PWA UX Rules

- Dashboard surfaces must remain mobile-first: no horizontal overflow, touch-friendly buttons, safe-area-aware spacing, and clean tablet/desktop scaling.
- Mobile dashboard UI should feel app-like, not merely responsive: compact topbars, dense useful cards, clear touch targets, and balanced vertical rhythm.
- New dashboard pages and components must match the luxury design system and avoid generic admin-template styling.
- `/dashboard` must remain a daily operational command center, not a duplicate of the sidebar. Do not fill the main dashboard with plain module directories or repeated navigation lists.
- Dashboard quick actions should focus on daily operator work: new contract, payment, calendar, customer, report, and expense. Base/setup links belong in setup health or attention states, not the primary quick-action row.
- Dashboard KPIs and hero summaries must come from real tenant-scoped data. Never show fake metrics, static demo numbers, placeholder trends, or vague states such as «در جریان» without supporting numbers.
- Daily and monthly dashboard metrics must use Jalali date boundaries from `src/lib/date/jalali.ts`; do not use Gregorian month boundaries for Persian business summaries.
- Dashboard reminders should reuse the in-app notification service when available, keep fingerprints deterministic, and avoid duplicating notification logic in multiple places.
- Setup health on `/dashboard` should show real readiness counts/status for hall info, halls/salons, menus/services and missing prices, payment methods/financial categories, and contract settings.
- Dashboard list sections must stay limited and fast: latest contracts/payments/expenses and upcoming events should use small `take` limits and tenant-scoped filters.
- `/dashboard/calendar` must remain a Jalali/Shamsi-only operations calendar. Do not show Gregorian months, weekdays, or visible dates in the calendar UI.
- `/dashboard/calendar` must behave like a reservation command center, not a tall static overview. Keep the header compact, show month controls before filters, and bring the calendar grid high on the page.
- Calendar data should be loaded through a tenant-scoped server data layer such as `src/lib/calendar/calendar-page-data.ts`; fetch only the selected Jalali month and a small upcoming-events window instead of all contracts.
- Calendar pages must always include visible Jalali month navigation for ماه قبل، امروز، and ماه بعد before the filter controls.
- Calendar UI must show Jalali holidays when available. Fixed Jalali holidays and Fridays can be shown directly; do not hardcode lunar/variable holidays unless a reliable year-aware source exists.
- Calendar day cells must stay low-noise: free days should not repeat long availability text, and holidays/Fridays must not visually overpower contract or reservation states.
- Free days should remain scannable with a day number, status dot, and at most one subtle available chip; avoid duplicate day chips such as repeated جمعه labels.
- Reserved/contract days must summarize operational load in the cell, such as ceremony count and salon occupancy. Do not render every event inside a day cell; put full details in the selected-day panel.
- The selected day must be visually distinct from today and from reserved states through a stronger border/ring and an explicit Persian selected chip.
- The selected-day panel must list all filtered contracts/events for that day, show Jalali date/weekday, holidays, day status, hall/salon availability, financial summary, remaining amount, and only real actions such as contract details, payment registration, day note/blocking, and contract creation with `eventDate`.
- If a day is blocked, registration should be softened or withheld and the UI should guide the manager to clear/change the day status; do not present fake override actions.
- Calendar filters should remain compact and must not dominate the page above the month grid.
- Calendar filters should affect day summaries, the selected-day panel, and the upcoming list where applicable. If filters hide all matching events for a selected day, show a polished empty state.
- Calendar forms should be collapsed by default unless the user starts editing, adding a management note, blocking a day, or clearing an existing status.
- Calendar quick actions should stay focused on date operations and must not clutter the page with unrelated setup links.
- Calendar day notes/statuses must stay tenant-scoped through `CalendarDayNote`; store real `DateTime` values and never store Jalali date strings in Prisma fields.
- Future reservation/contract data should appear in `/dashboard/calendar`, with day statuses displayed in Persian and styled consistently with the luxury dashboard.
- Mobile calendar UI must remain app-like and PWA-friendly: compact month controls, touch-friendly day cells, readable status dots, and no horizontal overflow.
- Desktop dashboard navigation should use a premium fixed sidebar; mobile navigation should use a dismissible drawer/sheet with active route state.
- Dashboard navigation must stay high-level. Do not add every sub-setting to the sidebar.
- Detailed base-definition pages belong inside `/dashboard/base`; the sidebar/mobile drawer should expose them through the single `تعاریف پایه` item.
- Detailed base routes such as `/dashboard/base/halls`, `/dashboard/base/menus`, and the short aliases `/dashboard/halls`, `/dashboard/menus` must mark `تعاریف پایه` active.
- `/dashboard/halls` is the hall/branch management route under base definitions. Do not add it back to the main sidebar as a separate item.
- `/dashboard/salons` is the salon/room management route under base definitions. Do not add it back to the main sidebar as a separate item.
- `/dashboard/base/salons` should redirect to `/dashboard/salons`; the base hub remains the discovery point for this section.
- `/dashboard/payment-methods` is the payment-method management route under base definitions. Do not add it back to the main sidebar as a separate item.
- `/dashboard/base/payment-methods` should redirect to `/dashboard/payment-methods`; the base hub remains the discovery point for this section.
- `/dashboard/financial-categories` is the financial-category management route under base definitions. Do not add it back to the main sidebar as a separate item.
- `/dashboard/base/financial-categories` should redirect to `/dashboard/financial-categories`; the base hub remains the discovery point for this section.
- The dashboard sidebar and mobile drawer must include the `حساب کاربری` route at `/dashboard/account`.
- The dashboard sidebar and mobile drawer must include the `اطلاعات تالار` route at `/dashboard/hall-info`.
- The dashboard sidebar and mobile drawer must include `تنظیمات کلی سامانه` at `/dashboard/settings/general` under the settings group.
- `/dashboard/settings/general` is a navigational/control hub, not a duplicate form page. It should summarize hall information completeness, base-definition counts, contract settings, financial methods, and communication settings while linking to canonical routes.
- Settings hub cards must not point to nonexistent routes. Use canonical routes such as `/dashboard/hall-info`, `/dashboard/base`, `/dashboard/halls`, `/dashboard/salons`, `/dashboard/menus`, `/dashboard/services`, `/dashboard/payment-methods`, `/dashboard/financial-categories`, and `/dashboard/contract-settings`.
- Counts and statuses shown on settings hubs must come from tenant-scoped database queries; do not invent fake counts or placeholder setup states.
- `/dashboard/account` must remain renderable for authenticated users even when no tenant membership exists; other dashboard modules should continue to show the no-workspace onboarding until a workspace is active.
- Dashboard account pages must remain Persian, RTL, Jalali-aware, and luxury-styled.
- Editable account fields are limited to safe self-service fields such as `name`, `phone`, `nationalCode`, `address`, and `postalCode`; do not allow users to edit role, status, tenant access, subscription, or email identity without a dedicated verified flow.
- `/dashboard/account` must clearly separate editable personal fields from read-only system information. Email, account id, role, user status, tenant access, demo state, and subscription state must not appear as editable inputs.
- Demo and subscription information should be merged into one access/status panel so operators can understand current access, plan, start/end dates, remaining days, and renewal action without duplicate cards.
- Verification/contact status on `/dashboard/account` should show completion states, not repeat every full value already present in the form or system information.
- Security content on `/dashboard/account` must stay compact and link to `/dashboard/settings/security`; do not fake session data, unsupported security actions, or subscription data.
- Avoid duplicate account facts across sections unless a field is intentionally repeated as a top-level status chip and a read-only system record.
- Future account settings must validate server-action input with zod, update only the authenticated user's own record, and return polished Persian messages.
- No-workspace states should guide users toward demo activation, purchase, and base setup rather than showing a plain empty card.
- PWA install guidance must stay localized in Persian and platform-aware for Android, iPhone Safari, and Windows Chrome/Edge.
- Do not show install prompts repeatedly after dismissal; store dismissal state client-side and hide guidance when running in standalone/installed mode.
- Mobile install guidance should stay concise and preferably use a dismissible floating sheet or contextual card instead of a heavy inline banner.
- Do not claim iPhone supports native `beforeinstallprompt`; explain Safari's Share → Add to Home Screen flow instead.

## Jalali Date Rules

- All user-facing dates, months, years, and weekdays must be displayed in Jalali/Shamsi format.
- Use `src/lib/date/jalali.ts` for display. Do not use raw `toLocaleDateString` directly in UI components.
- Store database dates as real `DateTime` values. Never store Jalali dates as plain strings in Prisma fields.
- Future date inputs such as `eventDate`, `paidAt`, and `occurredAt` must use a Jalali date picker, preferably `react-multi-date-picker`.
- Convert selected Jalali dates safely to JavaScript `Date` before saving.
- Show persisted dates back to users through the Jalali helpers.
- Use `src/lib/formatters.ts` for Persian digits and IRR money display.

## Auth Architecture

- Authentication uses `next-auth` v4 with credentials and JWT sessions.
- Credential validation happens with zod in `src/lib/auth/schemas.ts`.
- Passwords must always be hashed with `bcryptjs` before storing.
- Login must compare against `passwordHash`, reject suspended users, and update `lastLoginAt`.
- Registration must normalize email to lowercase and prevent duplicate emails.
- Registration must normalize phone values, check duplicate phone numbers when provided, and return a clean Persian message for Prisma unique-constraint errors.
- `src/types/next-auth.d.ts` must keep `session.user.id`, `session.user.status`, `token.id`, and `token.status` typed.
- Do not store plain-text passwords, reset tokens, or sensitive secrets.
- `PasswordResetToken.tokenHash` must store only a hashed token.

## Tenant Security Rule

Tenant isolation is mandatory. Every database query for tenant-owned resources must include the `tenantId` from the authenticated user's current `TenantMember`.

Tenant-owned tables include:

- `Hall`
- `Salon`
- `Menu`
- `Service`
- `ContractSetting`
- `PaymentMethod`
- `FinancialCategory`
- `Customer`
- `Contract`
- `Payment`
- `Expense`
- `TenantHallProfile`
- `CalendarDayNote`
- `BackupExportLog`
- `InAppNotification`

Use `getCurrentTenantMember`, `requireTenantMember`, or `requireTenantRole` from `src/lib/auth/session.ts` before reading or writing tenant-owned data. Future tenant-owned CRUD must always use the `tenantId` returned by `requireTenantMember`; do not trust tenant IDs from client form data without checking membership.

`TenantHallProfile` is the main business profile of a customer's tenant workspace and is different from operational `Hall` and `Salon` configuration. `/dashboard/hall-info` updates must derive `tenantId` server-side from membership and should require OWNER or ADMIN. STAFF should not edit business identity.

`Hall` records are operational base definitions for branches/properties. Hall create/edit/status actions must derive `tenantId` server-side, scope every query by `tenantId`, and require OWNER or ADMIN. Prefer `isActive=false` for archive/deactivation instead of hard delete.

`Salon` records are operational base definitions for individual spaces inside halls. Salon create/edit/status actions must derive `tenantId` server-side, scope every query by `tenantId`, require OWNER or ADMIN, and verify the selected `hallId` belongs to the same tenant before linking or updating. If a tenant has no halls, the salon page should show a prerequisite state that guides the user to create a hall first. Prefer `isActive=false` for archive/deactivation instead of hard delete.

`PaymentMethod` records are operational base definitions for receiving money. Payment-method create/edit/status/default actions must derive `tenantId` server-side, scope every query by `tenantId`, and require OWNER or ADMIN. Only one active default payment method is allowed per tenant, and setting a default must unset other defaults in the same tenant transaction. Sensitive card/account/IBAN values must not be exposed publicly and must be masked in dashboard summaries.

Payment method type options, Persian labels, masking helpers, completeness helpers, and duplicate-safe `formatPaymentMethodLabel` behavior must come from `src/lib/payment-method-options.ts` or a shared payment display helper. Do not import option arrays from client components into server pages; keep shared enum values in a server-safe module and use label maps for lookups. Never show duplicate labels such as «چک — چک» and never show raw enum values.

The `/dashboard/payment-methods` UI must stay compact and production-facing: no always-open add form, no irrelevant type-specific fields, no developer/internal explanatory copy, and no full sensitive bank/card/IBAN values in list views. Cash methods should hide bank/card/gateway fields; POS should focus on terminal data; bank transfer should focus on bank/account/IBAN; card-to-card should focus on card details; online gateway should focus on gateway/merchant/terminal data.

Inactive payment methods must not be selectable for new payment creation, but existing payments must continue to display their historical method information. Do not hard-delete payment methods used by payment records; deactivate them instead and keep historical payment displays intact.

`FinancialCategory` records are operational base definitions for reports, expenses, revenue classification, discounts, taxes, and future profit/loss analysis. Financial-category create/edit/status actions must derive `tenantId` server-side, scope every query by `tenantId`, require OWNER or ADMIN, and validate any `parentId` against the same tenant. Prefer `isActive=false` for archive/deactivation instead of hard delete.

Financial category type options and labels must come from `src/lib/financial-category-options.ts`. Do not import option arrays from client components into server pages; keep shared enum values in a server-safe module and use label maps for lookups.

`Customer` records are tenant-owned CRM records. Customer list, detail, create, edit, search, contract prefill, and payment history must always derive `tenantId` from the authenticated tenant membership and must never expose customers across tenants. Customer pages must feel like a production CRM, not a placeholder or feature announcement.

`CalendarDayNote` records are manual reservation-calendar overlays for notes, blocked days, closed days, holidays, and follow-up reminders. Calendar actions must derive `tenantId` server-side, require OWNER or ADMIN for writes, and never trust tenant IDs from form data.

Sensitive identity data such as `User.nationalCode`, `TenantHallProfile.managerNationalCode`, and license images must not appear on public pages. License uploads must reject SVG, validate MIME type and extension, enforce file size limits, randomize filenames, avoid trusting original filenames, and avoid exposing server filesystem paths. Production should use secure object storage instead of local public uploads.

## Business Rules

- The product is multi-tenant: tenant data must never leak across banquet halls.
- A user can access a demo only once from their account. `DemoAccess.userId` uniqueness is the schema-level guard.
- Starting a demo must first safely claim `DemoAccess` inside a transaction, then create the DEMO tenant, OWNER membership, DEMO/TRIALING subscription, contract settings, default payment methods, default financial categories, and mark `DemoAccess` as USED with the tenant id.
- If `DemoAccess` is already USED or EXPIRED, or a race/unique conflict happens while claiming it, redirect to `/demo?status=already-used` and do not create a tenant.
- `/account` is the required no-tenant landing route. `requireTenantMember` redirects there when an authenticated user has no tenant membership.
- After purchase, the system should activate a subscription and grant access to the user's tenant workspace.
- Roles are tenant-scoped through `TenantMember.role`: `OWNER`, `ADMIN`, and `STAFF`.
- Base configuration includes halls, salons, menus, services, contract settings, payment methods, and financial categories.
- Contract registration must later read base definitions automatically, especially halls, salons, menus, services, payment methods, templates, and default clauses.
- `/dashboard/contracts/new` is the professional contract registration route. It must remain Persian RTL, tenant-scoped, and Jalali-only in visible date UI.
- Calendar contract links should pass the selected day as an ISO `eventDate` query param to `/dashboard/contracts/new`; the form must display it as Jalali and store it as a real Prisma `DateTime`.
- Contract customer search must always be tenant-scoped and must never expose customers from another tenant.
- Selected service/menu prices must be snapshotted into `ContractLineItem` records; never rely on mutable base-definition prices when displaying or calculating old contracts.
- Contract money inputs must accept Persian digits, normalize to numeric IRR values, and store amounts as Prisma decimal/IRR fields.

## Server Action Rules

- Validate all server-action input with zod.
- Normalize emails before persistence or lookup.
- Never perform tenant-owned writes without `requireTenantMember` or `requireTenantRole`.
- Return clear Persian validation errors for user-correctable failures.
- Use redirects for successful auth/demo flows when appropriate.

## Prisma Notes

Prisma 7 uses `prisma.config.ts` for the datasource URL. Keep the schema datasource provider as PostgreSQL and configure `DATABASE_URL` in `.env`.

- Do not use dynamic import for `@prisma/client`.
- Use the stable Prisma singleton exported from `src/lib/prisma.ts`.
- Never require or instantiate Prisma Client on pages that do not need database access during render; public/auth pages should render forms without opening a database connection.
- Prisma 7 requires the PostgreSQL adapter in `src/lib/prisma.ts`; keep `@prisma/adapter-pg` and `pg` installed unless the client generator/runtime strategy changes.
- Keep `getPrisma()` only as a compatibility wrapper unless the codebase is fully migrated to direct `prisma` imports.
- Do not reintroduce manual fake Prisma client types. Use generated types from `@prisma/client`.
- Keep `DATABASE_URL` documented in `.env.example`; it must point to a running PostgreSQL database in the developer's real `.env`.
- Run `npx prisma generate` after Prisma schema changes and before relying on generated types.
- Create migrations with `npm run prisma:migrate`.
- After environment or Prisma changes, restart the dev server. If Next.js serves a stale generated client, clear `.next` and restart dev after generation.


## Contract Pricing Agent Rules

- Never hardcode contract service/menu prices inside `/dashboard/contracts/new`; contract pricing must consume tenant-scoped base definitions from services and menus.
- `/dashboard/services` and `/dashboard/menus` are the editable source of truth for new contract items. Create/edit/quick-price/toggle actions must be tenant-scoped, role-protected, validate prices as non-negative integer IRR values, and revalidate their own catalog route, matching `/dashboard/base/...` route, `/dashboard/base`, and `/dashboard/contracts/new`.
- Selected contract items must be saved as immutable `ContractLineItem` snapshots so later base-definition edits do not mutate historical contract totals.
- Used service/menu items should be deactivated instead of hard-deleted by default; historical contracts must continue to display their line-item snapshots. If a used item is requested for deletion, show a Persian message that it was deactivated instead.
- Contract time fields must use `HH:mm` only, 24-hour format, no seconds. Store values like `20:30`, and show Persian digits only as display labels when useful.
- `PER_GUEST` items must recalculate from the current guest count. Food, drink, and dessert defaults are per guest unless a base definition explicitly says otherwise.
- Do not show irrelevant quantity controls. Show quantity for `PER_ITEM`, hours for `PER_HOUR`, no extra quantity for `FIXED` or `PER_GUEST`, and custom amount/note for `CUSTOM`.
- If a selected service/menu item has a zero or missing base price, show the Persian missing-price warning. Require a valid override before save when overrides are allowed; if override is disabled, block saving until the base price is completed in `/dashboard/menus` or `/dashboard/services`.
- Server actions must re-read selected service/menu sources with the authenticated `tenantId` and must not trust names, categories, pricing types, or base prices sent by the client.


## Service Catalog Agent Rules

- Never hardcode service prices or service item lists in `/dashboard/contracts/new`; future contracts must consume active, tenant-scoped service definitions from `/dashboard/services`.
- Treat `/dashboard/services` as the source of truth for ceremony service prices used only by future contracts. Old contracts must keep `ContractLineItem` snapshot prices.
- Missing-price services must be visible and actionable through KPI, filters, row badges, and `قیمت سریع`/`تکمیل قیمت` actions. `CUSTOM` services can be ready without a base price because their amount is entered during contract registration.
- Prefer deactivation over hard delete for service definitions, especially when a service may be referenced by existing contract snapshots.
- Do not show internal snapshot/database explanations in production service management UI; keep those details in README/AGENTS and user-facing copy focused on operational outcomes.

## Menu Catalog Agent Rules

- Never hardcode menu prices or menu item lists in `/dashboard/contracts/new`; future contracts must consume active, tenant-scoped menu definitions from `/dashboard/menus`.
- Treat `/dashboard/menus` as the source of truth for catering/menu prices used only by future contracts. Old contracts must keep `ContractLineItem` snapshot prices.
- Do not show `اقلام داخل منو` for normal food, drink, or dessert items. Only show package contents as `اقلام داخل پکیج` when the item category is `پکیج‌ها`.
- Missing-price menu items must be visible and actionable through KPI, filters, row badges, and `قیمت سریع`/`تکمیل قیمت` actions.
- Prefer deactivation over hard delete for menu definitions, especially when an item may be referenced by existing contract snapshots.


## Contract Settings Agent Rules

- Treat `/dashboard/contract-settings` as the tenant-scoped configuration center for future contract numbering, financial defaults, required customer fields, formal contract texts, print template behavior, and signature labels.
- The page must stay grouped by workflow sections such as `شماره‌گذاری`, `پیش‌فرض‌های مالی`, `اطلاعات الزامی مشتری`, `متن‌های قرارداد`, and `چاپ و امضا`; do not regress it into a raw, very long settings form.
- Visible UI copy on contract settings must be production-safe. Do not show demo, developer, TODO, placeholder, MVP, database, Prisma, schema, or storage explanations to operators. Keep technical storage details in documentation.
- Contract settings save actions must derive `tenantId` from the authenticated membership, require OWNER or ADMIN for writes, validate with zod, normalize Persian/Arabic digits for numeric fields, and revalidate `/dashboard/contract-settings`, `/dashboard/contracts/new`, `/dashboard/contracts`, and `/dashboard/base`.
- Contract numbering inputs must validate the prefix and positive next number. If a fiscal year/period label is used, the generated preview and contract creation logic must remain consistent.
- Financial default percentages must validate between ۰ and ۱۰۰ and be displayed with Persian digits. Money previews must use ریال formatting.
- Existing contracts should not be silently recalculated when contract settings change. New contract creation may consume the latest settings for numbering and defaults, while historical contract line items remain snapshots.

## Verification Expectations

Run checks when possible:

```bash
npm run lint
npm run typecheck
npm run build
```

If Prisma binaries or PostgreSQL are unavailable, document the limitation and keep schema/code changes consistent.

## قوانین مرکز مدیریت قراردادها

- صفحه `/dashboard/contracts` باید همیشه tenant-scoped بماند و هیچ query قرارداد، مشتری، تالار، سالن، پرداخت یا line item بدون `tenantId` اجرا نشود.
- صفحه `/dashboard/contracts` باید مثل مرکز عملیات قراردادها باشد، نه فهرست ساده یا تکرار sidebar. هدر باید خلاصه واقعی، KPIهای اولویت‌دار، فیلترهای فشرده، toolbar نتایج، نمای کارت/فشرده و صفحه‌بندی داشته باشد.
- KPIهای قرارداد باید با اولویت مراسم‌های پیش‌رو، مانده قابل پیگیری، مبلغ دریافت‌شده، مبلغ کل قراردادها، قراردادهای ماه جاری جلالی و تعداد کل قراردادها نمایش داده شوند و هیچ metric ساختگی یا demo row نشان داده نشود.
- فیلترهای صفحه قرارداد باید compact بمانند: جست‌وجوی شماره قرارداد/مشتری/موبایل/کد ملی و فیلترهای اصلی همیشه دیده شوند؛ فیلترهای تالار، سالن، نوع مراسم و بازه تاریخ مراسم در بخش پیشرفته تاشونده قرار بگیرند.
- کارت قرارداد باید فقط وضعیت‌های اصلی را در بالا نشان دهد: شماره قرارداد، وضعیت قرارداد و وضعیت پرداخت. از انباشت chipهای چرخه‌ای یا enum خام در بالای کارت پرهیز کن.
- اکشن‌های کارت قرارداد باید کنار هم و conditional باشند. «مشاهده جزئیات» اقدام اصلی است؛ «ثبت پرداخت» فقط وقتی مانده واقعی وجود دارد و قرارداد لغوشده نیست نمایش داده شود؛ چاپ باید به `/dashboard/contracts/[id]/print` وصل باشد.
- منوی عملیات قرارداد نباید action شکسته یا نمایشی داشته باشد. فقط مسیرها/فرم‌های واقعی مانند مشاهده پرونده، مشاهده پرداخت‌ها، چاپ و تغییر وضعیت مجاز را نشان بده و برای نقش‌های غیرمجاز action مدیریتی نگذار.
- خلاصه مالی فهرست قراردادها باید از مبلغ ذخیره‌شده قرارداد و پرداخت‌های همان قرارداد ساخته شود؛ هرگز قیمت فعلی منو یا خدمات پایه را برای مانده، پرداخت‌شده یا جمع قراردادهای تاریخی جایگزین نکن.
- صفحه جزئیات `/dashboard/contracts/[id]` باید قرارداد را فقط با ترکیب `id + tenantId` واکشی کند؛ نمایش قرارداد tenant دیگر ممنوع است.
- صفحه چاپ `/dashboard/contracts/[id]/print` باید قرارداد را فقط با ترکیب `id + tenantId` واکشی کند و اگر قرارداد tenant فعلی نبود `notFound()` بدهد.
- قالب چاپ قرارداد باید A4 portrait و برای یک صفحه بهینه باشد، از `@page`، CSS چاپ، تایپوگرافی فشرده و بخش شروط دو ستونه استفاده کند و در خروجی چاپ هیچ sidebar، topbar، دکمه یا UI تعاملی داشبورد دیده نشود.
- استراتژی فعلی PDF قرارداد، چاپ مرورگر و Save as PDF است؛ server-side PDF generation مثل Puppeteer/pdfkit اضافه نکن مگر در فاز جداگانه درخواست شود.
- نسخه چاپی قرارداد باید فقط تاریخ‌های جلالی/شمسی، ارقام فارسی و مبالغ ریالی نشان دهد و هرگز تاریخ میلادی، enum خام یا متن فنی نمایش ندهد.
- خدمات و منوی نسخه چاپی باید از snapshotهای `ContractLineItem` همان قرارداد خوانده شوند؛ قیمت‌ها یا عنوان‌های فعلی `/dashboard/services` و `/dashboard/menus` نباید برای قراردادهای قبلی جایگزین شوند.
- نسخه چاپی باید از اطلاعات `/dashboard/hall-info` و `/dashboard/contract-settings` برای نام/نشانی/تماس تالار، شماره مجوز، شروط قرارداد، عنوان امضاها و تنظیمات نمایش چاپ استفاده کند و برای داده‌های ناقص فقط متن فارسی کم‌رنگ `ثبت نشده` نشان دهد.
- پس از ثبت موفق قرارداد، جریان باید کاربر را به جزئیات قرارداد با پیشنهاد چاپ هدایت کند یا اگر فرم کلاینتی id قرارداد را دریافت می‌کند دیالوگ چاپ نشان دهد؛ جریان ثبت قرارداد نباید برای این قابلیت شکسته شود.
- در UI هرگز enum خام مثل `DRAFT`، `RESERVED`، `CONFIRMED`، `COMPLETED` یا `CANCELED` نمایش نده؛ همیشه از برچسب فارسی استفاده کن.
- تاریخ‌های قرارداد، پرداخت و activity فقط با تقویم جلالی/شمسی نمایش داده شوند و تاریخ میلادی در UI دیده نشود.
- مبالغ قرارداد، بیعانه، پرداخت‌شده، مانده، قیمت واحد و جمع line item باید با جداکننده سه‌رقمی، ارقام فارسی و واحد «ریال» نمایش داده شوند.
- فهرست قراردادها باید برای تعداد زیاد قرارداد آماده باشد: فیلترها و مرتب‌سازی‌ها server-side باشند و صفحه‌بندی حفظ شود.
- صفحه جزئیات باید از snapshotهای `ContractLineItem` استفاده کند، نه قیمت‌های فعلی تعاریف پایه.
- لینک‌های تقویم به قرارداد باید به `/dashboard/contracts/[id]` بروند و جریان ثبت قرارداد جدید در `/dashboard/contracts/new` نباید شکسته شود.
- کارت‌های فهرست قرارداد باید وضعیت قرارداد، وضعیت پرداخت، چرخه عملیاتی و اقدام بعدی را در یک نگاه روشن کنند.
- در فهرست قراردادها فرم بزرگ تغییر وضعیت را به‌صورت پیش‌فرض نمایش نده؛ تغییر وضعیت باید در بخش عملیات فشرده یا قابل بازشدن باشد.
- فهرست قراردادها باید برای تعداد زیاد رکورد آماده بماند: جست‌وجو، فیلتر، مرتب‌سازی، شمارش نتایج و صفحه‌بندی را حفظ کن.
- enum خام قرارداد یا پرداخت مثل `DRAFT`، `RESERVED`، `PAID` یا `PARTIAL` هرگز در UI فارسی نمایش داده نشود.
- صفحه جزئیات قرارداد باید مثل پرونده حرفه‌ای قرارداد باشد: هدر قوی، KPIهای فشرده، وضعیت قرارداد/پرداخت، اقدام بعدی و اطلاعات مشتری/مراسم در چند ثانیه قابل فهم باشند.
- پنل مالی جزئیات قرارداد باید فشرده و متعادل بماند و با نوار پیشرفت پرداخت، مبلغ نهایی، پرداخت‌شده و مانده را روشن کند؛ نباید کل صفحه را تحت سلطه بگیرد.
- آیتم‌های قرارداد در صفحه جزئیات باید همیشه از snapshotهای `ContractLineItem` نمایش داده شوند و مانند فاکتور/لیست اقلام قرارداد خوانا باشند.
- خط زمانی پرداخت در صفحه جزئیات باید تراکنش‌های پرداخت را نمایش دهد، نه کارت‌های تکراری قرارداد.
- صفحه `/dashboard/customers` باید CRM واقعی باشد، نه لیست ساده یا دایرکتوری مسیرها: هدر فشرده، KPIهای عملیاتی، جست‌وجو، فیلتر حرفه‌ای، کارت/ردیف مشتری، وضعیت مالی، اقدام بعدی و صفحه‌بندی داشته باشد.
- KPIها و خلاصه‌های مشتریان باید از داده واقعی tenant فعلی ساخته شوند؛ نمایش عدد نمونه، demo row یا metric ساختگی ممنوع است.
- فیلترهای مشتری باید با داده واقعی کار کنند. جست‌وجو باید نام، شماره همراه و کد ملی را پوشش دهد و ارقام فارسی/عربی را برای query دیتابیس نرمال کند.
- کارت مشتری باید برای اسکن سریع CRM طراحی شود: هویت، تماس، وضعیت فعال/مالی، تعداد قراردادها، آخرین/نزدیک‌ترین مراسم، مجموع قراردادها، پرداخت‌شده و مانده را فشرده نشان بدهد و برای فیلدهای ناقص فضای خالی بزرگ نسازد.
- اقدام اصلی کارت مشتری باید «مشاهده پرونده» باشد. «ثبت قرارداد»، «ثبت پرداخت مانده»، «ویرایش» و «مشاهده قراردادها» باید اولویت بصری پایین‌تری داشته باشند و لینک شکسته ایجاد نکنند.
- خلاصه مالی مشتری باید از قراردادها و پرداخت‌های واقعی همان tenant محاسبه شود و برای قراردادهای تاریخی به snapshot/مقادیر ذخیره‌شده قرارداد و پرداخت تکیه کند، نه قیمت فعلی منو یا خدمات.
- صفحه مشتریان نباید همه مشتریان را بدون صفحه‌بندی بارگذاری کند. برای لیست اصلی از `page` و `pageSize` استفاده کن و queryها را محدود نگه دار.
- صفحه `/dashboard/customers/[id]` باید پرونده مشتری را با اطلاعات هویتی، سوابق قرارداد، پرداخت‌ها و فعالیت پایه نمایش دهد.
- جست‌وجوی مشتری در فرم قرارداد و API مشتریان باید همیشه tenant-scoped بماند و با query ساده یا `customerId` نباید مشتری tenant دیگر prefill شود.
- متن‌های raw placeholder، feature announcement، TODO یا enum خام نباید در UI تولیدی مشتریان دیده شوند.

## قوانین سیستم پرداخت‌ها

- همه queryها و actionهای پرداخت باید tenant-scoped باشند؛ پرداخت را فقط با `id + tenantId` بخوان یا تغییر بده.
- `tenantId`، مبلغ محاسبه‌شده قرارداد، مشتری قرارداد و مالکیت روش پرداخت را هرگز از client/formData اعتماد نکن؛ همیشه server-side با membership فعلی واکشی و اعتبارسنجی کن.
- پرداخت‌ها را hard-delete نکن. برای void/cancel فقط وضعیت را `CANCELED` کن و مانده قرارداد را دوباره محاسبه کن.
- روش پرداخت باید از `/dashboard/payment-methods` و رکورد فعال همان tenant بیاید. اگر روش فعالی وجود ندارد، prerequisite state فارسی نشان بده.
- ورودی مبلغ پرداخت باید ارقام فارسی/عربی را بپذیرد، به عدد صحیح ریالی normalize شود و به‌صورت Decimal/IRR ذخیره شود.
- تاریخ پرداخت و تاریخ سررسید چک باید در UI جلالی باشند و در دیتابیس DateTime استاندارد ذخیره شوند.
- نوع و وضعیت پرداخت نباید به‌صورت enum خام در UI دیده شوند؛ از برچسب‌های فارسی `src/lib/payments/display.ts` استفاده کن.
- UIهای لوکس پرداخت نباید ورودی خام فایل مرورگر مثل Browse یا No file selected نشان دهند؛ آپلود رسید باید با کارت سفارشی فارسی انجام شود و input واقعی مخفی بماند.
- فیلدهای چک مانند شماره چک و تاریخ سررسید فقط برای روش پرداخت از نوع چک نمایش داده شوند و برای سایر روش‌ها پنهان بمانند.
- فرم‌های ثبت پرداخت باید پیش از submit اثر پرداخت روی مانده قرارداد را نشان دهند: مبلغ پرداخت، مانده فعلی و مانده پس از ثبت.
- در `/dashboard/payments` کارت پرداخت باید payment-first باشد: نوع پرداخت، وضعیت و مبلغ پرداخت عناصر اصلی‌اند؛ شماره قرارداد، مشتری، تاریخ مراسم و مانده قرارداد فقط context ثانویه هستند.
- چند پرداخت برای یک قرارداد را هرگز شبیه چند کارت قرارداد تکراری نمایش نده؛ برچسب ترتیب پرداخت و لینک قرارداد مرتبط را روشن نشان بده.
- پرداخت‌های `CANCELED`، `RETURNED` و `PENDING` در جمع پرداخت‌شده قرارداد محاسبه نمی‌شوند. نوع `REFUND` باید از جمع پرداخت‌ها کم شود.
- بعد از create/update/cancel پرداخت، مسیرهای `/dashboard/payments`، `/dashboard/contracts`، `/dashboard/contracts/[id]` و `/dashboard/reports` را revalidate کن.
- رسید پرداخت فقط با MIME مجاز و حداکثر ۵ مگابایت پذیرفته شود، نام فایل random باشد، SVG رد شود، و مسیر filesystem سرور در UI نمایش داده نشود.
- صفحه قرارداد و جزئیات قرارداد باید برای ثبت پرداخت به `/dashboard/payments/new?contractId=<id>` لینک بدهند و جریان `/dashboard/contracts/new` نباید شکسته شود.

## قوانین انتخاب تاریخ جلالی

- هر UI جدید برای انتخاب تاریخ باید از `src/components/ui/jalali-date-picker.tsx` و کامپوننت `JalaliDatePicker` استفاده کند.
- استفاده از `<input type="date">` برای تاریخ‌های قابل مشاهده کاربر ممنوع است، چون تقویم میلادی مرورگر را نشان می‌دهد.
- هیچ تاریخ میلادی نباید در رابط فارسی نمایش داده شود؛ نمایش باید با تقویم جلالی/شمسی، متن RTL، ماه‌های فارسی و ارقام فارسی باشد.
- مقدار فرم/کوئری می‌تواند ISO/date-only باشد، اما ذخیره در Prisma باید `DateTime` واقعی بماند؛ رشته جلالی را در فیلدهای DateTime ذخیره نکن.
- فیلترهای تاریخ مثل «از تاریخ» و «تا تاریخ» هم باید JalaliDatePicker داشته باشند، نه ورودی متنی میلادی یا تاریخ تایپی خام.
- برای تاریخ‌های روزمحور مثل `eventDate`، `paidAt`، `chequeDueDate`، `licenseIssuedAt` و `licenseExpiresAt` از helperهای `src/lib/date/jalali.ts` مثل `parseDateLikeToDate` و `toDateOnlyString` استفاده کن تا خطای timezone ایجاد نشود.

## Production UI Copy

- Do not expose developer or implementation notes in production UI.
- Technical storage details such as DateTime, Prisma, schema, ISO conversion, or tenant-scoped queries must stay in documentation and code comments, not visible product screens.
- Date picker fields should show a clear label and the Jalali picker only; avoid repetitive helper text unless it materially helps the operator.
- Payment pages must feel commercial and final: no demo, placeholder, MVP, TODO, or future-implementation copy in visible UI.

## Reports Agent Rules

- `/dashboard/reports` must never be a placeholder or roadmap page. It must show production-safe financial and operational reporting UI.
- Reports must prioritize executive KPIs and financial health above long report sections so the manager understands business status within a few seconds.
- Every reports query must be tenant-scoped with the authenticated membership `tenantId`; never aggregate contracts, payments, expenses, customers, halls, salons, financial categories, or payment methods across tenants.
- All visible report dates must be Jalali/Shamsi with Persian labels and Persian digits. Use `JalaliDatePicker` for visible date filters and never show browser Gregorian date inputs.
- Report filters must stay compact, collapsible/mobile-friendly, and must include a selected-filter summary when practical.
- All monetary report values must be formatted as Rial with three-digit grouping and Persian digits.
- Canceled, returned, and pending payments must not count as received. Refund payments must subtract from received totals.
- Reports should use aggregate queries and limited result lists where practical. Latest payments, upcoming events, outstanding balances, and recent financial activity should be limited for scalable dashboard rendering.
- Report empty states must be compact and actionable; avoid oversized empty boxes that weaken the executive dashboard.
- Do not duplicate latest payments and recent activity as separate long sections. Use a compact latest-payment highlight or a combined financial activity ledger.
- Placeholder feature boxes, development roadmap copy, TODO/MVP language, raw enum labels, and technical implementation notes are not allowed in the production reports UI.
- CSV export must preserve the active filters and remain tenant-scoped. Do not expose data from other workspaces through export routes.
- Unimplemented exports such as real Excel or PDF must be clearly marked «به‌زودی» and must not appear as fully active export actions.

## Expense Management Agent Rules

- همه queryها و actionهای هزینه باید tenant-scoped باشند؛ هزینه را فقط با `id + tenantId` بخوان یا تغییر بده.
- `tenantId`، مالکیت دسته‌بندی مالی، روش پرداخت، قرارداد، مشتری، تالار و سالن را هرگز از client/formData اعتماد نکن؛ همیشه server-side با membership فعلی اعتبارسنجی کن.
- رکوردهای مالی هزینه را hard-delete نکن. برای حذف عملیاتی فقط وضعیت را `CANCELED` کن و مسیرهای `/dashboard/expenses`، `/dashboard/reports` و قرارداد مرتبط را revalidate کن.
- هزینه‌های `CANCELED` نباید در گزارش‌ها، سود تقریبی یا مجموع هزینه‌ها محاسبه شوند؛ اما باید در جزئیات و تاریخچه خود رکورد قابل مشاهده بمانند.
- تاریخ وقوع هزینه در UI باید جلالی/شمسی باشد و با `JalaliDatePicker` انتخاب شود؛ در دیتابیس باید `DateTime` استاندارد ذخیره شود.
- مبلغ هزینه باید به‌صورت ریال integer/decimal ذخیره شود، ارقام فارسی/عربی را در ورودی بپذیرد و در UI با ارقام فارسی، جداکننده سه‌رقمی و «ریال» نمایش داده شود.
- آپلود رسید هزینه باید MIME و حجم را اعتبارسنجی کند: فقط JPG، PNG، WebP یا PDF تا ۵ مگابایت مجاز است و SVG پذیرفته نشود.
- در UI هزینه‌ها enum خام مثل `RECORDED` یا `CANCELED` نمایش نده؛ همیشه از برچسب‌های فارسی استفاده کن.
- مسیر `/dashboard/expenses` نباید placeholder یا roadmap باشد؛ باید KPI، جست‌وجوی همیشه‌قابل‌دیدن، فیلترهای پیشرفته تاشونده، summary فیلتر فعال، لیست عملیاتی، empty state حرفه‌ای و اکشن ثبت هزینه داشته باشد.
- لیست هزینه‌ها باید مانند دفتر مالی/ledger رفتار کند؛ کارت هر هزینه باید مبلغ، تاریخ، دسته‌بندی، وضعیت، روش پرداخت، زمینه قرارداد یا هزینه عمومی، وضعیت رسید و اثر در گزارش‌ها را در یک نگاه نشان دهد.
- اکشن‌های کارت هزینه باید داخل کارت یکپارچه باشند و به‌صورت ستون جداافتاده یا دکمه‌های ضعیف/شکسته دیده نشوند. اکشن ناموجود را پنهان کن یا دلیل واضح نشان بده؛ برای هزینه لغوشده به‌جای دکمه disabled، برچسب «لغوشده» نمایش بده.
- گزارش‌ها باید هزینه‌های غیرلغوشده را در مجموع هزینه‌ها، سود تقریبی، دسته‌بندی هزینه و آخرین رویدادهای مالی لحاظ کنند.

## Settings Hub Agent Rules

- مسیر `/dashboard/settings` نقطه ورود رسمی برای تنظیمات اعلان‌ها، ارتباطات، امنیت، پشتیبان‌گیری و تنظیمات عمومی سامانه است.
- صفحات تنظیمات نباید متن توسعه‌ای، placeholder، TODO، MVP، جزئیات Prisma/schema یا توضیح فنی داخلی را در UI تولیدی نمایش دهند.
- Settings Hub مسیر ورود اعلان‌ها و integrationهاست. ارسال واقعی Telegram/SMS و dispatch رویدادها فقط در فازهای بعدی مجاز است؛ هسته دیتابیس قالب‌ها، تنظیمات و لاگ‌ها اکنون وجود دارد.
- وقتی integrationهای تلگرام و پیامک در فازهای بعدی پیاده‌سازی می‌شوند، همه تنظیمات باید tenant-scoped باشند و توکن‌ها، کلیدهای API و شناسه‌های حساس باید mask و encrypted ذخیره شوند.
- ارسال اعلان نباید جریان‌های اصلی کسب‌وکار مثل ثبت قرارداد، پرداخت یا هزینه را بلوکه کند؛ شکست اعلان باید قابل پیگیری باشد اما عملیات اصلی را خراب نکند.
- دکمه‌های صفحات تنظیمات باید high-contrast و خوانا باشند؛ وضعیت «نیازمند اتصال» یا «آماده پیکربندی» نباید مثل اتصال موفق نمایش داده شود.

## Security Settings Agent Rules

- مسیر `/dashboard/settings/security` باید مرکز امنیتی واقعی و tenant-aware بماند؛ هیچ داده امنیتی یا لاگ اعلان نباید بدون `tenantId` عضویت فعلی خوانده شود.
- قابلیت امنیتی را جعل نکن. اگر نشست‌های فعال در دیتابیس ذخیره نمی‌شوند، دستگاه‌ها یا IPهای ساختگی نمایش نده و وضعیت محدودیت را با متن فارسی تولیدی و CTA خروج از حساب نشان بده.
- تغییر رمز عبور فقط برای حسابی مجاز است که `passwordHash` دارد؛ action باید رمز فعلی را با bcrypt بررسی کند، رمز جدید را هش کند، فقط کاربر فعلی را به‌روزرسانی کند و پیام فارسی تمیز برگرداند.
- رمز عبور خام، hash رمز، توکن تلگرام، کلید API پیامک و هر secret دیگری هرگز نباید در UI، state کلاینت، لاگ، README یا خطا نمایش داده شود.
- تغییر نقش یا غیرفعال‌سازی اعضا را فقط وقتی پیاده کن که جریان اختصاصی و مجوز OWNER روشن باشد؛ تا قبل از آن، صفحه امنیت فقط مرور tenant members را نشان دهد.
- رویدادهای حساس مثل تغییر رمز عبور باید با `eventType = SECURITY_EVENT` در `NotificationLog` ثبت شوند یا از dispatcher امن اعلان‌ها عبور کنند؛ شکست اعلان نباید عملیات امنیتی اصلی را rollback کند.
- UI امنیت باید بین قابلیت فعال، نیازمند اتصال و قابلیت پشتیبانی‌نشده تمایز واضح بگذارد و هیچ enum خام یا متن فنی داخلی به کاربر نشان ندهد.

## Backup And Export Agent Rules

- مسیر `/dashboard/settings/backups` باید مرکز واقعی پشتیبان‌گیری و خروجی اطلاعات بماند؛ هیچ خروجی، تاریخچه یا آمار بکاپ نباید بدون `tenantId` عضویت فعلی خوانده شود.
- همه routeهای export باید کاربر احراز هویت‌شده و نقش OWNER یا ADMIN را الزام کنند، `tenantId` را فقط server-side از membership بگیرند و هرگز tenantId را از query، فرم یا client نپذیرند.
- خروجی CSV باید با UTF-8 BOM، هدر فارسی، تاریخ‌های جلالی/شمسی، ارقام فارسی و برچسب‌های فارسی تولید شود و نباید enum خام در فایل قابل مشاهده باشد.
- نسخه پشتیبان کامل باید از snapshot داده‌های همان tenant ساخته شود و رمز عبور، password hash، session token، توکن خام تلگرام، کلید خام پیامک، ciphertext محرمانه یا secret خام دیگری را صادر نکند.
- برای تنظیمات Telegram/SMS در خروجی کامل فقط وضعیت فعال بودن، configured بودن secret، مقدار mask شده، provider/status و تنظیمات غیرمحرمانه مجاز است.
- خروجی‌های قرارداد باید از داده ذخیره‌شده همان قرارداد و line item snapshotها استفاده کنند؛ قیمت فعلی منو/خدمات نباید برای قراردادهای تاریخی جایگزین شود.
- اگر مدل `BackupExportLog` وجود دارد، هر خروجی موفق یا ناموفق باید best-effort ثبت شود؛ شکست ثبت لاگ نباید دانلود اصلی را خراب کند.
- بازیابی اطلاعات نباید جعلی یا مخرب باشد. تا زمانی که طراحی امن restore وجود ندارد، صفحه فقط راهنمای بازیابی کنترل‌شده نشان بدهد و هیچ دکمه‌ای که وانمود به restore مستقیم می‌کند اضافه نکن.
- خروجی‌ها و UI بکاپ نباید متن placeholder، TODO، MVP، developer copy، جزئیات Prisma/schema یا خطای خام را به کاربر نشان دهند.


## Notification Database Core Agent Rules

- همه تنظیمات، قالب‌ها و لاگ‌های اعلان باید tenant-scoped باشند و هیچ query یا aggregate اعلان نباید بین tenantها انجام شود.
- فایل‌های `use server` فقط async function صادر کنند؛ constants، labels و type guards باید در ماژول‌های معمولی مثل `src/lib/notifications/constants.ts` بمانند.
- توکن بات تلگرام و کلید API پیامک هرگز خام در UI، لاگ، README یا خروجی خطا نمایش داده نشوند؛ در UI فقط مقدار mask شده مجاز است.
- ذخیره مقدار محرمانه باید با helper رمزگذاری و secret محیطی انجام شود. نبود secret محیطی نباید build را خراب کند، اما هنگام ذخیره secret واقعی باید خطای server-side شفاف بدهد.
- قالب‌های اعلان از syntax متنی `{{variableName}}` استفاده می‌کنند، plain text هستند و نباید eval، HTML injection یا template execution داشته باشند.
- ساخت قالب‌های پیش‌فرض باید idempotent باشد و با upsert از ایجاد قالب تکراری جلوگیری کند.
- شکست ارسال خارجی در فازهای بعدی باید در `NotificationLog` ثبت شود و نباید ثبت قرارداد، پرداخت، هزینه یا مشتری را خراب کند.
- وضعیت‌های لاگ باید با برچسب فارسی نمایش داده شوند: در صف ارسال، ارسال‌شده، ناموفق، لغوشده و نادیده گرفته‌شده. enum خام در UI نمایش نده.
- تا زمانی که Telegram/SMS sender واقعی پیاده‌سازی نشده، هیچ صفحه‌ای نباید وضعیت اتصال را به‌صورت موفقیت ساختگی نشان دهد. از «آماده پیکربندی»، «غیرفعال» یا «نیازمند اتصال» استفاده کن.

## In-App Notification Bell Agent Rules

- زنگوله هدر داشبورد باید همیشه اعلان‌ها و یادآوری‌های واقعی، tenant-scoped و قابل اقدام را نشان دهد؛ آیکن اعلان تزئینی، آیتم ثابت یا داده نمونه ممنوع است.
- `InAppNotification` یک جدول tenant-owned است. همه sync، read، mark-read و dismiss باید `tenantId` را server-side از عضویت فعلی بگیرند و هرگز به tenantId کلاینت اعتماد نکنند.
- یادآوری‌های داخل برنامه باید با fingerprint قطعی ساخته شوند تا در هر رندر هدر تکراری تولید نشوند. رد کردن یا خوانده‌شدن اعلان نباید با sync سبک بعدی بی‌دلیل از بین برود.
- sync زنگوله باید سبک بماند: بازه‌های تاریخ محدود، تعداد لاگ‌های محدود، queryهای tenant-scoped و بدون analytics سنگین. گزارش‌های پرهزینه متعلق به صفحه گزارش‌ها هستند.
- اعلان‌های قابل تولید شامل مراسم امروز/فردا/نزدیک، مانده قرارداد نزدیک، خطای ارسال Telegram/SMS، ناقص بودن تنظیمات تلگرام/پیامک، پایان نزدیک دمو/اشتراک، نقص اطلاعات حساب و نقص اطلاعات تالار است؛ هیچ موردی نباید بدون داده واقعی ساخته شود.
- UI زنگوله باید فقط برچسب فارسی severity و نوع اعلان را نشان دهد. enum خام مثل `EVENT_TOMORROW`، `WARNING` یا `FAILED` در رابط کاربری ممنوع است.
- اکشن‌های خوانده‌شدن، خوانده‌شدن همه و dismiss باید server action امن باشند، مسیرهای داشبورد مرتبط را revalidate کنند و داده tenant دیگر را لمس نکنند.
- اعلان داخل برنامه جایگزین Telegram/SMS نیست؛ زنگوله برای یادآوری داخلی داشبورد است و خطاهای ارسال بیرونی فقط از `NotificationLog` واقعی به آن وارد می‌شوند.

## Telegram Settings Agent Rules

- توکن بات تلگرام هرگز نباید خام در HTML، state کلاینت، لاگ، پیام خطا، README یا `NotificationLog` نمایش داده یا ذخیره شود؛ فقط مقدار encrypted و masked مجاز است.
- همه تماس‌های Telegram Bot API باید server-side باشند و هیچ درخواست تلگرام از client component مجاز نیست.
- ذخیره تنظیمات تلگرام باید فقط برای نقش‌های `OWNER` و `ADMIN` انجام شود و همیشه `tenantId` را server-side از membership بگیرد.
- اگر کلید رمزگذاری (`NOTIFICATION_SECRET_KEY`، `NEXTAUTH_SECRET` یا `AUTH_SECRET`) تنظیم نشده باشد، action باید پیام فارسی تمیز برگرداند و crash خام نمایش ندهد.
- اگر فیلد توکن در صفحه تلگرام خالی ارسال شد، یعنی توکن فعلی باید حفظ شود؛ کاربر نباید برای ویرایش زمان‌بندی یا chat مجبور به ورود مجدد توکن شود.
- دریافت `chatId` و `chatTitle` از `getChat` و جستجوی گفتگوهای اخیر با `getUpdates` فقط باید server-side و با توکن رمزگشایی‌شده در همان request انجام شود؛ توکن رمزگشایی‌شده هرگز به client یا state action برنگردد.
- ورودی گفتگو باید `@username`، `t.me/...`، `https://t.me/...` و شناسه عددی را normalize کند و خطاهای Telegram API را به پیام فارسی تمیز تبدیل کند؛ raw JSON، status خام یا متن فنی تلگرام در UI نمایش نده.
- UI زمان گزارش روزانه باید فارسی‌پسند باشد؛ مقدار ذخیره‌شده در دیتابیس `HH:mm` بدون ثانیه بماند و نمایش گزینه‌ها با ارقام فارسی مجاز است.
- هر پیام تست تلگرام باید قبل از ارسال `NotificationLog` با وضعیت `QUEUED` بسازد و نتیجه را به `SENT` یا `FAILED` تغییر دهد.
- شکست ارسال تلگرام باید در لاگ اعلان ثبت شود و هیچ توکن یا payload محرمانه‌ای در خطا ذخیره نشود.
- تنظیمات تلگرام و پیام تست پیاده شده‌اند؛ dispatch رویدادهای قرارداد، پرداخت، هزینه و مشتری اکنون از helper best-effort استفاده می‌کند و SMS همچنان فاز جداگانه است.

## Telegram Event Dispatch Agent Rules

- ارسال اعلان تلگرام برای رویدادهای کسب‌وکار باید فقط بعد از موفقیت commit عملیات اصلی انجام شود؛ هیچ dispatch نباید داخل transaction اصلی باعث rollback قرارداد، پرداخت، هزینه یا مشتری شود.
- `dispatchTelegramNotification` best-effort است. خطای تلگرام باید در `NotificationLog` و تنظیمات تلگرام ثبت شود، اما از اکشن‌های اصلی کسب‌وکار throw نشود.
- همه payloadهای اعلان باید با `tenantId` سمت سرور ساخته شوند و هیچ داده cross-tenant وارد پیام، لاگ یا قالب نشود.
- پیام‌های اعلان باید برچسب فارسی، تاریخ جلالی و مبالغ ریالی داشته باشند؛ enum خام مثل `CONTRACT_CREATED` یا `RECORDED` نباید در پیام قابل مشاهده باشد.
- توکن بات تلگرام هرگز در لاگ، console، state کلاینت، README یا خروجی خطا نمایش داده نشود. فقط مقدار encrypted برای ارسال server-side و masked برای UI مجاز است.
- toggles تنظیمات تلگرام باید محترم شمرده شوند: قرارداد، پرداخت، هزینه و مشتری فقط وقتی ارسال شوند که کانال تلگرام فعال و دسته مربوطه فعال باشد.
- این فاز فقط Telegram event dispatch است؛ SMS dispatch و گزارش‌های زمان‌بندی‌شده نباید در اکشن‌های فعلی اضافه شوند.

## Message Templates and Notification Logs Agent Rules

- صفحه قالب پیام‌ها باید قالب‌ها را بر اساس کانال و حوزه کاری گروه‌بندی کند و هیچ enum خامی مثل `PAYMENT_CREATED` یا `TELEGRAM` در UI نمایش ندهد.
- قالب‌های اعلان plain text هستند؛ از HTML editor، eval، JavaScript execution یا template engine ناامن استفاده نکن. syntax مجاز متغیرها `{{variableName}}` است.
- فرم‌های ویرایش قالب فقط `title`، `body` و `isEnabled` را تغییر دهند. `tenantId`، `channel` و `eventType` نباید از فرم قابل تغییر یا قابل اعتماد باشند.
- همه actionهای قالب و لاگ باید `tenantId` را server-side از membership بگیرند و فقط رکوردهای tenant فعلی را بخوانند یا تغییر دهند.
- بازنشانی قالب باید از متن پیشنهادی `getDefaultNotificationTemplate` استفاده کند و قالب tenant دیگر را لمس نکند.
- صفحه لاگ اعلان‌ها باید جستجو و فیلتر tenant-scoped داشته باشد و تاریخ‌های قابل مشاهده را جلالی نمایش دهد.
- retry لاگ فقط برای اعلان‌های ناموفق تلگرام مجاز است، پیام ذخیره‌شده همان لاگ را دوباره ارسال می‌کند و هیچ secret خامی را در UI، لاگ یا خطا نمایش نمی‌دهد.
- شکست retry باید وضعیت، `failedAt`، `errorMessage` و `attemptCount` همان لاگ را به‌روزرسانی کند و صفحه را crash نکند.
- SMS sending و scheduled reports تا فازهای مربوطه نباید در قالب‌ها یا لاگ‌ها فعال شوند؛ وجود قالب SMS به معنی فعال بودن ارسال SMS نیست.
- دکمه‌ها و empty stateهای قالب/لاگ باید production-safe و high-contrast باشند و متن placeholder، TODO، MVP یا توضیحات فنی داخلی نمایش ندهند.

## SMS panel rules

- کلید API پنل پیامکی هرگز نباید خام در UI، لاگ‌ها، خطاها یا پاسخ‌های server action نمایش داده شود.
- تمام تماس‌های SMS باید فقط server-side انجام شوند و هیچ فراخوانی پیامکی نباید از client اجرا شود.
- ارسال ناموفق پیامک باید در `NotificationLog` با وضعیت `FAILED` ثبت شود و خطای فارسی تمیز داشته باشد.
- ارائه‌دهنده پیامکی که آداپتر واقعی ندارد، نباید موفقیت جعلی برگرداند؛ باید پیام «ارسال تست برای این ارائه‌دهنده هنوز پیکربندی نشده است.» یا متن فارسی مشابه ثبت کند.
- اتصال SMS در این فاز فقط شامل تنظیمات و پیامک تست است؛ dispatch خودکار رویدادهای کسب‌وکار باید در فاز جداگانه انجام شود.
- قالب‌های SMS باید plain text، کوتاه و مناسب پیامک باشند.

## Scheduled Notification Rules

- Scheduled notifications must always be tenant-scoped and must never accept `tenantId` from client input.
- `/api/cron/notifications` must require `CRON_SECRET`; never expose this secret in UI or logs.
- `/api/dashboard/notifications/tick` is only a session-authenticated dashboard fallback for localhost/PWA usage. It must derive tenant membership server-side, require `notifications.manage`, and never trust tenant ids or schedule data from the client.
- متن خروجی اعلان‌های مدیریتی باید قبل از ارسال/ثبت لاگ، wording دمو/trial مثل «دموی تالار»، «دمو» و `DEMO-` را حذف کند؛ هیچ پیام ارسالی، پیش‌نمایش، لاگ نمایشی یا ارسال مجدد به مالک/مدیر نباید پیشوند دمو داشته باشد.
- The dashboard automation client may silently call the tick endpoint after entry and periodically while open, but server-side duplicate checks remain the source of truth.
- Daily scheduled reports should be due once the configured `HH:mm` has passed for that local server day, not only at the exact minute.
- Scheduled sends must avoid duplicate delivery for the same tenant/channel/event/report period.
- Notification sending is best-effort: failures must be logged and must not stop other tenants, channels, or business operations.
- Telegram bot tokens and SMS API keys must never be rendered raw, logged, or included in `NotificationLog`.
- SMS scheduled reports must remain concise and managerial; automatic customer SMS dispatch requires a separate phase with explicit consent and business rules.
- Manual report actions must require authenticated OWNER/ADMIN access and revalidate notification logs and reports.
- Report templates must use plain text `{{variableName}}` syntax and show Persian labels, Jalali dates, Persian digits, and Rial formatting.

## Global Audit Trail Rules

- Every important server-side mutation must create a tenant-scoped audit log through `src/lib/audit/audit-log-service.ts` or the helper functions in `src/lib/audit/audit-action-helpers.ts`.
- Important operations include create, update, cancel, delete, restore, enable, disable, status change, payment received/canceled, expense changes, print, export, backup export, settings update, notification test/send/failure, login, and security-sensitive changes when supported by the flow.
- Always derive `tenantId` from server-side session/membership helpers. Never trust `tenantId`, `userId`, action, or entity ownership from client input.
- Audit logs must never store raw passwords, password hashes, bot tokens, SMS API keys, encrypted secrets, authorization headers, cookies, sessions, access/refresh tokens, private keys, OTPs, or verification codes. Use the sanitizer and store only safe before/after data.
- Audit logging is best effort: an audit write failure must not break the main user operation. Log the failure server-side with safe metadata only.
- User-facing audit UI must show Persian action/entity labels, polished Persian copy, Jalali/Shamsi dates, Persian digits, and `HH:mm` time. Do not expose raw action/entity enum values in normal UI.
- Global audit pages and entity timelines must stay paginated/limited and tenant-scoped. Entity timelines should load only the latest few records, usually 5 or 10.
- Notification delivery logs and audit logs are separate systems. Do not duplicate every automatic notification into `AuditLog`; reserve audit entries for user-triggered notification tests/settings changes or meaningful delivery actions.
- Internal route/model names may remain English, but visible activity-log copy must be final Persian product copy for تالار منیجر.

## قوانین Agent برای حذف امن، دریافت، هزینه، لوگو و پشتیبانی

- هر حذف مهم باید guard سروری، tenant scope و تأیید کاربر داشته باشد.
- مشتری فقط وقتی قابل حذف است که هیچ قراردادی در همان tenant نداشته باشد.
- قرارداد فقط وقتی قابل حذف است که برگزارشده، لغوشده، تسویه‌شده، قفل‌شده یا دارای دریافتی فعال نباشد.
- UI مربوط به پول دریافت‌شده از مشتری باید از «دریافت»، «دریافتی» و «دریافتی‌ها» استفاده کند؛ مسیر و مدل داخلی `Payment` می‌تواند برای پایداری فنی باقی بماند.
- تمام ورودی‌های مبلغ باید فرمت هزارگان را بپذیرند و سرور باید اعداد فارسی/عربی و جداکننده‌ها را به عدد تمیز تبدیل کند.
- ثبت دریافت برای قرارداد تسویه‌شده، لغوشده یا دارای مانده صفر/منفی نباید مجاز باشد مگر قابلیت overpayment صریح طراحی شده باشد.
- داده‌های چک و اقساط باید در مدل‌های ساختاری ذخیره شوند، نه در متن آزاد.
- اگر هزینه به قرارداد وصل شد، تالار/سالن/مشتری باید در سرور از قرارداد همان tenant استخراج شوند و به مقدار ارسالی client اعتماد نشود.
- آپلودها باید MIME و حجم را اعتبارسنجی کنند و فقط URL عمومی امن در `/uploads/tenants/...` ذخیره شود؛ مسیر فایل سیستم یا نام اصلی فایل کاربر نباید به تصمیم امنیتی تبدیل شود.
- لوگوی چاپ قرارداد باید فقط JPG/PNG/WebP تا ۵ مگابایت را بپذیرد، در سمت سرور به تصویر مربعی ۵۱۲×۵۱۲ WebP تبدیل شود، دایره‌ای، object-fit cover و بدون کشیدگی در چاپ/پیش‌فاکتور نمایش داده شود.
- تیکت‌های پشتیبانی و پیام‌ها/پیوست‌ها همیشه tenant-scoped هستند و نباید پیام جعلی پشتیبانی ایجاد شود.
- عملیات جدید باید در صورت وجود AuditLog، لاگ امن و بدون اطلاعات حساس ثبت کند؛ شکست audit نباید عملیات اصلی را fail کند.


### فاز ۱ — قواعد اجرایی حذف امن

- اکشن‌های حذف مشتری و قرارداد باید فقط با membership سمت سرور و `tenantId` همان کاربر اجرا شوند؛ `customerId` یا `contractId` به‌تنهایی کافی نیست.
- حذف مشتری با هر تعداد قرارداد، حتی قرارداد قدیمی یا لغوشده، ممنوع است و باید پیام فارسی مشخص نمایش داده شود.
- حذف قرارداد با وضعیت برگزارشده/لغوشده/تسویه‌شده یا با هر دریافتی فعال ممنوع است. رکوردهای مالی محافظت‌شده نباید برای امکان حذف قرارداد پاک شوند.
- هر دکمه حذف باید destructive، کم‌اولویت و همراه با دیالوگ تأیید فارسی باشد. حذف نباید primary action صفحه باشد.
- اگر AuditLog فعال است، حذف‌های مجاز باید با action=`DELETE` و entityType مناسب لاگ شوند و شکست ثبت audit نباید عملیات اصلی را fail کند.

### فاز ۳ — قواعد قیمت پایه و ورودی مبلغ

- هیچ آیتم priceable پیش‌فرض در خدمات، منو، نوشیدنی، دسر یا هزینه‌های انتخابی قرارداد نباید با قیمت صفر ایجاد شود.
- seed کاتالوگ باید tenant-scoped و idempotent باشد و آیتم‌ها را با `tenantId + code` یا عنوان/alias امن پیدا کند تا اجرای دوباره، رکورد تکراری نسازد.
- seed مجاز نیست قیمت غیرصفر موجود را بی‌دلیل بازنویسی کند؛ فقط قیمت‌های صفر/خالی آیتم پیش‌فرض باید با مقدار اولیه ریالی تکمیل شوند.
- فرم قرارداد جدید باید قیمت‌ها را از دیتابیس بخواند، نه از hardcode داخل client، و هر ردیف انتخاب‌شده باید snapshot کامل نام، دسته، نوع قیمت‌گذاری، واحد، قیمت واحد، تعداد و جمع را در قرارداد ذخیره کند.
- تمام ورودی‌های مبلغ در قرارداد جدید باید از `RialInput` یا رفتاری معادل استفاده کنند: نمایش با جداکننده هزارگان، پشتیبانی از ارقام فارسی/عربی، ارسال مقدار raw عددی و جلوگیری از `NaN`.
- ورودی‌های مبلغ دارای پسوند «ریال» باید مقدار تایپ‌شده را در فرم‌های RTL از سمت راست تراز کنند و برای پسوند سمت چپ فضای کافی رزرو کنند (`left` suffix + padding چپ کافی). الگوی اختصاصی جدید برای مبلغ نساز؛ از `RialInput` مشترک استفاده کن تا عدد با «ریال» هم‌پوشانی نداشته باشد.
- validation سمت سرور باید مقدارهای فرمت‌شده مثل `25,000,000` و `۲۵,۰۰۰,۰۰۰` را قبل از ذخیره پاک‌سازی کند و هرگز رشته فرمت‌شده را در فیلد Decimal/Number ذخیره نکند.

### فاز ۴ — قواعد ادبیات دریافتی‌ها و کنترل ثبت دریافت

- برای پولی که از مشتری بابت قرارداد دریافت می‌شود، UI فارسی باید همیشه از «دریافت»، «دریافتی» و «دریافتی‌ها» استفاده کند. واژه «پرداخت» فقط در زمینه‌های واقعی پرداخت خروجی/هزینه یا پرداخت اشتراک محصول مجاز است.
- مسیر `/dashboard/payments` و مدل داخلی `Payment` برای سازگاری فنی تغییر نام داده نمی‌شوند؛ تغییر ادبیات باید در کپی UI، پیام‌ها، گزارش‌ها، اعلان‌ها و دکمه‌ها انجام شود.
- قبل از ثبت دریافت جدید برای قرارداد، وضعیت مالی باید از helper مشترک `src/lib/finance/contract-financial-state.ts` و بر اساس snapshot قرارداد و دریافتی‌های فعال همان tenant محاسبه شود؛ از قیمت‌های پایه فعلی دوباره محاسبه نکن.
- ثبت دریافت جدید برای قرارداد لغوشده، تسویه‌شده، دارای مانده صفر/منفی یا اضافه دریافت باید هم در UI و هم در server action مسدود شود، مگر اینکه قابلیت overpayment به‌صورت صریح طراحی و پیاده‌سازی شده باشد.
- اگر مبلغ دریافتی از مانده قابل دریافت بیشتر است، submit باید متوقف شود و پیام فارسی «مبلغ دریافتی از مانده قرارداد بیشتر است.» نمایش داده شود.
- وضعیت مالی، contractId و customerId ارسالی از client قابل اعتماد نیستند؛ server action باید قرارداد را با `tenantId` سمت سرور بخواند و ownership را دوباره بررسی کند.

### فاز ۵ — قواعد دریافت اقساطی و چکی

- فرم دریافت باید برای اقساط و چک شرطی باشد: بخش اقساط فقط برای نوع «قسط/اقساط» و بخش چک فقط برای روش دریافت چک نمایش داده شود.
- برنامه اقساط باید ردیف‌های ساختاری با مبلغ، تاریخ سررسید شمسی، وضعیت و توضیحات داشته باشد؛ ذخیره اقساط در متن آزاد مجاز نیست.
- مجموع اقساط باید دقیقاً با مبلغ کل دریافت برابر باشد. UI باید اختلاف را نشان دهد و server action نیز ذخیره ناسازگار را رد کند.
- تاریخ سررسید قسط و چک باید با JalaliDatePicker وارد شود. ورودی خام Gregorian یا browser date input برای UI فارسی مجاز نیست.
- مبلغ چک و مبلغ هر قسط باید ریالی، عددی و قابل parse از ارقام فارسی/عربی و جداکننده هزارگان باشد؛ رشته فرمت‌شده نباید در فیلد Decimal ذخیره شود.
- شماره چک، مبلغ چک و تاریخ سررسید چک برای دریافت چکی الزامی هستند. وضعیت چک باید از مقادیر کنترل‌شده مانند در انتظار وصول، وصول‌شده، برگشتی، لغوشده یا خرج‌شده/واگذار شده نگاشت شود.
- ایجاد یا ویرایش دریافت باید `PaymentCheque` و `PaymentInstallment` را در transaction و با `tenantId` سمت سرور ذخیره کند. `contractId` یا `customerId` ارسالی از client به‌تنهایی قابل اعتماد نیست.
- لیست و جزئیات دریافتی‌ها باید خلاصه انسانی چک/اقساط را با متن فارسی نمایش دهند و JSON خام، enum انگلیسی یا تاریخ میلادی نشان ندهند.
- اگر AuditLog فعال است، ثبت دریافت چکی باید شماره چک را فقط ماسک‌شده در metadata ثبت کند و دریافت اقساطی باید فقط تعداد اقساط را به‌عنوان metadata امن ذخیره کند.

### فاز ۶ — قواعد هزینه چکی و اتصال هزینه به قرارداد

- بخش چک هزینه فقط وقتی باید نمایش داده و پردازش شود که روش پرداخت هزینه از نوع چک باشد؛ فرم نباید فیلدهای نامرتبط را بی‌دلیل نشان دهد یا به آن‌ها تکیه کند.
- شماره چک، تاریخ سررسید شمسی و مبلغ مثبت برای هزینه چکی الزامی هستند و باید در server action دوباره اعتبارسنجی شوند.
- تاریخ سررسید چک هزینه باید با `JalaliDatePicker` وارد و در دیتابیس به‌صورت `DateTime` ذخیره شود؛ تاریخ میلادی خام در UI مجاز نیست.
- مبلغ چک هزینه باید با `RialInput` یا رفتار معادل، جداکننده هزارگان و ارقام فارسی/عربی را بپذیرد و پیش از ذخیره به مقدار عددی تمیز تبدیل شود.
- اگر هزینه به قرارداد وصل می‌شود، سرور باید `customerId`، `hallId` و `salonId` را از قرارداد همان tenant derive کند و به مقدارهای client برای تالار/سالن اعتماد نکند.
- اگر سالن دستی انتخاب شود، باید متعلق به همان tenant و همان تالار انتخاب‌شده باشد؛ انتخاب ناسازگار باید با پیام فارسی رد شود.
- لیست و جزئیات هزینه باید خلاصه انسانی وضعیت چک را با متن فارسی، تاریخ شمسی و مبلغ ریالی نمایش دهند؛ enum انگلیسی یا JSON خام نمایش نده.

## Regression Recovery Guardrails

- هنگام بازیابی از ZIPهای قبلی، کل `src` یا `prisma` را کورکورانه جایگزین نکنید؛ فقط قابلیت‌های ازدست‌رفته را با معماری فعلی merge کنید.
- دسترسی «راه‌اندازی اولیه سامانه» باید داخل `/dashboard/settings` باقی بماند و به `/dashboard/settings/setup` لینک شود؛ آن را به sidebar اضافه نکنید.
- `تعاریف پایه`، `اطلاعات تالار` و `تنظیمات کلی سامانه` نباید به‌عنوان آیتم مستقیم sidebar برگردند؛ sidebar تنظیمات باید تمیز بماند.
- مسیرهای setup/base/logo باید به routeهای واقعی لینک شوند و هیچ کارت fake یا لینک شکسته اضافه نشود.
- بازیابی قالب چاپ قرارداد نباید قوانین یک‌صفحه‌ای A4، حذف فرمول‌های منو در چاپ، نمایش امضاها و نمایش لوگوی دایره‌ای را نقض کند.
- قابلیت‌های tenant-scoped مثل AuditLog، ticketing، upload، دریافتی‌ها، اقساط/چک و هزینه چکی نباید با نسخه‌های قدیمی overwrite یا downgrade شوند.

## Platform Admin Guardrails

- مسیر `/admin` فقط برای مالک پلتفرم SaaS است؛ آن را با داشبورد tenant در `/dashboard` مخلوط نکنید.
- دسترسی `/admin` باید همیشه server-side و از `requirePlatformAdmin()` کنترل شود. چک client-side، لینک مخفی یا query param برای امنیت کافی نیست.
- در این نسخه platform admin از `PLATFORM_ADMIN_EMAIL` یا `PLATFORM_ADMIN_EMAILS` خوانده می‌شود. بدون این env هیچ کاربر عادی نباید بتواند `/admin` را ببیند.
- هیچ آیتمی برای `/admin` به sidebar tenant اضافه نکنید. tenant users نباید حتی به صورت ناخواسته به مدیریت کل هدایت شوند.
- مسیر پس از لاگین باید بر اساس session server-side تعیین شود: platform admin مستقیم به `/admin` و مدیر تالار به `/dashboard` هدایت شود.
- queryهای cross-tenant فقط در helperهای `src/lib/admin/*` و صفحات `/admin/*` مجاز هستند. اکشن‌ها و صفحات معمولی `/dashboard` باید همچنان tenant-scoped باقی بمانند.
- پاسخ به تیکت از سمت platform admin باید `senderType=SUPPORT` داشته باشد، تیکت و tenant را از دیتابیس بخواند، در صورت وجود AuditLog ثبت شود و مسیرهای admin و tenant را revalidate کند.
- قابلیت «مشاهده پنل تالار» نباید با تزریق ناامن `tenantId` به داشبورد معمولی انجام شود. تا وقتی impersonation امن، auditable و دارای banner پیاده نشده، از نمای read-only/overview داخل `/admin/tenants/[id]` استفاده کنید.
- اطلاعات حساس کاربران، رمزها، توکن تلگرام، کلید پیامک، API keyها و secrets نباید در `/admin` نمایش داده شوند.
- همه تاریخ‌های پنل admin باید شمسی/جلالی و همه مبالغ ریالی و با اعداد فارسی نمایش داده شوند.


## Platform Admin Seed Credential Rule

- Platform admin access is controlled server-side by `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_EMAILS`.
- For local setup, `prisma/seed.mjs` may create/update the platform admin user from `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD`; it must store only a bcrypt hash and never display or log the password.
- Do not hardcode production platform-admin passwords in source code.

### رفع اجرای Seed در Prisma 7
- فایل `prisma/seed.mjs` باید Prisma Client را مثل کد اصلی پروژه با `@prisma/adapter-pg` و `DATABASE_URL` بسازد.
- اگر `npm run prisma:seed` خطای `PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions` داد، یعنی seed هنوز با `new PrismaClient()` قدیمی اجرا می‌شود و باید adapter تنظیم شود.
- بعد از تغییر `.env`، برای ساخت/به‌روزرسانی کاربر مدیر سایت، دستور `npm run prisma:seed` را دوباره اجرا کنید.

## Platform Admin Command Center Rules

- صفحه اصلی `/admin` باید مثل مرکز فرمان روزانه SaaS باشد، نه فقط چند کارت آماری؛ بالای صفحه باید فوراً موارد نیازمند اقدام، دموهای رو به پایان، تیکت‌های فوری، وضعیت فروش/اشتراک، فعالیت تالارها و سلامت سامانه را نشان دهد.
- هیچ metric ساختگی نمایش ندهید. اگر داده یا مدل مالی اشتراک وجود ندارد، وضعیت حرفه‌ای «ناموجود/غیرفعال» نمایش دهید و آن را با دریافتی‌های tenantها قاطی نکنید.
- همه queryهای cross-tenant مخصوص مرکز فرمان باید داخل helperهای `src/lib/admin/*` بمانند و با `requirePlatformAdmin()` محافظت شوند. هیچ صفحه یا اکشن tenant در `/dashboard` نباید از این queryها استفاده کند.
- بخش «نیازمند اقدام امروز» باید action-oriented باشد: هر آیتم باید دلیل، شدت، tenant/user مرتبط و لینک واقعی برای پیگیری داشته باشد.
- وضعیت‌های خام مثل `ACTIVE`, `TRIALING`, `OPEN`, `URGENT` نباید در UI admin دیده شوند؛ همیشه label فارسی و chip رنگی استفاده کنید.
- مرکز فرمان باید لینک‌های واقعی به `/admin/tenants/[id]`, `/admin/users/[id]`, `/admin/support/[id]`, `/admin/activity` و مسیرهای موجود داشته باشد؛ لینک شکسته یا مسیر فرضی ممنوع است.
- سلامت سامانه باید بر اساس داده واقعی مانند موفق بودن query دیتابیس، آخرین `BackupExportLog`، خطاهای `NotificationLog` و وضعیت تنظیمات تلگرام/پیامک نمایش داده شود.
- ظاهر `/admin` باید RTL، جلالی، اعداد فارسی، ریالی و با طراحی navy/gold/ivory/emerald باقی بماند و sidebar tenant نباید تغییر کند.

## Platform Admin Tenants Page Rules

- صفحه `/admin/tenants` باید مرکز کنترل تالارها و مشتریان SaaS باشد، نه یک لیست ساده. بالای صفحه باید KPI، تب‌های هوشمند، فیلترهای پیشرفته و امکان تشخیص سریع پیگیری‌های امروز را داشته باشد.
- این صفحه فقط با `requirePlatformAdmin()` قابل دسترسی است و هیچ لینک یا دسترسی آن نباید در sidebar یا صفحات tenant dashboard نمایش داده شود.
- در UI فارسی `/admin/tenants` هرگز واژه فنی `tenant`، `tenantId` یا enum خام مانند `ACTIVE`, `TRIALING`, `EXPIRED`, `OPEN`, `URGENT` نمایش ندهید؛ همیشه label فارسی و chip رنگی استفاده کنید.
- امتیاز سلامت تالار باید از داده واقعی محاسبه شود: وضعیت دمو/اشتراک، تیکت باز یا فوری، آخرین فعالیت، تکمیل اطلاعات پایه، تعداد قراردادها و وضعیت استفاده از سامانه. دلیل سلامت/ریسک را fake نکنید.
- تکمیل راه‌اندازی باید فقط از داده‌های قابل محاسبه مانند hall profile، لوگو، تالارها، سالن‌ها، خدمات، منوها، روش‌های دریافت و تنظیمات قرارداد ساخته شود. عدد یا درصد ساختگی ممنوع است.
- اکشن‌های کارت یا جدول باید فقط به routeهای موجود و امن مثل `/admin/tenants/[id]`, `/admin/support`, `/admin/subscriptions` لینک شوند. دکمه fake، impersonation ناامن یا تزریق `tenantId` به `/dashboard` ممنوع است.
- queryهای cross-tenant این صفحه باید در helperهای `src/lib/admin/*` باقی بمانند و نباید به مسیرهای `/dashboard` یا server actionهای tenant منتقل شوند.
- نمای کارت و جدول باید compact، responsive، RTL، جلالی، با اعداد فارسی و طراحی navy/gold/ivory/emerald باقی بماند.

## قوانین پنل مدیریت کاربران سامانه

- مسیر `/admin/users` فقط برای مدیر کل سامانه است و باید با `requirePlatformAdmin()` یا لایه محافظ `/admin` محافظت شود.
- هیچ وضعیت خامی مانند `ACTIVE`، `OWNER`، `TRIALING` یا واژه‌های فنی در UI فارسی کاربران نمایش داده نشود.
- امتیاز سلامت کاربر باید از داده واقعی مانند وضعیت حساب، آخرین ورود/فعالیت، تیکت باز، عضویت در تالار و وضعیت دمو/اشتراک محاسبه شود.
- متریک جعلی، دکمه شکسته یا عملیات مدیریتی بدون action امن اضافه نشود.
- رمز، hash رمز، session، token و secretها هرگز در صفحات ادمین نمایش داده نشوند.
# قوانین صفحه اشتراک‌ها و دموهای ادمین

- مسیر `/admin/subscriptions` مرکز مدیریت دمو، تمدید، اشتراک و پیگیری فروش برای مالک پلتفرم است و باید همیشه فقط با دسترسی platform admin قابل مشاهده باشد.
- کاربران عادی تالار، اعضای tenant و مدیران داشبورد `/dashboard` نباید به `/admin/subscriptions` دسترسی داشته باشند.
- در UI فارسی ادمین هرگز واژه فنی `tenant`، `tenantId` یا enum خام مانند `ACTIVE`, `TRIALING`, `EXPIRED`, `CANCELED`, `PAST_DUE`, `DEMO`, `STARTER`, `PROFESSIONAL` نمایش نده؛ همیشه از برچسب فارسی و chip رنگی استفاده کن.
- سلامت فروش دمو/اشتراک باید از داده واقعی محاسبه شود: پایان نزدیک یا گذشته دمو/اشتراک، فعالیت واقعی، تعداد قراردادها، تیکت باز/فوری، تکمیل اطلاعات تالار، خدمات/منو و وضعیت تبدیل به اشتراک.
- هیچ درآمد یا metric اشتراک ساختگی نمایش نده. اگر ماژول پرداخت اشتراک SaaS یا داده مالی جداگانه وجود ندارد، وضعیت حرفه‌ای «غیرفعال/ناموجود» نشان بده و دریافتی‌های عملیاتی تالارها را درآمد اشتراک معرفی نکن.
- اکشن‌های کارت و جدول ادمین نباید fake یا شکسته باشند. اگر اکشن امن server-side برای تمدید دمو، فعال‌سازی اشتراک، تغییر پلن یا لغو اشتراک وجود ندارد، فقط به مسیر امن جزئیات تالار یا پشتیبانی لینک بده.
- هر write action آینده برای تمدید دمو، فعال‌سازی اشتراک، تغییر پلن یا غیرفعال‌سازی اشتراک باید platform-admin-only، server-side validated، همراه با confirmation برای عملیات خطرناک، revalidate کننده مسیرهای admin مرتبط، و در صورت وجود `AuditLog` audit شده باشد.
- صفحه `/admin/subscriptions` باید تاریخ‌ها را جلالی، متن‌ها را فارسی RTL، و وضعیت‌های دوره را با labels تجاری مثل «دمو فعال»، «دمو رو به پایان»، «دمو منقضی‌شده»، «اشتراک فعال» و «اشتراک منقضی‌شده» نمایش دهد.

# قوانین پشتیبانی ادمین

- مسیرهای `/admin/support` و `/admin/support/[id]` مرکز عملیات پشتیبانی مالک پلتفرم هستند و باید همیشه platform-admin-only بمانند.
- کاربران عادی تالار و اعضای workspace نباید به صفحات admin پشتیبانی دسترسی داشته باشند؛ cross-tenant ticket query فقط در helperهای admin مجاز است.
- در UI فارسی پشتیبانی هرگز واژه فنی `tenant`، `tenantId` یا enum خام مانند `TECHNICAL`, `BILLING`, `OPEN`, `CLOSED`, `WAITING_FOR_USER`, `WAITING_FOR_SUPPORT`, `URGENT`, `HIGH`, `LOW` نمایش نده؛ همیشه برچسب فارسی و chip رنگی استفاده کن.
- یادداشت داخلی پشتیبانی باید فقط برای platform admin قابل مشاهده باشد. پیام‌های `INTERNAL_NOTE` نباید در صفحات tenant-facing مثل `/dashboard/support` و `/dashboard/support/[id]` نمایش داده شوند.
- پاسخ پشتیبانی، تغییر وضعیت، تغییر اولویت، بستن/بازگشایی تیکت و ثبت یادداشت داخلی باید server-side protected و با `requirePlatformAdmin()` اجرا شوند.
- عملیات ادمین پشتیبانی باید در صورت وجود `AuditLog` ثبت شود و مسیرهای `/admin/support`, `/admin/support/[id]`, `/admin`, مسیرهای جزئیات تالار و صفحات tenant support مرتبط را revalidate کند.
- هیچ metric پشتیبانی ساختگی نمایش نده. میانگین زمان پاسخ فقط وقتی از پیام‌های واقعی قابل محاسبه است نمایش داده شود؛ در غیر این صورت وضعیت حرفه‌ای نبود داده کافی نشان بده.
- اکشن‌های کارت، جدول و جزئیات تیکت نباید fake یا شکسته باشند. لینک‌ها باید به مسیرهای واقعی مثل `/admin/support/[id]`, `/admin/tenants/[id]`, `/admin/users/[id]` و `/admin/support?tenantId=...` بروند.
- وضعیت عملیاتی تیکت باید از داده واقعی مکالمه محاسبه شود: اگر آخرین پیام قابل مشاهده از کاربر و تیکت باز است، «منتظر پاسخ پشتیبانی»؛ اگر آخرین پیام از پشتیبانی است، «منتظر پاسخ کاربر»؛ اگر هیچ پاسخ پشتیبانی ندارد، «بدون پاسخ»؛ و اگر بسته شده، «بسته‌شده».

# قوانین گزارش‌ها و تحلیل ادمین

- مسیر `/admin/reports` باید همیشه platform-admin-only بماند و داده‌های cross-tenant آن فقط از helperهای `src/lib/admin/*` خوانده شود.
- کاربران عادی تالار، اعضای workspace و صفحات `/dashboard` نباید به گزارش‌های ادمین یا خروجی‌های آن دسترسی داشته باشند.
- در UI فارسی گزارش‌ها هرگز واژه فنی `tenant`, `tenantId` یا enum خام مانند `ACTIVE`, `TRIALING`, `EXPIRED`, `TECHNICAL`, `OPEN`, `CLOSED` نمایش نده؛ همیشه برچسب فارسی و chip رنگی استفاده کن.
- هیچ metric، روند، درآمد، نرخ تبدیل یا بینش ساختگی نمایش نده. اگر یک شاخص از schema فعلی قابل محاسبه نیست، آن را مخفی کن یا unavailable state حرفه‌ای نشان بده.
- دریافتی‌های عملیاتی تالارها را درآمد اشتراک معرفی نکن مگر اینکه ماژول پرداخت اشتراک پولی رکورد مالی جداگانه داشته باشد.
- گزارش‌ها باید تاریخ‌های قابل مشاهده را جلالی، اعداد را فارسی، و مبالغ را با قالب ریالی نمایش دهند.
- فیلترهای گزارش باید روی helper داده اعمال شوند و جدول برترین تالارها، نمودارها و بینش‌ها با همان فیلترها تا حد قابل محاسبه هماهنگ باشند.
- خروجی‌های گزارش فقط وقتی مجازند که route/action امن و platform-admin-protected داشته باشند؛ تا قبل از آن دکمه شکسته نشان نده و وضعیت غیرفعال حرفه‌ای نمایش بده.

## قوانین نسخه چاپی قرارداد

- در `PrintSection`هایی که بیش از یک محتوای مستقیم بعد از عنوان دارند، نباید اولین child با `1fr` کش بیاید. برای بخش‌هایی مثل «شروط و تعهدات تالار»، `grid-template-rows` اختصاصی تعریف کن تا باکس‌هایی مثل «توضیحات انصراف» فقط به اندازه محتوای خود ارتفاع بگیرند.
- نسخه چاپی قرارداد باید داخل یک صفحه A4 بماند؛ قبل از بزرگ کردن padding، font-size، gap یا ارتفاع امضاها، اثر آن را روی چاپ `/dashboard/contracts/[id]/print` بررسی کن.
- باکس «توضیحات انصراف» باید compact، خوانا و بدون ارتفاع اضافی باشد و متن شروط نباید به‌خاطر آن از صفحه چاپی حذف شود.

## TALAR_GLOBAL_UI_SYSTEM_POLISH_62 Dashboard UI Rules

- Shared dashboard polish lives in `DashboardShell`, `DashboardNavigation`, and the scoped `.talar-admin-page` CSS layer in `src/app/globals.css`.
- New dashboard pages should inherit `.talar-admin-page` behavior through the shell and avoid page-local spacing systems that fight the shared max width, compact control height, card radius, chip sizing, and mobile overflow rules.
- Do not reintroduce broad card-centering rules for dashboard/admin content. Summary cards may use explicit `text-center`, but list cards, filters, forms, toolbars, and action rows should stay start-aligned and scan-friendly.
- Keep dashboard UI changes styling-only unless the task explicitly asks for behavior changes; do not change tenant-scoped queries, server actions, routes, invoice/payment/contract calculations, or permission enforcement for visual polish.

## TALAR_PROJECT_CLEANUP_20260602

- این نسخه عمداً تمیز و سبک نگه داشته شده است؛ فایل‌ها و پوشه‌های آرشیوی مانند `_delivery`, `validation`, `diff`, `patch`, `REFERENCE`, `docs`, `tests` و `tools` حذف شده‌اند.
- برای تغییرات آینده، فایل‌های runtime و source اصلی را حفظ کن: `src`, `prisma`, `public`, `package.json`, `package-lock.json`, `.env.example`, تنظیمات Next/TypeScript/ESLint/PostCSS، `README.md` و `AGENTS.md`.
- گزارش‌ها، patchها و فایل‌های موقت را دوباره داخل ریشه پروژه قرار نده؛ اگر لازم شد خروجی تحویلی بسازی، آن را بیرون از پروژه یا در artifact جداگانه نگه دار.

## یادداشت فنی اعلان‌ها - ۱۴۰۵/۰۳/۱۲

- قالب‌های پیش‌فرض پیامک مالک در `src/lib/notifications/template-renderer.ts` باید جزئی، شفاف و عملیاتی بمانند؛ از قالب‌های خیلی کوتاه مثل «قرارداد ثبت شد» استفاده نشود.
- برای حفظ تنظیمات کاربران، ارتقای خودکار قالب‌ها فقط باید روی متن‌های پیش‌فرض قدیمی انجام شود و قالب‌های دستی‌شده نباید بی‌اجازه بازنویسی شوند.
- متغیر `operatorName` برای اعلان‌های عملیاتی باید از کاربر لاگین‌شده پر شود و در نبود مقدار، مقدار امن «سامانه» نمایش داده شود.
- بعد از تغییر قالب‌ها، صفحه `dashboard/settings/message-templates` و نمونه پیش‌نمایش نیز باید با متغیرهای جدید هماهنگ شود.

## یادداشت فنی اطلاعات تالار - ۱۴۰۵/۰۳/۱۲

- منطق ویرایش اطلاعات تالار باید از helper مشترک `src/lib/hall-info/permissions.ts` و تابع `canManageHallInfo` استفاده کند.
- UI صفحه `/dashboard/hall-info` و server action `updateHallInfoAction` نباید قوانین دسترسی جداگانه و ناهماهنگ داشته باشند.
- نقش‌های `OWNER` و `ADMIN` مجاز به ویرایش اطلاعات تالار هستند؛ سایر نقش‌ها فقط در صورت داشتن `settings.manage` مجازند.
- برای خطای دسترسی در actionهای فرم اطلاعات تالار، redirect به داشبورد نده؛ پیام خطای فارسی در state فرم برگردان.

## یادداشت فنی منوی اقدامات قرارداد - ۱۴۰۵/۰۳/۱۲

- منوی «بیشتر» در `/dashboard/contracts` باید از کامپوننت client-side `src/components/dashboard/contracts/contract-actions-menu.tsx` استفاده کند و داخل جریان ارتفاع کارت با `<details>` بزرگ رندر نشود.
- اقدامات حساس مثل تسویه نهایی، ثبت برگزاری، تغییر وضعیت، کنسلی و حذف باید همچنان از server actionهای موجود و confirmationهای امن استفاده کنند.
- پنل باید RTL، جلالی/اعداد فارسی از داده‌های آماده صفحه، compact و اسکرول‌پذیر بماند و نباید باعث overflow افقی یا افتادن روی کارت‌های بعدی شود.

## یادداشت فنی Runtime منوی اقدامات قرارداد - ۱۴۰۵/۰۳/۱۲

- اگر منوی قرارداد با `createPortal` رندر می‌شود، متغیر `mounted` باید با `useState(false)` و `useEffect(() => setMounted(true), [])` تعریف شود تا دسترسی به `document.body` فقط بعد از mount سمت کلاینت انجام شود.

## یادداشت فنی قراردادهای کنسل‌شده - ۱۴۰۵/۰۳/۱۲

- قرارداد با status `CANCELED` باید از نظر مانده عملیاتی بسته‌شده حساب شود؛ در UI، اعلان‌ها، خلاصه مشتری، داشبورد، چاپ و export مانده آن صفر است.
- مبلغ دریافتی معتبر قرارداد کنسل‌شده نباید حذف یا صفر شود؛ بیعانه/وجه کنسلی باید در دریافتی‌ها باقی بماند، اما نباید بدهی باقیمانده از `finalTotal - paidAmount` تولید کند.
- هر actionی که status قرارداد را به `CANCELED` تغییر می‌دهد باید `remainingAmount: "0"` و `remainingAmountManual: false` را هم ثبت کند.
- اگر قراردادی از `CANCELED` به وضعیت فعال برگردانده شد و مانده دستی فعال نبود، مانده باید از روی دریافت‌های معتبر و مبلغ نهایی دوباره sync شود.

### به‌روزرسانی ۱۴۰۵/۰۳/۱۲ - چاپ قرارداد
- ردیف «توضیحات قرارداد» از بخش «اطلاعات مراسم» در نسخه چاپی/ PDF قرارداد حذف شد تا زیر ردیف سالن نمایش داده نشود.


## Print-Safe PWA Prompt Rule

- `src/components/pwa/install-prompt.tsx` must never render on dashboard print routes containing `/print`.
- Any floating PWA/install/guide prompt must include `no-print` and `print:hidden` or an equivalent global print CSS selector so browser print/PDF outputs contain only the intended document.

## Customer welcome and contract SMS flow - 2026-06-02

- Keep customer-facing SMS messages in `src/lib/notifications/customer-notification-dispatcher.ts` respectful, warm, concise, and clear.
- Official contract creation should send customer welcome SMS only when the customer is newly created inline (`!input.customerId`), then send the contract summary SMS.
- Do not remove the discrepancy contact numbers `09123397977` and `09126499877` from customer contract summary messages unless the product owner explicitly changes it.

### پیامک‌های مشتری برای کنسلی و ثبت نهایی قرارداد
- هنگام کنسل شدن قرارداد، پیامک اطلاع‌رسانی کنسلی برای شماره مشتری ارسال می‌شود و توضیح می‌دهد که قرارداد از نظر مالی بسته شده و مانده قابل پرداخت صفر است.
- هنگام تسویه/ثبت نهایی قرارداد و تغییر وضعیت به `COMPLETED`، پیامک تشکر و آرزوی اوقات خوش برای مشتری ارسال می‌شود.
- این پیام‌ها از همان تنظیمات SMS مشتری استفاده می‌کنند: سرویس پیامک باید فعال باشد، «ارسال مستقیم به مشتریان» فعال باشد و برای رویدادهای قرارداد، گزینه مربوط به اعلان قرارداد فعال باشد.
- شماره‌های پیگیری مغایرت در متن پیام‌ها `09123397977` و `09126499877` هستند و در پیام‌های دارای تماس، آدرس تالار نیز درج می‌شود.


## یادداشت فاز پیام‌ها - ۱۴۰۵/۰۳/۱۲

- مسیر جدید `/dashboard/messages` مرکز اصلی مشاهده پیام‌های مشتری و مدیریت است و با مجوز `notifications.manage` محافظت می‌شود.
- ارسال مجدد از طریق `retryNotificationLogAction` انجام می‌شود و فقط برای وضعیت‌های `FAILED` و `QUEUED` مجاز است. alias قبلی `retryTelegramNotificationLogAction` برای سازگاری حفظ شده است.
- پیام‌های customer-facing در `src/lib/notifications/customer-notification-dispatcher.ts` و پیام‌های مدیریتی/قالب‌های کانال‌ها در `src/lib/notifications/template-renderer.ts` نگهداری می‌شوند.
- هنگام تغییر متن پیام‌ها، حتماً لاگ‌های `NotificationLog` و صفحه `/dashboard/messages` را در نظر بگیرید تا متن ارسالی، گیرنده، خطا و ارسال مجدد قابل پیگیری بماند.

## تغییر ۱۴۰۵/۰۳/۱۲ — ایمیل مدیریتی

- کانال اعلان `EMAIL` اضافه شده و باید در کنار `TELEGRAM`، `BALE`، `RUBIKA` و `SMS` در منطق اعلان‌ها حفظ شود.
- تنظیمات SMTP در مدل `EmailIntegrationSetting` ذخیره می‌شود. رمز SMTP فقط با `encryptSecret` ذخیره شود و هرگز به UI یا لاگ خام برنگردد.
- همه ارسال‌های ایمیل باید tenant-safe باشند و فقط با `tenantId` سرور-ساید انجام شوند.
- ارسال مجدد ایمیل از `NotificationLog` انجام می‌شود و فقط پیام‌های `FAILED` یا `QUEUED` قابل retry هستند.
- قبل از تغییر آینده روی پیام‌ها، صفحه `/dashboard/messages` و مسیر `/dashboard/settings/email` را بررسی کنید.

### Email integration stability note — 2026-06-02
- Email integration code must tolerate a missing/stale Prisma Client delegate for `emailIntegrationSetting` and show Persian setup guidance instead of crashing.
- Keep email settings actions and retry/dispatcher paths defensive until `prisma:migrate` and `prisma:generate` are run in the target environment.

## Update 2026-06-02 - contract PDF email attachment and concise owner SMS

- Owner email dispatch for `CONTRACT_CREATED` now generates a PDF contract summary using `sharp`, saves it to the local desktop folder, and attaches it to the outgoing email.
- Default PDF output directory is `~/Desktop/قراردادهای تالار منیجر`; override with `TALAR_CONTRACT_PDF_DIR` when running outside localhost or when the service account has a different desktop path.
- The owner SMS template for contract events is intentionally concise. Keep SMS short and reserve long detail for Telegram/email/PDF.
- Keep demo-word cleanup centralized through `stripDemoWordingFromNotificationText` and `createNotificationLog`; do not bypass it for user-facing notifications.

## Update 2026-06-02 - luxury customer-facing message copy

- Customer-facing SMS copy must stay warm, concise, formal, and trustworthy. Avoid long operational detail in SMS; keep heavy contract/invoice detail in PDF, print, email, or portal views.
- Use «لغو» instead of «کنسل» in customer-facing cancellation messages.
- Keep the discrepancy/contact phones `09123397977` and `09126499877` in customer contract, cancellation, and invoice messages unless the product owner explicitly changes it.
- All customer-facing messages must pass through `stripDemoWordingFromNotificationText` or `createNotificationLog` cleanup so `دمو / دموی / DEMO` never appears in sent text or message logs.

## Update 2026-06-02 - luxury owner/admin notification copy

- Owner/admin notification templates live in `src/lib/notifications/template-renderer.ts` and should stay concise, formal, and operationally clear.
- Avoid generic product wording like «اعلان مالی تالار منیجر» in sent owner/admin messages; prefer event-first text such as «دریافت جدید ثبت شد | {{tenantName}}».
- SMS owner templates must remain short; longer detail belongs in email/Telegram/PDF/message center.
- When default owner/admin templates change, keep `shouldUpgradeStoredNotificationTemplate` able to detect old built-in templates so existing tenants receive the improved copy without overwriting clearly custom templates.

## Update 2026-06-02 - customer settlement reminder two days before event

- Customer SMS settlement reminders are dispatched by `dispatchTomorrowCustomerBalanceDueSmsReminders` in `src/lib/notifications/customer-notification-dispatcher.ts`; keep the public function name for compatibility, but the target event date is two days ahead.
- The reminder runs from `runScheduledNotificationDispatch`, so it works with production cron and the localhost dashboard tick fallback.
- Do not send duplicate customer settlement reminders for the same contract on the same day; check `NotificationLog` by tenant, SMS channel, event type `CUSTOMER_BALANCE_DUE_TOMORROW`, contract id, customer id, and current-day window.
- The customer-facing reminder must not include the remaining amount. It should politely ask the customer to complete full settlement for final ceremony coordination.
- This customer-facing reminder should remain concise, respectful, luxury-toned, and payment-focused. It must pass through the same demo-word cleanup path as other customer notifications.


- Customer-facing contact/discrepancy messages must include both `09123397977` and `09126499877`, and should include the hall address from hall info when available.
- Contract print/PDF footer must show hall address and contact numbers; do not remove it during print layout cleanup.
