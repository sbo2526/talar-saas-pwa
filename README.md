# Talar SaaS PWA

Talar SaaS PWA is the production foundation for a Persian RTL, multi-tenant banquet hall management SaaS/PWA.

## Project Goal

The product supports a public marketing website, account creation, one-time demo access, purchase/subscription activation placeholders, tenant workspaces, base configuration, and a dashboard for banquet hall operations. Base definitions such as halls, salons, menus, services, financial settings, contract templates, payment methods, and default clauses are intended to feed later professional contract registration.

## Implemented Features

- Next.js App Router with TypeScript, Tailwind CSS v4, responsive RTL Persian UI, and PWA metadata.
- Redesigned luxury Persian UI foundation with deep navy/charcoal backgrounds, warm ivory surfaces, champagne/gold accents, muted emerald secondary accents, glass panels, premium shadows, and polished landing/auth/dashboard/account/demo/purchase surfaces.
- Premium dashboard experience with a luxury desktop sidebar, active navigation, app-like mobile topbar, touch-friendly mobile drawer, compact mobile KPI cards, quick actions, and upgraded no-workspace onboarding.
- Simplified dashboard navigation: the sidebar now shows high-level sections only, with detailed base-definition pages grouped under the new `/dashboard/base` hub.
- Complete `/dashboard/halls` hall management page for creating, editing, activating/deactivating, and reviewing tenant-scoped halls/branches.
- Complete `/dashboard/salons` salon/space management page for creating, editing, activating/deactivating, filtering, and reviewing tenant-scoped salons linked to tenant-owned halls.
- Complete `/dashboard/payment-methods` payment-method management page for tenant-scoped create, edit, active/inactive status, masked bank data display, and one active default method per tenant.
- Complete `/dashboard/financial-categories` financial-category management page for tenant-scoped create, edit, active/inactive status, typed income/expense/tax/discount categories, and optional parent categories.
- Complete `/dashboard/services` and premium `/dashboard/menus` base-definition management for tenant-scoped ceremony services and catering items, including compact search/filter, category chips, missing-price filters, pricing type, Rial prices, quick price update, drawer-based add/edit forms, sort order, and active/inactive status.
- Premium `/dashboard/calendar` reservation calendar with a prominent Jalali month header, visible month navigation, compact filters, Saturday-start grid, compact fixed-holiday/Friday indicators, low-noise but scannable free-day cells, contract event display, and tenant-scoped day notes for blocked/closed/holiday/follow-up operations.
- Complete `/dashboard/contracts/new` contract registration flow with tenant-scoped customer search/autofill, Jalali event date picker, HH:mm time selection without seconds, event type selection/custom creation, hall/salon selection, grouped services and catering/menu selections from base definitions, live financial summary, and contract line-item snapshots.
- Dedicated `/dashboard/contracts/[id]/print` one-page A4 print view for browser print and Save as PDF, using contract snapshots, hall information, contract settings, Jalali dates, Persian digits, Rial formatting, compact official terms, signatures, and footer contact details.
- Premium `/dashboard/contract-settings` configuration center for tenant-scoped contract numbering, financial defaults, required customer fields, formal contract texts, print template, logo/license display flags, and signature labels.
- Professional `/dashboard/settings/security` control center for account protection, real password changes, truthful JWT session guidance, tenant member role review, Telegram security alert readiness, recent `SECURITY_EVENT` activity, and compact security recommendations.
- Professional `/dashboard/settings/backups` data-protection center for tenant-scoped CSV exports, full JSON backup downloads, export history, controlled non-destructive restore guidance, and compact backup recommendations.
- Dedicated `/dashboard/account` account center with a premium profile header, account overview strip, unified access/subscription panel, editable personal information form, verification status, workspace permissions, compact security summary, and read-only system information.
- New `/dashboard/hall-info` section for the tenant's primary business profile: venue identity, address, contact information, license information, license image upload, capacity, and facility flags.
- Platform-aware PWA install guidance for Android, iPhone Safari, and Windows Chrome/Edge through `src/components/pwa/install-prompt.tsx`.
- Visible brand name is `تالار منیجر`; avoid English product titles in Persian UI.
- Self-hosted Vazirmatn Variable font via `@fontsource-variable/vazirmatn`; it is enforced globally on `html`, `body`, buttons, inputs, selects, textareas, and UI components with no runtime Google Fonts/CDN dependency.
- Invalid/weak Tailwind classes such as `opacity-48`, `py-18`, `h-18`, and unsupported white opacity shortcuts were replaced with valid arbitrary values or design-system classes.
- Marketing pages, demo page, purchase placeholder, authentication pages, `/account` status page, and protected dashboard routes.
- NextAuth credentials authentication with JWT sessions and type augmentation in `src/types/next-auth.d.ts`.
- Stable generated Prisma Client singleton in `src/lib/prisma.ts`; runtime code no longer uses a dynamic `@prisma/client` import or manual fake Prisma client types.
- Password hashing with `bcryptjs`.
- Server-side validation with `zod`.
- Register flow with duplicate-email protection, duplicate-phone protection, normalized lowercase emails, normalized phone values, and clean Persian unique-constraint messages.
- Login flow with password verification, suspended-user rejection, and `lastLoginAt` update.
- Dashboard protection through NextAuth middleware plus server-side user checks.
- Tenant membership helpers for current user, current tenant, required membership, and role checks.
- One-time race-safe demo start server action that claims `DemoAccess` inside the transaction before creating a DEMO tenant, OWNER membership, DEMO/TRIALING subscription, contract settings, default payment methods, and default financial categories.
- Jalali/Shamsi display utilities in `src/lib/date/jalali.ts`.
- Persian number and IRR money formatting utilities in `src/lib/formatters.ts`.
- `prisma/seed.mjs` creates a local development owner, demo tenant, OWNER membership, subscription, contract settings, hall, salon, menu, services, payment methods, and financial categories.


## Menu Catalog Management

- `/dashboard/menus` is the commercial catering price-list source of truth for future contracts. It shows premium KPI cards, category tabs, compact filters, price-status filters, sorting, and a scalable list/table-card hybrid instead of an always-open form.
- Add/edit runs through a drawer-style form. Normal food, drink, and dessert items do not show `اقلام داخل منو`; package contents are only surfaced as `اقلام داخل پکیج` for the `پکیج‌ها` category.
- Managers can use `قیمت سریع` on each item to update `pricePerGuest` and `basePrice` in ریال without opening the full edit form.
- Missing/zero active prices are clearly marked with `قیمت ثبت نشده`, appear in the KPI and missing-price filter, and link to focused price completion.
- Deactivation is the default safe operational path. Historical contracts continue to display their saved line-item snapshots and are never recalculated from current menu prices.

## Service Catalog Management

- `/dashboard/services` is the ceremony service price-list source of truth for future contracts. It manages tenant-scoped services, category navigation, compact filters, required/optional status, price status, sorting, active/inactive state, and quick price updates.
- Service prices are editable in `/dashboard/services` and stored in ریال as non-negative integer values before being persisted to Prisma decimal fields.
- Add/edit runs through a drawer-style form so the service catalog stays compact. Optional descriptions, internal notes, and sort order are grouped under a collapsible completion section.
- Managers can use `قیمت سریع` on each service to update `price` and `basePrice` without opening the full edit form.
- Active services with zero/missing required prices are clearly marked with `قیمت ثبت نشده`, appear in KPI cards and filters, and expose `تکمیل قیمت` actions. `CUSTOM` services are considered ready because their price is entered during contract registration.
- The contract form consumes active service definitions from `/dashboard/services`; old contracts keep their saved line-item snapshots and are not recalculated when service base prices change.


## Contract Settings Center

- `/dashboard/contract-settings` controls the tenant-scoped defaults used by future contract creation and printing: contract numbering, next contract number, fiscal year/period label, financial percentages, required customer fields, default legal terms, payment terms, cancellation policy, footer note, print template name, logo/license display flags, and signature labels.
- The page is designed as a premium configuration center, not a raw long form: compact header, readiness progress, section navigation chips, grouped settings, lightweight preview, and a sticky save area.
- Contract settings are saved through the existing tenant-scoped server action. The action requires OWNER or ADMIN, derives `tenantId` server-side, validates the prefix, next number, percentages, labels, and text lengths, and revalidates `/dashboard/contract-settings`, `/dashboard/contracts/new`, `/dashboard/contracts`, and `/dashboard/base`.
- Percentages are stored as Prisma decimal values and displayed with Persian digits. Contract money previews are shown in ریال.
- Contract settings affect future contracts/templates. Existing contracts keep their saved contract number, financial values, and line-item snapshots unless a separate intentional template-rendering flow uses current settings at print time.
- Production UI must not show demo/developer wording in this page. Technical storage details belong in README/AGENTS and code, not the operator-facing settings screen.

## Contract Print Template

- `/dashboard/contracts/[id]/print` renders a tenant-safe official contract document by fetching the contract with `id + tenantId` and loading customer, hall, salon, payment, line-item snapshot, contract settings, and hall profile data.
- The print page is optimized for A4 portrait with `@page` margins, compact Persian typography, official ivory/champagne styling, a screen-only action bar, and print CSS that hides dashboard navigation, topbar, buttons, and other interactive UI.
- Browser print and Save as PDF are the current PDF workflow. No server-side PDF generator is used in this phase.
- Contract detail now exposes a prominent `چاپ قرارداد` action and the contracts list exposes a compact `چاپ` action; both route to `/dashboard/contracts/[id]/print`.
- Successful contract creation redirects to `/dashboard/contracts/[id]?created=1` and shows a polished print suggestion dialog with `مشاهده و چاپ قرارداد` and `بعداً انجام می‌دهم`.
- The print document maps real stored data to the official contract: contract number and creation date, customer identity, Jalali event date and weekday, HH:mm times, guest count, hall/salon, selected services, selected catering/menu items, financial totals, payment summary, terms, acceptance sentence, signatures, and hall footer.
- Services and catering items always come from saved `ContractLineItem` snapshots. The print template must never recalculate historical contracts from current service or menu base prices.

## Contract Pricing And Time Logic

- Contract event time fields use normalized 24-hour `HH:mm` values such as `20:30`; seconds must never be shown or submitted from the UI.
- Service and menu prices are source-of-truth base definitions from `/dashboard/services` and `/dashboard/menus`; the contract form must not hardcode final prices or menu catalogs.
- Menu create, edit, quick price update, and status actions revalidate `/dashboard/menus`, `/dashboard/base`, `/dashboard/base/menus`, and `/dashboard/contracts/new`; service actions revalidate `/dashboard/services`, `/dashboard/base`, `/dashboard/base/services`, and `/dashboard/contracts/new` so refreshed contract registration uses the latest active tenant catalog.
- Supported pricing types are `FIXED`, `PER_ITEM`, `PER_GUEST`, `PER_HOUR`, and `CUSTOM`.
- Food, drink, and dessert menu items default to `PER_GUEST` with unit label `نفر`, so selected totals automatically recalculate from the event guest count. Default menu prices may start at `0` and must appear as actionable `قیمت ثبت نشده` items until completed.
- Selected services and menu items are saved as `ContractLineItem` snapshots with type, category, name, source id, pricing type, quantity, unit label, unit price, total price, and note so old contracts do not change when base prices are edited later.
- If a selected service has no required price, the UI warns `قیمت این خدمت در تعاریف پایه ثبت نشده است.`; menu items use the matching `قیمت این آیتم...` warning. Saving requires a valid contract-specific price when overrides are allowed and remains blocked when override is disabled until the base price is completed.
- Financial summary calculation is: `subtotal = servicesTotal + menuTotal`, `finalTotal = subtotal - discountAmount`, and `remainingAmount = finalTotal - depositAmount`.

## Dependencies

- `next-auth`: credentials authentication and JWT session handling.
- `@prisma/client`, `@prisma/adapter-pg`, and `pg`: generated Prisma Client with the PostgreSQL driver adapter required by Prisma 7.
- `bcryptjs`: secure password hashing and password verification.
- `zod`: form and server-action validation.
- `@fontsource-variable/vazirmatn`: self-hosted Persian typography.
- `react-multi-date-picker`: future Jalali date picker standard for date inputs.

## Setup Commands

```bash
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

Open `http://localhost:3000`.

The register, login, and demo pages can render without opening a database connection, but form submission and authenticated database actions require `DATABASE_URL` to be configured.

## Environment Variables

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/talar_saas_pwa?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
```

`.env.example` is only a template. Create a real `.env` file in the project root and update `DATABASE_URL` so it points to a running PostgreSQL database. Use a strong random value for `NEXTAUTH_SECRET` outside local development.

## Windows Setup

PowerShell setup from this workspace:

```powershell
cd "C:\Users\bavaf\OneDrive\Desktop\talar-saas-pwa"
copy .env.example .env
npx prisma generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

PostgreSQL must be running first. Create a database named `talar_saas_pwa`, then update the username and password in `DATABASE_URL` if your local PostgreSQL credentials are different.

## Database Setup

Create a PostgreSQL database, set `DATABASE_URL` in `.env`, then run:

```bash
npm install
npx prisma generate
npm run prisma:migrate
npm run prisma:seed
```

Useful Prisma command:

```bash
npm run prisma:studio
```

After environment, Prisma Client, or schema changes, restart the dev server. If Next.js still serves a stale runtime bundle, reset the local cache and restart dev:

```powershell
npm install
npx prisma generate
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

## Local Seed Login

The seed script creates a local-only test owner and stores only a bcrypt password hash in the database:

- Name: `مالک تست تالار`
- Email: `owner@talar.local`
- Password: `TalarDemo123!`

For the platform admin panel, set these values in `.env` and run `npm run prisma:seed`:

```env
PLATFORM_ADMIN_EMAIL="bavafasobhan@gmail.com"
PLATFORM_ADMIN_PASSWORD="77365547"
```

Then sign in at `/login` with that email/password and open `/admin`. The password is stored only as a bcrypt hash in the database; do not commit real production credentials.

After sign-in, platform-admin users are redirected directly to `/admin`; regular tenant/hall managers are redirected to `/dashboard`. The login form uses the server-side platform-admin email allowlist and does not expose admin routing in the tenant sidebar.

## Date And Number Policy

- Store all Prisma `DateTime` fields as real JavaScript `Date` values backed by PostgreSQL timestamps.
- Never store Jalali/Shamsi dates as plain strings in the database.
- Display dates with helpers from `src/lib/date/jalali.ts`.
- UI display uses `fa-IR-u-ca-persian` and `Asia/Tehran` timezone by default.
- Future date inputs such as `eventDate`, `paidAt`, and `occurredAt` must use a Jalali picker, then convert safely to `Date` before persistence.
- Display user-facing numbers and money with `src/lib/formatters.ts`.

## Luxury UI System

Global CSS in `src/app/globals.css` defines reusable classes:

- `.btn-luxury-primary`
- `.btn-luxury-secondary`
- `.btn-luxury-dark`
- `.card-luxury`
- `.card-luxury-dark`
- `.input-luxury`
- `.badge-luxury`
- `.section-luxury`
- `.gold-divider`

New UI should use these classes first and only add Tailwind utilities for layout and local spacing. Visible Persian copy should use polished wording and correct half-spaces such as `ثبت‌نام`, `فعال‌سازی`, `می‌توانید`, `قیمت‌گذاری`, `نرم‌افزار`, and `یک‌باره`.

## Dashboard And PWA UX

- `/dashboard` is a daily command center for banquet hall operations, not a duplicated sidebar directory. It uses real tenant-scoped data for the hero summary, quick operational actions, attention center, KPIs, daily operation cards, recent activity, and setup health.
- Dashboard metrics are loaded through `src/lib/dashboard/dashboard-data.ts`. The service derives Jalali today/month ranges with `src/lib/date/jalali.ts`, limits list queries, reuses the in-app notification service for reminders, and never accepts a client-provided tenant id.
- The dashboard hero summarizes today’s events, tomorrow’s events, today’s payments, outstanding contracts, upcoming events, access status, current Jalali date, and current Jalali report month.
- Quick actions on `/dashboard` are reserved for daily work: ثبت قرارداد جدید، ثبت پرداخت، تقویم رزرو، مشتری جدید، گزارش امروز، and ثبت هزینه. Setup/base routes are moved to the setup health section unless access or setup state requires attention.
- Dashboard KPIs show دریافت امروز، هزینه امروز، مانده قابل دریافت، قراردادهای ماه جاری، مراسم‌های نزدیک, and سود تقریبی ماه using Persian digits, Jalali date boundaries, and ریال formatting.
- The attention center shows the top real in-app reminders such as today/tomorrow/upcoming events, outstanding balances, failed external notifications, incomplete integrations, account/hall profile issues, and ending demo/subscription states. It shows a polished empty state when there is nothing actionable.
- Daily operation cards show the next three upcoming events, latest contracts, latest payments, a compact financial summary for today, and recent activity built from contracts, payments, expenses, and warning notifications.
- Setup health shows real readiness counts for hall info, halls/salons, menus/services and missing prices, payment methods/financial categories, and contract settings.
- `/dashboard` uses a premium responsive shell with a fixed desktop sidebar, active navigation state, compact safe-area-aware mobile topbar, user/tenant chip, and touch-friendly mobile drawer.
- `/dashboard/base` is the dedicated `تعاریف پایه` hub. It organizes detailed setup pages for halls, salons, menus, services, contract settings, payment methods, and financial categories.
- Individual base-definition routes remain available through the hub. The user-facing detail URLs include `/dashboard/halls`, `/dashboard/menus`, and `/dashboard/payment-methods`; compatibility redirects keep the older `/dashboard/base/...` paths working where applicable.
- The sidebar and mobile drawer intentionally show only one base setup entry, `تعاریف پایه`, instead of listing every sub-setting.
- `/dashboard/halls` is the premium hall/branch management page. It supports tenant-scoped create, edit, and active/inactive status management for halls, and `/dashboard/base/halls` redirects there for backward compatibility.
- Hall records include `name`, optional `code`, `province`, `city`, `address`, `phone`, `managerName`, `totalCapacity`, `description`, `isActive`, timestamps, and related salons.
- Hall management uses safe archive-style status changes through `isActive`; hard delete is intentionally avoided.
- `/dashboard/salons` is the premium salon/room management page. It supports tenant-scoped create, edit, filter/search, and active/inactive status management for salons, and `/dashboard/base/salons` redirects there for backward compatibility.
- Salon records belong to both a tenant and a tenant-owned hall. They include `name`, optional `code`, `floor`, `locationNote`, `capacity`, `minCapacity`, `maxCapacity`, optional `basePrice`, feature flags such as stage/dance floor/separate entrance/VIP room/sound system/projector, `description`, `isActive`, and timestamps.
- Salon create/edit actions verify the selected `hallId` belongs to the authenticated member's tenant before linking the salon. If no hall exists, `/dashboard/salons` shows a prerequisite state that guides the user to `/dashboard/halls`.
- Salon management uses safe archive-style status changes through `isActive`; hard delete is intentionally avoided.
- `/dashboard/payment-methods` is the premium payment-method base-definition center. It is the source of truth for active payment methods used by `/dashboard/payments/new`; inactive methods remain available for historical payment display but are not selectable for new payment creation.
- Payment methods can be searched and filtered by type, status, default state, completeness, bank/card/IBAN/terminal data, and operational readiness. The page emphasizes one active tenant-scoped default method, compact KPI cards, and actionable incomplete-method guidance.
- Payment method type options live in `src/lib/payment-method-options.ts` so server pages, client forms, validation, and payment selects use the same enum values, polished Persian labels, and duplicate-safe `formatPaymentMethodLabel` behavior.
- Payment-method forms are type-aware: cash does not show bank/card/gateway fields, POS focuses on terminal/card-reader data, bank transfer focuses on bank/account/IBAN, card-to-card focuses on card details, cheque keeps cheque-specific information in the payment form, and online gateway focuses on gateway/merchant terminal data.
- Sensitive banking values such as card number, account number, and IBAN are masked in list/card views. Full values may only appear inside authorized edit flows where the existing system stores them.
- `/dashboard/base/payment-methods` redirects to `/dashboard/payment-methods`; payment methods remain discoverable from the base hub but are not added as standalone sidebar items.
- `/dashboard/financial-categories` is the premium financial category setup page. It supports income, expense, asset, liability, discount, tax, and other category types, optional parent categories, display color/icon metadata, and active/inactive status management.
- Financial category type options live in `src/lib/financial-category-options.ts` so server pages, client forms, and validation share the same array of valid enum values and Persian labels.
- `/dashboard/base/financial-categories` redirects to `/dashboard/financial-categories`; financial categories remain discoverable from the base hub but are not added as standalone sidebar items.
- `/dashboard/calendar` is the Jalali/Shamsi reservation operations calendar. The visible UI must show Persian months, Persian weekdays, Persian digits, and no Gregorian dates.
- مسیر `/dashboard/calendar` اکنون مرکز فرمان رزرو است: هدر فشرده، کنترل ماه مستقل، KPIهای ماهانه، فیلترهای سبک، legend کم‌حجم، grid اصلی و پنل عملیاتی روز انتخاب‌شده دارد.
- داده صفحه از `src/lib/calendar/calendar-page-data.ts` واکشی می‌شود و فقط ماه انتخاب‌شده به‌همراه لیست محدود مراسم‌های ۳۰ روز آینده را tenant-scoped بارگذاری می‌کند.
- سلول‌های روز آزاد کم‌نویز هستند و «آزاد» را به‌صورت تکراری و پررنگ روی همه روزها نمایش نمی‌دهند؛ روزهای رزروشده/قراردادی خلاصه تعداد مراسم و سالن‌های درگیر را نشان می‌دهند.
- روز انتخاب‌شده با border عمیق، ring شامپاین و chip «انتخاب‌شده» از وضعیت‌های عادی جدا می‌شود.
- پنل روز انتخاب‌شده تاریخ شمسی، مناسبت‌ها، وضعیت روز، ظرفیت سالن‌ها، جمع مالی روز، لیست همه قراردادهای همان روز، مانده قابل دریافت و اکشن‌های واقعی مثل مشاهده قرارداد، ثبت پرداخت و ثبت مراسم برای همان روز را نمایش می‌دهد.
- تقویم از چند مراسم در یک روز پشتیبانی می‌کند: سلول روز فقط count/summary نشان می‌دهد و جزئیات همه مراسم‌ها در پنل روز قرار می‌گیرد.
- فیلترها شامل تالار، سالن، وضعیت، جست‌وجو، نوع مراسم، فقط دارای مانده و فقط مراسم‌های پیش‌رو هستند و نباید grid تقویم را پایین دفن کنند.
- نمای «مراسم‌های پیش‌رو» به‌عنوان حالت لیستی اضافه شده و قراردادهای آینده را با تاریخ شمسی، مشتری، ساعت، وضعیت مالی و لینک جزئیات نشان می‌دهد.
- The calendar header keeps the current Jalali month/year and ماه قبل / امروز / ماه بعد navigation visible above the compact filter toolbar.
- Calendar holiday display currently supports fixed Jalali official holidays and Fridays through `src/lib/date/jalali-holidays.ts`; holidays are intentionally compact in day cells and expanded in the selected-day details panel.
- Lunar/variable Iranian holidays such as Eid al-Fitr, Tasua, Ashura, Eid al-Adha, and Eid al-Ghadir are documented as a future enhancement until a reliable year-aware data source is added.
- Calendar notes are stored in `CalendarDayNote` with real `DateTime` values and tenant-scoped status values for `NOTE`, `BLOCKED`, `CLOSED`, `HOLIDAY`, and `FOLLOW_UP`; the note/status form is collapsed by default so the calendar stays focused on operational scanning.
- Contract records with `eventDate` are displayed in the reservation calendar for the selected Jalali month. The selected-day action opens `/dashboard/contracts/new?eventDate=<ISO date>` so the new contract form pre-fills the Jalali date picker and readonly weekday.
- `/dashboard/contracts/new` stores dates as Prisma `DateTime` values while showing only Jalali/Shamsi UI. Customer search is tenant-scoped and can connect an existing customer or create/update the customer identity from the contract form.
- Contract service/menu selections are stored as immutable `ContractLineItem` snapshots with item name, category, quantity, unit price, and total price so later base-definition price changes do not alter old contracts.
- Contract amounts are stored as IRR decimal values in Prisma and shown in Persian-formatted ریال values. The live summary calculates جمع خدمات، جمع منو، تخفیف، بیعانه، جمع نهایی قرارداد، and مانده پس از بیعانه.
- The contract form uses editable tenant catalog data. If a tenant has no services, menus, or event types yet, `src/lib/contract-defaults.ts` idempotently creates the requested starter catalog for that tenant.
- `/dashboard/account` is the authenticated dashboard account center. The dashboard sidebar and mobile drawer include `حساب کاربری` and the topbar user chip links to this page.
- The dashboard shell still shows the no-workspace onboarding for normal dashboard modules when no tenant exists, but `/dashboard/account` is allowed to render so users can manage profile status before workspace activation.
- The account page displays real data from `User`, `DemoAccess`, `TenantMember`, `Tenant`, and `Subscription`, with tenant-owned counts scoped by the authenticated member's `tenantId`.
- The account page separates editable profile data from read-only system data. The profile form only updates `name`, `phone`, `nationalCode`, `address`, and `postalCode`; email, account id, role, account status, subscription, and tenant access remain read-only until dedicated verification/admin flows exist.
- Demo and subscription state are shown together in a unified `دسترسی و اشتراک` panel with access type, status, plan, start/end dates, remaining days, workspace name, and purchase/renewal CTA.
- Verification, workspace permissions, and security are compact status panels. Security actions link to `/dashboard/settings/security`, purchase/renewal uses `/purchase`, and hall identity management links to `/dashboard/hall-info`.
- `/dashboard/hall-info` manages `TenantHallProfile`, a one-to-one tenant business profile that is separate from operational `Hall` and `Salon` configuration.
- The hall info page is tenant-scoped and updates require OWNER or ADMIN membership. It stores business identity, manager identity, address/contact details, license data, capacity, facility flags, description, and internal notes.
- License image upload is an MVP for development: accepted image types are jpg, jpeg, png, and webp up to 5MB, saved under `public/uploads/hall-licenses/`, with the public URL stored on `TenantHallProfile`.
- Production deployments should move license images to object storage such as S3-compatible storage, ArvanCloud Object Storage, Liara Object Storage, or another private/secure storage provider instead of relying on the local filesystem.
- Mobile dashboard content is tuned for app-like density: compact hero, quick-action grid, tighter KPI cards, and smaller useful placeholder panels.
- If a user has no tenant membership, the dashboard shows a guided no-workspace onboarding state with demo activation, purchase CTA, getting-started steps, benefit cards, and PWA usage tips.
- `src/components/pwa/install-prompt.tsx` listens for supported browser install prompts and shows localized guidance for Android, iPhone Safari, and Windows desktop browsers.
- On mobile, install guidance appears as a dismissible floating bottom sheet instead of a large inline banner.
- Install guidance is dismissed through localStorage and is not shown repeatedly on every refresh. It is hidden when the app is already running in standalone/installed mode.
- iPhone guidance is manual because Safari does not support the native `beforeinstallprompt` flow.

## Development Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run prisma:studio
```

## Auth And Tenant Security

- `src/app/api/auth/[...nextauth]/route.ts` exposes the NextAuth route.
- `src/lib/auth/options.ts` contains credentials validation and password verification.
- `src/lib/auth/session.ts` contains `getCurrentUser`, `requireUser`, `getCurrentTenant`, `getCurrentTenantMember`, `requireTenantMember`, and `requireTenantRole`.
- `middleware.ts` protects `/dashboard/*` and `/account/*`.
- `/account` is the safe redirect target when a logged-in user has no tenant membership. It shows account status, tenant membership state, demo start, purchase link, and tenant/subscription details when present.
- Dashboard layout shows a Persian empty state when the authenticated user has no tenant membership.
- `/dashboard/settings/security` is the security control center. It shows account protection status, current workspace role, last login, tenant member access review, notification-channel readiness, recent security activity, and compact security recommendations.
- Password change is implemented for credentials-auth users with a stored `passwordHash`: the server action verifies the current password with bcrypt, validates the new password, hashes it, updates only the authenticated user, and never logs raw passwords.
- Security events from password changes are recorded as `SECURITY_EVENT` notification logs. If Telegram is enabled and `sendSecurityEvents` is active, the existing Telegram dispatcher sends the alert; otherwise a skipped security log is recorded without pretending a message was sent.
- Active session/device revocation is not implemented because NextAuth currently uses JWT sessions and does not persist individual sessions in the database. The security page shows this truthfully and offers account logout instead of fake device data.

Every query for tenant-owned resources must include the authenticated member's `tenantId`. Do not query halls, salons, menus, services, contract settings, payment methods, financial categories, customers, contracts, payments, expenses, or tenant hall profiles without tenant scoping.

Hall and salon create/edit/status actions derive `tenantId` server-side and require OWNER or ADMIN membership. Salon actions also verify hall ownership before creating or updating a salon.

`TenantHallProfile` is tenant-owned and must always be queried or updated through the authenticated membership's `tenantId`. National codes and license images are sensitive data and must never be exposed on public pages.

`PaymentMethod` records are tenant-owned base setup records. Create/edit/status/default actions derive `tenantId` server-side, require OWNER or ADMIN, mask sensitive bank identifiers in UI cards, and avoid public exposure.

`FinancialCategory` records are tenant-owned base setup records. Create/edit/status actions derive `tenantId` server-side, require OWNER or ADMIN, validate any parent category against the same tenant, and prefer active/inactive status over hard delete.

## Current Limitations

- Prisma Client generation and production build now succeed after `DATABASE_URL` is provided. If `.env` is missing, public/auth pages can still render, but database actions will fail with a clear setup error.
- Schema changes require running `npm run prisma:migrate` or applying checked-in migrations in each environment. Local migrations now include the user identity, tenant hall profile, hall, salon, menu/service/contract-setting, payment-method, and financial-category base-definition updates.
- Password reset UI is still a placeholder; the `PasswordResetToken` model is ready for implementation.
- Email/phone verification flows are not implemented yet.
- `/dashboard/hall-info` uses simple native date inputs for license dates until a full Jalali date picker is wired into forms. Dates are still stored as real `DateTime` values and displayed as Jalali in the UI.
- Local license image uploads are suitable for development only; production should use object storage and tighter access controls.
- Purchase/subscription payment gateway integration is still a placeholder.
- Dashboard CRUD forms are still partial; `/dashboard/halls`, `/dashboard/salons`, `/dashboard/menus`, `/dashboard/services`, `/dashboard/contract-settings`, `/dashboard/payment-methods`, `/dashboard/financial-categories`, and `/dashboard/hall-info` are implemented base/business setup sections.
- Jalali date picker dependency is installed for the future standard, but no full CRUD/date input form has been implemented yet.

## Next Recommended Tasks

1. Create a local `.env`, start PostgreSQL, then run migration and seed.
2. Continue tenant-scoped CRUD for customers, contracts, payments, expenses, and reporting workflows that consume the base definitions.
3. Add Jalali date picker inputs for contracts, payments, and expenses.
4. Add automated tests for registration, login, demo one-time access, tenant isolation, Jalali display formatting, and role checks.
5. Implement password reset token creation, email/SMS delivery, and reset completion.
6. Connect purchase flow to a payment gateway and activate `Subscription` plus `Tenant`.
7. Build professional contract registration that reads base definitions automatically.

## مرکز مدیریت قراردادها

- مسیر `/dashboard/contracts` به‌عنوان مرکز عملیاتی مدیریت قراردادها طراحی شده است و قراردادها را با جست‌وجو، فیلتر، مرتب‌سازی و صفحه‌بندی tenant-scoped نمایش می‌دهد.
- نسخه جدید `/dashboard/contracts` از `src/lib/contracts/contracts-page-data.ts` برای واکشی tenant-scoped، صفحه‌بندی، KPIهای اولویت‌دار، فیلترهای فشرده و محاسبه خلاصه‌های مالی از قراردادها و پرداخت‌های واقعی استفاده می‌کند.
- KPIهای صفحه با اولویت مدیریتی چیده شده‌اند: مراسم‌های ۷ روز آینده، مانده قابل پیگیری، مبلغ دریافت‌شده، مبلغ کل قراردادها، قراردادهای ماه جاری و تعداد کل قراردادها. مرز ماه جاری با تقویم جلالی محاسبه می‌شود.
- نوار فیلتر اصلی همیشه فشرده می‌ماند و جست‌وجوی شماره قرارداد، مشتری، موبایل یا کد ملی، وضعیت قرارداد، وضعیت پرداخت و مرتب‌سازی را پوشش می‌دهد. فیلترهای تالار، سالن، نوع مراسم و بازه تاریخ مراسم در بخش پیشرفته تاشونده قرار دارند.
- فهرست قراردادها اکنون toolbar عملیاتی دارد: تعداد نتایج، خلاصه نمای فعلی، انتخاب نمای کارت/فشرده و page sizeهای ۱۰، ۲۰ و ۵۰.
- کارت قرارداد فقط سه وضعیت اصلی را در بالا نشان می‌دهد؛ اطلاعات مشتری، مراسم، زمان/محل و جمع‌بندی مالی فشرده شده‌اند و دکمه‌های مشاهده جزئیات، ثبت پرداخت/پرداخت‌ها، چاپ و عملیات قرارداد کنار هم گروه‌بندی می‌شوند.
- دکمه ثبت پرداخت فقط وقتی قرارداد مانده قابل دریافت دارد و لغوشده نیست به `/dashboard/payments/new?contractId=<id>` می‌رود؛ قراردادهای تسویه‌شده یا لغوشده به نمای پرداخت‌های همان قرارداد هدایت می‌شوند.
- منوی عملیات قرارداد فقط actionهای واقعی و موجود را نشان می‌دهد: مشاهده پرونده، مشاهده پرداخت‌ها، چاپ قرارداد و تغییر وضعیت برای نقش‌های مجاز.
- صفحه قراردادها اکنون هدر فشرده مدیریتی، KPIهای عملیاتی و کارت‌های حرفه‌ای قرارداد دارد تا مشتری، مراسم، زمان، محل، وضعیت قرارداد و وضعیت مالی در یک نگاه دیده شوند.
- کارت قرارداد وضعیت چرخه قرارداد و پرداخت را با برچسب‌های فارسی نشان می‌دهد و اقدام اصلی مثل مشاهده جزئیات یا ثبت پرداخت را برجسته می‌کند.
- فیلترهای قرارداد به شکل نوار جست‌وجوی فشرده و بخش فیلترهای پیشرفته قابل جمع‌شدن نمایش داده می‌شوند تا صفحه برای تعداد زیاد قراردادها آماده بماند.
- جست‌وجو شامل شماره قرارداد، نام مشتری، شماره همراه، کد ملی و نوع مراسم است.
- فیلترها شامل وضعیت قرارداد، وضعیت پرداخت، تالار، سالن، نوع مراسم و بازه تاریخ مراسم به‌صورت شمسی هستند.
- مرتب‌سازی قراردادها از طریق جدیدترین، نزدیک‌ترین تاریخ مراسم، بیشترین مبلغ و بیشترین مانده انجام می‌شود.
- مسیر `/dashboard/contracts/[id]` نمای جزئیات قرارداد را نمایش می‌دهد و همیشه قرارداد را با `id` و `tenantId` فعلی واکشی می‌کند.
- صفحه جزئیات قرارداد به‌صورت پرونده حرفه‌ای قرارداد طراحی شده است: هدر dossier، KPIهای فشرده، جمع‌بندی مالی با نوار پیشرفت، خط زمانی پرداخت‌ها و آیتم‌های فاکتورگونه قرارداد را نمایش می‌دهد.
- مسیر `/dashboard/contracts/[id]/print` نسخه رسمی یک‌صفحه‌ای A4 قرارداد را برای چاپ مرورگر و ذخیره PDF نمایش می‌دهد و در چاپ، پوسته داشبورد و دکمه‌ها را پنهان می‌کند.
- پس از ثبت موفق قرارداد، کاربر روی صفحه جزئیات با دیالوگ فارسی برای مشاهده و چاپ نسخه چاپی هدایت می‌شود.
- پرداخت‌های قرارداد در جزئیات به‌عنوان تراکنش‌های مالی مستقل دیده می‌شوند و روش پرداخت، وضعیت، مبلغ، تاریخ، مرجع و رسید را در خط زمانی نشان می‌دهند.
- خدمات و منوی قرارداد در جزئیات از snapshotهای `ContractLineItem` به شکل لیست/فاکتور نمایش داده می‌شوند و قیمت‌های فعلی تعاریف پایه را جایگزین سوابق قبلی نمی‌کنند.
- صفحه جزئیات از snapshotهای `ContractLineItem` استفاده می‌کند؛ بنابراین تغییر قیمت خدمات یا منوهای پایه، قراردادهای قبلی را تغییر نمی‌دهد.
- وضعیت‌های داخلی مثل `RESERVED` یا `DRAFT` در UI نمایش داده نمی‌شوند و همه برچسب‌ها فارسی هستند.
- تاریخ‌ها فقط با تقویم شمسی/جلالی نمایش داده می‌شوند و مبالغ با جداکننده سه‌رقمی و واحد «ریال» رندر می‌شوند.
- وضعیت پرداخت از جمع پرداخت‌های ثبت‌شده محاسبه می‌شود و اگر پرداختی وجود نداشته باشد، بیعانه قرارداد به‌عنوان مبلغ دریافت‌شده fallback می‌شود.
- تقویم رزرو در جزئیات روز، لینک مستقیم به صفحه جزئیات قراردادهای همان روز دارد.

## مرکز مدیریت پرداخت‌ها

- مسیر `/dashboard/payments` اکنون مرکز عملیاتی پرداخت‌هاست و دریافت‌های قرارداد، بیعانه، اقساط، تسویه نهایی، خدمات اضافه، برگشت وجه و اصلاحیه مالی را tenant-scoped نمایش می‌دهد.
- صفحه پرداخت‌ها به‌صورت دفتر تراکنش‌ها طراحی شده است؛ هر کارت یک رکورد پرداخت مستقل است، نه کارت قرارداد. اطلاعات قرارداد فقط به‌عنوان زمینه ثانویه نمایش داده می‌شود.
- یک قرارداد می‌تواند چند پرداخت داشته باشد؛ UI برای این حالت برچسب‌هایی مثل «پرداخت ۱ از ۲» و نمای «گروه قراردادها» دارد تا بیعانه، قسط و تسویه با رکوردهای جداگانه اما قابل فهم دیده شوند.
- مسیرهای `/dashboard/payments/new`، `/dashboard/payments/[id]` و `/dashboard/payments/[id]/edit` برای ثبت، مشاهده و ویرایش پرداخت اضافه شده‌اند.
- نوع‌های داخلی پرداخت شامل `DEPOSIT`، `INSTALLMENT`، `FINAL_SETTLEMENT`، `EXTRA_SERVICE`، `REFUND` و `ADJUSTMENT` هستند، اما در UI فقط برچسب فارسی نمایش داده می‌شود.
- وضعیت‌های داخلی پرداخت شامل `RECORDED`، `CONFIRMED`، `PENDING`، `RETURNED` و `CANCELED` هستند. پرداخت‌های لغوشده، برگشت‌خورده و در انتظار تأیید در جمع پرداخت‌شده قرارداد محاسبه نمی‌شوند.
- روش پرداخت همیشه از تعاریف پایه `/dashboard/payment-methods` خوانده می‌شود. اگر روش پرداخت فعالی وجود نداشته باشد، صفحه پرداخت prerequisite state فارسی نمایش می‌دهد و کاربر را به تعریف روش پرداخت هدایت می‌کند.
- مبلغ‌ها به ریال و به‌صورت عددی در دیتابیس ذخیره می‌شوند؛ ورودی‌ها ارقام فارسی را می‌پذیرند و خروجی‌ها با جداکننده سه‌رقمی و «ریال» نمایش داده می‌شوند.
- تاریخ پرداخت و سررسید چک در UI شمسی/جلالی هستند و در دیتابیس به‌صورت `DateTime` استاندارد ذخیره می‌شوند.
- پرداخت می‌تواند به قرارداد و مشتری متصل شود. وقتی قرارداد انتخاب شود، مشتری از همان قرارداد server-side تعیین می‌شود و `tenantId` از فرم پذیرفته نمی‌شود.
- بعد از ثبت، ویرایش یا لغو پرداخت، مانده قرارداد داخل transaction دوباره محاسبه می‌شود. اگر هیچ پرداخت مؤثری وجود نداشته باشد، `depositAmount` قرارداد به‌عنوان fallback پرداخت‌شده در نمایش استفاده می‌شود تا داده‌های قدیمی دو بار شمرده نشوند.
- صفحه جزئیات قرارداد از پرداخت‌های واقعی برای timeline پرداخت استفاده می‌کند و دکمه «ثبت پرداخت» به `/dashboard/payments/new?contractId=<id>` متصل است.
- فرم ثبت پرداخت از UI سفارشی و فارسی برای آپلود رسید استفاده می‌کند؛ ورودی خام مرورگر نمایش داده نمی‌شود و فایل‌های `jpg`، `png`، `webp` و `pdf` تا ۵ مگابایت مجاز هستند.
- فیلدهای چک فقط زمانی نمایش داده می‌شوند که روش پرداخت انتخاب‌شده از نوع چک باشد، و برچسب روش پرداخت بدون تکرار نام و نوع نمایش داده می‌شود.
- فرم پرداخت خلاصه اثر مالی را قبل از ثبت نشان می‌دهد: مبلغ این پرداخت، مانده فعلی قرارداد، و مانده پس از ثبت.
- برای production باید رسیدها به Object Storage مثل S3-compatible، ArvanCloud، Liara Object Storage یا MinIO منتقل شوند.
- تغییر schema پرداخت در migration `20260513000100_add_professional_payments` ثبت شده است. بعد از دریافت این نسخه، `npx prisma generate` و `npm run prisma:migrate` را اجرا کنید.

## مرکز مدیریت مشتریان

- مسیر `/dashboard/customers` به مرکز CRM تالار تبدیل شده است و مشتریان را با جست‌وجو، فیلتر وضعیت، فیلتر قرارداد/مانده، مرتب‌سازی و صفحه‌بندی tenant-scoped نمایش می‌دهد.
- نسخه جدید صفحه مشتریان از `src/lib/customers/customer-page-data.ts` برای واکشی امن و صفحه‌بندی‌شده استفاده می‌کند. KPIها شامل کل مشتریان، مشتریان فعال، مشتریان دارای مانده، مجموع مانده قابل دریافت، مشتریان جدید ماه جاری و مراسم‌های ۳۰ روز آینده هستند.
- فیلترهای CRM شامل جست‌وجوی نام/موبایل/کد ملی، وضعیت مشتری، وضعیت پرداخت، وضعیت قرارداد، نوع مراسم، بازه تاریخ مراسم، مرتب‌سازی و تعداد نمایش ۱۰/۲۰/۵۰ است. همه تاریخ‌های فیلتر با JalaliDatePicker نمایش داده می‌شوند.
- کارت‌های مشتری هویت، شماره همراه، کد ملی، آدرس کوتاه، وضعیت فعال/مالی، تعداد قراردادها، قرارداد فعال، آخرین/نزدیک‌ترین مراسم، مجموع قراردادها، پرداخت‌شده و مانده را به‌صورت فشرده و عملیاتی نشان می‌دهند.
- اقدام اصلی کارت مشتری «مشاهده پرونده» است؛ ثبت قرارداد، ویرایش، مشاهده قراردادها و ثبت پرداخت مانده به‌عنوان اقدامات ثانویه نمایش داده می‌شوند.
- مشتریان دارای مانده با accent هشدار نمایش داده می‌شوند و دکمه ثبت پرداخت فقط وقتی به قرارداد مانده‌دار واقعی متصل باشد به `/dashboard/payments/new?contractId=<id>` هدایت می‌کند.
- اگر هیچ مشتری وجود نداشته باشد یا فیلترها نتیجه‌ای ندهند، صفحه empty state فارسی و عملیاتی با حذف فیلترها، افزودن مشتری و ثبت قرارداد جدید نشان می‌دهد.
- مسیرهای `/dashboard/customers/new` و `/dashboard/customers/[id]/edit` برای ثبت و ویرایش مشتری با اعتبارسنجی فارسی، نرمال‌سازی ارقام و کنترل تکرار شماره همراه/کد ملی در همان tenant اضافه شده‌اند.
- مسیر `/dashboard/customers/[id]` پرونده کامل مشتری را نمایش می‌دهد: اطلاعات هویتی، کارت‌های خلاصه، سوابق قرارداد، خط زمانی پرداخت‌ها و فعالیت پایه پرونده.
- لینک ثبت قرارداد از پرونده مشتری به `/dashboard/contracts/new?customerId=<id>` می‌رود و فرم قرارداد مشتری را فقط پس از واکشی server-side در همان tenant از پیش انتخاب می‌کند.
- وضعیت فعال/غیرفعال مشتری با فیلد `Customer.isActive` و migration `20260513000200_improve_customer_management` اضافه شده است.

## Jalali Date Picker Standard

- All user-facing date selection in the dashboard now uses the reusable `JalaliDatePicker` component from `src/components/ui/jalali-date-picker.tsx`.
- Do not use browser-native Gregorian `<input type="date">` for Persian dashboard UX. The visible picker must be Jalali/Shamsi, RTL, and Persian-localized.
- The picker displays Persian calendar months/digits but submits a normalized ISO date-only value such as `2026-05-13`; server actions convert that value to a real `DateTime` before Prisma persistence.
- Date-only fields such as contract event date, payment date, cheque due date, hall license dates, and date-range filters should use date-only ISO strings in form/query values to avoid timezone off-by-one bugs.
- The current replacements cover `/dashboard/contracts/new`, `/dashboard/contracts` filters, `/dashboard/payments` filters, `/dashboard/payments/new`, `/dashboard/payments/[id]/edit`, and `/dashboard/hall-info` license dates.

## Production payment UI polish

Payment pages use compact luxury cards, clean Jalali date fields, and production-facing Persian copy. Developer/internal implementation details stay out of user-facing screens.

## مرکز گزارش‌ها و تحلیل مالی

- مسیر `/dashboard/reports` یک داشبورد اجرایی مالی برای مدیر تالار است و شاخص‌های اصلی را در ابتدای صفحه با اولویت بالا نمایش می‌دهد.
- نوار KPI اصلی شامل مبلغ کل قراردادها، مجموع دریافت‌شده، مانده قابل دریافت، مجموع هزینه‌ها، سود تقریبی و تعداد قراردادهای بازه است؛ شاخص‌های تکمیلی مانند مراسم‌های پیش‌رو، قراردادهای تسویه‌شده و موارد نیازمند پیگیری به‌صورت chipهای فشرده نمایش داده می‌شوند.
- پنل «سلامت مالی بازه» نسبت دریافت‌شده، مانده، هزینه به دریافت و حاشیه سود تقریبی را با progress barهای فشرده نشان می‌دهد تا وضعیت کسب‌وکار در چند ثانیه قابل تشخیص باشد.
- فیلترهای گزارش فشرده و collapsible هستند، از بازه‌های شمسی مثل امروز، این هفته، این ماه، این فصل، امسال و بازه دلخواه پشتیبانی می‌کنند و ورودی تاریخ از `JalaliDatePicker` استفاده می‌کند.
- همه مبالغ گزارش با ارقام فارسی، جداکننده سه‌رقمی و واحد «ریال» نمایش داده می‌شوند و همه تاریخ‌های قابل مشاهده شمسی/جلالی هستند.
- گزارش دریافت‌ها از رکوردهای پرداخت معتبر استفاده می‌کند؛ پرداخت‌های `CANCELED`، `RETURNED` و `PENDING` در جمع دریافت‌شده محاسبه نمی‌شوند و پرداخت‌های `REFUND` از جمع کم می‌شوند.
- گزارش قراردادها وضعیت قرارداد، نوع مراسم، روند ماه‌های شمسی، نزدیک‌ترین مراسم و شاخص‌های میانگین و بیشترین مبلغ قرارداد را نمایش می‌دهد.
- گزارش مانده‌ها قراردادهای دارای مانده قابل دریافت را به‌صورت فهرست عملیاتی و قابل پیگیری برای ثبت پرداخت جدید برجسته می‌کند.
- گزارش هزینه‌ها از مدل `Expense` و دسته‌بندی‌های مالی استفاده می‌کند و در نبود داده، empty state فشرده و عملیاتی نمایش می‌دهد.
- خروجی CSV از مسیر `/api/dashboard/reports/export` بر اساس فیلتر فعلی ساخته می‌شود و برای اکسل و حسابداری قابل استفاده است. خروجی Excel و PDF تا زمان پیاده‌سازی واقعی با برچسب «به‌زودی» نمایش داده می‌شوند و به‌عنوان خروجی فعال جا زده نمی‌شوند.
- همه گزارش‌ها از `tenantId` عضویت فعلی کاربر استفاده می‌کنند و هیچ تجمیعی بین tenantها انجام نمی‌شود.

## مرکز مدیریت هزینه‌ها

- مسیر `/dashboard/expenses` به مرکز عملیاتی مدیریت هزینه‌ها تبدیل شده است و هزینه‌های تالار را با KPIهای هم‌ارتفاع، جست‌وجوی همیشه‌قابل‌دیدن، فیلترهای پیشرفته تاشونده، summary فیلتر فعال و کارت‌های ledger فشرده نمایش می‌دهد.
- کارت‌های هزینه مانند دفتر مالی طراحی شده‌اند و در یک نگاه عنوان، مبلغ، تاریخ شمسی، دسته‌بندی، وضعیت، روش پرداخت، زمینه قرارداد/هزینه عمومی، رسید و اثر در گزارش‌ها را نشان می‌دهند.
- اکشن‌های هزینه در خود کارت و بدون ستون جداافتاده قرار دارند: مشاهده جزئیات، ویرایش، مشاهده رسید در صورت وجود و لغو هزینه برای رکوردهای قابل لغو.
- بخش «نمای تحلیلی هزینه‌ها» میانگین هزینه، سهم ماه جاری، بیشترین دسته هزینه و اثر هزینه‌ها روی سود تقریبی را به‌صورت فشرده نمایش می‌دهد.
- مسیرهای `/dashboard/expenses/new`، `/dashboard/expenses/[id]` و `/dashboard/expenses/[id]/edit` برای ثبت، مشاهده و ویرایش هزینه اضافه شده‌اند.
- هزینه‌ها می‌توانند به دسته‌بندی مالی، روش پرداخت، قرارداد، مشتری، تالار و سالن متصل شوند. همه روابط در server action با `tenantId` عضویت فعلی اعتبارسنجی می‌شوند و `tenantId` از فرم پذیرفته نمی‌شود.
- مبلغ هزینه به ریال و به‌صورت عددی ذخیره می‌شود؛ ورودی مبلغ ارقام فارسی/عربی را می‌پذیرد و در UI با جداکننده سه‌رقمی و «ریال» نمایش داده می‌شود.
- تاریخ وقوع هزینه با `JalaliDatePicker` انتخاب می‌شود، در UI فقط شمسی/جلالی نمایش داده می‌شود و در دیتابیس به‌صورت `DateTime` استاندارد ذخیره می‌شود.
- رسید یا فاکتور هزینه با UI سفارشی فارسی بارگذاری می‌شود؛ فایل‌های `jpg`، `png`، `webp` و `pdf` تا ۵ مگابایت مجاز هستند و SVG پذیرفته نمی‌شود. برای production بهتر است فایل‌ها به Object Storage منتقل شوند.
- وضعیت‌های هزینه شامل `RECORDED`، `CONFIRMED`، `PENDING` و `CANCELED` هستند، اما در UI فقط برچسب فارسی نمایش داده می‌شود.
- هزینه‌ها hard-delete نمی‌شوند؛ عملیات حذف پیش‌فرض، لغو هزینه و تغییر وضعیت به `CANCELED` است. هزینه‌های لغوشده در گزارش‌ها و محاسبه سود تقریبی لحاظ نمی‌شوند.
- گزارش‌ها هزینه‌های غیرلغوشده را در مجموع هزینه‌ها، سود تقریبی، دسته‌بندی هزینه و آخرین رویدادهای مالی نمایش می‌دهند.
- تغییر schema هزینه در migration `20260513180000_add_expense_management` ثبت شده است. بعد از دریافت این نسخه، `npx prisma generate` و `npm run prisma:migrate` را اجرا کنید.

## Settings Hub

- مسیر `/dashboard/settings` مرکز تنظیمات سامانه است و ورود واحد به تنظیمات اعلان‌ها، تلگرام، پنل پیامکی، قالب پیام‌ها، لاگ اعلان‌ها، امنیت، پشتیبان‌گیری و حساب کاربری را فراهم می‌کند.
- مسیرهای `/dashboard/settings/notifications`، `/dashboard/settings/telegram`، `/dashboard/settings/sms`، `/dashboard/settings/message-templates`، `/dashboard/settings/notification-logs`، `/dashboard/settings/security` و `/dashboard/settings/backups` به‌عنوان shellهای polished و قابل ناوبری اضافه شده‌اند.
- مسیر `/dashboard/settings/security` مرکز واقعی امنیت حساب است: تغییر رمز عبور با اعتبارسنجی و bcrypt، وضعیت نشست‌های JWT بدون داده ساختگی، مرور اعضای فضای کاری، آمادگی اعلان امنیتی تلگرام، لاگ‌های `SECURITY_EVENT` و پیشنهادهای امنیتی فشرده را نمایش می‌دهد.
- مسیر `/dashboard/settings/backups` مرکز پشتیبان‌گیری و خروجی اطلاعات است. مالک و مدیر می‌توانند خروجی CSV قراردادها، مشتریان، پرداخت‌ها و هزینه‌ها را با هدر فارسی، تاریخ شمسی، ارقام فارسی و BOM مناسب Excel دریافت کنند.
- نسخه پشتیبان کامل از `/api/dashboard/exports/full` به‌صورت JSON تولید می‌شود و داده‌های اصلی فضای کاری، اطلاعات تالار، مشتریان، قراردادها، پرداخت‌ها، هزینه‌ها، تعاریف پایه، تنظیمات قرارداد و وضعیت اعلان‌ها را شامل می‌شود.
- خروجی کامل رمز عبور، hash رمز، نشست‌ها، توکن بات تلگرام، کلید خام پیامک یا ciphertext محرمانه را صادر نمی‌کند؛ برای اعلان‌ها فقط وضعیت اتصال، مقدار mask شده و پرچم configured ذخیره می‌شود.
- تاریخچه خروجی‌ها در مدل tenant-scoped `BackupExportLog` ثبت می‌شود و صفحه بکاپ آخرین خروجی‌ها، نوع فایل، فرمت، وضعیت، تعداد رکورد و تاریخ شمسی را نمایش می‌دهد.
- بازیابی مستقیم داده‌ها عمداً پیاده‌سازی نشده است؛ صفحه بکاپ فقط راهنمای بازیابی کنترل‌شده و غیرمخرب نشان می‌دهد و هیچ دکمه restore ساختگی یا مخربی ندارد.
- مرحله نخست Settings Hub ساختار UI و navigation را اضافه کرد. هسته دیتابیس اعلان‌ها نیز برای قالب‌ها، لاگ‌ها و وضعیت اتصال تلگرام/پیامک آماده شده است؛ ارسال واقعی تلگرام/پیامک و dispatch رویدادها هنوز پیاده‌سازی نشده‌اند.
- کارت‌های تنظیمات باید با متن فارسی تولیدی، دکمه‌های خوانا، وضعیت‌هایی مثل «آماده پیکربندی» یا «نیازمند اتصال» و بدون متن‌های فنی یا توسعه‌ای نمایش داده شوند.
- آیتم «تنظیمات» به sidebar داشبورد اضافه شده و برای `/dashboard/settings` و همه زیرمسیرهای آن active state دارد.

## Notification Database Core

- هسته دیتابیس اعلان‌ها برای مسیرهای Settings Hub اضافه شده است و شامل مدل‌های `TelegramIntegrationSetting`، `SmsIntegrationSetting`، `NotificationTemplate`، `NotificationLog` و `InAppNotification` است.
- همه تنظیمات، قالب‌ها و لاگ‌های اعلان tenant-scoped هستند و با رابطه Cascade به فضای کاری متصل می‌شوند.
- قالب‌های اعلان برای کانال‌های تلگرام و پیامک با کلیدهای رویدادی مثل ثبت قرارداد، ثبت پرداخت، ثبت هزینه، ثبت مشتری، گزارش‌های دوره‌ای و پیام تست ذخیره می‌شوند.
- صفحه `/dashboard/settings/message-templates` اکنون قالب‌های ذخیره‌شده دیتابیس را گروه‌بندی‌شده بر اساس کانال نمایش می‌دهد و هنگام ورود، قالب‌های پیش‌فرض را بدون تکرار آماده می‌کند.
- صفحه `/dashboard/settings/notification-logs` لاگ‌های واقعی اعلان را با فیلتر کانال، نوع رویداد و وضعیت نمایش می‌دهد و در نبود لاگ، empty state فارسی و عملیاتی نشان می‌دهد.
- صفحات `/dashboard/settings/telegram` و `/dashboard/settings/sms` وضعیت ذخیره‌شده اتصال، مقدارهای mask شده و آخرین موفقیت/خطا را در صورت وجود نمایش می‌دهند.
- helperهای داخلی برای mask/encrypt/decrypt مقدارهای محرمانه در `src/lib/security/secret-field.ts` قرار دارند. رمزگذاری فقط هنگام ذخیره مقدار واقعی و با secret محیطی `NOTIFICATION_SECRET_KEY`، `NEXTAUTH_SECRET` یا `AUTH_SECRET` انجام می‌شود.
- helperهای `src/lib/notifications/template-renderer.ts` و `src/lib/notifications/notification-service.ts` برای رندر قالب‌های متنی، ساخت قالب‌های پیش‌فرض، ثبت لاگ و تغییر وضعیت لاگ آماده شده‌اند.
- در این مرحله هیچ ارسال واقعی تلگرام/پیامک، اتصال به ارائه‌دهنده خارجی، job زمان‌بندی‌شده یا dispatch رویدادهای قرارداد/پرداخت/هزینه اضافه نشده است.
- تغییر schema اعلان‌ها در migration `20260513200000_add_notification_database_core` ثبت شده است. بعد از دریافت این نسخه، `npx prisma generate` و `npm run prisma:migrate` را اجرا کنید.

## In-App Notification Bell

- زنگوله بالای داشبورد اکنون مرکز اعلان‌های داخل برنامه است و با داده واقعی همان فضای کاری پر می‌شود؛ این مرکز جدا از Telegram/SMS است و برای یادآوری‌های قابل اقدام داخل داشبورد استفاده می‌شود.
- مدل tenant-scoped `InAppNotification` اعلان‌ها را با `fingerprint` قطعی ذخیره می‌کند تا یادآوری‌ها تکراری ساخته نشوند و وضعیت خوانده‌شدن یا رد شدن حفظ شود.
- سرویس `src/lib/notifications/in-app-notification-service.ts` هنگام رندر هدر، sync سبک انجام می‌دهد و فقط داده‌های محدود و عملیاتی را بررسی می‌کند: مراسم امروز/فردا/نزدیک، مانده قراردادهای نزدیک، خطاهای اخیر Telegram/SMS، ناقص بودن تنظیمات تلگرام/پیامک، نزدیک شدن پایان دمو/اشتراک، نقص اطلاعات حساب و نقص اطلاعات تالار.
- هر اعلان به صفحه مرتبط مثل جزئیات قرارداد، تقویم، لاگ اعلان‌ها، تنظیمات تلگرام/پیامک، حساب کاربری یا اطلاعات تالار لینک می‌شود.
- کاربران می‌توانند از خود زنگوله یک اعلان را خوانده‌شده کنند، همه اعلان‌ها را خوانده‌شده کنند یا اعلان‌های قابل رد شدن را dismiss کنند؛ این اکشن‌ها همیشه `tenantId` را از عضویت فعلی می‌گیرند.
- صفحه `/dashboard/settings/notifications` یک کارت «اعلان‌های داخل برنامه» دارد که تعداد موارد فعال، خوانده‌نشده و فوری زنگوله را نشان می‌دهد. این کارت اعلان ساختگی نمی‌سازد.
- تغییر schema زنگوله در migration `20260515090000_add_in_app_notifications` ثبت شده است. بعد از دریافت این نسخه، `npx prisma generate` و `npm run prisma:migrate` را اجرا کنید.

## Telegram Settings + Test Message

- مسیر `/dashboard/settings/telegram` اکنون تنظیمات واقعی تلگرام را برای هر فضای کاری مدیریت می‌کند: فعال‌سازی/غیرفعال‌سازی، توکن بات، شناسه گفت‌وگو، عنوان گفت‌وگو، دسته‌های اعلان و زمان‌بندی گزارش‌های آینده.
- جریان اتصال تلگرام بر اساس BotFather است: ساخت بات، دریافت توکن، افزودن بات به گفت‌وگو یا گروه، ثبت `chat_id` و ارسال پیام تست از سمت سرور.
- توکن بات تلگرام هرگز خام در رابط کاربری نمایش داده نمی‌شود. مقدار جدید فقط از فرم دریافت، با `NOTIFICATION_SECRET_KEY` یا `NEXTAUTH_SECRET` یا `AUTH_SECRET` رمزگذاری، و نسخه mask شده در UI نمایش داده می‌شود.
- صفحه تلگرام وضعیت ذخیره بودن توکن را با chip سبز و مقدار mask شده نشان می‌دهد. خالی گذاشتن فیلد توکن در فرم ذخیره، توکن فعلی را حفظ می‌کند و کاربر مجبور نیست هر بار آن را وارد کند.
- دریافت هوشمند گفتگو از سمت سرور انجام می‌شود: `@username`، لینک `t.me/...` یا شناسه عددی مثل `-100...` به Telegram Bot API `getChat` فرستاده می‌شود و در صورت دسترسی بات، `chatId` و `chatTitle` ذخیره می‌شوند.
- ابزار «جستجو در گفتگوهای اخیر بات» از `getUpdates` استفاده می‌کند و حداکثر ۱۰ گفتگوی اخیر را به‌صورت کارت قابل انتخاب نمایش می‌دهد. اگر update وجود نداشته باشد، کاربر باید ابتدا به بات پیام بدهد یا بات را به گروه اضافه کند.
- محدودیت تلگرام: برای گروه‌ها و کانال‌های خصوصی، بات باید عضو یا مدیر باشد و گاهی شناسه عددی گفتگو لازم است. اگر webhook بات در جای دیگری فعال باشد، `getUpdates` ممکن است لیست گفتگوها را برنگرداند.
- زمان گزارش روزانه در UI با گزینه‌های فارسی‌پسند مثل `۰۸:۰۰` تا `۲۳:۰۰` نمایش داده می‌شود، اما مقدار ذخیره‌شده همان قالب استاندارد `HH:mm` است. روز گزارش هفتگی و روز گزارش ماهانه نیز با کنترل فارسی انتخاب می‌شوند.
- پیام تست تلگرام با Telegram Bot API و فقط در server action ارسال می‌شود. هر تلاش تست یک `NotificationLog` با وضعیت `QUEUED` ایجاد می‌کند و سپس به `SENT` یا `FAILED` تغییر می‌دهد.
- صفحه `/dashboard/settings/notification-logs` نتیجه تست‌های تلگرام را همراه با وضعیت فارسی، زمان شمسی و خطای پاک‌سازی‌شده نمایش می‌دهد.
- در این فاز هنوز dispatch خودکار رویدادهای قرارداد، پرداخت، هزینه یا مشتری پیاده‌سازی نشده است؛ این اتصال در فاز جداگانه انجام می‌شود.

## Telegram Event Dispatch

- Dispatch تلگرام برای رویدادهای اصلی کسب‌وکار فعال شد: ثبت/تغییر وضعیت قرارداد، ثبت/ویرایش/لغو پرداخت، ثبت/ویرایش/لغو هزینه و ثبت/ویرایش مشتری.
- ارسال اعلان‌ها best-effort است؛ یعنی عملیات اصلی مثل ثبت قرارداد یا پرداخت پس از موفقیت دیتابیس rollback نمی‌شود، حتی اگر تلگرام timeout بدهد یا chat_id اشتباه باشد.
- هر تلاش واقعی ارسال تلگرام در `NotificationLog` ثبت می‌شود و وضعیت آن به `SENT` یا `FAILED` تغییر می‌کند. خطاهای ارسال در لاگ و تنظیمات تلگرام ذخیره می‌شوند.
- پیام‌ها از قالب‌های `NotificationTemplate` کانال `TELEGRAM` رندر می‌شوند و در صورت نبود قالب، متن پیش‌فرض فارسی استفاده می‌شود.
- payload اعلان‌ها tenant-scoped است و فقط از داده‌های همان فضای کاری ساخته می‌شود؛ توکن بات خام هرگز در UI، لاگ یا پیام خطا نمایش داده نمی‌شود.
- SMS dispatch و گزارش‌های زمان‌بندی‌شده هنوز پیاده‌سازی نشده‌اند و برای فازهای بعدی باقی مانده‌اند.

## Message Templates + Notification Logs

- مسیر `/dashboard/settings/message-templates` اکنون مرکز مدیریت قالب‌های اعلان است. قالب‌ها برای هر tenant، کانال و نوع رویداد به‌صورت جداگانه ذخیره می‌شوند و کانال‌های تلگرام و پیامک را پوشش می‌دهند.
- قالب‌ها plain text هستند و از syntax متغیرهای `{{variableName}}` مثل `{{customerName}}`، `{{contractNumber}}`، `{{paymentAmount}}`، `{{expenseAmount}}` و `{{tenantName}}` استفاده می‌کنند.
- مدیران `OWNER` و `ADMIN` می‌توانند عنوان، متن و وضعیت فعال بودن هر قالب را ویرایش کنند، قالب را فعال/غیرفعال کنند و آن را به متن پیشنهادی پیش‌فرض بازنشانی کنند.
- صفحه ویرایش قالب، پیش‌نمایش رندرشده با داده نمونه فارسی نمایش می‌دهد و از همان helper واقعی `renderNotificationTemplate` استفاده می‌کند.
- مسیر `/dashboard/settings/notification-logs` به دفتر اعلان‌ها تبدیل شده است و لاگ‌ها را با فیلتر کانال، نوع رویداد، وضعیت، بازه تاریخ جلالی و جستجو نمایش می‌دهد.
- مسیر `/dashboard/settings/notification-logs/[id]` جزئیات کامل یک لاگ شامل متن پیام، خطا، گیرنده، تعداد تلاش و ارتباط با قرارداد/پرداخت/هزینه/مشتری را نشان می‌دهد.
- لاگ‌های ناموفق تلگرام را می‌توان به‌صورت امن دوباره ارسال کرد. Retry پیام ذخیره‌شده همان لاگ را ارسال می‌کند و پیام را دوباره از داده‌های تغییرکرده رندر نمی‌کند.
- Retry فقط برای کانال تلگرام و وضعیت `FAILED` فعال است. ارسال پیامک واقعی و retry پیامک هنوز پیاده‌سازی نشده و برای فاز SMS باقی مانده است.
- وضعیت‌های لاگ شامل `QUEUED`، `SENT`، `FAILED`، `CANCELED` و `SKIPPED` هستند، اما در UI فقط برچسب فارسی نمایش داده می‌شود.

## SMS Panel Settings

مسیر `/dashboard/settings/sms` مرکز پیکربندی پنل پیامکی است. مدیران `OWNER` و `ADMIN` می‌توانند ارائه‌دهنده پیامک، کلید API، شماره ارسال‌کننده، شماره مدیر، مقصدهای ارسال و دسته‌های اعلان پیامکی را تنظیم کنند. کلید API به‌صورت رمزگذاری‌شده ذخیره می‌شود و فقط نسخه پوشیده‌شده آن در رابط کاربری نمایش داده می‌شود.

در این فاز ارسال پیامک تست از صفحه تنظیمات پیامک پشتیبانی می‌شود. هر تلاش ارسال تست یک `NotificationLog` با کانال `SMS` و رویداد `TEST_MESSAGE` ثبت می‌کند و نتیجه آن به وضعیت‌های ارسال‌شده یا ناموفق به‌روزرسانی می‌شود. آداپتر ارائه‌دهندگان در `src/lib/integrations/sms.ts` طراحی شده است؛ کاوه‌نگار با API مستقیم پشتیبانی می‌شود و ارائه‌دهندگان بدون آداپتر فعال، خطای فارسی تمیز برمی‌گردانند و موفقیت جعلی ثبت نمی‌کنند.

برای ذخیره امن کلید API یکی از متغیرهای `NOTIFICATION_SECRET_KEY`، `NEXTAUTH_SECRET` یا `AUTH_SECRET` باید در محیط تنظیم شده باشد. ارسال خودکار پیامک برای رویدادهای قرارداد، پرداخت، هزینه، مشتری و گزارش‌های زمان‌بندی‌شده هنوز فعال نشده و به فاز جداگانه مربوط است.

## Scheduled Notifications and Management Reports

The notification system now supports tenant-scoped scheduled and manual management reports.

- `/dashboard/settings/notifications` is the control center for Telegram/SMS channels, manual report sends, event categories, and recent notification logs.
- `/api/cron/notifications` runs scheduled notification dispatch and must be protected with `CRON_SECRET` using `Authorization: Bearer <CRON_SECRET>`.
- `/api/dashboard/notifications/tick` is the authenticated localhost/PWA fallback. The dashboard shell calls it after an authorized admin/owner enters the dashboard and then periodically while the dashboard stays open. It derives `tenantId` from the current membership, requires `notifications.manage`, and never accepts a client-provided tenant id.
- متن خروجی همه اعلان‌های مدیریتی هنگام render پاک‌سازی می‌شود تا پیشوندهای trial/demo مثل «دموی تالار» یا `DEMO-` در پیام‌های تلگرام/بله/روبیکا/پیامک، نمایش لاگ اعلان و ارسال مجدد لاگ‌های قدیمی دیده نشود.
- Daily reports are now considered due once the configured `HH:mm` has passed for the current day, not only during the exact matching minute. Existing `NotificationLog` duplicate checks still prevent sending the same tenant/channel/report period more than once.
- Daily, weekly, and monthly management reports are generated from real tenant-scoped contract, payment, expense, and outstanding-balance data.
- Tomorrow-event reminders and outstanding-balance reminders can be sent through enabled channels.
- Telegram reports use the configured encrypted bot token and chat ID. SMS reports are concise and sent to the configured manager mobile when the selected provider adapter supports sending.
- Scheduled sends avoid duplicates by checking existing `NotificationLog` records for the same tenant, channel, event type, and report period.
- Manual sends are authenticated owner/admin actions and can be triggered from notification settings or the reports dashboard.
- Every scheduled/manual attempt creates or updates `NotificationLog` with `SENT`, `FAILED`, or skipped behavior. Provider failures are logged and do not stop other tenants or channels.
- Customer SMS automatic dispatch is intentionally not enabled in this phase; customer-facing SMS requires explicit consent and business rules.

Required environment variables:

```bash
CRON_SECRET="long-random-secret"
NOTIFICATION_SECRET_KEY="long-random-secret-for-encrypted-integrations"
```

`NEXTAUTH_SECRET` or `AUTH_SECRET` can also be used by the secret helper for encrypted integration fields when `NOTIFICATION_SECRET_KEY` is not provided.

## Global Audit Trail / Activity Log

- A tenant-scoped global `AuditLog` model now records important operational events such as create, update, cancel, status change, payment received/canceled, expense changes, settings updates, print views, exports, backup exports, security changes, and selected notification/test actions.
- Audit records store `tenantId`, optional `userId`, action, entity type, entity id, Persian title/message, safe before/after snapshots, metadata, optional IP/user agent, target `href`, and standard `DateTime` timestamps. UI timestamps are rendered as Jalali/Shamsi date plus `HH:mm` with Persian digits.
- The shared service lives in `src/lib/audit/audit-log-service.ts` and intentionally never throws into the main user operation if audit writing fails; failures are logged server-side only.
- Audit payloads are sanitized before storage. Passwords, password hashes, tokens, bot tokens, encrypted bot tokens, API keys, secrets, sessions, cookies, authorization headers, private keys, access/refresh tokens, OTPs, and verification codes are masked and must never be shown in the UI.
- The global activity page is available at `/dashboard/settings/activity` for OWNER/ADMIN users. It supports search, section/action/user/date filters, pagination, Persian labels, safe before/after diff display, and tenant-scoped visibility.
- Contract detail pages show a compact `تاریخچه قرارداد` timeline with the latest audit events and a link to the full filtered activity page.
- List pages for contracts, payments/receipts, expenses, and customers expose useful Jalali created/updated metadata without overloading the cards.
- Current integrated areas include contracts, customers, calendar day notes, payments/receipts, expenses, menus, services, payment methods, financial categories, contract settings, hall information, account profile, password/security changes, Telegram settings, SMS settings, notification templates/settings, reports, CSV exports, full backup export, and contract print tracking.

## بهبودهای تولیدی مشتری، قرارداد، دریافت، هزینه، تنظیمات و پشتیبانی

در این نسخه چند جریان عملیاتی مهم برای استفاده production-ready در «تالار منیجر» تکمیل شده است:

- **حذف امن مشتری:** حذف مشتری فقط زمانی مجاز است که هیچ قراردادی در همان tenant به مشتری متصل نباشد. در غیر این صورت پیام فارسی شفاف نمایش داده می‌شود و حذف انجام نمی‌شود.
- **حذف امن قرارداد:** حذف قرارداد فقط برای قراردادهای غیر برگزارشده، غیر لغوشده، غیر تسویه‌شده و بدون دریافتی فعال مجاز است. عملیات tenant-scoped و همراه با تأیید کاربر انجام می‌شود.
- **لوگوی چاپ قرارداد:** مدیر می‌تواند لوگوی تالار را در تنظیمات قرارداد بارگذاری، پیش‌نمایش و حذف کند. فایل‌های JPG، PNG و WebP تا ۵ مگابایت پذیرفته می‌شوند، در سمت سرور به WebP مربعی ۵۱۲×۵۱۲ بدون کشیدگی تبدیل می‌شوند، با مسیر tenant-scoped در `public/uploads/tenants/{tenantId}/hall-logo/` ذخیره می‌شوند و در چاپ/پیش‌فاکتور قرارداد به‌صورت دایره‌ای با حلقه طلایی نمایش داده می‌شوند.
- **قیمت‌های پیش‌فرض غیرصفر:** seed و کاتالوگ پیش‌فرض خدمات مراسم و منوهای پذیرایی قیمت‌های واقع‌بینانه ریالی دارند. اجرای مجدد seed آیتم تکراری ایجاد نمی‌کند و فقط قیمت‌های صفر/خالی پیش‌فرض را اصلاح می‌کند.
- **ورودی مبلغ ریالی:** ورودی‌های مالی قرارداد، دریافت و هزینه از کامپوننت `RialInput` استفاده می‌کنند؛ کاربر مبلغ را با جداکننده هزارگان می‌بیند و سرور مقدار عددی تمیز را اعتبارسنجی و ذخیره می‌کند.
- **دریافت هوشمند:** فرم ثبت دریافت از ادبیات «دریافت/دریافتی‌ها» استفاده می‌کند، وضعیت مالی قرارداد را نشان می‌دهد، ثبت دریافت برای قراردادهای لغوشده یا تسویه‌شده را مسدود می‌کند و حالت‌های چک و اقساط را به‌صورت ساختاری ذخیره می‌کند.
- **چک و اقساط دریافتی:** اطلاعات چک در `PaymentCheque` و برنامه اقساط در `PaymentInstallment` ذخیره می‌شود. تاریخ‌ها در UI شمسی هستند و مبالغ با فرمت ریال وارد می‌شوند.
- **هزینه هوشمند:** در هزینه‌های با روش چک، اطلاعات چک در `ExpenseCheque` ذخیره می‌شود. اگر قرارداد مرتبط انتخاب شود، تالار، سالن و مشتری در سمت سرور از قرارداد همان tenant استخراج می‌شود.
- **تنظیمات کلی سامانه:** مسیر `/dashboard/settings/general` به‌عنوان هاب تنظیمات کلی در sidebar اضافه شده و با بخش‌های «اطلاعات تالار»، «تعاریف پایه»، «تنظیمات قرارداد»، «روش‌های دریافت و مالی» و «اعلان‌ها و ارتباطات» به مسیرهای موجود متصل می‌شود. این صفحه وضعیت تکمیل اطلاعات تالار و شمارش واقعی آیتم‌های پایه را بدون تکرار فرم‌های اصلی نمایش می‌دهد.
- **پشتیبانی و تیکتینگ:** مسیرهای `/dashboard/support`، `/dashboard/support/new` و `/dashboard/support/[id]` برای ثبت، فهرست، مشاهده، پاسخ، بستن/بازگشایی تیکت و پیوست فایل اضافه شده‌اند. فایل‌ها از نظر MIME و حجم اعتبارسنجی می‌شوند و همه داده‌ها tenant-scoped هستند.
- **AuditLog:** عملیات جدید حذف، بارگذاری لوگو، دریافت، هزینه و تیکت پشتیبانی در صورت وجود سیستم audit، لاگ tenant-scoped ثبت می‌کنند. شکست audit عملیات اصلی کاربر را متوقف نمی‌کند.

### تغییرات Prisma این نسخه

Migration پیشنهادی/اضافه‌شده:

```bash
npm run prisma:migrate
```

Migration: `20260515151000_production_finance_support_improvements`

این migration فیلدهای لوگوی چاپ تالار و مدل‌های زیر را اضافه می‌کند:

- `PaymentInstallment`
- `PaymentCheque`
- `ExpenseCheque`
- `SupportTicket`
- `SupportTicketMessage`
- `SupportTicketAttachment`

پس از اعمال migration حتماً Prisma Client را دوباره تولید کنید:

```bash
npx prisma generate
```

### فاز ۱ — حذف امن مشتری و قرارداد

- حذف مشتری از فهرست و صفحه جزئیات فقط برای کاربران OWNER/ADMIN و فقط وقتی مجاز است که مشتری در همان tenant هیچ قراردادی نداشته باشد. در صورت وجود قرارداد، دکمه حذف غیرفعال می‌شود و پیام «این مشتری دارای قرارداد ثبت‌شده است و امکان حذف آن وجود ندارد.» نمایش داده می‌شود.
- حذف قرارداد از فهرست و صفحه جزئیات فقط برای قراردادهای همان tenant، غیر برگزارشده، غیر لغوشده، غیر تسویه‌شده و بدون دریافتی فعال مجاز است. قراردادهای دارای دریافتی معتبر یا مانده صفر/تسویه‌شده حذف نمی‌شوند.
- همه حذف‌ها از `tenantId` سمت سرور و membership فعلی استفاده می‌کنند، قبل از اجرا دیالوگ destructive فارسی نشان می‌دهند، مسیرهای داشبورد/گزارش/تقویم را revalidate می‌کنند و در صورت وجود AuditLog رویداد `DELETE` ثبت می‌شود.

### فاز ۳ — قیمت‌های پیش‌فرض و ورودی مبلغ در قرارداد جدید

- کاتالوگ پیش‌فرض خدمات مراسم، عکاسی و فیلم‌برداری، منوهای پذیرایی، نوشیدنی‌ها، دسرها و هزینه‌های انتخابی قرارداد در `src/lib/contract-defaults.ts` تکمیل شد و همه قیمت‌ها غیرصفر و بر اساس ریال هستند.
- مسیرهای `/dashboard/contracts/new`، `/dashboard/services`، `/dashboard/menus` و `/dashboard/base` هنگام دسترسی مدیر/مالک، seed پیش‌فرض tenant-scoped را به‌صورت idempotent اجرا می‌کنند تا آیتم‌های پایه جاافتاده ایجاد شوند.
- seed دیتابیس در `prisma/seed.mjs` با همین کاتالوگ هماهنگ است. اجرای چندباره seed آیتم تکراری ایجاد نمی‌کند، چون آیتم‌ها با `tenantId + code`، عنوان canonical و aliasهای امن شناسایی می‌شوند.
- اگر آیتم پیش‌فرض موجود قیمت صفر/خالی داشته باشد، فقط همان قیمت اولیه تکمیل می‌شود. قیمت‌های غیرصفر موجود، که ممکن است توسط مدیر ویرایش شده باشند، بازنویسی نمی‌شوند.
- فرم قرارداد جدید قیمت‌ها را از دیتابیس می‌خواند و هنگام ثبت قرارداد، نام، دسته‌بندی، نوع قیمت‌گذاری، واحد، قیمت واحد، تعداد و جمع هر ردیف را در `ContractLineItem` snapshot می‌کند؛ بنابراین قراردادهای قبلی با تغییر قیمت پایه تغییر نمی‌کنند.
- کامپوننت مشترک `RialInput` ورودی‌های ریالی را هنگام تایپ با جداکننده هزارگان نمایش می‌دهد، اعداد فارسی/عربی و کاما/فاصله را normalize می‌کند و مقدار تمیز عددی را برای اعتبارسنجی و ذخیره ارسال می‌کند.
- اعتبارسنجی‌های سمت سرور ورودی‌هایی مثل `25,000,000` و `۲۵,۰۰۰,۰۰۰` را به عدد تمیز تبدیل می‌کنند و از ذخیره مقدار فرمت‌شده در فیلدهای عددی جلوگیری می‌شود.

### فاز ۴ — ادبیات دریافتی‌ها و کنترل وضعیت مالی قرارداد

- مسیر فنی و مدل داخلی `Payment` برای پایداری نگه داشته شده است و `/dashboard/payments` همچنان مسیر اصلی ماژول است؛ با این حال تمام کپی‌های قابل مشاهده در UI برای پول دریافت‌شده از مشتری از «دریافت»، «دریافتی» و «دریافتی‌ها» استفاده می‌کنند.
- مسیرهای alias سبک `/dashboard/receipts` و `/dashboard/receipts/new` به‌ترتیب به `/dashboard/payments` و `/dashboard/payments/new` redirect می‌شوند تا لینک‌های آینده با ادبیات «رسید/دریافت» بدون شکستن مسیر قبلی قابل استفاده باشند.
- helper مشترک `src/lib/finance/contract-financial-state.ts` وضعیت مالی قرارداد را با `tenantId` سمت سرور و بر اساس مبلغ نهایی snapshot‌شده قرارداد، دریافتی‌های واقعی/فعال و بیعانه ثبت‌شده محاسبه می‌کند.
- فرم ثبت دریافت جدید پس از انتخاب قرارداد، پنل وضعیت مالی شامل «مبلغ نهایی»، «دریافتی ثبت‌شده»، «مانده قابل دریافت» و «وضعیت تسویه» را نشان می‌دهد.
- ثبت دریافت جدید برای قراردادهای لغوشده، تسویه‌شده، دارای اضافه دریافت/بستانکاری مشتری یا فاقد مبلغ نهایی قابل دریافت مسدود می‌شود. اگر مبلغ واردشده از مانده قابل دریافت بیشتر باشد، فرم submit را متوقف کرده و پیام «مبلغ دریافتی از مانده قرارداد بیشتر است.» نمایش می‌دهد.
- server action ثبت دریافت همین قوانین را دوباره در سرور اجرا می‌کند و به انتخاب client اعتماد نمی‌کند؛ قرارداد باید متعلق به tenant فعلی باشد و وضعیت مالی از داده‌های قرارداد/دریافتی‌های همان tenant محاسبه می‌شود.

### فاز ۵ — دریافت اقساطی و دریافت چکی

- فرم ثبت دریافت در مسیر پایدار `/dashboard/payments/new` اکنون برای نوع دریافت «قسط» حالت اقساطی هوشمند دارد و بخش «برنامه اقساط» را فقط در همان حالت نمایش می‌دهد.
- کاربر مبلغ کل اقساط، تعداد اقساط، تاریخ شروع اقساط و فاصله اقساط را وارد می‌کند؛ سیستم جدول اقساط را با مبلغ، تاریخ سررسید شمسی، وضعیت و توضیحات هر قسط تولید می‌کند و امکان ویرایش ردیف‌ها را می‌دهد.
- مجموع اقساط در UI محاسبه و با مبلغ تعریف‌شده مقایسه می‌شود. اگر برابر نباشد، فرم submit را متوقف می‌کند و سرور نیز با پیام «مجموع اقساط با مبلغ تعریف‌شده برابر نیست.» ذخیره را رد می‌کند.
- اطلاعات اقساط به‌صورت ساختاری در مدل `PaymentInstallment` و در transaction همان دریافت ذخیره می‌شود. تاریخ‌ها در دیتابیس `DateTime` استاندارد هستند و UI فقط تاریخ شمسی نمایش می‌دهد.
- اگر روش دریافت «چک» باشد، بخش «اطلاعات چک» به‌صورت شرطی نمایش داده می‌شود و شماره چک، تاریخ سررسید، بانک، شعبه، مبلغ چک، صاحب چک، وضعیت و توضیحات را دریافت می‌کند.
- اطلاعات چک به‌صورت ساختاری در مدل `PaymentCheque` ذخیره می‌شود. شماره چک و مبلغ/تاریخ سررسید در سرور اعتبارسنجی می‌شوند و مبلغ‌ها با `RialInput` به ریال و با جداکننده هزارگان وارد می‌شوند.
- اگر مبلغ چک با مبلغ دریافتی متفاوت باشد، UI هشدار فارسی نمایش می‌دهد تا کاربر قبل از ثبت، دریافت جزئی یا چندابزاری را بررسی کند.
- لیست و جزئیات دریافتی‌ها خلاصه «دریافت چکی»، «دریافت اقساطی»، وضعیت چک، تعداد اقساط و سررسیدهای اقساط را بدون نمایش JSON خام نشان می‌دهند.
- عملیات ایجاد و ویرایش دریافت، ردیف‌های چک/اقساط را tenant-scoped و در transaction ایجاد یا جایگزین می‌کند و محاسبات مانده قرارداد را پس از ذخیره به‌روزرسانی می‌کند.

### فاز ۶ — هزینه چکی و تکمیل خودکار تالار/سالن از قرارداد

- فرم ثبت و ویرایش هزینه در مسیرهای `/dashboard/expenses/new` و `/dashboard/expenses/[id]/edit` برای روش پرداخت چک، بخش «اطلاعات چک هزینه» را به‌صورت شرطی نمایش می‌دهد.
- فیلدهای ساختاری چک شامل شماره چک، تاریخ سررسید شمسی، بانک، شعبه، مبلغ چک، دریافت‌کننده چک و وضعیت چک هستند. مبلغ چک با `RialInput` وارد می‌شود و در دیتابیس به‌صورت مقدار عددی ریالی ذخیره می‌گردد.
- وضعیت‌های چک هزینه شامل «در انتظار پاس شدن»، «پاس شده»، «برگشتی» و «لغوشده» هستند و در لیست و جزئیات هزینه با برچسب فارسی نمایش داده می‌شوند.
- اگر مبلغ چک با مبلغ هزینه متفاوت باشد، UI هشدار فارسی نشان می‌دهد تا کاربر دریافت/پرداخت چکی جزئی را در توضیحات مشخص کند. سرور همچنان شماره چک، تاریخ سررسید و مبلغ مثبت را الزامی می‌داند.
- وقتی هزینه به قرارداد مرتبط شود، customer، hall و salon در سرور از قرارداد همان tenant استخراج می‌شوند و مقدارهای ارسالی client برای تالار/سالن override نمی‌شوند. این کار از ثبت cross-tenant یا hall/salon اشتباه جلوگیری می‌کند.
- فرم هزینه پس از انتخاب قرارداد، خلاصه‌ای شامل مشتری، تاریخ مراسم، تالار، سالن و مبلغ قرارداد نشان می‌دهد و در صورت نبود اطلاعات تالار/سالن پیام «اطلاعات تالار یا سالن در قرارداد انتخاب‌شده ثبت نشده است.» را نمایش می‌دهد.
- ایجاد و ویرایش هزینه، رکورد `ExpenseCheque` را داخل transaction و tenant-scoped ایجاد یا جایگزین می‌کند و مسیرهای هزینه‌ها، گزارش‌ها و قرارداد مرتبط را revalidate می‌کند.

## بازیابی رگرسیون از نسخه‌های پشتیبان

در بازیابی اخیر، نسخه فعلی با ZIPهای قبلی پروژه مقایسه شد و دسترسی‌ها/قابلیت‌هایی که در مسیر توسعه از دست رفته بودند بدون بازگرداندن شلوغی sidebar احیا شدند:

- کارت «راه‌اندازی اولیه سامانه» داخل `/dashboard/settings` اضافه/حفظ شد و به هاب `/dashboard/settings/setup` وصل است.
- هاب راه‌اندازی اولیه فقط نقش مرکز راهبری دارد و فرم‌های موجود مانند `/dashboard/hall-info`، `/dashboard/base`، `/dashboard/services`، `/dashboard/menus`، `/dashboard/payment-methods`، `/dashboard/financial-categories` و `/dashboard/contract-settings` را تکرار نمی‌کند.
- مسیرهای راهنما و پشتیبانی از نسخه‌های پشتیبان معتبر بازیابی شدند و از گروه تنظیمات sidebar قابل دسترسی هستند.
- لوگوی چاپ قرارداد، آپلود امن tenant-scoped و نمایش دایره‌ای لوگو در چاپ قرارداد حفظ شد.
- قالب چاپ قرارداد با کانتینر ثابت A4، شروط دو ستونه و خلاصه‌سازی خدمات/منو برای جلوگیری از صفحه دوم حفظ شد.
- آیتم‌های «تعاریف پایه»، «اطلاعات تالار» و «تنظیمات کلی سامانه» به‌صورت مستقیم به sidebar برنگشتند؛ دسترسی آن‌ها از داخل تنظیمات و هاب راه‌اندازی انجام می‌شود.

## پنل مدیریت کل سامانه `/admin`

- پنل جدید `/admin` برای مالک پلتفرم SaaS ساخته شده و کاملاً جدا از داشبورد tenant در `/dashboard` است. مدیر تالارها به این بخش دسترسی ندارند و داده‌های cross-tenant فقط در همین محدوده خوانده می‌شود.
- دسترسی platform admin در این نسخه با متغیر محیطی کنترل می‌شود:

```bash
PLATFORM_ADMIN_EMAIL=bavafasobhan@gmail.com
# یا برای چند مدیر:
PLATFORM_ADMIN_EMAILS=owner@example.com,ops@example.com
```

- مسیرهای ایجادشده:
  - `/admin` نمای کلی سامانه، KPIها، آخرین تالارها، کاربران، دموهای نزدیک پایان، تیکت‌های باز و فعالیت‌های اخیر
  - `/admin/tenants` فهرست همه تالارها/فضاهای کاری با جست‌وجو، وضعیت، پلن و آمار مصرف
  - `/admin/tenants/[id]` نمای کامل تالار، مالک، اعضا، hall info، اشتراک، قراردادها، دریافتی‌ها، هزینه‌ها، تیکت‌ها و فعالیت‌ها
  - `/admin/users` و `/admin/users/[id]` مدیریت و مشاهده کاربران ثبت‌نام‌شده، عضویت‌ها، تالارهای مالکیت‌شده، تیکت‌ها و فعالیت‌ها
  - `/admin/subscriptions` پایش دموها، پلن‌ها و وضعیت اشتراک‌ها بر اساس مدل `Subscription`
  - `/admin/support` و `/admin/support/[id]` سمت مالک پلتفرم برای مشاهده و پاسخ به تیکت‌های tenantها بدون ایجاد پیام جعلی
  - `/admin/activity` مشاهده لاگ‌های `AuditLog` در سطح پلتفرم با فیلتر tenant/action/entity
  - `/admin/reports` گزارش‌های تجمیعی SaaS از tenantها، کاربران، تیکت‌ها، قراردادها، دریافتی‌ها و هزینه‌ها
  - `/admin/settings` تنظیمات سطح پلتفرم و نمایش وضعیت متغیرهای محیطی مدیریت کل
- دکمه «مشاهده پنل تالار» در جزئیات tenant به نمای مدیریتی امن همان صفحه متصل است و tenantId را به داشبورد معمولی تزریق نمی‌کند. impersonation/write-as در این نسخه پیاده‌سازی نشده تا ریسک امنیتی ایجاد نشود.
- پاسخ platform admin به تیکت‌ها با `senderType=SUPPORT` ذخیره می‌شود، وضعیت تیکت را به `ANSWERED` تغییر می‌دهد، مسیرهای tenant/admin را revalidate می‌کند و در صورت وجود `AuditLog` لاگ tenant-scoped ثبت می‌کند.
- هیچ migration جدیدی برای پنل admin اضافه نشده است؛ دسترسی platform admin از env خوانده می‌شود و مدل‌های موجود `User`، `Tenant`، `Subscription`، `SupportTicket` و `AuditLog` استفاده شده‌اند.

### رفع اجرای Seed در Prisma 7
- فایل `prisma/seed.mjs` باید Prisma Client را مثل کد اصلی پروژه با `@prisma/adapter-pg` و `DATABASE_URL` بسازد.
- اگر `npm run prisma:seed` خطای `PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions` داد، یعنی seed هنوز با `new PrismaClient()` قدیمی اجرا می‌شود و باید adapter تنظیم شود.
- بعد از تغییر `.env`، برای ساخت/به‌روزرسانی کاربر مدیر سایت، دستور `npm run prisma:seed` را دوباره اجرا کنید.

## ارتقای داشبورد `/admin` به مرکز فرمان SaaS

صفحه اصلی `/admin` از یک نمای آماری ساده به مرکز فرمان عملیاتی مالک پلتفرم تبدیل شد. این صفحه همچنان فقط با `requirePlatformAdmin()` و متغیرهای `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_EMAILS` قابل دسترسی است و هیچ تغییری در داشبورد tenant در `/dashboard` ایجاد نمی‌کند.

بخش‌های اصلی مرکز فرمان:

- هدر فشرده با تاریخ شمسی، وضعیت کلی پلتفرم، نام/ایمیل مدیر سامانه و دسترسی سریع به تالارها، تیکت‌های فوری، دموهای رو به پایان، کاربران جدید و لاگ‌ها.
- KPIهای اولویت‌دار برای درآمد ماه جاری، اشتراک‌های فعال، دموهای نزدیک پایان، تیکت‌های فوری/باز، کاربران فعال امروز و تالارهای بدون فعالیت.
- پنل «نیازمند اقدام امروز» برای تیکت‌های فوری، دموهای ۳ روز آینده، دموهای منقضی، تالارهای بدون فعالیت، تالارهای بدون قرارداد و راه‌اندازی‌های ناقص.
- بخش «وضعیت فروش و اشتراک‌ها» با قیف واقعی `ثبت‌نام‌شده → دمو فعال → رو به پایان → منقضی‌شده → اشتراک فعال`.
- «پایش فعالیت تالارها» برای نمایش فعال‌ترین تالارها، تالارهای غیرفعال، تالارهای بدون قرارداد و اطلاعات پایه ناقص.
- «عملیات پشتیبانی» با شمارنده تیکت‌های فوری، باز، در حال بررسی و در انتظار پاسخ کاربر، همراه با لینک مستقیم به پاسخ‌گویی.
- «آخرین فعالیت‌های مهم سامانه» بر اساس `AuditLog` و در صورت نبود لاگ، رخدادهای واقعی مثل ثبت تالار، کاربر و تیکت.
- «سلامت سامانه» شامل وضعیت دیتابیس، آخرین بکاپ، خطاهای اعلان، وضعیت تلگرام و وضعیت پیامک.
- دسترسی سریع مدیریتی به مسیرهای واقعی `/admin/tenants`, `/admin/users`, `/admin/subscriptions`, `/admin/support`, `/admin/reports`, `/admin/activity`, `/admin/settings`.

هیچ metric ساختگی به‌عنوان داده واقعی نمایش داده نمی‌شود. اگر مدل پرداخت اشتراک هنوز رکورد درآمد SaaS جداگانه نداشته باشد، کارت «درآمد ماه جاری» وضعیت غیرفعال/ناموجود حرفه‌ای نشان می‌دهد و دریافتی tenantها به‌عنوان درآمد اشتراک معرفی نمی‌شوند.

## ارتقای `/admin/tenants` به مرکز کنترل تالارها و مشتریان

صفحه `/admin/tenants` از یک فهرست ساده به صفحه حرفه‌ای مدیریت مشتریان SaaS تبدیل شد و همچنان فقط برای platform admin قابل دسترسی است. این صفحه به مالک پلتفرم کمک می‌کند تشخیص دهد کدام تالار فعال است، کدام دمو رو به پایان است، کدام تالار اطلاعات ناقص یا تیکت باز دارد و چه کسی امروز نیازمند پیگیری فروش یا پشتیبانی است.

قابلیت‌های اصلی این صفحه:

- KPIهای واقعی برای کل تالارها، تالارهای فعال، دموهای نزدیک پایان، اطلاعات ناقص، تالارهای بدون فعالیت، تیکت‌های باز و مجموع دریافتی‌ها.
- تب‌های هوشمند برای «همه تالارها»، «نیازمند پیگیری»، «دموهای نزدیک پایان»، «اطلاعات ناقص»، «بدون فعالیت» و «تیکت‌دار».
- فیلترهای پیشرفته برای وضعیت فعالیت، تکمیل اطلاعات، داشتن تیکت باز، داشتن قرارداد و بازه مبلغ دریافتی.
- نمای کارت و نمای جدول برای مدیریت بهتر تعداد زیاد تالارها.
- محاسبه سلامت هر تالار با برچسب‌های «خوب»، «نیازمند پیگیری» و «در خطر ریزش» بر اساس داده واقعی مانند وضعیت دمو/اشتراک، تیکت فوری، تکمیل راه‌اندازی، قراردادها و آخرین فعالیت.
- نمایش تکمیل راه‌اندازی بر اساس اطلاعات تالار، لوگو، تالار/سالن، خدمات، منو، روش‌های دریافت و تنظیمات قرارداد.
- نمایش آخرین فعالیت هر تالار بر اساس لاگ‌ها، قراردادها، دریافتی‌ها، هزینه‌ها، تیکت‌ها و آخرین ورود مالک.
- همه عملیات به لینک‌های واقعی مثل `/admin/tenants/[id]`, `/admin/support?tenantId=...` و `/admin/subscriptions?tenantId=...` وصل هستند و لینک ساختگی اضافه نشده است.

در UI این صفحه نباید واژه فنی `tenant` یا enum خامی مانند `ACTIVE`, `TRIALING`, `OPEN` نمایش داده شود. همه متن‌ها فارسی، RTL، با تاریخ جلالی و مبالغ ریالی هستند.

### ارتقای مدیریت کاربران سامانه در پنل ادمین

صفحه `/admin/users` به مرکز حرفه‌ای مدیریت کاربران پلتفرم تبدیل شده است. این صفحه فقط برای مدیر کل سامانه در دسترس است و KPIهای واقعی، تب‌های هوشمند، فیلترهای پیشرفته، امتیاز سلامت کاربر، وضعیت نقش و حساب، فضاهای کاری مرتبط، تیکت‌های باز، آخرین ورود/فعالیت و دو نمای کارت/جدول را نمایش می‌دهد. وضعیت‌ها و نقش‌ها در UI فارسی نمایش داده می‌شوند و هیچ داده ساختگی یا مقدار خام فنی به‌عنوان متریک واقعی نمایش داده نمی‌شود.
## ارتقای `/admin/subscriptions` به مرکز مدیریت دمو و اشتراک

مسیر `/admin/subscriptions` به صفحه حرفه‌ای مدیریت دمو، تمدید، اشتراک و پیگیری فروش برای مالک پلتفرم ارتقا داده شد. این صفحه فقط از مسیر admin و با کنترل `requirePlatformAdmin()` قابل دسترسی است و برای کاربران عادی تالار نمایش داده نمی‌شود.

- داده صفحه از `src/lib/admin/admin-subscriptions-data.ts` بارگذاری می‌شود و وضعیت هر تالار را از داده‌های واقعی `Tenant`, `Subscription`, `DemoAccess`, قراردادها، مشتریان، دریافتی‌های عملیاتی، تیکت‌ها، لاگ فعالیت و تکمیل اطلاعات پایه محاسبه می‌کند.
- ردیف KPI شامل دموهای فعال، دموهای نزدیک پایان، دموهای منقضی‌شده، موارد نیازمند تمدید، اشتراک‌های فعال، اشتراک‌های منقضی‌شده، تبدیل‌شده‌ها و میانگین روزهای باقی‌مانده دمو است.
- پنل «نیازمند پیگیری فروش» مهم‌ترین تالارهای قابل تماس را بر اساس پایان نزدیک دمو/اشتراک، انقضا، بی‌فعالیتی، تیکت باز، تکمیل ناقص و آمادگی تبدیل به اشتراک نمایش می‌دهد.
- قیف فروش `ثبت‌نام‌شده → دمو فعال → دمو رو به پایان → منقضی‌شده → اشتراک فعال` با شمارش واقعی نمایش داده می‌شود و نرخ تبدیل فقط وقتی از داده موجود قابل محاسبه باشد نمایش داده می‌شود.
- تب‌های هوشمند، فیلترهای پایه و فیلترهای پیشرفته برای وضعیت دمو، وضعیت اشتراک، روزهای باقی‌مانده، تاریخ‌های جلالی دمو، آخرین فعالیت، قرارداد، تیکت، تکمیل اطلاعات و بازه دریافتی وجود دارد.
- صفحه دو نمای کارت و جدول دارد. کارت‌ها خلاصه هویت تالار، مالک، پلن، وضعیت دوره، روزهای باقی‌مانده/گذشته، سلامت فروش، مصرف دمو، تکمیل راه‌اندازی و لینک‌های عملیاتی واقعی را نشان می‌دهند.
- هیچ درآمد اشتراک ساختگی نمایش داده نمی‌شود. تا وقتی ماژول پرداخت اشتراک SaaS رکورد مالی جداگانه نداشته باشد، صفحه وضعیت حرفه‌ای غیرفعال بودن درآمد اشتراک را نشان می‌دهد و دریافتی‌های عملیاتی تالارها را درآمد اشتراک معرفی نمی‌کند.
- در UI این صفحه واژه فنی `tenant`، `tenantId` یا enum خامی مثل `ACTIVE`, `TRIALING`, `EXPIRED`, `CANCELED` نمایش داده نمی‌شود. همه وضعیت‌ها با برچسب فارسی، تاریخ جلالی و ارقام فارسی ارائه می‌شوند.

## ارتقای `/admin/support` به مرکز عملیات پشتیبانی

مسیرهای `/admin/support` و `/admin/support/[id]` به مرکز حرفه‌ای عملیات پشتیبانی برای مالک پلتفرم ارتقا داده شدند. این بخش همچنان فقط با دسترسی platform admin قابل مشاهده است و کاربران تالار به آن دسترسی ندارند.

- `/admin/support` اکنون KPIهای واقعی پشتیبانی شامل کل تیکت‌ها، تیکت‌های باز، فوری، منتظر پاسخ پشتیبانی، منتظر پاسخ کاربر، بسته‌شده، ثبت‌شده امروز، میانگین زمان پاسخ و تیکت‌های بدون پاسخ را نمایش می‌دهد.
- تب‌های هوشمند «همه»، «فوری»، «باز»، «منتظر پاسخ من»، «منتظر پاسخ کاربر»، «بدون پاسخ»، «امروز» و «بسته‌شده» با شمارش واقعی اضافه شده‌اند.
- فیلترهای پایه و پیشرفته برای جست‌وجوی شماره/عنوان/تالار/کاربر/متن پیام، وضعیت، اولویت، موضوع، تالار، کاربر، تاریخ ثبت، تاریخ آخرین پاسخ، پاسخ‌نداشتن، پیوست و وضعیت دمو/اشتراک تالار وجود دارد.
- نمای کارت و جدول برای مدیریت تعداد زیاد تیکت‌ها اضافه شد. کارت‌ها وضعیت عملیاتی، زمان انتظار، آخرین پیام، فرستنده آخر، تالار، کاربر، وضعیت دمو/اشتراک و لینک‌های امن «مشاهده و پاسخ» و «مشاهده تالار» را نشان می‌دهند.
- `/admin/support/[id]` اکنون یک فضای کاری کامل تیکت است: هدر فشرده، مکالمه تفکیک‌شده کاربر/پشتیبانی/رویداد/یادداشت داخلی، فرم پاسخ، یادداشت داخلی، تغییر وضعیت، تغییر اولویت، تاریخچه تیکت، اطلاعات تالار، اطلاعات کاربر و تیکت‌های قبلی همان تالار.
- یادداشت داخلی با `senderType=INTERNAL_NOTE` ذخیره می‌شود و فقط در صفحه admin نمایش داده می‌شود. صفحات tenant-facing پشتیبانی پیام‌های داخلی را از query حذف می‌کنند.
- تغییر وضعیت و اولویت از این نسخه به بعد یک پیام `SYSTEM` واقعی در تاریخچه تیکت ایجاد می‌کند و در صورت وجود `AuditLog` ثبت audit انجام می‌شود.
- هیچ metric ساختگی پشتیبانی نمایش داده نمی‌شود. اگر میانگین پاسخ داده کافی نداشته باشد، پیام حرفه‌ای «زمان پاسخ هنوز داده کافی ندارد.» نمایش داده می‌شود.
- در UI این بخش واژه فنی `tenant` یا enum خامی مثل `TECHNICAL`, `OPEN`, `CLOSED`, `URGENT` نمایش داده نمی‌شود؛ همه وضعیت‌ها، اولویت‌ها و موضوع‌ها با برچسب فارسی نمایش داده می‌شوند.

## ارتقای `/admin/reports` به داشبورد تحلیلی سامانه

مسیر `/admin/reports` اکنون داشبورد تحلیلی مالک سامانه است و فقط با دسترسی platform admin و helperهای cross-tenant ادمین بارگذاری می‌شود. این صفحه برای مدیران تالار و کاربران معمولی قابل مشاهده نیست.

- فیلترهای سراسری گزارش شامل بازه زمانی، از/تا تاریخ، نوع گزارش، وضعیت تالار، پلن و مرتب‌سازی هستند و همه تاریخ‌های قابل مشاهده با نمایش جلالی و اعداد فارسی ارائه می‌شوند.
- ردیف KPI اجرایی، شاخص‌های واقعی تالارها، کاربران، دموها، قراردادها، دریافتی‌های ثبت‌شده در تالارها، هزینه‌ها، سود تقریبی، تیکت‌های باز و تیکت‌های فوری را نمایش می‌دهد و مقایسه با دوره قبل فقط وقتی قابل محاسبه باشد نشان داده می‌شود.
- بخش روندها بدون وابستگی chart سنگین، نمودارهای فشرده CSS برای ثبت تالارها، قراردادها، دریافتی‌ها و کاربران جدید در ماه‌های جلالی نشان می‌دهد.
- تحلیل مالی از داده‌های عملیاتی تالارها استفاده می‌کند و دریافتی‌های تالارها را درآمد اشتراک معرفی نمی‌کند. اگر ماژول درآمد اشتراک پولی داده جداگانه نداشته باشد، وضعیت حرفه‌ای غیرفعال بودن گزارش درآمد اشتراک نمایش داده می‌شود.
- تحلیل تالارها، دمو/اشتراک، پشتیبانی، جدول برترین تالارها و بینش‌های قابل اقدام همگی از داده‌های واقعی `Tenant`, `Subscription`, `Contract`, `Payment`, `Expense`, `SupportTicket` و `AuditLog` مشتق می‌شوند.
- خروجی فایل فعلاً دکمه شکسته ندارد؛ تا زمان پیاده‌سازی route/action امن، گزینه‌های اکسل، CSV و PDF به‌صورت غیرفعال با پیام روشن نمایش داده می‌شوند.
- هیچ برچسب خامی مثل `tenant`, `ACTIVE`, `TRIALING`, `TECHNICAL`, `OPEN` یا `CLOSED` نباید در UI فارسی گزارش‌ها نمایش داده شود.

## بازگردانی بکاپ SQLite نرم‌افزار قدیمی تالار

بخش `/dashboard/settings/backups` اکنون امکان ایمپورت کنترل‌شده فایل بکاپ SQLite نرم‌افزار قدیمی تالار را دارد. این عملیات دیتابیس فعلی را جایگزین یا پاک نمی‌کند؛ فقط جدول `customers` بکاپ قدیمی را به مشتری، قرارداد، ردیف قرارداد و دریافت مالی در مدل فعلی تبدیل می‌کند.

- شماره قراردادهای قدیمی با قالب `OLD-{Id}` ذخیره می‌شوند تا ایمپورت دوباره همان فایل، قرارداد تکراری نسازد.
- تاریخ‌های شمسی قدیمی مثل `1404/03/01` به تاریخ قابل ذخیره در سامانه جدید تبدیل می‌شوند.
- بیعانه قدیمی (`Bayane`) هم در خود قرارداد و هم به‌عنوان رکورد دریافت مالی ثبت می‌شود.
- اگر جدول `customer_payments` در بکاپ رکورد داشته باشد، پرداخت‌های تکمیلی نیز به `Payment` منتقل می‌شوند.
- عملیات در تاریخچه پشتیبان‌گیری و Audit Log ثبت می‌شود.
- مستندات کامل در `docs/LEGACY_SQLITE_BACKUP_IMPORT.md` قرار دارد.

## Platform owner user cascade delete

The platform admin user management area supports controlled user deletion from `/admin/users` and `/admin/users/[id]#delete-user`.

Deleting a user removes the account, direct personal records, and any tenants owned by that user with their tenant-scoped records. Membership-only access in other tenants is removed without deleting the other tenant's database. The action blocks self-deletion, blocks deletion of configured platform admins, and requires exact email confirmation.

See `docs/PLATFORM_USER_CASCADE_DELETE.md`.


### انتخاب پلن و خرید از طریق تیکت

- مسیر انتخاب پلن داخل حساب کاربری اضافه شد: `/dashboard/account/plans`.
- لینک‌های «مشاهده پلن خرید» در داشبورد و حساب کاربری به این مسیر هدایت می‌شوند.
- انتخاب پلن فعلاً پرداخت آنلاین ندارد و یک تیکت با موضوع `SUBSCRIPTION` برای مالک پلتفرم ایجاد می‌کند.
- اگر کاربر هنوز فضای کاری نداشته باشد، برای اتصال امن تیکت به ساختار فعلی، یک فضای کاری تعلیق‌شده مخصوص پیگیری خرید ساخته می‌شود.
- فضای کاری تعلیق‌شده تا زمان فعال‌سازی اشتراک، فقط به حساب کاربری، انتخاب پلن و تیکت‌ها دسترسی دارد.
- مستندات: `docs/PLAN_PURCHASE_TICKET_FLOW.md`.


## فعال‌سازی اشتراک از پنل مالک پلتفرم

بعد از ثبت درخواست خرید توسط کاربر و پیگیری از طریق تیکت، مالک پلتفرم می‌تواند از مسیر زیر پلن را فعال کند:

```text
/admin/subscriptions/[tenantId]/activate
```

این فعال‌سازی `Tenant.status` را به `ACTIVE` تغییر می‌دهد، رکورد `Subscription` را ایجاد/به‌روزرسانی می‌کند، دوره اشتراک را ثبت می‌کند، روی تیکت خرید پیام ادمین می‌گذارد، در صورت انتخاب ادمین تیکت را می‌بندد، اعلان داخلی می‌سازد و Audit Log ثبت می‌کند. جزئیات در `docs/ADMIN_SUBSCRIPTION_ACTIVATION.md` آمده است.


## Local auth redirect/cache fix

For local Windows development, use `run-talar-dev-cache-safe.bat` V2. It avoids the old localhost `/login` ↔ `/dashboard` redirect loop by opening `/login` first, using an isolated browser profile, and avoiding destructive `.next` cache deletion by default. See `docs/LOCAL_AUTH_REDIRECT_CACHE_FIX.md`.

### Local stale session redirect loop fix

If the local database is truncated or reset while the browser still keeps a NextAuth cookie, `/dashboard` may redirect to `/login` while `/login` used to redirect back to `/dashboard`. The login page now validates the JWT against the real database user before redirecting. If the user no longer exists, the stale session is signed out and the login form is shown again.


## Contract CRM phased portal

A phased CRM foundation was added for secure owner contract links, separate guest address links, owner/guest feedback, club membership, wedding bride/groom profiles, and wedding music requests. See `docs/CONTRACT_CRM_PHASED_IMPLEMENTATION.md` for the implemented phase matrix and remaining hardening steps.

## TALAR_POST_EVENT_INVOICE_SCOPE_LOCK_28

- Added a product/financial scope lock for post-event confirmation and invoice generation after the ceremony date.
- Locked the mandatory status choices to: held, not held/cancellation, or pre-approved date transfer only. The unsafe `بعداً بررسی می‌کنم` path is explicitly forbidden.
- Defined extra-guest invoicing rules: the suggested per-guest amount is derived from contract total divided by contracted guest count, and staff cannot reduce it.
- Defined the customer invoice feedback questions needed to detect off-invoice extra services and payments.
- Defined owner operation models, including management-percentage with monthly minimum guarantee, owner shares from held events and cancellations, and monthly owner settlement formulas.
- This phase is documentation/scope-lock only: no Prisma schema, migration, runtime, route, UI, notification, or database behavior was changed.


### TALAR_POST_EVENT_MANDATORY_CONFIRMATION_29

- Added a dashboard post-event confirmation gate for past `RESERVED`/`CONFIRMED` contracts with no resolved post-event status.
- Added narrow Prisma persistence through `PostEventConfirmation` plus migration `20260526123000_post_event_confirmation_29`.
- Added server action `confirmPostEventAction` to record `HELD` or `NOT_HELD` decisions with tenant, contract, user, timestamp, and audit log.
- Kept date transfer hidden because no source-proven pre-approved transfer flow exists yet.
- Did not implement invoice generation, owner settlement, customer invoice feedback, or payment mutation behavior.


### TALAR_CONTRACT_TO_INVOICE_GENERATION_30

- Added tenant-scoped post-event invoice persistence through `Invoice` and `InvoiceLine` plus migration `20260526133000_contract_to_invoice_generation_30`.
- Added contract-to-invoice generation after a Phase 29 `HELD` confirmation at `/dashboard/contracts/[id]/invoice`.
- Added invoice list/detail surfaces at `/dashboard/invoices` and `/dashboard/invoices/[id]`.
- Redirects held post-event confirmations directly into invoice generation.
- Copies contract line items into locked invoice lines and calculates extra guest charges with a locked minimum per-guest amount.
- Prevents staff from reducing the suggested extra guest unit price by not exposing any lowering field in this phase.
- Customer invoice sending, customer feedback, owner settlement, and cancellation settlement remain deferred to later phases.

- `TALAR_CUSTOMER_INVOICE_FEEDBACK_PORTAL_31`: Customer invoice portal, confidential owner feedback, off-invoice payment report, and invoice sent/accepted/disputed lifecycle.
## TALAR_OWNER_OPERATION_MODEL_SETTINGS_32

- Added owner operation model settings for hall commercialization and owner-control workflows.
- Added owner/admin-only settings route `/dashboard/settings/owner-operation`.
- Added `OwnerOperationSetting` with operation model, owner revenue share, owner cancellation share, monthly minimum guarantee, settlement cycle, active flag, and internal note.
- Default business scenario: management contract with monthly minimum guarantee, 25% owner share from held events, 50% owner share from cancellation income, 150,000,000 Toman monthly minimum guarantee.
- No monthly settlement execution is implemented in this phase; the next phase must read this setting and fail closed if missing or inactive.


## TALAR_OWNER_MONTHLY_SETTLEMENT_33

- Added monthly owner settlement execution for the owner-operation model introduced in Phase 32.
- Added tenant-scoped `OwnerMonthlySettlement` persistence plus migration `20260526163000_owner_monthly_settlement_33`.
- Added owner/admin route `/dashboard/owner-settlements` to preview and generate a Jalali monthly settlement.
- Added detail route `/dashboard/owner-settlements/[id]` with saved Snapshot rows for held-event invoices and cancellation estimates.
- Calculates owner share from held-event invoices, cancellation income, extra services/extra guests, and monthly minimum guarantee.
- Supports a controlled lifecycle: `DRAFT` -> `APPROVED` -> `PAID`, with audit logs for generation, approval, and payment marking.
- Cancellation income is explicitly audit-marked as an estimate until a future dedicated cancellation settlement ledger exists.

## TALAR_OWNER_FINANCIAL_CONTROL_AUDIT_34

- مسیر مالک/مدیر برای حسابرسی مالی اضافه شد: `/dashboard/owner-financial-audit`.
- هشدارهای پرداخت خارج از فاکتور، اختلاف نفرات اضافه، اعتراض مشتری، فاکتور ارسال‌شده بدون پاسخ، مراسم برگزارشده بدون فاکتور، عدم برگزاری نیازمند کنسلی و قیمت نفر اضافه زیر حداقل تولید می‌شود.
- پیام محرمانه مشتری و سیگنال‌های مالی حساس فقط برای OWNER/ADMIN قابل مشاهده است.
- این فاز بدون migration و بدون mutation مالی اجرا شد؛ فقط سطح read-only/analysis اضافه شده است.


## TALAR_INVOICE_ADJUSTMENT_AND_OWNER_APPROVAL_35

Phase 35 adds owner-controlled invoice adjustment requests for post-event invoices. Operators and admins can create a positive-only adjustment request, but the invoice is not changed until the owner applies it. Applied adjustments are inserted as locked `OWNER_ADJUSTMENT` invoice lines and the invoice returns to `ISSUED` so it can be resent to the customer.

Key route:

```text
/dashboard/invoices/[id]/adjustments
```

Hard rules:

- no direct operator invoice mutation;
- no negative adjustment;
- no contract line deletion;
- no invoice decrease;
- no adjustment on `SETTLED` or `CANCELED` invoices;
- owner approval is required before financial impact.

See `docs/TALAR_INVOICE_ADJUSTMENT_AND_OWNER_APPROVAL_35.md`.

## TALAR_CUSTOMER_NOTIFICATION_DELIVERY_36

Phase 36 adds tracked notification delivery for post-event invoices. Customer invoice links are still generated through the secure customer portal flow, but delivery now attempts the active configured channels: customer SMS, manager SMS, and management Telegram. Every external attempt is logged as SENT / FAILED / SKIPPED, and invoice details show recent delivery logs. This phase does not change invoice calculation, settlement, posting, schema, or migration.

## TALAR_SETTLEMENT_PRINT_AND_EXPORT_37

فاز ۳۷ مسیر چاپ و خروجی‌گیری تسویه مالک را اضافه کرد:

- نسخه چاپی: `/dashboard/owner-settlements/[id]/print`
- خروجی CSV: `/api/dashboard/owner-settlements/[id]/export/csv`
- خروجی JSON: `/api/dashboard/owner-settlements/[id]/export/json`
- دکمه‌های چاپ/PDF، CSV و JSON در صفحه جزئیات تسویه مالک
- ثبت Audit Log برای چاپ و خروجی‌ها

این فاز هیچ migration، schema، محاسبه مالی، فاکتور، پرداخت یا ledger جدیدی اضافه نکرد. خروجی‌ها فقط از Snapshot ذخیره‌شده گزارش تسویه ساخته می‌شوند.

## TALAR_OWNER_DASHBOARD_FINANCIAL_OVERVIEW_38

فاز ۳۸ نمای مالی مالک را اضافه کرد:

- مسیر مالک/مدیر: `/dashboard/owner-financial-overview`
- خلاصه سهم مالک، فاکتورهای دوره، وضعیت تسویه، هشدارهای مالی، پرداخت خارج از فاکتور و اقدام‌های مهم ماهانه
- استفاده از محاسبه پذیرفته‌شده فاز ۳۳ برای پیش‌نمایش تسویه، بدون فرمول موازی
- استفاده از حسابرسی فاز ۳۴ برای هشدارها و سیگنال‌های دور زدن مالی
- نمایش تنظیمات مالک، آخرین تسویه‌ها، درخواست‌های اصلاح باز و وضعیت پاسخ مشتری
- بدون migration، بدون schema، بدون mutation مالی، بدون ارسال پیام، بدون تغییر ledger/payment/posting

مرحله پیشنهادی بعدی: `TALAR_MONTHLY_CLOSE_LOCK_39`.

## TALAR_MONTHLY_CLOSE_LOCK_39

فاز ۳۹ قفل ماه مالی را برای گزارش تسویه مالک اضافه کرد:

- مسیر مالک/مدیر: `/dashboard/monthly-close-lock`
- ماه مالی با وضعیت تسویه `APPROVED` یا `PAID` بسته محسوب می‌شود
- عملیات مالی اثرگذار روی قراردادها و فاکتورهای همان ماه مسدود می‌شود
- صدور فاکتور، تعیین وضعیت بعد از مراسم، پاسخ مشتری، ارسال فاکتور، درخواست/اعمال اصلاح فاکتور و بازسازی تسویه در ماه بسته مسدود شد
- هشدار قفل در فاکتور، اصلاحات، پرتال مشتری، تسویه و داشبورد مالک نمایش داده می‌شود
- تلاش‌های مسدودشده در Audit Log ثبت می‌شوند
- بدون migration، بدون schema، بدون تغییر محاسبه مالی، بدون payment/ledger/posting

مرحله پیشنهادی بعدی: `TALAR_POST_EVENT_INVOICE_FINAL_HARDENING_40`.


## TALAR_POST_EVENT_INVOICE_FINAL_HARDENING_40_COMPLETED

Phase 40 final hardening is implemented. It adds OWNER/ADMIN readiness review at `/dashboard/post-event-invoice-hardening`, redacts raw customer invoice tokens from dashboard redirects/logs/manager delivery channels, fixes invoice delivery duplicate key risk, and preserves existing schema, invoice calculation, settlement calculation, payment, ledger and posting behavior.


## TALAR_POST_EVENT_INVOICE_LOCAL_VALIDATION_AND_RUNTIME_FIX_41

Phase 41 local validation and runtime-fix pass applied after post-event invoice hardening. It removed explicit-any lint blockers in the customer invoice portal and invoice feedback action, removed an unused owner dashboard import, and produced a review-required validation report because full Prisma/Next validation must run on the local machine.


## TALAR_FULL_BACKUP_JSON_REVIEW_BOX_42

باکس بازبینی فایل JSON نسخه پشتیبان کامل در بخش پشتیبانی/بازیابی اطلاعات اضافه شد. این فاز فقط خواندنی است و restore واقعی انجام نمی‌دهد.


## TALAR_FULL_BACKUP_JSON_CONTROLLED_RESTORE_43

مسیر بازیابی کنترل‌شده JSON پشتیبان کامل به بخش پشتیبان‌گیری و بازیابی اطلاعات اضافه شد. این مسیر پس از بازبینی، با تأیید صریح مالک/مدیر، اطلاعات JSON رسمی سامانه تالار را به‌صورت افزایشی و غیرمخرب به دیتابیس فعلی وارد می‌کند و رکوردهای تکراری را skip/map می‌کند.

## TALAR_CALENDAR_PRIMARY_VIEW_POLISH_49

Calendar page polished so the monthly calendar is the primary visible surface, while KPI/filter tools move into a collapsible support panel.

## TALAR_GLOBAL_UI_SYSTEM_POLISH_62

Shared dashboard UI polish was applied through the dashboard shell and global admin CSS layer. The dashboard container now uses a tighter, consistent max width, a denser sidebar/header rhythm, start-aligned card content, compact controls, normalized chips/buttons, and safer mobile overflow behavior. This phase is UI-only and does not change schema, routes, server actions, tenant filtering, invoice/payment/contract calculations, or fake any data.

## TALAR_PROJECT_CLEANUP_20260602

ساختار پروژه برای تحویل تمیز شد. پوشه‌ها و فایل‌های آرشیوی، گزارش‌های validation، patch/diff، مستندات فازهای قدیمی، فایل‌های delivery و اسکریپت‌های کمکی غیرضروری حذف شدند. فایل‌های اصلی اجرا و توسعه شامل `src`, `prisma`, `public`, تنظیمات Next/TypeScript/ESLint/PostCSS، `package.json`, `package-lock.json`, `.env.example`, `README.md`, `AGENTS.md` و runnerهای محلی باقی مانده‌اند.

## به‌روزرسانی قالب‌های حرفه‌ای پیامک مالک - ۱۴۰۵/۰۳/۱۲

- قالب‌های پیامک مالک برای قرارداد، ویرایش قرارداد، تغییر وضعیت، لغو، دریافت، هزینه، مشتری، گزارش‌های روزانه/هفتگی/ماهانه، یادآوری مراسم فردا، مانده‌های قابل پیگیری، صورتحساب و رویداد امنیتی بازنویسی شدند.
- متن پیامک‌ها جزئیات عملیاتی بیشتری نمایش می‌دهند: مشتری، موبایل، شماره قرارداد، نوع مراسم، تاریخ و ساعت، سالن، مبلغ نهایی، پرداخت‌شده، مانده، روش دریافت/پرداخت، کد پیگیری، دسته هزینه و نام اپراتور.
- قالب‌های کوتاه قدیمی پیامک، در اولین بارگذاری قالب‌ها یا هنگام ارسال، به‌صورت امن با نسخه حرفه‌ای جایگزین می‌شوند؛ قالب‌هایی که کاربر دستی تغییر داده باشد بدون اجبار بازنویسی نمی‌شوند.
- فهرست متغیرهای قابل استفاده در صفحه «قالب پیام‌ها» کامل‌تر شد و متغیرهایی مثل `{{operatorName}}`، `{{eventDateFull}}`، `{{eventTimeRange}}`، `{{lineItemsSummary}}`، `{{latestPaymentsSummary}}` و `{{outstandingBalancesSummary}}` اضافه شدند.

## رفع باگ ذخیره اطلاعات تالار - ۱۴۰۵/۰۳/۱۲

- مشکل برگشت کاربر به داشبورد هنگام ذخیره «اطلاعات تالار» رفع شد.
- علت باگ، ناهماهنگی بین UI و server action بود: فرم برای نقش‌های `OWNER` و `ADMIN` قابل ویرایش بود، اما action فقط مجوز `settings.manage` را قبول می‌کرد.
- منطق دسترسی ویرایش اطلاعات تالار در helper مشترک `canManageHallInfo` متمرکز شد تا صفحه و action دقیقاً یک قانون واحد داشته باشند.
- در صورت نداشتن دسترسی، action دیگر کاربر را به داشبورد redirect نمی‌کند و پیام خطای فارسی داخل خود فرم نمایش می‌دهد.

## رفع منوی «بیشتر» قراردادها - ۱۴۰۵/۰۳/۱۲

- منوی «بیشتر» فهرست قراردادها از `details` داخلی کارت به یک پنل شناور client-side با `portal` منتقل شد تا باز شدن منو ارتفاع کارت را تغییر ندهد و روی کارت‌های بعدی به‌صورت نامرتب نیفتد.
- اقدامات تکمیلی، مالی/مراسم، تغییر وضعیت، کنسلی و حذف قرارداد در پنل جدید حفظ شدند و همان server actionهای امن قبلی استفاده می‌شوند.
- پنل با کلیک روی پس‌زمینه، دکمه بستن یا کلید Escape بسته می‌شود و در موبایل/دسکتاپ ارتفاع قابل اسکرول امن دارد.
- این تغییر migration، schema، محاسبات مالی، routeهای عملیاتی یا منطق tenant-scoped را تغییر نمی‌دهد.

## رفع خطای Runtime منوی «بیشتر» قراردادها - ۱۴۰۵/۰۳/۱۲

- خطای `mounted is not defined` در `ContractActionsMenu` برطرف شد.
- state نصب شدن کامپوننت قبل از استفاده از `createPortal` اضافه شد تا منوی شناور فقط بعد از mount سمت کلاینت رندر شود و با SSR/Turbopack خطای runtime ندهد.

## اصلاح منطق مالی قرارداد کنسل‌شده - ۱۴۰۵/۰۳/۱۲

- وقتی قرارداد با وضعیت `CANCELED` ثبت یا به این وضعیت تغییر داده می‌شود، مانده قرارداد به‌صورت سیستمی صفر و `remainingAmountManual` غیرفعال می‌شود.
- قرارداد لغوشده در فهرست قراردادها، جزئیات، چاپ قرارداد، خروجی‌ها، اعلان‌ها، داشبورد و خلاصه مشتری به‌عنوان قرارداد بسته‌شده/کنسلی نمایش داده می‌شود و دیگر بدهی قابل دریافت ایجاد نمی‌کند.
- مبالغ دریافتی واقعی مثل بیعانه یا وجه کنسلی همچنان به‌عنوان دریافت‌شده حفظ می‌شوند، اما مبلغ نهایی مراسم دیگر مبنای مانده قابل پیگیری قرارداد کنسل‌شده نیست.
- اگر وضعیت قرارداد از کنسل‌شده به وضعیت عملیاتی برگردد و مانده دستی فعال نباشد، مانده دوباره بر اساس مبلغ نهایی و دریافت‌های معتبر محاسبه می‌شود.

### به‌روزرسانی ۱۴۰۵/۰۳/۱۲ - چاپ قرارداد
- ردیف «توضیحات قرارداد» از بخش «اطلاعات مراسم» در نسخه چاپی/ PDF قرارداد حذف شد تا زیر ردیف سالن نمایش داده نشود.


### رفع نمایش باکس نصب PWA در چاپ قرارداد - ۱۴۰۵/۰۳/۱۲
- باکس نصب PWA/ویندوز در مسیرهای چاپ مثل `/dashboard/contracts/[id]/print` دیگر render نمی‌شود.
- کلاس‌های `no-print`، `print:hidden` و selector اختصاصی `data-pwa-install-prompt` به prompt نصب اضافه شد تا حتی در چاپ مستقیم از صفحات داشبورد هم داخل PDF/پرینت نمایش داده نشود.

## Customer welcome and contract SMS flow - 2026-06-02

- When a new customer is created inline during official contract registration, the system sends a warm customer welcome SMS before the contract summary SMS.
- The customer contract SMS now includes ceremony type, date/time, hall/salon, guest count, package, financial summary, selected service/item summary, and the discrepancy contact line: `در صورت هرگونه مغایرت، با شماره‌های 09123397977، 09126499877 تماس بگیرید.`
- Existing customer registrations still receive the contract summary SMS without duplicating the welcome message.

### پیامک‌های مشتری برای کنسلی و ثبت نهایی قرارداد
- هنگام کنسل شدن قرارداد، پیامک اطلاع‌رسانی کنسلی برای شماره مشتری ارسال می‌شود و توضیح می‌دهد که قرارداد از نظر مالی بسته شده و مانده قابل پرداخت صفر است.
- هنگام تسویه/ثبت نهایی قرارداد و تغییر وضعیت به `COMPLETED`، پیامک تشکر و آرزوی اوقات خوش برای مشتری ارسال می‌شود.
- این پیام‌ها از همان تنظیمات SMS مشتری استفاده می‌کنند: سرویس پیامک باید فعال باشد، «ارسال مستقیم به مشتریان» فعال باشد و برای رویدادهای قرارداد، گزینه مربوط به اعلان قرارداد فعال باشد.
- شماره‌های پیگیری مغایرت در متن پیام‌ها `09123397977` و `09126499877` هستند و در پیام‌های دارای تماس، آدرس تالار نیز از اطلاعات تالار درج می‌شود.


## تغییرات فاز پیام‌ها - ۱۴۰۵/۰۳/۱۲

- بخش جدید «پیام‌ها» در مسیر `/dashboard/messages` اضافه شد تا پیام‌های مشتری و مدیریت در یک صفحه خلوت و حرفه‌ای دیده شوند.
- در این صفحه زمان ثبت، زمان ارسال موفق، آخرین خطا، گیرنده، کانال، نوع پیام، متن کامل پیام و ارتباط با قرارداد/مشتری/دریافت/هزینه نمایش داده می‌شود.
- برای پیام‌های ناموفق یا در صف، ارسال مجدد با دیالوگ تأیید اضافه شد. نتیجه موفق یا خطای پنل پیامک/تلگرام/بله/روبیکا داخل همان صفحه و لاگ اعلان ثبت می‌شود.
- متن پیامک‌های مدیریتی بازنویسی شد تا برای قرارداد، دریافت، هزینه، مشتری، گزارش‌ها، یادآوری‌ها، مانده‌ها، صورتحساب و امنیت، جزئیات دقیق و قابل پیگیری داشته باشد.
- متن پیام‌های مشتری برای خوش‌آمدگویی، شرح قرارداد، کنسلی، ثبت نهایی، دریافت و صورتحساب رسمی‌تر و دلنشین‌تر شد.

## ایمیل مدیریتی و مرکز پیام‌ها — ۱۴۰۵/۰۳/۱۲

- کانال جدید `EMAIL` به سیستم اعلان‌ها اضافه شد و از مسیر `/dashboard/settings/email` قابل تنظیم است.
- تنظیمات ایمیل شامل SMTP Host، پورت، SSL/TLS، نام کاربری، رمز SMTP رمزگذاری‌شده، ایمیل فرستنده، نام فرستنده و ایمیل‌های مالک/مدیر است.
- پیام‌های مدیریتی قرارداد، دریافت، هزینه، مشتری، امنیت، گزارش‌های روزانه/هفتگی/ماهانه، یادآوری مراسم فردا و مانده‌ها می‌توانند همزمان به ایمیل مالک/مدیر ارسال شوند.
- همه ایمیل‌ها در `NotificationLog` با کانال `EMAIL` ثبت می‌شوند و در صفحه `/dashboard/messages` قابل مشاهده و ارسال مجدد هستند.
- ارسال مجدد ایمیل از همان دیالوگ حرفه‌ای مرکز پیام‌ها انجام می‌شود و خطای SMTP داخل لاگ ثبت می‌گردد.
- برای این فاز migration جدید `20260602000100_add_email_integration_settings` اضافه شده است؛ پس بعد از دریافت نسخه جدید باید Prisma Client تولید و migration اجرا شود.

دستورات پیشنهادی پس از دریافت نسخه:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### اصلاح پایداری تنظیمات ایمیل مدیریتی — ۱۴۰۵/۰۳/۱۲
- صفحه تنظیمات ایمیل دیگر در صورت آماده نبودن Prisma Client یا اجرا نشدن migration کرش نمی‌کند.
- اگر مدل/جدول `EmailIntegrationSetting` هنوز آماده نباشد، پیام راهنمای فارسی داخل صفحه نمایش داده می‌شود.
- اکشن‌های ذخیره، تست ایمیل، ارسال مجدد و dispatcherهای ایمیل در برابر delegate ناموجود مقاوم شدند.
- برای فعال شدن کامل ایمیل مدیریتی پس از جایگزینی پروژه، دستورات `npm run prisma:migrate` و `npm run prisma:generate` و سپس ری‌استارت سرور dev لازم است.

### به‌روزرسانی 2026-06-02 - PDF خودکار قرارداد در ایمیل و متن کوتاه پیامک مالک

- هنگام ارسال ایمیل مدیریتی برای رویداد `CONTRACT_CREATED`، سامانه یک نسخه PDF خلاصه قرارداد می‌سازد، آن را به ایمیل پیوست می‌کند و یک کپی را روی دسکتاپ سیستم میزبان ذخیره می‌کند.
- مسیر پیش‌فرض ذخیره در حالت لوکال ویندوز: `Desktop/قراردادهای تالار منیجر` است. برای تغییر مسیر می‌توان متغیر محیطی `TALAR_CONTRACT_PDF_DIR` را تنظیم کرد.
- نام فایل PDF با الگوی `نام مشتری - نوع مراسم - تاریخ مراسم.pdf` ساخته می‌شود و در صورت تکراری بودن، شماره افزوده می‌شود.
- متن پیامک مدیریتی ثبت قرارداد کوتاه‌تر شد تا برای مالک/مدیر خواناتر باشد.
- پاک‌سازی عبارت‌های نمایشی `دمو / دموی / DEMO` در لاگ و خروجی پیام‌ها به‌صورت مرکزی تقویت شد.

### به‌روزرسانی 2026-06-02 - بازنویسی لوکس پیام‌های مشتری

- متن‌های مشتری برای خوش‌آمدگویی، ثبت قرارداد، لغو قرارداد، نهایی شدن قرارداد، ثبت پرداخت و صورتحساب کوتاه‌تر، رسمی‌تر و قابل‌اعتمادتر شد.
- در پیام مشتری از واژه رسمی «لغو» به‌جای «کنسل» استفاده می‌شود.
- پیام ثبت قرارداد مشتری فقط خلاصه ضروری قرارداد را ارسال می‌کند و جزئیات طولانی در PDF/قرارداد باقی می‌ماند.
- پیام‌های صورتحساب مشتری از مسیر dispatcher عمومی و مسیر پرتال مشتری یکدست شدند و قبل از ثبت/ارسال، پاک‌سازی عبارت‌های `دمو / دموی / DEMO` روی متن اعمال می‌شود.

### به‌روزرسانی 2026-06-02 - بازنویسی لوکس پیام‌های مدیریتی

- متن‌های مدیریتی برای قرارداد، دریافت، هزینه، مشتری، گزارش‌ها، یادآوری‌ها، مانده‌ها، صورتحساب، امنیت و پیام تست بازنویسی شدند.
- ادبیات پیام‌ها از حالت خشک مثل «اعلان مالی تالار منیجر» به متن‌های رسمی‌تر مانند «دریافت جدید ثبت شد | نام تالار» تغییر کرد.
- پیامک‌های مالک کوتاه‌تر شدند و جزئیات اصلی شامل مشتری، قرارداد، مبلغ، مانده و اپراتور را بدون شلوغی نمایش می‌دهند.
- قالب‌های تلگرام، بله، روبیکا و ایمیل مدیریتی از همین متن‌های رسمی‌تر استفاده می‌کنند؛ گزارش‌ها کوتاه‌تر شده‌اند تا در موبایل خواناتر باشند.
- تشخیص قالب‌های پیش‌فرض قدیمی برای SMS/Telegram/Bale/Rubika/Email تقویت شد تا قالب‌های سیستمی قدیمی به نسخه جدید ارتقا پیدا کنند، بدون اینکه قالب‌های دستیِ سفارشی بی‌دلیل تغییر کنند.

### به‌روزرسانی 2026-06-02 - یادآوری تسویه مشتری دو روز قبل مراسم

- اگر دو روز قبل از تاریخ مراسم، قرارداد هنوز `remainingAmount > 0` داشته باشد، سامانه برای مشتری پیامک یادآوری تسویه ارسال می‌کند.
- متن پیام مبلغ مانده را نمایش نمی‌دهد و فقط با لحن محترمانه و لوکس از مشتری می‌خواهد برای تسویه کامل قرارداد و هماهنگی نهایی اقدام کند.
- این یادآوری فقط برای قراردادهای لغونشده اجرا می‌شود و اگر قرارداد همان روز قبلاً پردازش شده باشد، پیام تکراری ارسال نمی‌شود.
- ارسال این پیام از همان مسیر زمان‌بندی‌شده فعلی انجام می‌شود؛ یعنی هم cron production و هم بررسی خودکار بعد از ورود ادمین در localhost آن را اجرا می‌کنند.
- برای فعال شدن این پیام، تنظیمات پیامک باید فعال باشد و گزینه‌های «ارسال مستقیم به مشتریان» و «اعلان‌های پرداخت/دریافت مشتری» روشن باشند.
- متن پیام قبل از ارسال و ثبت در لاگ، مانند سایر پیام‌ها از پاک‌سازی مرکزی `دمو / دموی / DEMO` عبور می‌کند.


### Contact details in customer messages and contract PDF
- Customer-facing messages that include a discrepancy/contact line now show both support numbers: `09123397977` and `09126499877`.
- Those messages also include the hall address when it is available from `/dashboard/hall-info`.
- Contract print/PDF footers include the hall address plus stored hall phone/mobile numbers and the two required support numbers.
